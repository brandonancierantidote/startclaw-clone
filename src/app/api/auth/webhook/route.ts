import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { createServerClient } from "@/lib/supabase/server";

type ClerkWebhookEvent = {
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
  type: string;
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: ClerkWebhookEvent;

  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }

  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    try {
      const supabase = createServerClient();

      // Create user
      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          clerk_id: id,
          email,
          first_name,
          last_name,
          image_url,
        })
        .select()
        .single();

      if (userError) {
        console.error("Failed to create user:", userError);
        throw userError;
      }

      // Create credits row with 0 balance
      const { error: creditsError } = await supabase
        .from("credits")
        .insert({
          user_id: user.id,
          balance_cents: 0,
          auto_recharge_enabled: true,
        });

      if (creditsError) {
        console.error("Failed to create credits:", creditsError);
        throw creditsError;
      }

      console.log(`User created: ${email}`);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      // Return success anyway - we don't want Clerk to retry
      // The user can still use the app with mock data fallback
      return NextResponse.json({ success: true, warning: "Database operation failed" });
    }
  }

  return NextResponse.json({ success: true });
}
