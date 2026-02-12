import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://46.225.107.94:5000";
const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET || "theone-orchestrator-secret-2026";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { agent_id } = body;

    if (!agent_id) {
      return NextResponse.json({ error: "agent_id required" }, { status: 400 });
    }

    // Call the Hetzner orchestrator to deprovision the container
    const response = await fetch(`${ORCHESTRATOR_URL}/api/agents/${agent_id}/deprovision`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ORCHESTRATOR_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Orchestrator deprovision error:", error);
      return NextResponse.json(
        { error: "Failed to deprovision agent", details: error },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Deprovision error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
