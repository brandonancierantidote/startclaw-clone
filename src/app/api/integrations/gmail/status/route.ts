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

    // Check for Gmail token
    const tokenResult = await supabase
      .from("integration_tokens")
      .select("email, refresh_token, access_token, expires_at")
      .eq("user_id", internalUserId)
      .eq("provider", "gmail")
      .single();

    if (tokenResult.error || !tokenResult.data) {
      return NextResponse.json({ connected: false });
    }

    // Check if we have a valid refresh token (required for persistent access)
    const hasRefreshToken = !!tokenResult.data.refresh_token;
    const email = tokenResult.data.email;

    return NextResponse.json({
      connected: hasRefreshToken,
      email: email || null,
      hasRefreshToken,
    });
  } catch (error) {
    console.error("Gmail status error:", error);
    return NextResponse.json({ connected: false });
  }
}
