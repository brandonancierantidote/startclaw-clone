import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const LITELLM_URL = process.env.LITELLM_URL || "http://46.225.107.94:4000";
const LITELLM_KEY = process.env.LITELLM_API_KEY || "";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { description, agent_name, preferred_channel } = await req.json();

    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a more detailed description of what you want your agent to do" },
        { status: 400 }
      );
    }

    // Build the prompt for SOUL.md generation
    const systemPrompt = `You are an expert at creating SOUL.md configuration files for AI agents.
A SOUL.md file defines an AI agent's personality, capabilities, and behavior guidelines.

Generate a complete SOUL.md file based on the user's description. The file should include:

1. **Identity & Purpose**: A clear name and mission statement
2. **Personality Traits**: How the agent should communicate (tone, style, formality)
3. **Core Capabilities**: What the agent can do
4. **Behavior Guidelines**: Rules and constraints for the agent
5. **Communication Preferences**: Preferred channels and response styles
6. **Example Interactions**: 2-3 sample exchanges showing ideal behavior

Format the output as a valid markdown document that can be used directly as a SOUL.md file.
Keep it concise but comprehensive - aim for 300-500 words.
Make it feel personal and tailored to the user's specific needs.`;

    const userPrompt = `Create a SOUL.md file for an AI agent with the following requirements:

**Agent Name**: ${agent_name || "My Custom Agent"}
**Preferred Communication Channel**: ${preferred_channel || "any"}
**User's Description**:
${description}

Generate a complete, ready-to-use SOUL.md file for this agent.`;

    // Call LiteLLM to generate the SOUL.md
    const llmResponse = await fetch(`${LITELLM_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LITELLM_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "agent-light",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("LiteLLM error:", errorText);

      // Fallback: generate a basic SOUL.md template
      const fallbackSoul = generateFallbackSoul(agent_name, description, preferred_channel);
      return NextResponse.json({ soul_md: fallbackSoul });
    }

    const llmData = await llmResponse.json();
    const generatedSoul = llmData.choices?.[0]?.message?.content;

    if (!generatedSoul) {
      const fallbackSoul = generateFallbackSoul(agent_name, description, preferred_channel);
      return NextResponse.json({ soul_md: fallbackSoul });
    }

    return NextResponse.json({ soul_md: generatedSoul });
  } catch (error) {
    console.error("Generate custom soul error:", error);
    return NextResponse.json(
      { error: "Failed to generate agent configuration" },
      { status: 500 }
    );
  }
}

function generateFallbackSoul(name: string, description: string, channel: string): string {
  const agentName = name || "My Custom Agent";
  const channelText = channel === "email" ? "email"
    : channel === "whatsapp" ? "WhatsApp"
    : channel === "slack" ? "Slack"
    : channel === "telegram" ? "Telegram"
    : "any available channel";

  return `# ${agentName}

## Identity & Purpose
I am ${agentName}, a custom AI assistant created to help you with your specific needs.

## My Mission
${description}

## Personality
- Friendly and professional
- Clear and concise in communication
- Proactive in offering help
- Patient and understanding

## Communication Style
- Primary channel: ${channelText}
- Response style: Clear, helpful, and to the point
- Tone: Professional yet approachable

## Core Capabilities
Based on your description, I will:
- Understand your requests and context
- Provide relevant and actionable responses
- Learn from our interactions to serve you better
- Stay within the boundaries you've defined

## Guidelines
1. Always prioritize your needs and preferences
2. Ask for clarification when needed
3. Provide honest and accurate information
4. Respect privacy and confidentiality
5. Stay focused on the tasks you've defined

## Example Interaction
**You**: Can you help me with something?
**${agentName}**: Of course! I'm here to help. What do you need?

---
*This agent was created with The One custom agent builder.*
`;
}
