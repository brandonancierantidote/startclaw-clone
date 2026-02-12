import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://46.225.107.94:5000";
const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET || "theone-orchestrator-secret-2026";

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

    const agentResult = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .eq("user_id", internalUserId)
      .single();

    if (agentResult.error || !agentResult.data) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(agentResult.data);
  } catch (error) {
    console.error("Failed to fetch agent:", error);
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const updates = await req.json();
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

    // Only allow updating certain fields
    const allowedFields = ["display_name", "soul_md", "config", "integrations", "status"];
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    const agentResult = await supabase
      .from("agents")
      .update(filteredUpdates)
      .eq("id", id)
      .eq("user_id", internalUserId)
      .select()
      .single();

    if (agentResult.error || !agentResult.data) {
      return NextResponse.json({ error: "Agent not found or update failed" }, { status: 404 });
    }

    return NextResponse.json(agentResult.data);
  } catch (error) {
    console.error("Failed to update agent:", error);
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

export async function DELETE(
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

    // Get the agent first to check ownership
    const agentResult = await supabase
      .from("agents")
      .select("id, container_id")
      .eq("id", id)
      .eq("user_id", internalUserId)
      .single();

    if (agentResult.error || !agentResult.data) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Deprovision the container if it exists
    if (agentResult.data.container_id) {
      try {
        await fetch(`${ORCHESTRATOR_URL}/api/agents/${id}/deprovision`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ORCHESTRATOR_SECRET}`,
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        console.error("Failed to deprovision container:", error);
      }
    }

    // Delete the agent from database
    const deleteResult = await supabase
      .from("agents")
      .delete()
      .eq("id", id)
      .eq("user_id", internalUserId);

    if (deleteResult.error) {
      console.error("Failed to delete agent:", deleteResult.error);
      return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}
