import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Parse state to get template_slug
  let templateSlug = "";
  let agentId = "new";
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString());
      templateSlug = decoded.template_slug || "";
      agentId = decoded.agent_id || "new";
    } catch {
      console.error("Failed to decode state");
    }
  }

  const redirectBase = templateSlug
    ? `${appUrl}/templates/${templateSlug}`
    : `${appUrl}/templates`;

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

    // Get user email
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    const email = userInfo.email;

    // Try to save tokens to database
    try {
      const { userId } = await auth();
      if (userId) {
        const supabase = createServerClient();

        // Get user's internal ID
        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", userId)
          .single();

        if (user) {
          // Upsert integration token
          await supabase.from("integration_tokens").upsert(
            {
              user_id: user.id,
              agent_id: agentId !== "new" ? agentId : null,
              provider: "gmail",
              access_token: tokens.access_token || "",
              refresh_token: tokens.refresh_token || null,
              token_type: tokens.token_type || null,
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
        }
      }
    } catch (dbError) {
      console.error("Failed to save tokens to database:", dbError);
      // Continue anyway - tokens will be in session
    }

    // Redirect back with success - include step=2 to restore wizard position
    return NextResponse.redirect(`${redirectBase}?connected=gmail&email=${email}&step=2`);
  } catch (exchangeError) {
    console.error("Token exchange failed:", exchangeError);
    return NextResponse.redirect(`${redirectBase}?error=token_exchange_failed`);
  }
}
