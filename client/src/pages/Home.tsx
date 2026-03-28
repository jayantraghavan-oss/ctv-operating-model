/*
 * Home — Command Center Dashboard
 * The operational nerve center for the CTV business.
 * Shows: system health, module stats, cluster map, agent breakdown, key metrics.
 */
import Layout from "@/components/Layout";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  modules,
  clusters,
  prompts,
  getTotalStats,
  getModuleStats,
  getOwnerBg,
  getOwnerLabel,
  getAgentTypeBg,
  getAgentTypeLabel,
} from "@/lib/data";
import {
  Radar,
  Megaphone,
  Users,
  BarChart3,
  Bot,
  UserCheck,
  Zap,
  ArrowRight,
  Activity,
  Target,
  TrendingUp,
  Shield,
} from "lucide-react";

const moduleIcons = [Radar, Megaphone, Users, BarChart3];
const stats = getTotalStats();

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function Home() {
  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            CTV AI Commercial Engine — 2 FTEs, {stats.totalPrompts} agents, {stats.modules} modules
          </p>
        </div>

        {/* Top-level KPIs */}
        <motion.div {...fade} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Work Modules"
            value={stats.modules}
            sub={`${stats.totalSubModules} sub-modules`}
            icon={<Target className="w-4 h-4" />}
            color="text-[#0091FF]"
          />
          <KpiCard
            label="Agent Prompts"
            value={stats.totalPrompts}
            sub={`${stats.persistent} persistent · ${stats.triggered} triggered`}
            icon={<Bot className="w-4 h-4" />}
            color="text-emerald-600"
          />
          <KpiCard
            label="Orchestrator Clusters"
            value={stats.clusters}
            sub={`${stats.orchestrator} orchestrator prompts`}
            icon={<Shield className="w-4 h-4" />}
            color="text-violet-600"
          />
          <KpiCard
            label="Ownership Split"
            value={`${stats.totalAgents}A`}
            sub={`${stats.totalAgentHuman} A+H · ${stats.totalHumanLed} Human`}
            icon={<UserCheck className="w-4 h-4" />}
            color="text-amber-600"
          />
        </motion.div>

        {/* System Architecture Overview */}
        <motion.div {...fade} transition={{ delay: 0.05 }} className="mb-8">
          <div className="border border-border rounded-lg bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">System Architecture</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agents as discrete modules reporting to human orchestrators. Two modes of operation for CTV-to-App and CTV-to-Web.
              </p>
            </div>
            <div className="p-5">
              {/* Flow: Modules → Clusters → DRI */}
              <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                {modules.map((mod, i) => {
                  const Icon = moduleIcons[i];
                  const mStats = getModuleStats(mod.id);
                  const linkedClusters = mod.clusterIds
                    ? mod.clusterIds.map((cid) => clusters.find((c) => c.id === cid)).filter(Boolean)
                    : [clusters.find((c) => c.id === mod.clusterId)].filter(Boolean);
                  return (
                    <Link key={mod.id} href={`/module/${mod.id}`}>
                      <div className="flex-1 border border-border rounded-lg p-4 hover:border-[#0091FF]/30 hover:shadow-sm transition-all group cursor-pointer">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-md bg-[#0091FF]/8 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-[#0091FF]" />
                          </div>
                          <div>
                            <div className="text-xs font-mono text-muted-foreground">Module {mod.id}</div>
                            <div className="text-sm font-medium text-foreground leading-tight">{mod.shortName}</div>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Sections</span>
                            <span className="font-mono">{mStats.sections}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sub-modules</span>
                            <span className="font-mono">{mStats.subModules}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Agent prompts</span>
                            <span className="font-mono">{mStats.prompts}</span>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border space-y-1">
                          {linkedClusters.map((cluster) => (
                            <div key={cluster!.id} className="flex items-center gap-1.5 text-xs">
                              <div className="w-2 h-2 rounded-full bg-[#0091FF]" />
                              <span className="text-muted-foreground">→ Cluster {cluster!.id}: {cluster!.shortName}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-xs text-[#0091FF] opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Open module</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Two-column: Clusters + Agent Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Clusters */}
          <motion.div {...fade} transition={{ delay: 0.1 }}>
            <div className="border border-border rounded-lg bg-white overflow-hidden h-full">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Human Orchestrator Clusters</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Coherent sets of agents under single human orchestrators
                </p>
              </div>
              <div className="divide-y divide-border">
                {clusters.map((cluster) => (
                  <Link key={cluster.id} href={`/cluster/${cluster.id}`}>
                    <div className="px-5 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full border-2 border-[#0091FF]/30 flex items-center justify-center text-xs font-bold text-[#0091FF]">
                            {cluster.id}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{cluster.name}</div>
                            <div className="text-xs text-muted-foreground">{cluster.primaryModuleCoverage}</div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {cluster.twoModes && (
                        <div className="mt-2 ml-10 flex gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            CTV-to-App
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                            CTV-to-Web
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Agent Breakdown */}
          <motion.div {...fade} transition={{ delay: 0.15 }}>
            <div className="border border-border rounded-lg bg-white overflow-hidden h-full">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Agent Architecture</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  200 prompts across 3 agent types and 3 ownership models
                </p>
              </div>
              <div className="p-5 space-y-5">
                {/* By agent type */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    By Agent Type
                  </div>
                  <div className="space-y-2">
                    {(["persistent", "triggered", "orchestrator"] as const).map((type) => {
                      const count = prompts.filter((p) => p.agentType === type).length;
                      const pct = Math.round((count / stats.totalPrompts) * 100);
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded border ${getAgentTypeBg(type)} font-medium w-24 text-center`}>
                            {getAgentTypeLabel(type)}
                          </span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${
                                type === "persistent" ? "bg-emerald-500" : type === "triggered" ? "bg-violet-500" : "bg-rose-500"
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: 0.2 }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* By ownership */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    By Ownership Model
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(["agent", "agent-human", "human-led"] as const).map((owner) => {
                      const count =
                        owner === "agent"
                          ? stats.totalAgents
                          : owner === "agent-human"
                          ? stats.totalAgentHuman
                          : stats.totalHumanLed;
                      return (
                        <div
                          key={owner}
                          className={`rounded-lg border p-3 text-center ${getOwnerBg(owner)}`}
                        >
                          <div className="text-lg font-semibold">{count}</div>
                          <div className="text-[11px] mt-0.5">{getOwnerLabel(owner)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Key design principles */}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Key Design Principles
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <span>Agents generate, recommend, and surface insights — humans approve all content going to market</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Activity className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>Persistent agents monitor 24/7; triggered agents fire on events or cycles</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-[#0091FF] mt-0.5 shrink-0" />
                      <span>Target: $200M App ARR + Web product validation. EOQ2 investment decision.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Module-by-module prompt distribution */}
        <motion.div {...fade} transition={{ delay: 0.2 }}>
          <div className="border border-border rounded-lg bg-white overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Prompt Distribution by Module</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Module</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Sections</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Sub-modules</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Prompts</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Agent</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">A+H</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Human</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modules.map((mod, i) => {
                    const s = getModuleStats(mod.id);
                    const Icon = moduleIcons[i];
                    return (
                      <tr key={mod.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-[#0091FF]" />
                            <div>
                              <div className="font-medium text-foreground">{mod.shortName}</div>
                              <div className="text-xs text-muted-foreground">Module {mod.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-3 py-3 font-mono text-xs">{s.sections}</td>
                        <td className="text-center px-3 py-3 font-mono text-xs">{s.subModules}</td>
                        <td className="text-center px-3 py-3 font-mono text-xs font-semibold">{s.prompts}</td>
                        <td className="text-center px-3 py-3">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-mono">{s.agents}</span>
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-mono">{s.agentHuman}</span>
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">{s.humanLed}</span>
                        </td>
                        <td className="px-3 py-3">
                          <Link href={`/module/${mod.id}`}>
                            <span className="text-xs text-[#0091FF] hover:underline cursor-pointer">View →</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Orchestration row */}
                  <tr className="hover:bg-muted/30 transition-colors bg-muted/10">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Shield className="w-4 h-4 text-rose-500" />
                        <div>
                          <div className="font-medium text-foreground">Orchestration Layer</div>
                          <div className="text-xs text-muted-foreground">Cross-module</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-3 py-3 font-mono text-xs">—</td>
                    <td className="text-center px-3 py-3 font-mono text-xs">—</td>
                    <td className="text-center px-3 py-3 font-mono text-xs font-semibold">{stats.orchPrompts}</td>
                    <td className="text-center px-3 py-3 font-mono text-xs">—</td>
                    <td className="text-center px-3 py-3 font-mono text-xs">—</td>
                    <td className="text-center px-3 py-3 font-mono text-xs">—</td>
                    <td className="px-3 py-3">
                      <Link href="/agents">
                        <span className="text-xs text-[#0091FF] hover:underline cursor-pointer">View →</span>
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-8">
          <span className="font-mono">CTV AI Commercial Engine</span> · Moloco · Draft for POC & Feedback · Mar 2026
        </div>
      </div>
    </Layout>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="border border-border rounded-lg p-4 bg-white">
      <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-foreground tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
