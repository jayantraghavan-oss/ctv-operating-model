/**
 * WarRoom — Adversarial simulation and competitive war gaming.
 * Apple-style: glassy panels, soft interactions, polished typography.
 */
import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { useState } from "react";
import { Swords, Play, Target, Shield, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  { id: 1, name: "Head-to-Head: Gaming Vertical", desc: "Bake-off in gaming vs TTD and tvScientific.", comp: "ttd" },
  { id: 2, name: "Brand Safety Objection", desc: "Buyer raises brand safety. How does Moloco respond?", comp: "tvs" },
  { id: 3, name: "Price War: Mid-Market CPMs", desc: "Mid-market buyer comparing CPMs across 3 DSPs.", comp: "mn" },
  { id: 4, name: "Measurement Shootout", desc: "Buyer wants incrementality proof vs tvScientific.", comp: "innovid" },
  { id: 5, name: "Retail Media CTV Play", desc: "Retail media network: Amazon DSP vs Moloco.", comp: "amazon" },
];

const simOutputs: Record<number, string> = {
  1: "SCENARIO: Gaming Vertical Bake-Off\n\nMoloco ML: 28% higher ROAS vs TTD in 3/4 tests. Key: real-time bidding on app-level signals. tvScientific comparable CPA but 15% lower reach.\n\nWIN PROB: 72%\n\n1. Lead with gaming test data\n2. ML optimization speed (24hr vs 72hr TTD)\n3. $25K test fund to prove it\n4. Counter TTD brand with case study",
  2: "SCENARIO: Brand Safety\n\nGAP: No GARM cert. 40% enterprise buyers require it.\n\nMITIGATION:\n1. Existing controls (keyword blocking, category exclusions)\n2. GARM cert timeline: Q3 2026\n3. Custom brand safety reporting interim\n4. ML-driven safety > rules-based\n\nRISK: HIGH — 3 lost deals in Q1 from this",
  3: "SCENARIO: CPM Competition\n\nMoloco CPMs 15-20% higher than MNTN. But effective CPA 25% lower via ML.\n\n1. Shift CPM → CPA/ROAS conversation\n2. Performance guarantee: beat CPA by 15% or refund\n3. Test fund to de-risk\n4. Total cost of ownership (MNTN = more manual work)\n\nWIN PROB: 58%",
  4: "SCENARIO: Measurement\n\ntvScientific: native incrementality. Innovid: cross-screen. Moloco: MMP partners.\n\n1. MMP integration = buyer keeps their stack\n2. AppsFlyer SKAN for iOS\n3. Joint measurement study proposal\n4. ML optimization doesn't require incrementality\n\nGAP: Need native incrementality by Q4 2026",
  5: "SCENARIO: Retail Media CTV\n\nAmazon: unmatched shopping data but walled garden. Moloco: open-web CTV + ML.\n\n1. Complement Amazon, don't compete\n2. Transparency + data portability\n3. Cross-publisher optimization Amazon can't do\n\nWIN PROB: 45% — Amazon data advantage is real",
};

export default function WarRoom() {
  const { runAgent } = useAgent();
  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [simOutput, setSimOutput] = useState<string | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  const runScenario = (s: typeof scenarios[0]) => {
    setActiveScenario(s.id);
    setSimRunning(true);
    setSimOutput(null);
    runAgent(s.id + 900, s.desc, 1, `war-room-${s.comp}`);
    setTimeout(() => { setSimOutput(simOutputs[s.id] || "Complete."); setSimRunning(false); }, 3000);
  };

  return (
    <NeuralShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">War Room</h1>
          <p className="text-[15px] text-foreground/45 mt-1">Adversarial simulation and competitive war gaming</p>
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
            <span className="text-[15px] font-semibold">Battle Scenarios</span>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {scenarios.map((s) => (
              <motion.div
                key={s.id}
                className="px-5 py-4 flex items-center gap-4 hover:bg-black/[0.015] transition-colors"
                whileHover={{ x: 2 }}
                transition={spring}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[14px] font-bold shrink-0 transition-colors ${
                  activeScenario === s.id ? "bg-rose-signal/10 text-rose-signal" : "bg-black/[0.04] text-foreground/30"
                }`}>{s.id}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-foreground">{s.name}</div>
                  <div className="text-[12px] text-foreground/40 mt-0.5">{s.desc}</div>
                </div>
                <button
                  onClick={() => runScenario(s)}
                  disabled={simRunning}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all shrink-0 ${
                    simRunning && activeScenario === s.id
                      ? "bg-amber-signal/10 text-amber-signal"
                      : "bg-black/[0.04] text-foreground/40 hover:text-rose-signal hover:bg-rose-signal/8"
                  }`}
                >
                  <Play className="w-3 h-3" />{simRunning && activeScenario === s.id ? "Running..." : "Simulate"}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Simulation Output */}
        <AnimatePresence>
          {(simRunning || simOutput) && (
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
                {simRunning && <div className="w-2.5 h-2.5 rounded-full bg-amber-signal animate-pulse ml-auto" />}
              </div>
              <div className="p-5">
                {simRunning ? (
                  <div className="flex items-center gap-3 text-[14px] text-foreground/40">
                    <div className="w-5 h-5 border-2 border-rose-signal/20 border-t-rose-signal rounded-full animate-spin" />
                    Running adversarial simulation...
                  </div>
                ) : (
                  <pre className="text-[13px] text-foreground/70 whitespace-pre-wrap font-mono leading-relaxed">{simOutput}</pre>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NeuralShell>
  );
}
