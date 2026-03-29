/*
 * OrgChart — Interactive AI-First Org Map (Tree Layout)
 * Pixel-perfect tree layout matching the source document.
 * C5 DRI at top → sub-modules in rows → connector → 4 cluster columns.
 * Every node is clickable → fires agent execution via interstitial drawer.
 * Preserves: tour, demo mode, reference guide, all existing wiring.
 */
import NeuralShell from "@/components/NeuralShell";
import { motion, AnimatePresence } from "framer-motion";
import { useAgent } from "@/contexts/AgentContext";
import { useLocation } from "wouter";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Streamdown } from "streamdown";
import {
  modules,
  clusters,
  prompts,
  getTotalStats,
  type OwnerType,
} from "@/lib/data";
import {
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  BookOpen,
  Zap,
  ArrowRight,
  Info,
  Eye,
  Network,
  Users,
  Shield,
  Brain,
  Rocket,
  MousePointer,
  Layers,
  Loader2,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ── Constants ──
const TOUR_KEY = "ctv-orgchart-tour-completed";

// ── Color system matching source image exactly ──
const ownerStyle: Record<OwnerType, { border: string; bg: string; text: string; badgeBg: string; short: string }> = {
  agent:        { border: "border-l-blue-500",   bg: "bg-blue-50/80",   text: "text-blue-800",   badgeBg: "bg-blue-500",    short: "A" },
  "agent-human": { border: "border-l-amber-500", bg: "bg-amber-50/80",  text: "text-amber-800",  badgeBg: "bg-amber-500",   short: "A+H" },
  "human-led":  { border: "border-l-emerald-600", bg: "bg-emerald-50/80", text: "text-emerald-800", badgeBg: "bg-emerald-600", short: "H" },
};

const clusterHeaderColors: Record<number, { border: string; labelColor: string; bg: string }> = {
  1: { border: "border-blue-400",   labelColor: "text-blue-600",   bg: "bg-white" },
  2: { border: "border-teal-400",   labelColor: "text-teal-600",   bg: "bg-white" },
  3: { border: "border-amber-400",  labelColor: "text-amber-600",  bg: "bg-white" },
  4: { border: "border-orange-400", labelColor: "text-orange-600", bg: "bg-white" },
};

// ── Tour steps ──
const tourSteps = [
  {
    title: "Welcome to the CTV AI Engine",
    description: "You're looking at the operating model for an entire CTV business — powered by 200 AI assistants, organized into 4 work modules, and orchestrated by just 2 humans.",
    highlight: "none" as const,
    icon: Sparkles,
    tip: "This org chart is your home base. Every box is a real AI assistant you can run.",
    action: null as string | null,
  },
  {
    title: "The DRI Sits at the Top",
    description: "Cluster 5 is the executive governance layer. Module 4 agents handle pipeline visibility, conviction tracking, weekly prep, and exec communications — so leadership stays informed without manual reporting.",
    highlight: "cluster-5" as const,
    icon: Shield,
    tip: "These agents generate the weekly operating rhythm — XFN prep, CS reviews, OKR tracking.",
    action: null as string | null,
  },
  {
    title: "Four Clusters, Four Missions",
    description: "Below the DRI, four clusters each handle a critical function: Market Intelligence, Growth & Demand, Commercial Sales, and Customer Success. Each cluster has a single human orchestrator who connects the dots AI can't see alone.",
    highlight: "clusters" as const,
    icon: Layers,
    tip: "Blue = Market Intel · Teal = Growth · Amber = Sales · Orange = Customer Success",
    action: null as string | null,
  },
  {
    title: "The Ownership Model",
    description: "Every box has a badge: 'A' means AI-driven (runs autonomously), 'A+H' means AI generates and human reviews, 'H' means human-led with AI support. The system is designed so AI does the heavy lifting, but humans approve everything going to market.",
    highlight: "nodes" as const,
    icon: Users,
    tip: "Most work is A+H — the AI drafts, the human approves. This is the safety layer.",
    action: null as string | null,
  },
  {
    title: "Watch It Come Alive",
    description: "Now let's see the system in action. Watch as all 200 agents activate in sequence — data flows from governance down through each cluster, just like it would in a real operating cycle.",
    highlight: "demo" as const,
    icon: Rocket,
    tip: "The green pulses show agents coming online. In the real tool, each one generates live output.",
    action: "demo" as string | null,
  },
  {
    title: "That's 200 Agents Working for You",
    description: "What you just saw is the entire CTV commercial engine activating. Market intelligence feeds growth campaigns, which feed sales motions, which feed customer success — all coordinated through the DRI layer at the top.",
    highlight: "overview" as const,
    icon: Brain,
    tip: "In the tool, click any box to see its agents, then hit 'Run' to generate real outputs.",
    action: null as string | null,
  },
  {
    title: "Ready to Explore?",
    description: "You can click any node on this map to jump directly to that agent. Or head to the Dashboard to see the full control center — run agents, review outputs, simulate buyer conversations, and more.",
    highlight: "none" as const,
    icon: MousePointer,
    tip: "Come back to this Org Map anytime from the sidebar under Reference.",
    action: "navigate" as string | null,
  },
];

// ── Tree node type ──
interface TreeNode {
  id: string;
  name: string;
  owner: OwnerType;
  description: string;
  moduleId: number;
  sectionKey: string;
  promptCount: number;
  promptIds: number[];
  firstPromptText: string;
  agentType: string;
}

// ── Build the exact tree data matching the source image ──

function buildC5Nodes(): TreeNode[] {
  const mod4 = modules.find(m => m.id === 4)!;
  const nodes: TreeNode[] = [];
  mod4.sections.forEach(sec => {
    sec.subModules.forEach(sm => {
      const smPrompts = prompts.filter(p => sm.prompts.includes(p.id));
      nodes.push({
        id: `c5-${sec.key}-${sm.name}`,
        name: sm.name,
        owner: sm.owner,
        description: sm.description,
        moduleId: 4,
        sectionKey: sec.key,
        promptCount: sm.prompts.length,
        promptIds: sm.prompts,
        firstPromptText: smPrompts[0]?.text || sm.description,
        agentType: smPrompts[0]?.agentType || "triggered",
      });
    });
  });
  return nodes;
}

interface ClusterColumn {
  clusterId: number;
  clusterName: string;
  sections: { label: string; nodes: TreeNode[] }[];
  note?: string;
}

function buildClusterColumns(): ClusterColumn[] {
  const mod1 = modules.find(m => m.id === 1)!;
  const mod2 = modules.find(m => m.id === 2)!;
  const mod3 = modules.find(m => m.id === 3)!;

  const buildNodes = (mod: typeof mod1, sectionKeys: string[]): TreeNode[] => {
    const nodes: TreeNode[] = [];
    mod.sections.filter(s => sectionKeys.includes(s.key)).forEach(sec => {
      // For the source image, we show section-level items (collapsed)
      // Each section becomes one node with the section name
      const allPromptIds = sec.subModules.flatMap(sm => sm.prompts);
      const primaryOwner = sec.subModules.length > 0
        ? (sec.subModules.filter(sm => sm.owner === "agent-human").length >= sec.subModules.length / 2
          ? "agent-human" as OwnerType
          : sec.subModules[0].owner)
        : "agent-human" as OwnerType;
      const smPrompts = prompts.filter(p => allPromptIds.includes(p.id));
      nodes.push({
        id: `${mod.id}-${sec.key}`,
        name: sec.name,
        owner: primaryOwner,
        description: sec.description,
        moduleId: mod.id,
        sectionKey: sec.key,
        promptCount: allPromptIds.length,
        promptIds: allPromptIds,
        firstPromptText: smPrompts[0]?.text || sec.description,
        agentType: smPrompts[0]?.agentType || "triggered",
      });
    });
    return nodes;
  };

  // Cluster 1 — Module 1 (all sections), but use specific names from source image
  const c1Nodes: TreeNode[] = [];
  const c1SectionMap: { name: string; key: string; owner: OwnerType }[] = [
    { name: "Industry Landscape Monitoring", key: "industry-sensing", owner: "agent" },
    { name: "Competitor Intelligence", key: "competitor-intel", owner: "agent" },
    { name: "Analyst & Thought Leader Tracking", key: "analyst-tracking", owner: "agent" },
    { name: "Partner Ecosystem Mapping", key: "analyst-tracking", owner: "agent-human" },
    { name: "Customer Voice / Win-Loss", key: "customer-voice", owner: "agent" },
    { name: "Message Generation", key: "analyst-tracking", owner: "agent-human" },
    { name: "Industry Events & Spaces", key: "analyst-tracking", owner: "agent-human" },
    { name: "Positioning Intelligence", key: "analyst-tracking", owner: "human-led" },
  ];
  c1SectionMap.forEach(item => {
    const sec = mod1.sections.find(s => s.key === item.key);
    if (!sec) return;
    const sm = sec.subModules.find(s => s.name === item.name || s.name.startsWith(item.name.split(" ")[0]));
    const pIds = sm?.prompts || [];
    const smPrompts = prompts.filter(p => pIds.includes(p.id));
    c1Nodes.push({
      id: `c1-${item.key}-${item.name}`,
      name: item.name,
      owner: item.owner,
      description: sm?.description || sec.description,
      moduleId: 1,
      sectionKey: item.key,
      promptCount: pIds.length,
      promptIds: pIds,
      firstPromptText: smPrompts[0]?.text || sm?.description || sec.description,
      agentType: smPrompts[0]?.agentType || "persistent",
    });
  });

  // Cluster 2 — Module 2 Demand sections
  const c2Keys = ["icp-intelligence", "outbound-system", "digital-awareness", "content-engine", "website-digital"];
  const c2SectionMap: { name: string; key: string; owner: OwnerType }[] = [
    { name: "ICP Intelligence (all layers)", key: "icp-intelligence", owner: "agent-human" },
    { name: "AI-Native Outbounding", key: "outbound-system", owner: "agent-human" },
    { name: "Digital Awareness Engine", key: "digital-awareness", owner: "agent-human" },
    { name: "Content Engine", key: "content-engine", owner: "agent-human" },
    { name: "Website & Digital Destinations", key: "website-digital", owner: "agent-human" },
  ];
  const c2Nodes: TreeNode[] = c2SectionMap.map(item => {
    const sec = mod2.sections.find(s => s.key === item.key)!;
    const allPIds = sec.subModules.flatMap(sm => sm.prompts);
    const smPrompts = prompts.filter(p => allPIds.includes(p.id));
    return {
      id: `c2-${item.key}`,
      name: item.name,
      owner: item.owner,
      description: sec.description,
      moduleId: 2,
      sectionKey: item.key,
      promptCount: allPIds.length,
      promptIds: allPIds,
      firstPromptText: smPrompts[0]?.text || sec.description,
      agentType: smPrompts[0]?.agentType || "triggered",
    };
  });

  // Cluster 3 — Module 2 Sales + Module 3 case study
  const c3SalesMap: { name: string; key: string; owner: OwnerType }[] = [
    { name: "Pitch & Sales Engagement", key: "sales-engagement", owner: "human-led" },
    { name: "Partnership & Channel Activation", key: "partnerships", owner: "human-led" },
    { name: "Event Activation", key: "event-activation", owner: "human-led" },
    { name: "Test Funding & Commitment", key: "test-funding", owner: "agent-human" },
    { name: "Sales Coaching", key: "sales-engagement", owner: "agent-human" },
  ];
  const c3SalesNodes: TreeNode[] = c3SalesMap.map(item => {
    const sec = mod2.sections.find(s => s.key === item.key)!;
    const allPIds = sec.subModules.flatMap(sm => sm.prompts);
    const smPrompts = prompts.filter(p => allPIds.includes(p.id));
    return {
      id: `c3-${item.key}-${item.name}`,
      name: item.name,
      owner: item.owner,
      description: sec.description,
      moduleId: 2,
      sectionKey: item.key,
      promptCount: allPIds.length,
      promptIds: allPIds,
      firstPromptText: smPrompts[0]?.text || sec.description,
      agentType: smPrompts[0]?.agentType || "triggered",
    };
  });

  const caseSec = mod3.sections.find(s => s.key === "case-study-pipeline")!;
  const casePIds = caseSec.subModules.flatMap(sm => sm.prompts);
  const c3CaseNode: TreeNode = {
    id: "c3-case-study",
    name: "Case Study Dev Pipeline",
    owner: "agent-human",
    description: caseSec.description,
    moduleId: 3,
    sectionKey: "case-study-pipeline",
    promptCount: casePIds.length,
    promptIds: casePIds,
    firstPromptText: caseSec.description,
    agentType: "triggered",
  };

  // Cluster 4 — Module 3 (all except case-study-pipeline)
  const c4Keys = ["onboarding", "campaign-monitoring", "performance-scaling", "case-study-pipeline", "churn-prevention", "long-term-health", "cross-account", "customer-comms", "feedback-routing"];
  const c4SectionMap: { name: string; key: string; owner: OwnerType }[] = [
    { name: "Test Onboarding & Setup", key: "onboarding", owner: "human-led" },
    { name: "Campaign Monitoring & Optimization", key: "campaign-monitoring", owner: "agent-human" },
    { name: "Performance Readout & Scale Pitch", key: "performance-scaling", owner: "agent-human" },
    { name: "Case Study Dev Pipeline", key: "case-study-pipeline", owner: "agent-human" },
    { name: "Churn Prevention & Early Warning", key: "churn-prevention", owner: "agent-human" },
    { name: "Long-Term Health & Product Co-Dev", key: "long-term-health", owner: "agent-human" },
    { name: "Cross-Account Intelligence", key: "cross-account", owner: "agent-human" },
    { name: "Feedback Routing & Exec Reporting", key: "feedback-routing", owner: "agent-human" },
  ];
  const c4Nodes: TreeNode[] = c4SectionMap.map(item => {
    const sec = mod3.sections.find(s => s.key === item.key)!;
    const allPIds = sec.subModules.flatMap(sm => sm.prompts);
    const smPrompts = prompts.filter(p => allPIds.includes(p.id));
    return {
      id: `c4-${item.key}`,
      name: item.name,
      owner: item.owner,
      description: sec.description,
      moduleId: 3,
      sectionKey: item.key,
      promptCount: allPIds.length,
      promptIds: allPIds,
      firstPromptText: smPrompts[0]?.text || sec.description,
      agentType: smPrompts[0]?.agentType || "triggered",
    };
  });

  return [
    {
      clusterId: 1,
      clusterName: "Market Intelligence &\nPositioning",
      sections: [{ label: "MODULE 1", nodes: c1Nodes }],
    },
    {
      clusterId: 2,
      clusterName: "Growth & Demand\nGeneration",
      sections: [{ label: "MODULE 2 — DEMAND", nodes: c2Nodes }],
    },
    {
      clusterId: 3,
      clusterName: "Commercial Sales &\nPartnerships",
      sections: [
        { label: "MODULE 2 — SALES", nodes: c3SalesNodes },
        { label: "MODULE 3", nodes: [c3CaseNode] },
      ],
      note: "App: dotted-line to MA Sales\nWeb: owns full motion",
    },
    {
      clusterId: 4,
      clusterName: "Customer Success &\nDelivery",
      sections: [{ label: "MODULE 3", nodes: c4Nodes }],
    },
  ];
}

// ── Get all node IDs for demo sequencing ──
function getAllTreeNodeIds(c5Nodes: TreeNode[], columns: ClusterColumn[]): string[] {
  const ids: string[] = [];
  c5Nodes.forEach(n => ids.push(n.id));
  columns.forEach(col => col.sections.forEach(sec => sec.nodes.forEach(n => ids.push(n.id))));
  return ids;
}

// ── Single tree node component ──
function TreeNodeBox({
  node,
  isActive,
  isHighlighted,
  onClick,
  delay = 0,
}: {
  node: TreeNode;
  isActive: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  delay?: number;
}) {
  const s = ownerStyle[node.owner];
  return (
    <motion.button
      onClick={onClick}
      className={`relative text-left w-full px-3 py-2 rounded-lg border-l-[3px] border border-black/[0.06] transition-all duration-200 group cursor-pointer
        ${s.border} ${s.bg}
        ${isHighlighted ? "ring-2 ring-primary/30 shadow-md" : ""}
        ${isActive ? "ring-2 ring-emerald-400 shadow-lg shadow-emerald-100/50" : ""}
        hover:shadow-md hover:translate-y-[-1px] active:scale-[0.98]`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.015, type: "spring", stiffness: 400, damping: 30 }}
    >
      {isActive && (
        <motion.div
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[12px] font-semibold leading-tight ${s.text}`}>{node.name}</span>
        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${s.badgeBg}`}>
          {s.short}
        </span>
      </div>
    </motion.button>
  );
}

// ── Interstitial Drawer for agent output ──
function AgentDrawer({
  node,
  onClose,
  onNavigate,
}: {
  node: TreeNode | null;
  onClose: () => void;
  onNavigate: (moduleId: number, sectionKey: string) => void;
}) {
  const { runAgent, agentRuns, getStreamingOutput } = useAgent();
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find the latest run for this node
  const latestRun = useMemo(() => {
    if (!node) return null;
    return agentRuns.find(r =>
      node.promptIds.includes(r.promptId) || r.subModuleName === node.name
    ) || null;
  }, [agentRuns, node]);

  const streamingOutput = currentRunId ? getStreamingOutput(currentRunId) : undefined;
  const displayOutput = streamingOutput || latestRun?.output || null;
  const isStreaming = latestRun?.status === "running" || !!streamingOutput;

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayOutput, isStreaming]);

  const handleRun = useCallback(() => {
    if (!node || node.promptIds.length === 0) return;
    const pid = node.promptIds[0];
    const promptObj = prompts.find(p => p.id === pid);
    if (!promptObj) return;
    setIsRunning(true);
    // Track the run
    const runIdBefore = agentRuns[0]?.id;
    runAgent(pid, promptObj.text, node.moduleId, node.name, node.agentType, node.owner);
    // The new run will be at index 0 after state update
    setTimeout(() => {
      setIsRunning(false);
    }, 500);
  }, [node, runAgent, agentRuns]);

  if (!node) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

        {/* Drawer */}
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full sm:w-[560px] max-h-[85vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden"
          style={{
            background: "oklch(1 0 0 / 0.97)",
            backdropFilter: "blur(24px) saturate(1.5)",
            boxShadow: "0 -8px 40px oklch(0 0 0 / 0.12), 0 2px 8px oklch(0 0 0 / 0.06)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle bar (mobile) */}
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-black/10" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-black/[0.06]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${ownerStyle[node.owner].badgeBg}`}>
                  {ownerStyle[node.owner].short}
                </span>
                <span className="text-[10px] text-foreground/30 font-medium">
                  Module {node.moduleId}
                </span>
              </div>
              <h3 className="text-[16px] font-bold text-foreground leading-tight">{node.name}</h3>
              <p className="text-[12px] text-foreground/40 mt-1 leading-relaxed line-clamp-2">{node.description}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 ml-3 w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-foreground/40" />
            </button>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.04]">
            <button
              onClick={handleRun}
              disabled={node.promptIds.length === 0 || isStreaming}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-semibold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              {isStreaming ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Run Agent
                </>
              )}
            </button>
            <button
              onClick={() => onNavigate(node.moduleId, node.sectionKey)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium text-foreground/50 hover:text-foreground hover:bg-black/[0.04] transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Module
            </button>
            {node.promptIds.length > 0 && (
              <span className="ml-auto text-[10px] text-foreground/25 font-medium">
                {node.promptCount} agent{node.promptCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Output area */}
          <div ref={scrollRef} className="px-5 py-4 overflow-y-auto max-h-[50vh] sm:max-h-[45vh]">
            {displayOutput ? (
              <div className="prose prose-sm max-w-none text-[13px] leading-relaxed text-foreground/70">
                <Streamdown>{displayOutput}</Streamdown>
              </div>
            ) : node.promptIds.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-[13px] text-foreground/30 font-medium">No agents assigned yet</div>
                <p className="text-[11px] text-foreground/20 mt-1">This sub-module is defined but has no executable prompts.</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/[0.06] flex items-center justify-center mx-auto mb-3">
                  <Play className="w-5 h-5 text-primary/40" />
                </div>
                <div className="text-[13px] text-foreground/30 font-medium">Ready to execute</div>
                <p className="text-[11px] text-foreground/20 mt-1">Click "Run Agent" to fire a live LLM call</p>
              </div>
            )}

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/[0.04]">
                <motion.div
                  className="w-2 h-2 rounded-full bg-emerald-500"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-[11px] text-emerald-600 font-medium">Generating output...</span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Tour Overlay ──
function TourOverlay({
  step, totalSteps, onNext, onPrev, onSkip, onEnterEngine, demoRunning,
}: {
  step: number; totalSteps: number; onNext: () => void; onPrev: () => void;
  onSkip: () => void; onEnterEngine: () => void; demoRunning: boolean;
}) {
  const s = tourSteps[step];
  const Icon = s.icon;
  const isDemoStep = s.action === "demo";
  const isNavigateStep = s.action === "navigate";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[96vw] sm:w-[92vw] max-w-xl"
    >
      <div
        className="rounded-2xl sm:rounded-3xl border border-black/[0.08] p-4 sm:p-6 shadow-2xl shadow-black/[0.12]"
        style={{ background: "oklch(1 0 0 / 0.96)", backdropFilter: "blur(24px) saturate(1.5)" }}
      >
        {/* Progress */}
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

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] sm:text-[16px] font-bold text-foreground mb-1">{s.title}</h3>
                <p className="text-[13px] text-foreground/55 leading-relaxed">{s.description}</p>
              </div>
            </div>

            {s.highlight !== "none" && s.highlight !== "demo" && s.highlight !== "overview" && (
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
                </span>
              </motion.div>
            )}

            <div className="mt-2.5 sm:mt-3 flex items-start gap-2 sm:gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-primary/[0.04] border border-primary/10">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-[12px] text-primary/80 leading-relaxed">{s.tip}</span>
            </div>

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

        {/* Nav */}
        <div className="flex items-center justify-between mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-black/[0.05]">
          <div className="flex items-center gap-2 sm:gap-3">
            {step > 0 && (
              <button onClick={onPrev} className="flex items-center gap-1 text-[12px] font-medium text-foreground/40 hover:text-foreground/60 transition-colors py-1.5 px-2 -ml-2 rounded-lg active:bg-black/[0.04]">
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            <button onClick={onSkip} className="text-[12px] font-medium text-foreground/30 hover:text-foreground/50 transition-colors py-1.5 px-2 rounded-lg active:bg-black/[0.04]">
              Skip
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] text-foreground/20 font-mono tabular-nums">{step + 1}/{totalSteps}</span>
            {isNavigateStep ? (
              <button onClick={onEnterEngine} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 active:scale-95">
                <Rocket className="w-4 h-4" /> Enter Engine
              </button>
            ) : isDemoStep && demoRunning ? (
              <button onClick={onNext} className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-[12px] font-semibold text-foreground/40 hover:text-foreground/60 border border-black/[0.08] hover:bg-black/[0.02] transition-all active:scale-95">
                Continue <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button onClick={onNext} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-all shadow-sm active:scale-95">
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
  const [, navigate] = useLocation();
  const stats = getTotalStats();
  const c5Nodes = useMemo(() => buildC5Nodes(), []);
  const clusterCols = useMemo(() => buildClusterColumns(), []);

  const principleRows = [
    { principle: "Agents generate, humans approve", implementation: "Every 'A+H' node requires human sign-off before output goes to market. The Approval Queue page tracks pending reviews.", appPage: "/approvals" },
    { principle: "2 FTEs, 200 agents", implementation: "5 clusters map to 2 human operators (1 DRI + 1 commercial). Each cluster's agents handle the cognitive load that would normally require 10-15 people.", appPage: "/" },
    { principle: "Conviction-based investment", implementation: "Module 4's Strength of Conviction Tracker aggregates learnings into a go/no-go recommendation for EOQ2.", appPage: "/conviction" },
    { principle: "Learning loops across modules", implementation: "Insights from Module 1 feed Module 2 messaging. Module 3 customer feedback loops back to Module 1 positioning.", appPage: "/learning-loops" },
    { principle: "Two modes of operation", implementation: "Cluster 3 operates differently for CTV-to-App (dotted-line to MA Sales) vs CTV-to-Web (owns the full motion). Both modes share the same agent infrastructure.", appPage: "/cluster/3" },
  ];

  const moduleMapping = modules.map((mod) => {
    const sectionCount = mod.sections.length;
    const subModCount = mod.sections.reduce((acc, s) => acc + s.subModules.length, 0);
    const promptCount = mod.sections.reduce((acc, s) => acc + s.subModules.reduce((a2, sm) => a2 + sm.prompts.length, 0), 0);
    return { mod, sectionCount, subModCount, promptCount };
  });

  // Mini tree node for reference guide
  const MiniNode = ({ name, owner }: { name: string; owner: OwnerType }) => {
    const s = ownerStyle[owner];
    return (
      <div className={`px-2.5 py-1.5 rounded-md border-l-[3px] border border-black/[0.05] text-[10px] font-semibold leading-tight flex items-center justify-between gap-2 ${s.border} ${s.bg}`}>
        <span className={s.text}>{name}</span>
        <span className={`text-[8px] font-bold px-1 py-0.5 rounded text-white ${s.badgeBg}`}>{s.short}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* ── Mini Tree Layout (matching source image) ── */}
      <div className="border border-border rounded-xl bg-white/60 p-5">
        <h3 className="text-[15px] font-bold text-foreground mb-1">System Architecture — Full Tree</h3>
        <p className="text-[11px] text-foreground/40 mb-5">The complete org map from the source document. Every box maps to a real AI assistant in this tool.</p>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-5 px-3 py-2 rounded-lg bg-black/[0.02] border border-black/[0.04] text-[10px] justify-center">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500" /><span className="text-foreground/50 font-medium">Agent</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /><span className="text-foreground/50 font-medium">Human-led</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500" /><span className="text-foreground/50 font-medium">Agent + Human</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" /><span className="text-foreground/50 font-medium">DRI Cluster</span></div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* C5 DRI Box */}
            <div className="flex justify-center mb-3">
              <div className="bg-foreground text-white px-6 py-3 rounded-xl text-center">
                <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Cluster 5</div>
                <div className="text-[13px] font-bold">DRI // XFN Management</div>
                <div className="text-[10px] text-white/50">Module 4: Executive Governance & BI</div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center mb-2">
              <div className="w-px h-4 bg-foreground/20" />
            </div>

            {/* C5 sub-module nodes in rows */}
            <div className="max-w-[700px] mx-auto mb-3">
              {[c5Nodes.slice(0, 4), c5Nodes.slice(4, 8), c5Nodes.slice(8)].map((row, ri) => (
                <div key={ri} className="flex justify-center gap-2 mb-2">
                  {row.map(n => (
                    <div key={n.id} className="w-[160px]">
                      <MiniNode name={n.name} owner={n.owner} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Connector + divider */}
            <div className="flex justify-center mb-2">
              <div className="w-px h-5 bg-foreground/20" />
            </div>
            <div className="border-t border-dashed border-foreground/15 mb-4" />

            {/* 4 Cluster columns */}
            <div className="grid grid-cols-4 gap-3">
              {clusterCols.map(col => {
                const colors = clusterHeaderColors[col.clusterId] || clusterHeaderColors[1];
                return (
                  <div key={col.clusterId}>
                    {/* Cluster header */}
                    <div className={`border-2 ${colors.border} rounded-xl p-3 text-center mb-3 bg-white`}>
                      <div className={`text-[9px] font-bold uppercase tracking-wider ${colors.labelColor}`}>Cluster {col.clusterId}</div>
                      <div className="text-[12px] font-bold text-foreground leading-tight whitespace-pre-line">{col.clusterName}</div>
                    </div>

                    {/* Sections + nodes */}
                    {col.sections.map((sec, si) => (
                      <div key={si} className="mb-3">
                        <div className="text-[9px] font-bold text-foreground/30 uppercase tracking-wider mb-1.5 px-1">{sec.label}</div>
                        <div className="space-y-1.5">
                          {sec.nodes.map(n => (
                            <MiniNode key={n.id} name={n.name} owner={n.owner} />
                          ))}
                        </div>
                      </div>
                    ))}

                    {col.note && (
                      <div className="text-[9px] text-foreground/30 italic text-center mt-2 whitespace-pre-line leading-relaxed">{col.note}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
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

      {/* Module cards */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-3">Module → Feature Mapping</h3>
        <div className="space-y-3">
          {moduleMapping.map(({ mod, sectionCount, subModCount, promptCount }) => (
            <button
              key={mod.id}
              onClick={() => navigate(`/module/${mod.id}`)}
              className="w-full text-left border border-border rounded-xl bg-white/60 p-4 hover:shadow-md hover:border-primary/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-wider">Module {mod.id}</span>
                  <h4 className="text-[13px] font-bold text-foreground">{mod.name}</h4>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-black/[0.03] text-foreground/40 font-semibold">{sectionCount} sections</span>
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-black/[0.03] text-foreground/40 font-semibold">{subModCount} sub-modules</span>
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-semibold">{promptCount} agents</span>
                  <ArrowRight className="w-3.5 h-3.5 text-foreground/20 group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div className="text-[11px] text-foreground/40 leading-relaxed">{mod.description}</div>
            </button>
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
                <th className="text-left px-4 py-2.5 font-bold text-foreground/50 uppercase tracking-wider text-[10px] w-20">Page</th>
              </tr>
            </thead>
            <tbody>
              {principleRows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-black/[0.01] cursor-pointer" onClick={() => navigate(row.appPage)}>
                  <td className="px-4 py-3 font-semibold text-foreground align-top w-[200px]">{row.principle}</td>
                  <td className="px-4 py-3 text-foreground/50 leading-relaxed">{row.implementation}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1">
                      Open <ArrowRight className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Features */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-3">What You Can Do in This Tool</h3>
        <div className="border border-border rounded-xl bg-white/60 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "Run Any Agent", desc: "Click any node on the Org Chart or go to AI Assistants to fire a real LLM call", path: "/swarm" },
              { name: "Buyer Roleplay", desc: "Practice CTV pitches against AI-simulated buyers with deep technical knowledge", path: "/simulation" },
              { name: "Competitive Sims", desc: "Head-to-head simulations against TTD, tvScientific, Roku, Amazon", path: "/war-room" },
              { name: "AI Insights", desc: "Market intelligence, deal analysis, and pipeline insights on demand", path: "/data-pulse" },
              { name: "Approval Queue", desc: "Review and approve AI-generated content before it goes to market", path: "/approvals" },
              { name: "Dashboard", desc: "Full command center — run clusters, track outputs, monitor system health", path: "/dashboard" },
              { name: "Org Chart + Demo", desc: "This page — visualize the entire system and watch it activate", path: "/" },
            ].map((f, i) => (
              <button
                key={i}
                onClick={() => f.path && navigate(f.path)}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-black/[0.02] transition-colors text-left group"
              >
                <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-semibold text-foreground group-hover:text-primary transition-colors">{f.name}</div>
                  <div className="text-[10px] text-foreground/40">{f.desc}</div>
                </div>
              </button>
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
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const stats = getTotalStats();

  // Build tree data
  const c5Nodes = useMemo(() => buildC5Nodes(), []);
  const clusterColumns = useMemo(() => buildClusterColumns(), []);
  const allNodeIds = useMemo(() => getAllTreeNodeIds(c5Nodes, clusterColumns), [c5Nodes, clusterColumns]);

  // First visit → tour
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => setTourActive(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-trigger demo on demo step
  useEffect(() => {
    if (tourActive && tourSteps[tourStep]?.action === "demo" && !demoRunning) {
      const timer = setTimeout(() => startDemo(), 400);
      return () => clearTimeout(timer);
    }
  }, [tourActive, tourStep]);

  // Active run node IDs
  const activeRunNodeIds = useMemo(() => {
    const ids = new Set<string>();
    recentRuns.forEach((run) => {
      if (run.status === "running" || run.status === "completed") {
        // Match by name
        const matchId = allNodeIds.find(nid => nid.includes(run.subModuleName.toLowerCase().replace(/\s+/g, "-")));
        if (matchId) ids.add(matchId);
      }
    });
    return ids;
  }, [recentRuns, allNodeIds]);

  // Node click → open drawer
  const handleNodeClick = useCallback((node: TreeNode) => {
    if (tourActive) return; // Don't open drawer during tour
    setSelectedNode(node);
  }, [tourActive]);

  const handleDrawerNavigate = useCallback((moduleId: number, sectionKey: string) => {
    setSelectedNode(null);
    navigate(`/module/${moduleId}?section=${encodeURIComponent(sectionKey)}`);
  }, [navigate]);

  // Demo mode
  const startDemo = useCallback(() => {
    demoTimerRef.current.forEach(clearTimeout);
    demoTimerRef.current = [];
    setDemoActiveNodes(new Set());
    setDemoRunning(true);

    // Sequence: C5 first, then C1-C4
    let delay = 0;

    // C5 nodes
    c5Nodes.forEach((node) => {
      const timer = setTimeout(() => {
        setDemoActiveNodes(prev => { const next = new Set(Array.from(prev)); next.add(node.id); return next; });
      }, delay);
      demoTimerRef.current.push(timer);
      delay += 60;
    });
    delay += 400;

    // Cluster columns
    clusterColumns.forEach((col) => {
      col.sections.forEach(sec => {
        sec.nodes.forEach((node) => {
          const timer = setTimeout(() => {
            setDemoActiveNodes(prev => { const next = new Set(Array.from(prev)); next.add(node.id); return next; });
          }, delay);
          demoTimerRef.current.push(timer);
          delay += 60;
        });
      });
      delay += 300;
    });

    const endTimer = setTimeout(() => setDemoRunning(false), delay + 1000);
    demoTimerRef.current.push(endTimer);
  }, [c5Nodes, clusterColumns]);

  const stopDemo = useCallback(() => {
    demoTimerRef.current.forEach(clearTimeout);
    demoTimerRef.current = [];
    setDemoRunning(false);
    setDemoActiveNodes(new Set());
  }, []);

  const completeTour = useCallback(() => {
    setTourActive(false);
    localStorage.setItem(TOUR_KEY, "true");
    localStorage.setItem("ctv-welcome-seen-v3", "true");
    localStorage.setItem("ctv-orgchart-walkthrough-seen", "true");
  }, []);

  const handleTourNext = useCallback(() => {
    if (tourStep < tourSteps.length - 1) setTourStep(s => s + 1);
  }, [tourStep]);

  const handleTourPrev = useCallback(() => setTourStep(s => Math.max(s - 1, 0)), []);

  const handleEnterEngine = useCallback(() => {
    completeTour();
    stopDemo();
    navigate("/dashboard");
  }, [completeTour, stopDemo, navigate]);

  const handleSkipTour = useCallback(() => {
    completeTour();
    stopDemo();
  }, [completeTour, stopDemo]);

  // Merge demo + real active nodes
  const mergedActiveNodes = useMemo(() => {
    const merged = new Set(demoActiveNodes);
    Array.from(activeRunNodeIds).forEach(id => merged.add(id));
    return merged;
  }, [demoActiveNodes, activeRunNodeIds]);

  const tourHighlight = tourActive ? tourSteps[tourStep]?.highlight : "none";

  // C5 sub-modules arranged in rows (4-4-3 matching source image)
  const c5Rows = useMemo(() => {
    const rows: TreeNode[][] = [];
    const perRow = 4;
    for (let i = 0; i < c5Nodes.length; i += perRow) {
      rows.push(c5Nodes.slice(i, i + perRow));
    }
    return rows;
  }, [c5Nodes]);

  return (
    <NeuralShell>
      <div className="max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div>
            <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-foreground">AI-First Org Map</h1>
            <p className="text-[12px] sm:text-[13px] text-foreground/40 mt-0.5">
              {stats.totalPrompts} agents · {stats.modules} modules · {stats.clusters} clusters
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
              <button onClick={stopDemo} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-all">
                <Pause className="w-3.5 h-3.5" /> Stop
              </button>
            ) : (
              <button
                onClick={() => { if (tourActive) completeTour(); startDemo(); }}
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
              className="flex items-center gap-3 sm:gap-5 mb-6 px-4 py-3 rounded-xl bg-black/[0.02] border border-black/[0.04] overflow-x-auto scrollbar-hide justify-center"
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-[11px] text-foreground/50 font-medium">Agent</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-3 h-3 rounded-sm bg-emerald-600" />
                <span className="text-[11px] text-foreground/50 font-medium">Human-led</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-[11px] text-foreground/50 font-medium">Agent + Human</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-3 h-3 rounded-sm bg-red-400" />
                <span className="text-[11px] text-foreground/50 font-medium">DRI Cluster</span>
              </div>
              {demoRunning && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-foreground/50 font-medium">Active</span>
                </div>
              )}
            </motion.div>

            {/* ═══ TREE LAYOUT ═══ */}
            <div className="overflow-x-auto pb-4">
              <div className="min-w-[900px]">

                {/* ── C5 DRI Box (centered, dark) ── */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex justify-center mb-0 transition-all duration-500 ${tourHighlight === "clusters" || tourHighlight === "nodes" ? "opacity-40" : ""}`}
                >
                  <div className={`px-8 py-4 rounded-2xl bg-slate-800 text-center shadow-lg ${tourHighlight === "cluster-5" ? "ring-2 ring-primary/40 shadow-xl" : ""}`}>
                    <div className="text-[14px] font-bold text-white">Cluster 5 — DRI // XFN Management</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">Module 4: Executive Governance & BI</div>
                  </div>
                </motion.div>

                {/* Vertical connector */}
                <div className="flex justify-center">
                  <div className="w-px h-8 bg-slate-300 relative overflow-hidden">
                    {demoRunning && (
                      <motion.div
                        className="absolute left-0 w-full h-3 bg-gradient-to-b from-transparent via-emerald-400 to-transparent"
                        animate={{ top: ["-12px", "32px"] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                  </div>
                </div>

                {/* ── C5 Sub-module rows (centered, red left-border) ── */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className={`space-y-2 mb-0 transition-all duration-500 ${tourHighlight === "clusters" || tourHighlight === "nodes" ? "opacity-40" : ""}`}
                >
                  {c5Rows.map((row, ri) => (
                    <div key={ri} className="flex justify-center gap-2 flex-wrap max-w-[800px] mx-auto">
                      {row.map((node, ni) => (
                        <div key={node.id} className="w-[185px]">
                          <TreeNodeBox
                            node={node}
                            isActive={mergedActiveNodes.has(node.id)}
                            isHighlighted={tourHighlight === "cluster-5" || tourHighlight === "nodes"}
                            onClick={() => handleNodeClick(node)}
                            delay={ri * 4 + ni}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </motion.div>

                {/* Vertical connector + horizontal divider */}
                <div className="flex justify-center">
                  <div className="w-px h-8 bg-slate-300 relative overflow-hidden">
                    {demoRunning && (
                      <motion.div
                        className="absolute left-0 w-full h-3 bg-gradient-to-b from-transparent via-emerald-400 to-transparent"
                        animate={{ top: ["-12px", "32px"] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "linear", delay: 0.3 }}
                      />
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-200 mb-6 mx-8" />

                {/* ── Four Cluster Columns ── */}
                <div className={`grid grid-cols-4 gap-4 transition-all duration-500 ${tourHighlight === "cluster-5" ? "opacity-40" : ""}`}>
                  {clusterColumns.map((col) => {
                    const hc = clusterHeaderColors[col.clusterId];
                    return (
                      <motion.div
                        key={col.clusterId}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + col.clusterId * 0.05 }}
                        className="flex flex-col"
                      >
                        {/* Cluster header */}
                        <div className={`border-2 ${hc.border} rounded-xl px-4 py-3 text-center mb-4 ${hc.bg} ${tourHighlight === "clusters" ? "ring-2 ring-primary/30 shadow-md" : ""}`}>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${hc.labelColor}`}>
                            Cluster {col.clusterId}
                          </div>
                          <div className="text-[13px] font-bold text-foreground leading-tight mt-0.5 whitespace-pre-line">
                            {col.clusterName}
                          </div>
                        </div>

                        {/* Sections + nodes */}
                        {col.sections.map((sec, si) => (
                          <div key={si} className="mb-3">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-foreground/25 mb-2 px-1">
                              {sec.label}
                            </div>
                            <div className="space-y-1.5">
                              {sec.nodes.map((node, ni) => (
                                <TreeNodeBox
                                  key={node.id}
                                  node={node}
                                  isActive={mergedActiveNodes.has(node.id)}
                                  isHighlighted={tourHighlight === "clusters" || tourHighlight === "nodes"}
                                  onClick={() => handleNodeClick(node)}
                                  delay={12 + col.clusterId * 8 + si * 4 + ni}
                                />
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Note (for Cluster 3) */}
                        {col.note && (
                          <div className="mt-1 px-2 py-2 text-[10px] text-foreground/30 italic leading-relaxed whitespace-pre-line text-center">
                            {col.note}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center text-[11px] text-foreground/25 font-medium"
            >
              Click any node to open its agent · Hit Demo to watch the system activate · Source: AI-First CTV Commercial Operating Model (Mar 9, 2026)
            </motion.div>
          </TabsContent>

          <TabsContent value="reference">
            <ReferenceGuide />
          </TabsContent>
        </Tabs>

        {/* Tour overlay */}
        <AnimatePresence>
          {tourActive && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ background: "oklch(0 0 0 / 0.05)" }}
                onClick={e => e.stopPropagation()}
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

        {/* Agent drawer */}
        {selectedNode && (
          <AgentDrawer
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onNavigate={handleDrawerNavigate}
          />
        )}
      </div>
    </NeuralShell>
  );
}
