/**
 * LLM Client — Calls the Forge API directly for real agent execution.
 * Supports both streaming (SSE) and non-streaming modes.
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
 * Call the Forge LLM API with messages (non-streaming).
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
 * Call the Forge LLM API with streaming (SSE).
 * Calls onChunk with each delta as it arrives.
 * Returns the full accumulated content when done.
 */
export async function callLLMStream(
  messages: LLMMessage[],
  onChunk: (chunk: string, accumulated: string) => void,
): Promise<LLMResponse> {
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
      stream: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`LLM API error ${res.status}: ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let accumulated = "";
  let finishReason = "stop";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the last potentially incomplete line in buffer
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        const fr = parsed.choices?.[0]?.finish_reason;
        if (fr) finishReason = fr;
        if (delta) {
          accumulated += delta;
          onChunk(delta, accumulated);
        }
      } catch {
        // Skip malformed JSON chunks
      }
    }
  }

  // If streaming didn't produce output, fall back to non-streaming
  if (!accumulated) {
    const fallback = await callLLM(messages);
    return fallback;
  }

  return { content: accumulated, finishReason };
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

Moloco's key differentiators:
- **ML-first performance engine** — real-time bidding optimized for outcomes, not impressions
- **CTV-to-App measurement** — deep MMP integration (AppsFlyer, Branch, Adjust, Kochava) for post-view attribution
- **Unified cross-screen** — mobile + CTV in one platform for holistic audience targeting
- **Transparent pricing** — no hidden fees, CPM-based with performance guarantees

## Your Task
${promptText}

## Output Requirements
1. Be specific and actionable — no generic advice
2. Reference real CTV market dynamics (measurement challenges, MMP integration, incrementality, frequency capping, creative optimization)
3. Include concrete numbers, timelines, and next steps where applicable
4. If you're a persistent agent, include what you'd monitor going forward
5. If you're a triggered agent, specify what event triggered you and what you produced
6. Format your output with clear sections using **markdown headers** (## and ###)
7. Use **bold** for key metrics and emphasis
8. Use bullet points for action items
9. Keep output focused and under 500 words — this is an operational system, not an essay`;
}

/**
 * Execute an agent prompt with full LLM reasoning (non-streaming).
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

/**
 * Execute an agent prompt with streaming output.
 * Calls onChunk with each piece of output as it arrives.
 * Returns the full output when complete.
 */
export async function executeAgentPromptStream(
  promptText: string,
  moduleId: number,
  subModuleName: string,
  agentType: string = "persistent",
  owner: string = "agent",
  onChunk: (chunk: string, accumulated: string) => void,
): Promise<string> {
  const systemPrompt = buildAgentSystemPrompt(promptText, moduleId, subModuleName, agentType, owner);

  const response = await callLLMStream(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Execute this agent task now. Produce a real, actionable output as if this were a live production system. Be specific to Moloco CTV.\n\nTask: ${promptText}` },
    ],
    onChunk,
  );

  return response.content;
}
