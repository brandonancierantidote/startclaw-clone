import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://46.225.107.94:5000";
const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET || "theone-orchestrator-secret-2026";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id") || "new";
  const templateSlug = searchParams.get("template") || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(`${appUrl}/templates/${templateSlug}?error=unauthorized`);
    }

    const supabase = createServerClient();

    // Get or create user's internal ID
    let internalUserId: string = userId; // Default to clerk_id
    try {
      const userResult = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", userId)
        .single();

      if (userResult.data) {
        internalUserId = userResult.data.id;
      } else {
        // Create user during onboarding
        const newUserResult = await supabase
          .from("users")
          .insert({ clerk_id: userId, email: `${userId}@placeholder.com` })
          .select()
          .single();

        if (newUserResult.data) {
          internalUserId = newUserResult.data.id;
        }
      }
    } catch {
      // Use clerk_id as fallback
    }

    // Request a WhatsApp session from the orchestrator
    try {
      const response = await fetch(`${ORCHESTRATOR_URL}/api/whatsapp/session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ORCHESTRATOR_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: internalUserId,
          agent_id: agentId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.redirect(
          `${appUrl}/templates/${templateSlug}?whatsapp_session=${data.session_id}&step=1&connected=whatsapp`
        );
      }

      const errorText = await response.text();
      console.error("Failed to create WhatsApp session:", errorText);
    } catch (orchError) {
      console.error("Orchestrator connection failed:", orchError);
    }

    // If orchestrator fails, redirect back with a message to use phone number fallback
    return NextResponse.redirect(
      `${appUrl}/templates/${templateSlug}?step=1&whatsapp_fallback=true`
    );
  } catch (error) {
    console.error("WhatsApp connect error:", error);
    return NextResponse.redirect(`${appUrl}/templates/${templateSlug}?error=whatsapp_connect_failed`);
  }
}
