import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { useState } from "react";
import { Swords, Play, Target, Shield, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1"><Swords className="w-6 h-6 text-rose-signal" /><h1 className="text-2xl font-semibold tracking-tight">War Room</h1></div>
          <p className="text-sm text-muted-foreground">Adversarial simulation and competitive war gaming</p>
        </div>

        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><span className="text-sm font-medium">Competitive Landscape</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {competitors.map((c) => (
              <div key={c.id} className="bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${c.threatLevel === "high" ? "bg-rose-signal/15 text-rose-signal" : "bg-amber-signal/15 text-amber-signal"}`}>{c.threatLevel}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex gap-2"><Target className="w-3 h-3 text-emerald-signal shrink-0 mt-0.5" /><span className="text-foreground/60">{c.strength}</span></div>
                  <div className="flex gap-2"><Shield className="w-3 h-3 text-rose-signal shrink-0 mt-0.5" /><span className="text-foreground/60">{c.weakness}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><span className="text-sm font-medium">Battle Scenarios</span></div>
          <div className="divide-y divide-border">
            {scenarios.map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${activeScenario === s.id ? "bg-rose-signal/15 text-rose-signal" : "bg-muted text-muted-foreground"}`}>{s.id}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                </div>
                <button onClick={() => runScenario(s)} disabled={simRunning} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${simRunning && activeScenario === s.id ? "bg-amber-signal/15 text-amber-signal" : "border border-border text-muted-foreground hover:text-rose-signal hover:border-rose-signal/30"}`}>
                  <Play className="w-3 h-3" />{simRunning && activeScenario === s.id ? "Running..." : "Simulate"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {(simRunning || simOutput) && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="border border-rose-signal/30 rounded-lg bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Zap className="w-4 h-4 text-rose-signal" /><span className="text-sm font-medium">Simulation Output</span>
                {simRunning && <div className="w-2 h-2 rounded-full bg-amber-signal animate-pulse-neon ml-auto" />}
              </div>
              <div className="p-4">
                {simRunning ? (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground"><div className="w-4 h-4 border-2 border-rose-signal/30 border-t-rose-signal rounded-full animate-spin" />Running adversarial simulation...</div>
                ) : (
                  <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">{simOutput}</pre>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NeuralShell>
  );
}
