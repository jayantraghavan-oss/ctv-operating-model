/**
 * NeuralCommand — The living second brain.
 * Autopilot toggle, cluster control, live output stream, recommendations, audit trail.
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

// Map cluster IDs to module IDs for deploying representative agents
const clusterModuleMap: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 4 };

export default function NeuralCommand() {
  const { recentRuns, runAgent } = useAgent();
  const [autopilot, setAutopilot] = useState(false);
  const [deployingCluster, setDeployingCluster] = useState<number | null>(null);

  const activeRuns = recentRuns.filter((r) => r.status === "running").length;
  const completedRuns = recentRuns.filter((r) => r.status === "completed").length;
  const failedRuns = recentRuns.filter((r) => r.status === "failed").length;

  // Deploy a cluster by running a representative agent from it
  const deployCluster = useCallback((clusterId: number) => {
    setDeployingCluster(clusterId);
    const cluster = clusters.find((c) => c.id === clusterId);
    if (!cluster) return;
    const moduleId = clusterModuleMap[clusterId] || 1;
    // Find a prompt from this module
    const modulePrompts = prompts.filter((p) => p.moduleId === moduleId);
    const prompt = modulePrompts[0];
    if (prompt) {
      runAgent(prompt.id, prompt.text, moduleId, `cluster-${clusterId}-deploy`);
    }
    setTimeout(() => setDeployingCluster(null), 2000);
  }, [runAgent]);

  // Autopilot: auto-deploy clusters sequentially
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Brain className="w-6 h-6 text-neon" />
              <h1 className="text-2xl font-semibold tracking-tight">Second Brain</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.modules} modules · {stats.totalPrompts} agents · {recentRuns.length} runs · {completedRuns > 0 ? `${completedRuns} completed` : "ready"}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setAutopilot(!autopilot)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${autopilot ? "bg-neon text-background animate-glow" : "border border-border text-muted-foreground hover:text-foreground hover:border-neon/30"}`}>
              <Activity className="w-4 h-4" />
              {autopilot ? "Autopilot ON" : "Autopilot"}
            </button>
            <button onClick={deployAll} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neon text-background text-sm font-medium hover:bg-neon/90 transition-all">
              <Zap className="w-4 h-4" />
              Go Live
            </button>
            <Link href="/simulation">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-signal/30 text-violet-signal text-sm font-medium hover:bg-violet-signal/10 transition-all cursor-pointer">
                <MessageSquare className="w-4 h-4" />
                Buyer Sim
              </div>
            </Link>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="AGENTS" value="67" icon={<Brain className="w-3.5 h-3.5" />} color="text-neon" />
          <KpiCard label="RUNS" value={String(recentRuns.length)} icon={<Zap className="w-3.5 h-3.5" />} color="text-amber-signal" />
          <KpiCard label="COMPLETED" value={completedRuns > 0 ? String(completedRuns) : "—"} icon={<CheckCircle2 className="w-3.5 h-3.5" />} color="text-emerald-signal" />
          <KpiCard label="QUEUE" value={String(activeRuns)} icon={<Clock className="w-3.5 h-3.5" />} color="text-amber-signal" />
          <KpiCard label="ERRORS" value={failedRuns > 0 ? String(failedRuns) : "—"} icon={<AlertTriangle className="w-3.5 h-3.5" />} color="text-rose-signal" />
        </div>

        {/* Recommendations */}
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-signal" />
            <span className="text-sm font-medium">Recommendations</span>
          </div>
          <div className="divide-y divide-border">
            {RECOMMENDATIONS.slice(0, 3).map((rec, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${rec.priority === "high" ? "bg-rose-signal" : rec.priority === "medium" ? "bg-amber-signal" : "bg-muted-foreground"}`} />
                <span className="text-sm text-foreground/80 flex-1">{rec.text}</span>
                {rec.link ? (
                  <Link href={rec.link}><span className="text-xs font-mono text-neon hover:underline cursor-pointer whitespace-nowrap">{rec.action}</span></Link>
                ) : (
                  <button onClick={() => rec.clusterId && deployCluster(rec.clusterId)} className="text-xs font-mono text-neon hover:underline whitespace-nowrap">{rec.action}</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Two-column: Cluster Control + Live Output */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">Cluster Control</span>
                <span className="text-xs font-mono text-muted-foreground">67 agents across 5 clusters</span>
              </div>
              <div className="divide-y divide-border">
                {clusters.map((cluster) => {
                  const clusterRuns = recentRuns.filter((r) => r.subModuleName.startsWith(`cluster-${cluster.id}`));
                  const isDeploying = deployingCluster === cluster.id;
                  const hasRuns = clusterRuns.length > 0;
                  return (
                    <div key={cluster.id} className="px-4 py-3 flex items-center gap-4 hover:bg-accent/30 transition-colors">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${hasRuns ? "bg-neon/15 text-neon" : isDeploying ? "bg-amber-signal/15 text-amber-signal" : "bg-muted text-muted-foreground"}`}>
                        C{cluster.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{cluster.name}</div>
                        <div className="text-xs text-muted-foreground">{cluster.primaryModuleCoverage} · {clusterRuns.length} runs</div>
                      </div>
                      <button onClick={() => deployCluster(cluster.id)} disabled={isDeploying} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isDeploying ? "bg-amber-signal/15 text-amber-signal" : hasRuns ? "bg-emerald-signal/15 text-emerald-signal" : "border border-border text-muted-foreground hover:text-neon hover:border-neon/30"}`}>
                        <Play className="w-3 h-3" />
                        {isDeploying ? "Deploying..." : hasRuns ? "Re-deploy" : "Deploy"}
                      </button>
                      <Link href={`/cluster/${cluster.id}`}>
                        <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {/* Live Output */}
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-signal animate-pulse-neon" />
                <span className="text-xs font-mono text-muted-foreground uppercase">Live Output</span>
                <span className="ml-auto text-xs font-mono text-muted-foreground">{recentRuns.length} runs</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {recentRuns.length === 0 ? (
                  <div className="p-6 text-center">
                    <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No agent outputs yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Hit "Go Live" to start the swarm.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    <AnimatePresence>
                      {recentRuns.slice(0, 10).map((run) => (
                        <motion.div key={run.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-2.5">
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${run.status === "completed" ? "bg-emerald-signal" : run.status === "running" ? "bg-amber-signal animate-pulse-neon" : "bg-rose-signal"}`} />
                            <span className="text-xs font-mono text-muted-foreground truncate">{run.subModuleName}</span>
                          </div>
                          {run.output && <p className="text-xs text-foreground/70 line-clamp-2 ml-3.5">{run.output}</p>}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Trail */}
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-xs font-mono text-muted-foreground uppercase">Audit Trail</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {recentRuns.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No events yet</div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentRuns.slice(0, 8).map((run) => (
                      <div key={run.id} className="px-4 py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-muted-foreground">{new Date(run.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
                          <span className={`font-mono ${run.status === "completed" ? "text-emerald-signal" : run.status === "running" ? "text-amber-signal" : "text-rose-signal"}`}>{run.status.toUpperCase()}</span>
                        </div>
                        <div className="text-foreground/60 mt-0.5 truncate">{run.subModuleName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Module Distribution Table */}
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-medium">Module Architecture</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-mono text-muted-foreground">Module</th>
                  <th className="text-center px-3 py-2.5 text-xs font-mono text-muted-foreground">Sections</th>
                  <th className="text-center px-3 py-2.5 text-xs font-mono text-muted-foreground">Sub-modules</th>
                  <th className="text-center px-3 py-2.5 text-xs font-mono text-muted-foreground">Prompts</th>
                  <th className="text-center px-3 py-2.5 text-xs font-mono text-muted-foreground">Cluster</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modules.map((mod) => {
                  const s = getModuleStats(mod.id);
                  return (
                    <tr key={mod.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{mod.shortName}</div>
                        <div className="text-xs text-muted-foreground">Module {mod.id}</div>
                      </td>
                      <td className="text-center px-3 py-3 font-mono text-xs">{s.sections}</td>
                      <td className="text-center px-3 py-3 font-mono text-xs">{s.subModules}</td>
                      <td className="text-center px-3 py-3 font-mono text-xs font-semibold text-neon">{s.prompts}</td>
                      <td className="text-center px-3 py-3">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-neon/10 text-neon">C{mod.clusterId}{mod.clusterIds && mod.clusterIds.length > 1 ? `+C${mod.clusterIds[1]}` : ""}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/module/${mod.id}`}><span className="text-xs font-mono text-neon hover:underline cursor-pointer">Open →</span></Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground/50 font-mono pb-4">
          MERIDIAN · AI-First CTV Commercial Operating Model · Beth Berger · 2 FTEs · {stats.totalPrompts} Agents
        </div>
      </div>
    </NeuralShell>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: ReactNode; color: string }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-card">
      <div className={`flex items-center gap-1.5 mb-1.5 ${color}`}>
        {icon}
        <span className="text-[10px] font-mono uppercase">{label}</span>
      </div>
      <div className="text-xl font-semibold font-mono text-foreground">{value}</div>
    </div>
  );
}
