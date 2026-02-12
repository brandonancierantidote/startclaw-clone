import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET || "theone-orchestrator-secret-2026";

/**
 * Called by LiteLLM after each API call to deduct credits
 * This endpoint is called from the Hetzner server
 */
export async function POST(req: Request) {
  try {
    // Verify the request is from our orchestrator
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${ORCHESTRATOR_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { user_id, agent_id, cost_cents, model, input_tokens, output_tokens, total_tokens } = body;

    if (!user_id || cost_cents === undefined) {
      return NextResponse.json({ error: "user_id and cost_cents required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get current credit balance
    const { data: credits, error: creditsError } = await supabase
      .from("credits")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (creditsError || !credits) {
      console.error("Credits not found for user:", user_id);
      return NextResponse.json({ error: "Credits not found" }, { status: 404 });
    }

    const newBalance = Math.max(0, credits.balance_cents - cost_cents);

    // Update credit balance
    const { error: updateError } = await supabase
      .from("credits")
      .update({ balance_cents: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Failed to update credits:", updateError);
      return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
    }

    // Log usage
    await supabase.from("usage_logs").insert({
      agent_id,
      user_id,
      model,
      input_tokens: input_tokens || 0,
      output_tokens: output_tokens || 0,
      total_tokens: total_tokens || 0,
      cost_cents,
      request_type: "chat",
      metadata: {},
    });

    // Record credit transaction
    await supabase.from("credit_transactions").insert({
      user_id,
      type: "usage",
      amount_cents: -cost_cents,
      balance_after_cents: newBalance,
      description: `AI usage: ${model}`,
    });

    // Check if we need to auto-recharge
    if (credits.auto_recharge_enabled && newBalance <= credits.low_balance_threshold_cents) {
      // TODO: Trigger Stripe auto-recharge
      console.log("Auto-recharge triggered for user:", user_id);
    }

    // Check if agent should be paused
    if (newBalance <= 0) {
      // Pause the agent
      if (agent_id) {
        await supabase
          .from("agents")
          .update({ status: "paused" })
          .eq("id", agent_id);
      }
    }

    return NextResponse.json({
      success: true,
      new_balance_cents: newBalance,
      auto_recharge_triggered: credits.auto_recharge_enabled && newBalance <= credits.low_balance_threshold_cents,
    });
  } catch (error) {
    console.error("Credit callback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
