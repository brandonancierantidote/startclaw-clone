import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://46.225.107.94:5000";
const WHATSAPP_BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "http://46.225.107.94:3001";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!agentId) {
      return NextResponse.json({ error: "Missing agent_id" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get user's internal ID and verify agent ownership
    const userResult = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use user_id as session ID for WhatsApp
    const sessionId = userResult.data.id;

    // Get QR code from WhatsApp bridge
    const response = await fetch(`${WHATSAPP_BRIDGE_URL}/whatsapp/qr/${sessionId}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 202) {
        return NextResponse.json({ status: "initializing", message: "Starting WhatsApp..." });
      }
      return NextResponse.json({ error: "Failed to get QR code" }, { status: response.status });
    }

    const data = await response.json();

    if (data.authenticated) {
      // Store connection info in database
      await supabase.from("integration_tokens").upsert(
        {
          user_id: userResult.data.id,
          provider: "whatsapp",
          access_token: sessionId,
          email: data.phone, // Store phone number in email field
        },
        {
          onConflict: "user_id,provider",
        }
      );

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
  } catch (error) {
    console.error("WhatsApp QR error:", error);
    return NextResponse.json({ error: "Failed to get QR code" }, { status: 500 });
  }
}
