import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || "http://46.225.107.94:5000";
const LITELLM_URL = "http://46.225.107.94:4000";
const LITELLM_KEY = "sk-theone-master-2026";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, agent_id } = await req.json();

    if (!question || !agent_id) {
      return NextResponse.json({ error: "Missing question or agent_id" }, { status: 400 });
    }

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
      .select("id, display_name, soul_md")
      .eq("id", agent_id)
      .eq("user_id", internalUserId)
      .single();

    if (agentResult.error || !agentResult.data) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get activity data
    const activityResult = await supabase
      .from("activity_feed")
      .select("*")
      .eq("agent_id", agent_id)
      .order("created_at", { ascending: false })
      .limit(50);

    const activities = activityResult.data || [];

    // Format activity for the AI prompt
    const activitySummary = activities.length > 0
      ? activities.map((a) => {
          const time = new Date(a.created_at).toLocaleString();
          return `- ${time}: ${a.action}`;
        }).join("\n")
      : "No activity recorded yet.";

    // Call LiteLLM to generate a response
    try {
      const llmResponse = await fetch(`${LITELLM_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LITELLM_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "agent-light", // Use Haiku for quick responses
          messages: [
            {
              role: "system",
              content: `You are a helpful AI assistant that helps users understand their agent's activity.
The agent is called "${agentResult.data.display_name}".

Here is the recent activity log:
${activitySummary}

Answer the user's question about the agent's activity. Be concise, helpful, and reference specific activities when relevant. If there's no activity yet, let them know the agent is still getting started.`,
            },
            {
              role: "user",
              content: question,
            },
          ],
          max_tokens: 500,
        }),
      });

      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        console.error("LiteLLM error:", errorText);
        throw new Error("LLM request failed");
      }

      const llmData = await llmResponse.json();
      const answer = llmData.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

      // Log the usage for billing
      const usage = llmData.usage;
      if (usage) {
        await supabase.from("usage_logs").insert({
          user_id: internalUserId,
          agent_id: agent_id,
          model: "agent-light",
          input_tokens: usage.prompt_tokens || 0,
          output_tokens: usage.completion_tokens || 0,
          cost_cents: Math.ceil(((usage.prompt_tokens || 0) * 0.00025 + (usage.completion_tokens || 0) * 0.00125) * 100),
        });
      }

      return NextResponse.json({ answer });
    } catch (llmError) {
      console.error("LLM error, generating fallback response:", llmError);

      // Fallback: Generate a simple response without AI
      let answer = "";
      if (activities.length === 0) {
        answer = "I don't have any activity data yet. Once your agent starts working, you'll be able to ask about what it's done!";
      } else {
        answer = `Here's what I found in the recent activity:\n\n`;
        activities.slice(0, 5).forEach((a) => {
          const time = new Date(a.created_at).toLocaleTimeString();
          answer += `- ${time}: ${a.action}\n`;
        });
      }
      return NextResponse.json({ answer });
    }
  } catch (error) {
    console.error("Failed to process question:", error);
    return NextResponse.json({ error: "Failed to process question" }, { status: 500 });
  }
}
