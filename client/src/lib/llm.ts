/**
 * LLM Client — Dual-mode: 
 * - Dev: Calls /api/llm (Vite proxy → Forge API with BUILT_IN_FORGE_API_KEY)
 * - Production: Calls /api/trpc/llm.chat (tRPC mutation → invokeLLM server-side)
 * Supports both streaming (SSE via /api/llm) and non-streaming modes.
 * Falls back gracefully between modes.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  finishReason: string;
}

/**
 * Call the LLM via tRPC mutation endpoint (production mode).
 * tRPC batch protocol: POST /api/trpc/llm.chat with JSON body.
 */
async function callLLMViaTRPC(messages: LLMMessage[]): Promise<LLMResponse> {
  // tRPC batch format: POST /api/trpc/llm.chat
  // Body: { "0": { "json": { messages, temperature, max_tokens } } }
  const res = await fetch("/api/trpc/llm.chat?batch=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      "0": {
        json: {
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`tRPC LLM error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  // tRPC batch response: [{ "result": { "data": { "json": { choices: [...] } } } }]
  const result = data?.[0]?.result?.data?.json;
  if (!result) {
    throw new Error("Invalid tRPC response format");
  }

  const choice = result.choices?.[0];
  return {
    content: choice?.message?.content || "No response generated.",
    finishReason: choice?.finish_reason || "stop",
  };
}

/**
 * Call the LLM via direct proxy endpoint (dev mode).
 */
async function callLLMViaProxy(messages: LLMMessage[]): Promise<LLMResponse> {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
 * Call the LLM via server proxy (non-streaming).
 * Tries /api/llm first (dev mode), falls back to /api/trpc (production).
 */
export async function callLLM(messages: LLMMessage[]): Promise<LLMResponse> {
  try {
    // Try direct proxy first (works in dev via Vite middleware)
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (res.status === 404) {
      // /api/llm not available (production) — fall back to tRPC
      return await callLLMViaTRPC(messages);
    }

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
  } catch (e: any) {
    // If the error is from our own throw, re-throw it
    if (e.message?.includes("LLM API error") || e.message?.includes("tRPC LLM error")) {
      throw e;
    }
    // Network error or /api/llm not available — try tRPC
    try {
      return await callLLMViaTRPC(messages);
    } catch (trpcErr: any) {
      throw new Error(`LLM call failed: ${e.message}. tRPC fallback also failed: ${trpcErr.message}`);
    }
  }
}

/**
 * Call the LLM via server proxy with streaming (SSE).
 * Tries /api/llm streaming first, falls back to non-streaming tRPC.
 */
export async function callLLMStream(
  messages: LLMMessage[],
  onChunk: (chunk: string, accumulated: string) => void,
): Promise<LLMResponse> {
  try {
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (res.status === 404) {
      // /api/llm not available (production) — fall back to non-streaming tRPC
      const result = await callLLMViaTRPC(messages);
      // Simulate streaming by delivering the full content at once
      onChunk(result.content, result.content);
      return result;
    }

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
      onChunk(fallback.content, fallback.content);
      return fallback;
    }

    return { content: accumulated, finishReason };
  } catch (e: any) {
    // Always try tRPC fallback on any error (including LLM API errors)
    try {
      const result = await callLLMViaTRPC(messages);
      onChunk(result.content, result.content);
      return result;
    } catch (trpcErr: any) {
      throw new Error(`LLM streaming failed: ${e.message}. tRPC fallback also failed: ${trpcErr.message}`);
    }
  }
}

/**
 * Build a rich system prompt for an agent based on its module context.
 * Each agent gets deep CTV market knowledge and Moloco-specific guidance.
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

  const moduleDeepContext: Record<number, string> = {
    1: `## M1 Deep Context — Market Intelligence
- CTV ad spend reached $25.9B in 2024 (eMarketer), projected $33B+ by 2026
- Key measurement shift: deterministic CTV-to-App attribution via MMP (AppsFlyer, Adjust, Branch, Kochava) replacing probabilistic models
- Incrementality is the #1 buyer concern — ghost bidding, PSA holdouts, geo-matched panels are standard
- Competitive landscape: The Trade Desk (dominant, $1.9B rev), tvScientific (performance-native), Amazon DSP (walled garden + Freevee), Roku OneView (OS-level data), Viant (Household ID)
- Moloco advantage: ML-first bidding engine trained on 10B+ daily events, real-time optimization vs. TTD's batch-based approach
- FAST channels growing 40% YoY — Tubi, Pluto, Freevee, Samsung TV Plus creating massive non-premium inventory
- Supply path: direct PMP deals with premium publishers (Paramount, NBCU, Disney) + open exchange via Magnite, SpotX, FreeWheel`,

    2: `## M2 Deep Context — Demand Generation & Pipeline
- CTV buyer personas: Performance Marketing Directors (app-first), Brand Media Planners (reach/frequency), Agency Trading Desks (programmatic execution)
- Key objection patterns: "We already use TTD" (counter: ML performance lift), "CTV can't prove incrementality" (counter: MMP integration + holdout design), "Budget is locked with upfronts" (counter: scatter/programmatic allocation)
- Pipeline velocity benchmarks: 45-day avg deal cycle for mid-market, 90-120 days for enterprise
- SDR→AE handoff criteria: confirmed CTV budget >$50K/mo, identified decision maker, technical fit validated
- MDF/TA programs: co-marketing with MMPs (joint webinars, case studies), agency incentive tiers, pilot funding for first 90 days
- Content that converts: incrementality case studies (2-3x ROAS lift), head-to-head TTD comparisons, CTV-to-App measurement demos`,

    3: `## M3 Deep Context — Sales Execution & Revenue
- Deal structure: CPM-based pricing ($15-45 CPM depending on targeting), minimum commitments $25K-100K/mo, 90-day pilot standard
- Negotiation levers: volume discounts, exclusivity windows, measurement guarantees, creative production credits
- Technical requirements: VAST 4.2 tag support, server-side ad insertion (SSAI), frequency capping across devices, brand safety (IAS/DV integration)
- Onboarding SLA: 5-day technical setup, 10-day campaign launch, 30-day optimization cycle
- Revenue targets: $200M App ARR, $50M Web ARR (validation phase), 40% QoQ growth trajectory
- Win rate optimization: demo-to-proposal 60%+, proposal-to-close 35%+, average deal size $150K-500K annual
- Competitive displacement playbook: TTD migration (show ML lift), Amazon DSP escape (transparency + cross-screen), direct IO consolidation (programmatic efficiency)`,

    4: `## M4 Deep Context — Customer Success & Growth
- Health scoring: spend velocity (vs. committed), ROAS trend (7/14/30 day), creative refresh rate, support ticket volume, NPS
- Expansion triggers: hitting 80%+ of committed spend in first 60 days, positive incrementality results, new app/product launches
- Churn signals: declining spend 3 consecutive weeks, no creative refresh in 30 days, unresolved measurement disputes, champion departure
- QBR framework: performance review (ROAS, CPA, incrementality), competitive benchmarks, roadmap preview, expansion proposal
- Upsell motions: mobile→CTV cross-screen, app→web retargeting, single-app→portfolio, US→international
- Strategic account management: executive sponsors, joint business plans, beta access programs, advisory board seats
- Retention target: 95%+ logo retention, 120%+ net revenue retention (NRR)`,
  };

  return `You are an autonomous AI agent operating within the CTV AI Commercial Engine — Moloco's AI-first commercial operating system for CTV advertising.

## Your Identity
- **Module**: M${moduleId} — ${moduleNames[moduleId] || "Cross-Module"}
- **Sub-Module**: ${subModuleName}
- **Agent Type**: ${agentType} (${agentType === "persistent" ? "runs continuously, monitoring 24/7" : agentType === "triggered" ? "fires on specific events or cycles" : "coordinates other agents"})
- **Ownership Model**: ${owner} (${owner === "agent" ? "fully autonomous — you generate and execute" : owner === "agent-human" ? "you generate, human approves" : "human leads, you assist"})

## Moloco CTV Platform Context
Moloco is entering the CTV (Connected TV) advertising market with an ML-first DSP platform. The target is $200M App ARR with a 2-FTE operating model powered by AI agents like you.

**Moloco's key differentiators:**
- **ML-first performance engine** — real-time bidding optimized for outcomes, not impressions. 10B+ daily events training the model.
- **CTV-to-App measurement** — deep MMP integration (AppsFlyer, Branch, Adjust, Kochava) for deterministic post-view attribution
- **Unified cross-screen** — mobile + CTV in one platform for holistic audience targeting and frequency management
- **Transparent pricing** — no hidden fees, CPM-based with performance guarantees, full log-level reporting
- **Retail Media integration** — Moloco Commerce Media (MCM) for 1P data activation on CTV

${moduleDeepContext[moduleId] || ""}

## Your Task
${promptText}

## Output Requirements
1. **Be deeply specific** — reference real companies, real metrics, real market dynamics. No generic advice.
2. **Include concrete numbers** — TAM figures, conversion benchmarks, pricing ranges, timeline estimates with dates
3. **Name competitors by name** — The Trade Desk, tvScientific, Amazon DSP, Roku OneView, Viant, etc.
4. **Provide actionable next steps** — specific actions with owners, timelines, and success criteria
5. **Reference measurement frameworks** — incrementality testing, MMP attribution, ROAS benchmarks
6. If you're a persistent agent, include what you'd monitor going forward with specific KPIs
7. If you're a triggered agent, specify what event triggered you and what you produced
8. Format with **markdown headers** (## and ###), **bold** for key metrics, bullet points for action items
9. Include a "## Key Metrics" section with 3-5 specific measurable outcomes
10. Keep output focused and under 600 words — this is an operational system, not an essay`;
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
    { role: "user", content: `Execute this agent task now. Produce a real, actionable output as if this were a live production system. Deep dive on the facts — include specific market data, competitor analysis, and concrete guidance.\n\nTask: ${promptText}` },
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
      { role: "user", content: `Execute this agent task now. Produce a real, actionable output as if this were a live production system. Deep dive on the facts — include specific market data, competitor analysis, and concrete guidance.\n\nTask: ${promptText}` },
    ],
    onChunk,
  );

  return response.content;
}
