/*
 * ConvictionDashboard — EOQ2 Decision Framework
 * Tracks learning goals, conviction strength, and generates go/no-go recommendation.
 * This is the strategic decision layer that feeds the investment decision.
 */
import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { useAgent } from "@/contexts/AgentContext";
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Plus,
  ChevronDown,
  Shield,
  Zap,
  BarChart3,
} from "lucide-react";
import { useState } from "react";

const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

function ConvictionBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const color =
    value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-[#0091FF]" : value >= 30 ? "bg-amber-500" : "bg-red-500";
  const h = size === "sm" ? "h-1.5" : "h-2.5";
  return (
    <div className={`w-full bg-muted rounded-full ${h} overflow-hidden`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`${h} rounded-full ${color}`}
      />
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "strong":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "moderate":
      return <TrendingUp className="w-4 h-4 text-[#0091FF]" />;
    case "weak":
      return <TrendingDown className="w-4 h-4 text-amber-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-red-500" />;
  }
}

function RecommendationCard({ recommendation, overall }: { recommendation: string; overall: number }) {
  const configs: Record<string, { bg: string; border: string; text: string; label: string; desc: string }> = {
    invest: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      label: "INVEST",
      desc: "Conviction is strong across learning goals. Recommend full investment and scaling.",
    },
    extend: {
      bg: "bg-[#0091FF]/5",
      border: "border-[#0091FF]/20",
      text: "text-[#0091FF]",
      label: "EXTEND",
      desc: "Conviction is building but not yet decisive. Recommend extending the test period with focused experiments on weak areas.",
    },
    pivot: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      label: "PIVOT",
      desc: "Multiple learning goals showing weak conviction. Consider pivoting strategy or reallocating resources.",
    },
    "insufficient-data": {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      label: "INSUFFICIENT DATA",
      desc: "Not enough evidence to make a confident decision. Accelerate data collection on critical learning goals.",
    },
  };
  const config = configs[recommendation] || configs["insufficient-data"];

  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">EOQ2 Recommendation</span>
        </div>
        <span className={`text-lg font-bold ${config.text}`}>{config.label}</span>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <div className="text-4xl font-bold">{overall}%</div>
        <div className="flex-1">
          <ConvictionBar value={overall} />
        </div>
      </div>
      <p className="text-sm text-foreground/70">{config.desc}</p>
    </div>
  );
}

export default function ConvictionDashboard() {
  const { convictionScore, updateConviction } = useAgent();
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [newEvidence, setNewEvidence] = useState<Record<string, string>>({});
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  const handleAddEvidence = (goalId: string) => {
    const evidence = newEvidence[goalId];
    const adjustment = adjustments[goalId];
    if (!evidence && adjustment === undefined) return;
    updateConviction(goalId, adjustment ?? convictionScore.goals.find((g) => g.id === goalId)!.conviction, evidence || "");
    setNewEvidence((prev) => ({ ...prev, [goalId]: "" }));
    setAdjustments((prev) => {
      const next = { ...prev };
      delete next[goalId];
      return next;
    });
  };

  // Group goals by status
  const strong = convictionScore.goals.filter((g) => g.status === "strong");
  const moderate = convictionScore.goals.filter((g) => g.status === "moderate");
  const weak = convictionScore.goals.filter((g) => g.status === "weak");
  const insufficient = convictionScore.goals.filter((g) => g.status === "insufficient");

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1000px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Conviction Scoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            EOQ2 Decision Framework — {convictionScore.goals.length} learning goals tracked
          </p>
        </div>

        {/* Agent-generated badge */}
        <motion.div {...fade} className="flex items-center gap-2 px-3 py-2 bg-[#0091FF]/5 border border-[#0091FF]/20 rounded-lg mb-6 text-xs">
          <Zap className="w-3.5 h-3.5 text-[#0091FF]" />
          <span className="text-[#0091FF] font-medium">Live tracking</span>
          <span className="text-muted-foreground">
            · Updated {new Date(convictionScore.lastUpdated).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            · Agents feed evidence, humans set conviction
          </span>
        </motion.div>

        {/* Recommendation Card */}
        <motion.div {...fade} transition={{ delay: 0.05 }} className="mb-6">
          <RecommendationCard
            recommendation={convictionScore.recommendation}
            overall={convictionScore.overall}
          />
        </motion.div>

        {/* Conviction Distribution */}
        <motion.div {...fade} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Strong", count: strong.length, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
            { label: "Moderate", count: moderate.length, color: "text-[#0091FF] bg-[#0091FF]/5 border-[#0091FF]/20" },
            { label: "Weak", count: weak.length, color: "text-amber-600 bg-amber-50 border-amber-200" },
            { label: "Insufficient", count: insufficient.length, color: "text-red-600 bg-red-50 border-red-200" },
          ].map((item) => (
            <div key={item.label} className={`border rounded-xl p-3 ${item.color}`}>
              <div className="text-2xl font-bold">{item.count}</div>
              <div className="text-xs font-medium mt-0.5">{item.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Learning Goals */}
        <motion.div {...fade} transition={{ delay: 0.15 }} className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Learning Goals
          </h2>
          <div className="space-y-3">
            {convictionScore.goals.map((goal) => (
              <div key={goal.id} className="bg-white border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <StatusIcon status={goal.status} />
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium leading-snug">{goal.question}</div>
                    <div className="mt-1.5">
                      <ConvictionBar value={goal.conviction} size="sm" />
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-lg font-bold">{goal.conviction}%</div>
                    <div className="text-[10px] text-muted-foreground capitalize">{goal.status}</div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${
                      expandedGoal === goal.id ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedGoal === goal.id && (
                  <div className="px-4 pb-4 border-t border-border/50">
                    {/* Evidence */}
                    <div className="mt-3 mb-4">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">Evidence Trail</div>
                      <div className="space-y-1.5">
                        {goal.evidence.map((ev, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <ArrowRight className="w-3.5 h-3.5 text-[#0091FF] mt-0.5 shrink-0" />
                            <span className="text-foreground/80">{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add evidence */}
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">Add Evidence</div>
                      <input
                        type="text"
                        value={newEvidence[goal.id] || ""}
                        onChange={(e) => setNewEvidence((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                        placeholder="New evidence or observation..."
                        className="w-full text-sm px-3 py-2 bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0091FF]/30 mb-2"
                      />
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <label className="text-xs text-muted-foreground whitespace-nowrap">Adjust conviction:</label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={adjustments[goal.id] ?? goal.conviction}
                            onChange={(e) => setAdjustments((prev) => ({ ...prev, [goal.id]: parseInt(e.target.value) }))}
                            className="flex-1 accent-[#0091FF]"
                          />
                          <span className="text-sm font-mono font-bold w-10 text-right">
                            {adjustments[goal.id] ?? goal.conviction}%
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddEvidence(goal.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0091FF] text-white text-xs font-medium rounded-lg hover:bg-[#0080E0] transition-colors shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          Update
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-muted-foreground font-mono">
                      Last updated: {new Date(goal.lastUpdated).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Decision Framework Context */}
        <motion.div {...fade} transition={{ delay: 0.2 }} className="bg-white border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[#0091FF]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Decision Framework</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="font-semibold text-emerald-700 mb-1">Invest (70%+)</div>
              <div className="text-xs text-emerald-600/80">Strong conviction across most goals. Scale investment, expand team, accelerate pipeline.</div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="font-semibold text-blue-700 mb-1">Extend (50-69%)</div>
              <div className="text-xs text-blue-600/80">Building conviction but gaps remain. Continue with focused experiments on weak areas.</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <div className="font-semibold text-amber-700 mb-1">Pivot (30-49%)</div>
              <div className="text-xs text-amber-600/80">Multiple weak signals. Consider strategy pivot or resource reallocation.</div>
            </div>
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <div className="font-semibold text-red-700 mb-1">Insufficient (&lt;30%)</div>
              <div className="text-xs text-red-600/80">Not enough data. Accelerate evidence collection before making any decision.</div>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
