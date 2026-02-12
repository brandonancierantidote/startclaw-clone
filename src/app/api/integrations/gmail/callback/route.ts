import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Parse state to get template_slug and agent_id
  let templateSlug = "";
  let agentId = "";
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString());
      templateSlug = decoded.template_slug || "";
      agentId = decoded.agent_id || "";
    } catch {
      console.error("Failed to decode state");
    }
  }

  const redirectBase = templateSlug
    ? `${appUrl}/templates/${templateSlug}`
    : `${appUrl}/dashboard/settings`;

  if (error) {
    return NextResponse.redirect(`${redirectBase}?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${redirectBase}?error=no_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${redirectBase}?error=missing_credentials`);
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${appUrl}/api/integrations/gmail/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    const email = userInfo.email;

    // Get Clerk user info
    const { userId } = await auth();
    const clerkUser = await currentUser();

    if (!userId || !clerkUser) {
      // Redirect with tokens in URL params as fallback (will be stored client-side)
      const tokenData = Buffer.from(
        JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          email,
          expiry_date: tokens.expiry_date,
        })
      ).toString("base64");
      return NextResponse.redirect(
        `${redirectBase}?connected=gmail&email=${email}&step=2&token_data=${tokenData}`
      );
    }

    const supabase = createServerClient();

    // Ensure user exists in database (create if not)
    let internalUserId: string;
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (existingUser) {
      internalUserId = existingUser.id;
    } else {
      // Create user if they don't exist
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          clerk_id: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || email || "",
          first_name: clerkUser.firstName || null,
          last_name: clerkUser.lastName || null,
          image_url: clerkUser.imageUrl || null,
        })
        .select("id")
        .single();

      if (createError || !newUser) {
        console.error("Failed to create user:", createError);
        return NextResponse.redirect(`${redirectBase}?error=user_creation_failed`);
      }
      internalUserId = newUser.id;
    }

    // Upsert integration token - use user_id,provider as unique constraint
    const { error: upsertError } = await supabase.from("integration_tokens").upsert(
      {
        user_id: internalUserId,
        agent_id: agentId && agentId !== "new" ? agentId : null,
        provider: "gmail",
        access_token: tokens.access_token || "",
        refresh_token: tokens.refresh_token || null,
        token_type: tokens.token_type || "Bearer",
        scope: tokens.scope || null,
        expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        email: email || null,
      },
      {
        onConflict: "user_id,provider",
      }
    );

    if (upsertError) {
      console.error("Failed to save tokens:", upsertError);
      // Still redirect with success - tokens might be in URL
    }

    // Redirect back with success
    return NextResponse.redirect(
      `${redirectBase}?connected=gmail&email=${encodeURIComponent(email || "")}&step=2`
    );
  } catch (exchangeError) {
    console.error("Token exchange failed:", exchangeError);
    return NextResponse.redirect(`${redirectBase}?error=token_exchange_failed`);
  }
}
