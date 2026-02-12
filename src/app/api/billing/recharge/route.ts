import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://46.225.107.94:5000";
const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET || "theone-orchestrator-secret-2026";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get user
    const userResult = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const internalUserId = userResult.data.id;

    // Get current balance
    const creditsResult = await supabase
      .from("credits")
      .select("balance_cents")
      .eq("user_id", internalUserId)
      .single();

    if (creditsResult.error || !creditsResult.data) {
      return NextResponse.json({ error: "Credits not found" }, { status: 404 });
    }

    const currentBalance = creditsResult.data.balance_cents;
    const newBalance = currentBalance + 2500; // Add $25

    // Update balance
    const updateResult = await supabase
      .from("credits")
      .update({ balance_cents: newBalance })
      .eq("user_id", internalUserId);

    if (updateResult.error) {
      console.error("Failed to update credits:", updateResult.error);
      return NextResponse.json({ error: "Failed to recharge" }, { status: 500 });
    }

    // Record transaction
    await supabase.from("credit_transactions").insert({
      user_id: internalUserId,
      amount_cents: 2500,
      type: "credit",
      description: "Manual recharge",
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

    return NextResponse.json({ balance_cents: newBalance });
  } catch (error) {
    console.error("Failed to recharge:", error);
    return NextResponse.json({ error: "Failed to recharge" }, { status: 500 });
  }
}
