/**
 * ApprovalQueue — Review and approve/reject agent outputs.
 * Full A+H support: edit, re-prompt, approve/reject with persistence.
 * Apple-style: glassy panels, soft interactions, polished typography.
 */
import NeuralShell from "@/components/NeuralShell";
import TipBanner from "@/components/TipBanner";
import OutputInterstitial from "@/components/OutputInterstitial";
import { useAgent } from "@/contexts/AgentContext";
import { useState } from "react";
import {
  Shield, CheckCircle2, XCircle, Eye, Clock, Copy, Sparkles,
  EyeOff, Pencil, MessageSquare, Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

type QueueFilter = "all" | "pending" | "approved" | "rejected";

export default function ApprovalQueue() {
  const {
    recentRuns, agentRuns,
    editRunOutput, rePromptAgent, approveRun, rejectRun,
    getStreamingOutput,
  } = useAgent();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interstitialRunId, setInterstitialRunId] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>("all");

  // Use all agentRuns (not just recentRuns) for the approval queue
  const completedRuns = agentRuns.filter((r) => r.status === "completed" && r.output);

  // Categorize by approval status
  const pendingRuns = completedRuns.filter((r) => !r.approvalStatus || r.approvalStatus === "pending");
  const approvedRuns = completedRuns.filter((r) => r.approvalStatus === "approved");
  const rejectedRuns = completedRuns.filter((r) => r.approvalStatus === "rejected");

  // Filtered view
  const filteredRuns = filter === "all" ? completedRuns
    : filter === "pending" ? pendingRuns
    : filter === "approved" ? approvedRuns
    : rejectedRuns;

  const handleApprove = (id: string) => {
    approveRun(id);
  };
  const handleReject = (id: string) => {
    rejectRun(id);
  };

  const copyOutput = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Interstitial data
  const interstitialRun = interstitialRunId ? agentRuns.find((r) => r.id === interstitialRunId) : null;

  return (
    <NeuralShell>
      <div className="space-y-8">
        <TipBanner tipId="approvals-intro" variant="default">
          This is where completed AI outputs land for your review. For <strong>A+H modules</strong>, you can edit the output, re-prompt the agent with feedback, then approve or reject. All changes are persisted.
        </TipBanner>

        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Approval Queue</h1>
          <p className="text-[15px] text-foreground/45 mt-1">{pendingRuns.length} pending · {approvedRuns.length} approved · {rejectedRuns.length} rejected</p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-foreground/30" />
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                filter === f
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/40 hover:text-foreground/60 hover:bg-black/[0.04]"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1 text-[11px] opacity-60">
                {f === "all" ? completedRuns.length : f === "pending" ? pendingRuns.length : f === "approved" ? approvedRuns.length : rejectedRuns.length}
              </span>
            </button>
          ))}
        </div>

        {completedRuns.length === 0 ? (
          <div className="glass rounded-2xl p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-black/[0.03] flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-foreground/20" />
            </div>
            <p className="text-[15px] font-medium text-foreground/40">No outputs to review yet</p>
            <p className="text-[13px] text-foreground/25 mt-1.5">Run assistants from the Toolkit or Control Center to generate outputs for review.</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.04]">
              <span className="text-[15px] font-semibold">
                {filter === "all" ? "All Outputs" : filter === "pending" ? "Pending Review" : filter === "approved" ? "Approved" : "Rejected"}
              </span>
              <span className="text-[13px] text-foreground/30 ml-2">({filteredRuns.length})</span>
            </div>
            <div className="divide-y divide-black/[0.04]">
              <AnimatePresence>
                {filteredRuns.map((run) => {
                  const isExpanded = expandedId === run.id;
                  const displayOutput = run.humanEditedOutput || run.output || "";
                  const status = run.approvalStatus || "pending";
                  const statusDot = status === "approved" ? "bg-emerald-signal" : status === "rejected" ? "bg-rose-signal" : "bg-amber-signal";
                  const isAH = run.owner === "agent-human" || run.owner === "human-led";
                  return (
                    <motion.div key={run.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} transition={spring} className="px-4 sm:px-5 py-4">
                      {/* Row 1: Status + text */}
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${statusDot} shrink-0 mt-1.5 sm:mt-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] font-mono text-foreground/25">#{run.promptId}</span>
                            <span className="text-[11px] text-foreground/30 font-medium">{run.subModuleName}</span>
                            {run.durationMs && (
                              <span className="text-[11px] text-foreground/25 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{(run.durationMs / 1000).toFixed(1)}s
                              </span>
                            )}
                            {run.humanEditedOutput && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                                <Pencil className="w-2.5 h-2.5" /> Edited
                              </span>
                            )}
                            {run.humanPrompt && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                <MessageSquare className="w-2.5 h-2.5" /> Re-prompted
                              </span>
                            )}
                            {status !== "pending" && (
                              <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                                status === "approved" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200"
                              }`}>
                                {status === "approved" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] sm:text-[14px] text-foreground/70 line-clamp-2 mt-0.5 block">{run.promptText.slice(0, 100)}...</span>
                        </div>
                      </div>
                      {/* Row 2: Actions */}
                      <div className="flex items-center gap-2 ml-5 sm:ml-7 flex-wrap">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : run.id)}
                          className="text-foreground/25 hover:text-foreground/50 transition-colors p-2 rounded-lg active:bg-black/[0.04]"
                          title={isExpanded ? "Collapse" : "Preview"}
                        >
                          {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>

                        {/* Open full interstitial for A+H editing */}
                        {isAH && (
                          <button
                            onClick={() => setInterstitialRunId(run.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-foreground/40 hover:text-primary hover:bg-primary/5 transition-all"
                            title="Open full editor"
                          >
                            <Pencil className="w-3 h-3" />
                            <span className="hidden sm:inline">Edit / Re-prompt</span>
                          </button>
                        )}

                        {status === "pending" && (
                          <>
                            <button onClick={() => handleApprove(run.id)} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[12px] font-semibold bg-emerald-signal/10 text-emerald-signal hover:bg-emerald-signal/15 transition-all active:scale-95"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
                            <button onClick={() => handleReject(run.id)} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[12px] font-semibold bg-rose-signal/10 text-rose-signal hover:bg-rose-signal/15 transition-all active:scale-95"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                          </>
                        )}

                        <button
                          onClick={() => copyOutput(displayOutput)}
                          className="text-foreground/25 hover:text-foreground/50 transition-colors p-2 rounded-lg active:bg-black/[0.04] ml-auto"
                          title="Copy output"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring} className="overflow-hidden">
                            <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl p-4 sm:p-5 border border-black/[0.05] ml-0 sm:ml-7 mt-3">
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-[11px] font-bold text-[#0091FF]/70 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3" />
                                  {run.humanEditedOutput ? "Human-Edited Output" : "AI Output"}
                                </div>
                              </div>
                              <div className="text-[13px] text-foreground/70 leading-relaxed prose prose-sm max-w-none prose-headings:text-foreground/80 prose-headings:font-semibold prose-strong:text-foreground/75 prose-li:text-foreground/65">
                                <Streamdown>{displayOutput}</Streamdown>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {filteredRuns.length === 0 && (
                <div className="p-8 text-center text-[13px] text-foreground/30">
                  {filter === "all" ? "No completed runs yet." : `No ${filter} items.`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full A+H interstitial for editing/re-prompting */}
      {interstitialRun && (
        <OutputInterstitial
          open={!!interstitialRunId}
          onClose={() => setInterstitialRunId(null)}
          agentName={interstitialRun.subModuleName}
          ownership={interstitialRun.owner}
          agentType={interstitialRun.agentType}
          output={interstitialRun.output || ""}
          isStreaming={interstitialRun.status === "running"}
          durationMs={interstitialRun.durationMs}
          isRunning={interstitialRun.status === "running"}
          runId={interstitialRun.id}
          humanEditedOutput={interstitialRun.humanEditedOutput}
          approvalStatus={interstitialRun.approvalStatus}
          revisions={interstitialRun.revisions}
          onEditOutput={editRunOutput}
          onRePrompt={rePromptAgent}
          onApprove={approveRun}
          onReject={rejectRun}
        />
      )}
    </NeuralShell>
  );
}
