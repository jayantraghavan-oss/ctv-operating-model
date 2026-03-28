/**
 * LLM Client — Calls the Forge API directly for real agent execution.
 * Every prompt becomes a live cognitive unit that pulls real context and reasons.
 */

const FORGE_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.manus.ai";
const FORGE_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY || "";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  finishReason: string;
}

/**
 * Call the Forge LLM API with messages.
 * Returns the assistant's response content.
 */
export async function callLLM(messages: LLMMessage[]): Promise<LLMResponse> {
  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORGE_KEY}`,
    },
    body: JSON.stringify({
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`LLM API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || "No response generated.",
    finishReason: choice?.finish_reason || "stop",
  };
}

/**
 * Build a rich system prompt for an agent based on its module context.
 */
export function buildAgentSystemPrompt(
  promptText: string,
  moduleId: number,
  subModuleName: string,
  agentType: string,
  owner: string,
): string {
  const moduleNames: Record<number, string> = {
    1: "Market Intelligence & Positioning",
    2: "Demand Generation & Pipeline",
    3: "Sales Execution & Revenue",
    4: "Customer Success & Growth",
  };

  return `You are an autonomous AI agent operating within the CTV AI Commercial Engine — Moloco's AI-first commercial operating system for CTV advertising.

## Your Identity
- **Module**: M${moduleId} — ${moduleNames[moduleId] || "Cross-Module"}
- **Sub-Module**: ${subModuleName}
- **Agent Type**: ${agentType} (${agentType === "persistent" ? "runs continuously, monitoring 24/7" : agentType === "triggered" ? "fires on specific events or cycles" : "coordinates other agents"})
- **Ownership Model**: ${owner} (${owner === "agent" ? "fully autonomous — you generate and execute" : owner === "agent-human" ? "you generate, human approves" : "human leads, you assist"})

## Context
Moloco is entering the CTV (Connected TV) advertising market with an ML-first DSP platform. The target is $200M App ARR with a 2-FTE operating model powered by AI agents like you. Key competitors include The Trade Desk, tvScientific, Roku OneView, Amazon DSP, and Viant.

## Your Task
${promptText}

## Output Requirements
1. Be specific and actionable — no generic advice
2. Reference real CTV market dynamics (measurement challenges, MMP integration, incrementality, frequency capping, creative optimization)
3. Include concrete numbers, timelines, and next steps where applicable
4. If you're a persistent agent, include what you'd monitor going forward
5. If you're a triggered agent, specify what event triggered you and what you produced
6. Format your output with clear sections using markdown headers
7. Keep output focused and under 500 words — this is an operational system, not an essay`;
}

/**
 * Execute an agent prompt with full LLM reasoning.
 * Returns the real LLM output.
 */
export async function executeAgentPrompt(
  promptText: string,
  moduleId: number,
  subModuleName: string,
  agentType: string = "persistent",
  owner: string = "agent",
): Promise<string> {
  const systemPrompt = buildAgentSystemPrompt(promptText, moduleId, subModuleName, agentType, owner);

  const response = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: `Execute this agent task now. Produce a real, actionable output as if this were a live production system. Be specific to Moloco CTV.\n\nTask: ${promptText}` },
  ]);

  return response.content;
}
