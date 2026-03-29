/**
 * DataPulse — Live intelligence from Gong calls, brand pipeline, and system telemetry.
 * Apple-style: glassy panels, soft interactions, polished typography.
 * NOW WITH: AI-powered analysis buttons that fire real LLM calls on every insight.
 */
import NeuralShell from "@/components/NeuralShell";
import TipBanner from "@/components/TipBanner";
import { useAgent } from "@/contexts/AgentContext";
import { modules, getTotalStats, prompts } from "@/lib/data";
import { useState, useCallback } from "react";
import {
  Database, Radio, Users, Search, TrendingUp, BarChart3,
  Sparkles, ChevronDown, ChevronUp, Zap, Brain, Play,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";

const stats = getTotalStats();
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const gongInsights = [
  { id: 1, title: "CTV Performance Proof Points", calls: 12, signal: "strong", summary: "12 calls reference ROAS improvement. Average cited: 22% lift vs incumbent DSP. Gaming vertical strongest.", promptId: 10, moduleId: 1 },
  { id: 2, title: "Brand Safety Concerns", calls: 8, signal: "warning", summary: "8 calls flagged brand safety as a blocker. Buyers want GARM certification before scaling spend.", promptId: 20, moduleId: 1 },
  { id: 3, title: "Measurement & Attribution", calls: 15, signal: "strong", summary: "15 calls discuss measurement. AppsFlyer integration is the #1 cited enabler. Branch partnership requested 4x.", promptId: 30, moduleId: 1 },
  { id: 4, title: "Competitive Positioning vs TTD", calls: 6, signal: "neutral", summary: "6 calls compare to The Trade Desk. ML optimization is our differentiator. TTD has brand recognition advantage.", promptId: 40, moduleId: 1 },
  { id: 5, title: "CTV-to-Web Interest", calls: 4, signal: "emerging", summary: "4 calls express interest in CTV-to-Web. Retail media and DTC brands most interested. Product not yet ready.", promptId: 50, moduleId: 2 },
  { id: 6, title: "Pricing & Test Fund Sensitivity", calls: 10, signal: "warning", summary: "10 calls discuss pricing. $50K test fund threshold is common. CPM sensitivity high in mid-market.", promptId: 60, moduleId: 3 },
  { id: 7, title: "SDK Integration Questions", calls: 7, signal: "neutral", summary: "7 calls about SDK requirements. Integration timeline is a concern. Pre-integrated MMP partners reduce friction.", promptId: 70, moduleId: 3 },
  { id: 8, title: "Creative Format Capabilities", calls: 9, signal: "strong", summary: "9 calls about creative. Video completion rate optimization is a key differentiator. Dynamic creative interest growing.", promptId: 80, moduleId: 2 },
];

const pipelineStages = [
  { stage: "Prospecting", count: 28, value: "$2.1M", color: "bg-foreground/20" },
  { stage: "Qualification", count: 15, value: "$3.4M", color: "bg-amber-signal" },
  { stage: "Testing", count: 8, value: "$1.8M", color: "bg-primary" },
  { stage: "Scaling", count: 5, value: "$4.2M", color: "bg-emerald-signal" },
  { stage: "Churned/Lost", count: 12, value: "$1.9M", color: "bg-rose-signal" },
];

const topVerticals = [
  { name: "Gaming", brands: 18, signal: "hot" },
  { name: "DTC E-commerce", brands: 14, signal: "warm" },
  { name: "Streaming/Entertainment", brands: 11, signal: "warm" },
  { name: "Retail Media", brands: 8, signal: "emerging" },
  { name: "Financial Services", brands: 6, signal: "cool" },
  { name: "Travel & Hospitality", brands: 5, signal: "cool" },
];

export default function DataPulse() {
  const { runAgent, recentRuns, getStreamingOutput } = useAgent();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"gong" | "pipeline" | "system">("gong");
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
  const [analyzingPipeline, setAnalyzingPipeline] = useState(false);

  const filteredInsights = gongInsights.filter((g) =>
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) || g.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find the most recent run for a given insight (by promptId)
  const getInsightRun = useCallback((promptId: number) => {
    return recentRuns.find(r => r.promptId === promptId);
  }, [recentRuns]);

  // Fire AI analysis on a Gong insight
  const analyzeInsight = useCallback((insight: typeof gongInsights[0]) => {
    const analysisPrompt = `Analyze this Gong call intelligence signal for the CTV business:

**Signal: ${insight.title}**
- Call volume: ${insight.calls} calls
- Signal strength: ${insight.signal}
- Summary: ${insight.summary}

Provide:
1. **Strategic implications** — What does this signal mean for our CTV GTM strategy?
2. **Action items** — What should the team do about this in the next 2 weeks?
3. **Risk assessment** — What happens if we ignore this signal?
4. **Connection to other signals** — How does this relate to other intelligence we're seeing?
5. **Conviction impact** — How should this affect our investment conviction score?`;

    runAgent(
      insight.promptId,
      analysisPrompt,
      insight.moduleId,
      `DataPulse::${insight.title}`,
      "triggered",
      "agent",
    );
    setExpandedInsight(insight.id);
  }, [runAgent]);

  // Fire pipeline analysis
  const analyzePipeline = useCallback(() => {
    setAnalyzingPipeline(true);
    const pipelinePrompt = `Analyze this CTV brand pipeline for strategic insights:

**Pipeline Stages:**
${pipelineStages.map(s => `- ${s.stage}: ${s.count} brands, ${s.value} value`).join("\n")}

**Top Verticals:**
${topVerticals.map(v => `- ${v.name}: ${v.brands} brands (${v.signal})`).join("\n")}

Provide:
1. **Pipeline health assessment** — Is this pipeline healthy for a new CTV product?
2. **Conversion analysis** — Where are the biggest drop-offs and why?
3. **Vertical strategy** — Which verticals should we double down on vs. deprioritize?
4. **Revenue forecast** — Based on this pipeline, what's a realistic Q2 revenue range?
5. **Recommendations** — Top 3 actions to accelerate pipeline velocity`;

    runAgent(
      999,
      pipelinePrompt,
      3,
      "DataPulse::Pipeline Analysis",
      "triggered",
      "agent",
    );
    setTimeout(() => setAnalyzingPipeline(false), 3000);
  }, [runAgent]);

  // Get the pipeline analysis run
  const pipelineRun = recentRuns.find(r => r.promptId === 999);
  const pipelineStreamingContent = pipelineRun?.status === "running" ? getStreamingOutput(pipelineRun.id) : null;
  const pipelineContent = pipelineRun?.output || pipelineStreamingContent || "";

  return (
    <NeuralShell>
      <div className="space-y-8">
        <TipBanner tipId="datapulse-intro" variant="info">
          Each insight card has an <strong>"Analyze"</strong> button that runs AI analysis on the signal. Click <strong>"Analyze All"</strong> to batch-process the top 3 signals. Switch tabs to explore pipeline and system health.
        </TipBanner>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[22px] sm:text-[28px] font-bold tracking-tight">Insights</h1>
            <p className="text-[13px] sm:text-[15px] text-foreground/45 mt-1">Live intelligence from Gong calls, brand pipeline, and system health</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => {
                // Analyze top 3 insights
                gongInsights.slice(0, 3).forEach((insight, i) => {
                  setTimeout(() => analyzeInsight(insight), i * 500);
                });
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white text-[13px] font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
            >
              <Brain className="w-3.5 h-3.5" />
              Analyze All
            </motion.button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-black/[0.03] rounded-2xl p-1.5 w-full sm:w-fit overflow-x-auto">
          {(["gong", "pipeline", "system"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-5 py-2 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all duration-200 whitespace-nowrap flex-1 sm:flex-initial ${
                activeTab === tab
                  ? "bg-white text-foreground shadow-sm"
                  : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              {tab === "gong" ? "Gong Intelligence" : tab === "pipeline" ? "Brand Pipeline" : "System"}
            </button>
          ))}
        </div>

        {activeTab === "gong" && (
          <div className="space-y-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                type="text"
                placeholder="Search insights..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/[0.03] text-[14px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredInsights.map((insight) => {
                const insightRun = getInsightRun(insight.promptId);
                const streamingContent = insightRun?.status === "running" ? getStreamingOutput(insightRun.id) : null;
                const outputContent = insightRun?.output || streamingContent || "";
                const isExpanded = expandedInsight === insight.id;
                const isRunning = insightRun?.status === "running";

                return (
                  <motion.div
                    key={insight.id}
                    whileHover={{ y: -3, scale: 1.005 }}
                    transition={spring}
                    className="glass rounded-2xl overflow-hidden hover:shadow-apple transition-shadow duration-300"
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[15px] font-semibold text-foreground">{insight.title}</span>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                          insight.signal === "strong" ? "bg-emerald-signal/10 text-emerald-signal" :
                          insight.signal === "warning" ? "bg-rose-signal/10 text-rose-signal" :
                          insight.signal === "emerging" ? "bg-violet-signal/10 text-violet-signal" :
                          "bg-black/[0.04] text-foreground/35"
                        }`}>{insight.signal}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-primary/8 flex items-center justify-center">
                          <Radio className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-[13px] font-medium text-foreground/40">{insight.calls} calls</span>
                      </div>
                      <p className="text-[13px] text-foreground/55 leading-relaxed mb-4">{insight.summary}</p>

                      {/* AI Analysis Button */}
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={() => analyzeInsight(insight)}
                          disabled={isRunning}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 ${
                            isRunning
                              ? "bg-primary/10 text-primary"
                              : outputContent
                              ? "bg-emerald-signal/8 text-emerald-signal hover:bg-emerald-signal/12"
                              : "bg-black/[0.04] text-foreground/40 hover:text-primary hover:bg-primary/8"
                          }`}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isRunning ? (
                            <>
                              <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                              Analyzing...
                            </>
                          ) : outputContent ? (
                            <>
                              <Sparkles className="w-3 h-3" />
                              Re-analyze
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3" />
                              AI Analysis
                            </>
                          )}
                        </motion.button>

                        {outputContent && (
                          <button
                            onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                            className="flex items-center gap-1 text-[12px] font-medium text-foreground/30 hover:text-foreground/50 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isExpanded ? "Collapse" : "View Output"}
                          </button>
                        )}

                        {insightRun?.durationMs && (
                          <span className="text-[10px] text-foreground/20 font-mono ml-auto">{(insightRun.durationMs / 1000).toFixed(1)}s</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded AI Output */}
                    <AnimatePresence>
                      {(isExpanded || isRunning) && outputContent && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-black/[0.04] px-5 py-4 bg-black/[0.01]">
                            <div className="text-[13px] text-foreground/70 leading-relaxed prose prose-sm prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground/80 prose-a:text-primary max-w-none max-h-64 overflow-y-auto">
                              <Streamdown>{outputContent}</Streamdown>
                            </div>
                            {isRunning && (
                              <div className="flex items-center gap-2 mt-3">
                                <div className="w-2 h-2 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <span className="text-[10px] text-primary/50 font-medium">Generating analysis...</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "pipeline" && (
          <div className="space-y-6">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-primary/8 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-[15px] font-semibold">Pipeline by Stage</span>
                </div>
                <motion.button
                  onClick={analyzePipeline}
                  disabled={analyzingPipeline || pipelineRun?.status === "running"}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 ${
                    pipelineRun?.status === "running"
                      ? "bg-primary/10 text-primary"
                      : pipelineContent
                      ? "bg-emerald-signal/8 text-emerald-signal hover:bg-emerald-signal/12"
                      : "bg-primary text-white shadow-sm shadow-primary/20 hover:shadow-md"
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {pipelineRun?.status === "running" ? (
                    <>
                      <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : pipelineContent ? (
                    <>
                      <Sparkles className="w-3 h-3" />
                      Re-analyze
                    </>
                  ) : (
                    <>
                      <Brain className="w-3 h-3" />
                      AI Pipeline Analysis
                    </>
                  )}
                </motion.button>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {pipelineStages.map((stage) => (
                  <div key={stage.stage} className="px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-2.5 sm:gap-5">
                    <span className="text-[12px] sm:text-[14px] font-semibold w-20 sm:w-28 text-foreground/60 shrink-0">{stage.stage}</span>
                    <div className="flex-1 h-2 sm:h-2.5 bg-black/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${stage.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(stage.count / 30) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-[12px] sm:text-[13px] font-mono text-foreground/35 w-6 sm:w-8 text-right">{stage.count}</span>
                    <span className="text-[12px] sm:text-[13px] font-semibold text-foreground w-14 sm:w-16 text-right">{stage.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Pipeline Analysis Output */}
            <AnimatePresence>
              {pipelineContent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={spring}
                  className="glass rounded-2xl overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-black/[0.04] flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-violet-signal/10 flex items-center justify-center">
                      <Brain className="w-3.5 h-3.5 text-violet-signal" />
                    </div>
                    <span className="text-[15px] font-semibold">AI Pipeline Analysis</span>
                    {pipelineRun?.durationMs && (
                      <span className="text-[10px] text-foreground/20 font-mono ml-auto">{(pipelineRun.durationMs / 1000).toFixed(1)}s</span>
                    )}
                    {pipelineRun?.status === "running" && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <div className="w-2 h-2 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-[10px] text-primary/50 font-medium">Generating...</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 text-[13px] text-foreground/70 leading-relaxed prose prose-sm prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground/80 prose-a:text-primary max-w-none max-h-96 overflow-y-auto">
                    <Streamdown>{pipelineContent}</Streamdown>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.04] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-violet-signal/10 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-violet-signal" />
                </div>
                <span className="text-[15px] font-semibold">Top Verticals</span>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {topVerticals.map((v) => (
                  <div key={v.name} className="px-5 py-4 flex items-center gap-4">
                    <span className="text-[14px] font-medium text-foreground flex-1">{v.name}</span>
                    <span className="text-[13px] font-medium text-foreground/35">{v.brands} brands</span>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                      v.signal === "hot" ? "bg-rose-signal/10 text-rose-signal" :
                      v.signal === "warm" ? "bg-amber-signal/10 text-amber-signal" :
                      v.signal === "emerging" ? "bg-violet-signal/10 text-violet-signal" :
                      "bg-black/[0.04] text-foreground/35"
                    }`}>{v.signal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Modules", value: stats.modules, icon: <Database className="w-4 h-4" />, bg: "bg-primary/8", color: "text-primary" },
                { label: "Sub-modules", value: stats.totalSubModules, icon: <BarChart3 className="w-4 h-4" />, bg: "bg-violet-signal/10", color: "text-violet-signal" },
                { label: "Agents", value: stats.totalPrompts, icon: <Users className="w-4 h-4" />, bg: "bg-emerald-signal/10", color: "text-emerald-signal" },
                { label: "Clusters", value: stats.clusters, icon: <Radio className="w-4 h-4" />, bg: "bg-amber-signal/10", color: "text-amber-signal" },
              ].map((item) => (
                <motion.div key={item.label} whileHover={{ y: -2, scale: 1.01 }} transition={spring} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-xl ${item.bg} flex items-center justify-center`}>
                      <span className={item.color}>{item.icon}</span>
                    </div>
                    <span className="text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">{item.label}</span>
                  </div>
                  <div className="text-[24px] font-bold tracking-tight text-foreground">{item.value}</div>
                </motion.div>
              ))}
            </div>

            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.04]">
                <span className="text-[15px] font-semibold">Agent Distribution</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr className="border-b border-black/[0.04]">
                      <th className="text-left px-5 py-3 text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Module</th>
                      <th className="text-center px-3 py-3 text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Persistent</th>
                      <th className="text-center px-3 py-3 text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Triggered</th>
                      <th className="text-center px-3 py-3 text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {modules.map((mod) => {
                      const mp = prompts.filter((p) => p.moduleId === mod.id);
                      return (
                        <tr key={mod.id} className="hover:bg-black/[0.015] transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-foreground">{mod.shortName}</td>
                          <td className="text-center px-3 py-3.5 font-mono text-[13px] text-emerald-signal">{mp.filter((p) => p.agentType === "persistent").length}</td>
                          <td className="text-center px-3 py-3.5 font-mono text-[13px] text-violet-signal">{mp.filter((p) => p.agentType === "triggered").length}</td>
                          <td className="text-center px-3 py-3.5 font-mono text-[13px] font-bold text-primary">{mp.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </NeuralShell>
  );
}
