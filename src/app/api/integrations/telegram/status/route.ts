import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

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

    const internalUserId = userResult.data.id;

    // Check for Telegram token
    const tokenResult = await supabase
      .from("integration_tokens")
      .select("access_token, email")
      .eq("user_id", internalUserId)
      .eq("provider", "telegram")
      .single();

    if (tokenResult.error || !tokenResult.data) {
      return NextResponse.json({ connected: false });
    }

    // Verify the token is still valid
    try {
      const telegramRes = await fetch(
        `https://api.telegram.org/bot${tokenResult.data.access_token}/getMe`
      );
      const telegramData = await telegramRes.json();

      if (telegramData.ok) {
        return NextResponse.json({
          connected: true,
          bot_username: tokenResult.data.email, // We stored username here
          bot_name: telegramData.result.first_name,
        });
      }
    } catch (e) {
      console.error("Failed to verify Telegram token:", e);
    }

    return NextResponse.json({ connected: false });
  } catch (error) {
    console.error("Telegram status error:", error);
    return NextResponse.json({ connected: false });
  }
}
