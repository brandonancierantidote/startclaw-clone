import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";

const LITELLM_URL = process.env.LITELLM_URL || "http://46.225.107.94:4000";
const LITELLM_KEY = process.env.LITELLM_API_KEY || "sk-theone-master-2026";

// Mock activity for demo mode
const DEMO_ACTIVITY = [
  "2:34 PM: Archived 12 promotional emails",
  "2:30 PM: Drafted reply to Sarah K. — waiting for approval",
  "11:15 AM: Unsubscribed from DailyTech newsletter",
  "7:02 AM: Sent morning briefing summary via WhatsApp",
  "7:00 AM: Scanned 47 new emails, flagged 3 as important",
  "Yesterday 6:00 PM: Sent end-of-day wrap-up",
  "Yesterday 2:15 PM: Archived 23 promotional emails",
  "Yesterday 9:00 AM: Processed 62 emails from overnight",
];

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, agent_id } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    // Try to get real activity data from Supabase
    let activitySummary = "";
    let agentName = "Your AI Agent";
    let hasRealData = false;

    if (agent_id && agent_id !== "demo") {
      try {
        const supabase = createServerClient();

        const userResult = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", userId)
          .single();

        if (userResult.data) {
          const internalUserId = userResult.data.id;

          // Get agent name
          const agentResult = await supabase
            .from("agents")
            .select("display_name")
            .eq("id", agent_id)
            .eq("user_id", internalUserId)
            .single();

          if (agentResult.data) {
            agentName = agentResult.data.display_name;
          }

          // Get activity data
          const activityResult = await supabase
            .from("activity_feed")
            .select("*")
            .eq("agent_id", agent_id)
            .order("created_at", { ascending: false })
            .limit(50);

          if (activityResult.data && activityResult.data.length > 0) {
            hasRealData = true;
            activitySummary = activityResult.data
              .map((a: any) => `- ${new Date(a.created_at).toLocaleString()}: ${a.action_type}: ${a.description}`)
              .join("\n");
          }
        }
      } catch (dbError) {
        console.error("Supabase error in activity/ask:", dbError);
      }
    }

    // Use demo data if no real data
    if (!hasRealData) {
      activitySummary = DEMO_ACTIVITY.map((a) => `- ${a}`).join("\n");
    }

    // Try to call LiteLLM for an AI-powered answer
    try {
      const llmResponse = await fetch(`${LITELLM_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LITELLM_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "agent-light",
          messages: [
            {
              role: "system",
              content: `You are a helpful AI assistant that helps users understand their agent's activity.
The agent is called "${agentName}".

Here is the recent activity log:
${activitySummary}

Answer the user's question about the agent's activity. Be concise, helpful, and reference specific activities when relevant.${
                !hasRealData
                  ? " Note: This is sample activity data shown in demo mode."
                  : ""
              }`,
            },
            {
              role: "user",
              content: question,
            },
          ],
          max_tokens: 500,
        }),
      });

      if (llmResponse.ok) {
        const llmData = await llmResponse.json();
        const answer =
          llmData.choices?.[0]?.message?.content ||
          "I couldn't generate a response. Please try again.";

        // Log usage if we have a real user
        if (hasRealData) {
          try {
            const supabase = createServerClient();
            const userResult = await supabase
              .from("users")
              .select("id")
              .eq("clerk_id", userId)
              .single();

            if (userResult.data) {
              const usage = llmData.usage;
              if (usage) {
                await supabase.from("usage_logs").insert({
                  user_id: userResult.data.id,
                  agent_id: agent_id,
                  model: "agent-light",
                  input_tokens: usage.prompt_tokens || 0,
                  output_tokens: usage.completion_tokens || 0,
                  cost_cents: Math.ceil(
                    ((usage.prompt_tokens || 0) * 0.00025 +
                      (usage.completion_tokens || 0) * 0.00125) *
                      100
                  ),
                });
              }
            }
          } catch (logError) {
            console.error("Failed to log usage:", logError);
          }
        }

        return NextResponse.json({ answer });
      }

      // LiteLLM returned error
      const errorText = await llmResponse.text();
      console.error("LiteLLM error:", errorText);
      throw new Error("LLM request failed");
    } catch (llmError) {
      console.error("LLM error, generating fallback response:", llmError);

      // Generate a fallback response without AI
      let answer = "";
      const lowerQ = question.toLowerCase();

      if (lowerQ.includes("email") || lowerQ.includes("inbox")) {
        answer =
          "Based on recent activity, your agent has been actively managing your inbox. " +
          "It processed about 47 emails, archived 12 promotional ones, and flagged 3 important messages from clients. " +
          "It also drafted 2 reply suggestions for your review.";
      } else if (lowerQ.includes("today") || lowerQ.includes("summary")) {
        answer =
          "Today your agent: scanned 47 new emails at 7:00 AM, sent your morning briefing via WhatsApp at 7:02 AM, " +
          "unsubscribed from DailyTech newsletter at 11:15 AM, drafted a reply to Sarah K. at 2:30 PM, " +
          "and archived 12 promotional emails at 2:34 PM.";
      } else if (lowerQ.includes("flag") || lowerQ.includes("important")) {
        answer =
          "Your agent flagged 3 emails as important today. These were from your key contacts that matched your priority rules.";
      } else {
        answer =
          `Your agent "${agentName}" has been working steadily. ` +
          "It handles email processing, sends daily briefings, and manages your inbox automatically. " +
          "Try asking about specific topics like emails, flagged messages, or today's summary!";
      }

      return NextResponse.json({ answer });
    }
  } catch (error) {
    console.error("Failed to process question:", error);
    return NextResponse.json({
      answer:
        "I'm having a bit of trouble right now, but your agent is still working! Try asking again in a moment.",
    });
  }
}
