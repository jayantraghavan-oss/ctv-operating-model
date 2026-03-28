/**
 * AgentSwarm — Deploy and monitor all 200 agents.
 * Per-agent execution, streaming output, filter by module/cluster/type.
 */
import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { modules, prompts, type Prompt } from "@/lib/data";

// Helper to find the sub-module and owner for a prompt
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
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Agent Swarm</h1>
            <p className="text-sm text-muted-foreground mt-1">{prompts.length} agents · {filtered.length} shown · {recentRuns.filter((r) => r.status === "running").length} active</p>
          </div>
          <button onClick={executeAll} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon text-background text-sm font-medium hover:bg-neon/90 transition-all">
            <Zap className="w-4 h-4" />Execute Top 10
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search agents..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon" />
          </div>
          <select value={moduleFilter === "all" ? "all" : String(moduleFilter)} onChange={(e) => setModuleFilter(e.target.value === "all" ? "all" : Number(e.target.value))} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
            <option value="all">All Modules</option>
            {modules.map((m) => <option key={m.id} value={m.id}>M{m.id}: {m.shortName}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as FilterType)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
            <option value="all">All Types</option>
            <option value="persistent">Persistent</option>
            <option value="triggered">Triggered</option>
            <option value="orchestrator">Orchestrator</option>
          </select>
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value as OwnerFilter)} className="px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground">
            <option value="all">All Owners</option>
            <option value="agent">Agent</option>
            <option value="agent-human">Agent+Human</option>
            <option value="human-led">Human-Led</option>
          </select>
        </div>

        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.slice(0, 50).map((prompt) => {
              const run = getRunForPrompt(prompt.id);
              const isRunning = runningIds.has(prompt.id);
              const isExpanded = expandedPrompt === prompt.id;
              return (
                <div key={prompt.id} className="hover:bg-accent/20 transition-colors">
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isRunning ? "bg-amber-signal animate-pulse-neon" : run?.status === "completed" ? "bg-emerald-signal" : run?.status === "failed" ? "bg-rose-signal" : "bg-muted-foreground/30"}`} />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedPrompt(isExpanded ? null : prompt.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{prompt.id}</span>
                        <span className="text-sm text-foreground truncate">{prompt.text.slice(0, 80)}{prompt.text.length > 80 ? "..." : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground">M{prompt.moduleId}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground truncate">{getPromptMeta(prompt).subModule}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${prompt.agentType === "persistent" ? "bg-emerald-signal/15 text-emerald-signal" : prompt.agentType === "triggered" ? "bg-violet-signal/15 text-violet-signal" : "bg-rose-signal/15 text-rose-signal"}`}>{prompt.agentType}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getPromptMeta(prompt).owner === "agent" ? "bg-neon/15 text-neon" : getPromptMeta(prompt).owner === "agent-human" ? "bg-amber-signal/15 text-amber-signal" : "bg-muted text-muted-foreground"}`}>{getPromptMeta(prompt).owner}</span>
                      </div>
                    </div>
                    <button onClick={() => executeAgent(prompt)} disabled={isRunning} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${isRunning ? "bg-amber-signal/15 text-amber-signal" : run?.status === "completed" ? "bg-emerald-signal/15 text-emerald-signal hover:bg-emerald-signal/25" : "border border-border text-muted-foreground hover:text-neon hover:border-neon/30"}`}>
                      <Play className="w-3 h-3" />{isRunning ? "Running..." : run?.status === "completed" ? "Re-run" : "Execute"}
                    </button>
                    <button onClick={() => setExpandedPrompt(isExpanded ? null : prompt.id)} className="text-muted-foreground hover:text-foreground">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 pt-1 ml-5 border-l-2 border-neon/20">
                          <div className="text-sm text-foreground/80 mb-3">{prompt.text}</div>
                          {run?.output && (
                            <div className="bg-muted/50 rounded-lg p-3 text-xs text-foreground/70 border border-border">
                              <div className="text-[10px] font-mono text-neon mb-1">LAST OUTPUT</div>
                              {run.output}
                            </div>
                          )}
                          {!run?.output && <div className="text-xs text-muted-foreground italic">No output yet — execute to see results.</div>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          {filtered.length > 50 && <div className="px-4 py-3 text-center text-xs text-muted-foreground border-t border-border">Showing 50 of {filtered.length} agents. Use filters to narrow.</div>}
        </div>
      </div>
    </NeuralShell>
  );
}
