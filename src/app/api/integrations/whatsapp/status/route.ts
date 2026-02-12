import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

const WHATSAPP_BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "http://46.225.107.94:3001";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get user's internal ID
    const userResult = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ connected: false });
    }

    const sessionId = userResult.data.id;

    // Check local database first
    const tokenResult = await supabase
      .from("integration_tokens")
      .select("email")
      .eq("user_id", userResult.data.id)
      .eq("provider", "whatsapp")
      .single();

    // Also check live status from bridge
    try {
      const response = await fetch(`${WHATSAPP_BRIDGE_URL}/whatsapp/status/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          return NextResponse.json({
            connected: true,
            phone_number: data.phone || tokenResult.data?.email,
          });
        }
      }
    } catch (e) {
      // Bridge might not be running, check database
      console.error("WhatsApp bridge error:", e);
    }

    // Fall back to database check
    if (tokenResult.data?.email) {
      return NextResponse.json({
        connected: true,
        phone_number: tokenResult.data.email,
      });
    }

    return NextResponse.json({ connected: false });
  } catch (error) {
    console.error("WhatsApp status error:", error);
    return NextResponse.json({ connected: false });
  }
}
