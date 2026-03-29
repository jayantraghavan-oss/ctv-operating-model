/**
 * OrgChart — Control Center (Tree Layout)
 * Pixel-perfect tree layout matching the source document.
 * C5 DRI at top → sub-modules in rows → connector → 4 cluster columns.
 * Every node is clickable → fires real agent execution with inline streaming output.
 * Execute Workflow: workflow picker → cascading real agent execution with narration.
 */
import NeuralShell from "@/components/NeuralShell";
import OutputInterstitial from "@/components/OutputInterstitial";
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
  Maximize2,
  Target,
  TrendingUp,
  Swords,
  RefreshCw,
  ChevronUp,
  FileText,
  Copy,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  History,
  Save,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/useMobile";
import { toast } from "sonner";
import { callLLM } from "@/lib/llm";

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
    tip: "In the tool, click any box to see its agents, then hit 'Execute Workflow' to run a full scenario.",
    action: null as string | null,
  },
  {
    title: "Ready to Explore?",
    description: "You can click any node on this map to run that agent directly. Or head to the Dashboard to see the full control center — run agents, review outputs, simulate buyer conversations, and more.",
    highlight: "none" as const,
    icon: MousePointer,
    tip: "Come back to this Control Center anytime from the sidebar.",
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

// ── Workflow definitions ──
interface DemoScenario {
  id: string;
  name: string;
  icon: typeof Target;
  description: string;
  narration: string[];
  nodeSequence: string[]; // node IDs to fire in order
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

  // Cluster 1 — Module 1
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
  const c1Nodes: TreeNode[] = [];
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

  // Cluster 4 — Module 3
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

// ── Build a flat lookup of all nodes by ID ──
function buildNodeMap(c5Nodes: TreeNode[], columns: ClusterColumn[]): Record<string, TreeNode> {
  const map: Record<string, TreeNode> = {};
  c5Nodes.forEach(n => { map[n.id] = n; });
  columns.forEach(col => col.sections.forEach(sec => sec.nodes.forEach(n => { map[n.id] = n; })));
  return map;
}

// ── Build scenarios from real node IDs ──
function buildScenarios(c5Nodes: TreeNode[], columns: ClusterColumn[]): DemoScenario[] {
  const nodeMap = buildNodeMap(c5Nodes, columns);
  const findNode = (partial: string): string | null => {
    const keys = Object.keys(nodeMap);
    return keys.find(k => k.toLowerCase().includes(partial.toLowerCase())) || null;
  };

  // Helper to collect first N valid node IDs from a list of partial matches
  const collect = (partials: string[]): string[] =>
    partials.map(p => findNode(p)).filter((id): id is string => id !== null);

  return [
    {
      id: "new-advertiser",
      name: "New CTV Advertiser Pitch",
      icon: Target,
      description: "Full pipeline from market research to pitch deck to sales coaching — everything needed to win a new CTV advertiser.",
      narration: [
        "Scanning CTV market landscape and competitive positioning...",
        "Building ideal customer profile and identifying decision-makers...",
        "Generating outbound messaging and pitch materials...",
        "Preparing sales coaching and engagement strategy...",
        "Structuring test funding proposal and commitment framework...",
        "Finalizing executive communications and pipeline visibility...",
      ],
      nodeSequence: collect([
        "industry-sensing-Industry",
        "competitor-intel-Competitor",
        "analyst-tracking-Positioning",
        "icp-intelligence",
        "outbound-system",
        "content-engine",
        "sales-engagement-Pitch",
        "sales-engagement-Sales Coaching",
        "test-funding",
        "pipeline-visibility",
      ]),
    },
    {
      id: "qbr-prep",
      name: "Quarterly Business Review",
      icon: TrendingUp,
      description: "Prepare a complete QBR — performance readout, pipeline visibility, conviction tracking, and executive communications.",
      narration: [
        "Pulling pipeline visibility and revenue pacing data...",
        "Generating performance readout and scale recommendations...",
        "Analyzing cross-account intelligence patterns...",
        "Updating conviction tracker with latest learnings...",
        "Preparing executive communications and weekly prep...",
      ],
      nodeSequence: collect([
        "pipeline-visibility",
        "revenue-pacing",
        "campaign-monitoring",
        "performance-scaling",
        "cross-account",
        "conviction",
        "executive-comms",
        "weekly-prep",
      ]),
    },
    {
      id: "competitive-win",
      name: "Competitive Win-Back",
      icon: Swords,
      description: "Counter a competitive threat — from intelligence gathering to repositioned messaging to sales re-engagement.",
      narration: [
        "Gathering competitive intelligence on incumbent DSP...",
        "Analyzing positioning gaps and differentiation angles...",
        "Generating counter-messaging and updated pitch materials...",
        "Preparing sales coaching for competitive objection handling...",
        "Building case study evidence from similar wins...",
      ],
      nodeSequence: collect([
        "competitor-intel-Competitor",
        "analyst-tracking-Positioning",
        "analyst-tracking-Message",
        "content-engine",
        "sales-engagement-Pitch",
        "sales-engagement-Sales Coaching",
        "case-study",
      ]),
    },
    {
      id: "campaign-optimization",
      name: "Campaign Optimization Cycle",
      icon: RefreshCw,
      description: "End-to-end optimization loop — monitoring, performance readout, churn prevention, and feedback routing back to product.",
      narration: [
        "Running campaign monitoring and optimization checks...",
        "Generating performance readout with scale recommendations...",
        "Checking churn prevention early warning signals...",
        "Analyzing cross-account intelligence for patterns...",
        "Routing feedback to product and exec reporting...",
      ],
      nodeSequence: collect([
        "campaign-monitoring",
        "performance-scaling",
        "churn-prevention",
        "long-term-health",
        "cross-account",
        "feedback-routing",
        "customer-comms",
      ]),
    },
  ];
}

// ── Single tree node component with inline output ──
function TreeNodeBox({
  node,
  isActive,
  isHighlighted,
  isDemoActive,
  onClick,
  delay = 0,
  inlineOutput,
  isRunning,
  onExpand,
}: {
  node: TreeNode;
  isActive: boolean;
  isHighlighted: boolean;
  isDemoActive: boolean;
  onClick: () => void;
  delay?: number;
  inlineOutput?: string;
  isRunning?: boolean;
  onExpand?: () => void;
}) {
  const s = ownerStyle[node.owner];
  const hasOutput = !!inlineOutput;
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.015, type: "spring", stiffness: 400, damping: 30 }}
    >
      <button
        onClick={onClick}
        className={`relative text-left w-full px-3 py-2 rounded-lg border-l-[3px] border border-black/[0.06] transition-all duration-200 group cursor-pointer
          ${s.border} ${s.bg}
          ${isHighlighted ? "ring-2 ring-primary/30 shadow-md" : ""}
          ${isActive || isDemoActive ? "ring-2 ring-emerald-400 shadow-lg shadow-emerald-100/50" : ""}
          hover:shadow-md hover:translate-y-[-1px] active:scale-[0.98]`}
      >
        {(isActive || isDemoActive) && (
          <motion.div
            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        {isRunning && (
          <motion.div
            className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-blue-500"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[12px] font-semibold leading-tight ${s.text}`}>{node.name}</span>
          <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${s.badgeBg}`}>
            {s.short}
          </span>
        </div>
      </button>

      {/* Inline output preview */}
      <AnimatePresence>
        {hasOutput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mt-1 rounded-lg border border-black/[0.04] bg-white/90 overflow-hidden"
          >
            <div className="px-2.5 py-2 max-h-[80px] overflow-hidden relative">
              <div className="text-[10px] leading-relaxed text-foreground/50 line-clamp-3">
                <Streamdown>{inlineOutput!.slice(0, 300)}</Streamdown>
              </div>
              {/* Fade-out gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-white/90 to-transparent" />
            </div>
            {onExpand && (
              <button
                onClick={(e) => { e.stopPropagation(); onExpand(); }}
                className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-primary/70 hover:text-primary hover:bg-primary/[0.04] transition-colors border-t border-black/[0.04]"
              >
                <Maximize2 className="w-3 h-3" /> Expand
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Workflow Picker Modal (with custom query) ──
function WorkflowPickerModal({
  scenarios,
  onSelect,
  onCustomQuery,
  onClose,
}: {
  scenarios: DemoScenario[];
  onSelect: (scenario: DemoScenario) => void;
  onCustomQuery: (query: string) => void;
  onClose: () => void;
}) {
  const [customQuery, setCustomQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCustomSubmit = async () => {
    if (!customQuery.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    onCustomQuery(customQuery.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{
          background: "oklch(1 0 0 / 0.97)",
          backdropFilter: "blur(24px) saturate(1.5)",
          boxShadow: "0 24px 80px oklch(0 0 0 / 0.15), 0 2px 8px oklch(0 0 0 / 0.06)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.06]">
          <div>
            <h2 className="text-[18px] font-bold text-foreground">Execute Workflow</h2>
            <p className="text-[13px] text-foreground/40 mt-0.5">
              Describe what you need or pick a preset scenario. Agents execute in cascade with live output.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-foreground/40" />
          </button>
        </div>

        {/* Custom query input */}
        <div className="px-5 pt-5 pb-3">
          <div className="relative">
            <textarea
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder='Describe your workflow... e.g. "Prepare everything for a pitch to a retail brand considering CTV for the first time" or "Run a full competitive analysis against The Trade Desk"'
              className="w-full h-24 px-4 py-3 pr-12 rounded-xl border border-black/[0.08] bg-black/[0.015] text-[13px] text-foreground placeholder:text-foreground/25 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleCustomSubmit();
                }
              }}
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customQuery.trim() || isAnalyzing}
              className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-foreground/25 mt-1.5 ml-1">
            AI will analyze your query and select the right agents. Press ⌘+Enter to submit.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-5 py-2">
          <div className="flex-1 h-px bg-black/[0.06]" />
          <span className="text-[11px] font-semibold text-foreground/25 uppercase tracking-wider">or choose a preset</span>
          <div className="flex-1 h-px bg-black/[0.06]" />
        </div>

        {/* Preset scenario cards */}
        <div className="p-5 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {scenarios.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <button
                key={scenario.id}
                onClick={() => onSelect(scenario)}
                className="text-left p-4 rounded-xl border border-black/[0.06] hover:border-primary/30 hover:shadow-md hover:bg-primary/[0.02] transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <h3 className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors">
                    {scenario.name}
                  </h3>
                </div>
                <p className="text-[12px] text-foreground/40 leading-relaxed">{scenario.description}</p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-primary/60 font-semibold">
                  <Play className="w-3 h-3" />
                  {scenario.nodeSequence.length} agents in sequence
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-6 pb-4 text-center">
          <p className="text-[11px] text-foreground/25">
            Each workflow fires real LLM calls. Agents execute in order with streaming output.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Workflow Narration Bar ──
function DemoNarrationBar({
  scenario,
  currentStep,
  totalSteps,
  completedCount,
  isRunning,
  onStop,
}: {
  scenario: DemoScenario;
  currentStep: number;
  totalSteps: number;
  completedCount: number;
  isRunning: boolean;
  onStop: () => void;
}) {
  const narrationText = scenario.narration[Math.min(currentStep, scenario.narration.length - 1)] || "Executing agents...";
  const progress = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-5 rounded-xl border border-primary/20 bg-primary/[0.03] overflow-hidden"
    >
      {/* Progress bar */}
      <div className="h-1 bg-primary/10">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {isRunning ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-4 h-4 text-primary" />
              </motion.div>
            ) : (
              <Sparkles className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-foreground truncate">
              {scenario.name}
            </div>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[11px] text-foreground/40 truncate"
            >
              {narrationText}
            </motion.div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2 sm:ml-3">
          <span className="text-[10px] sm:text-[11px] font-mono text-foreground/30 tabular-nums">
            {completedCount}/{totalSteps}
          </span>
          <button
            onClick={onStop}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-all"
          >
            <Pause className="w-3 h-3" /> Stop
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Scenario Summary Panel ──
function ScenarioSummaryPanel({
  scenario,
  nodeOutputs,
  nodeMap,
  onClose,
  onRerun,
}: {
  scenario: DemoScenario;
  nodeOutputs: Record<string, { output: string; isStreaming: boolean; runId?: string; durationMs?: number }>;
  nodeMap: Record<string, TreeNode>;
  onClose: () => void;
  onRerun: () => void;
}) {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const completedNodes = scenario.nodeSequence.filter(id => {
    const info = nodeOutputs[id];
    return info && !info.isStreaming && info.output;
  });
  const totalDuration = completedNodes.reduce((sum, id) => sum + (nodeOutputs[id]?.durationMs || 0), 0);

  const buildCompiledOutput = () => {
    return completedNodes.map(id => {
      const node = nodeMap[id];
      const info = nodeOutputs[id];
      return `## ${node?.name || id}\n\n${info?.output || "No output"}`;
    }).join("\n\n---\n\n");
  };

  const copyAll = () => {
    const text = buildCompiledOutput();
    navigator.clipboard.writeText(`# ${scenario.name} — Executive Summary\n\n${text}`);
    toast.success("Full summary copied to clipboard");
  };

  const saveSession = async () => {
    if (isSaving || savedSessionId) return;
    setIsSaving(true);
    try {
      const sessionId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const compiledOutput = `# ${scenario.name} — Executive Summary\n\n${buildCompiledOutput()}`;
      const nodeDetails = JSON.stringify(
        scenario.nodeSequence.map(id => ({
          nodeId: id,
          nodeName: nodeMap[id]?.name || id,
          output: nodeOutputs[id]?.output || "",
          durationMs: nodeOutputs[id]?.durationMs || 0,
          status: nodeOutputs[id]?.output ? "completed" : "skipped",
        }))
      );

      const isCustom = scenario.id.startsWith("custom-");

      await fetch("/api/trpc/workflowSessions.save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          json: {
            id: sessionId,
            name: scenario.name,
            description: scenario.description,
            queryType: isCustom ? "custom" : "preset",
            customQuery: isCustom ? scenario.description : undefined,
            agentCount: scenario.nodeSequence.length,
            completedCount: completedNodes.length,
            totalDurationMs: totalDuration,
            compiledOutput,
            nodeDetails,
            startedAt: Date.now() - totalDuration,
            completedAt: Date.now(),
          },
        }),
      });

      setSavedSessionId(sessionId);
      toast.success("Session saved! You can revisit it anytime.");
    } catch (err: any) {
      toast.error(`Failed to save session: ${err.message?.slice(0, 60)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-black/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-foreground">{scenario.name}</h2>
              <p className="text-[12px] text-foreground/40">
                {completedNodes.length} agents completed · {(totalDuration / 1000).toFixed(1)}s total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-foreground/50 hover:text-foreground hover:bg-black/[0.04] transition-all"
            >
              <Copy className="w-3.5 h-3.5" /> Copy All
            </button>
            <button
              onClick={saveSession}
              disabled={isSaving || !!savedSessionId}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                savedSessionId
                  ? "bg-emerald-50 text-emerald-600 cursor-default"
                  : "bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              }`}
            >
              {isSaving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
              ) : savedSessionId ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> Save Session</>
              )}
            </button>
            <button
              onClick={onRerun}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-primary/8 text-primary hover:bg-primary/12 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-run
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/[0.04] text-foreground/30 hover:text-foreground/60 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {scenario.nodeSequence.map((nodeId, i) => {
            const node = nodeMap[nodeId];
            const info = nodeOutputs[nodeId];
            const hasOutput = info && !info.isStreaming && info.output;
            const isExpanded = expandedNode === nodeId;

            return (
              <motion.div
                key={nodeId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border border-black/[0.06] rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedNode(isExpanded ? null : nodeId)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.015] transition-colors text-left"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">{node?.name || nodeId}</div>
                    {hasOutput && (
                      <div className="text-[11px] text-foreground/35 truncate mt-0.5">
                        {info.output.slice(0, 120).replace(/[#*_]/g, "")}...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {info?.durationMs && (
                      <span className="text-[10px] text-foreground/25 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{(info.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    {hasOutput ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-foreground/10" />
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-foreground/25 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && hasOutput && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-black/[0.04]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Output
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(info.output); toast.success("Copied"); }}
                            className="p-1 rounded hover:bg-black/[0.04] text-foreground/25 hover:text-foreground/50 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[12px] text-foreground/70 leading-relaxed prose prose-xs max-w-none prose-headings:text-foreground/80 prose-headings:font-semibold max-h-64 overflow-y-auto">
                          <Streamdown>{info.output}</Streamdown>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-black/[0.06] bg-black/[0.015] shrink-0">
          <p className="text-[11px] text-foreground/30 text-center">
            {completedNodes.length} of {scenario.nodeSequence.length} agents completed · Total execution: {(totalDuration / 1000).toFixed(1)}s
          </p>
        </div>
      </motion.div>
    </motion.div>
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
      {/* Source document mapping */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-3">Source Document → Live System</h3>
        <div className="border border-border rounded-xl bg-white/60 p-4">
          <p className="text-[12px] text-foreground/50 leading-relaxed mb-4">
            This tool implements the <span className="font-semibold text-foreground">AI-First CTV Commercial Operating Model</span> (March 9, 2026).
            Every module, cluster, and agent below maps directly to the source document. The org chart on the previous tab is an interactive version of the document's architecture diagram.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
              <div className="text-[20px] font-bold text-primary">{stats.modules}</div>
              <div className="text-[10px] text-foreground/40 font-semibold mt-0.5">Work Modules</div>
            </div>
            <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
              <div className="text-[20px] font-bold text-primary">{stats.clusters}</div>
              <div className="text-[10px] text-foreground/40 font-semibold mt-0.5">Clusters</div>
            </div>
            <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
              <div className="text-[20px] font-bold text-primary">{stats.totalSubModules}</div>
              <div className="text-[10px] text-foreground/40 font-semibold mt-0.5">Sub-modules</div>
            </div>
            <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
              <div className="text-[20px] font-bold text-primary">{stats.totalPrompts}</div>
              <div className="text-[10px] text-foreground/40 font-semibold mt-0.5">Agent Prompts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded mini tree */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-3">Architecture (Source Image Match)</h3>
        <div className="border border-border rounded-xl bg-white/60 p-4 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* C5 */}
            <div className="flex justify-center mb-3">
              <div className="px-6 py-2.5 rounded-xl bg-slate-800 text-center">
                <div className="text-[11px] font-bold text-white">Cluster 5 — DRI // XFN</div>
                <div className="text-[9px] text-slate-400 mt-0.5">Module 4: Executive Governance</div>
              </div>
            </div>
            <div className="flex justify-center mb-2">
              <div className="w-px h-4 bg-slate-300" />
            </div>
            <div className="flex justify-center gap-1.5 flex-wrap max-w-[650px] mx-auto mb-3">
              {c5Nodes.map(n => <div key={n.id} className="w-[150px]"><MiniNode name={n.name} owner={n.owner} /></div>)}
            </div>
            <div className="border-t border-slate-200 mb-3 mx-6" />
            <div className="grid grid-cols-4 gap-3">
              {clusterCols.map(col => {
                const hc = clusterHeaderColors[col.clusterId];
                return (
                  <div key={col.clusterId}>
                    <div className={`border-2 ${hc.border} rounded-lg px-2 py-1.5 text-center mb-2`}>
                      <div className={`text-[8px] font-bold uppercase ${hc.labelColor}`}>C{col.clusterId}</div>
                      <div className="text-[9px] font-bold text-foreground leading-tight whitespace-pre-line">{col.clusterName}</div>
                    </div>
                    <div className="space-y-1">
                      {col.sections.flatMap(s => s.nodes).map(n => <MiniNode key={n.id} name={n.name} owner={n.owner} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
              { name: "Run Any Agent", desc: "Click any node on the Control Center or go to the Toolkit to fire a real LLM call", path: "/toolkit" },
              { name: "Buyer Roleplay", desc: "Practice CTV pitches against AI-simulated buyers with deep technical knowledge", path: "/simulation" },
              { name: "Competitive Sims", desc: "Head-to-head simulations against TTD, tvScientific, Roku, Amazon", path: "/toolkit" },
              { name: "AI Insights", desc: "Market intelligence, deal analysis, and pipeline insights on demand", path: "/toolkit" },
              { name: "Review Queue", desc: "Review and approve AI-generated content before it goes to market", path: "/toolkit" },
              { name: "Toolkit", desc: "Full command center — run agents, track outputs, monitor system health", path: "/toolkit" },
              { name: "Control Center", desc: "This page — visualize the entire system and run scenarios", path: "/" },
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

// ── Mobile Cluster Stack (vertical accordion layout) ──
function MobileClusterStack({
  clusterColumns,
  mergedActiveNodes,
  tourHighlight,
  tourDemoActiveNodes,
  scenarioRunningNodes,
  nodeOutputs,
  handleNodeClick,
  handleExpandNode,
}: {
  clusterColumns: ClusterColumn[];
  mergedActiveNodes: Set<string>;
  tourHighlight: string;
  tourDemoActiveNodes: Set<string>;
  scenarioRunningNodes: Set<string>;
  nodeOutputs: Record<string, { output: string; isStreaming: boolean; runId?: string; durationMs?: number }>;
  handleNodeClick: (node: TreeNode) => void;
  handleExpandNode: (node: TreeNode) => void;
}) {
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(() => new Set([1]));

  const toggleCluster = (id: number) => {
    setExpandedClusters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {clusterColumns.map((col) => {
        const hc = clusterHeaderColors[col.clusterId];
        const isExpanded = expandedClusters.has(col.clusterId);
        const nodeCount = col.sections.reduce((acc, s) => acc + s.nodes.length, 0);
        const activeCount = col.sections.reduce((acc, s) => acc + s.nodes.filter(n => mergedActiveNodes.has(n.id)).length, 0);

        return (
          <motion.div
            key={col.clusterId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: col.clusterId * 0.05 }}
            className={`rounded-xl border-2 ${hc.border} overflow-hidden bg-white ${tourHighlight === "clusters" ? "ring-2 ring-primary/30 shadow-md" : ""}`}
          >
            {/* Cluster header — tap to expand/collapse */}
            <button
              onClick={() => toggleCluster(col.clusterId)}
              className="w-full flex items-center justify-between px-4 py-3 active:bg-black/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${hc.border.replace('border-', 'bg-').replace('-400', '-100')}`}>
                  <span className={`text-[12px] font-bold ${hc.labelColor}`}>C{col.clusterId}</span>
                </div>
                <div className="text-left min-w-0">
                  <div className="text-[13px] font-bold text-foreground leading-tight truncate">
                    {col.clusterName.replace('\n', ' ')}
                  </div>
                  <div className="text-[11px] text-foreground/35 mt-0.5">
                    {nodeCount} agents{activeCount > 0 ? ` · ${activeCount} active` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeCount > 0 && (
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4 text-foreground/30" />
                </motion.div>
              </div>
            </button>

            {/* Expandable node list */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 space-y-3">
                    {col.sections.map((sec, si) => (
                      <div key={si}>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-foreground/25 mb-1.5 px-1">
                          {sec.label}
                        </div>
                        <div className="space-y-1.5">
                          {sec.nodes.map((node, ni) => (
                            <TreeNodeBox
                              key={node.id}
                              node={node}
                              isActive={mergedActiveNodes.has(node.id)}
                              isHighlighted={tourHighlight === "clusters" || tourHighlight === "nodes"}
                              isDemoActive={tourDemoActiveNodes.has(node.id) || scenarioRunningNodes.has(node.id)}
                              onClick={() => handleNodeClick(node)}
                              delay={si * 4 + ni}
                              inlineOutput={nodeOutputs[node.id]?.output}
                              isRunning={nodeOutputs[node.id]?.isStreaming}
                              onExpand={nodeOutputs[node.id]?.output ? () => handleExpandNode(node) : undefined}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {col.note && (
                      <div className="px-2 py-1.5 text-[10px] text-foreground/30 italic leading-relaxed">
                        {col.note}
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
  );
}

// ── Main OrgChart page ──
export default function OrgChart() {
  const [, navigate] = useLocation();
  const { runAgent, agentRuns, recentRuns, getStreamingOutput, editRunOutput, rePromptAgent, approveRun, rejectRun } = useAgent();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("chart");
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourDemoRunning, setTourDemoRunning] = useState(false);
  const [tourDemoActiveNodes, setTourDemoActiveNodes] = useState<Set<string>>(new Set());
  const tourDemoTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Workflow execution state
  const [showScenarioPicker, setShowScenarioPicker] = useState(false);
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(null);
  const [scenarioStep, setScenarioStep] = useState(0);
  const [scenarioCompletedCount, setScenarioCompletedCount] = useState(0);
  const [scenarioRunningNodes, setScenarioRunningNodes] = useState<Set<string>>(new Set());
  const [scenarioCompletedNodes, setScenarioCompletedNodes] = useState<Set<string>>(new Set());
  const scenarioTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [completedScenario, setCompletedScenario] = useState<DemoScenario | null>(null);

  // Node output tracking
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, { output: string; isStreaming: boolean; runId?: string; durationMs?: number }>>({});

  // Interstitial state
  const [interstitialNode, setInterstitialNode] = useState<TreeNode | null>(null);

  const stats = getTotalStats();

  // Build tree data
  const c5Nodes = useMemo(() => buildC5Nodes(), []);
  const clusterColumns = useMemo(() => buildClusterColumns(), []);
  const allNodeIds = useMemo(() => getAllTreeNodeIds(c5Nodes, clusterColumns), [c5Nodes, clusterColumns]);
  const nodeMap = useMemo(() => buildNodeMap(c5Nodes, clusterColumns), [c5Nodes, clusterColumns]);
  const scenarios = useMemo(() => buildScenarios(c5Nodes, clusterColumns), [c5Nodes, clusterColumns]);

  // First visit → tour
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => setTourActive(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-trigger tour demo on demo step
  useEffect(() => {
    if (tourActive && tourSteps[tourStep]?.action === "demo" && !tourDemoRunning) {
      const timer = setTimeout(() => startTourDemo(), 400);
      return () => clearTimeout(timer);
    }
  }, [tourActive, tourStep]);

  // Track streaming outputs for nodes
  useEffect(() => {
    const interval = setInterval(() => {
      setNodeOutputs(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [nodeId, info] of Object.entries(prev)) {
          if (info.isStreaming && info.runId) {
            const streaming = getStreamingOutput(info.runId);
            const run = agentRuns.find(r => r.id === info.runId);
            if (run?.status === "completed" && run.output) {
              next[nodeId] = { output: run.output, isStreaming: false, runId: info.runId, durationMs: run.durationMs };
              changed = true;
            } else if (streaming && streaming !== info.output) {
              next[nodeId] = { ...info, output: streaming };
              changed = true;
            }
          }
        }
        return changed ? next : prev;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [agentRuns, getStreamingOutput]);

  // Also check for completed runs that we haven't tracked yet
  useEffect(() => {
    setNodeOutputs(prev => {
      let changed = false;
      const next = { ...prev };
      for (const [nodeId, info] of Object.entries(prev)) {
        if (info.isStreaming && info.runId) {
          const run = agentRuns.find(r => r.id === info.runId);
          if (run?.status === "completed" && run.output) {
            next[nodeId] = { output: run.output, isStreaming: false, runId: info.runId, durationMs: run.durationMs };
            changed = true;
          } else if (run?.status === "failed") {
            next[nodeId] = { output: run.output || "Agent execution failed.", isStreaming: false, runId: info.runId };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [agentRuns]);

  // Execute a single node's agent
  const executeNode = useCallback((node: TreeNode): string | null => {
    if (node.promptIds.length === 0) return null;
    const pid = node.promptIds[0];
    const promptObj = prompts.find(p => p.id === pid);
    if (!promptObj) return null;

    // Call runAgent — it creates a run with a generated ID
    runAgent(pid, promptObj.text, node.moduleId, node.name, node.agentType, node.owner);

    // Find the new run (it'll be at index 0 of agentRuns after state update)
    // We need to track it by promptId + subModuleName since we don't get the runId back
    // Use a timeout to let state settle, then find the run
    return null; // We'll track via agentRuns matching
  }, [runAgent]);

  // Execute node and track its output
  const executeAndTrackNode = useCallback((node: TreeNode) => {
    if (node.promptIds.length === 0) return;
    const pid = node.promptIds[0];
    const promptObj = prompts.find(p => p.id === pid);
    if (!promptObj) return;

    runAgent(pid, promptObj.text, node.moduleId, node.name, node.agentType, node.owner);

    // Track the run — find it after a tick
    setTimeout(() => {
      // The newest run should match our prompt
      const run = agentRuns.find(r => r.promptId === pid && r.subModuleName === node.name && r.status === "running");
      // If not found immediately, use the first running run
      const latestRun = run || agentRuns[0];
      if (latestRun) {
        setNodeOutputs(prev => ({
          ...prev,
          [node.id]: { output: "", isStreaming: true, runId: latestRun.id },
        }));
      }
    }, 50);
  }, [runAgent, agentRuns]);

  // Better tracking: watch for new runs appearing
  const lastRunCountRef = useRef(agentRuns.length);
  const pendingNodeTrackRef = useRef<string | null>(null);

  const executeAndTrackNodeV2 = useCallback((node: TreeNode) => {
    if (node.promptIds.length === 0) return;
    const pid = node.promptIds[0];
    const promptObj = prompts.find(p => p.id === pid);
    if (!promptObj) return;

    pendingNodeTrackRef.current = node.id;
    lastRunCountRef.current = agentRuns.length;

    runAgent(pid, promptObj.text, node.moduleId, node.name, node.agentType, node.owner);
  }, [runAgent, agentRuns.length]);

  // Watch for new runs and associate them with pending node tracking
  useEffect(() => {
    if (pendingNodeTrackRef.current && agentRuns.length > lastRunCountRef.current) {
      const nodeId = pendingNodeTrackRef.current;
      const newRun = agentRuns[0]; // Newest run is at index 0
      if (newRun && newRun.status === "running") {
        setNodeOutputs(prev => ({
          ...prev,
          [nodeId]: { output: "", isStreaming: true, runId: newRun.id },
        }));
      }
      pendingNodeTrackRef.current = null;
      lastRunCountRef.current = agentRuns.length;
    }
  }, [agentRuns]);

  // Node click → execute agent directly
  const handleNodeClick = useCallback((node: TreeNode) => {
    if (tourActive) return;
    if (node.promptIds.length === 0) return;

    // If already has output, open interstitial
    if (nodeOutputs[node.id]?.output && !nodeOutputs[node.id]?.isStreaming) {
      setInterstitialNode(node);
      return;
    }

    // Execute the agent
    executeAndTrackNodeV2(node);
  }, [tourActive, nodeOutputs, executeAndTrackNodeV2]);

  // Expand node output to interstitial
  const handleExpandNode = useCallback((node: TreeNode) => {
    setInterstitialNode(node);
  }, []);

  // Re-run from interstitial
  const handleRerunFromInterstitial = useCallback(() => {
    if (!interstitialNode) return;
    executeAndTrackNodeV2(interstitialNode);
  }, [interstitialNode, executeAndTrackNodeV2]);

  // ── Tour demo (CSS-only animation, no real agents) ──
  const startTourDemo = useCallback(() => {
    tourDemoTimerRef.current.forEach(clearTimeout);
    tourDemoTimerRef.current = [];
    setTourDemoActiveNodes(new Set());
    setTourDemoRunning(true);

    let delay = 0;
    c5Nodes.forEach((node) => {
      const timer = setTimeout(() => {
        setTourDemoActiveNodes(prev => { const next = new Set(Array.from(prev)); next.add(node.id); return next; });
      }, delay);
      tourDemoTimerRef.current.push(timer);
      delay += 60;
    });
    delay += 400;

    clusterColumns.forEach((col) => {
      col.sections.forEach(sec => {
        sec.nodes.forEach((node) => {
          const timer = setTimeout(() => {
            setTourDemoActiveNodes(prev => { const next = new Set(Array.from(prev)); next.add(node.id); return next; });
          }, delay);
          tourDemoTimerRef.current.push(timer);
          delay += 60;
        });
      });
      delay += 300;
    });

    const endTimer = setTimeout(() => setTourDemoRunning(false), delay + 1000);
    tourDemoTimerRef.current.push(endTimer);
  }, [c5Nodes, clusterColumns]);

  const stopTourDemo = useCallback(() => {
    tourDemoTimerRef.current.forEach(clearTimeout);
    tourDemoTimerRef.current = [];
    setTourDemoRunning(false);
    setTourDemoActiveNodes(new Set());
  }, []);

  // ── Workflow execution (real agent execution) ──
  const startScenarioDemo = useCallback((scenario: DemoScenario) => {
    setShowScenarioPicker(false);
    setActiveScenario(scenario);
    setScenarioStep(0);
    setScenarioCompletedCount(0);
    setScenarioRunningNodes(new Set());
    setScenarioCompletedNodes(new Set());

    // Stagger agent execution: fire one every 3 seconds to avoid overwhelming
    const STAGGER_MS = 3000;
    scenarioTimerRef.current.forEach(clearTimeout);
    scenarioTimerRef.current = [];

    scenario.nodeSequence.forEach((nodeId, i) => {
      const node = nodeMap[nodeId];
      if (!node || node.promptIds.length === 0) return;

      const timer = setTimeout(() => {
        setScenarioStep(i);
        setScenarioRunningNodes(prev => { const next = new Set(Array.from(prev)); next.add(nodeId); return next; });

        // Execute the agent
        const pid = node.promptIds[0];
        const promptObj = prompts.find(p => p.id === pid);
        if (!promptObj) return;

        pendingNodeTrackRef.current = nodeId;
        lastRunCountRef.current = agentRuns.length;
        runAgent(pid, promptObj.text, node.moduleId, node.name, node.agentType, node.owner);
      }, i * STAGGER_MS);
      scenarioTimerRef.current.push(timer);
    });
  }, [nodeMap, runAgent, agentRuns.length]);

  // Track scenario completion
  useEffect(() => {
    if (!activeScenario) return;
    let completed = 0;
    const newCompleted = new Set<string>();
    activeScenario.nodeSequence.forEach(nodeId => {
      const info = nodeOutputs[nodeId];
      if (info && !info.isStreaming && info.output) {
        completed++;
        newCompleted.add(nodeId);
      }
    });
    setScenarioCompletedCount(completed);
    setScenarioCompletedNodes(newCompleted);

    // Check if all done
    if (completed >= activeScenario.nodeSequence.length && activeScenario.nodeSequence.length > 0) {
      // Scenario complete — show summary panel
      setTimeout(() => {
        setCompletedScenario(activeScenario);
        setActiveScenario(null);
      }, 1500);
    }
  }, [nodeOutputs, activeScenario]);

  const stopScenarioDemo = useCallback(() => {
    scenarioTimerRef.current.forEach(clearTimeout);
    scenarioTimerRef.current = [];
    setActiveScenario(null);
    setScenarioStep(0);
    setScenarioRunningNodes(new Set());
  }, []);

  // ── Custom query → LLM selects agents → builds dynamic scenario ──
  const handleCustomQuery = useCallback(async (query: string) => {
    setShowScenarioPicker(false);
    toast("Analyzing your query...", { description: "AI is selecting the right agents for your workflow.", duration: 3000 });

    try {
      // Build a compact catalog of all tree nodes for the LLM
      const nodeCatalog = Object.entries(nodeMap).map(([id, node]) => ({
        id,
        name: node.name,
        module: node.moduleId,
        section: node.sectionKey,
        description: node.description?.slice(0, 120) || "",
        prompts: node.promptCount,
      }));

      const response = await callLLM([
        {
          role: "system",
          content: `You are an AI workflow planner for a CTV (Connected TV) advertising operating model. Given a user's query, select the most relevant agent nodes to execute in the optimal order.

Rules:
- Select 3-10 nodes that are most relevant to the query
- Order them logically (research first, then analysis, then action, then reporting)
- For each selected node, write a brief narration step (what it's doing)
- Return ONLY valid JSON, no markdown

Available nodes:\n${JSON.stringify(nodeCatalog, null, 0)}

Return format: { "name": "<workflow name>", "nodeIds": ["id1", "id2", ...], "narration": ["Step 1 description...", "Step 2 description...", ...] }`,
        },
        {
          role: "user",
          content: query,
        },
      ]);

      // Parse LLM response
      let parsed: { name: string; nodeIds: string[]; narration: string[] };
      try {
        const cleaned = response.content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        toast.error("Failed to parse AI response. Try rephrasing your query.");
        return;
      }

      // Validate node IDs exist
      const validNodeIds = parsed.nodeIds.filter(id => nodeMap[id]);
      if (validNodeIds.length === 0) {
        toast.error("No matching agents found. Try a more specific query.");
        return;
      }

      // Build a dynamic scenario
      const dynamicScenario: DemoScenario = {
        id: `custom-${Date.now()}`,
        name: parsed.name || `Custom: ${query.slice(0, 40)}...`,
        icon: MessageSquare,
        description: query,
        narration: parsed.narration.length >= validNodeIds.length
          ? parsed.narration
          : validNodeIds.map((id, i) => parsed.narration[i] || `Executing ${nodeMap[id]?.name || id}...`),
        nodeSequence: validNodeIds,
      };

      toast.success(`Workflow planned: ${validNodeIds.length} agents selected`, { duration: 2000 });
      startScenarioDemo(dynamicScenario);
    } catch (err: any) {
      toast.error(`Failed to plan workflow: ${err.message?.slice(0, 80)}`);
    }
  }, [nodeMap, startScenarioDemo]);

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
    stopTourDemo();
    navigate("/toolkit");
  }, [completeTour, stopTourDemo, navigate]);

  const handleSkipTour = useCallback(() => {
    completeTour();
    stopTourDemo();
  }, [completeTour, stopTourDemo]);

  // Active run node IDs (from real runs, not demo)
  const activeRunNodeIds = useMemo(() => {
    const ids = new Set<string>();
    recentRuns.forEach((run) => {
      if (run.status === "running") {
        const matchId = allNodeIds.find(nid => nid.includes(run.subModuleName.toLowerCase().replace(/\s+/g, "-")));
        if (matchId) ids.add(matchId);
      }
    });
    return ids;
  }, [recentRuns, allNodeIds]);

  // Merge all active states
  const mergedActiveNodes = useMemo(() => {
    const merged = new Set(tourDemoActiveNodes);
    Array.from(activeRunNodeIds).forEach(id => merged.add(id));
    Array.from(scenarioCompletedNodes).forEach(id => merged.add(id));
    return merged;
  }, [tourDemoActiveNodes, activeRunNodeIds, scenarioCompletedNodes]);

  const tourHighlight = tourActive ? tourSteps[tourStep]?.highlight : "none";

  // C5 sub-modules arranged in rows (4-4-3 on desktop, 2 per row on mobile)
  const c5Rows = useMemo(() => {
    const rows: TreeNode[][] = [];
    const perRow = isMobile ? 2 : 4;
    for (let i = 0; i < c5Nodes.length; i += perRow) {
      rows.push(c5Nodes.slice(i, i + perRow));
    }
    return rows;
  }, [c5Nodes, isMobile]);

  // Interstitial data
  const interstitialOutput = interstitialNode ? nodeOutputs[interstitialNode.id] : null;
  const interstitialMatchedRun = interstitialNode ? agentRuns.find(r => interstitialNode.promptIds.includes(r.promptId)) : null;
  const interstitialDisplayOutput = interstitialOutput?.output ||
    (interstitialMatchedRun?.output || "");

  return (
    <NeuralShell>
      <div className="max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div>
            <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-foreground">Control Center</h1>
            <p className="text-[12px] sm:text-[13px] text-foreground/40 mt-0.5">
              {stats.totalPrompts} agents · {stats.modules} modules · {stats.clusters} clusters · Click any node to execute
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTourActive(true); setTourStep(0); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-foreground/50 hover:text-foreground hover:bg-black/[0.04] transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> Guide
            </button>
            {activeScenario ? (
              <button onClick={stopScenarioDemo} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-all">
                <Pause className="w-3.5 h-3.5" /> Stop
              </button>
            ) : (
              <button
                onClick={() => { if (tourActive) completeTour(); setShowScenarioPicker(true); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm"
              >
                <Play className="w-3.5 h-3.5" /> Execute Workflow
              </button>
            )}
          </div>
        </div>

        {/* Scenario narration bar */}
        <AnimatePresence>
          {activeScenario && (
            <DemoNarrationBar
              scenario={activeScenario}
              currentStep={scenarioStep}
              totalSteps={activeScenario.nodeSequence.length}
              completedCount={scenarioCompletedCount}
              isRunning={scenarioCompletedCount < activeScenario.nodeSequence.length}
              onStop={stopScenarioDemo}
            />
          )}
        </AnimatePresence>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 sm:mb-6 bg-black/[0.06] border border-black/[0.08] p-1 h-10 rounded-xl">
            <TabsTrigger value="chart" className="flex items-center gap-1.5 rounded-lg px-4 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border-black/[0.06] data-[state=inactive]:text-muted-foreground">
              <Network className="w-3.5 h-3.5" /> Org Chart
            </TabsTrigger>
            <TabsTrigger value="reference" className="flex items-center gap-1.5 rounded-lg px-4 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border-black/[0.06] data-[state=inactive]:text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" /> Reference Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            {/* Legend */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 sm:gap-5 mb-4 sm:mb-6 px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-black/[0.02] border border-black/[0.04] ${isMobile ? "flex-wrap justify-center" : "overflow-x-auto scrollbar-hide justify-center"}`}
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
              {(tourDemoRunning || activeScenario) && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-foreground/50 font-medium">Active</span>
                </div>
              )}
            </motion.div>

            {/* ═══ TREE LAYOUT ═══ */}
            <div className={isMobile ? "pb-4" : "overflow-x-auto pb-4"}>
              <div className={isMobile ? "" : "min-w-[900px]"}>

                {/* ── C5 DRI Box (centered, dark) ── */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex justify-center mb-0 transition-all duration-500 ${tourHighlight === "clusters" || tourHighlight === "nodes" ? "opacity-40" : ""}`}
                >
                  <div className={`${isMobile ? "px-5 py-3" : "px-8 py-4"} rounded-2xl bg-slate-800 text-center shadow-lg ${tourHighlight === "cluster-5" ? "ring-2 ring-primary/40 shadow-xl" : ""}`}>
                    <div className={`${isMobile ? "text-[13px]" : "text-[14px]"} font-bold text-white`}>Cluster 5 — DRI // XFN Management</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">Module 4: Executive Governance & BI</div>
                  </div>
                </motion.div>

                {/* Vertical connector */}
                <div className="flex justify-center">
                  <div className={`w-px ${isMobile ? "h-5" : "h-8"} bg-slate-300 relative overflow-hidden`}>
                    {(tourDemoRunning || activeScenario) && (
                      <motion.div
                        className="absolute left-0 w-full h-3 bg-gradient-to-b from-transparent via-emerald-400 to-transparent"
                        animate={{ top: ["-12px", "32px"] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                  </div>
                </div>

                {/* ── C5 Sub-module rows ── */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className={`space-y-2 mb-0 transition-all duration-500 ${tourHighlight === "clusters" || tourHighlight === "nodes" ? "opacity-40" : ""}`}
                >
                  {c5Rows.map((row, ri) => (
                    <div key={ri} className={`flex justify-center gap-2 flex-wrap ${isMobile ? "max-w-full px-1" : "max-w-[800px]"} mx-auto`}>
                      {row.map((node, ni) => (
                        <div key={node.id} className={isMobile ? "flex-1 min-w-0" : "w-[185px]"}>
                          <TreeNodeBox
                            node={node}
                            isActive={mergedActiveNodes.has(node.id)}
                            isHighlighted={tourHighlight === "cluster-5" || tourHighlight === "nodes"}
                            isDemoActive={tourDemoActiveNodes.has(node.id) || scenarioRunningNodes.has(node.id)}
                            onClick={() => handleNodeClick(node)}
                            delay={ri * 4 + ni}
                            inlineOutput={nodeOutputs[node.id]?.output}
                            isRunning={nodeOutputs[node.id]?.isStreaming}
                            onExpand={nodeOutputs[node.id]?.output ? () => handleExpandNode(node) : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </motion.div>

                {/* Vertical connector + horizontal divider */}
                <div className="flex justify-center">
                  <div className={`w-px ${isMobile ? "h-5" : "h-8"} bg-slate-300 relative overflow-hidden`}>
                    {(tourDemoRunning || activeScenario) && (
                      <motion.div
                        className="absolute left-0 w-full h-3 bg-gradient-to-b from-transparent via-emerald-400 to-transparent"
                        animate={{ top: ["-12px", "32px"] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "linear", delay: 0.3 }}
                      />
                    )}
                  </div>
                </div>
                <div className={`border-t border-slate-200 ${isMobile ? "mb-4 mx-2" : "mb-6 mx-8"}`} />

                {/* ── Cluster Columns: 4-col grid on desktop, vertical stack on mobile ── */}
                {isMobile ? (
                  <MobileClusterStack
                    clusterColumns={clusterColumns}
                    mergedActiveNodes={mergedActiveNodes}
                    tourHighlight={tourHighlight}
                    tourDemoActiveNodes={tourDemoActiveNodes}
                    scenarioRunningNodes={scenarioRunningNodes}
                    nodeOutputs={nodeOutputs}
                    handleNodeClick={handleNodeClick}
                    handleExpandNode={handleExpandNode}
                  />
                ) : (
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
                                    isDemoActive={tourDemoActiveNodes.has(node.id) || scenarioRunningNodes.has(node.id)}
                                    onClick={() => handleNodeClick(node)}
                                    delay={12 + col.clusterId * 8 + si * 4 + ni}
                                    inlineOutput={nodeOutputs[node.id]?.output}
                                    isRunning={nodeOutputs[node.id]?.isStreaming}
                                    onExpand={nodeOutputs[node.id]?.output ? () => handleExpandNode(node) : undefined}
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
                )}
              </div>
            </div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={`${isMobile ? "mt-4" : "mt-6"} text-center text-[10px] sm:text-[11px] text-foreground/25 font-medium`}
            >
              Click any node to execute its agent · Hit Execute Workflow to run a full scenario · Source: AI-First CTV Commercial Operating Model (Mar 9, 2026)
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
                demoRunning={tourDemoRunning}
              />
            </>
          )}
        </AnimatePresence>

        {/* Workflow picker modal */}
        <AnimatePresence>
          {showScenarioPicker && (
            <WorkflowPickerModal
              scenarios={scenarios}
              onSelect={startScenarioDemo}
              onCustomQuery={handleCustomQuery}
              onClose={() => setShowScenarioPicker(false)}
            />
          )}
        </AnimatePresence>

        {/* Scenario Summary Panel */}
        <AnimatePresence>
          {completedScenario && (
            <ScenarioSummaryPanel
              scenario={completedScenario}
              nodeOutputs={nodeOutputs}
              nodeMap={nodeMap}
              onClose={() => setCompletedScenario(null)}
              onRerun={() => {
                setCompletedScenario(null);
                startScenarioDemo(completedScenario);
              }}
            />
          )}
        </AnimatePresence>

        {/* OutputInterstitial for expanded node view */}
        <OutputInterstitial
          open={!!interstitialNode}
          onClose={() => setInterstitialNode(null)}
          agentName={interstitialNode?.name || ""}
          ownership={interstitialNode?.owner}
          agentType={interstitialNode?.agentType}
          output={interstitialDisplayOutput}
          isStreaming={interstitialNode ? (nodeOutputs[interstitialNode.id]?.isStreaming || false) : false}
          durationMs={interstitialNode ? nodeOutputs[interstitialNode.id]?.durationMs : undefined}
          onRun={interstitialNode ? handleRerunFromInterstitial : undefined}
          isRunning={interstitialNode ? (nodeOutputs[interstitialNode.id]?.isStreaming || false) : false}
          runId={interstitialMatchedRun?.id}
          humanEditedOutput={interstitialMatchedRun?.humanEditedOutput}
          approvalStatus={interstitialMatchedRun?.approvalStatus}
          revisions={interstitialMatchedRun?.revisions}
          onEditOutput={editRunOutput}
          onRePrompt={rePromptAgent}
          onApprove={approveRun}
          onReject={rejectRun}
        />
      </div>
    </NeuralShell>
  );
}
