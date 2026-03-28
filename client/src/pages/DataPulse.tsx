/**
 * DataPulse — Live intelligence from Gong calls, brand pipeline, and system telemetry.
 * Apple-style: glassy panels, soft interactions, polished typography.
 */
import NeuralShell from "@/components/NeuralShell";
import { modules, getTotalStats, prompts } from "@/lib/data";
import { useState } from "react";
import { Database, Radio, Users, Search, TrendingUp, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const stats = getTotalStats();
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const gongInsights = [
  { id: 1, title: "CTV Performance Proof Points", calls: 12, signal: "strong", summary: "12 calls reference ROAS improvement. Average cited: 22% lift vs incumbent DSP. Gaming vertical strongest." },
  { id: 2, title: "Brand Safety Concerns", calls: 8, signal: "warning", summary: "8 calls flagged brand safety as a blocker. Buyers want GARM certification before scaling spend." },
  { id: 3, title: "Measurement & Attribution", calls: 15, signal: "strong", summary: "15 calls discuss measurement. AppsFlyer integration is the #1 cited enabler. Branch partnership requested 4x." },
  { id: 4, title: "Competitive Positioning vs TTD", calls: 6, signal: "neutral", summary: "6 calls compare to The Trade Desk. ML optimization is our differentiator. TTD has brand recognition advantage." },
  { id: 5, title: "CTV-to-Web Interest", calls: 4, signal: "emerging", summary: "4 calls express interest in CTV-to-Web. Retail media and DTC brands most interested. Product not yet ready." },
  { id: 6, title: "Pricing & Test Fund Sensitivity", calls: 10, signal: "warning", summary: "10 calls discuss pricing. $50K test fund threshold is common. CPM sensitivity high in mid-market." },
  { id: 7, title: "SDK Integration Questions", calls: 7, signal: "neutral", summary: "7 calls about SDK requirements. Integration timeline is a concern. Pre-integrated MMP partners reduce friction." },
  { id: 8, title: "Creative Format Capabilities", calls: 9, signal: "strong", summary: "9 calls about creative. Video completion rate optimization is a key differentiator. Dynamic creative interest growing." },
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
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"gong" | "pipeline" | "system">("gong");

  const filteredInsights = gongInsights.filter((g) =>
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) || g.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <NeuralShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Data Pulse</h1>
          <p className="text-[15px] text-foreground/45 mt-1">Live intelligence from Gong, brand pipeline, and system telemetry</p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-black/[0.03] rounded-2xl p-1.5 w-fit">
          {(["gong", "pipeline", "system"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
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
              {filteredInsights.map((insight) => (
                <motion.div
                  key={insight.id}
                  whileHover={{ y: -3, scale: 1.005 }}
                  transition={spring}
                  className="glass rounded-2xl p-5 hover:shadow-apple transition-shadow duration-300"
                >
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
                  <p className="text-[13px] text-foreground/55 leading-relaxed">{insight.summary}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "pipeline" && (
          <div className="space-y-6">
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.04] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-primary/8 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[15px] font-semibold">Pipeline by Stage</span>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {pipelineStages.map((stage) => (
                  <div key={stage.stage} className="px-5 py-4 flex items-center gap-5">
                    <span className="text-[14px] font-semibold w-28 text-foreground/60">{stage.stage}</span>
                    <div className="flex-1 h-2.5 bg-black/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${stage.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(stage.count / 30) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-[13px] font-mono text-foreground/35 w-8 text-right">{stage.count}</span>
                    <span className="text-[13px] font-semibold text-foreground w-16 text-right">{stage.value}</span>
                  </div>
                ))}
              </div>
            </div>

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
