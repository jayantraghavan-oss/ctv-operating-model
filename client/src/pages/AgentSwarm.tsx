/**
 * AgentSwarm — Deploy and monitor all 200 agents.
 * Apple-style: glassy panels, soft interactions, polished typography.
 */
import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { modules, prompts, type Prompt } from "@/lib/data";

function getPromptMeta(prompt: Prompt) {
  for (const mod of modules) {
    if (mod.id !== prompt.moduleId) continue;
    for (const section of mod.sections) {
      for (const sub of section.subModules) {
        if (sub.prompts.includes(prompt.id)) {
          return { subModule: sub.name, owner: sub.owner };
        }
      }
    }
  }
  return { subModule: "Unknown", owner: "agent" as const };
}

import { useState } from "react";
import { Play, Zap, Search, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FilterType = "all" | "persistent" | "triggered" | "orchestrator";
type OwnerFilter = "all" | "agent" | "agent-human" | "human-led";

export default function AgentSwarm() {
  const { recentRuns, runAgent } = useAgent();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<number | "all">("all");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null);
  const [runningIds, setRunningIds] = useState<Set<number>>(new Set());

  const filtered = prompts.filter((p) => {
    if (moduleFilter !== "all" && p.moduleId !== moduleFilter) return false;
    if (typeFilter !== "all" && p.agentType !== typeFilter) return false;
    const meta = getPromptMeta(p);
    if (ownerFilter !== "all" && meta.owner !== ownerFilter) return false;
    if (search && !p.text.toLowerCase().includes(search.toLowerCase()) && !meta.subModule.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const executeAgent = (prompt: typeof prompts[0]) => {
    setRunningIds((prev) => new Set(prev).add(prompt.id));
    const meta = getPromptMeta(prompt);
    runAgent(prompt.id, prompt.text, prompt.moduleId, meta.subModule);
    setTimeout(() => {
      setRunningIds((prev) => { const next = new Set(prev); next.delete(prompt.id); return next; });
    }, 4000);
  };

  const executeAll = () => {
    filtered.slice(0, 10).forEach((p, i) => {
      setTimeout(() => executeAgent(p), i * 500);
    });
  };

  const getRunForPrompt = (promptId: number) => recentRuns.find((r) => r.promptId === promptId);

  return (
    <NeuralShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">Agent Swarm</h1>
            <p className="text-[15px] text-foreground/45 mt-1">{prompts.length} agents · {filtered.length} shown · {recentRuns.filter((r) => r.status === "running").length} active</p>
          </div>
          <button onClick={executeAll} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white text-[13px] font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            <Zap className="w-4 h-4" />Execute Top 10
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/[0.03] text-[14px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
            />
          </div>
          <select value={moduleFilter === "all" ? "all" : String(moduleFilter)} onChange={(e) => setModuleFilter(e.target.value === "all" ? "all" : Number(e.target.value))} className="px-4 py-2.5 rounded-xl bg-black/[0.03] text-[13px] font-medium text-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">All Modules</option>
            {modules.map((m) => <option key={m.id} value={m.id}>M{m.id}: {m.shortName}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as FilterType)} className="px-4 py-2.5 rounded-xl bg-black/[0.03] text-[13px] font-medium text-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">All Types</option>
            <option value="persistent">Persistent</option>
            <option value="triggered">Triggered</option>
            <option value="orchestrator">Orchestrator</option>
          </select>
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value as OwnerFilter)} className="px-4 py-2.5 rounded-xl bg-black/[0.03] text-[13px] font-medium text-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="all">All Owners</option>
            <option value="agent">Agent</option>
            <option value="agent-human">Agent+Human</option>
            <option value="human-led">Human-Led</option>
          </select>
        </div>

        {/* Agent list */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="divide-y divide-black/[0.04]">
            {filtered.slice(0, 50).map((prompt) => {
              const run = getRunForPrompt(prompt.id);
              const isRunning = runningIds.has(prompt.id);
              const isExpanded = expandedPrompt === prompt.id;
              const meta = getPromptMeta(prompt);
              return (
                <div key={prompt.id} className="hover:bg-black/[0.015] transition-colors">
                  <div className="px-5 py-3.5 flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${isRunning ? "bg-amber-signal animate-pulse-neon" : run?.status === "completed" ? "bg-emerald-signal" : run?.status === "failed" ? "bg-rose-signal" : "bg-foreground/15"}`} />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedPrompt(isExpanded ? null : prompt.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono text-foreground/25">#{prompt.id}</span>
                        <span className="text-[14px] text-foreground/80 truncate">{prompt.text.slice(0, 80)}{prompt.text.length > 80 ? "..." : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-medium text-foreground/30">M{prompt.moduleId}</span>
                        <span className="text-foreground/15">·</span>
                        <span className="text-[11px] text-foreground/30 truncate">{meta.subModule}</span>
                        <span className="text-foreground/15">·</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${prompt.agentType === "persistent" ? "bg-emerald-signal/10 text-emerald-signal" : prompt.agentType === "triggered" ? "bg-violet-signal/10 text-violet-signal" : "bg-rose-signal/10 text-rose-signal"}`}>{prompt.agentType}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${meta.owner === "agent" ? "bg-primary/8 text-primary" : meta.owner === "agent-human" ? "bg-amber-signal/10 text-amber-signal" : "bg-black/[0.04] text-foreground/35"}`}>{meta.owner}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => executeAgent(prompt)}
                      disabled={isRunning}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all shrink-0 ${
                        isRunning ? "bg-amber-signal/10 text-amber-signal" :
                        run?.status === "completed" ? "bg-emerald-signal/10 text-emerald-signal hover:bg-emerald-signal/15" :
                        "bg-black/[0.04] text-foreground/40 hover:text-primary hover:bg-primary/8"
                      }`}
                    >
                      <Play className="w-3 h-3" />{isRunning ? "Running..." : run?.status === "completed" ? "Re-run" : "Execute"}
                    </button>
                    <button onClick={() => setExpandedPrompt(isExpanded ? null : prompt.id)} className="text-foreground/20 hover:text-foreground/50 transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="overflow-hidden">
                        <div className="px-5 pb-5 pt-1 ml-7 border-l-2 border-primary/15">
                          <div className="text-[14px] text-foreground/70 leading-relaxed mb-3">{prompt.text}</div>
                          {run?.output && (
                            <div className="bg-black/[0.02] rounded-xl p-4 text-[13px] text-foreground/60 border border-black/[0.04]">
                              <div className="text-[11px] font-semibold text-primary/60 mb-1.5 uppercase tracking-wide">Last Output</div>
                              {run.output}
                            </div>
                          )}
                          {!run?.output && <div className="text-[13px] text-foreground/30 italic">No output yet — execute to see results.</div>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          {filtered.length > 50 && (
            <div className="px-5 py-4 text-center text-[13px] text-foreground/30 border-t border-black/[0.04]">
              Showing 50 of {filtered.length} agents. Use filters to narrow.
            </div>
          )}
        </div>
      </div>
    </NeuralShell>
  );
}
