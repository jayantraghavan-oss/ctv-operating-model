/**
 * ApprovalQueue — Review and approve/reject agent outputs.
 * Apple-style: glassy panels, soft interactions, polished typography.
 */
import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { useState } from "react";
import { Shield, CheckCircle2, XCircle, Eye, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

export default function ApprovalQueue() {
  const { recentRuns } = useAgent();
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const completedRuns = recentRuns.filter((r) => r.status === "completed" && r.output);
  const pendingRuns = completedRuns.filter((r) => !approved.has(r.id) && !rejected.has(r.id));
  const approvedRuns = completedRuns.filter((r) => approved.has(r.id));
  const rejectedRuns = completedRuns.filter((r) => rejected.has(r.id));

  const handleApprove = (id: string) => {
    setApproved((prev) => new Set(prev).add(id));
    setRejected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };
  const handleReject = (id: string) => {
    setRejected((prev) => new Set(prev).add(id));
    setApproved((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  return (
    <NeuralShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Approval Queue</h1>
          <p className="text-[15px] text-foreground/45 mt-1">{pendingRuns.length} pending · {approvedRuns.length} approved · {rejectedRuns.length} rejected</p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div whileHover={{ y: -2, scale: 1.01 }} transition={spring} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-amber-signal/10 flex items-center justify-center"><Clock className="w-3.5 h-3.5 text-amber-signal" /></div>
              <span className="text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Pending</span>
            </div>
            <div className="text-[24px] font-bold tracking-tight text-foreground">{pendingRuns.length}</div>
          </motion.div>
          <motion.div whileHover={{ y: -2, scale: 1.01 }} transition={spring} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-signal/10 flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-signal" /></div>
              <span className="text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Approved</span>
            </div>
            <div className="text-[24px] font-bold tracking-tight text-foreground">{approvedRuns.length}</div>
          </motion.div>
          <motion.div whileHover={{ y: -2, scale: 1.01 }} transition={spring} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-rose-signal/10 flex items-center justify-center"><XCircle className="w-3.5 h-3.5 text-rose-signal" /></div>
              <span className="text-[12px] font-semibold text-foreground/35 uppercase tracking-wide">Rejected</span>
            </div>
            <div className="text-[24px] font-bold tracking-tight text-foreground">{rejectedRuns.length}</div>
          </motion.div>
        </div>

        {completedRuns.length === 0 ? (
          <div className="glass rounded-2xl p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-black/[0.03] flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-foreground/20" />
            </div>
            <p className="text-[15px] font-medium text-foreground/40">No agent outputs to review yet</p>
            <p className="text-[13px] text-foreground/25 mt-1.5">Execute agents from the Swarm or Command Center to generate outputs.</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.04]">
              <span className="text-[15px] font-semibold">Pending Review</span>
            </div>
            <div className="divide-y divide-black/[0.04]">
              <AnimatePresence>
                {pendingRuns.map((run) => (
                  <motion.div key={run.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} transition={spring} className="px-5 py-4">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-signal shrink-0" />
                      <span className="text-[12px] font-mono text-foreground/25">#{run.promptId}</span>
                      <span className="text-[14px] text-foreground/70 truncate flex-1">{run.promptText.slice(0, 60)}...</span>
                      <button onClick={() => setExpandedId(expandedId === run.id ? null : run.id)} className="text-foreground/25 hover:text-foreground/50 transition-colors"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleApprove(run.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-emerald-signal/10 text-emerald-signal hover:bg-emerald-signal/15 transition-all"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
                      <button onClick={() => handleReject(run.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-rose-signal/10 text-rose-signal hover:bg-rose-signal/15 transition-all"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                    </div>
                    <AnimatePresence>
                      {expandedId === run.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
                          <div className="bg-black/[0.02] rounded-xl p-4 text-[13px] text-foreground/60 border border-black/[0.04] ml-7">
                            <div className="text-[11px] font-semibold text-primary/60 mb-1.5 uppercase tracking-wide">Agent Output</div>
                            {run.output}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
              {pendingRuns.length === 0 && <div className="p-8 text-center text-[13px] text-foreground/30">All items reviewed.</div>}
            </div>
          </div>
        )}

        {approvedRuns.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.04] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-signal/10 flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-signal" /></div>
              <span className="text-[15px] font-semibold">Approved</span>
            </div>
            <div className="divide-y divide-black/[0.04]">
              {approvedRuns.map((run) => (
                <div key={run.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-signal shrink-0" />
                  <span className="text-[12px] font-mono text-foreground/25">#{run.promptId}</span>
                  <span className="text-[14px] text-foreground/60 truncate flex-1">{run.promptText.slice(0, 60)}...</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </NeuralShell>
  );
}
