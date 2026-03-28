/**
 * ApprovalQueue — Review and approve/reject agent outputs.
 */
import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { useState } from "react";
import { Shield, CheckCircle2, XCircle, Eye, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-6 h-6 text-neon" />
            <h1 className="text-2xl font-semibold tracking-tight">Approval Queue</h1>
          </div>
          <p className="text-sm text-muted-foreground">{pendingRuns.length} pending · {approvedRuns.length} approved · {rejectedRuns.length} rejected</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="border border-border rounded-lg p-3 bg-card">
            <div className="flex items-center gap-1.5 mb-1.5 text-amber-signal"><Clock className="w-3.5 h-3.5" /><span className="text-[10px] font-mono uppercase">PENDING</span></div>
            <div className="text-xl font-semibold font-mono text-foreground">{pendingRuns.length}</div>
          </div>
          <div className="border border-border rounded-lg p-3 bg-card">
            <div className="flex items-center gap-1.5 mb-1.5 text-emerald-signal"><CheckCircle2 className="w-3.5 h-3.5" /><span className="text-[10px] font-mono uppercase">APPROVED</span></div>
            <div className="text-xl font-semibold font-mono text-foreground">{approvedRuns.length}</div>
          </div>
          <div className="border border-border rounded-lg p-3 bg-card">
            <div className="flex items-center gap-1.5 mb-1.5 text-rose-signal"><XCircle className="w-3.5 h-3.5" /><span className="text-[10px] font-mono uppercase">REJECTED</span></div>
            <div className="text-xl font-semibold font-mono text-foreground">{rejectedRuns.length}</div>
          </div>
        </div>

        {completedRuns.length === 0 ? (
          <div className="border border-border rounded-lg bg-card p-12 text-center">
            <Shield className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No agent outputs to review yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Execute agents from the Swarm or Command Center to generate outputs.</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border"><span className="text-sm font-medium">Pending Review</span></div>
            <div className="divide-y divide-border">
              <AnimatePresence>
                {pendingRuns.map((run) => (
                  <motion.div key={run.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 rounded-full bg-amber-signal shrink-0" />
                      <span className="text-xs font-mono text-muted-foreground">#{run.promptId}</span>
                      <span className="text-sm text-foreground truncate flex-1">{run.promptText.slice(0, 60)}...</span>
                      <button onClick={() => setExpandedId(expandedId === run.id ? null : run.id)} className="text-xs font-mono text-neon hover:underline"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleApprove(run.id)} className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-emerald-signal/15 text-emerald-signal hover:bg-emerald-signal/25 transition-all"><CheckCircle2 className="w-3 h-3" /> Approve</button>
                      <button onClick={() => handleReject(run.id)} className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-rose-signal/15 text-rose-signal hover:bg-rose-signal/25 transition-all"><XCircle className="w-3 h-3" /> Reject</button>
                    </div>
                    <AnimatePresence>
                      {expandedId === run.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="bg-muted/50 rounded-lg p-3 text-xs text-foreground/70 border border-border ml-5">
                            <div className="text-[10px] font-mono text-neon mb-1">AGENT OUTPUT</div>
                            {run.output}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
              {pendingRuns.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">All items reviewed.</div>}
            </div>
          </div>
        )}

        {approvedRuns.length > 0 && (
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-signal" /><span className="text-sm font-medium">Approved</span></div>
            <div className="divide-y divide-border">
              {approvedRuns.map((run) => (
                <div key={run.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-signal shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground">#{run.promptId}</span>
                  <span className="text-sm text-foreground/70 truncate flex-1">{run.promptText.slice(0, 60)}...</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </NeuralShell>
  );
}
