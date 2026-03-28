/**
 * OrgChart — Interactive AI-First Org Map
 * Replicates the source document's organizational hierarchy with:
 * - Cluster 5 (DRI/XFN) at top → Module 4 sub-modules branching down
 * - 4 cluster cards (C1-C4) below with color-coded borders
 * - Clickable sub-module nodes that navigate to the agent in the tool
 * - Ownership badges (A, A+H, H) on every node
 * - Demo mode: cascading activation animation across all nodes
 * - Guided walkthrough: step-by-step explanation of the system
 * - Reference guide tab: source-to-feature mapping
 */
import NeuralShell from "@/components/NeuralShell";
import { motion, AnimatePresence } from "framer-motion";
import { useAgent } from "@/contexts/AgentContext";
import { useLocation } from "wouter";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  modules,
  clusters,
  prompts,
  getTotalStats,
  type OwnerType,
  type Module,
  type Cluster,
  type SubModule,
  type Section,
} from "@/lib/data";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  BookOpen,
  Map,
  Zap,
  ArrowRight,
  Info,
  Eye,
  Network,
  Users,
  BarChart3,
  Shield,
  Target,
  Brain,
  Radar,
  Megaphone,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ── Color system matching source image ──
const ownerColors: Record<OwnerType, { bg: string; text: string; border: string; badge: string; label: string; short: string }> = {
  agent: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300", badge: "bg-blue-500", label: "AI-Driven", short: "A" },
  "agent-human": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300", badge: "bg-amber-500", label: "AI + Review", short: "A+H" },
  "human-led": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300", badge: "bg-emerald-600", label: "Human-Led", short: "H" },
};

const clusterColors: Record<number, { border: string; bg: string; text: string; accent: string }> = {
  1: { border: "border-blue-400", bg: "bg-blue-50/60", text: "text-blue-800", accent: "bg-blue-500" },
  2: { border: "border-teal-400", bg: "bg-teal-50/60", text: "text-teal-800", accent: "bg-teal-500" },
  3: { border: "border-amber-400", bg: "bg-amber-50/60", text: "text-amber-800", accent: "bg-amber-500" },
  4: { border: "border-orange-400", bg: "bg-orange-50/60", text: "text-orange-800", accent: "bg-orange-500" },
  5: { border: "border-slate-500", bg: "bg-slate-800", text: "text-white", accent: "bg-slate-600" },
};

// ── Walkthrough steps ──
const walkthroughSteps = [
  {
    title: "Welcome to the AI-First Org Map",
    description: "This is your operating model visualized. Two humans orchestrate 200 AI assistants across 4 work modules — everything you need to run a CTV business at scale.",
    highlight: "overview",
    tip: "Think of this as your org chart, except most of the \"employees\" are AI agents.",
  },
  {
    title: "The DRI Sits at the Top",
    description: "Cluster 5 is the executive layer — Module 4 (Governance & BI) feeds the DRI with pipeline visibility, conviction tracking, and operating rhythm. This is how leadership stays informed without manual reporting.",
    highlight: "cluster-5",
    tip: "Click any sub-module in the DRI cluster to see the AI assistants that generate executive reports.",
  },
  {
    title: "Four Clusters, Four Humans",
    description: "Below the DRI, four clusters each have a single human orchestrator who connects the dots that AI can't see alone. Market Intel, Growth, Sales, and Customer Success — each cluster is a coherent set of agents under one brain.",
    highlight: "clusters",
    tip: "The color-coded borders match the source document. Blue = Market Intel, Teal = Growth, Amber = Sales, Orange = Customer Success.",
  },
  {
    title: "Sub-Modules Are Your Building Blocks",
    description: "Each box is a sub-module — a discrete unit of work with an ownership model. 'A' means AI-driven, 'A+H' means AI generates and human reviews, 'H' means human-led with AI support. Click any box to jump to that agent in the tool.",
    highlight: "nodes",
    tip: "Hover over any ownership badge to see what it means. The system is designed so AI does the heavy lifting, but humans approve everything that goes to market.",
  },
  {
    title: "Watch It Come Alive",
    description: "Hit the Demo button to see all 200 agents activate in sequence — data flows from Market Intel through Growth and Sales into Customer Success, then up to the DRI. This is how the system runs in practice.",
    highlight: "demo",
    tip: "In the real tool, you can click 'Run' on any individual agent to fire a live LLM call. The org chart shows their status in real-time.",
  },
];

// ── Flatten sub-modules for org chart nodes ──
interface OrgNode {
  id: string;
  name: string;
  owner: OwnerType;
  description: string;
  moduleId: number;
  sectionKey: string;
  promptCount: number;
  promptIds: number[];
  clusterId: number;
}

function buildOrgNodes(): OrgNode[] {
  const nodes: OrgNode[] = [];
  modules.forEach((mod) => {
    const cId = mod.clusterId;
    mod.sections.forEach((sec) => {
      sec.subModules.forEach((sm) => {
        nodes.push({
          id: `${mod.id}-${sec.key}-${sm.name}`,
          name: sm.name,
          owner: sm.owner,
          description: sm.description,
          moduleId: mod.id,
          sectionKey: sec.key,
          promptCount: sm.prompts.length,
          promptIds: sm.prompts,
          clusterId: cId,
        });
      });
    });
  });
  return nodes;
}

// ── Sub-module node component ──
function SubModuleNode({
  node,
  isActive,
  isHighlighted,
  delay,
  onClick,
}: {
  node: OrgNode;
  isActive: boolean;
  isHighlighted: boolean;
  delay: number;
  onClick: () => void;
}) {
  const colors = ownerColors[node.owner];
  return (
    <motion.button
      onClick={onClick}
      className={`relative text-left px-3 py-2 rounded-xl border transition-all duration-300 group cursor-pointer
        ${colors.bg} ${colors.border} ${colors.text}
        ${isHighlighted ? "ring-2 ring-primary/40 shadow-md scale-[1.02]" : ""}
        ${isActive ? "ring-2 ring-emerald-400 shadow-lg shadow-emerald-100" : ""}
        hover:shadow-md hover:scale-[1.01]`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.02, type: "spring", stiffness: 300, damping: 25 }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Active pulse */}
      {isActive && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold leading-tight line-clamp-2">{node.name}</span>
        <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white ${colors.badge}`}>
          {colors.short}
        </span>
      </div>
      {node.promptCount > 0 && (
        <div className="mt-1 text-[9px] opacity-60 font-medium">
          {node.promptCount} agent{node.promptCount !== 1 ? "s" : ""}
        </div>
      )}
    </motion.button>
  );
}

// ── Cluster card component ──
function ClusterCard({
  cluster,
  nodes,
  activeNodes,
  highlightAll,
  onNodeClick,
  demoDelay,
}: {
  cluster: Cluster;
  nodes: OrgNode[];
  activeNodes: Set<string>;
  highlightAll: boolean;
  onNodeClick: (node: OrgNode) => void;
  demoDelay: number;
}) {
  const colors = clusterColors[cluster.id];
  const isC5 = cluster.id === 5;

  // Group passed-in nodes by sectionKey, preserving order from the data model
  const sectionGroups: { name: string; key: string; nodes: OrgNode[] }[] = [];
  const seenKeys = new Set<string>();
  
  // Build a section name lookup from all modules
  const sectionNameMap: Record<string, string> = {};
  modules.forEach((m) => m.sections.forEach((s) => { sectionNameMap[`${m.id}-${s.key}`] = s.name; }));
  
  // Iterate nodes in order and group by sectionKey
  nodes.forEach((node) => {
    const groupKey = `${node.moduleId}-${node.sectionKey}`;
    if (!seenKeys.has(groupKey)) {
      seenKeys.add(groupKey);
      sectionGroups.push({
        name: sectionNameMap[groupKey] || node.sectionKey,
        key: groupKey,
        nodes: nodes.filter((n) => n.moduleId === node.moduleId && n.sectionKey === node.sectionKey),
      });
    }
  });

  return (
    <motion.div
      className={`rounded-2xl border-2 ${colors.border} ${isC5 ? colors.bg : "bg-white/80"} backdrop-blur-sm overflow-hidden`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: demoDelay * 0.1, type: "spring", stiffness: 200, damping: 25 }}
    >
      {/* Cluster header */}
      <div className={`px-4 py-3 ${isC5 ? "" : "border-b " + colors.border}`}>
        <div className={`text-[10px] font-bold uppercase tracking-widest ${isC5 ? "text-white/60" : colors.text} opacity-70`}>
          Cluster {cluster.id}
        </div>
        <div className={`text-[14px] font-bold ${isC5 ? "text-white" : colors.text} leading-tight mt-0.5`}>
          {cluster.name}
        </div>
        {cluster.twoModes && (
          <div className="flex gap-1.5 mt-2">
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-semibold">
              CTV-to-App
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold">
              CTV-to-Web
            </span>
          </div>
        )}
      </div>

      {/* Sub-module nodes */}
      <div className="p-3 space-y-3">
        {sectionGroups.map((group, gi) => (
          <div key={group.key}>
            {!isC5 && sectionGroups.length > 1 && (
              <div className="text-[9px] font-bold uppercase tracking-wider text-foreground/25 mb-1.5 px-1">
                {group.name}
              </div>
            )}
            <div className="grid grid-cols-1 gap-1.5">
              {group.nodes.map((node, ni) => (
                <SubModuleNode
                  key={node.id}
                  node={node}
                  isActive={activeNodes.has(node.id)}
                  isHighlighted={highlightAll}
                  delay={demoDelay * 5 + gi * 3 + ni}
                  onClick={() => onNodeClick(node)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Walkthrough overlay ──
function WalkthroughOverlay({
  step,
  totalSteps,
  onNext,
  onPrev,
  onClose,
}: {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const s = walkthroughSteps[step];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-lg"
    >
      <div
        className="rounded-2xl border border-black/[0.08] p-5 shadow-2xl"
        style={{
          background: "oklch(1 0 0 / 0.95)",
          backdropFilter: "blur(24px) saturate(1.5)",
        }}
      >
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-3">
          {walkthroughSteps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/30" : "w-4 bg-black/[0.06]"
              }`}
            />
          ))}
          <button onClick={onClose} className="ml-auto p-1 rounded-lg hover:bg-black/[0.04] text-foreground/30">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-bold text-foreground mb-1">{s.title}</h3>
            <p className="text-[12px] text-foreground/60 leading-relaxed mb-2">{s.description}</p>
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/[0.04] border border-primary/10">
              <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span className="text-[11px] text-primary/80 leading-relaxed">{s.tip}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/[0.04]">
          <button
            onClick={onPrev}
            disabled={step === 0}
            className="flex items-center gap-1 text-[12px] font-medium text-foreground/40 hover:text-foreground/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <span className="text-[11px] text-foreground/25 font-medium">
            {step + 1} of {totalSteps}
          </span>
          {step < totalSteps - 1 ? (
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-semibold hover:bg-primary/90 transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-[12px] font-semibold hover:bg-primary/90 transition-colors"
            >
              Explore <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Reference Guide ──
function ReferenceGuide() {
  const stats = getTotalStats();

  const principleRows = [
    { principle: "Agents generate, humans approve", implementation: "Every 'A+H' node requires human sign-off before output goes to market. The Approval Queue page tracks pending reviews.", appPage: "/approvals" },
    { principle: "2 FTEs, 200 agents", implementation: "5 clusters map to 2 human operators (1 DRI + 1 commercial). Each cluster's agents handle the cognitive load that would normally require 10-15 people.", appPage: "/" },
    { principle: "Conviction-based investment", implementation: "Module 4's Strength of Conviction Tracker aggregates learnings into a go/no-go recommendation for EOQ2.", appPage: "/conviction" },
    { principle: "Learning loops across modules", implementation: "Insights from Module 1 feed Module 2 messaging. Module 3 customer feedback loops back to Module 1 positioning. The Learning Loops page visualizes these connections.", appPage: "/learning-loops" },
    { principle: "Two modes of operation", implementation: "Cluster 3 operates differently for CTV-to-App (dotted-line to MA Sales) vs CTV-to-Web (owns the full motion). Both modes share the same agent infrastructure.", appPage: "/cluster/3" },
  ];

  const moduleMapping = modules.map((mod) => {
    const sectionCount = mod.sections.length;
    const subModCount = mod.sections.reduce((acc, s) => acc + s.subModules.length, 0);
    const promptCount = mod.sections.reduce((acc, s) => acc + s.subModules.reduce((a2, sm) => a2 + sm.prompts.length, 0), 0);
    return { mod, sectionCount, subModCount, promptCount };
  });

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="border border-border rounded-xl bg-white/60 p-5">
        <h3 className="text-[15px] font-bold text-foreground mb-2">Source Document → App Mapping</h3>
        <p className="text-[12px] text-foreground/50 leading-relaxed mb-4">
          Every feature in this tool traces back to the AI-First CTV Commercial Operating Model document (Mar 9, 2026).
          Below is a complete mapping of how the source material is implemented.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-xl bg-black/[0.02]">
            <div className="text-[20px] font-bold text-foreground">{stats.modules}</div>
            <div className="text-[10px] text-foreground/35 font-semibold uppercase">Modules</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-black/[0.02]">
            <div className="text-[20px] font-bold text-foreground">{stats.clusters}</div>
            <div className="text-[10px] text-foreground/35 font-semibold uppercase">Clusters</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-black/[0.02]">
            <div className="text-[20px] font-bold text-foreground">{stats.totalSubModules}</div>
            <div className="text-[10px] text-foreground/35 font-semibold uppercase">Sub-Modules</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-black/[0.02]">
            <div className="text-[20px] font-bold text-foreground">{stats.totalPrompts}</div>
            <div className="text-[10px] text-foreground/35 font-semibold uppercase">AI Agents</div>
          </div>
        </div>
      </div>

      {/* Module-by-module mapping */}
      <div className="space-y-4">
        <h3 className="text-[14px] font-bold text-foreground">Module → Feature Mapping</h3>
        {moduleMapping.map(({ mod, sectionCount, subModCount, promptCount }) => (
          <div key={mod.id} className="border border-border rounded-xl bg-white/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-black/[0.01]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">
                  {mod.id}
                </div>
                <div>
                  <div className="text-[13px] font-bold text-foreground">{mod.name}</div>
                  <div className="text-[10px] text-foreground/40">
                    {sectionCount} sections · {subModCount} sub-modules · {promptCount} executable agents
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-[11px] text-foreground/50 leading-relaxed mb-3">{mod.description}</p>
              <div className="space-y-1.5">
                {mod.sections.map((sec) => (
                  <div key={sec.key} className="flex items-center gap-2 text-[11px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/30 shrink-0" />
                    <span className="font-medium text-foreground/70">{sec.name}</span>
                    <span className="text-foreground/25">→</span>
                    <span className="text-foreground/40">{sec.subModules.length} sub-modules</span>
                    <span className="text-foreground/20 ml-auto font-mono text-[10px]">
                      {sec.subModules.reduce((a, sm) => a + sm.prompts.length, 0)} agents
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Design principles mapping */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-3">Design Principles → Implementation</h3>
        <div className="border border-border rounded-xl bg-white/60 overflow-hidden">
          <div className="divide-y divide-border">
            {principleRows.map((row, i) => (
              <div key={i} className="px-4 py-3">
                <div className="text-[12px] font-semibold text-foreground mb-1">{row.principle}</div>
                <div className="text-[11px] text-foreground/50 leading-relaxed">{row.implementation}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cluster mapping */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-3">Cluster → App Surface Mapping</h3>
        <div className="space-y-2">
          {clusters.map((c) => {
            const colors = clusterColors[c.id];
            return (
              <div key={c.id} className={`border-2 ${colors.border} rounded-xl p-4 ${c.id === 5 ? colors.bg : "bg-white/60"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${c.id === 5 ? "text-white/50" : colors.text + " opacity-60"}`}>
                    Cluster {c.id}
                  </span>
                </div>
                <div className={`text-[13px] font-bold ${c.id === 5 ? "text-white" : colors.text} mb-1`}>{c.name}</div>
                <div className={`text-[11px] ${c.id === 5 ? "text-white/60" : "text-foreground/50"} leading-relaxed`}>
                  {c.primaryModuleCoverage}
                </div>
                <div className={`text-[11px] mt-2 ${c.id === 5 ? "text-white/40" : "text-foreground/35"} italic`}>
                  App: Dashboard → Cluster {c.id} card, /cluster/{c.id} detail page, Module {c.moduleIds.join(" & ")} deep-dive
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive features beyond source */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-3">Interactive Features Beyond Source Document</h3>
        <div className="border border-border rounded-xl bg-white/60 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "Live Agent Execution", desc: "Click 'Run' on any agent to fire a real LLM call with full context" },
              { name: "Buyer Roleplay", desc: "Practice CTV pitches against AI-simulated buyers with deep technical knowledge" },
              { name: "Competitive Scenarios", desc: "Head-to-head simulations against TTD, tvScientific, Roku, Amazon" },
              { name: "AI-Generated Insights", desc: "Market intelligence, deal analysis, and pipeline insights on demand" },
              { name: "Approval Queue", desc: "Review and approve AI-generated content before it goes to market" },
              { name: "Conviction Dashboard", desc: "Track learning goals and conviction strength toward EOQ2 decision" },
              { name: "Learning Loops", desc: "Visualize cross-module feedback loops and system connectivity" },
              { name: "Weekly Prep", desc: "Auto-generated XFN leadership pre-reads from all modules" },
              { name: "Command Palette", desc: "Cmd+K to search agents, navigate pages, and trigger actions" },
              { name: "Org Chart + Demo Mode", desc: "This page — visualize the entire system and watch it activate" },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-black/[0.02] transition-colors">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-semibold text-foreground">{f.name}</div>
                  <div className="text-[10px] text-foreground/40">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main OrgChart page ──
export default function OrgChart() {
  const [, navigate] = useLocation();
  const { recentRuns } = useAgent();
  const [activeTab, setActiveTab] = useState("chart");
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoActiveNodes, setDemoActiveNodes] = useState<Set<string>>(new Set());
  const demoTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stats = getTotalStats();

  // Build org nodes
  const allNodes = useMemo(() => buildOrgNodes(), []);

  // Check if user has seen walkthrough
  useEffect(() => {
    const seen = localStorage.getItem("ctv-orgchart-walkthrough-seen");
    if (!seen) {
      setShowWalkthrough(true);
    }
  }, []);

  // Get active agent runs for real-time status
  const activeRunNodeIds = useMemo(() => {
    const ids = new Set<string>();
    recentRuns.forEach((run) => {
      if (run.status === "running" || run.status === "completed") {
        const node = allNodes.find((n) =>
          n.promptIds.includes(run.promptId) || n.name === run.subModuleName
        );
        if (node) ids.add(node.id);
      }
    });
    return ids;
  }, [recentRuns, allNodes]);

  // Navigate to agent — deep-link to specific section
  const handleNodeClick = useCallback((node: OrgNode) => {
    // Navigate to the module page with section hash for scroll-to
    navigate(`/module/${node.moduleId}?section=${encodeURIComponent(node.sectionKey)}&sub=${encodeURIComponent(node.name)}`);
  }, [navigate]);

  // Demo mode
  const startDemo = useCallback(() => {
    // Dismiss walkthrough if showing
    setShowWalkthrough(false);
    localStorage.setItem("ctv-orgchart-walkthrough-seen", "true");
    // Clear any existing timers
    demoTimerRef.current.forEach(clearTimeout);
    demoTimerRef.current = [];
    setDemoActiveNodes(new Set());
    setDemoRunning(true);

    // Activation order: C5 (governance) → C1 (market intel) → C2 (growth) → C3 (sales) → C4 (customer success)
    const clusterOrder = [5, 1, 2, 3, 4];
    let delay = 0;

    clusterOrder.forEach((cId) => {
      const clusterNodes = allNodes.filter((n) => {
        if (cId === 5) return n.moduleId === 4;
        if (cId === 1) return n.moduleId === 1;
        if (cId === 2) {
          const demandSections = ["icp-intelligence", "outbound-system", "channel-optimization", "digital-awareness", "content-engine", "website-digital"];
          return n.moduleId === 2 && demandSections.includes(n.sectionKey);
        }
        if (cId === 3) {
          const salesSections = ["sales-engagement", "partnerships", "test-funding", "event-activation"];
          return n.moduleId === 2 && salesSections.includes(n.sectionKey);
        }
        if (cId === 4) return n.moduleId === 3;
        return false;
      });

      clusterNodes.forEach((node) => {
        const timer = setTimeout(() => {
          setDemoActiveNodes((prev) => { const next = new Set(Array.from(prev)); next.add(node.id); return next; });
        }, delay);
        demoTimerRef.current.push(timer);
        delay += 80;
      });

      // Pause between clusters
      delay += 400;
    });

    // End demo
    const endTimer = setTimeout(() => {
      setDemoRunning(false);
    }, delay + 1000);
    demoTimerRef.current.push(endTimer);
  }, [allNodes]);

  const stopDemo = useCallback(() => {
    demoTimerRef.current.forEach(clearTimeout);
    demoTimerRef.current = [];
    setDemoRunning(false);
    setDemoActiveNodes(new Set());
  }, []);

  const closeWalkthrough = useCallback(() => {
    setShowWalkthrough(false);
    localStorage.setItem("ctv-orgchart-walkthrough-seen", "true");
  }, []);

  // Get nodes per cluster
  const getClusterNodes = useCallback((clusterId: number) => {
    if (clusterId === 5) return allNodes.filter((n) => n.moduleId === 4);
    if (clusterId === 1) return allNodes.filter((n) => n.moduleId === 1);
    if (clusterId === 2) {
      const demandSections = ["icp-intelligence", "outbound-system", "channel-optimization", "digital-awareness", "content-engine", "website-digital"];
      return allNodes.filter((n) => n.moduleId === 2 && demandSections.includes(n.sectionKey));
    }
    if (clusterId === 3) {
      const salesSections = ["sales-engagement", "partnerships", "test-funding", "event-activation"];
      return allNodes.filter((n) => n.moduleId === 2 && salesSections.includes(n.sectionKey));
    }
    if (clusterId === 4) return allNodes.filter((n) => n.moduleId === 3);
    return [];
  }, [allNodes]);

  // Merge demo + real active nodes
  const mergedActiveNodes = useMemo(() => {
    const merged = new Set(demoActiveNodes);
    Array.from(activeRunNodeIds).forEach((id) => merged.add(id));
    return merged;
  }, [demoActiveNodes, activeRunNodeIds]);

  return (
    <NeuralShell>
      <div className="max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">AI-First Org Map</h1>
            <p className="text-[13px] text-foreground/40 mt-0.5">
              {stats.totalPrompts} agents across {stats.modules} modules, orchestrated by {stats.clusters} human clusters
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowWalkthrough(true); setWalkthroughStep(0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-foreground/50 hover:text-foreground hover:bg-black/[0.04] transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> Guide
            </button>
            {demoRunning ? (
              <button
                onClick={stopDemo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                <Pause className="w-3.5 h-3.5" /> Stop Demo
              </button>
            ) : (
              <button
                onClick={startDemo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm"
              >
                <Play className="w-3.5 h-3.5" /> Demo
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="chart" className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5" /> Org Chart
            </TabsTrigger>
            <TabsTrigger value="reference" className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Reference Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            {/* Legend */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-4 mb-6 px-4 py-3 rounded-xl bg-black/[0.02] border border-black/[0.04]"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/30">Legend</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-[11px] text-foreground/50 font-medium">AI-Driven (A)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-[11px] text-foreground/50 font-medium">AI + Review (A+H)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-600" />
                <span className="text-[11px] text-foreground/50 font-medium">Human-Led (H)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-foreground/50 font-medium">Active</span>
              </div>
            </motion.div>

            {/* Cluster 5 — DRI at top */}
            <div className="mb-6">
              <ClusterCard
                cluster={clusters.find((c) => c.id === 5)!}
                nodes={getClusterNodes(5)}
                activeNodes={mergedActiveNodes}
                highlightAll={showWalkthrough && walkthroughSteps[walkthroughStep]?.highlight === "cluster-5"}
                onNodeClick={handleNodeClick}
                demoDelay={0}
              />
            </div>

            {/* Connecting line with animated data flow during demo */}
            <div className="flex justify-center mb-6 relative">
              <div className="w-px h-12 bg-gradient-to-b from-slate-400 to-slate-200 relative overflow-hidden">
                {demoRunning && (
                  <motion.div
                    className="absolute left-0 w-full h-3 bg-gradient-to-b from-transparent via-emerald-400 to-transparent rounded-full"
                    animate={{ top: ["-12px", "48px"] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
              {/* Branching lines to 4 clusters */}
              {demoRunning && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end gap-0">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 h-1 rounded-full bg-emerald-400"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      style={{ margin: "0 8px" }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Clusters 1-4 grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((cId) => (
                <ClusterCard
                  key={cId}
                  cluster={clusters.find((c) => c.id === cId)!}
                  nodes={getClusterNodes(cId)}
                  activeNodes={mergedActiveNodes}
                  highlightAll={showWalkthrough && (walkthroughSteps[walkthroughStep]?.highlight === "clusters" || walkthroughSteps[walkthroughStep]?.highlight === "nodes")}
                  onNodeClick={handleNodeClick}
                  demoDelay={cId}
                />
              ))}
            </div>

            {/* Footer note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-center text-[11px] text-foreground/25 font-medium"
            >
              Click any sub-module to navigate to its agents · Hit Demo to watch the system activate · Source: AI-First CTV Commercial Operating Model (Mar 9, 2026)
            </motion.div>
          </TabsContent>

          <TabsContent value="reference">
            <ReferenceGuide />
          </TabsContent>
        </Tabs>

        {/* Walkthrough overlay */}
        <AnimatePresence>
          {showWalkthrough && (
            <WalkthroughOverlay
              step={walkthroughStep}
              totalSteps={walkthroughSteps.length}
              onNext={() => setWalkthroughStep((s) => Math.min(s + 1, walkthroughSteps.length - 1))}
              onPrev={() => setWalkthroughStep((s) => Math.max(s - 1, 0))}
              onClose={closeWalkthrough}
            />
          )}
        </AnimatePresence>
      </div>
    </NeuralShell>
  );
}
