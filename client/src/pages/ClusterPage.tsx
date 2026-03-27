/*
 * ClusterPage — Deep-dive into a Human Orchestrator Cluster
 * Shows the cluster rationale, human role, linked modules, two modes of operation, etc.
 */
import Layout from "@/components/Layout";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { clusters, modules, getModuleStats } from "@/lib/data";
import {
  ArrowLeft,
  ArrowRight,
  Users2,
  Brain,
  Lightbulb,
  AlertTriangle,
  Layers,
} from "lucide-react";

export default function ClusterPage() {
  const params = useParams<{ id: string }>();
  const clusterId = parseInt(params.id || "1", 10);
  const cluster = clusters.find((c) => c.id === clusterId);

  if (!cluster) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Cluster not found.</div>
      </Layout>
    );
  }

  const linkedModules = modules.filter((m) => cluster.moduleIds.includes(m.id));

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-[1000px]">
        {/* Breadcrumb */}
        <Link href="/">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-4">
            <ArrowLeft className="w-3 h-3" />
            Command Center
          </div>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full border-2 border-[#0091FF] flex items-center justify-center text-lg font-bold text-[#0091FF]">
              {cluster.id}
            </div>
            <div>
              <div className="text-xs font-mono text-muted-foreground">Cluster {cluster.id}</div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{cluster.name}</h1>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Primary coverage: <span className="font-medium text-foreground">{cluster.primaryModuleCoverage}</span>
          </div>
        </div>

        {/* Why this cluster exists */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-border rounded-lg bg-white mb-6"
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Why These Activities Cluster Together</h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{cluster.whyCluster}</p>
          </div>
        </motion.div>

        {/* Human orchestrator role */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border border-border rounded-lg bg-white mb-6"
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Brain className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-foreground">Human Orchestrator Role</h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{cluster.humanRole}</p>
          </div>
        </motion.div>

        {/* Two Modes of Operation (Cluster 3 only) */}
        {cluster.twoModes && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-amber-200 rounded-lg bg-amber-50/50 mb-6"
          >
            <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-amber-800">Two Modes of Operation</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">
                    CTV-to-App
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{cluster.twoModes.app}</p>
              </div>
              <div className="border-t border-amber-200 pt-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
                    CTV-to-Web
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{cluster.twoModes.web}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Linked Modules */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="border border-border rounded-lg bg-white mb-6"
        >
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0091FF]" />
            <h2 className="text-sm font-semibold text-foreground">Linked Work Modules</h2>
          </div>
          <div className="divide-y divide-border">
            {linkedModules.map((mod) => {
              const s = getModuleStats(mod.id);
              return (
                <Link key={mod.id} href={`/module/${mod.id}`}>
                  <div className="px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Module {mod.id}: {mod.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s.sections} sections · {s.subModules} sub-modules · {s.prompts} prompts
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-2xl">
                      {mod.description.slice(0, 200)}...
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Navigation between clusters */}
        <div className="flex items-center justify-between pt-4">
          {clusterId > 1 ? (
            <Link href={`/cluster/${clusterId - 1}`}>
              <span className="text-xs text-[#0091FF] hover:underline cursor-pointer flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                Cluster {clusterId - 1}
              </span>
            </Link>
          ) : (
            <div />
          )}
          {clusterId < clusters.length ? (
            <Link href={`/cluster/${clusterId + 1}`}>
              <span className="text-xs text-[#0091FF] hover:underline cursor-pointer flex items-center gap-1">
                Cluster {clusterId + 1}
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </Layout>
  );
}
