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

    // Check credits before resuming
    const creditsResult = await supabase
      .from("credits")
      .select("balance_cents")
      .eq("user_id", internalUserId)
      .single();

    const balance = creditsResult.data?.balance_cents || 0;
    if (balance <= 0) {
      return NextResponse.json({ error: "Insufficient credits to resume agent" }, { status: 402 });
    }

    // Get integration tokens for this user
    let integrationTokens = {};
    try {
      const tokensResult = await supabase
        .from("integration_tokens")
        .select("*")
        .eq("user_id", internalUserId);

      if (tokensResult.data) {
        for (const token of tokensResult.data) {
          integrationTokens = {
            ...integrationTokens,
            [token.provider]: {
              access_token: token.access_token,
              refresh_token: token.refresh_token,
              email: token.email,
            },
          };
        }
      }
    } catch (e) {
      console.error("Failed to fetch integration tokens:", e);
    }

    // Update status to provisioning
    await supabase
      .from("agents")
      .update({ status: "provisioning" })
      .eq("id", id);

    // Call orchestrator to provision the container
    try {
      const provisionResponse = await fetch(`${ORCHESTRATOR_URL}/api/agents/provision`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ORCHESTRATOR_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agent.id,
          user_id: internalUserId,
          soul_md: agent.soul_md,
          display_name: agent.display_name,
          config: agent.config || {},
          integrations: {
            ...agent.integrations,
            tokens: integrationTokens,
          },
        }),
      });

      if (!provisionResponse.ok) {
        const errorText = await provisionResponse.text();
        console.error("Orchestrator provision failed:", errorText);

        // Update agent status to failed
        await supabase
          .from("agents")
          .update({ status: "failed" })
          .eq("id", id);

        return NextResponse.json({ error: "Failed to provision agent container" }, { status: 500 });
      }

      const provisionData = await provisionResponse.json();

      // Update agent with container info and active status
      const updateResult = await supabase
        .from("agents")
        .update({
          status: "active",
          container_id: provisionData.container_id,
        })
        .eq("id", id)
        .eq("user_id", internalUserId)
        .select()
        .single();

      if (updateResult.error) {
        console.error("Failed to update agent status:", updateResult.error);
        return NextResponse.json({ error: "Failed to resume agent" }, { status: 500 });
      }

      return NextResponse.json(updateResult.data);
    } catch (error) {
      console.error("Failed to provision container:", error);

      // Mark agent as failed
      await supabase
        .from("agents")
        .update({ status: "failed" })
        .eq("id", id);

      return NextResponse.json({ error: "Failed to provision agent container" }, { status: 500 });
    }
  } catch (error) {
    console.error("Failed to resume agent:", error);
    return NextResponse.json({ error: "Failed to resume agent" }, { status: 500 });
  }
}
