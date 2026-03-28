/**
 * NeuralCommand — The living second brain.
 * Apple-style: glassy cards, spring animations, polished typography.
 */
import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { modules, clusters, getTotalStats, getModuleStats, prompts } from "@/lib/data";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  Brain,
  Play,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Activity,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const stats = getTotalStats();

const RECOMMENDATIONS = [
  { priority: "high" as const, text: "Deploy C1: Market Intel — 10 agents ready to scan competitive landscape and generate battlecards.", action: "Deploy C1", clusterId: 1 },
  { priority: "high" as const, text: "Run buyer persona simulation with real Gong call patterns to validate CTV-to-App pitch.", action: "Open Sim", link: "/simulation" },
  { priority: "medium" as const, text: "C2: Growth Engine has 18 agents for demand gen — deploy to generate campaign briefs and ICP scoring.", action: "Deploy C2", clusterId: 2 },
  { priority: "medium" as const, text: "Review Data Pulse for latest Gong call intelligence and brand pipeline status.", action: "View Data", link: "/data-pulse" },
  { priority: "low" as const, text: "C5: Governance cluster can auto-generate compliance checklists and RMG documentation.", action: "Deploy C5", clusterId: 5 },
];

const clusterModuleMap: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 4 };

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };
const stagger = { staggerChildren: 0.06 };

export default function NeuralCommand() {
  const { recentRuns, runAgent } = useAgent();
  const [autopilot, setAutopilot] = useState(false);
  const [deployingCluster, setDeployingCluster] = useState<number | null>(null);

  const activeRuns = recentRuns.filter((r) => r.status === "running").length;
  const completedRuns = recentRuns.filter((r) => r.status === "completed").length;
  const failedRuns = recentRuns.filter((r) => r.status === "failed").length;

  const deployCluster = useCallback((clusterId: number) => {
    setDeployingCluster(clusterId);
    const moduleId = clusterModuleMap[clusterId] || 1;
    const modulePrompts = prompts.filter((p) => p.moduleId === moduleId);
    const prompt = modulePrompts[0];
    if (prompt) {
      runAgent(prompt.id, prompt.text, moduleId, `cluster-${clusterId}-deploy`);
    }
    setTimeout(() => setDeployingCluster(null), 2000);
  }, [runAgent]);

  useEffect(() => {
    if (!autopilot) return;
    const interval = setInterval(() => {
      const undeployed = clusters.find(
        (c) => !recentRuns.some((r) => r.subModuleName.startsWith(`cluster-${c.id}`))
      );
      if (undeployed) deployCluster(undeployed.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [autopilot, recentRuns, deployCluster]);

  const deployAll = useCallback(() => {
    clusters.forEach((c, i) => {
      setTimeout(() => deployCluster(c.id), i * 1500);
    });
  }, [deployCluster]);

  return (
    <NeuralShell>
      <motion.div
        className="space-y-8"
        initial="hidden"
        animate="visible"
        variants={{ visible: stagger, hidden: {} }}
      >
        {/* Header */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          transition={spring}
          className="flex items-start justify-between flex-wrap gap-4"
        >
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-foreground">
              Second Brain
            </h1>
            <p className="text-[15px] text-foreground/45 mt-1">
              {stats.modules} modules · {stats.totalPrompts} agents · {recentRuns.length} runs · {completedRuns > 0 ? `${completedRuns} completed` : "ready"}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setAutopilot(!autopilot)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-300 ${
                autopilot
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-black/[0.04] text-foreground/50 hover:text-foreground hover:bg-black/[0.06]"
              }`}
            >
              {autopilot ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {autopilot ? "Autopilot ON" : "Autopilot"}
            </button>
            <button
              onClick={deployAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white text-[13px] font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Zap className="w-4 h-4" />
              Go Live
            </button>
            <Link href="/simulation">
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-signal/10 text-violet-signal text-[13px] font-semibold hover:bg-violet-signal/15 transition-all cursor-pointer">
                <MessageSquare className="w-4 h-4" />
                Buyer Sim
              </div>
            </Link>
          </div>
        </motion.div>

        {/* KPI Strip */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          transition={spring}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          <GlassKpi label="Agents" value="67" icon={<Brain className="w-4 h-4" />} color="text-primary" bgColor="bg-primary/8" />
          <GlassKpi label="Runs" value={String(recentRuns.length)} icon={<Zap className="w-4 h-4" />} color="text-amber-signal" bgColor="bg-amber-signal/8" />
          <GlassKpi label="Completed" value={completedRuns > 0 ? String(completedRuns) : "—"} icon={<CheckCircle2 className="w-4 h-4" />} color="text-emerald-signal" bgColor="bg-emerald-signal/8" />
          <GlassKpi label="Active" value={String(activeRuns)} icon={<Clock className="w-4 h-4" />} color="text-primary" bgColor="bg-primary/8" />
          <GlassKpi label="Errors" value={failedRuns > 0 ? String(failedRuns) : "—"} icon={<AlertTriangle className="w-4 h-4" />} color="text-rose-signal" bgColor="bg-rose-signal/8" />
        </motion.div>

        {/* Recommendations */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          transition={spring}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 flex items-center gap-2.5 border-b border-black/[0.04]">
            <div className="w-7 h-7 rounded-xl bg-amber-signal/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-signal" />
            </div>
            <span className="text-[15px] font-semibold">Recommendations</span>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {RECOMMENDATIONS.slice(0, 3).map((rec, i) => (
              <motion.div
                key={i}
                className="px-5 py-4 flex items-center gap-4 hover:bg-black/[0.015] transition-colors"
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${rec.priority === "high" ? "bg-rose-signal" : rec.priority === "medium" ? "bg-amber-signal" : "bg-foreground/20"}`} />
                <span className="text-[14px] text-foreground/70 flex-1 leading-relaxed">{rec.text}</span>
                {rec.link ? (
                  <Link href={rec.link}>
                    <span className="text-[13px] font-semibold text-primary hover:text-primary/80 cursor-pointer whitespace-nowrap transition-colors">{rec.action}</span>
                  </Link>
                ) : (
                  <button onClick={() => rec.clusterId && deployCluster(rec.clusterId)} className="text-[13px] font-semibold text-primary hover:text-primary/80 whitespace-nowrap transition-colors">{rec.action}</button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Two-column: Cluster Control + Live Output */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            transition={spring}
            className="lg:col-span-3"
          >
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                <span className="text-[15px] font-semibold">Cluster Control</span>
                <span className="text-[13px] text-foreground/35 font-medium">67 agents · 5 clusters</span>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {clusters.map((cluster) => {
                  const clusterRuns = recentRuns.filter((r) => r.subModuleName.startsWith(`cluster-${cluster.id}`));
                  const isDeploying = deployingCluster === cluster.id;
                  const hasRuns = clusterRuns.length > 0;
                  return (
                    <motion.div
                      key={cluster.id}
                      className="px-5 py-4 flex items-center gap-4 hover:bg-black/[0.015] transition-colors"
                      whileHover={{ x: 2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[14px] font-bold shrink-0 transition-colors ${
                        hasRuns ? "bg-primary/10 text-primary" : isDeploying ? "bg-amber-signal/10 text-amber-signal" : "bg-black/[0.04] text-foreground/30"
                      }`}>
                        C{cluster.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-foreground">{cluster.name}</div>
                        <div className="text-[12px] text-foreground/40 mt-0.5">{cluster.primaryModuleCoverage} · {clusterRuns.length} runs</div>
                      </div>
                      <button
                        onClick={() => deployCluster(cluster.id)}
                        disabled={isDeploying}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 ${
                          isDeploying
                            ? "bg-amber-signal/10 text-amber-signal"
                            : hasRuns
                            ? "bg-emerald-signal/10 text-emerald-signal hover:bg-emerald-signal/15"
                            : "bg-black/[0.04] text-foreground/40 hover:text-primary hover:bg-primary/8"
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        {isDeploying ? "Deploying..." : hasRuns ? "Re-deploy" : "Deploy"}
                      </button>
                      <Link href={`/cluster/${cluster.id}`}>
                        <ChevronRight className="w-4 h-4 text-foreground/20 hover:text-foreground/50 cursor-pointer transition-colors" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            transition={spring}
            className="lg:col-span-2 space-y-5"
          >
            {/* Live Output */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.04] flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-signal animate-pulse-neon" />
                <span className="text-[13px] font-semibold text-foreground/50 uppercase tracking-wide">Live Output</span>
                <span className="ml-auto text-[13px] font-medium text-foreground/30">{recentRuns.length} runs</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {recentRuns.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-black/[0.03] flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-5 h-5 text-foreground/20" />
                    </div>
                    <p className="text-[14px] font-medium text-foreground/40">No agent outputs yet</p>
                    <p className="text-[12px] text-foreground/25 mt-1">Hit "Go Live" to start the swarm</p>
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.04]">
                    <AnimatePresence>
                      {recentRuns.slice(0, 10).map((run) => (
                        <motion.div
                          key={run.id}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={spring}
                          className="px-5 py-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${run.status === "completed" ? "bg-emerald-signal" : run.status === "running" ? "bg-amber-signal animate-pulse-neon" : "bg-rose-signal"}`} />
                            <span className="text-[12px] font-medium text-foreground/40 truncate">{run.subModuleName}</span>
                          </div>
                          {run.output && <p className="text-[12px] text-foreground/55 line-clamp-2 ml-4 leading-relaxed">{run.output}</p>}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Trail */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.04]">
                <span className="text-[13px] font-semibold text-foreground/50 uppercase tracking-wide">Audit Trail</span>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {recentRuns.length === 0 ? (
                  <div className="p-5 text-center text-[13px] text-foreground/30">No events yet</div>
                ) : (
                  <div className="divide-y divide-black/[0.04]">
                    {recentRuns.slice(0, 8).map((run) => (
                      <div key={run.id} className="px-5 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-medium text-foreground/35">
                            {new Date(run.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                            run.status === "completed" ? "bg-emerald-signal/10 text-emerald-signal" :
                            run.status === "running" ? "bg-amber-signal/10 text-amber-signal" :
                            "bg-rose-signal/10 text-rose-signal"
                          }`}>
                            {run.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[12px] text-foreground/40 mt-0.5 truncate">{run.subModuleName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Module Architecture Table */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          transition={spring}
          className="glass rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-black/[0.04]">
            <span className="text-[15px] font-semibold">Module Architecture</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-black/[0.04]">
                  <th className="text-left px-5 py-3 text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Module</th>
                  <th className="text-center px-3 py-3 text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Sections</th>
                  <th className="text-center px-3 py-3 text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Sub-modules</th>
                  <th className="text-center px-3 py-3 text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Prompts</th>
                  <th className="text-center px-3 py-3 text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Cluster</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {modules.map((mod) => {
                  const s = getModuleStats(mod.id);
                  return (
                    <tr key={mod.id} className="hover:bg-black/[0.015] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground">{mod.shortName}</div>
                        <div className="text-[12px] text-foreground/35 mt-0.5">Module {mod.id}</div>
                      </td>
                      <td className="text-center px-3 py-3.5 font-mono text-[13px] text-foreground/50">{s.sections}</td>
                      <td className="text-center px-3 py-3.5 font-mono text-[13px] text-foreground/50">{s.subModules}</td>
                      <td className="text-center px-3 py-3.5">
                        <span className="font-mono text-[13px] font-bold text-primary">{s.prompts}</span>
                      </td>
                      <td className="text-center px-3 py-3.5">
                        <span className="text-[12px] font-semibold px-2.5 py-1 rounded-lg bg-primary/8 text-primary">
                          C{mod.clusterId}{mod.clusterIds && mod.clusterIds.length > 1 ? `+C${mod.clusterIds[1]}` : ""}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <Link href={`/module/${mod.id}`}>
                          <span className="text-[13px] font-semibold text-primary hover:text-primary/70 cursor-pointer transition-colors">Open</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        <div className="text-center text-[12px] text-foreground/25 font-medium pb-6">
          Meridian · AI-First CTV Commercial Operating Model · Beth Berger · 2 FTEs · {stats.totalPrompts} Agents
        </div>
      </motion.div>
    </NeuralShell>
  );
}

function GlassKpi({ label, value, icon, color, bgColor }: { label: string; value: string; icon: ReactNode; color: string; bgColor: string }) {
  return (
    <motion.div
      className="glass rounded-2xl p-4 hover:shadow-apple transition-shadow duration-300"
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className={`flex items-center gap-2 mb-2`}>
        <div className={`w-7 h-7 rounded-xl ${bgColor} flex items-center justify-center`}>
          <span className={color}>{icon}</span>
        </div>
        <span className="text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-[24px] font-bold tracking-tight text-foreground">{value}</div>
    </motion.div>
  );
}
