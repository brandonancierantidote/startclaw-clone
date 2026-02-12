import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const templateSlug = searchParams.get("template") || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const clientId = process.env.SLACK_CLIENT_ID;

  if (!clientId) {
    // Redirect back with error
    return NextResponse.redirect(
      `${appUrl}/templates/${templateSlug}?error=slack_not_configured`
    );
  }

  // Encode state
  const state = Buffer.from(JSON.stringify({ template_slug: templateSlug })).toString(
    "base64"
  );

  const scopes = [
    "channels:read",
    "chat:write",
    "users:read",
    "users:read.email",
  ].join(",");

  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
    `${appUrl}/api/integrations/slack/callback`
  )}&state=${state}`;

  return NextResponse.redirect(slackAuthUrl);
}
