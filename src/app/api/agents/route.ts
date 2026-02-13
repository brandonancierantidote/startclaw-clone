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
      console.error("POST /api/agents: No userId from Clerk auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { template_slug, display_name, soul_md, config, integrations } = body;
    console.log("POST /api/agents: Creating agent", { template_slug, display_name, userId });

    if (!template_slug || !display_name || !soul_md) {
      console.error("POST /api/agents: Missing required fields", { template_slug: !!template_slug, display_name: !!display_name, soul_md: !!soul_md });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Step 1: Get or create user's internal ID
    let internalUserId: string;
    try {
      const userResult = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", userId)
        .single();

      if (userResult.error || !userResult.data) {
        console.log("POST /api/agents: User not found, creating new user");
        const newUserResult = await supabase
          .from("users")
          .insert({
            clerk_id: userId,
            email: `${userId}@placeholder.com`,
          })
          .select()
          .single();

        if (newUserResult.error || !newUserResult.data) {
          console.error("POST /api/agents: Failed to create user:", newUserResult.error);
          return NextResponse.json({ error: "Failed to create user: " + (newUserResult.error?.message || "unknown error") }, { status: 500 });
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
    } catch (userError) {
      console.error("POST /api/agents: User lookup/creation failed:", userError);
      return NextResponse.json({ error: "Database error during user setup" }, { status: 500 });
    }

    // Step 2: Create the agent in database (MUST succeed)
    let agent;
    try {
      const agentResult = await supabase
        .from("agents")
        .insert({
          user_id: internalUserId,
          template_slug,
          display_name,
          soul_md,
          config: config || {},
          integrations: integrations || {},
          status: "pending",
        })
        .select()
        .single();

      if (agentResult.error || !agentResult.data) {
        console.error("POST /api/agents: Failed to create agent in DB:", agentResult.error);
        return NextResponse.json({ error: "Failed to create agent: " + (agentResult.error?.message || "unknown error") }, { status: 500 });
      }
      agent = agentResult.data;
      console.log("POST /api/agents: Agent created in DB with id:", agent.id);
    } catch (agentError) {
      console.error("POST /api/agents: Agent creation threw:", agentError);
      return NextResponse.json({ error: "Database error during agent creation" }, { status: 500 });
    }

    // Step 3: Create subscription + add credits (MUST succeed)
    try {
      await supabase.from("subscriptions").upsert({
        user_id: internalUserId,
        status: "active",
        plan: "standard",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "user_id" });

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

      await supabase.from("credit_transactions").insert({
        user_id: internalUserId,
        amount_cents: 1000,
        type: "credit",
        description: "Starter credits with subscription",
        balance_after_cents: newBalance,
      });

      console.log("POST /api/agents: Subscription and credits created, balance:", newBalance);
    } catch (billingError) {
      console.error("POST /api/agents: Billing setup failed (non-fatal):", billingError);
      // Don't fail the whole request — agent is already created
    }

    // Step 4: Optionally try to provision container on Hetzner (OK if this fails)
    let provisioningMessage = "";
    try {
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
        console.error("POST /api/agents: Failed to fetch integration tokens:", e);
      }

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

      if (provisionResponse.ok) {
        const provisionData = await provisionResponse.json();
        await supabase
          .from("agents")
          .update({
            status: "active",
            container_id: provisionData.container_id,
          })
          .eq("id", agent.id);
        agent.status = "active";
        agent.container_id = provisionData.container_id;
        console.log("POST /api/agents: Container provisioned:", provisionData.container_id);
      } else {
        const errorText = await provisionResponse.text();
        console.error("POST /api/agents: Orchestrator provision failed (non-fatal):", errorText);
        provisioningMessage = "Agent created — container provisioning in progress";
      }
    } catch (provisionError) {
      console.error("POST /api/agents: Container provisioning failed (non-fatal):", provisionError);
      provisioningMessage = "Agent created — container provisioning in progress";
    }

    // Sync credit balance to orchestrator Redis (optional)
    try {
      const creditsResult = await supabase
        .from("credits")
        .select("balance_cents")
        .eq("user_id", internalUserId)
        .single();

      if (creditsResult.data) {
        await fetch(`${ORCHESTRATOR_URL}/api/credits/set`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ORCHESTRATOR_SECRET}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: internalUserId,
            balance_cents: creditsResult.data.balance_cents,
          }),
        });
      }
    } catch (e) {
      console.error("POST /api/agents: Failed to sync credits to orchestrator:", e);
    }

    // Always return success — agent is created
    return NextResponse.json({
      ...agent,
      message: provisioningMessage || undefined,
    });
  } catch (error) {
    console.error("POST /api/agents: Unhandled error:", error);
    return NextResponse.json({ error: "Failed to create agent: " + (error instanceof Error ? error.message : "unknown error") }, { status: 500 });
  }
}
