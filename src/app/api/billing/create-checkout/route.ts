import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // MOCK: Skip Stripe, directly create subscription and add credits
    try {
      const supabase = createServerClient();

      // Get or create user
      let user;
      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", userId)
        .single();

      if (userError || !existingUser) {
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            clerk_id: userId,
            email: `${userId}@placeholder.com`,
          })
          .select()
          .single();

        if (createError) throw createError;
        user = newUser;

        // Create credits row
        await supabase.from("credits").insert({
          user_id: user.id,
          balance_cents: 0,
        });
      } else {
        user = existingUser;
      }

      // Create or update subscription
      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          status: "active",
          plan: "standard",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (subError) throw subError;

      // Add 1000 credits ($10)
      const { data: credits } = await supabase
        .from("credits")
        .select("balance_cents")
        .eq("user_id", user.id)
        .single();

      const currentBalance = credits?.balance_cents || 0;
      const newBalance = currentBalance + 1000;

      await supabase
        .from("credits")
        .update({ balance_cents: newBalance })
        .eq("user_id", user.id);

      // Record transaction
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount_cents: 1000,
        type: "credit",
        description: "Starter credits with subscription",
        balance_after_cents: newBalance,
      });

      return NextResponse.json({ url: "/dashboard" });
    } catch (error) {
      console.error("Database error:", error);
      // Return dashboard anyway - mock mode
      return NextResponse.json({ url: "/dashboard" });
    }
  } catch (error) {
    console.error("Failed to create checkout:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
