import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

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
      // User doesn't exist yet - return default empty state
      return NextResponse.json({
        balance_cents: 0,
        auto_recharge_enabled: false,
        transactions: [],
      });
    }
    const internalUserId = userResult.data.id;

    // Get credits
    const creditsResult = await supabase
      .from("credits")
      .select("*")
      .eq("user_id", internalUserId)
      .single();

    if (creditsResult.error || !creditsResult.data) {
      // No credits row yet - return default
      return NextResponse.json({
        balance_cents: 0,
        auto_recharge_enabled: false,
        transactions: [],
      });
    }

    // Get recent transactions
    const transResult = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", internalUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      balance_cents: creditsResult.data.balance_cents,
      auto_recharge_enabled: creditsResult.data.auto_recharge_enabled,
      transactions: transResult.data || [],
    });
  } catch (error) {
    console.error("Failed to fetch credits:", error);
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
  }
}
