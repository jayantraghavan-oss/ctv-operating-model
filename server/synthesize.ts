/**
 * Cross-signal synthesis engine.
 * Combines BQ revenue, Gong voice, deal patterns, and competitive intelligence
 * into a unified strategic assessment.
 */
import { invokeLLM } from "./_core/llm";
import { fetchBQData } from "./bqBridge";
import { fetchGongWithTranscripts } from "./gongBridge";

async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return fn();
  }
}

export interface SynthesisResult {
  available: boolean;
  synthesis: {
    executive_summary: string;
    confidence_level: string;
    confidence_rationale: string;
    risks: { title: string; detail: string; severity: string; data_source: string }[];
    opportunities: { title: string; detail: string; impact: string; data_source: string }[];
    open_questions: { question: string; why_it_matters: string; data_needed: string }[];
    action_plan: { priority: number; action: string; owner: string; metric: string; rationale: string; timeline: string }[];
    cross_signal_patterns: { pattern: string; signals: string[]; implication: string }[];
    parse_error?: boolean;
  } | null;
  data_sources_used: string[];
  analyzed_at: string;
  error?: string;
}

export async function runSynthesis(): Promise<SynthesisResult> {
  try {
    // Gather all available data sources in parallel
    const [bqData, gongData] = await Promise.all([
      fetchBQData(false).catch(() => null),
      fetchGongWithTranscripts(false).catch(() => ({
        available: false,
        transcript_samples: [] as any[],
        ctv_matched_calls: 0,
        unique_advertisers: 0,
        duration_stats: { total_hours: 0 },
        advertiser_coverage: [],
      })),
    ]);

    const dataSources: string[] = [];

    // Build BQ context
    let bqContext = "BigQuery data: NOT AVAILABLE";
    if (bqData) {
      dataSources.push("BigQuery (fact_dsp_core)");
      const s = bqData.summary?.[0];
      const t = bqData.trailing_7d?.[0];
      const topAdvs = bqData.top_advertisers
        ?.slice(0, 5)
        .map((a: any) => `${a.advertiser}: $${(a.total_gas / 1000).toFixed(0)}K`)
        .join(", ") || "N/A";
      const conc = bqData.concentration?.slice(0, 5) || [];
      const top5Pct = conc.length >= 5 ? conc[4]?.cumulative_pct?.toFixed(0) : "?";
      const monthlyTrend = bqData.monthly
        ?.slice(-3)
        .map((m: any) => `${m.month}: $${(m.avg_daily_gas / 1000).toFixed(0)}K/day`)
        .join(", ") || "N/A";
      bqContext = `BigQuery Revenue Data (LIVE):
- Total GAS: $${((s?.total_gas || 0) / 1000).toFixed(0)}K
- Trailing 7d daily avg: $${((t?.trailing_7d_daily || 0) / 1000).toFixed(0)}K/day
- ARR run rate: $${((t?.trailing_7d_daily || 0) * 365 / 1_000_000).toFixed(1)}M
- Active campaigns (7d): ${t?.active_campaigns_7d || 0}
- Active advertisers (7d): ${t?.active_advertisers_7d || 0}
- Top 5 advertisers: ${topAdvs}
- Top 5 concentration: ${top5Pct}% of total GAS
- Monthly trend (last 3): ${monthlyTrend}`;
    }

    // Build Gong context
    let gongContext = "Gong data: NOT AVAILABLE";
    const gd = gongData as any;
    if (gd?.available) {
      dataSources.push("Gong (CTV calls)");
      const transcriptSnippets = gd.transcript_samples
        ?.slice(0, 5)
        .map((t: any) =>
          `[${t.advertiser}] ${t.title} (${t.date}): ${t.transcript_excerpt?.slice(0, 400) || "no transcript"}`
        )
        .join("\n") || "";
      gongContext = `Gong Call Intelligence (LIVE):
- Total CTV calls: ${gd.ctv_matched_calls || 0}
- Unique advertisers: ${gd.unique_advertisers || 0}
- Total hours: ${gd.duration_stats?.total_hours?.toFixed(0) || 0}h
- Top accounts by calls: ${gd.advertiser_coverage?.slice(0, 8).map((a: any) => `${a.advertiser} (${a.call_count})`).join(", ") || "N/A"}
- Recent transcript excerpts:
${transcriptSnippets}`;
    }

    dataSources.push("Curated deal intelligence");

    const systemPrompt = `You are a senior CTV business strategist at Moloco, synthesizing multiple data signals into a unified strategic assessment. You combine:
1. Revenue data (BigQuery) — trajectory, concentration, growth rate
2. Customer voice (Gong) — themes, sentiment, objections from real calls
3. Deal patterns — win/loss behaviors, competitive dynamics
4. Market position — TAM penetration, competitive win rates

Your synthesis should read like a McKinsey partner's assessment — concise, data-grounded, actionable. Every claim must reference which data source supports it.

RULES:
- Be specific with numbers — don't round excessively
- Distinguish between live data (BQ/Gong) and curated/estimated data
- Identify cross-signal patterns (e.g., revenue concentration + customer sentiment = specific risk)
- Prioritize actions by expected impact, not just urgency
- Be honest about data gaps and confidence levels
- Keep each text field to 1-2 sentences max for readability`;

    const userPrompt = `Synthesize these data signals into a strategic CTV business assessment:

${bqContext}

${gongContext}

Curated Deal Intelligence:
- Win rate overall: ~62%
- Win rate vs MNTN: 80%, vs Tatari: 75%, vs Amazon DSP: 45%, vs DV360: 52%
- Top winning behaviors: Multi-threading (+58pp), Technical POC (+60pp), Case study shared (+63pp), Measurement framework agreed (+94% win rate)
- Top loss reasons: No attribution path (34%), Budget freeze (22%), Incumbent renewal (18%)
- TAM: $8.5B CTV market, ~4% Moloco penetration
- Target: $100M ARR

Produce a JSON response with these exact fields:
{
  "executive_summary": "2-3 sentence strategic summary",
  "confidence_level": "high|medium|low",
  "confidence_rationale": "why this confidence level",
  "risks": [
    { "title": "short title", "detail": "1-2 sentence explanation with specific numbers", "severity": "critical|high|medium", "data_source": "BQ|Gong|Curated|Cross-signal" }
  ],
  "opportunities": [
    { "title": "short title", "detail": "1-2 sentence explanation with specific numbers", "impact": "high|medium", "data_source": "BQ|Gong|Curated|Cross-signal" }
  ],
  "open_questions": [
    { "question": "the question", "why_it_matters": "why it matters", "data_needed": "what data would answer it" }
  ],
  "action_plan": [
    { "priority": 1, "action": "specific action", "owner": "team/role", "metric": "measurable success criteria", "rationale": "why this priority", "timeline": "timeframe" }
  ],
  "cross_signal_patterns": [
    { "pattern": "pattern name", "signals": ["signal 1", "signal 2"], "implication": "what this means" }
  ]
}

Aim for 3-5 items in each array. Return ONLY valid JSON.`;

    const response = await retryOnce(() =>
      invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      })
    );

    let content = response.choices?.[0]?.message?.content || "{}";
    content = content.replace(/\b(\d+\.\d+)E0{5,}\b/gi, (_, num: string) => num);
    content = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let synthesis;
    try {
      synthesis = JSON.parse(content);
    } catch (parseErr: any) {
      console.error("[Synthesis] JSON parse error:", parseErr.message);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          synthesis = JSON.parse(jsonMatch[0]);
        } catch {
          synthesis = { executive_summary: content.slice(0, 500), parse_error: true };
        }
      } else {
        synthesis = { executive_summary: content.slice(0, 500), parse_error: true };
      }
    }

    return {
      available: true,
      synthesis,
      data_sources_used: dataSources,
      analyzed_at: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("[Synthesis] Error:", err.message);
    return {
      available: false,
      synthesis: null,
      data_sources_used: [],
      analyzed_at: new Date().toISOString(),
      error: err.message,
    };
  }
}
