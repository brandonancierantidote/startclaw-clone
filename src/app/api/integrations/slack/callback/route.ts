import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Parse state
  let templateSlug = "";
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString());
      templateSlug = decoded.template_slug || "";
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

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${redirectBase}?error=missing_credentials`);
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${appUrl}/api/integrations/slack/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      return NextResponse.redirect(
        `${redirectBase}?error=${tokenData.error || "token_exchange_failed"}`
      );
    }

    // Try to save tokens
    try {
      const { userId } = await auth();
      if (userId) {
        const supabase = createServerClient();

        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", userId)
          .single();

        if (user) {
          await supabase.from("integration_tokens").upsert(
            {
              user_id: user.id,
              provider: "slack",
              access_token: tokenData.access_token,
              token_type: tokenData.token_type,
              scope: tokenData.scope,
            },
            {
              onConflict: "user_id,provider",
            }
          );
        }
      }
    } catch (dbError) {
      console.error("Failed to save Slack tokens:", dbError);
    }

    return NextResponse.redirect(`${redirectBase}?connected=slack`);
  } catch (exchangeError) {
    console.error("Slack token exchange failed:", exchangeError);
    return NextResponse.redirect(`${redirectBase}?error=token_exchange_failed`);
  }
}
