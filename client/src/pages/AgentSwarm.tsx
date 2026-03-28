/**
 * AgentSwarm — Every prompt is a clickable cognitive unit.
 * Click Execute → real LLM fires → output streams back with markdown rendering.
 * Apple-level polish: glassy panels, spring animations, mobile-first.
 */
import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { modules, prompts, type Prompt } from "@/lib/data";
import { useState, useMemo, useCallback } from "react";
import {
  Play, Zap, Search, ChevronDown, ChevronUp, RotateCcw,
  Bot, UserCheck, Users, Cpu, Radio, Sparkles, CheckCircle2,
  XCircle, Clock, Filter, LayoutGrid, List,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getPromptMeta(prompt: Prompt) {
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

const moduleColors: Record<number, string> = {
  1: "from-blue-500/10 to-blue-600/5 border-blue-500/15",
  2: "from-violet-500/10 to-violet-600/5 border-violet-500/15",
  3: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/15",
  4: "from-amber-500/10 to-amber-600/5 border-amber-500/15",
};

const moduleAccent: Record<number, string> = {
  1: "text-blue-600",
  2: "text-violet-600",
  3: "text-emerald-600",
  4: "text-amber-600",
};

type FilterType = "all" | "persistent" | "triggered" | "orchestrator";
type OwnerFilter = "all" | "agent" | "agent-human" | "human-led";
type ViewMode = "list" | "grid";

export default function AgentSwarm() {
  const { recentRuns, runAgent, isExecuting, executionQueue } = useAgent();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<number | "all">("all");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null);
  const [runningIds, setRunningIds] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => prompts.filter((p) => {
    if (moduleFilter !== "all" && p.moduleId !== moduleFilter) return false;
    if (typeFilter !== "all" && p.agentType !== typeFilter) return false;
    const meta = getPromptMeta(p);
    if (ownerFilter !== "all" && meta.owner !== ownerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.text.toLowerCase().includes(q) && !meta.subModule.toLowerCase().includes(q) && !meta.section.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [search, moduleFilter, typeFilter, ownerFilter]);

  const stats = useMemo(() => ({
    total: prompts.length,
    shown: filtered.length,
    running: recentRuns.filter((r) => r.status === "running").length,
    completed: recentRuns.filter((r) => r.status === "completed").length,
    failed: recentRuns.filter((r) => r.status === "failed").length,
  }), [filtered, recentRuns]);

  const executeAgent = useCallback((prompt: typeof prompts[0]) => {
    setRunningIds((prev) => new Set(prev).add(prompt.id));
    const meta = getPromptMeta(prompt);
    runAgent(prompt.id, prompt.text, prompt.moduleId, meta.subModule, prompt.agentType, meta.owner);
    // Keep running indicator until the actual run completes (tracked by AgentContext)
    const checkDone = setInterval(() => {
      setRunningIds((prev) => {
        // We'll clear it after a reasonable time — the context tracks the real state
        return prev;
      });
    }, 1000);
    setTimeout(() => {
      clearInterval(checkDone);
      setRunningIds((prev) => { const next = new Set(prev); next.delete(prompt.id); return next; });
    }, 30000); // Max 30s timeout
  }, [runAgent]);

  const executeAll = useCallback(() => {
    const batch = filtered.slice(0, 10);
    batch.forEach((p, i) => {
      setTimeout(() => executeAgent(p), i * 800);
    });
  }, [filtered, executeAgent]);

  const executeBatch = useCallback((moduleId: number) => {
    const batch = filtered.filter((p) => p.moduleId === moduleId).slice(0, 5);
    batch.forEach((p, i) => {
      setTimeout(() => executeAgent(p), i * 800);
    });
  }, [filtered, executeAgent]);

  const getRunForPrompt = (promptId: number) => recentRuns.find((r) => r.promptId === promptId);

  return (
    <NeuralShell>
      <div className="space-y-6 max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight">Agent Swarm</h1>
            <p className="text-[14px] text-foreground/40 mt-1">
              Click any agent to execute with real AI reasoning
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={executeAll}
              disabled={isExecuting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-semibold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {isExecuting ? `Running ${executionQueue}...` : "Execute Top 10"}
            </motion.button>
          </div>
        </div>

        {/* Live Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Bot, color: "text-foreground/60" },
            { label: "Shown", value: stats.shown, icon: Filter, color: "text-blue-600" },
            { label: "Running", value: stats.running, icon: Cpu, color: "text-amber-500" },
            { label: "Complete", value: stats.completed, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Failed", value: stats.failed, icon: XCircle, color: "text-rose-500" },
          ].map((s) => (
            <motion.div
              key={s.label}
              className="glass rounded-2xl px-4 py-3 flex items-center gap-3"
              whileHover={{ scale: 1.01 }}
            >
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <div>
                <div className="text-[18px] font-bold tracking-tight">{s.value}</div>
                <div className="text-[11px] text-foreground/35 font-medium">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25" />
              <input
                type="text"
                placeholder="Search agents, sub-modules, sections..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/60 backdrop-blur-sm border border-black/[0.06] text-[14px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-[13px] font-medium transition-all ${showFilters ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white/60 border-black/[0.06] text-foreground/50 hover:text-foreground/70"}`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
            <div className="flex rounded-2xl border border-black/[0.06] overflow-hidden">
              <button onClick={() => setViewMode("list")} className={`p-3 transition-colors ${viewMode === "list" ? "bg-blue-50 text-blue-600" : "bg-white/60 text-foreground/30"}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("grid")} className={`p-3 transition-colors ${viewMode === "grid" ? "bg-blue-50 text-blue-600" : "bg-white/60 text-foreground/30"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-3 pt-1">
                  <select value={moduleFilter === "all" ? "all" : String(moduleFilter)} onChange={(e) => setModuleFilter(e.target.value === "all" ? "all" : Number(e.target.value))} className="px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-black/[0.06] text-[13px] font-medium text-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="all">All Modules</option>
                    {modules.map((m) => <option key={m.id} value={m.id}>M{m.id}: {m.shortName}</option>)}
                  </select>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as FilterType)} className="px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-black/[0.06] text-[13px] font-medium text-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="all">All Types</option>
                    <option value="persistent">Persistent</option>
                    <option value="triggered">Triggered</option>
                    <option value="orchestrator">Orchestrator</option>
                  </select>
                  <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value as OwnerFilter)} className="px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-black/[0.06] text-[13px] font-medium text-foreground/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="all">All Owners</option>
                    <option value="agent">Agent</option>
                    <option value="agent-human">Agent+Human</option>
                    <option value="human-led">Human-Led</option>
                  </select>
                  {/* Module quick-execute buttons */}
                  <div className="flex gap-2 ml-auto">
                    {modules.map((m) => (
                      <motion.button
                        key={m.id}
                        onClick={() => executeBatch(m.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-3 py-2 rounded-xl text-[11px] font-semibold border transition-all ${moduleAccent[m.id]} bg-gradient-to-br ${moduleColors[m.id]}`}
                      >
                        <Sparkles className="w-3 h-3 inline mr-1" />Run M{m.id}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Agent List */}
        {viewMode === "list" ? (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="divide-y divide-black/[0.04]">
              {filtered.slice(0, 60).map((prompt) => {
                const run = getRunForPrompt(prompt.id);
                const isRunning = runningIds.has(prompt.id) || run?.status === "running";
                const isExpanded = expandedPrompt === prompt.id;
                const meta = getPromptMeta(prompt);
                return (
                  <motion.div
                    key={prompt.id}
                    layout
                    className="hover:bg-black/[0.015] transition-colors"
                  >
                    <div className="px-4 sm:px-5 py-3.5 flex items-center gap-3 sm:gap-4">
                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-500 ${
                        isRunning ? "bg-amber-500 shadow-lg shadow-amber-500/40 animate-pulse" :
                        run?.status === "completed" ? "bg-emerald-500 shadow-sm shadow-emerald-500/30" :
                        run?.status === "failed" ? "bg-rose-500 shadow-sm shadow-rose-500/30" :
                        "bg-foreground/12"
                      }`} />

                      {/* Content */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedPrompt(isExpanded ? null : prompt.id)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-foreground/20 shrink-0">#{prompt.id}</span>
                          <span className="text-[14px] text-foreground/80 leading-snug line-clamp-1">{prompt.text}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[11px] font-bold ${moduleAccent[prompt.moduleId] || "text-foreground/30"}`}>M{prompt.moduleId}</span>
                          <span className="text-foreground/10">·</span>
                          <span className="text-[11px] text-foreground/35 truncate max-w-[200px]">{meta.subModule}</span>
                          <span className="text-foreground/10 hidden sm:inline">·</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg hidden sm:inline ${
                            prompt.agentType === "persistent" ? "bg-emerald-500/8 text-emerald-600" :
                            prompt.agentType === "triggered" ? "bg-violet-500/8 text-violet-600" :
                            "bg-rose-500/8 text-rose-600"
                          }`}>{prompt.agentType}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg hidden sm:inline ${
                            meta.owner === "agent" ? "bg-blue-500/8 text-blue-600" :
                            meta.owner === "agent-human" ? "bg-amber-500/8 text-amber-600" :
                            "bg-foreground/5 text-foreground/35"
                          }`}>{meta.owner}</span>
                          {run?.durationMs && (
                            <>
                              <span className="text-foreground/10">·</span>
                              <span className="text-[10px] text-foreground/25 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{(run.durationMs / 1000).toFixed(1)}s
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Execute button */}
                      <motion.button
                        onClick={() => executeAgent(prompt)}
                        disabled={isRunning}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all shrink-0 ${
                          isRunning ? "bg-amber-500/10 text-amber-600 cursor-wait" :
                          run?.status === "completed" ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15" :
                          "bg-foreground/[0.04] text-foreground/40 hover:text-blue-600 hover:bg-blue-500/8"
                        }`}
                      >
                        {isRunning ? (
                          <><Cpu className="w-3 h-3 animate-spin" />Thinking...</>
                        ) : run?.status === "completed" ? (
                          <><RotateCcw className="w-3 h-3" />Re-run</>
                        ) : (
                          <><Play className="w-3 h-3" />Execute</>
                        )}
                      </motion.button>

                      {/* Expand toggle */}
                      <button onClick={() => setExpandedPrompt(isExpanded ? null : prompt.id)} className="text-foreground/15 hover:text-foreground/40 transition-colors p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
                          <div className="px-4 sm:px-5 pb-5 pt-1 ml-6 sm:ml-7 border-l-2 border-blue-500/15">
                            {/* Full prompt */}
                            <div className="text-[14px] text-foreground/65 leading-relaxed mb-4">{prompt.text}</div>

                            {/* Agent metadata */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              <span className={`text-[11px] font-semibold px-3 py-1 rounded-xl bg-gradient-to-br ${moduleColors[prompt.moduleId]}`}>
                                Module {prompt.moduleId}: {modules.find((m) => m.id === prompt.moduleId)?.shortName}
                              </span>
                              <span className="text-[11px] font-medium px-3 py-1 rounded-xl bg-foreground/[0.03] text-foreground/40">
                                {meta.section}
                              </span>
                              <span className="text-[11px] font-medium px-3 py-1 rounded-xl bg-foreground/[0.03] text-foreground/40">
                                {meta.subModule}
                              </span>
                            </div>

                            {/* Output */}
                            {run?.output ? (
                              <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-5 border border-black/[0.05] shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="text-[11px] font-bold text-blue-600/70 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3" />Agent Output
                                  </div>
                                  {run.durationMs && (
                                    <div className="text-[11px] text-foreground/25 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />{(run.durationMs / 1000).toFixed(1)}s
                                    </div>
                                  )}
                                </div>
                                <div className="text-[13px] text-foreground/70 leading-relaxed whitespace-pre-wrap font-[system-ui]">
                                  {run.output}
                                </div>
                              </div>
                            ) : isRunning ? (
                              <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200/30">
                                <div className="flex items-center gap-3">
                                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                  <div>
                                    <div className="text-[13px] font-semibold text-amber-700">Agent is thinking...</div>
                                    <div className="text-[12px] text-amber-600/60 mt-0.5">Pulling context, reasoning over data, generating output</div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[13px] text-foreground/25 italic py-4 text-center">
                                Click Execute to fire this agent with real AI reasoning
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
            {filtered.length > 60 && (
              <div className="px-5 py-4 text-center text-[13px] text-foreground/25 border-t border-black/[0.04]">
                Showing 60 of {filtered.length} agents. Use filters to narrow.
              </div>
            )}
            {filtered.length === 0 && (
              <div className="px-5 py-16 text-center">
                <Search className="w-8 h-8 text-foreground/15 mx-auto mb-3" />
                <div className="text-[15px] font-medium text-foreground/30">No agents match your filters</div>
                <div className="text-[13px] text-foreground/20 mt-1">Try adjusting your search or filter criteria</div>
              </div>
            )}
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.slice(0, 30).map((prompt) => {
              const run = getRunForPrompt(prompt.id);
              const isRunning = runningIds.has(prompt.id) || run?.status === "running";
              const meta = getPromptMeta(prompt);
              return (
                <motion.div
                  key={prompt.id}
                  whileHover={{ scale: 1.01, y: -2 }}
                  className={`glass rounded-2xl p-5 border transition-all cursor-pointer ${
                    isRunning ? "border-amber-300/30 shadow-lg shadow-amber-500/10" :
                    run?.status === "completed" ? "border-emerald-300/20" :
                    "border-transparent hover:border-blue-200/30"
                  }`}
                  onClick={() => setExpandedPrompt(expandedPrompt === prompt.id ? null : prompt.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-foreground/20">#{prompt.id}</span>
                      <span className={`text-[10px] font-bold ${moduleAccent[prompt.moduleId]}`}>M{prompt.moduleId}</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      isRunning ? "bg-amber-500 animate-pulse" :
                      run?.status === "completed" ? "bg-emerald-500" :
                      "bg-foreground/12"
                    }`} />
                  </div>
                  <div className="text-[13px] text-foreground/70 leading-snug line-clamp-3 mb-3">{prompt.text}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-foreground/30 truncate max-w-[150px]">{meta.subModule}</span>
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); executeAgent(prompt); }}
                      disabled={isRunning}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`p-2 rounded-xl transition-all ${
                        isRunning ? "bg-amber-500/10 text-amber-600" :
                        run?.status === "completed" ? "bg-emerald-500/10 text-emerald-600" :
                        "bg-foreground/[0.04] text-foreground/30 hover:text-blue-600 hover:bg-blue-500/10"
                      }`}
                    >
                      {isRunning ? <Cpu className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </motion.button>
                  </div>

                  {/* Grid expanded output */}
                  <AnimatePresence>
                    {expandedPrompt === prompt.id && run?.output && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-black/[0.05] text-[12px] text-foreground/55 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                          {run.output}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </NeuralShell>
  );
}
