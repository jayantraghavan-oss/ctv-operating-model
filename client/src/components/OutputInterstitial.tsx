/**
 * OutputInterstitial — Full-screen slide-up panel for viewing agent output.
 * Scrollable, dismissible (X button, backdrop click, Escape key).
 * Apple-style frosted glass design with spring animations.
 */
import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Bot, UserCheck, Users2, Play, Clock, FileText, ChevronDown } from "lucide-react";
import { Streamdown } from "streamdown";

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
}

const ownershipConfig: Record<string, { label: string; color: string; icon: typeof Bot }> = {
  agent: { label: "Agent", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Bot },
  "agent-human": { label: "Agent + Human", color: "text-amber-600 bg-amber-50 border-amber-200", icon: Users2 },
  "human-led": { label: "Human-led", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: UserCheck },
};

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
}: OutputInterstitialProps) {
  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
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

  const ownerInfo = ownershipConfig[ownership] || ownershipConfig["agent-human"];
  const OwnerIcon = ownerInfo.icon;
  const wordCount = output ? output.split(/\s+/).length : 0;

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
            onClick={onClose}
          />

          {/* Panel — slides up from bottom */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] flex flex-col bg-white rounded-t-3xl shadow-2xl overflow-hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-black/10" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-black/[0.03] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-foreground/40" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[16px] font-bold text-foreground truncate">{agentName}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
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
                >
                  <X className="w-5 h-5 text-foreground/40" />
                </button>
              </div>
            </div>

            {/* Stats bar */}
            {output && (
              <div className="flex items-center gap-4 px-6 py-2.5 border-b border-black/[0.04] bg-black/[0.01] shrink-0">
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
                <button
                  onClick={onClose}
                  className="ml-auto flex items-center gap-1 text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="font-medium">Collapse</span>
                </button>
              </div>
            )}

            {/* Content — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {output ? (
                <div className="prose prose-sm prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground/80 prose-a:text-primary max-w-none text-[14px] text-foreground/70 leading-relaxed">
                  <Streamdown>{output}</Streamdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Bot className="w-12 h-12 text-foreground/10 mb-4" />
                  <p className="text-[15px] font-semibold text-foreground/40">No output yet</p>
                  <p className="text-[13px] text-foreground/25 mt-1">Click "Run Agent" to execute this assistant</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
