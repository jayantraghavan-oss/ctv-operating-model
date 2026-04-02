/*
 * WeeklyPrep — Auto-generated XFN Leadership Weekly
 * Pulls from all 4 modules to generate a pre-read for the weekly standup.
 * Data sourced from curated_intel DB (weekly_prep_* categories).
 */
import NeuralShell from "@/components/NeuralShell";
import { motion } from "framer-motion";
import { useAgent } from "@/contexts/AgentContext";
import { getTotalStats } from "@/lib/data";
import { useCuratedData, type CuratedRow } from "@/hooks/useCuratedData";
import {
  Calendar,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  FileText,
  Users,
  Target,
  Zap,
  ChevronDown,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";

const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

// ── Types ────────────────────────────────────────────────────────────────────

interface ModuleHighlight {
  moduleId: number;
  title: string;
  status: "green" | "yellow" | "red";
  keyInsight: string;
  actionItems: string[];
  metrics: Record<string, string | number>;
}

interface DiscussionItem {
  topic: string;
  owner: string;
  urgency: "high" | "medium" | "low";
  context: string;
}

interface LearningGoalUpdate {
  goal: string;
  direction: "up" | "down" | "flat";
  note: string;
}

// ── DB → UI Mappers ─────────────────────────────────────────────────────────

function toModuleHighlights(rows: CuratedRow[]): ModuleHighlight[] {
  return rows.map((r) => {
    let meta: any = {};
    try { meta = r.metadata ? (typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata) : {}; } catch { meta = {}; }
    return {
      moduleId: Number(r.value1) || 1,
      title: r.label,
      status: (r.text1 || "green") as "green" | "yellow" | "red",
      keyInsight: r.text2 || "",
      actionItems: meta.actionItems || [],
      metrics: meta.metrics || {},
    };
  });
}

function toDiscussionItems(rows: CuratedRow[]): DiscussionItem[] {
  return rows.map((r) => ({
    topic: r.label,
    owner: r.text1 || "",
    urgency: (r.text2 || "medium") as "high" | "medium" | "low",
    context: r.text3 || "",
  }));
}

function toLearningGoalUpdates(rows: CuratedRow[]): LearningGoalUpdate[] {
  return rows.map((r) => ({
    goal: r.label,
    direction: (r.text1 || "flat") as "up" | "down" | "flat",
    note: r.text2 || "",
  }));
}

// ── Badge Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "green" | "yellow" | "red" }) {
  const colors = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };
  const labels = { green: "On Track", yellow: "Needs Attention", red: "At Risk" };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: "high" | "medium" | "low" }) {
  const colors = {
    high: "bg-red-500 text-white",
    medium: "bg-amber-500 text-white",
    low: "bg-gray-400 text-white",
  };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colors[urgency]} uppercase`}>
      {urgency}
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function WeeklyPrep() {
  const { recentRuns, runAgent } = useAgent();
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [isRegenerating, setIsRegenerating] = useState(false);
  const stats = getTotalStats();

  // Pull all weekly prep categories from DB
  const { data: curatedData, loading } = useCuratedData([
    "weekly_prep_summary",
    "weekly_prep_module_highlight",
    "weekly_prep_discussion",
    "weekly_prep_decision",
    "weekly_prep_learning_goal",
  ]);

  // Transform DB rows into UI data
  const executiveSummary = useMemo(() => {
    const rows = curatedData.weekly_prep_summary || [];
    return rows.length > 0 ? rows[0].label : "";
  }, [curatedData]);

  const moduleHighlights = useMemo(
    () => toModuleHighlights(curatedData.weekly_prep_module_highlight || []),
    [curatedData],
  );

  const xfnDiscussionItems = useMemo(
    () => toDiscussionItems(curatedData.weekly_prep_discussion || []),
    [curatedData],
  );

  const keyDecisionsNeeded = useMemo(
    () => (curatedData.weekly_prep_decision || []).map((r) => r.label),
    [curatedData],
  );

  const learningGoalUpdates = useMemo(
    () => toLearningGoalUpdates(curatedData.weekly_prep_learning_goal || []),
    [curatedData],
  );

  const weekOf = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const generatedAt = new Date().toISOString();

  const toggleModule = (id: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    runAgent(168, "Generate weekly executive reports", 4, "XFN Leadership Weekly Preparation");
    setTimeout(() => setIsRegenerating(false), 3000);
  };

  if (loading) {
    return (
      <NeuralShell>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0091FF]" />
          <span className="ml-2 text-sm text-muted-foreground">Loading weekly prep...</span>
        </div>
      </NeuralShell>
    );
  }

  return (
    <NeuralShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1000px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Week of {weekOf}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              XFN Leadership Weekly
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-generated pre-read from all {stats.modules} modules · {stats.totalPrompts} agents
            </p>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-4 py-2 bg-[#0091FF] text-white text-sm font-medium rounded-lg hover:bg-[#0080E0] transition-colors disabled:opacity-60 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} />
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>

        {/* Auto-generated badge */}
        <motion.div {...fade} className="flex items-center gap-2 px-3 py-2 bg-[#0091FF]/5 border border-[#0091FF]/20 rounded-lg mb-6 text-xs">
          <Zap className="w-3.5 h-3.5 text-[#0091FF]" />
          <span className="text-[#0091FF] font-medium">Agent-generated</span>
          <span className="text-muted-foreground">
            · Last generated {new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            · Pulls from Modules 1-4, Gong, SFDC, Sensor Tower
          </span>
        </motion.div>

        {/* Executive Summary */}
        {executiveSummary && (
          <motion.div {...fade} transition={{ delay: 0.05 }} className="bg-white border border-border rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[#0091FF]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Executive Summary</h2>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{executiveSummary}</p>
          </motion.div>
        )}

        {/* Module Highlights */}
        {moduleHighlights.length > 0 && (
          <motion.div {...fade} transition={{ delay: 0.1 }} className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
              Module Highlights
            </h2>
            <div className="space-y-3">
              {moduleHighlights.map((mh) => (
                <div key={mh.moduleId} className="bg-white border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleModule(mh.moduleId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0091FF]/10 flex items-center justify-center text-[#0091FF] font-bold text-sm">
                        M{mh.moduleId}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">{mh.title}</div>
                      </div>
                      <StatusBadge status={mh.status} />
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        expandedModules.has(mh.moduleId) ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedModules.has(mh.moduleId) && (
                    <div className="px-4 pb-4 border-t border-border/50">
                      {/* Key Insight */}
                      <div className="mt-3 mb-3">
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Key Insight</div>
                        <p className="text-sm text-foreground/80">{mh.keyInsight}</p>
                      </div>

                      {/* Metrics */}
                      {Object.keys(mh.metrics).length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                          {Object.entries(mh.metrics).map(([key, val]) => (
                            <div key={key} className="bg-muted/50 rounded-lg px-3 py-2">
                              <div className="text-[10px] text-muted-foreground capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </div>
                              <div className="text-sm font-semibold mt-0.5">{val}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Items */}
                      {mh.actionItems.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5">Action Items</div>
                          <div className="space-y-1.5">
                            {mh.actionItems.map((item, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <ArrowRight className="w-3.5 h-3.5 text-[#0091FF] mt-0.5 shrink-0" />
                                <span className="text-foreground/80">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* XFN Discussion Items */}
        {xfnDiscussionItems.length > 0 && (
          <motion.div {...fade} transition={{ delay: 0.15 }} className="bg-white border border-border rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-[#0091FF]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">XFN Discussion Items</h2>
            </div>
            <div className="space-y-3">
              {xfnDiscussionItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="mt-0.5">
                    <UrgencyBadge urgency={item.urgency} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.topic}</div>
                    <div className="text-[11px] text-[#0091FF] font-medium mt-0.5">{item.owner}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.context}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Key Decisions Needed */}
        {keyDecisionsNeeded.length > 0 && (
          <motion.div {...fade} transition={{ delay: 0.2 }} className="bg-white border border-border rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Key Decisions Needed</h2>
            </div>
            <div className="space-y-2">
              {keyDecisionsNeeded.map((decision, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground/80">{decision}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Learning Goal Updates */}
        {learningGoalUpdates.length > 0 && (
          <motion.div {...fade} transition={{ delay: 0.25 }} className="bg-white border border-border rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-[#0091FF]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Learning Goal Updates</h2>
            </div>
            <div className="space-y-2">
              {learningGoalUpdates.map((lg, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    lg.direction === "up" ? "bg-emerald-100 text-emerald-600" :
                    lg.direction === "down" ? "bg-red-100 text-red-600" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    <TrendingUp className={`w-3.5 h-3.5 ${
                      lg.direction === "down" ? "rotate-180" : lg.direction === "flat" ? "rotate-0" : ""
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{lg.goal}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{lg.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Agent Activity */}
        {recentRuns.length > 0 && (
          <motion.div {...fade} transition={{ delay: 0.3 }} className="bg-white border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-[#0091FF]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Recent Agent Activity</h2>
            </div>
            <div className="space-y-2">
              {recentRuns.slice(0, 5).map((run) => (
                <div key={run.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    run.status === "running" ? "bg-amber-400 animate-pulse" :
                    run.status === "completed" ? "bg-emerald-400" : "bg-red-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">Prompt #{run.promptId}: {run.promptText.slice(0, 60)}...</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {new Date(run.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {run.status === "completed" && " · completed"}
                      {run.status === "running" && " · running..."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </NeuralShell>
  );
}
