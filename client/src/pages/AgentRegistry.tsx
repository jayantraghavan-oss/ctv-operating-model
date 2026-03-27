/*
 * AgentRegistry — Full searchable/filterable registry of all 200 agent prompts
 * The operational backbone: every prompt, its type, status, module, and section.
 */
import Layout from "@/components/Layout";
import { Link } from "wouter";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useState, useMemo } from "react";

const agentTypes: AgentType[] = ["persistent", "triggered", "orchestrator"];

export default function AgentRegistry() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AgentType | "all">("all");
  const [moduleFilter, setModuleFilter] = useState<number | "all">("all");

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

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-[1200px]">
        {/* Breadcrumb */}
        <Link href="/">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-4">
            <ArrowLeft className="w-3 h-3" />
            Command Center
          </div>
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Agent Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All {prompts.length} agent prompts across the operating model. Search, filter, and inspect.
          </p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search prompts..."
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
            <option value="persistent">Persistent</option>
            <option value="triggered">Triggered</option>
            <option value="orchestrator">Orchestrator</option>
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
            <option value={0}>Orchestration Layer</option>
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
            {filtered.length} of {prompts.length} prompts
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex gap-3 mb-5">
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

        {/* Prompts list */}
        <div className="border border-border rounded-lg bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-12">#</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">Prompt</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground w-24">Type</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground w-28">Module</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground w-16">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((prompt) => {
                  const mod = modules.find((m) => m.id === prompt.moduleId);
                  return (
                    <motion.tr
                      key={prompt.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{prompt.id}</td>
                      <td className="px-3 py-3 text-xs text-foreground leading-relaxed">{prompt.text}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${getAgentTypeBg(prompt.agentType)} font-medium`}>
                          {getAgentTypeLabel(prompt.agentType)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {mod ? (
                          <Link href={`/module/${mod.id}`}>
                            <span className="text-[10px] text-[#0091FF] hover:underline cursor-pointer font-mono">
                              M{mod.id}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-[10px] text-rose-500 font-mono">Orch</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(prompt.status)}`} />
                          <span className="text-[10px] text-muted-foreground capitalize">{prompt.status}</span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No prompts match your filters.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
