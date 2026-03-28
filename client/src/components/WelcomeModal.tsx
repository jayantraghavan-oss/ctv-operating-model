/**
 * WelcomeModal — First-visit onboarding modal with quick-start guide.
 * Shows once on first visit, then stores dismissed state in localStorage.
 * Apple-style: clean, inviting, with clear action steps.
 * Includes keyboard shortcut tips and glossary hint.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Zap, Brain, MessageSquare, BarChart3, ArrowRight, Sparkles,
  Command, Lightbulb, HelpCircle,
} from "lucide-react";

const WELCOME_KEY = "ctv-welcome-seen-v3";
const MOLOCO_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663459898851/Wr22fCMnjpJGgmtKZSL2hG/moloco-logo-blue_486481be.png";

const quickStartSteps = [
  {
    icon: Zap,
    title: "Run AI Assistants",
    description: "Click any assistant to generate real-time analysis, insights, and recommendations powered by AI. Look for the \"Run\" button on any card.",
    color: "text-primary",
    bg: "bg-primary/8",
    hint: "Tip: Start from the Dashboard or AI Assistants page",
  },
  {
    icon: Brain,
    title: "Explore Competitive Scenarios",
    description: "Simulate head-to-head matchups against competitors with AI-generated strategy and talking points.",
    color: "text-violet-600",
    bg: "bg-violet-500/8",
    hint: "Tip: Choose a competitor, then click \"Run Scenario\"",
  },
  {
    icon: MessageSquare,
    title: "Practice with Buyer Roleplay",
    description: "Rehearse your pitch against AI-powered CTV buyer personas with realistic objections and scoring.",
    color: "text-emerald-600",
    bg: "bg-emerald-500/8",
    hint: "Tip: Enable \"Auto-Play\" to watch the conversation unfold",
  },
  {
    icon: BarChart3,
    title: "Review Insights",
    description: "Get AI-powered analysis of Gong call signals, pipeline health, and market intelligence.",
    color: "text-amber-600",
    bg: "bg-amber-500/8",
    hint: "Tip: Switch between Gong, Pipeline, and Market tabs",
  },
  {
    icon: Command,
    title: "Keyboard Shortcuts & Tips",
    description: "Press ⌘K (or Ctrl+K) anytime to open the command palette — search assistants, navigate pages, and run actions instantly.",
    color: "text-foreground/70",
    bg: "bg-foreground/5",
    hint: "Tip: Hover labels with dotted underlines to see technical terms",
  },
];

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(WELCOME_KEY);
      if (!seen) {
        // Small delay so the page loads first
        const timer = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(timer);
      }
    } catch { /* ignore */ }
  }, []);

  const handleClose = () => {
    setOpen(false);
    try {
      localStorage.setItem(WELCOME_KEY, "true");
    } catch { /* ignore */ }
  };

  const handleNext = () => {
    if (step < quickStartSteps.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <img src={MOLOCO_LOGO} alt="Moloco" className="w-10 h-10 object-contain" />
            <div>
              <DialogTitle className="text-[18px] font-bold tracking-tight text-foreground">
                Welcome to CTV AI Engine
              </DialogTitle>
              <DialogDescription className="text-[13px] text-foreground/45 mt-0.5">
                Your AI-powered CTV sales enablement platform
              </DialogDescription>
            </div>
          </div>

          <div className="text-[14px] text-foreground/60 leading-relaxed">
            This system has <span className="font-semibold text-foreground">200 AI assistants</span> organized across 4 modules to help you with deal prep, competitive analysis, and strategic insights. Here's how to get started:
          </div>
        </div>

        {/* Steps */}
        <div className="px-8 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex items-start gap-4 p-4 rounded-2xl bg-black/[0.02] border border-black/[0.04]"
            >
              <div className={`w-10 h-10 rounded-xl ${quickStartSteps[step].bg} flex items-center justify-center shrink-0`}>
                {(() => {
                  const Icon = quickStartSteps[step].icon;
                  return <Icon className={`w-5 h-5 ${quickStartSteps[step].color}`} />;
                })()}
              </div>
              <div>
                <div className="text-[14px] font-semibold text-foreground mb-1">
                  {quickStartSteps[step].title}
                </div>
                <div className="text-[13px] text-foreground/55 leading-relaxed">
                  {quickStartSteps[step].description}
                </div>
                {quickStartSteps[step].hint && (
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-foreground/35">
                    <Lightbulb className="w-3 h-3" />
                    {quickStartSteps[step].hint}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {quickStartSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === step ? "bg-primary w-6" : "bg-foreground/15 hover:bg-foreground/25"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Glossary hint */}
        <div className="mx-8 mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-[11px] text-amber-700 leading-relaxed">
            <span className="font-semibold">New to the system?</span> Look for{" "}
            <span className="border-b border-dashed border-amber-400">dotted underlines</span>{" "}
            on labels — hover them to see the original technical terms. Dismissible tips appear on each page with helpful context.
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="text-[13px] text-foreground/35 hover:text-foreground/55 font-medium transition-colors"
          >
            Skip intro
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-foreground/25 font-mono">
              {step + 1}/{quickStartSteps.length}
            </span>
            <Button
              onClick={handleNext}
              className="rounded-xl px-5 py-2.5 text-[13px] font-semibold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {step < quickStartSteps.length - 1 ? (
                <span className="flex items-center gap-2">
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Get Started
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
