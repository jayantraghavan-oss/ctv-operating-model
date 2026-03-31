/*
 * Toolkit — Unified seller workspace.
 * Merges Dashboard, AI Assistants, Competitive Intel, Insights, Approvals,
 * Conviction Tracker, Weekly Prep, Learning Loops, and Reference into one
 * well-organized page with a sticky section nav.
 */
import NeuralShell from "@/components/NeuralShell";
import OutputInterstitial from "@/components/OutputInterstitial";
import GlossaryTip from "@/components/GlossaryTip";
import { useAgent } from "@/contexts/AgentContext";
import {
  modules, clusters, prompts, getTotalStats, getModuleStats,
  type Prompt,
} from "@/lib/data";
// operational data is inline for this page
import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import {
  Brain, Play, Zap, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Sparkles, Activity, MessageSquare, TrendingUp, Target, Shield,
  ArrowUpRight, RotateCcw, ChevronDown, ChevronUp, Eye, Layers,
  Radio, Maximize2, Minimize2, Search, Filter, Crosshair, FileText,
  BarChart3, BookOpen, RefreshCw, Copy, Swords, Users, Bot, UserCheck,
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const stats = getTotalStats();
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/* ── Section definitions ── */
interface ToolkitSection {
  id: string;
  label: string;
  icon: typeof Brain;
  description: string;
}

const SECTIONS: ToolkitSection[] = [
  { id: "status", label: "System Status", icon: Activity, description: "KPIs, cluster health, live runs" },
  { id: "assistants", label: "AI Assistants", icon: Zap, description: "Search and run 200 agents" },
  { id: "competitive", label: "Competitive Intel", icon: Crosshair, description: "Competitor landscape & sims" },
  { id: "insights", label: "Insights", icon: Radio, description: "Gong, Pipeline, System analytics" },
  { id: "approvals", label: "Review Queue", icon: Shield, description: "Approve/reject agent outputs" },
  { id: "conviction", label: "Conviction", icon: Target, description: "Decision framework & evidence" },
  { id: "weekly", label: "Weekly Prep", icon: FileText, description: "Leadership pre-read" },
  { id: "loops", label: "Learning Loops", icon: RefreshCw, description: "Cross-module feedback" },
  { id: "reference", label: "Reference", icon: BookOpen, description: "Operating model & agent registry" },
];

/* ── Reusable section wrapper ── */
function SectionCard({
  id,
  title,
  icon: Icon,
  description,
  children,
  defaultOpen = false,
  badge,
}: {
  id: string;
  title: string;
  icon: typeof Brain;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      id={`section-${id}`}
      className="glass rounded-3xl overflow-hidden scroll-mt-20"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 md:px-6 py-4 flex items-center gap-3 hover:bg-black/[0.01] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-foreground">{title}</span>
            {badge}
          </div>
          <span className="text-[12px] text-foreground/35">{description}</span>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-foreground/25" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 md:px-6 pb-5 pt-1 border-t border-black/[0.04]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main Toolkit ── */
export default function Toolkit() {
  const {
    recentRuns, runAgent, convictionScore, isExecuting, executionQueue,
    notifications, unreadCount, getModuleHealth, getClusterHealth,
    getStreamingOutput, updateConviction,
    editRunOutput, rePromptAgent, approveRun, rejectRun,
  } = useAgent();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [interstitialRun, setInterstitialRun] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentTypeFilter, setAgentTypeFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [insightsTab, setInsightsTab] = useState<"gong" | "pipeline" | "system">("gong");
  const [competitiveScenario, setCompetitiveScenario] = useState<number | null>(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [deployingCluster, setDeployingCluster] = useState<number | null>(null);
  const sectionNavRef = useRef<HTMLDivElement>(null);

  const activeRuns = recentRuns.filter((r) => r.status === "running").length;
  const completedRuns = recentRuns.filter((r) => r.status === "completed").length;
  const failedRuns = recentRuns.filter((r) => r.status === "failed").length;
  const totalOutputWords = useMemo(() =>
    recentRuns.filter(r => r.output).reduce((sum, r) => sum + (r.output?.split(/\s+/).length || 0), 0),
    [recentRuns]
  );

  const clusterModuleMap: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 4 };

  const deployCluster = useCallback((clusterId: number) => {
    setDeployingCluster(clusterId);
    const moduleId = clusterModuleMap[clusterId] || 1;
    const modulePrompts = prompts.filter((p) => p.moduleId === moduleId);
    modulePrompts.slice(0, 3).forEach((prompt, i) => {
      setTimeout(() => {
        runAgent(prompt.id, prompt.text, moduleId, `C${clusterId}::${prompt.sectionKey}`, prompt.agentType, "agent");
      }, i * 800);
    });
    setTimeout(() => setDeployingCluster(null), 3000);
  }, [runAgent]);

  const deployAll = useCallback(() => {
    clusters.forEach((c, i) => {
      setTimeout(() => deployCluster(c.id), i * 2000);
    });
    toast.success("Deploying all clusters", { description: "Running agents across all 5 clusters..." });
  }, [deployCluster]);

  // Filtered agents for the Assistants section
  const filteredAgents = useMemo(() => {
    let filtered = [...prompts];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.text.toLowerCase().includes(q) ||
        p.sectionKey.toLowerCase().includes(q) ||
        p.agentType.toLowerCase().includes(q)
      );
    }
    if (agentTypeFilter !== "all") {
      filtered = filtered.filter(p => p.agentType === agentTypeFilter);
    }
    if (moduleFilter !== "all") {
      filtered = filtered.filter(p => p.moduleId === parseInt(moduleFilter));
    }
    return filtered;
  }, [searchQuery, agentTypeFilter, moduleFilter]);

  // Pending approvals
  const pendingApprovals = useMemo(() =>
    recentRuns.filter(r => r.status === "completed" && r.output),
    [recentRuns]
  );

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionId);
    }
  };

  // Competitive scenarios
  const competitors = [
    { name: "The Trade Desk", focus: "Premium CTV, UID2 identity", threat: "high" },
    { name: "DV360 (Google)", focus: "YouTube CTV, cross-channel", threat: "high" },
    { name: "Amazon DSP", focus: "Retail + CTV convergence", threat: "medium" },
    { name: "Roku OneView", focus: "OS-level CTV data", threat: "medium" },
    { name: "Samsung Ads", focus: "ACR data, smart TV", threat: "low" },
  ];

  const competitiveScenarios = [
    { id: 1, name: "Head-to-Head vs TTD", desc: "Simulate a pitch against The Trade Desk for a DTC brand's CTV budget" },
    { id: 2, name: "Google CTV Bundling", desc: "Counter DV360's cross-channel bundling strategy" },
    { id: 3, name: "Amazon Retail + CTV", desc: "Compete against Amazon's retail data advantage in CTV" },
    { id: 4, name: "First-Party Data Play", desc: "Position Moloco's ML against walled garden data moats" },
  ];

  // Insights data (static for now)
  const gongInsights = [
    { label: "Calls This Week", value: "23", trend: "+12%", desc: "CTV-related calls across team" },
    { label: "Win Rate", value: "34%", trend: "+5pp", desc: "CTV deals closed vs. pitched" },
    { label: "Top Objection", value: "Measurement", trend: "", desc: "Attribution and incrementality concerns" },
    { label: "Avg Deal Cycle", value: "47d", trend: "-8d", desc: "Days from first call to close" },
  ];

  const pipelineInsights = [
    { label: "CTV Pipeline", value: "$4.2M", trend: "+18%", desc: "Active CTV opportunities" },
    { label: "Weighted", value: "$1.8M", trend: "+22%", desc: "Probability-weighted pipeline" },
    { label: "New This Month", value: "12", trend: "+3", desc: "New CTV opportunities created" },
    { label: "At Risk", value: "4", trend: "-1", desc: "Deals flagged for attention" },
  ];

  // Weekly prep data
  const weeklyHighlights = [
    "3 new CTV RFPs received — 2 from gaming verticals, 1 from retail media",
    "TTD announced new CTV measurement partnership with iSpot — competitive response needed",
    "SDK integration with 2 new SSPs completed — expands CTV inventory 15%",
    "Q2 conviction score at 62% — need evidence on web attribution before EOQ2 decision",
  ];

  // Learning loops
  const loops = [
    { id: 1, name: "Pitch → Win/Loss → Pitch Refinement", status: "active" as const, source: "M1", target: "M1", signal: "Win/loss patterns from Gong" },
    { id: 2, name: "Campaign Data → Insight → Selling Point", status: "active" as const, source: "M3", target: "M1", signal: "Performance benchmarks" },
    { id: 3, name: "Buyer Sim → Objection Bank → Training", status: "partial" as const, source: "M2", target: "M1", signal: "Simulated objections" },
    { id: 4, name: "Competitive Intel → Positioning → Pitch", status: "active" as const, source: "M2", target: "M1", signal: "Competitor moves" },
    { id: 5, name: "Support Tickets → Product Feedback → Roadmap", status: "partial" as const, source: "M3", target: "M4", signal: "Customer pain points" },
  ];

  return (
    <NeuralShell>
      <div className="space-y-5 md:space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-foreground">
              Toolkit
            </h1>
            <p className="text-[13px] md:text-[14px] text-foreground/40 leading-relaxed mt-1">
              Your unified workspace — {stats.totalPrompts} agents, {completedRuns} runs completed
              {totalOutputWords > 0 && ` · ${totalOutputWords.toLocaleString()} words generated`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              onClick={deployAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white text-[13px] font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-3.5 h-3.5" />
              Run All
            </motion.button>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/[0.03]">
              <div className={`w-2 h-2 rounded-full ${activeRuns > 0 ? "bg-primary animate-pulse" : "bg-emerald-500"}`} />
              <span className="text-[12px] font-semibold text-foreground/40">
                {activeRuns > 0 ? `${activeRuns} running` : "Ready"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Sticky Section Nav ── */}
        <div
          ref={sectionNavRef}
          className="sticky top-0 z-20 -mx-5 md:-mx-6 lg:-mx-8 xl:-mx-10 px-5 md:px-6 lg:px-8 xl:px-10 py-2.5 border-b border-black/[0.06]"
          style={{
            background: "oklch(0.985 0.002 250 / 0.9)",
            backdropFilter: "blur(20px) saturate(1.5)",
            WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          }}
        >
          <div className="flex gap-1 overflow-x-auto no-scrollbar" role="navigation" aria-label="Toolkit sections">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  aria-label={`Jump to ${sec.label} section`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/40 hover:text-foreground/60 hover:bg-black/[0.03]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {sec.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SECTION: System Status ── */}
        <SectionCard
          id="status"
          title="System Status"
          icon={Activity}
          description="KPIs, cluster health, and live agent runs"
          defaultOpen={true}
          badge={activeRuns > 0 ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary animate-pulse">{activeRuns} LIVE</span>
          ) : undefined}
        >
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <MiniKpi label="Agents" value={String(stats.totalPrompts)} icon={<Bot className="w-3.5 h-3.5" />} />
            <MiniKpi label="Completed" value={String(completedRuns)} icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
            <MiniKpi label="Failed" value={String(failedRuns)} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
            <MiniKpi label="Words" value={totalOutputWords > 0 ? `${(totalOutputWords / 1000).toFixed(1)}k` : "0"} icon={<FileText className="w-3.5 h-3.5" />} />
          </div>

          {/* Cluster health */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-foreground/25 uppercase tracking-wider mb-2">Cluster Health</div>
            {clusters.map((cluster) => {
              const health = getClusterHealth(cluster.id);
              const isDeploying = deployingCluster === cluster.id;
              return (
                <div key={cluster.id} className="flex items-center gap-3 py-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 ${
                    health.percent >= 50 ? "bg-emerald-500/10 text-emerald-600" :
                    health.percent > 0 ? "bg-amber-500/10 text-amber-600" :
                    "bg-black/[0.04] text-foreground/25"
                  }`}>
                    C{cluster.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-foreground truncate">{cluster.shortName}</div>
                    <div className="w-full h-1 rounded-full bg-black/[0.04] mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${health.percent >= 50 ? "bg-emerald-500" : health.percent > 0 ? "bg-amber-500" : "bg-foreground/10"}`}
                        style={{ width: `${health.percent}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-foreground/30 w-8 text-right">{health.percent}%</span>
                  <motion.button
                    onClick={() => deployCluster(cluster.id)}
                    disabled={isDeploying}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-black/[0.04] text-foreground/40 hover:text-primary hover:bg-primary/8 transition-all"
                    whileTap={{ scale: 0.95 }}
                  >
                    {isDeploying ? <RotateCcw className="w-3 h-3 animate-spin" /> : "Run"}
                  </motion.button>
                </div>
              );
            })}
          </div>

          {/* Live output stream */}
          {recentRuns.length > 0 && (
            <div className="mt-5">
              <div className="text-[11px] font-bold text-foreground/25 uppercase tracking-wider mb-2">Recent Runs</div>
              <div className="max-h-[300px] overflow-y-auto space-y-1 rounded-xl bg-black/[0.02] p-2">
                {recentRuns.slice(0, 8).map((run) => {
                  const streamingContent = run.status === "running" ? getStreamingOutput(run.id) : null;
                  return (
                    <button
                      key={run.id}
                      onClick={() => setInterstitialRun(run.id)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          run.status === "completed" ? "bg-emerald-500" :
                          run.status === "running" ? "bg-primary animate-pulse" :
                          "bg-rose-500"
                        }`} />
                        <span className="text-[12px] font-medium text-foreground/60 truncate flex-1">{run.subModuleName}</span>
                        {run.durationMs && <span className="text-[10px] text-foreground/20 font-mono">{(run.durationMs / 1000).toFixed(1)}s</span>}
                        <Eye className="w-3 h-3 text-foreground/15" />
                      </div>
                      {run.status === "running" && streamingContent && (
                        <p className="text-[11px] text-foreground/35 mt-1 line-clamp-1 pl-4">{streamingContent.slice(-100)}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── SECTION: AI Assistants ── */}
        <SectionCard
          id="assistants"
          title="AI Assistants"
          icon={Zap}
          description={`Search and run ${stats.totalPrompts} agents across ${stats.modules} modules`}
        >
          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/[0.03] text-[13px] text-foreground placeholder:text-foreground/25 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <select
              value={agentTypeFilter}
              onChange={(e) => setAgentTypeFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-black/[0.03] text-[13px] text-foreground/60 outline-none"
            >
              <option value="all">All Types</option>
              <option value="persistent">Persistent</option>
              <option value="triggered">Triggered</option>
              <option value="orchestrator">Orchestrator</option>
            </select>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-black/[0.03] text-[13px] text-foreground/60 outline-none"
            >
              <option value="all">All Modules</option>
              {modules.map(m => <option key={m.id} value={String(m.id)}>M{m.id}: {m.shortName}</option>)}
            </select>
          </div>
          <div className="text-[11px] text-foreground/30 mb-3">{filteredAgents.length} agents</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
            {filteredAgents.slice(0, 20).map((prompt) => (
              <AgentCard
                key={prompt.id}
                prompt={prompt}
                onRun={() => {
                  const mod = modules.find(m => m.id === prompt.moduleId);
                  let subModuleName = prompt.sectionKey;
                  if (mod) {
                    for (const sec of mod.sections) {
                      for (const sm of sec.subModules) {
                        if (sm.prompts.includes(prompt.id)) {
                          subModuleName = sm.name;
                          break;
                        }
                      }
                    }
                  }
                  runAgent(prompt.id, prompt.text, prompt.moduleId, subModuleName, prompt.agentType, "agent");
                }}
                recentRun={recentRuns.find(r => r.promptId === prompt.id)}
                onViewOutput={(runId) => setInterstitialRun(runId)}
              />
            ))}
          </div>
          {filteredAgents.length > 20 && (
            <div className="text-center mt-3 text-[12px] text-foreground/30">
              Showing 20 of {filteredAgents.length} — refine your search to see more
            </div>
          )}
        </SectionCard>

        {/* ── SECTION: Competitive Intel ── */}
        <SectionCard
          id="competitive"
          title="Competitive Intel"
          icon={Crosshair}
          description="Competitor landscape and battle simulation"
        >
          {/* Competitor cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-5">
            {competitors.map((comp) => (
              <div key={comp.name} className="rounded-xl bg-black/[0.03] p-3 text-center">
                <div className="text-[13px] font-semibold text-foreground">{comp.name}</div>
                <div className="text-[11px] text-foreground/35 mt-0.5">{comp.focus}</div>
                <div className={`text-[10px] font-bold mt-1.5 px-2 py-0.5 rounded-full inline-block ${
                  comp.threat === "high" ? "bg-rose-500/10 text-rose-600" :
                  comp.threat === "medium" ? "bg-amber-500/10 text-amber-600" :
                  "bg-emerald-500/10 text-emerald-600"
                }`}>
                  {comp.threat} threat
                </div>
              </div>
            ))}
          </div>

          {/* Scenarios */}
          <div className="text-[11px] font-bold text-foreground/25 uppercase tracking-wider mb-2">Battle Scenarios</div>
          <div className="space-y-2">
            {competitiveScenarios.map((scenario) => {
              const run = recentRuns.find(r => r.promptId === 900 + scenario.id);
              return (
                <div key={scenario.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-black/[0.02] transition-colors">
                  <Swords className="w-4 h-4 text-foreground/25 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-foreground">{scenario.name}</div>
                    <div className="text-[11px] text-foreground/35">{scenario.desc}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {run && (
                      <button
                        onClick={() => setInterstitialRun(run.id)}
                        className="p-1.5 rounded-lg text-foreground/25 hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <motion.button
                      onClick={() => {
                        const prompt = `You are a senior CTV competitive strategist at Moloco. Run a competitive simulation: ${scenario.name}. ${scenario.desc}. Provide detailed analysis including positioning, counter-arguments, proof points, and recommended talk track.`;
                        runAgent(900 + scenario.id, prompt, 2, `CompSim::${scenario.name}`, "triggered", "agent");
                        toast.success(`Running: ${scenario.name}`);
                      }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-black/[0.04] text-foreground/40 hover:text-primary hover:bg-primary/8 transition-all"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Play className="w-3 h-3 inline mr-1" />
                      Run
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* ── SECTION: Insights ── */}
        <SectionCard
          id="insights"
          title="Insights"
          icon={Radio}
          description="Gong calls, pipeline metrics, and system analytics"
        >
          {/* Tab switcher */}
          <div className="flex gap-1 mb-4 p-1 rounded-xl bg-black/[0.03] w-fit">
            {(["gong", "pipeline", "system"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setInsightsTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                  insightsTab === tab
                    ? "bg-white text-foreground shadow-sm"
                    : "text-foreground/40 hover:text-foreground/60"
                }`}
              >
                {tab === "gong" ? "Gong Calls" : tab === "pipeline" ? "Pipeline" : "System"}
              </button>
            ))}
          </div>

          {insightsTab === "gong" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gongInsights.map((item) => (
                <div key={item.label} className="rounded-xl bg-black/[0.02] p-3">
                  <div className="text-[11px] font-bold text-foreground/30 uppercase tracking-wider">{item.label}</div>
                  <div className="text-[20px] font-bold text-foreground mt-1">{item.value}</div>
                  {item.trend && <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">{item.trend}</div>}
                  <div className="text-[11px] text-foreground/35 mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          )}

          {insightsTab === "pipeline" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {pipelineInsights.map((item) => (
                <div key={item.label} className="rounded-xl bg-black/[0.02] p-3">
                  <div className="text-[11px] font-bold text-foreground/30 uppercase tracking-wider">{item.label}</div>
                  <div className="text-[20px] font-bold text-foreground mt-1">{item.value}</div>
                  {item.trend && <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">{item.trend}</div>}
                  <div className="text-[11px] text-foreground/35 mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          )}

          {insightsTab === "system" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniKpi label="Modules" value={String(stats.modules)} icon={<Layers className="w-3.5 h-3.5" />} />
                <MiniKpi label="Clusters" value={String(stats.clusters)} icon={<Shield className="w-3.5 h-3.5" />} />
                <MiniKpi label="Agents" value={String(stats.totalPrompts)} icon={<Bot className="w-3.5 h-3.5" />} />
                <MiniKpi label="Runs" value={String(recentRuns.length)} icon={<Activity className="w-3.5 h-3.5" />} />
              </div>
              <div className="text-[11px] font-bold text-foreground/25 uppercase tracking-wider mt-3 mb-2">Module Architecture</div>
              <div className="space-y-1.5">
                {modules.map((mod) => {
                  const s = getModuleStats(mod.id);
                  const health = getModuleHealth(mod.id);
                  return (
                    <Link key={mod.id} href={`/module/${mod.id}`}>
                      <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-black/[0.02] transition-colors cursor-pointer">
                        <span className="text-[12px] font-bold text-primary w-6">M{mod.id}</span>
                        <span className="text-[13px] font-medium text-foreground flex-1 truncate">{mod.shortName}</span>
                        <span className="text-[11px] text-foreground/30">{s.prompts} agents</span>
                        <div className="w-12 h-1 rounded-full bg-black/[0.04] overflow-hidden">
                          <div className={`h-full rounded-full ${health.percent >= 50 ? "bg-emerald-500" : health.percent > 0 ? "bg-amber-500" : "bg-foreground/10"}`} style={{ width: `${health.percent}%` }} />
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-foreground/15" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── SECTION: Review Queue ── */}
        <SectionCard
          id="approvals"
          title="Review Queue"
          icon={Shield}
          description="Review and approve agent outputs before use"
          badge={pendingApprovals.length > 0 ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600">{pendingApprovals.length} pending</span>
          ) : undefined}
        >
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-10 h-10 text-foreground/10 mx-auto mb-2" />
              <p className="text-[13px] text-foreground/35">No outputs to review</p>
              <p className="text-[11px] text-foreground/20 mt-1">Run some agents to see their outputs here</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {pendingApprovals.slice(0, 10).map((run) => (
                <div key={run.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-black/[0.02]">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-foreground truncate">{run.subModuleName}</div>
                    <div className="text-[11px] text-foreground/30 line-clamp-1">{run.output?.slice(0, 80)}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setInterstitialRun(run.id)}
                      className="p-1.5 rounded-lg text-foreground/25 hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (run.output) {
                          navigator.clipboard.writeText(run.output)
                            .then(() => toast.success("Copied to clipboard"))
                            .catch(() => toast.error("Failed to copy"));
                        }
                      }}
                      className="p-1.5 rounded-lg text-foreground/25 hover:text-foreground/50 hover:bg-black/[0.03] transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toast.success("Approved", { description: run.subModuleName })}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── SECTION: Conviction ── */}
        <SectionCard
          id="conviction"
          title="Conviction Tracker"
          icon={Target}
          description={`Investment decision framework — ${convictionScore.overall}% overall`}
          badge={
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              convictionScore.overall >= 70 ? "bg-emerald-500/10 text-emerald-600" :
              convictionScore.overall >= 40 ? "bg-amber-500/10 text-amber-600" :
              "bg-rose-500/10 text-rose-600"
            }`}>
              {convictionScore.overall}%
            </span>
          }
        >
          {/* Overall bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-foreground/50">Overall Conviction</span>
              <span className="text-[14px] font-bold text-foreground">{convictionScore.overall}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/[0.04] overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  convictionScore.overall >= 70 ? "bg-emerald-500" :
                  convictionScore.overall >= 40 ? "bg-amber-500" :
                  "bg-rose-500"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${convictionScore.overall}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>

          {/* Goals */}
          <div className="space-y-2">
            {convictionScore.goals.map((goal) => (
              <div key={goal.id} className="rounded-xl bg-black/[0.02] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${
                    goal.status === "strong" ? "bg-emerald-500" :
                    goal.status === "moderate" ? "bg-amber-500" :
                    "bg-rose-500"
                  }`} />
                  <span className="text-[12px] font-medium text-foreground flex-1">{goal.question}</span>
                  <span className="text-[11px] font-bold text-foreground/40">{goal.conviction}%</span>
                </div>
                <div className="w-full h-1 rounded-full bg-black/[0.04] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      goal.conviction >= 70 ? "bg-emerald-500" :
                      goal.conviction >= 40 ? "bg-amber-500" :
                      "bg-rose-500"
                    }`}
                    style={{ width: `${goal.conviction}%` }}
                  />
                </div>
                {goal.evidence.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {goal.evidence.slice(0, 2).map((ev, i) => (
                      <div key={i} className="text-[11px] text-foreground/35 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{ev}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── SECTION: Weekly Prep ── */}
        <SectionCard
          id="weekly"
          title="Weekly Prep"
          icon={FileText}
          description="Leadership pre-read and key highlights"
        >
          <div className="space-y-2">
            {weeklyHighlights.map((highlight, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2">
                <div className="w-5 h-5 rounded-md bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </div>
                <span className="text-[13px] text-foreground/60 leading-relaxed">{highlight}</span>
              </div>
            ))}
          </div>
          <motion.button
            onClick={() => {
              runAgent(168, prompts[167]?.text || "Generate weekly leadership pre-read for CTV AI Engine", 4, "WeeklyPrep::Generate", "triggered", "agent");
              toast.success("Generating weekly prep...");
            }}
            className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/[0.04] text-[12px] font-semibold text-foreground/50 hover:text-primary hover:bg-primary/8 transition-all"
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Regenerate with AI
          </motion.button>
        </SectionCard>

        {/* ── SECTION: Learning Loops ── */}
        <SectionCard
          id="loops"
          title="Learning Loops"
          icon={RefreshCw}
          description="Cross-module feedback and improvement cycles"
        >
          <div className="space-y-2">
            {loops.map((loop) => (
              <div key={loop.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-black/[0.02]">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  loop.status === "active" ? "bg-emerald-500" :
                  loop.status === "partial" ? "bg-amber-500" :
                  "bg-rose-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-foreground">{loop.name}</div>
                  <div className="text-[11px] text-foreground/30">{loop.source} → {loop.target} · {loop.signal}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  loop.status === "active" ? "bg-emerald-500/10 text-emerald-600" :
                  "bg-amber-500/10 text-amber-600"
                }`}>
                  {loop.status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── SECTION: Reference ── */}
        <SectionCard
          id="reference"
          title="Reference"
          icon={BookOpen}
          description="Operating model documentation and agent registry"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/model">
              <div className="rounded-xl bg-black/[0.02] p-4 hover:bg-black/[0.04] transition-colors cursor-pointer group">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-[14px] font-semibold text-foreground">Operating Model</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-foreground/20 group-hover:text-primary transition-colors ml-auto" />
                </div>
                <p className="text-[12px] text-foreground/40 leading-relaxed">
                  Full narrative — core thesis, first principles, system architecture, two operating modes, and EOQ2 decision framework.
                </p>
              </div>
            </Link>
            <Link href="/agents">
              <div className="rounded-xl bg-black/[0.02] p-4 hover:bg-black/[0.04] transition-colors cursor-pointer group">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-[14px] font-semibold text-foreground">Agent Registry</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-foreground/20 group-hover:text-primary transition-colors ml-auto" />
                </div>
                <p className="text-[12px] text-foreground/40 leading-relaxed">
                  Full searchable list of all {stats.totalPrompts} agents with prompt text, ownership, and execution history.
                </p>
              </div>
            </Link>
            {modules.map((mod) => (
              <Link key={mod.id} href={`/module/${mod.id}`}>
                <div className="rounded-xl bg-black/[0.02] p-3 hover:bg-black/[0.04] transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-primary">M{mod.id}</span>
                    <span className="text-[13px] font-medium text-foreground flex-1">{mod.shortName}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-foreground/15 group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-[11px] text-foreground/35 mt-1">{getModuleStats(mod.id).prompts} agents · {getModuleStats(mod.id).subModules} sub-modules</p>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        {/* Footer */}
        <div className="text-center text-[12px] text-foreground/20 font-medium pb-6">
          CTV AI Engine · {stats.totalPrompts} Agents · Moloco
        </div>
      </div>

      {/* Output Interstitial */}
      {(() => {
        const run = recentRuns.find((r) => r.id === interstitialRun);
        if (!run) return null;
        const streamingContent = run.status === "running" ? getStreamingOutput(run.id) : null;
        const displayContent = run.output || streamingContent || "";
        const prompt = prompts.find((p) => p.id === run.promptId);
        const ownerType = (() => {
          for (const mod of modules) {
            for (const sec of mod.sections) {
              for (const sm of sec.subModules) {
                if (sm.prompts.includes(run.promptId)) return sm.owner;
              }
            }
          }
          return "agent-human" as const;
        })();
        return (
          <OutputInterstitial
            open={!!interstitialRun}
            onClose={() => setInterstitialRun(null)}
            agentName={run.subModuleName}
            ownership={ownerType}
            agentType={prompt?.agentType}
            output={displayContent}
            isStreaming={run.status === "running"}
            durationMs={run.durationMs}
            onRun={() => {
              if (prompt) {
                runAgent(prompt.id, prompt.text, prompt.moduleId, prompt.sectionKey, prompt.agentType, ownerType);
              }
            }}
            isRunning={run.status === "running"}
            runId={run.id}
            humanEditedOutput={run.humanEditedOutput}
            approvalStatus={run.approvalStatus}
            revisions={run.revisions}
            onEditOutput={editRunOutput}
            onRePrompt={rePromptAgent}
            onApprove={approveRun}
            onReject={rejectRun}
          />
        );
      })()}
    </NeuralShell>
  );
}

/* ── Small components ── */

function MiniKpi({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl bg-black/[0.02] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-foreground/25">{icon}</span>
        <span className="text-[10px] font-bold text-foreground/25 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[18px] font-bold text-foreground">{value}</div>
    </div>
  );
}

function AgentCard({
  prompt,
  onRun,
  recentRun,
  onViewOutput,
}: {
  prompt: Prompt;
  onRun: () => void;
  recentRun?: { id: string; status: string; output?: string };
  onViewOutput: (runId: string) => void;
}) {
  return (
    <div className="rounded-xl bg-black/[0.02] p-3 hover:bg-black/[0.04] transition-colors">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              prompt.agentType === "persistent" ? "bg-emerald-500/10 text-emerald-600" :
              prompt.agentType === "triggered" ? "bg-violet-500/10 text-violet-600" :
              "bg-rose-500/10 text-rose-600"
            }`}>
              {prompt.agentType === "persistent" ? "P" : prompt.agentType === "triggered" ? "T" : "O"}
            </span>
            <span className="text-[10px] text-foreground/25 font-mono">M{prompt.moduleId}</span>
            {recentRun && (
              <div className={`w-1.5 h-1.5 rounded-full ml-auto ${
                recentRun.status === "completed" ? "bg-emerald-500" :
                recentRun.status === "running" ? "bg-primary animate-pulse" :
                "bg-rose-500"
              }`} />
            )}
          </div>
          <p className="text-[11px] text-foreground/50 line-clamp-2 leading-relaxed">{prompt.text.slice(0, 120)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <motion.button
          onClick={onRun}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-black/[0.04] text-foreground/40 hover:text-primary hover:bg-primary/8 transition-all"
          whileTap={{ scale: 0.95 }}
        >
          <Play className="w-2.5 h-2.5" />
          Run
        </motion.button>
        {recentRun?.output && (
          <button
            onClick={() => onViewOutput(recentRun.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-foreground/25 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Eye className="w-2.5 h-2.5" />
            View
          </button>
        )}
      </div>
    </div>
  );
}
