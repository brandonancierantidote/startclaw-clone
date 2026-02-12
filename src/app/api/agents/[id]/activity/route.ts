import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
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

    // Verify agent belongs to user
    const agentResult = await supabase
      .from("agents")
      .select("id")
      .eq("id", id)
      .eq("user_id", internalUserId)
      .single();

    if (agentResult.error || !agentResult.data) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get activity feed
    const activityResult = await supabase
      .from("activity_feed")
      .select("*")
      .eq("agent_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (activityResult.error) {
      console.error("Failed to fetch activity:", activityResult.error);
      return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
    }

    return NextResponse.json(activityResult.data || []);
  } catch (error) {
    console.error("Failed to fetch activity:", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
