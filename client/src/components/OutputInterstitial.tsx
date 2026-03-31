/**
 * OutputInterstitial — Full-screen slide-up panel for viewing agent output.
 * A+H (Agent+Human) support: inline editing, re-prompt bar, approve/reject.
 * Scrollable, dismissible (X button, backdrop click, Escape key).
 * Apple-style frosted glass design with spring animations.
 */
import { useEffect, useCallback, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Bot, UserCheck, Users2, Play, Clock, FileText, ChevronDown,
  Pencil, CheckCircle2, XCircle, Send, RotateCcw, History,
  MessageSquare, Save, Undo2, Sparkles, Copy, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface OutputInterstitialProps {
  open: boolean;
  onClose: () => void;
  agentName: string;
  ownership?: string;
  agentType?: string;
  output: string;
  isStreaming?: boolean;
  durationMs?: number;
  onRun?: () => void;
  isRunning?: boolean;
  // A+H collaboration props
  runId?: string;
  humanEditedOutput?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  revisions?: Array<{ type: "edit" | "reprompt"; content: string; timestamp: string }>;
  onEditOutput?: (runId: string, editedOutput: string) => void;
  onRePrompt?: (runId: string, humanPrompt: string) => void;
  onApprove?: (runId: string) => void;
  onReject?: (runId: string) => void;
  // Feedback props
  promptId?: number;
  moduleId?: number;
  hadLiveContext?: boolean;
  liveDataSources?: string[];
}

const ownershipConfig: Record<string, { label: string; color: string; icon: typeof Bot }> = {
  agent: { label: "Agent", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Bot },
  "agent-human": { label: "Agent + Human", color: "text-amber-600 bg-amber-50 border-amber-200", icon: Users2 },
  "human-led": { label: "Human-led", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: UserCheck },
};

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

export default function OutputInterstitial({
  open,
  onClose,
  agentName,
  ownership = "agent-human",
  agentType,
  output,
  isStreaming = false,
  durationMs,
  onRun,
  isRunning = false,
  // A+H props
  runId,
  humanEditedOutput,
  approvalStatus = "pending",
  revisions,
  onEditOutput,
  onRePrompt,
  onApprove,
  onReject,
  // Feedback props
  promptId,
  moduleId,
  hadLiveContext,
  liveDataSources,
}: OutputInterstitialProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showRePrompt, setShowRePrompt] = useState(false);
  const [rePromptText, setRePromptText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [showFeedbackComment, setShowFeedbackComment] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rePromptRef = useRef<HTMLTextAreaElement>(null);

  // Determine if this is an A+H run
  const isAH = ownership === "agent-human" || ownership === "human-led";
  const displayOutput = humanEditedOutput || output;
  const wordCount = displayOutput ? displayOutput.split(/\s+/).length : 0;

  // Close on Escape (only if not editing)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isEditing && !showRePrompt) onClose();
    },
    [onClose, isEditing, showRePrompt]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  // Reset state when panel closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setShowRePrompt(false);
      setShowHistory(false);
      setRePromptText("");
      setFeedbackRating(null);
      setFeedbackComment("");
      setShowFeedbackComment(false);
      setFeedbackSubmitted(false);
    }
  }, [open]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [isEditing, editContent]);

  const startEditing = () => {
    setEditContent(displayOutput);
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (runId && onEditOutput && editContent.trim()) {
      onEditOutput(runId, editContent.trim());
      setIsEditing(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleRePrompt = () => {
    if (runId && onRePrompt && rePromptText.trim()) {
      onRePrompt(runId, rePromptText.trim());
      setRePromptText("");
      setShowRePrompt(false);
    }
  };

  const handleApprove = () => {
    if (runId && onApprove) onApprove(runId);
  };

  const handleReject = () => {
    if (runId && onReject) onReject(runId);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(displayOutput)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy — try selecting and copying manually"));
  };

  const submitFeedback = async (rating: "up" | "down") => {
    if (!runId) return;
    setFeedbackRating(rating);
    if (rating === "down") {
      setShowFeedbackComment(true);
      return;
    }
    // Submit immediately for thumbs up
    await persistFeedback(rating, "");
  };

  const persistFeedback = async (rating: "up" | "down", comment: string) => {
    if (!runId) return;
    try {
      const fbId = `fb-${runId}-${Date.now()}`;
      const res = await fetch("/api/trpc/feedback.submit?batch=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          "0": {
            json: {
              id: fbId,
              runId,
              promptId: promptId || 0,
              moduleId: moduleId || 0,
              rating,
              comment: comment || undefined,
              hadLiveContext: hadLiveContext || false,
              liveDataSources: liveDataSources || [],
            },
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFeedbackSubmitted(true);
      setShowFeedbackComment(false);
      toast.success(rating === "up" ? "Thanks for the positive feedback!" : "Feedback recorded — we'll improve.");
    } catch {
      toast.error("Failed to submit feedback");
    }
  };

  const ownerInfo = ownershipConfig[ownership] || ownershipConfig["agent-human"];
  const OwnerIcon = ownerInfo.icon;

  const approvalBadge = approvalStatus === "approved"
    ? { label: "Approved", color: "bg-emerald-50 text-emerald-600 border-emerald-200" }
    : approvalStatus === "rejected"
    ? { label: "Rejected", color: "bg-rose-50 text-rose-600 border-rose-200" }
    : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40"
            style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={!isEditing ? onClose : undefined}
          />

          {/* Panel — slides up from bottom */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] flex flex-col bg-white rounded-t-3xl shadow-2xl overflow-hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-black/10" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-black/[0.06] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-black/[0.03] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-foreground/40" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[16px] font-bold text-foreground truncate">{agentName}</h2>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ownerInfo.color}`}>
                      <OwnerIcon className="w-3 h-3" />
                      {ownerInfo.label}
                    </span>
                    {agentType && (
                      <span className="text-[11px] text-foreground/30 font-medium capitalize">{agentType}</span>
                    )}
                    {durationMs && (
                      <span className="flex items-center gap-1 text-[11px] text-foreground/25 font-mono">
                        <Clock className="w-3 h-3" />
                        {(durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    {approvalBadge && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${approvalBadge.color}`}>
                        {approvalStatus === "approved" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {approvalBadge.label}
                      </span>
                    )}
                    {output && output.includes("## Live Data Context") && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-cyan-200 bg-cyan-50 text-cyan-600">
                        <Sparkles className="w-3 h-3" />
                        Live Data
                      </span>
                    )}
                    {humanEditedOutput && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border text-violet-600 bg-violet-50 border-violet-200">
                        <Pencil className="w-3 h-3" />
                        Edited
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onRun && (
                  <motion.button
                    onClick={onRun}
                    disabled={isRunning}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-semibold shadow-lg shadow-primary/20 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Play className="w-3.5 h-3.5" />
                    {isRunning ? "Running..." : "Run Agent"}
                  </motion.button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-black/[0.04] transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5 text-foreground/40" />
                </button>
              </div>
            </div>

            {/* Stats bar + A+H action bar */}
            {displayOutput && (
              <div className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-2.5 border-b border-black/[0.04] bg-black/[0.01] shrink-0 flex-wrap">
                <div className="flex items-center gap-1.5 text-[11px] text-foreground/35">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="font-medium">{wordCount.toLocaleString()} words</span>
                </div>
                {isStreaming && (
                  <div className="flex items-center gap-1.5 text-[11px] text-primary/60">
                    <div className="w-2.5 h-2.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="font-medium">Streaming...</span>
                  </div>
                )}

                {/* A+H action buttons — only show when output exists and not streaming */}
                {isAH && !isStreaming && runId && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Copy */}
                    <button
                      onClick={copyOutput}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground/40 hover:text-foreground/60 hover:bg-black/[0.04] transition-all"
                      title="Copy output"
                    >
                      <Copy className="w-3 h-3" />
                      <span className="hidden sm:inline">Copy</span>
                    </button>

                    {/* Edit */}
                    {onEditOutput && !isEditing && (
                      <button
                        onClick={startEditing}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-foreground/40 hover:text-violet-600 hover:bg-violet-50 transition-all"
                        title="Edit output"
                      >
                        <Pencil className="w-3 h-3" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    )}

                    {/* Re-prompt */}
                    {onRePrompt && (
                      <button
                        onClick={() => setShowRePrompt(!showRePrompt)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          showRePrompt
                            ? "text-primary bg-primary/10"
                            : "text-foreground/40 hover:text-primary hover:bg-primary/5"
                        }`}
                        title="Re-prompt agent"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span className="hidden sm:inline">Re-prompt</span>
                      </button>
                    )}

                    {/* History */}
                    {revisions && revisions.length > 0 && (
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          showHistory
                            ? "text-foreground/60 bg-black/[0.04]"
                            : "text-foreground/40 hover:text-foreground/60 hover:bg-black/[0.04]"
                        }`}
                        title="Revision history"
                      >
                        <History className="w-3 h-3" />
                        <span className="hidden sm:inline">{revisions.length}</span>
                      </button>
                    )}

                    {/* Divider */}
                    <div className="w-px h-5 bg-black/[0.08] mx-1" />

                    {/* Approve */}
                    {onApprove && approvalStatus !== "approved" && (
                      <motion.button
                        onClick={handleApprove}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
                        whileTap={{ scale: 0.95 }}
                        title="Approve output"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Approve
                      </motion.button>
                    )}

                    {/* Reject */}
                    {onReject && approvalStatus !== "rejected" && (
                      <motion.button
                        onClick={handleReject}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                        whileTap={{ scale: 0.95 }}
                        title="Reject output"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </motion.button>
                    )}
                  </div>
                )}

                {/* Non-A+H: just collapse + feedback */}
                {!isAH && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      onClick={onClose}
                      className="flex items-center gap-1 text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span className="font-medium">Collapse</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Re-prompt input bar */}
            <AnimatePresence>
              {showRePrompt && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={spring}
                  className="overflow-hidden border-b border-black/[0.04] shrink-0"
                >
                  <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-primary/[0.03] to-transparent">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary/60" />
                      <span className="text-[12px] font-semibold text-primary/70">Re-prompt Agent</span>
                      <span className="text-[11px] text-foreground/30">— provide feedback or new instructions</span>
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        ref={rePromptRef}
                        value={rePromptText}
                        onChange={(e) => setRePromptText(e.target.value)}
                        placeholder="e.g., 'Add more detail on competitive positioning' or 'Rewrite for a technical audience'"
                        className="flex-1 text-[13px] text-foreground/70 bg-white border border-black/[0.08] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-foreground/20"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleRePrompt();
                          }
                        }}
                      />
                      <div className="flex flex-col gap-1.5">
                        <motion.button
                          onClick={handleRePrompt}
                          disabled={!rePromptText.trim()}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-[12px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.96 }}
                        >
                          <Send className="w-3 h-3" />
                          Send
                        </motion.button>
                        <button
                          onClick={() => { setShowRePrompt(false); setRePromptText(""); }}
                          className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors text-center"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-foreground/25 mt-1.5">
                      ⌘+Enter to send · Agent will re-run with your feedback + previous output as context
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Revision history panel */}
            <AnimatePresence>
              {showHistory && revisions && revisions.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={spring}
                  className="overflow-hidden border-b border-black/[0.04] shrink-0 max-h-[200px] overflow-y-auto"
                >
                  <div className="px-4 sm:px-6 py-3 bg-black/[0.015]">
                    <div className="flex items-center gap-2 mb-2">
                      <History className="w-3.5 h-3.5 text-foreground/40" />
                      <span className="text-[12px] font-semibold text-foreground/50">Revision History</span>
                    </div>
                    <div className="space-y-2">
                      {revisions.map((rev, i) => (
                        <div key={i} className="flex items-start gap-2 text-[12px]">
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            rev.type === "edit" ? "bg-violet-50 text-violet-500" : "bg-primary/10 text-primary"
                          }`}>
                            {rev.type === "edit" ? <Pencil className="w-2.5 h-2.5" /> : <RotateCcw className="w-2.5 h-2.5" />}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-foreground/50">
                              {rev.type === "edit" ? "Human edit" : "Re-prompt"}
                            </span>
                            <span className="text-foreground/25 ml-2">
                              {new Date(rev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <p className="text-foreground/40 mt-0.5 line-clamp-2">{rev.content.slice(0, 200)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-violet-500" />
                      <span className="text-[13px] font-semibold text-violet-600">Editing Output</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium text-foreground/40 hover:text-foreground/60 hover:bg-black/[0.04] transition-all"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Undo2 className="w-3 h-3" />
                        Cancel
                      </motion.button>
                      <motion.button
                        onClick={saveEdit}
                        className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Save className="w-3 h-3" />
                        Save Edits
                      </motion.button>
                    </div>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full text-[14px] text-foreground/70 leading-relaxed bg-white border border-violet-200 rounded-xl px-4 py-4 resize-none focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all min-h-[300px] font-mono"
                    style={{ height: "auto" }}
                  />
                  <p className="text-[11px] text-foreground/25">
                    Tip: Edit the markdown directly. Your changes are saved as a human revision and tracked in history.
                  </p>
                </div>
              ) : displayOutput ? (
                <div className="prose prose-sm prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground/80 prose-a:text-primary max-w-none text-[14px] text-foreground/70 leading-relaxed">
                  <Streamdown>{displayOutput}</Streamdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Bot className="w-12 h-12 text-foreground/10 mb-4" />
                  <p className="text-[15px] font-semibold text-foreground/40">No output yet</p>
                  <p className="text-[13px] text-foreground/25 mt-1.5">Click "Run Agent" to execute this assistant</p>
                </div>
              )}

              {/* Feedback bar — shows after output is rendered */}
              {displayOutput && !isStreaming && !isEditing && runId && (
                <div className="mt-6 pt-4 border-t border-black/[0.06]">
                  {feedbackSubmitted ? (
                    <div className="flex items-center gap-2 text-[12px] text-foreground/40">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Feedback recorded{feedbackRating === "up" ? " — glad it helped!" : " — we'll improve."}</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-foreground/35 font-medium">Was this output helpful?</span>
                        <div className="flex items-center gap-1.5">
                          <motion.button
                            onClick={() => submitFeedback("up")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                              feedbackRating === "up"
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : "text-foreground/35 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent"
                            }`}
                            whileTap={{ scale: 0.95 }}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            Yes
                          </motion.button>
                          <motion.button
                            onClick={() => submitFeedback("down")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                              feedbackRating === "down"
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : "text-foreground/35 hover:text-rose-600 hover:bg-rose-50 border border-transparent"
                            }`}
                            whileTap={{ scale: 0.95 }}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            No
                          </motion.button>
                        </div>
                        {hadLiveContext && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100 ml-auto">
                            Grounded in live data
                          </span>
                        )}
                      </div>

                      {/* Comment input for thumbs down */}
                      <AnimatePresence>
                        {showFeedbackComment && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={spring}
                            className="overflow-hidden"
                          >
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={feedbackComment}
                                onChange={(e) => setFeedbackComment(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") persistFeedback("down", feedbackComment);
                                }}
                                placeholder="What could be better? (optional)"
                                className="flex-1 text-[12px] px-3 py-2 rounded-lg border border-black/[0.08] bg-white focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-all placeholder:text-foreground/20"
                                autoFocus
                              />
                              <motion.button
                                onClick={() => persistFeedback("down", feedbackComment)}
                                className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-all"
                                whileTap={{ scale: 0.95 }}
                              >
                                Submit
                              </motion.button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
