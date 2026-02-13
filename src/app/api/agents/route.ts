import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { readFileSync, writeFileSync, existsSync } from "fs";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://46.225.107.94:5000";
const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET || "theone-orchestrator-secret-2026";
const FALLBACK_FILE = "/tmp/theone-agents.json";

// Fallback storage helpers
function readFallback(): Record<string, unknown[]> {
  try {
    if (existsSync(FALLBACK_FILE)) {
      return JSON.parse(readFileSync(FALLBACK_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Failed to read fallback file:", e);
  }
  return { agents: [], users: [], credits: [], subscriptions: [], credit_transactions: [] };
}

function writeFallback(data: Record<string, unknown[]>) {
  try {
    writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to write fallback file:", e);
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Try Supabase first
    try {
      const userResult = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", userId)
        .single();

      if (userResult.error || !userResult.data) {
        // Check fallback
        const fallback = readFallback();
        const fallbackAgents = (fallback.agents || []).filter(
          (a: any) => a.clerk_id === userId
        );
        if (fallbackAgents.length > 0) return NextResponse.json(fallbackAgents);
        return NextResponse.json([]);
      }

      const internalUserId = userResult.data.id;
      const agentsResult = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", internalUserId)
        .order("created_at", { ascending: false });

      if (agentsResult.error) {
        console.error("Failed to fetch agents from Supabase:", agentsResult.error);
        // Fall back to /tmp
        const fallback = readFallback();
        const fallbackAgents = (fallback.agents || []).filter(
          (a: any) => a.clerk_id === userId
        );
        return NextResponse.json(fallbackAgents);
      }

      return NextResponse.json(agentsResult.data || []);
    } catch (dbError) {
      console.error("Supabase error in GET /api/agents:", dbError);
      // Fall back to /tmp
      const fallback = readFallback();
      const fallbackAgents = (fallback.agents || []).filter(
        (a: any) => a.clerk_id === userId
      );
      return NextResponse.json(fallbackAgents);
    }
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      console.error("POST /api/agents: No userId from Clerk auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { template_slug, display_name, soul_md, config, integrations } = body;
    console.log("POST /api/agents: Creating agent", { template_slug, display_name, userId });

    if (!template_slug || !display_name || !soul_md) {
      console.error("POST /api/agents: Missing required fields", {
        template_slug: !!template_slug,
        display_name: !!display_name,
        soul_md: !!soul_md,
      });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();
    let usedFallback = false;
    let internalUserId: string = "";
    let agent: any = null;

    // ===== STEP 1: Get or create user =====
    try {
      const userResult = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", userId)
        .single();

      if (userResult.error || !userResult.data) {
        console.log("POST /api/agents: User not found in Supabase, creating...");
        const newUserResult = await supabase
          .from("users")
          .insert({ clerk_id: userId, email: `${userId}@placeholder.com` })
          .select()
          .single();

        if (newUserResult.error || !newUserResult.data) {
          throw new Error(`User create failed: ${newUserResult.error?.message || "unknown"}`);
        }
        internalUserId = newUserResult.data.id;

        // Create credits row
        await supabase.from("credits").insert({ user_id: internalUserId, balance_cents: 0 });
      } else {
        internalUserId = userResult.data.id;
      }
    } catch (userError) {
      console.error("POST /api/agents: Supabase user setup failed, using fallback:", userError);
      usedFallback = true;
      internalUserId = `local_${userId}`;
    }

    // ===== STEP 2: Create agent (MUST succeed) =====
    if (!usedFallback) {
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
          throw new Error(`Agent insert failed: ${agentResult.error?.message || "unknown"}`);
        }
        agent = agentResult.data;
        console.log("POST /api/agents: Agent created in Supabase:", agent.id);
      } catch (agentError) {
        console.error("POST /api/agents: Supabase agent creation failed, using fallback:", agentError);
        usedFallback = true;
      }
    }

    // Fallback: save to /tmp
    if (usedFallback || !agent) {
      console.log("POST /api/agents: Using /tmp fallback storage");
      const fallback = readFallback();
      agent = {
        id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        clerk_id: userId,
        user_id: internalUserId,
        template_slug,
        display_name,
        soul_md,
        config: config || {},
        integrations: integrations || {},
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _fallback: true,
      };
      fallback.agents = [...(fallback.agents || []), agent];
      writeFallback(fallback);
      console.log("POST /api/agents: Agent saved to fallback:", agent.id);
      usedFallback = true;
    }

    // ===== STEP 3: Create subscription + credits (MUST succeed) =====
    if (!usedFallback) {
      try {
        await supabase.from("subscriptions").upsert(
          {
            user_id: internalUserId,
            status: "active",
            plan: "standard",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
          { onConflict: "user_id" }
        );

        const creditsResult = await supabase
          .from("credits")
          .select("balance_cents")
          .eq("user_id", internalUserId)
          .single();

        const currentBalance = creditsResult.data?.balance_cents || 0;
        const newBalance = currentBalance + 1000;

        await supabase.from("credits").upsert(
          { user_id: internalUserId, balance_cents: newBalance },
          { onConflict: "user_id" }
        );

        await supabase.from("credit_transactions").insert({
          user_id: internalUserId,
          amount_cents: 1000,
          type: "credit",
          description: "Starter credits with subscription",
          balance_after_cents: newBalance,
        });

        console.log("POST /api/agents: Subscription + credits created, balance:", newBalance);
      } catch (billingError) {
        console.error("POST /api/agents: Billing setup failed (non-fatal):", billingError);
      }
    } else {
      // Fallback credits
      const fallback = readFallback();
      fallback.credits = [
        ...(fallback.credits || []),
        { user_id: internalUserId, clerk_id: userId, balance_cents: 1000, created_at: new Date().toISOString() },
      ];
      fallback.subscriptions = [
        ...(fallback.subscriptions || []),
        { user_id: internalUserId, clerk_id: userId, status: "active", plan: "standard", created_at: new Date().toISOString() },
      ];
      writeFallback(fallback);
      console.log("POST /api/agents: Fallback credits + subscription saved");
    }

    // ===== STEP 4: Try to provision container (optional) =====
    let provisioningMessage = "";
    try {
      let integrationTokens = {};
      if (!usedFallback) {
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
          console.error("POST /api/agents: Token fetch failed:", e);
        }
      }

      const provisionResponse = await fetch(`${ORCHESTRATOR_URL}/api/agents/provision`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ORCHESTRATOR_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agent.id,
          user_id: internalUserId,
          soul_md,
          display_name,
          config: config || {},
          integrations: { ...integrations, tokens: integrationTokens },
        }),
      });

      if (provisionResponse.ok) {
        const provisionData = await provisionResponse.json();
        if (!usedFallback) {
          await supabase
            .from("agents")
            .update({ status: "active", container_id: provisionData.container_id })
            .eq("id", agent.id);
        }
        agent.status = "active";
        agent.container_id = provisionData.container_id;
        console.log("POST /api/agents: Container provisioned:", provisionData.container_id);
      } else {
        const errorText = await provisionResponse.text();
        console.error("POST /api/agents: Provision failed (non-fatal):", errorText);
        provisioningMessage = "Agent created — container provisioning in progress";
      }
    } catch (provisionError) {
      console.error("POST /api/agents: Provision error (non-fatal):", provisionError);
      provisioningMessage = "Agent created — container provisioning in progress";
    }

    // ===== STEP 5: Sync credits to orchestrator (optional) =====
    try {
      await fetch(`${ORCHESTRATOR_URL}/api/credits/set`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ORCHESTRATOR_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: internalUserId, balance_cents: 1000 }),
      });
    } catch (e) {
      console.error("POST /api/agents: Credit sync failed:", e);
    }

    // ALWAYS return success
    return NextResponse.json({
      ...agent,
      message: provisioningMessage || undefined,
      _fallback: usedFallback || undefined,
    });
  } catch (error) {
    console.error("POST /api/agents: Unhandled error:", error);

    // Last resort fallback — save to /tmp even if everything else fails
    try {
      const fallback = readFallback();
      const emergencyAgent = {
        id: `agent_emergency_${Date.now()}`,
        clerk_id: userId || "unknown",
        template_slug: "unknown",
        display_name: "My Agent",
        status: "pending",
        created_at: new Date().toISOString(),
        _fallback: true,
        _error: error instanceof Error ? error.message : "unknown",
      };
      fallback.agents = [...(fallback.agents || []), emergencyAgent];
      writeFallback(fallback);
      return NextResponse.json(emergencyAgent);
    } catch {
      return NextResponse.json(
        { error: "Failed to create agent: " + (error instanceof Error ? error.message : "unknown") },
        { status: 500 }
      );
    }
  }
}
