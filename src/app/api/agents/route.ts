import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://46.225.107.94:5000";
const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET || "theone-orchestrator-secret-2026";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get user's internal ID
    const userResult = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userResult.error || !userResult.data) {
      // User doesn't exist yet - return empty array
      return NextResponse.json([]);
    }
    const internalUserId = userResult.data.id;

    const agentsResult = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", internalUserId)
      .order("created_at", { ascending: false });

    if (agentsResult.error) {
      console.error("Failed to fetch agents:", agentsResult.error);
      return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
    }

    return NextResponse.json(agentsResult.data || []);
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { template_slug, display_name, soul_md, config, integrations } = await req.json();

    if (!template_slug || !display_name || !soul_md) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get or create user's internal ID
    let internalUserId: string;
    const userResult = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userResult.error || !userResult.data) {
      // Create user if doesn't exist
      const newUserResult = await supabase
        .from("users")
        .insert({
          clerk_id: userId,
          email: `${userId}@placeholder.com`,
        })
        .select()
        .single();

      if (newUserResult.error || !newUserResult.data) {
        console.error("Failed to create user:", newUserResult.error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
      }
      internalUserId = newUserResult.data.id;

      // Create credits row
      await supabase.from("credits").insert({
        user_id: internalUserId,
        balance_cents: 0,
      });
    } else {
      internalUserId = userResult.data.id;
    }

    // Create the agent in database first
    const agentResult = await supabase
      .from("agents")
      .insert({
        user_id: internalUserId,
        template_slug,
        display_name,
        soul_md,
        config: config || {},
        integrations: integrations || {},
        status: "provisioning",
      })
      .select()
      .single();

    if (agentResult.error || !agentResult.data) {
      console.error("Failed to create agent in DB:", agentResult.error);
      return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
    }

    const agent = agentResult.data;

    // Get integration tokens for this user (Gmail, etc.)
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

    // Provision the container on Hetzner
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
          soul_md,
          display_name,
          config: config || {},
          integrations: {
            ...integrations,
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
          .eq("id", agent.id);
        return NextResponse.json({ error: "Failed to provision agent container" }, { status: 500 });
      }

      const provisionData = await provisionResponse.json();

      // Update agent with container info
      await supabase
        .from("agents")
        .update({
          status: "active",
          container_id: provisionData.container_id,
        })
        .eq("id", agent.id);

      agent.status = "active";
      agent.container_id = provisionData.container_id;
    } catch (error) {
      console.error("Failed to provision container:", error);
      // Mark agent as failed but still return it
      await supabase
        .from("agents")
        .update({ status: "failed" })
        .eq("id", agent.id);
      agent.status = "failed";
    }

    // Create subscription with status 'active'
    await supabase.from("subscriptions").upsert({
      user_id: internalUserId,
      status: "active",
      plan: "standard",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "user_id" });

    // Add 1000 credits ($10 starter credits)
    const creditsResult = await supabase
      .from("credits")
      .select("balance_cents")
      .eq("user_id", internalUserId)
      .single();

    const currentBalance = creditsResult.data?.balance_cents || 0;
    const newBalance = currentBalance + 1000;

    await supabase
      .from("credits")
      .upsert({
        user_id: internalUserId,
        balance_cents: newBalance,
      }, { onConflict: "user_id" });

    // Record credit transaction
    await supabase.from("credit_transactions").insert({
      user_id: internalUserId,
      amount_cents: 1000,
      type: "credit",
      description: "Starter credits with subscription",
      balance_after_cents: newBalance,
    });

    // Sync credit balance to orchestrator Redis
    try {
      await fetch(`${ORCHESTRATOR_URL}/api/credits/set`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ORCHESTRATOR_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: internalUserId,
          balance_cents: newBalance,
        }),
      });
    } catch (e) {
      console.error("Failed to sync credits to orchestrator:", e);
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
