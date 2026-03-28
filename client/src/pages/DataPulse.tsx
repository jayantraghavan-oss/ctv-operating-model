/**
 * DataPulse — Live data feeds from Gong calls, brand pipeline, and system intelligence.
 */
import NeuralShell from "@/components/NeuralShell";
import { modules, getTotalStats, prompts } from "@/lib/data";
import { useState } from "react";
import { Database, Radio, Users, Search } from "lucide-react";

const stats = getTotalStats();

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
  { stage: "Prospecting", count: 28, value: "$2.1M", color: "text-muted-foreground" },
  { stage: "Qualification", count: 15, value: "$3.4M", color: "text-amber-signal" },
  { stage: "Testing", count: 8, value: "$1.8M", color: "text-neon" },
  { stage: "Scaling", count: 5, value: "$4.2M", color: "text-emerald-signal" },
  { stage: "Churned/Lost", count: 12, value: "$1.9M", color: "text-rose-signal" },
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
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1"><Database className="w-6 h-6 text-neon" /><h1 className="text-2xl font-semibold tracking-tight">Data Pulse</h1></div>
          <p className="text-sm text-muted-foreground">Live intelligence from Gong, brand pipeline, and system telemetry</p>
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
          {(["gong", "pipeline", "system"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {tab === "gong" ? "Gong Intelligence" : tab === "pipeline" ? "Brand Pipeline" : "System"}
            </button>
          ))}
        </div>

        {activeTab === "gong" && (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search insights..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInsights.map((insight) => (
                <div key={insight.id} className="border border-border rounded-lg bg-card p-4 hover:border-neon/20 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{insight.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${insight.signal === "strong" ? "bg-emerald-signal/15 text-emerald-signal" : insight.signal === "warning" ? "bg-rose-signal/15 text-rose-signal" : insight.signal === "emerging" ? "bg-violet-signal/15 text-violet-signal" : "bg-muted text-muted-foreground"}`}>{insight.signal}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2"><Radio className="w-3 h-3 text-neon" /><span className="text-xs font-mono text-muted-foreground">{insight.calls} calls</span></div>
                  <p className="text-xs text-foreground/60 leading-relaxed">{insight.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "pipeline" && (
          <div className="space-y-6">
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border"><span className="text-sm font-medium">Pipeline by Stage</span></div>
              <div className="divide-y divide-border">
                {pipelineStages.map((stage) => (
                  <div key={stage.stage} className="px-4 py-3 flex items-center gap-4">
                    <span className={`text-sm font-medium w-28 ${stage.color}`}>{stage.stage}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${stage.stage === "Scaling" ? "bg-emerald-signal" : stage.stage === "Testing" ? "bg-neon" : stage.stage === "Qualification" ? "bg-amber-signal" : stage.stage === "Churned/Lost" ? "bg-rose-signal" : "bg-muted-foreground/30"}`} style={{ width: `${(stage.count / 30) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-8 text-right">{stage.count}</span>
                    <span className="text-xs font-mono text-foreground w-16 text-right">{stage.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border"><span className="text-sm font-medium">Top Verticals</span></div>
              <div className="divide-y divide-border">
                {topVerticals.map((v) => (
                  <div key={v.name} className="px-4 py-3 flex items-center gap-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground flex-1">{v.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{v.brands} brands</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${v.signal === "hot" ? "bg-rose-signal/15 text-rose-signal" : v.signal === "warm" ? "bg-amber-signal/15 text-amber-signal" : v.signal === "emerging" ? "bg-violet-signal/15 text-violet-signal" : "bg-muted text-muted-foreground"}`}>{v.signal}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[{ label: "MODULES", value: stats.modules }, { label: "SUB-MODULES", value: stats.totalSubModules }, { label: "AGENTS", value: stats.totalPrompts }, { label: "CLUSTERS", value: stats.clusters }].map((item) => (
                <div key={item.label} className="border border-border rounded-lg p-3 bg-card">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">{item.label}</div>
                  <div className="text-xl font-semibold font-mono text-foreground">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border"><span className="text-sm font-medium">Agent Distribution</span></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground">Module</th>
                    <th className="text-center px-3 py-2.5 text-xs font-mono text-muted-foreground">Persistent</th>
                    <th className="text-center px-3 py-2.5 text-xs font-mono text-muted-foreground">Triggered</th>
                    <th className="text-center px-3 py-2.5 text-xs font-mono text-muted-foreground">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {modules.map((mod) => {
                      const mp = prompts.filter((p) => p.moduleId === mod.id);
                      return (
                        <tr key={mod.id} className="hover:bg-accent/20 transition-colors">
                          <td className="px-4 py-2.5 text-foreground">{mod.shortName}</td>
                          <td className="text-center px-3 py-2.5 font-mono text-xs text-emerald-signal">{mp.filter((p) => p.agentType === "persistent").length}</td>
                          <td className="text-center px-3 py-2.5 font-mono text-xs text-violet-signal">{mp.filter((p) => p.agentType === "triggered").length}</td>
                          <td className="text-center px-3 py-2.5 font-mono text-xs font-semibold text-neon">{mp.length}</td>
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
