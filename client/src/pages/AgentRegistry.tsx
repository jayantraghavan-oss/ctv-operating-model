/**
 * AgentRegistry — Full searchable/filterable registry of all 200 agent prompts
 * EVERY PROMPT IS CLICKABLE → fires real LLM execution with streaming output.
 */
import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";
import {
  prompts,
  modules,
  getAgentTypeBg,
  getAgentTypeLabel,
  getStatusColor,
} from "@/lib/data";
import type { AgentType, PromptStatus } from "@/lib/data";
import {
  ArrowLeft,
  Search,
  Filter,
  Bot,
  Zap,
  Eye,
  Shield,
  X,
  Play,
  Cpu,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Copy,
  Clock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";

const agentTypes: AgentType[] = ["persistent", "triggered", "orchestrator"];

function getPromptMeta(prompt: typeof prompts[0]) {
  for (const mod of modules) {
    if (mod.id !== prompt.moduleId) continue;
    for (const section of mod.sections) {
      for (const sub of section.subModules) {
        if (sub.prompts.includes(prompt.id)) {
          return { subModule: sub.name, owner: sub.owner, section: section.name };
        }
      }
    }
  }
  return { subModule: "Orchestration", owner: "agent" as const, section: "Cross-Module" };
}

export default function AgentRegistry() {
  const { recentRuns, runAgent, getStreamingOutput } = useAgent();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AgentType | "all">("all");
  const [moduleFilter, setModuleFilter] = useState<number | "all">("all");
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return prompts.filter((p) => {
      if (typeFilter !== "all" && p.agentType !== typeFilter) return false;
      if (moduleFilter !== "all" && p.moduleId !== moduleFilter) return false;
      if (search && !p.text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, typeFilter, moduleFilter]);

  const hasFilters = search || typeFilter !== "all" || moduleFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setModuleFilter("all");
  };

  const executeAgent = useCallback((prompt: typeof prompts[0]) => {
    const meta = getPromptMeta(prompt);
    runAgent(prompt.id, prompt.text, prompt.moduleId, meta.subModule, prompt.agentType, meta.owner);
    setExpandedPrompt(prompt.id);
  }, [runAgent]);

  const copyOutput = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy — try selecting and copying manually"));
  };

  return (
    <NeuralShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px]">
        {/* Breadcrumb */}
        <Link href="/">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-4">
            <ArrowLeft className="w-3 h-3" />
            Control Center
          </div>
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">Assistant Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All {prompts.length} AI assistants. Click any one to run it with AI reasoning.
          </p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assistants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0091FF]/20 focus:border-[#0091FF]/50"
            />
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AgentType | "all")}
            className="text-sm border border-border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0091FF]/20"
          >
            <option value="all">All types</option>
            <option value="persistent">Always-On</option>
            <option value="triggered">On-Demand</option>
            <option value="orchestrator">Coordinator</option>
          </select>

          {/* Module filter */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="text-sm border border-border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0091FF]/20"
          >
            <option value="all">All modules</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                M{m.id}: {m.shortName}
              </option>
            ))}
            <option value={0}>Coordination Layer</option>
          </select>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}

          {/* Count */}
          <div className="text-xs text-muted-foreground ml-auto">
            {filtered.length} of {prompts.length} assistants
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-5">
          {agentTypes.map((type) => {
            const count = filtered.filter((p) => p.agentType === type).length;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  typeFilter === type
                    ? "bg-[#0091FF]/10 border-[#0091FF]/30 text-[#0091FF]"
                    : "border-border text-muted-foreground hover:border-[#0091FF]/20"
                }`}
              >
                {getAgentTypeLabel(type)}: {count}
              </button>
            );
          })}
        </div>

        {/* Prompts list — now with execute buttons and expandable output */}
        <div className="border border-border rounded-lg bg-white overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((prompt) => {
              const mod = modules.find((m) => m.id === prompt.moduleId);
              const run = recentRuns.find((r) => r.promptId === prompt.id);
              const isRunning = run?.status === "running";
              const isExpanded = expandedPrompt === prompt.id;
              const streamingOutput = run?.id ? getStreamingOutput(run.id) : undefined;
              const displayOutput = run?.output || streamingOutput;
              const meta = getPromptMeta(prompt);

              return (
                <div key={prompt.id}>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 hover:bg-muted/20 transition-colors">
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      isRunning ? "bg-amber-500 animate-pulse" :
                      run?.status === "completed" ? "bg-emerald-500" :
                      run?.status === "failed" ? "bg-rose-500" :
                      "bg-foreground/12"
                    }`} />

                    {/* ID */}
                    <span className="text-xs font-mono text-muted-foreground w-6 sm:w-8 shrink-0 hidden sm:inline">{prompt.id}</span>

                    {/* Prompt text — clickable to expand */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedPrompt(isExpanded ? null : prompt.id)}
                    >
                      <div className="text-xs text-foreground leading-relaxed line-clamp-1">{prompt.text}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getAgentTypeBg(prompt.agentType)} font-medium`}>
                          {getAgentTypeLabel(prompt.agentType)}
                        </span>
                        {mod && (
                          <Link href={`/module/${mod.id}`}>
                            <span className="text-[10px] text-[#0091FF] hover:underline cursor-pointer font-mono">
                              M{mod.id}
                            </span>
                          </Link>
                        )}
                        <span className="text-[10px] text-muted-foreground truncate max-w-[80px] sm:max-w-[120px] hidden sm:inline">{meta.subModule}</span>
                        {run?.durationMs && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />{(run.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Execute button */}
                    <motion.button
                      onClick={() => executeAgent(prompt)}
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

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedPrompt(isExpanded ? null : prompt.id)}
                      className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expanded output */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 sm:px-4 pb-4 pt-1 ml-4 sm:ml-10 border-l-2 border-[#0091FF]/15">
                          {/* Full prompt */}
                          <div className="text-[13px] text-foreground/65 leading-relaxed mb-3">{prompt.text}</div>

                          {displayOutput ? (
                            <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-lg p-4 border border-black/[0.05]">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] font-bold text-[#0091FF]/70 uppercase tracking-wider flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  {isRunning ? "Streaming..." : "AI Output"}
                                  {isRunning && <span className="inline-block w-1 h-3.5 bg-[#0091FF] animate-pulse ml-1 rounded-sm" />}
                                </div>
                                {!isRunning && (
                                  <button onClick={() => copyOutput(displayOutput)} className="p-1 rounded hover:bg-black/[0.04] text-muted-foreground hover:text-foreground transition-colors" title="Copy">
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
                                <div className="h-2.5 rounded-full bg-amber-200/40 animate-pulse w-4/5" />
                                <div className="h-2.5 rounded-full bg-amber-200/40 animate-pulse w-3/5" />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <button
                                onClick={() => executeAgent(prompt)}
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
            })}
          </div>
          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No prompts match your filters.
            </div>
          )}
        </div>
      </div>
    </NeuralShell>
  );
}
