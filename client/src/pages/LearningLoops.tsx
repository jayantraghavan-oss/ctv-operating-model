/*
 * LearningLoops — Visual flow diagram showing data movement between modules
 * The "connective tissue" from the doc — how signals flow across modules,
 * where learning compounds, and where loops break down.
 */
import NeuralShell from "@/components/NeuralShell";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useAgent } from "@/contexts/AgentContext";
import {
  GitBranch,
  ArrowRight,
  ArrowDown,
  Zap,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useCuratedData, type CuratedRow } from "@/hooks/useCuratedData";

const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

interface LearningLoop {
  id: string;
  name: string;
  from: { module: number; section: string };
  to: { module: number; section: string };
  signal: string;
  mechanism: string;
  frequency: string;
  status: "active" | "partial" | "broken";
  criticalFor: string;
}

// Data comes from DB via useCuratedData(["learning_loop_full"])

function toLearningLoops(rows: CuratedRow[]): LearningLoop[] {
  return rows.map((r, i) => {
    let meta: any = {};
    try { meta = r.metadata ? JSON.parse(r.metadata as string) : {}; } catch { meta = {}; }
    return {
      id: `loop-${i + 1}`,
      name: r.label,
      from: meta.from || { module: 0, section: "Unknown" },
      to: meta.to || { module: 0, section: "Unknown" },
      signal: r.text1 || "",
      mechanism: meta.mechanism || r.text2 || "",
      frequency: meta.frequency || "Unknown",
      status: (r.subcategory as "active" | "partial" | "broken") || "partial",
      criticalFor: meta.criticalFor || r.text3 || "",
    };
  });
}

function StatusBadge({ status }: { status: "active" | "partial" | "broken" }) {
  const configs = {
    active: { bg: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Active" },
    partial: { bg: "bg-amber-100 text-amber-700 border-amber-200", label: "Partial" },
    broken: { bg: "bg-red-100 text-red-700 border-red-200", label: "Broken" },
  };
  const c = configs[status];
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.bg}`}>
      {c.label}
    </span>
  );
}

function ModuleTag({ id }: { id: number }) {
  if (id === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">ORCH</span>;
  return (
    <Link href={`/module/${id}`}>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0091FF]/10 text-[#0091FF] hover:bg-[#0091FF]/20 transition-colors cursor-pointer">
        M{id}
      </span>
    </Link>
  );
}

export default function LearningLoops() {
  const [expandedLoop, setExpandedLoop] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { data: curatedData } = useCuratedData(["learning_loop_full"]);
  const dbLoops = useMemo(() => {
    const rows = curatedData.learning_loop_full;
    return rows?.length ? toLearningLoops(rows) : [];
  }, [curatedData]);

  const learningLoops = dbLoops;

  const activeCount = learningLoops.filter((l: LearningLoop) => l.status === "active").length;
  const partialCount = learningLoops.filter((l: LearningLoop) => l.status === "partial").length;
  const brokenCount = learningLoops.filter((l: LearningLoop) => l.status === "broken").length;

  const filtered = filterStatus === "all" ? learningLoops : learningLoops.filter((l: LearningLoop) => l.status === filterStatus);

  return (
    <NeuralShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1000px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Learning Loops
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            How signals flow between modules — the compounding intelligence engine
          </p>
        </div>

        {/* Context banner */}
        <motion.div {...fade} className="bg-[#0091FF]/5 border border-[#0091FF]/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <GitBranch className="w-5 h-5 text-[#0091FF] mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-[#0091FF] mb-1">Why Learning Loops Matter</div>
              <p className="text-xs text-foreground/70 leading-relaxed">
                The operating model's power comes not from individual modules but from the <strong>connections between them</strong>. 
                When Module 3 discovers that gaming vertical campaigns outperform by 25%, that signal must flow back to Module 2 
                (to adjust ICP targeting) and Module 1 (to update competitive positioning for gaming). When these loops are active, 
                the system gets smarter every week. When they break, modules optimize locally but miss the bigger picture.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Status summary */}
        <motion.div {...fade} transition={{ delay: 0.05 }} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setFilterStatus(filterStatus === "active" ? "all" : "active")}
            className={`p-3 rounded-xl border transition-all ${
              filterStatus === "active" ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200" : "bg-white border-border hover:border-emerald-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-2xl font-bold">{activeCount}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Active</div>
          </button>
          <button
            onClick={() => setFilterStatus(filterStatus === "partial" ? "all" : "partial")}
            className={`p-3 rounded-xl border transition-all ${
              filterStatus === "partial" ? "bg-amber-50 border-amber-300 ring-2 ring-amber-200" : "bg-white border-border hover:border-amber-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-2xl font-bold">{partialCount}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Partial</div>
          </button>
          <button
            onClick={() => setFilterStatus(filterStatus === "broken" ? "all" : "broken")}
            className={`p-3 rounded-xl border transition-all ${
              filterStatus === "broken" ? "bg-red-50 border-red-300 ring-2 ring-red-200" : "bg-white border-border hover:border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-2xl font-bold">{brokenCount}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Broken</div>
          </button>
        </motion.div>

        {/* Loop cards */}
        <motion.div {...fade} transition={{ delay: 0.1 }} className="space-y-3">
          {filtered.map((loop, i) => (
            <motion.div
              key={loop.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white border border-border rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedLoop(expandedLoop === loop.id ? null : loop.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  loop.status === "active" ? "bg-emerald-100 text-emerald-600" :
                  loop.status === "partial" ? "bg-amber-100 text-amber-600" :
                  "bg-red-100 text-red-600"
                }`}>
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{loop.name}</span>
                    <StatusBadge status={loop.status} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <ModuleTag id={loop.from.module} />
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <ModuleTag id={loop.to.module} />
                    <span className="text-[10px] text-muted-foreground ml-1">· {loop.frequency}</span>
                  </div>
                </div>
                <ArrowUpRight className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${
                  expandedLoop === loop.id ? "rotate-90" : ""
                }`} />
              </button>

              {expandedLoop === loop.id && (
                <div className="px-4 pb-4 border-t border-border/50 space-y-3">
                  {/* Signal */}
                  <div className="mt-3">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Signal</div>
                    <p className="text-sm text-foreground/80">{loop.signal}</p>
                  </div>

                  {/* Mechanism */}
                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">How It Works</div>
                    <p className="text-sm text-foreground/80">{loop.mechanism}</p>
                  </div>

                  {/* Flow visualization */}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-border text-xs">
                        <ModuleTag id={loop.from.module} />
                        <span className="font-medium">{loop.from.section}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#0091FF]" />
                      <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-border text-xs">
                        <ModuleTag id={loop.to.module} />
                        <span className="font-medium">{loop.to.section}</span>
                      </div>
                    </div>
                  </div>

                  {/* Critical for */}
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <Zap className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[11px] font-semibold text-amber-700 uppercase mb-0.5">Why This Matters</div>
                      <p className="text-xs text-amber-700/80">{loop.criticalFor}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* System-level insight */}
        <motion.div {...fade} transition={{ delay: 0.2 }} className="mt-6 bg-white border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-[#0091FF]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">System Health</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">{activeCount}/{learningLoops.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Loops fully active</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">{partialCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Need automation</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{brokenCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Broken — fix urgently</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            The operating model's compounding intelligence depends on these loops functioning. Each broken loop represents 
            a place where the system is optimizing locally but missing cross-module insights. Priority: fix Loop #9 
            (Onboarding → Sales Enablement) to prevent the oversell→underdeliver cycle.
          </p>
        </motion.div>
      </div>
    </NeuralShell>
  );
}
