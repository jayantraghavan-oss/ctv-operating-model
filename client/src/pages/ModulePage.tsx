/*
 * ModulePage — Deep-dive into a single work module
 * Shows all sections, sub-modules, ownership, and linked agent prompts.
 */
import Layout from "@/components/Layout";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
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
import type { OwnerType, Section, SubModule } from "@/lib/data";
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Bot,
  UserCheck,
  Users2,
  Zap,
  Eye,
} from "lucide-react";
import { useState } from "react";

export default function ModulePage() {
  const params = useParams<{ id: string }>();
  const moduleId = parseInt(params.id || "1", 10);
  const mod = modules.find((m) => m.id === moduleId);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(mod?.sections.map(s => s.key) || []));
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);

  if (!mod) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Module not found.</div>
      </Layout>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
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
                        {/* Sub-modules table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/30">
                                <th className="text-left px-5 py-2 text-xs font-semibold text-muted-foreground">Sub-Module</th>
                                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground w-28">Owner</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Description</th>
                                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground w-20">Prompts</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {section.subModules.map((sm, idx) => (
                                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-5 py-3">
                                    <span className="font-medium text-foreground text-sm">{sm.name}</span>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <span className={`text-[11px] px-2 py-0.5 rounded border ${getOwnerBg(sm.owner)} font-medium`}>
                                      {getOwnerLabel(sm.owner)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-xs text-muted-foreground max-w-md">
                                    {sm.description}
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    {sm.prompts.length > 0 ? (
                                      <span className="text-xs font-mono text-[#0091FF]">{sm.prompts.length}</span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Linked prompts */}
                        {sectionPrompts.length > 0 && (
                          <div className="border-t border-border px-5 py-4">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                              Agent Prompts ({sectionPrompts.length})
                            </div>
                            <div className="space-y-1.5">
                              {sectionPrompts.map((prompt) => (
                                <div
                                  key={prompt.id}
                                  onClick={() => setSelectedPrompt(selectedPrompt === prompt.id ? null : prompt.id)}
                                  className={`flex items-start gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                                    selectedPrompt === prompt.id ? "bg-[#0091FF]/5 border border-[#0091FF]/20" : "hover:bg-muted/50"
                                  }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${getStatusColor(prompt.status)}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-foreground leading-relaxed">{prompt.text}</div>
                                    {selectedPrompt === prompt.id && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="mt-2 flex items-center gap-2"
                                      >
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getAgentTypeBg(prompt.agentType)}`}>
                                          {getAgentTypeLabel(prompt.agentType)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                          #{prompt.id}
                                        </span>
                                      </motion.div>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                    #{prompt.id}
                                  </span>
                                </div>
                              ))}
                            </div>
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
      </div>
    </Layout>
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
