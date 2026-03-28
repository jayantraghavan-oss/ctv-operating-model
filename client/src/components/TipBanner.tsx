/**
 * TipBanner — A dismissible contextual tip banner for page-level guidance.
 * Stores dismissed state in localStorage so tips don't reappear.
 * Apple-style: subtle, glassy, with a lightbulb icon and smooth dismiss animation.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, X, Sparkles } from "lucide-react";

interface TipBannerProps {
  /** Unique ID for this tip (used for localStorage persistence) */
  tipId: string;
  /** The tip text to display */
  children: React.ReactNode;
  /** Optional icon override */
  icon?: React.ReactNode;
  /** Optional variant for different visual styles */
  variant?: "default" | "welcome" | "action" | "info";
  /** Whether to show a sparkle animation for first-time emphasis */
  sparkle?: boolean;
}

const STORAGE_KEY = "ctv-dismissed-tips";

function getDismissedTips(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function dismissTip(tipId: string) {
  const dismissed = getDismissedTips();
  dismissed.add(tipId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(dismissed)));
  } catch { /* quota exceeded */ }
}

export function resetAllTips() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function TipBanner({ tipId, children, icon, variant = "default", sparkle = false }: TipBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = getDismissedTips();
    if (!dismissed.has(tipId)) {
      // Small delay for a nice entrance after page load
      const timer = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [tipId]);

  const handleDismiss = () => {
    setVisible(false);
    dismissTip(tipId);
  };

  const variantStyles = {
    default: "bg-primary/[0.04] border-primary/10 text-foreground/70",
    welcome: "bg-gradient-to-r from-primary/[0.06] to-violet-500/[0.04] border-primary/15 text-foreground/70",
    action: "bg-amber-500/[0.05] border-amber-500/15 text-foreground/70",
    info: "bg-blue-500/[0.04] border-blue-500/12 text-foreground/70",
  };

  const iconColor = {
    default: "text-primary/60",
    welcome: "text-primary",
    action: "text-amber-500",
    info: "text-blue-500/70",
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="overflow-hidden"
        >
          <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl border ${variantStyles[variant]} backdrop-blur-sm`}>
            <div className={`shrink-0 mt-0.5 ${iconColor[variant]}`}>
              {icon || (sparkle ? (
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: 2, repeatType: "reverse" }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
              ) : (
                <Lightbulb className="w-4 h-4" />
              ))}
            </div>
            <div className="flex-1 text-[13px] leading-relaxed">{children}</div>
            <button
              onClick={handleDismiss}
              className="shrink-0 p-1 rounded-lg text-foreground/20 hover:text-foreground/40 hover:bg-black/[0.04] transition-colors"
              aria-label="Dismiss tip"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
