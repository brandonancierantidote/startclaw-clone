import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    // Check if Slack credentials are configured
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        connected: false,
        configured: false,
        message: "Slack credentials not configured"
      });
    }

    const supabase = createServerClient();

    // Get user's internal ID
    const userResult = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ connected: false, configured: true });
    }

    const internalUserId = userResult.data.id;

    // Check for Slack token
    const tokenResult = await supabase
      .from("integration_tokens")
      .select("access_token, scope")
      .eq("user_id", internalUserId)
      .eq("provider", "slack")
      .single();

    if (tokenResult.error || !tokenResult.data) {
      return NextResponse.json({ connected: false, configured: true });
    }

    // Optionally verify the token is still valid by calling Slack API
    try {
      const authTest = await fetch("https://slack.com/api/auth.test", {
        headers: {
          "Authorization": `Bearer ${tokenResult.data.access_token}`,
        },
      });
      const authData = await authTest.json();

      if (authData.ok) {
        return NextResponse.json({
          connected: true,
          configured: true,
          team: authData.team,
          user: authData.user,
        });
      }
    } catch (e) {
      console.error("Failed to verify Slack token:", e);
    }

    return NextResponse.json({ connected: false, configured: true });
  } catch (error) {
    console.error("Slack status error:", error);
    return NextResponse.json({ connected: false });
  }
}
