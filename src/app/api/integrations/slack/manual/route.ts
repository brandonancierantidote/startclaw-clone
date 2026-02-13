import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { webhook_url } = await req.json();

    if (!webhook_url) {
      return NextResponse.json({ error: "Webhook URL or bot token is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get or create user's internal ID
    let internalUserId: string;
    const userResult = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userResult.error || !userResult.data) {
      // Create user if doesn't exist
      const newUserResult = await supabase
        .from("users")
        .insert({
          clerk_id: userId,
          email: `${userId}@placeholder.com`,
        })
        .select()
        .single();

      if (newUserResult.error || !newUserResult.data) {
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }
      internalUserId = newUserResult.data.id;
    } else {
      internalUserId = userResult.data.id;
    }

    // Store the webhook/token
    const upsertResult = await supabase.from("integration_tokens").upsert(
      {
        user_id: internalUserId,
        provider: "slack",
        access_token: webhook_url,
        email: "manual-webhook",
      },
      {
        onConflict: "user_id,provider",
      }
    );

    if (upsertResult.error) {
      console.error("Failed to save Slack webhook:", upsertResult.error);
      return NextResponse.json({ error: "Failed to save connection" }, { status: 500 });
    }

    return NextResponse.json({ connected: true, team: "Manual" });
  } catch (error) {
    console.error("Slack manual connect error:", error);
    return NextResponse.json({ error: "Failed to connect Slack" }, { status: 500 });
  }
}
