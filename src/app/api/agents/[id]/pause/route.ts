import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://46.225.107.94:5000";
const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET || "theone-orchestrator-secret-2026";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    // Get user's internal ID
    const userResult = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const internalUserId = userResult.data.id;

    // Get the agent
    const agentResult = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .eq("user_id", internalUserId)
      .single();

    if (agentResult.error || !agentResult.data) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agent = agentResult.data;

    // Call orchestrator to deprovision the container
    try {
      const deprovisionResponse = await fetch(`${ORCHESTRATOR_URL}/api/agents/${id}/deprovision`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ORCHESTRATOR_SECRET}`,
          "Content-Type": "application/json",
        },
      });

      if (!deprovisionResponse.ok) {
        console.error("Orchestrator deprovision failed:", await deprovisionResponse.text());
      }
    } catch (error) {
      console.error("Failed to deprovision container:", error);
    }

    // Update agent status in database
    const updateResult = await supabase
      .from("agents")
      .update({
        status: "paused",
        container_id: null,
      })
      .eq("id", id)
      .eq("user_id", internalUserId)
      .select()
      .single();

    if (updateResult.error) {
      console.error("Failed to update agent status:", updateResult.error);
      return NextResponse.json({ error: "Failed to pause agent" }, { status: 500 });
    }

    return NextResponse.json(updateResult.data);
  } catch (error) {
    console.error("Failed to pause agent:", error);
    return NextResponse.json({ error: "Failed to pause agent" }, { status: 500 });
  }
}
