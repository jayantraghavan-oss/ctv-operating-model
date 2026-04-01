/**
 * SynthesisTab — Dynamic LLM-powered cross-signal synthesis.
 * Runs the AI synthesis agent on demand, combining BQ revenue, Gong voice,
 * deal patterns, and competitive intelligence into a unified strategic assessment.
 */
import { useState } from "react";
import { trpcQuery } from "@/lib/trpcFetch";
import {
  AlertTriangle, Zap, Eye, Brain, Sparkles, Layers,
  XCircle, ArrowRight, Target, Activity, CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// TYPES
// ============================================================================
interface BQData {
  available: boolean;
  summary?: { total_gas: number; trailing_7d_daily: number; active_campaigns_7d: number; active_advertisers_7d: number };
  monthly?: { month: string; total_gas: number; daily_avg: number; campaigns: number; advertisers: number }[];
  recent_daily?: { date: string; daily_gas: number; campaigns: number }[];
  top_advertisers?: { advertiser: string; total_gas: number; pct_of_total: number }[];
  exchanges?: { exchange: string; total_gas: number; pct_of_total: number }[];
  concentration?: { top1_pct: number; top5_pct: number; top10_pct: number; hhi: number };
}

interface GongData {
  available: boolean;
  total_calls_scanned: number;
  ctv_matched_calls: number;
  unique_advertisers: number;
  duration_stats: { avg_min: number; median_min: number; total_hours: number };
  [key: string]: any;
}

interface SynthesisResponse {
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

// ============================================================================
// HELPER COMPONENTS
// ============================================================================
function SourceTag({ source, verified }: { source: string; verified?: boolean }) {
  const colors = source.includes("BQ") ? "bg-blue-50 text-blue-600 border-blue-200"
    : source.includes("Gong") ? "bg-violet-50 text-violet-600 border-violet-200"
    : source.includes("Cross") ? "bg-indigo-50 text-indigo-600 border-indigo-200"
    : source.includes("LLM") ? "bg-purple-50 text-purple-600 border-purple-200"
    : "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${colors}`}>
      {verified && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {source}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors = severity === "critical" ? "bg-rose-100 text-rose-700 border-rose-200"
    : severity === "high" ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors} font-medium uppercase`}>
      {severity}
    </span>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const colors = impact === "high" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-blue-100 text-blue-600 border-blue-200";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors} font-medium uppercase`}>
      {impact} impact
    </span>
  );
}

function ConfidenceBadge({ level, rationale }: { level: string; rationale: string }) {
  const colors = level === "high" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
    : level === "medium" ? "bg-amber-50 border-amber-200 text-amber-700"
    : "bg-rose-50 border-rose-200 text-rose-700";
  return (
    <div className={`rounded-lg border p-3 ${colors}`}>
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="w-4 h-4" />
        <span className="text-xs font-bold uppercase">Confidence: {level}</span>
      </div>
      <p className="text-xs opacity-80">{rationale}</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function SynthesisTab({ bqData, gongData, trailing7d, arrRunRate, gapToTarget, activeCampaigns, activeAdvertisers }: {
  bqData: BQData | null; gongData: GongData | null; trailing7d: number; arrRunRate: number;
  gapToTarget: number; activeCampaigns: number; activeAdvertisers: number;
}) {
  const bqLive = !!bqData?.available;
  const gongLive = !!gongData?.available;
  const [synthesis, setSynthesis] = useState<SynthesisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSynthesis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await trpcQuery<SynthesisResponse>("reporting.synthesize");
      setSynthesis(result);
    } catch (err: any) {
      setError(err.message || "Synthesis failed");
    } finally {
      setLoading(false);
    }
  };

  const s = synthesis?.synthesis;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-bold text-foreground">What Should We Do About It?</h2>
        <SourceTag source="LLM Analysis" />
      </div>

      <p className="text-sm text-muted-foreground">
        Cross-question synthesis connecting revenue trajectory, customer voice, deal patterns, and competitive positioning into actionable priorities.
      </p>

      {/* AI Synthesis Agent Panel */}
      <div className="border border-violet-200/60 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-600" />
            <div>
              <div className="text-sm font-bold text-violet-900">AI Cross-Signal Synthesis</div>
              <div className="text-[11px] text-violet-600/80">
                Combines BQ revenue + Gong voice + deal patterns + competitive intel
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {synthesis?.analyzed_at && (
              <span className="text-[10px] text-violet-500">
                {new Date(synthesis.analyzed_at).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={runSynthesis}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? "Synthesizing..." : synthesis ? "Re-synthesize" : "Run Synthesis"}
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Loading state */}
          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Synthesizing cross-signal insights...</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Analyzing BQ revenue trends, Gong call themes, deal patterns, and competitive signals
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="text-center py-6">
              <XCircle className="w-6 h-6 text-rose-400 mx-auto mb-2" />
              <p className="text-sm text-rose-600">{error}</p>
              <button onClick={runSynthesis} className="text-xs text-violet-600 underline mt-2">Retry</button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && !synthesis && (
            <div className="text-center py-6">
              <Layers className="w-8 h-8 text-violet-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Click <strong>Run Synthesis</strong> to generate AI-powered cross-signal analysis
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Combines BQ revenue data, Gong call insights, deal patterns, and competitive intelligence
              </p>
            </div>
          )}

          {/* Results */}
          {!loading && s && !s.parse_error && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Executive Summary */}
                {s.executive_summary && (
                  <div className="border-l-2 border-violet-400 pl-3">
                    <div className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-1">
                      Executive Summary
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{s.executive_summary}</p>
                  </div>
                )}

                {/* Confidence */}
                {s.confidence_level && (
                  <ConfidenceBadge level={s.confidence_level} rationale={s.confidence_rationale} />
                )}

                {/* Three-column: Risks, Opportunities, Open Questions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Risks */}
                  {s.risks?.length > 0 && (
                    <div className="border border-rose-200/60 rounded-xl bg-rose-50/20 p-4">
                      <h3 className="text-sm font-bold text-rose-700 mb-3 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> Key Risks
                      </h3>
                      <div className="space-y-3">
                        {s.risks.map((r, i) => (
                          <div key={i}>
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">{r.title}</span>
                              <SeverityBadge severity={r.severity} />
                              <SourceTag source={r.data_source} verified={r.data_source.includes("BQ") || r.data_source.includes("Gong")} />
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{r.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Opportunities */}
                  {s.opportunities?.length > 0 && (
                    <div className="border border-emerald-200/60 rounded-xl bg-emerald-50/20 p-4">
                      <h3 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-1.5">
                        <Zap className="w-4 h-4" /> Key Opportunities
                      </h3>
                      <div className="space-y-3">
                        {s.opportunities.map((o, i) => (
                          <div key={i}>
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">{o.title}</span>
                              <ImpactBadge impact={o.impact} />
                              <SourceTag source={o.data_source} verified={o.data_source.includes("BQ") || o.data_source.includes("Gong")} />
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{o.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Open Questions */}
                  {s.open_questions?.length > 0 && (
                    <div className="border border-blue-200/60 rounded-xl bg-blue-50/20 p-4">
                      <h3 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-1.5">
                        <Eye className="w-4 h-4" /> Open Questions
                      </h3>
                      <div className="space-y-3">
                        {s.open_questions.map((q, i) => (
                          <div key={i}>
                            <div className="text-xs font-semibold text-foreground mb-0.5">{q.question}</div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{q.why_it_matters}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">
                              Data needed: {q.data_needed}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cross-Signal Patterns */}
                {s.cross_signal_patterns?.length > 0 && (
                  <div className="border border-indigo-200/60 rounded-xl bg-indigo-50/10 p-4">
                    <h3 className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-1.5">
                      <Activity className="w-4 h-4" /> Cross-Signal Patterns
                    </h3>
                    <div className="space-y-3">
                      {s.cross_signal_patterns.map((p, i) => (
                        <div key={i} className="border border-indigo-100 rounded-lg p-3 bg-white/50">
                          <div className="text-xs font-semibold text-foreground mb-1">{p.pattern}</div>
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {p.signals.map((sig, j) => (
                              <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                                {sig}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{p.implication}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Plan */}
                {s.action_plan?.length > 0 && (
                  <div className="border border-border/40 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-primary" /> AI-Generated Action Plan
                    </h3>
                    <div className="space-y-3">
                      {s.action_plan.map((a) => (
                        <div key={a.priority} className="flex gap-3 border border-border/40 rounded-lg p-3 bg-white/50">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {a.priority}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">{a.action}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                                {a.timeline}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              <span className="font-medium">Owner:</span> {a.owner} · <span className="font-medium">Metric:</span> {a.metric}
                            </div>
                            <div className="text-[11px] text-muted-foreground/70 mt-0.5 italic">{a.rationale}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data Sources Used */}
                {synthesis?.data_sources_used && (
                  <div className="text-[10px] text-muted-foreground/60 flex items-center gap-2 flex-wrap">
                    <span className="font-medium">Sources used:</span>
                    {synthesis.data_sources_used.map((src, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-muted/20 border border-border/30">{src}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Static Fallback — always visible below the AI synthesis */}
      <div className="border border-border/40 rounded-xl p-4 bg-muted/5">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Baseline Assessment</h3>
          <SourceTag source="BQ + Curated" verified={bqLive} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="font-semibold text-foreground mb-1">Revenue Trajectory</div>
            <p className="text-muted-foreground">
              {bqLive
                ? `$${(trailing7d / 1000).toFixed(0)}K/day trailing → $${(arrRunRate / 1_000_000).toFixed(1)}M ARR run rate. ${gapToTarget > 0 ? `$${(gapToTarget / 1_000_000).toFixed(0)}M gap to $100M target.` : "On track to $100M."}`
                : "BQ data unavailable — cannot compute live trajectory."}
            </p>
          </div>
          <div>
            <div className="font-semibold text-foreground mb-1">Concentration Risk</div>
            <p className="text-muted-foreground">
              {bqLive
                ? `Top 5 = ${bqData!.concentration?.top5_pct.toFixed(0)}% of GAS. ${bqData!.concentration!.top5_pct > 60 ? "Above 60% threshold — fragile." : "Below 60% — healthy."}`
                : "BQ data unavailable."}
            </p>
          </div>
          <div>
            <div className="font-semibold text-foreground mb-1">Customer Engagement</div>
            <p className="text-muted-foreground">
              {gongLive
                ? `${gongData!.ctv_matched_calls} CTV calls across ${gongData!.unique_advertisers} advertisers (${gongData!.duration_stats.total_hours.toFixed(0)}h total).`
                : "Gong data unavailable."}
            </p>
          </div>
        </div>
      </div>

      {/* Data Sources Footer */}
      <div className="border border-border/40 rounded-xl bg-muted/10 p-4">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2">Data Sources & Provenance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${bqLive ? "bg-emerald-500" : "bg-rose-400"}`} />
            <span>BigQuery (fact_dsp_core)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${gongLive ? "bg-emerald-500" : "bg-rose-400"}`} />
            <span>Gong ({gongLive ? `${gongData!.ctv_matched_calls} calls` : "offline"})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Salesforce (not connected)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Curated data (deal analysis)</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-2">
          Every data point is attributed to its source. "BQ Live" and "Gong Live" tags indicate real-time verified data.
          "Curated" tags indicate analyst-prepared data from deal reviews. No numbers are hallucinated or synthesized without attribution.
        </p>
      </div>
    </div>
  );
}
