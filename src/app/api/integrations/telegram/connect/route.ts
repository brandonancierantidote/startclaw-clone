import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bot_token, agent_id } = await req.json();

    if (!bot_token) {
      return NextResponse.json({ error: "Bot token is required" }, { status: 400 });
    }

    // Validate the bot token by calling Telegram's getMe API
    const telegramRes = await fetch(`https://api.telegram.org/bot${bot_token}/getMe`);
    const telegramData = await telegramRes.json();

    if (!telegramData.ok) {
      return NextResponse.json({
        error: "Invalid bot token. Please check your token and try again.",
        details: telegramData.description
      }, { status: 400 });
    }

    const botInfo = telegramData.result;

    const supabase = createServerClient();

    // Get user's internal ID
    const userResult = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const internalUserId = userResult.data.id;

    // Store the bot token
    const upsertResult = await supabase.from("integration_tokens").upsert(
      {
        user_id: internalUserId,
        agent_id: agent_id || null,
        provider: "telegram",
        access_token: bot_token,
        email: `@${botInfo.username}`, // Store bot username in email field
      },
      {
        onConflict: "user_id,provider",
      }
    );

    if (upsertResult.error) {
      console.error("Failed to save Telegram token:", upsertResult.error);
      return NextResponse.json({ error: "Failed to save connection" }, { status: 500 });
    }

    return NextResponse.json({
      connected: true,
      bot_username: botInfo.username,
      bot_name: botInfo.first_name,
    });
  } catch (error) {
    console.error("Telegram connect error:", error);
    return NextResponse.json({ error: "Failed to connect Telegram" }, { status: 500 });
  }
}
