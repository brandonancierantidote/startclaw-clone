import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ connected: false, error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agent_id");

    const supabase = createServerClient();

    // Get user's internal ID
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ connected: false, error: "user_not_found" });
    }

    // Check for Gmail token - either by user_id alone or with agent_id
    let query = supabase
      .from("integration_tokens")
      .select("id, email, refresh_token, access_token, expires_at, updated_at")
      .eq("user_id", user.id)
      .eq("provider", "gmail");

    if (agentId) {
      // If agent_id provided, check for that specific agent OR user-level token
      query = supabase
        .from("integration_tokens")
        .select("id, email, refresh_token, access_token, expires_at, updated_at")
        .eq("user_id", user.id)
        .eq("provider", "gmail");
    }

    const { data: token, error: tokenError } = await query.maybeSingle();

    if (tokenError) {
      console.error("Token query error:", tokenError);
      return NextResponse.json({ connected: false, error: "query_error" });
    }

    if (!token) {
      return NextResponse.json({ connected: false });
    }

    // Consider connected if we have either a refresh token or a recent access token
    const hasRefreshToken = !!token.refresh_token;
    const hasAccessToken = !!token.access_token;
    const email = token.email;

    // Check if token might be expired (but we can refresh it if we have refresh_token)
    const isExpired = token.expires_at && new Date(token.expires_at) < new Date();
    const canRefresh = hasRefreshToken;

    const connected = hasRefreshToken || (hasAccessToken && !isExpired);

    return NextResponse.json({
      connected,
      email: email || null,
      hasRefreshToken,
      hasAccessToken,
      canRefresh,
      isExpired: isExpired || false,
      lastUpdated: token.updated_at,
    });
  } catch (error) {
    console.error("Gmail status error:", error);
    return NextResponse.json({ connected: false, error: "server_error" });
  }
}
