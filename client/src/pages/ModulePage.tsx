/**
 * ModulePage — Deep-dive into a single work module
 * Each sub-module row is clickable → opens a rich operational detail panel
 * showing inputs, outputs, workflow, data sources, handoff points, and linked prompts.
 * EVERY PROMPT IS CLICKABLE → fires real LLM execution with streaming output.
 */
import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";
import {
  modules,
  clusters,
  prompts as allPrompts,
  getModuleStats,
  getOwnerBg,
  getOwnerLabel,
  getAgentTypeBg,
  getAgentTypeLabel,
  getStatusColor,
} from "@/lib/data";
import type { SubModule, Prompt } from "@/lib/data";
import { useOperationalData } from "@/hooks/useOperationalData";
import type { SubModuleOps, WorkflowStep } from "@/lib/operational";
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Bot,
  User,
  Database,
  Zap,
  Clock,
  GitBranch,
  AlertCircle,
  RefreshCw,
  X,
  Users2,
  Layers,
  Play,
  Cpu,
  RotateCcw,
  Copy,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

export default function ModulePage() {
  const params = useParams<{ id: string }>();
  const moduleId = parseInt(params.id || "1", 10);
  const mod = modules.find((m) => m.id === moduleId);
  const { recentRuns, runAgent, getStreamingOutput } = useAgent();
  const { getSubModuleOps } = useOperationalData();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(mod?.sections.map((s) => s.key) || [])
  );
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);
  // Track which sub-module detail panel is open: "sectionKey::subModuleName"
  const [openSubModule, setOpenSubModule] = useState<string | null>(null);

  if (!mod) {
    return (
      <NeuralShell>
        <div className="p-8 text-center text-muted-foreground">Module not found.</div>
      </NeuralShell>
    );
  }

  const linkedClusters = mod.clusterIds
    ? mod.clusterIds.map((cid) => clusters.find((c) => c.id === cid)).filter(Boolean)
    : [clusters.find((c) => c.id === mod.clusterId)].filter(Boolean);
  const stats = getModuleStats(mod.id);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSubModule = useCallback(
    (sectionKey: string, smName: string) => {
      const key = `${sectionKey}::${smName}`;
      setOpenSubModule((prev) => (prev === key ? null : key));
    },
    []
  );

  return (
    <NeuralShell>
      <div className="p-6 lg:p-8 max-w-[1200px]">
        {/* Breadcrumb */}
        <Link href="/">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-4">
            <ArrowLeft className="w-3 h-3" />
            Control Center
          </div>
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#0091FF] bg-[#0091FF]/8 px-2 py-0.5 rounded">
              Module {mod.id}
            </span>
            {linkedClusters.map((cluster) => (
              <Link key={cluster!.id} href={`/cluster/${cluster!.id}`}>
                <span className="text-xs text-muted-foreground hover:text-[#0091FF] cursor-pointer">
                  → Cluster {cluster!.id}: {cluster!.shortName}
                </span>
              </Link>
            ))}
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{mod.name}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            {mod.description}
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-6">
          <StatPill label="Sections" value={stats.sections} />
          <StatPill label="Sub-modules" value={stats.subModules} />
          <StatPill label="Prompts" value={stats.prompts} />
          <StatPill label="Agent" value={stats.agents} color="text-blue-600" />
          <StatPill label="Agent + Human" value={stats.agentHuman} color="text-amber-600" />
          <StatPill label="Human-led" value={stats.humanLed} color="text-slate-500" />
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {mod.sections.map((section) => {
            const isExpanded = expandedSections.has(section.key);
            const sectionPromptIds = section.subModules.flatMap((sm) => sm.prompts);
            const sectionPrompts = allPrompts.filter((p) => sectionPromptIds.includes(p.id));

            return (
              <motion.div
                key={section.key}
                layout
                className="border border-border rounded-lg bg-white overflow-hidden"
              >
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="text-left">
                      <div className="text-sm font-medium text-foreground">{section.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{section.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs font-mono text-muted-foreground">
                      {section.subModules.length} sub-modules
                    </span>
                    <span className="text-xs font-mono text-[#0091FF]">
                      {sectionPrompts.length} prompts
                    </span>
                  </div>
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="border-t border-border">
                        {/* Sub-modules — each row is clickable */}
                        <div className="divide-y divide-border">
                          {section.subModules.map((sm, idx) => {
                            const smKey = `${section.key}::${sm.name}`;
                            const isOpen = openSubModule === smKey;
                            const ops = getSubModuleOps(section.key, sm.name);
                            const smPrompts = allPrompts.filter((p) => sm.prompts.includes(p.id));

                            return (
                              <div key={idx}>
                                {/* Sub-module row — clickable */}
                                <button
                                  onClick={() => toggleSubModule(section.key, sm.name)}
                                  className={`w-full text-left px-3 sm:px-5 py-3 sm:py-3.5 flex items-start sm:items-center gap-3 sm:gap-4 transition-colors group ${
                                    isOpen
                                      ? "bg-[#0091FF]/[0.03]"
                                      : "hover:bg-muted/30"
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-medium text-sm ${isOpen ? "text-[#0091FF]" : "text-foreground"}`}>
                                        {sm.name}
                                      </span>
                                      <span
                                        className={`text-[11px] px-2 py-0.5 rounded border ${getOwnerBg(sm.owner)} font-medium`}
                                      >
                                        {getOwnerLabel(sm.owner)}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                      {sm.description}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {sm.prompts.length > 0 && (
                                      <span className="text-xs font-mono text-[#0091FF]">
                                        {sm.prompts.length} prompts
                                      </span>
                                    )}
                                    {ops && (
                                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                        click to explore →
                                      </span>
                                    )}
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                                        isOpen ? "rotate-180" : ""
                                      }`}
                                    />
                                  </div>
                                </button>

                                {/* Operational detail panel */}
                                <AnimatePresence>
                                  {isOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.25 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="bg-[#FAFBFC] border-t border-border">
                                        {ops ? (
                                          <OpsDetailPanel
                                            ops={ops}
                                            sm={sm}
                                            prompts={smPrompts}
                                            recentRuns={recentRuns}
                                            runAgent={runAgent}
                                            getStreamingOutput={getStreamingOutput}
                                            selectedPrompt={selectedPrompt}
                                            setSelectedPrompt={setSelectedPrompt}
                                            moduleId={moduleId}
                                          />
                                        ) : (
                                          <BasicDetailPanel
                                            sm={sm}
                                            prompts={smPrompts}
                                            recentRuns={recentRuns}
                                            runAgent={runAgent}
                                            getStreamingOutput={getStreamingOutput}
                                            selectedPrompt={selectedPrompt}
                                            setSelectedPrompt={setSelectedPrompt}
                                            moduleId={moduleId}
                                          />
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </NeuralShell>
  );
}

// ============================================================================
// Clickable Prompt Card — fires real LLM execution
// ============================================================================

function PromptCard({
  prompt,
  recentRuns,
  runAgent,
  getStreamingOutput,
  isExpanded,
  onToggle,
  moduleId,
  subModuleName,
}: {
  prompt: Prompt;
  recentRuns: any[];
  runAgent: any;
  getStreamingOutput: (id: string) => string | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  moduleId: number;
  subModuleName: string;
}) {
  const run = recentRuns.find((r: any) => r.promptId === prompt.id);
  const isRunning = run?.status === "running";
  const streamingOutput = run?.id ? getStreamingOutput(run.id) : undefined;
  const displayOutput = run?.output || streamingOutput;

  const handleExecute = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Find the section/owner info
    let owner = "agent";
    for (const mod of modules) {
      if (mod.id !== prompt.moduleId) continue;
      for (const section of mod.sections) {
        for (const sub of section.subModules) {
          if (sub.prompts.includes(prompt.id)) {
            owner = sub.owner;
          }
        }
      }
    }
    runAgent(prompt.id, prompt.text, moduleId, subModuleName, prompt.agentType, owner);
  };

  const copyOutput = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy"));
  };

  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden transition-all hover:border-[#0091FF]/20 hover:shadow-sm">
      {/* Prompt header — clickable to expand */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer group"
        onClick={onToggle}
      >
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 transition-all ${
          isRunning ? "bg-amber-500 shadow-lg shadow-amber-500/40 animate-pulse" :
          run?.status === "completed" ? "bg-emerald-500 shadow-sm shadow-emerald-500/30" :
          run?.status === "failed" ? "bg-rose-500" :
          getStatusColor(prompt.status)
        }`} />

        <div className="flex-1 min-w-0">
          <div className="text-xs text-foreground leading-relaxed">{prompt.text}</div>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border ${getAgentTypeBg(prompt.agentType)}`}
            >
              {getAgentTypeLabel(prompt.agentType)}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              #{prompt.id}
            </span>
            {run?.durationMs && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />{(run.durationMs / 1000).toFixed(1)}s
              </span>
            )}
            {run?.status === "completed" && (
              <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />Complete
              </span>
            )}
          </div>
        </div>

        {/* Execute button */}
        <motion.button
          onClick={handleExecute}
          disabled={isRunning}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
            isRunning ? "bg-amber-500/10 text-amber-600 cursor-wait" :
            run?.status === "completed" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15" :
            "bg-[#0091FF]/8 text-[#0091FF] hover:bg-[#0091FF]/12"
          }`}
        >
          {isRunning ? (
            <><Cpu className="w-3 h-3 animate-spin" />Thinking...</>
          ) : run?.status === "completed" ? (
            <><RotateCcw className="w-3 h-3" />Re-run</>
          ) : (
            <><Play className="w-3 h-3" />Run</>
          )}
        </motion.button>
      </div>

      {/* Expanded output panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/50">
              {displayOutput ? (
                <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-lg p-4 border border-black/[0.05]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold text-[#0091FF]/70 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {isRunning ? "Streaming..." : "AI Output"}
                      {isRunning && <span className="inline-block w-1 h-3.5 bg-[#0091FF] animate-pulse ml-1 rounded-sm" />}
                    </div>
                    {!isRunning && displayOutput && (
                      <button
                        onClick={() => copyOutput(displayOutput)}
                        className="p-1 rounded hover:bg-black/[0.04] text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy output"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-[12px] text-foreground/70 leading-relaxed prose prose-xs max-w-none prose-headings:text-foreground/80 prose-headings:font-semibold">
                    <Streamdown>{displayOutput}</Streamdown>
                  </div>
                </div>
              ) : isRunning ? (
                <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-200/30">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-5 h-5 border-2 border-amber-500/20 rounded-full" />
                      <div className="absolute inset-0 w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="text-[12px] font-medium text-amber-700">AI is thinking...</div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2.5 rounded-full bg-amber-200/40 animate-pulse w-full" />
                    <div className="h-2.5 rounded-full bg-amber-200/40 animate-pulse w-4/5" style={{ animationDelay: "0.1s" }} />
                    <div className="h-2.5 rounded-full bg-amber-200/40 animate-pulse w-3/5" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <button
                    onClick={handleExecute}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0091FF]/8 text-[#0091FF] text-[12px] font-semibold hover:bg-[#0091FF]/12 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Run with AI reasoning
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Rich Operational Detail Panel
// ============================================================================

function OpsDetailPanel({
  ops,
  sm,
  prompts,
  recentRuns,
  runAgent,
  getStreamingOutput,
  selectedPrompt,
  setSelectedPrompt,
  moduleId,
}: {
  ops: SubModuleOps;
  sm: SubModule;
  prompts: Prompt[];
  recentRuns: any[];
  runAgent: any;
  getStreamingOutput: (id: string) => string | undefined;
  selectedPrompt: number | null;
  setSelectedPrompt: (id: number | null) => void;
  moduleId: number;
}) {
  const [showPrompts, setShowPrompts] = useState(true); // Default open

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Critical Context — the "why this matters" */}
      <div className="bg-white border border-border rounded-lg p-4">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
              Why This Matters
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{ops.criticalContext}</p>
          </div>
        </div>
      </div>

      {/* Workflow — step by step */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-3.5 h-3.5 text-[#0091FF]" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Workflow
          </span>
        </div>
        <div className="space-y-0">
          {ops.workflow.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              {/* Vertical connector line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    step.actor === "agent"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {step.actor === "agent" ? (
                    <Bot className="w-3 h-3" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                </div>
                {i < ops.workflow.length - 1 && (
                  <div className="w-px h-6 bg-border" />
                )}
              </div>
              <div className="pb-3 pt-0.5">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    step.actor === "agent" ? "text-blue-600" : "text-amber-600"
                  }`}
                >
                  {step.actor}
                </span>
                <p className="text-sm text-foreground/80 leading-snug mt-0.5">{step.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Inputs / Outputs / Data Sources */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard
          icon={<ArrowRight className="w-3.5 h-3.5 text-green-600" />}
          title="Inputs"
          items={ops.inputs}
          color="green"
        />
        <InfoCard
          icon={<Layers className="w-3.5 h-3.5 text-purple-600" />}
          title="Outputs"
          items={ops.outputs}
          color="purple"
        />
        <InfoCard
          icon={<Database className="w-3.5 h-3.5 text-slate-600" />}
          title="Data Sources"
          items={ops.dataSources}
          color="slate"
        />
      </div>

      {/* Frequency + Handoff + XFN Dependencies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-lg p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Frequency
            </span>
          </div>
          <p className="text-sm text-foreground/80">{ops.frequency}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Handoff Point
            </span>
          </div>
          <p className="text-sm text-foreground/80">{ops.handoffPoint}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Users2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              XFN Dependencies
            </span>
          </div>
          {ops.xfnDependencies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {ops.xfnDependencies.map((dep, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {dep}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Self-contained</p>
          )}
        </div>
      </div>

      {/* Learning Loop */}
      {ops.learningLoop && (
        <div className="bg-white border border-[#0091FF]/20 rounded-lg p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-[#0091FF]" />
            <span className="text-[10px] font-semibold text-[#0091FF] uppercase tracking-wider">
              Learning Loop
            </span>
          </div>
          <p className="text-sm text-foreground/80">{ops.learningLoop}</p>
        </div>
      )}

      {/* Linked Prompts — clickable with real execution */}
      {prompts.length > 0 && (
        <div>
          <button
            onClick={() => setShowPrompts(!showPrompts)}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            AI Assistants ({prompts.length}) — Click to Run
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showPrompts ? "rotate-180" : ""}`}
            />
          </button>
          <AnimatePresence>
            {showPrompts && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 space-y-2"
              >
                {prompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    recentRuns={recentRuns}
                    runAgent={runAgent}
                    getStreamingOutput={getStreamingOutput}
                    isExpanded={selectedPrompt === prompt.id}
                    onToggle={() => setSelectedPrompt(selectedPrompt === prompt.id ? null : prompt.id)}
                    moduleId={moduleId}
                    subModuleName={sm.name}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Basic Detail Panel (fallback for sub-modules without operational metadata)
// ============================================================================

function BasicDetailPanel({
  sm,
  prompts,
  recentRuns,
  runAgent,
  getStreamingOutput,
  selectedPrompt,
  setSelectedPrompt,
  moduleId,
}: {
  sm: SubModule;
  prompts: Prompt[];
  recentRuns: any[];
  runAgent: any;
  getStreamingOutput: (id: string) => string | undefined;
  selectedPrompt: number | null;
  setSelectedPrompt: (id: number | null) => void;
  moduleId: number;
}) {
  return (
    <div className="px-6 py-5 space-y-4">
      <div className="bg-white border border-border rounded-lg p-4">
        <p className="text-sm text-foreground/80 leading-relaxed">{sm.description}</p>
      </div>
      {prompts.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            AI Assistants ({prompts.length}) — Click to Run
          </div>
          <div className="space-y-2">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                recentRuns={recentRuns}
                runAgent={runAgent}
                getStreamingOutput={getStreamingOutput}
                isExpanded={selectedPrompt === prompt.id}
                onToggle={() => setSelectedPrompt(selectedPrompt === prompt.id ? null : prompt.id)}
                moduleId={moduleId}
                subModuleName={sm.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Shared components
// ============================================================================

function InfoCard({
  icon,
  title,
  items,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-3.5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
            <span className="text-muted-foreground mt-1">·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="border border-border rounded-md px-3 py-2 bg-white">
      <div className={`text-lg font-semibold ${color || "text-foreground"}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
