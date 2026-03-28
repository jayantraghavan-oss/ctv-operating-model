/**
 * WarRoom — Adversarial simulation and competitive war gaming.
 * REAL LLM execution — every scenario fires a live agent call with streaming output.
 * Apple-style: glassy panels, soft interactions, polished typography.
 */
import NeuralShell from "@/components/NeuralShell";
import TipBanner from "@/components/TipBanner";
import { useAgent } from "@/contexts/AgentContext";
import { useState, useCallback } from "react";
import { Swords, Play, Target, Shield, Zap, Cpu, Copy, Sparkles, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const competitors = [
  { id: "ttd", name: "The Trade Desk", strength: "Brand recognition, self-serve, CTV scale", weakness: "Rules-based optimization, premium pricing", threatLevel: "high" },
  { id: "tvs", name: "tvScientific", strength: "CTV-native, incrementality, lower CPMs", weakness: "Smaller scale, limited brand safety", threatLevel: "high" },
  { id: "mn", name: "Mntn/Performance TV", strength: "Self-serve CTV, creative tools, DTC focus", weakness: "Limited ML, narrow vertical", threatLevel: "medium" },
  { id: "innovid", name: "Innovid", strength: "Creative optimization, cross-screen measurement", weakness: "Not a DSP, limited buying", threatLevel: "medium" },
  { id: "roku", name: "Roku OneView", strength: "First-party data, owned inventory", weakness: "Walled garden, limited transparency", threatLevel: "medium" },
  { id: "amazon", name: "Amazon DSP", strength: "Shopping data, massive scale, Fire TV", weakness: "Complex UI, Amazon-centric", threatLevel: "high" },
];

const scenarios = [
  { id: 1, name: "Head-to-Head: Gaming Vertical", desc: "Run a competitive bake-off simulation in the gaming vertical. Moloco ML DSP vs The Trade Desk and tvScientific. Analyze win probability, key differentiators, and recommended battle strategy with specific talking points and proof points.", comp: "ttd" },
  { id: 2, name: "Brand Safety Objection", desc: "A major enterprise buyer raises brand safety concerns about Moloco's CTV offering. Generate a comprehensive objection-handling playbook including current controls, GARM certification timeline, competitive comparison, and risk mitigation strategy.", comp: "tvs" },
  { id: 3, name: "Price War: Mid-Market CPMs", desc: "A mid-market buyer is comparing CPMs across Moloco, MNTN/Performance TV, and tvScientific. Generate a counter-positioning strategy that shifts the conversation from CPM to effective CPA/ROAS, including specific data points and a test fund proposal.", comp: "mn" },
  { id: 4, name: "Measurement Shootout", desc: "A sophisticated buyer wants incrementality proof and is comparing Moloco against tvScientific's native incrementality and Innovid's cross-screen measurement. Generate a measurement strategy that leverages MMP partnerships and proposes a joint measurement study.", comp: "innovid" },
  { id: 5, name: "Retail Media CTV Play", desc: "A retail media network is evaluating Amazon DSP vs Moloco for their CTV advertising program. Generate a positioning strategy that addresses Amazon's first-party data advantage while highlighting Moloco's transparency, cross-publisher optimization, and open-web reach.", comp: "amazon" },
];

export default function WarRoom() {
  const { runAgent, recentRuns, getStreamingOutput } = useAgent();
  const [activeScenario, setActiveScenario] = useState<number | null>(null);

  const runScenario = useCallback((s: typeof scenarios[0]) => {
    setActiveScenario(s.id);
    // Fire real LLM call — promptId 900+ for war room scenarios
    runAgent(
      s.id + 900,
      s.desc,
      1, // Module 1: Market Intelligence
      `Competitive Sim: ${s.name}`,
      "triggered",
      "agent-human"
    );
  }, [runAgent]);

  // Get the run for the active scenario
  const activeRun = activeScenario
    ? recentRuns.find((r) => r.promptId === activeScenario + 900)
    : null;
  const isRunning = activeRun?.status === "running";
  const streamingOutput = activeRun?.id ? getStreamingOutput(activeRun.id) : undefined;
  const displayOutput = activeRun?.output || streamingOutput;

  const copyOutput = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <NeuralShell>
      <div className="space-y-8">
        <TipBanner tipId="warroom-intro" variant="action">
          Pick a scenario and click <strong>"Simulate"</strong> to generate AI-powered competitive analysis. Each simulation produces talking points, battle cards, and strategic recommendations you can copy and use in real deals.
        </TipBanner>

        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Competitive Sims</h1>
          <p className="text-[15px] text-foreground/45 mt-1">Head-to-head competitive analysis with real AI reasoning</p>
        </div>

        {/* Competitive Landscape */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.04] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-rose-signal/10 flex items-center justify-center">
              <Swords className="w-3.5 h-3.5 text-rose-signal" />
            </div>
            <span className="text-[15px] font-semibold">Competitive Landscape</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-black/[0.04]">
            {competitors.map((c) => (
              <motion.div
                key={c.id}
                whileHover={{ scale: 1.01 }}
                transition={spring}
                className="bg-white p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[15px] font-semibold text-foreground">{c.name}</span>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${c.threatLevel === "high" ? "bg-rose-signal/10 text-rose-signal" : "bg-amber-signal/10 text-amber-signal"}`}>{c.threatLevel}</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-emerald-signal/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Target className="w-3 h-3 text-emerald-signal" />
                    </div>
                    <span className="text-[13px] text-foreground/55 leading-relaxed">{c.strength}</span>
                  </div>
                  <div className="flex gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-rose-signal/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Shield className="w-3 h-3 text-rose-signal" />
                    </div>
                    <span className="text-[13px] text-foreground/55 leading-relaxed">{c.weakness}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Battle Scenarios */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.04]">
            <span className="text-[15px] font-semibold">Competitive Scenarios</span>
            <span className="text-[12px] text-foreground/30 ml-2">Click Simulate to generate AI analysis</span>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {scenarios.map((s) => {
              const scenarioRun = recentRuns.find((r) => r.promptId === s.id + 900);
              const scenarioRunning = scenarioRun?.status === "running";
              const scenarioComplete = scenarioRun?.status === "completed";

              return (
                <motion.div
                  key={s.id}
                  className="px-5 py-4 flex items-center gap-4 hover:bg-black/[0.015] transition-colors"
                  whileHover={{ x: 2 }}
                  transition={spring}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[14px] font-bold shrink-0 transition-colors ${
                    activeScenario === s.id && isRunning ? "bg-amber-signal/10 text-amber-signal" :
                    scenarioComplete ? "bg-emerald-signal/10 text-emerald-signal" :
                    activeScenario === s.id ? "bg-rose-signal/10 text-rose-signal" :
                    "bg-black/[0.04] text-foreground/30"
                  }`}>{s.id}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-foreground">{s.name}</div>
                    <div className="text-[12px] text-foreground/40 mt-0.5 line-clamp-1">{s.desc.slice(0, 80)}...</div>
                  </div>
                  <motion.button
                    onClick={() => runScenario(s)}
                    disabled={scenarioRunning}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all shrink-0 ${
                      scenarioRunning
                        ? "bg-amber-signal/10 text-amber-signal cursor-wait"
                        : scenarioComplete
                        ? "bg-emerald-signal/10 text-emerald-signal hover:bg-emerald-signal/15"
                        : "bg-black/[0.04] text-foreground/40 hover:text-rose-signal hover:bg-rose-signal/8"
                    }`}
                  >
                    {scenarioRunning ? (
                      <><Cpu className="w-3 h-3 animate-spin" />Thinking...</>
                    ) : scenarioComplete ? (
                      <><RotateCcw className="w-3 h-3" />Re-run</>
                    ) : (
                      <><Play className="w-3 h-3" />Simulate</>
                    )}
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Simulation Output — real streaming LLM output */}
        <AnimatePresence>
          {activeScenario && (isRunning || displayOutput) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className="glass rounded-2xl overflow-hidden ring-1 ring-rose-signal/20"
            >
              <div className="px-5 py-4 border-b border-black/[0.04] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-rose-signal/10 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-rose-signal" />
                </div>
                <span className="text-[15px] font-semibold">Simulation Output</span>
                {isRunning && (
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-signal animate-pulse" />
                    <span className="text-[12px] text-amber-signal font-medium">Streaming...</span>
                  </div>
                )}
                {!isRunning && displayOutput && (
                  <div className="flex items-center gap-2 ml-auto">
                    {activeRun?.durationMs && (
                      <span className="text-[11px] text-foreground/25 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />{(activeRun.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    <button
                      onClick={() => copyOutput(displayOutput)}
                      className="p-1.5 rounded-lg hover:bg-black/[0.04] text-foreground/25 hover:text-foreground/50 transition-colors"
                      title="Copy output"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-5">
                {displayOutput ? (
                  <div className="text-[13px] text-foreground/70 leading-relaxed prose prose-sm max-w-none prose-headings:text-foreground/80 prose-headings:font-semibold prose-strong:text-foreground/75 prose-li:text-foreground/65">
                    <Streamdown>{displayOutput}</Streamdown>
                  </div>
                ) : isRunning ? (
                  <div>
                    <div className="flex items-center gap-3 text-[14px] text-foreground/40 mb-4">
                      <div className="w-5 h-5 border-2 border-rose-signal/20 border-t-rose-signal rounded-full animate-spin" />
                      Generating competitive analysis with AI reasoning...
                    </div>
                    <div className="space-y-2.5">
                      <div className="h-3 rounded-full bg-rose-200/30 animate-pulse w-full" />
                      <div className="h-3 rounded-full bg-rose-200/30 animate-pulse w-4/5" style={{ animationDelay: "0.1s" }} />
                      <div className="h-3 rounded-full bg-rose-200/30 animate-pulse w-3/5" style={{ animationDelay: "0.2s" }} />
                      <div className="h-3 rounded-full bg-rose-200/30 animate-pulse w-5/6" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NeuralShell>
  );
}
