/**
 * HelpButton — Floating help button with contextual tips and keyboard shortcuts.
 * Appears in the bottom-right corner. Click to toggle a help panel.
 * Can also reset the welcome modal and tip banners.
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle, X, Command, Lightbulb, RotateCcw,
  Keyboard, Zap, Brain, MessageSquare, BarChart3,
} from "lucide-react";
import { toast } from "sonner";

const shortcuts = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["Esc"], label: "Close dialogs / panels" },
];

const quickTips = [
  {
    icon: Lightbulb,
    text: "Hover any label with a dotted underline to see the original technical term.",
    color: "text-amber-500",
  },
  {
    icon: Zap,
    text: "Click \"Run\" on any AI assistant card to generate real-time analysis.",
    color: "text-primary",
  },
  {
    icon: Brain,
    text: "The Competitive Sims page lets you simulate matchups against TTD, Roku, etc.",
    color: "text-violet-500",
  },
  {
    icon: MessageSquare,
    text: "Buyer Roleplay simulates a real CTV sales conversation with AI personas.",
    color: "text-emerald-500",
  },
  {
    icon: BarChart3,
    text: "The Insights page pulls AI analysis from Gong, pipeline, and market data.",
    color: "text-amber-500",
  },
];

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const resetOnboarding = () => {
    try {
      // Reset welcome modal
      localStorage.removeItem("ctv-welcome-seen-v3");
      localStorage.removeItem("ctv-welcome-seen-v2");
      // Reset all tip banners
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("tip-dismissed-")) {
          localStorage.removeItem(key);
        }
      });
      toast.success("Onboarding reset", {
        description: "Refresh the page to see the welcome guide and all tips again.",
      });
      setOpen(false);
    } catch { /* ignore */ }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-white border border-black/[0.08] shadow-lg shadow-black/[0.08] flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        title="Help & Tips"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-4.5 h-4.5 text-foreground/50" />
            </motion.div>
          ) : (
            <motion.div key="help" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <HelpCircle className="w-4.5 h-4.5 text-foreground/50" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-20 right-6 z-50 w-[320px] bg-white rounded-2xl border border-black/[0.08] shadow-2xl shadow-black/[0.12] overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-black/[0.05]">
              <div className="text-[14px] font-semibold text-foreground">Help & Tips</div>
              <div className="text-[11px] text-foreground/40 mt-0.5">Quick reference for the CTV AI Engine</div>
            </div>

            {/* Keyboard shortcuts */}
            <div className="px-5 py-3 border-b border-black/[0.04]">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-foreground/30 uppercase tracking-wider mb-2">
                <Keyboard className="w-3 h-3" />
                Keyboard Shortcuts
              </div>
              <div className="space-y-1.5">
                {shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[12px] text-foreground/55">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/[0.04] border border-black/[0.08] text-foreground/50"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick tips */}
            <div className="px-5 py-3 border-b border-black/[0.04] max-h-[240px] overflow-y-auto">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-foreground/30 uppercase tracking-wider mb-2">
                <Lightbulb className="w-3 h-3" />
                Quick Tips
              </div>
              <div className="space-y-2">
                {quickTips.map((tip, i) => {
                  const Icon = tip.icon;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${tip.color}`} />
                      <span className="text-[11px] text-foreground/50 leading-relaxed">{tip.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reset onboarding */}
            <div className="px-5 py-3">
              <button
                onClick={resetOnboarding}
                className="flex items-center gap-2 text-[11px] text-foreground/35 hover:text-foreground/55 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset onboarding (show welcome & tips again)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
