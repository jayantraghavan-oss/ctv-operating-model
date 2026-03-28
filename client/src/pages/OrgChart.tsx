/**
 * OrgChart — Interactive AI-First Org Map
 * The FIRST page new users see. A guided tour explains the system,
 * auto-triggers a demo showing all agents activating, then transitions
 * the user into the Dashboard with an "Enter the Engine" CTA.
 *
 * Returning users see the org chart as a reference/operational tool.
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
  Rocket,
  MousePointer,
  Layers,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ── Constants ──
const TOUR_KEY = "ctv-orgchart-tour-completed";
const MOLOCO_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663459898851/Wr22fCMnjpJGgmtKZSL2hG/moloco-logo-blue_486481be.png";

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

// ── Tour steps (the guided experience) ──
const tourSteps = [
  {
    title: "Welcome to the CTV AI Engine",
    description: "You're looking at the operating model for an entire CTV business — powered by 200 AI assistants, organized into 4 work modules, and orchestrated by just 2 humans.",
    highlight: "none",
    icon: Sparkles,
    tip: "This org chart is your home base. Every box is a real AI assistant you can run.",
    action: null,
  },
  {
    title: "The DRI Sits at the Top",
    description: "Cluster 5 is the executive governance layer. Module 4 agents handle pipeline visibility, conviction tracking, weekly prep, and exec communications — so leadership stays informed without manual reporting.",
    highlight: "cluster-5",
    icon: Shield,
    tip: "These agents generate the weekly operating rhythm — XFN prep, CS reviews, OKR tracking.",
    action: null,
  },
  {
    title: "Four Clusters, Four Missions",
    description: "Below the DRI, four clusters each handle a critical function: Market Intelligence, Growth & Demand, Commercial Sales, and Customer Success. Each cluster has a single human orchestrator who connects the dots AI can't see alone.",
    highlight: "clusters",
    icon: Layers,
    tip: "Blue = Market Intel · Teal = Growth · Amber = Sales · Orange = Customer Success",
    action: null,
  },
  {
    title: "The Ownership Model",
    description: "Every box has a badge: 'A' means AI-driven (runs autonomously), 'A+H' means AI generates and human reviews, 'H' means human-led with AI support. The system is designed so AI does the heavy lifting, but humans approve everything going to market.",
    highlight: "nodes",
    icon: Users,
    tip: "Most work is A+H — the AI drafts, the human approves. This is the safety layer.",
    action: null,
  },
  {
    title: "Watch It Come Alive",
    description: "Now let's see the system in action. Watch as all 200 agents activate in sequence — data flows from governance down through each cluster, just like it would in a real operating cycle.",
    highlight: "demo",
    icon: Rocket,
    tip: "The green pulses show agents coming online. In the real tool, each one generates live output.",
    action: "demo",
  },
  {
    title: "That's 200 Agents Working for You",
    description: "What you just saw is the entire CTV commercial engine activating. Market intelligence feeds growth campaigns, which feed sales motions, which feed customer success — all coordinated through the DRI layer at the top.",
    highlight: "overview",
    icon: Brain,
    tip: "In the tool, click any box to see its agents, then hit 'Run' to generate real outputs.",
    action: null,
  },
  {
    title: "Ready to Explore?",
    description: "You can click any node on this map to jump directly to that agent. Or head to the Dashboard to see the full control center — run agents, review outputs, simulate buyer conversations, and more.",
    highlight: "none",
    icon: MousePointer,
    tip: "Come back to this Org Map anytime from the sidebar under Reference.",
    action: "navigate",
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
  dimmed,
}: {
  cluster: Cluster;
  nodes: OrgNode[];
  activeNodes: Set<string>;
  highlightAll: boolean;
  onNodeClick: (node: OrgNode) => void;
  demoDelay: number;
  dimmed?: boolean;
}) {
  const colors = clusterColors[cluster.id];
  const isC5 = cluster.id === 5;

  // Group passed-in nodes by sectionKey
  const sectionGroups: { name: string; key: string; nodes: OrgNode[] }[] = [];
  const seenKeys = new Set<string>();
  const sectionNameMap: Record<string, string> = {};
  modules.forEach((m) => m.sections.forEach((s) => { sectionNameMap[`${m.id}-${s.key}`] = s.name; }));

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
      className={`rounded-2xl border-2 ${colors.border} ${isC5 ? colors.bg : "bg-white/80"} backdrop-blur-sm overflow-hidden transition-all duration-500 ${dimmed ? "opacity-30 scale-[0.98]" : ""}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: dimmed ? 0.3 : 1, y: 0 }}
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

// ── Tour Overlay (the guided experience) ──
function TourOverlay({
  step,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onEnterEngine,
  demoRunning,
}: {
  step: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onEnterEngine: () => void;
  demoRunning: boolean;
}) {
  const s = tourSteps[step];
  const Icon = s.icon;
  const isLastStep = step === totalSteps - 1;
  const isDemoStep = s.action === "demo";
  const isNavigateStep = s.action === "navigate";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-xl"
    >
      <div
        className="rounded-3xl border border-black/[0.08] p-6 shadow-2xl shadow-black/[0.12]"
        style={{
          background: "oklch(1 0 0 / 0.96)",
          backdropFilter: "blur(24px) saturate(1.5)",
        }}
      >
        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-4">
          {tourSteps.map((_, i) => (
            <motion.div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === step ? "flex-[3] bg-primary" : i < step ? "flex-[2] bg-primary/30" : "flex-1 bg-black/[0.06]"
              }`}
              layout
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-bold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-[13px] text-foreground/55 leading-relaxed">{s.description}</p>
              </div>
            </div>

            {/* Pointer hint gesture */}
            {s.highlight !== "none" && s.highlight !== "demo" && (
              <motion.div
                className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/[0.03]"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                <motion.div
                  animate={{ y: [0, -3, 0], x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <MousePointer className="w-3.5 h-3.5 text-primary/60" />
                </motion.div>
                <span className="text-[11px] text-foreground/40 italic">
                  {s.highlight === "cluster-5" && "Look at the dark card at the top ↑"}
                  {s.highlight === "clusters" && "See the four colored cards below ↓"}
                  {s.highlight === "nodes" && "Notice the A, A+H, and H badges on each box"}
                  {s.highlight === "overview" && "Click any box to jump to that assistant"}
                </span>
              </motion.div>
            )}

            {/* Tip box */}
            <div className="mt-3 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-primary/[0.04] border border-primary/10">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-[12px] text-primary/80 leading-relaxed">{s.tip}</span>
            </div>

            {/* Demo running indicator */}
            {isDemoStep && demoRunning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200"
              >
                <motion.div
                  className="w-2.5 h-2.5 rounded-full bg-emerald-500"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-[12px] font-semibold text-emerald-700">Agents activating across all clusters...</span>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-black/[0.05]">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 text-[12px] font-medium text-foreground/40 hover:text-foreground/60 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            <button
              onClick={onSkip}
              className="text-[12px] font-medium text-foreground/30 hover:text-foreground/50 transition-colors"
            >
              Skip tour
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-foreground/20 font-mono tabular-nums">
              {step + 1}/{totalSteps}
            </span>

            {isNavigateStep ? (
              <button
                onClick={onEnterEngine}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
              >
                <Rocket className="w-4 h-4" />
                Enter the Engine
              </button>
            ) : isDemoStep && demoRunning ? (
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold text-foreground/40 hover:text-foreground/60 border border-black/[0.08] hover:bg-black/[0.02] transition-all"
              >
                Continue <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-all shadow-sm"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
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
          Every feature in this tool traces back to the AI-First CTV Commercial Operating Model (Mar 9, 2026).
          Below is a complete cross-reference showing how the source document maps to the app.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Modules", value: stats.modules, sub: "Work modules" },
            { label: "Agents", value: stats.totalPrompts, sub: "AI assistants" },
            { label: "Clusters", value: stats.clusters, sub: "Human orchestrators" },
            { label: "Sub-modules", value: stats.totalSubModules, sub: "Discrete work units" },
          ].map((s, i) => (
            <div key={i} className="text-center p-3 rounded-xl bg-black/[0.02] border border-black/[0.04]">
              <div className="text-[20px] font-bold text-foreground">{s.value}</div>
              <div className="text-[10px] text-foreground/40 font-semibold uppercase tracking-wider">{s.label}</div>
              <div className="text-[10px] text-foreground/25">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Module mapping */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-3">Module → Feature Mapping</h3>
        <div className="space-y-3">
          {moduleMapping.map(({ mod, sectionCount, subModCount, promptCount }) => (
            <div key={mod.id} className="border border-border rounded-xl bg-white/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Module {mod.id}</span>
                  <h4 className="text-[13px] font-bold text-foreground">{mod.name}</h4>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-black/[0.03] text-foreground/40 font-semibold">{sectionCount} sections</span>
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-black/[0.03] text-foreground/40 font-semibold">{subModCount} sub-modules</span>
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-semibold">{promptCount} agents</span>
                </div>
              </div>
              <div className="text-[11px] text-foreground/40 leading-relaxed">{mod.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Design principles */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-3">Design Principles → Implementation</h3>
        <div className="border border-border rounded-xl bg-white/60 overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border bg-black/[0.02]">
                <th className="text-left px-4 py-2.5 font-bold text-foreground/50 uppercase tracking-wider text-[10px]">Principle</th>
                <th className="text-left px-4 py-2.5 font-bold text-foreground/50 uppercase tracking-wider text-[10px]">Implementation</th>
              </tr>
            </thead>
            <tbody>
              {principleRows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-semibold text-foreground align-top w-[200px]">{row.principle}</td>
                  <td className="px-4 py-3 text-foreground/50 leading-relaxed">{row.implementation}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoActiveNodes, setDemoActiveNodes] = useState<Set<string>>(new Set());
  const demoTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stats = getTotalStats();

  // Build org nodes
  const allNodes = useMemo(() => buildOrgNodes(), []);

  // Check if user has completed the tour
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      // First visit — start the guided tour after a brief delay
      const timer = setTimeout(() => setTourActive(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-trigger demo when reaching the demo step
  useEffect(() => {
    if (tourActive && tourSteps[tourStep]?.action === "demo" && !demoRunning) {
      // Small delay so the step text renders first
      const timer = setTimeout(() => startDemo(), 400);
      return () => clearTimeout(timer);
    }
  }, [tourActive, tourStep]);

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
    navigate(`/module/${node.moduleId}?section=${encodeURIComponent(node.sectionKey)}&sub=${encodeURIComponent(node.name)}`);
  }, [navigate]);

  // Demo mode
  const startDemo = useCallback(() => {
    demoTimerRef.current.forEach(clearTimeout);
    demoTimerRef.current = [];
    setDemoActiveNodes(new Set());
    setDemoRunning(true);

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
      delay += 400;
    });

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

  const completeTour = useCallback(() => {
    setTourActive(false);
    localStorage.setItem(TOUR_KEY, "true");
    // Also mark old keys as seen so WelcomeModal doesn't show
    localStorage.setItem("ctv-welcome-seen-v3", "true");
    localStorage.setItem("ctv-orgchart-walkthrough-seen", "true");
  }, []);

  const handleTourNext = useCallback(() => {
    if (tourStep < tourSteps.length - 1) {
      setTourStep((s) => s + 1);
    }
  }, [tourStep]);

  const handleTourPrev = useCallback(() => {
    setTourStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleEnterEngine = useCallback(() => {
    completeTour();
    stopDemo();
    navigate("/");
  }, [completeTour, stopDemo, navigate]);

  const handleSkipTour = useCallback(() => {
    completeTour();
    stopDemo();
  }, [completeTour, stopDemo]);

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

  // Determine which clusters to highlight/dim during tour
  const tourHighlight = tourActive ? tourSteps[tourStep]?.highlight : "none";

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
              onClick={() => { setTourActive(true); setTourStep(0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-foreground/50 hover:text-foreground hover:bg-black/[0.04] transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> Guide
            </button>
            {demoRunning ? (
              <button
                onClick={stopDemo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-all"
              >
                <Pause className="w-3.5 h-3.5" /> Stop
              </button>
            ) : (
              <button
                onClick={() => { if (tourActive) { completeTour(); } startDemo(); }}
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
            <div className={`mb-6 transition-all duration-500 ${tourHighlight === "clusters" || tourHighlight === "nodes" ? "opacity-40" : ""}`}>
              <ClusterCard
                cluster={clusters.find((c) => c.id === 5)!}
                nodes={getClusterNodes(5)}
                activeNodes={mergedActiveNodes}
                highlightAll={tourHighlight === "cluster-5"}
                onNodeClick={handleNodeClick}
                demoDelay={0}
                dimmed={tourHighlight === "clusters" || tourHighlight === "nodes"}
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
              {demoRunning && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end gap-0">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      style={{ margin: "0 10px" }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Clusters 1-4 grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 transition-all duration-500 ${tourHighlight === "cluster-5" ? "opacity-40" : ""}`}>
              {[1, 2, 3, 4].map((cId) => (
                <ClusterCard
                  key={cId}
                  cluster={clusters.find((c) => c.id === cId)!}
                  nodes={getClusterNodes(cId)}
                  activeNodes={mergedActiveNodes}
                  highlightAll={tourHighlight === "clusters" || tourHighlight === "nodes"}
                  onNodeClick={handleNodeClick}
                  demoDelay={cId}
                  dimmed={tourHighlight === "cluster-5"}
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

        {/* Tour overlay — includes a full-screen click blocker so nodes behind can't be tapped */}
        <AnimatePresence>
          {tourActive && (
            <>
              {/* Invisible click-blocker covers the entire viewport */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ background: "oklch(0 0 0 / 0.05)" }}
                onClick={(e) => e.stopPropagation()}
              />
              <TourOverlay
                step={tourStep}
                totalSteps={tourSteps.length}
                onNext={handleTourNext}
                onPrev={handleTourPrev}
                onSkip={handleSkipTour}
                onEnterEngine={handleEnterEngine}
                demoRunning={demoRunning}
              />
            </>
          )}
        </AnimatePresence>
      </div>
    </NeuralShell>
  );
}
