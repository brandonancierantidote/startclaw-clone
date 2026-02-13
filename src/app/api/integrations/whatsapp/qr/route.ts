import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

const WHATSAPP_BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "http://46.225.107.94:3001";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get or create a session ID — use user_id if available, fall back to clerk_id
    let sessionId = userId; // Default to clerk_id
    try {
      const userResult = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", userId)
        .single();

      if (userResult.data) {
        sessionId = userResult.data.id;
      }
    } catch {
      // Use clerk_id as session ID
    }

    // Get QR code from WhatsApp bridge
    try {
      const response = await fetch(`${WHATSAPP_BRIDGE_URL}/whatsapp/qr/${sessionId}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 202) {
        return NextResponse.json({ status: "initializing", message: "Starting WhatsApp session..." });
      }

      if (!response.ok) {
        return NextResponse.json({ error: "WhatsApp bridge unavailable", bridge_down: true }, { status: 503 });
      }

      const data = await response.json();

      if (data.authenticated) {
        // Store connection info in database
        try {
          const userResult = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", userId)
            .single();

          if (userResult.data) {
            await supabase.from("integration_tokens").upsert(
              {
                user_id: userResult.data.id,
                agent_id: agentId && agentId !== "new" ? agentId : null,
                provider: "whatsapp",
                access_token: sessionId,
                email: data.phone,
              },
              { onConflict: "user_id,provider" }
            );
          }
        } catch (e) {
          console.error("Failed to save WhatsApp token:", e);
        }

        return NextResponse.json({
          authenticated: true,
          phone: data.phone,
          name: data.name,
        });
      }

      return NextResponse.json({
        qr: data.qr,
        authenticated: false,
      });
    } catch (bridgeError) {
      console.error("WhatsApp bridge connection error:", bridgeError);
      return NextResponse.json({ error: "WhatsApp bridge not reachable", bridge_down: true }, { status: 503 });
    }
  } catch (error) {
    console.error("WhatsApp QR error:", error);
    return NextResponse.json({ error: "Failed to get QR code" }, { status: 500 });
  }
}
