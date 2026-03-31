/**
 * Reporting — Interactive CTV Business Intelligence Dashboard.
 *
 * Five sections:
 *   1. Revenue / Pipeline Tracker ($10M target)
 *   2. Voice of Customer (Gong themes, objections, sentiment)
 *   3. Rep Pulse (Slack sentiment, morale, training gaps)
 *   4. GTM Funnel (Pre-Pitch → Pitch → Onboarding → Test → Scale)
 *   5. Campaign Health (live campaigns, alerts, test-to-scale)
 *
 * Apple-style: white bg, glassy panels, soft shadows, polished typography.
 */
import NeuralShell from "@/components/NeuralShell";
import { trpcQuery } from "@/lib/trpcFetch";
import { useState, useEffect, useMemo } from "react";
import {
  DollarSign, TrendingUp, Users, BarChart3, Activity,
  MessageSquare, Target, Shield, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, RefreshCw, Zap, Radio, Heart,
  ArrowUpRight, ArrowDownRight, Minus, ThumbsUp, ThumbsDown,
  Megaphone, Layers, Clock, ExternalLink, SlidersHorizontal, Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line,
  Legend, AreaChart, Area,
} from "recharts";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

// ============================================================================
// TYPES (mirrors server/reporting.ts)
// ============================================================================

interface LiveDataStatus {
  slackConnected: boolean;
  gongConnected: boolean;
  salesforceConnected: boolean;
  speedboatConnected: boolean;
  lastRefreshed: string;
  nextRefreshIn: number;
  channelsMonitored: string[];
  bqQueryPattern: {
    tables: string[];
    ctvFilter: string;
    topPlatforms: string[];
  } | null;
}

interface InsightsReport {
  generatedAt: number;
  revenue: any;
  voiceOfCustomer: any;
  repPulse: any;
  gtmFunnel: any;
  campaignHealth: any;
  executiveSummary: string;
  keyRisks: string[];
  keyWins: string[];
  recommendations: string[];
  liveDataStatus?: LiveDataStatus;
}

// ============================================================================
// SECTION NAV
// ============================================================================

interface Section {
  id: string;
  label: string;
  icon: typeof DollarSign;
}

const SECTIONS: Section[] = [
  { id: "revenue", label: "Revenue Tracker", icon: DollarSign },
  { id: "customer", label: "Voice of Customer", icon: MessageSquare },
  { id: "reps", label: "Rep Pulse", icon: Heart },
  { id: "funnel", label: "GTM Funnel", icon: Layers },
  { id: "campaigns", label: "Campaign Health", icon: Activity },
];

// ============================================================================
// COLORS
// ============================================================================

const MOLOCO_BLUE = "#0091FF";
const EMERALD = "#34d399";
const AMBER = "#fbbf24";
const ROSE = "#f87171";
const VIOLET = "#a78bfa";
const SLATE = "#94a3b8";

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  color = "text-foreground",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof DollarSign;
  trend?: "up" | "down" | "flat";
  color?: string;
}) {
  return (
    <motion.div
      className="glass rounded-2xl p-5 flex flex-col gap-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-semibold tracking-tight ${color}`}>{value}</span>
        {trend && (
          <span className={`flex items-center text-xs font-medium ${
            trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-500" : "text-muted-foreground"
          }`}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : trend === "down" ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </span>
        )}
      </div>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </motion.div>
  );
}

function SectionHeader({
  id,
  title,
  icon: Icon,
  description,
  children,
}: {
  id: string;
  title: string;
  icon: typeof DollarSign;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div id={`section-${id}`} className="scroll-mt-20 mb-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const colors = {
    high: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors[level]}`}>
      {level} confidence
    </span>
  );
}

function SentimentDot({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const colors = {
    positive: "bg-emerald-500",
    neutral: "bg-amber-400",
    negative: "bg-rose-500",
  };
  return <span className={`w-2 h-2 rounded-full ${colors[sentiment]} inline-block`} />;
}

function ProgressRing({ value, max, size = 120, strokeWidth = 10, color = MOLOCO_BLUE }: {
  value: number; max: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="oklch(0 0 0 / 0.06)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground">{pct}%</span>
        <span className="text-[10px] text-muted-foreground">of target</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Reporting() {
  const [report, setReport] = useState<InsightsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("revenue");
  const [expandedCampaign, setExpandedCampaign] = useState<number | null>(null);

  // Filters
  const [timeRange, setTimeRange] = useState<"30d" | "60d" | "90d" | "ytd">("ytd");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch report data
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await trpcQuery<InsightsReport>("reporting.insights");
      setReport(data);
    } catch (e: any) {
      setError(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  const [refreshCountdown, setRefreshCountdown] = useState(300);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  useEffect(() => { fetchReport(); }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          fetchReport();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAutoRefresh]);

  // Scroll to section
  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <NeuralShell>
        <div className="flex items-center justify-center h-96">
          <motion.div className="flex flex-col items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="relative">
              <div className="w-10 h-10 border-2 border-primary/20 rounded-full" />
              <div className="absolute inset-0 w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Aggregating live data...</span>
            <span className="text-xs text-muted-foreground/60">Slack channels, Gong, Salesforce, Speedboat</span>
          </motion.div>
        </div>
      </NeuralShell>
    );
  }

  if (error || !report) {
    return (
      <NeuralShell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium mb-1">Unable to load report</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <button onClick={fetchReport} className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        </div>
      </NeuralShell>
    );
  }

  const { revenue, voiceOfCustomer: voc, repPulse, gtmFunnel, campaignHealth } = report;

  return (
    <NeuralShell>
      <div className="p-4 lg:p-8 max-w-[1400px] mx-auto">
        {/* ── Page Header ── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Business Intelligence</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live reporting across revenue, customer voice, rep pulse, and campaign health
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live data source indicators */}
            {report.liveDataStatus && (
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${report.liveDataStatus.slackConnected ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                <span className="text-[10px] text-muted-foreground/60">Slack</span>
                <span className={`w-1.5 h-1.5 rounded-full ${report.liveDataStatus.gongConnected ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span className="text-[10px] text-muted-foreground/60">Gong</span>
                <span className={`w-1.5 h-1.5 rounded-full ${report.liveDataStatus.salesforceConnected ? "bg-emerald-500" : "bg-gray-300"}`} />
                <span className="text-[10px] text-muted-foreground/60">SFDC</span>
              </div>
            )}
            <div className="h-3 w-px bg-border/40" />
            <span className="text-[10px] text-muted-foreground/60">
              Updated {new Date(report.generatedAt).toLocaleTimeString()}
            </span>
            {isAutoRefresh && (
              <span className="text-[10px] text-muted-foreground/40">
                Next in {Math.floor(refreshCountdown / 60)}:{String(refreshCountdown % 60).padStart(2, "0")}
              </span>
            )}
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                isAutoRefresh
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-muted/40 text-muted-foreground border-border/40"
              }`}
            >
              {isAutoRefresh ? "Auto" : "Manual"}
            </button>
            <button
              onClick={() => { fetchReport(); setRefreshCountdown(300); }}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Executive Summary ── */}
        <motion.div
          className="glass rounded-2xl p-5 mb-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <p className="text-sm text-foreground leading-relaxed">{report.executiveSummary}</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {report.keyWins.length > 0 && (
              <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
                <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Key Wins
                </div>
                {report.keyWins.slice(0, 3).map((w: string, i: number) => (
                  <p key={i} className="text-xs text-emerald-800 mb-1 leading-snug">{w}</p>
                ))}
              </div>
            )}
            {report.keyRisks.length > 0 && (
              <div className="rounded-xl bg-rose-50/60 border border-rose-100 p-3">
                <div className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Key Risks
                </div>
                {report.keyRisks.slice(0, 3).map((r: string, i: number) => (
                  <p key={i} className="text-xs text-rose-800 mb-1 leading-snug">{r}</p>
                ))}
              </div>
            )}
            {report.recommendations.length > 0 && (
              <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3">
                <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Recommendations
                </div>
                {report.recommendations.slice(0, 3).map((r: string, i: number) => (
                  <p key={i} className="text-xs text-blue-800 mb-1 leading-snug">{r}</p>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Section Nav + Filters (sticky) ── */}
        <div className="sticky top-0 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 bg-background/80 backdrop-blur-xl border-b border-border/40 mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    activeSection === s.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <s.icon className="w-3 h-3" />
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                showFilters || timeRange !== "ytd" || regionFilter !== "all" || segmentFilter !== "all"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Filters
              {(timeRange !== "ytd" || regionFilter !== "all" || segmentFilter !== "all") && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 pt-3 mt-3 border-t border-border/30">
                  {/* Time Range */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">Period</span>
                    <div className="flex gap-0.5 bg-muted/40 rounded-lg p-0.5">
                      {(["30d", "60d", "90d", "ytd"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTimeRange(t)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                            timeRange === t
                              ? "bg-white text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {t === "ytd" ? "YTD" : t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Region */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">Region</span>
                    <select
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value)}
                      className="text-[11px] bg-white border border-border/50 rounded-lg px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 appearance-none cursor-pointer"
                    >
                      <option value="all">All Regions</option>
                      <option value="AMER">AMER</option>
                      <option value="EMEA">EMEA</option>
                      <option value="APAC">APAC</option>
                    </select>
                  </div>

                  {/* Segment / Vertical */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">Segment</span>
                    <select
                      value={segmentFilter}
                      onChange={(e) => setSegmentFilter(e.target.value)}
                      className="text-[11px] bg-white border border-border/50 rounded-lg px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 appearance-none cursor-pointer"
                    >
                      <option value="all">All Segments</option>
                      <option value="Gaming">Gaming</option>
                      <option value="E-Commerce">E-Commerce</option>
                      <option value="Streaming">Streaming</option>
                      <option value="Fintech">Fintech</option>
                    </select>
                  </div>

                  {/* Reset */}
                  {(timeRange !== "ytd" || regionFilter !== "all" || segmentFilter !== "all") && (
                    <button
                      onClick={() => { setTimeRange("ytd"); setRegionFilter("all"); setSegmentFilter("all"); }}
                      className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors ml-auto"
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active filter context */}
        {(timeRange !== "ytd" || regionFilter !== "all" || segmentFilter !== "all") && (
          <div className="flex items-center gap-2 mb-4 text-[11px] text-muted-foreground">
            <Filter className="w-3 h-3" />
            <span>Showing:</span>
            {timeRange !== "ytd" && (
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                Last {timeRange}
              </span>
            )}
            {regionFilter !== "all" && (
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                {regionFilter}
              </span>
            )}
            {segmentFilter !== "all" && (
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                {segmentFilter}
              </span>
            )}
            <span className="text-muted-foreground/50 italic">Filter applied to all sections below</span>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECTION 1: REVENUE TRACKER                                     */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          id="revenue"
          title="Revenue Tracker"
          icon={DollarSign}
          description={`$${(revenue.annualTarget / 1_000_000).toFixed(0)}M annual target — tracking closed-won, weighted pipeline, and run rate`}
        >
          <ConfidenceBadge level={revenue.confidence} />
        </SectionHeader>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard
            label="Closed Won"
            value={`$${(revenue.closedWon / 1_000_000).toFixed(1)}M`}
            sub={`${Math.round((revenue.closedWon / revenue.annualTarget) * 100)}% of target`}
            icon={CheckCircle2}
            trend="up"
            color="text-emerald-600"
          />
          <MetricCard
            label="Weighted Pipeline"
            value={`$${(revenue.pipelineWeighted / 1_000_000).toFixed(1)}M`}
            sub={`$${(revenue.pipelineTotal / 1_000_000).toFixed(1)}M total`}
            icon={TrendingUp}
            trend="up"
            color="text-primary"
          />
          <MetricCard
            label="Run Rate"
            value={`$${(revenue.runRate / 1_000_000).toFixed(1)}M`}
            sub={revenue.onTrack ? "On track" : "Below pace"}
            icon={BarChart3}
            trend={revenue.onTrack ? "up" : "down"}
            color={revenue.onTrack ? "text-emerald-600" : "text-amber-600"}
          />
          <MetricCard
            label="Gap to Target"
            value={`$${(revenue.gapToTarget / 1_000_000).toFixed(1)}M`}
            sub="Remaining to close"
            icon={Target}
            color="text-rose-500"
          />
        </div>

        {/* Revenue chart + ring */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Monthly trend chart */}
          <div className="lg:col-span-2 glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Monthly Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue.monthlyTrend}>
                <defs>
                  <linearGradient id="closedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={EMERALD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={EMERALD} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pipeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={MOLOCO_BLUE} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={MOLOCO_BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(v: any) => [`$${(Number(v) / 1_000_000).toFixed(2)}M`, ""]}
                />
                <Area type="monotone" dataKey="closed" stroke={EMERALD} fill="url(#closedGrad)" strokeWidth={2} name="Closed" />
                <Area type="monotone" dataKey="pipeline" stroke={MOLOCO_BLUE} fill="url(#pipeGrad)" strokeWidth={2} name="Pipeline" />
                <Line type="monotone" dataKey="target" stroke={ROSE} strokeWidth={1.5} strokeDasharray="6 3" dot={false} name="Target" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Progress ring + stage breakdown */}
          <div className="glass rounded-2xl p-5 flex flex-col items-center">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 self-start">Target Attainment</h3>
            <ProgressRing value={revenue.closedWon + revenue.pipelineWeighted} max={revenue.annualTarget} />
            <div className="w-full mt-4 space-y-2">
              {revenue.byStage.slice(0, 5).map((s: any) => (
                <div key={s.stage} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{s.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground">{s.count}</span>
                    <span className="font-mono text-muted-foreground/60">${(s.weightedValue / 1_000_000).toFixed(1)}M</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Region + Vertical breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">By Region</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={revenue.byRegion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.06)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                <YAxis dataKey="region" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(v: any) => [`$${(Number(v) / 1_000_000).toFixed(2)}M`, ""]} />
                <Bar dataKey="pipeline" fill={MOLOCO_BLUE} radius={[0, 6, 6, 0]} name="Pipeline" />
                <Bar dataKey="closed" fill={EMERALD} radius={[0, 6, 6, 0]} name="Closed" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">By Vertical</h3>
            <div className="space-y-3">
              {revenue.byVertical.map((v: any) => {
                const pct = revenue.pipelineTotal > 0 ? Math.round((v.pipeline / revenue.pipelineTotal) * 100) : 0;
                return (
                  <div key={v.vertical}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-foreground font-medium">{v.vertical}</span>
                      <span className="text-muted-foreground">{v.deals} deals &middot; ${(v.pipeline / 1_000_000).toFixed(1)}M</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECTION 2: VOICE OF CUSTOMER                                   */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          id="customer"
          title="Voice of Customer"
          icon={MessageSquare}
          description={`${voc.totalCalls} Gong calls analyzed over ${voc.period} — themes, objections, competitor mentions`}
        />

        {/* Sentiment gauge */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Positive", value: voc.sentimentBreakdown.positive, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Neutral", value: voc.sentimentBreakdown.neutral, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Negative", value: voc.sentimentBreakdown.negative, color: "text-rose-600", bg: "bg-rose-50" },
          ].map((s) => {
            const pct = voc.totalCalls > 0 ? Math.round((s.value / voc.totalCalls) * 100) : 0;
            return (
              <motion.div
                key={s.label}
                className={`glass rounded-2xl p-4 text-center`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
              >
                <div className={`text-2xl font-bold ${s.color}`}>{pct}%</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                <div className="text-[10px] text-muted-foreground/60">{s.value} calls</div>
              </motion.div>
            );
          })}
        </div>

        {/* Themes + Objections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Themes</h3>
            <div className="space-y-2.5">
              {voc.topThemes.slice(0, 6).map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      t.trend === "up" ? "bg-emerald-500" : t.trend === "down" ? "bg-rose-500" : "bg-amber-400"
                    }`} />
                    <span className="text-xs text-foreground">{t.theme}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{t.count} calls</span>
                    {t.trend === "up" ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> :
                     t.trend === "down" ? <ArrowDownRight className="w-3 h-3 text-rose-500" /> :
                     <Minus className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Objections</h3>
            <div className="space-y-2.5">
              {voc.objections.slice(0, 6).map((o: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground">{o.objection}</span>
                    <span className="font-mono text-muted-foreground">{o.frequency}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${o.winRateWhenRaised}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{o.winRateWhenRaised}% win rate</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Competitor mentions + Pitch learnings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Competitor Mentions</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={voc.competitorMentions.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.06)" />
                <XAxis dataKey="competitor" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="count" fill={VIOLET} radius={[6, 6, 0, 0]} name="Mentions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pitch Learnings</h3>
            <div className="space-y-2.5">
              {voc.pitchLearnings.map((l: any, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${l.actionable ? "bg-primary" : "bg-muted-foreground/40"}`} />
                  <div>
                    <p className="text-xs text-foreground leading-snug">{l.learning}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{l.source} &middot; {l.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECTION 3: REP PULSE                                           */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          id="reps"
          title="Rep Pulse"
          icon={Heart}
          description={`${repPulse.activeReps}/${repPulse.totalReps} active reps — morale, activity, Slack sentiment, training gaps`}
        />

        {/* Rep KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard label="Active Reps" value={`${repPulse.activeReps}/${repPulse.totalReps}`} icon={Users} color="text-primary" />
          <MetricCard label="Avg Calls/Week" value={repPulse.avgCallsPerWeek} icon={Radio} color="text-violet-600" />
          <MetricCard label="Avg Deal Cycle" value={`${repPulse.avgDealCycledays}d`} icon={Clock} color="text-amber-600" />
          <MetricCard
            label="Team Morale"
            value={repPulse.morale.charAt(0).toUpperCase() + repPulse.morale.slice(1)}
            icon={Heart}
            color={repPulse.morale === "high" ? "text-emerald-600" : repPulse.morale === "medium" ? "text-amber-600" : "text-rose-500"}
          />
        </div>

        {/* Morale signals + Activity trend */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Morale Signals</h3>
            <div className="space-y-3">
              {repPulse.moraleSignals.map((s: any, i: number) => (
                <div key={i} className="flex items-start gap-2.5">
                  <SentimentDot sentiment={s.sentiment} />
                  <div>
                    <p className="text-xs text-foreground leading-snug">{s.signal}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.source}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={repPulse.activityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.06)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="calls" fill={MOLOCO_BLUE} radius={[4, 4, 0, 0]} name="Calls" />
                <Bar dataKey="meetings" fill={EMERALD} radius={[4, 4, 0, 0]} name="Meetings" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Slack sentiment + Training gaps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Slack Channel Sentiment</h3>
            <div className="space-y-3">
              {repPulse.slackSentiment.map((s: any, i: number) => (
                <div key={i} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono text-foreground">{s.channel}</span>
                    <div className="flex items-center gap-1.5">
                      <SentimentDot sentiment={s.sentiment} />
                      <span className="text-[10px] text-muted-foreground">{s.messageCount} msgs</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.topTopics.map((t: string, j: number) => (
                      <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Training Gaps</h3>
            <div className="space-y-3">
              {repPulse.trainingGaps.map((g: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      g.priority === "high" ? "bg-rose-500" : g.priority === "medium" ? "bg-amber-400" : "bg-muted-foreground/40"
                    }`} />
                    <span className="text-xs text-foreground truncate">{g.topic}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-muted-foreground">{g.repsNeedingTraining} reps</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      g.priority === "high" ? "bg-rose-50 text-rose-700 border-rose-200" :
                      g.priority === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-muted text-muted-foreground border-border"
                    }`}>{g.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECTION 4: GTM FUNNEL                                          */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          id="funnel"
          title="GTM Funnel"
          icon={Layers}
          description="Pre-Pitch → Pitch → Onboarding → Test → Scale — conversion rates and bottlenecks"
        >
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            gtmFunnel.funnelHealth === "healthy" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            gtmFunnel.funnelHealth === "bottleneck" ? "bg-amber-50 text-amber-700 border-amber-200" :
            "bg-rose-50 text-rose-700 border-rose-200"
          }`}>
            {gtmFunnel.funnelHealth}
          </span>
        </SectionHeader>

        {/* Funnel visualization */}
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="space-y-3">
            {gtmFunnel.stages.map((s: any, i: number) => {
              const maxValue = Math.max(...gtmFunnel.stages.map((st: any) => st.value || 1));
              const widthPct = maxValue > 0 ? Math.max(15, (s.value / maxValue) * 100) : 15;
              const isBottleneck = s.name === gtmFunnel.bottleneckStage;
              return (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, ...spring }}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-medium text-foreground w-40 shrink-0">{s.name}</span>
                    <div className="flex-1 h-8 bg-muted/40 rounded-lg overflow-hidden relative">
                      <motion.div
                        className={`h-full rounded-lg ${isBottleneck ? "bg-amber-400" : "bg-primary/80"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                      />
                      <div className="absolute inset-0 flex items-center px-3 justify-between">
                        <span className="text-[11px] font-medium text-white mix-blend-difference">{s.count} deals</span>
                        <span className="text-[11px] font-mono text-white mix-blend-difference">${(s.value / 1_000_000).toFixed(1)}M</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-14 text-right">{Math.round(s.conversionRate * 100)}%</span>
                  </div>
                  {isBottleneck && (
                    <div className="ml-40 pl-3 text-[10px] text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Bottleneck — conversion below threshold
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Funnel metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="glass rounded-2xl p-5 text-center">
            <div className="text-2xl font-bold text-primary">{Math.round(gtmFunnel.testToScaleRate * 100)}%</div>
            <div className="text-xs text-muted-foreground mt-1">Test-to-Scale Rate</div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">Avg test: {gtmFunnel.avgTestDuration} days</div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Customer Personas</h3>
            {gtmFunnel.customerPersonas.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                <span className="text-foreground">{p.persona}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-muted-foreground">{p.count}</span>
                  <span className="font-mono text-emerald-600">{Math.round(p.winRate * 100)}% win</span>
                </div>
              </div>
            ))}
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Funnel Insights</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>CTV-experienced (performance) advertisers convert at <strong className="text-foreground">2.25x</strong> the rate of CTV-new prospects.</p>
              <p>Average time in Pitch stage: <strong className="text-foreground">21 days</strong> — consider accelerating with standardized global deck.</p>
              <p>Test-to-scale stall risk: proactively align on evergreen criteria before 4-week test ends.</p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECTION 5: CAMPAIGN HEALTH                                     */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          id="campaigns"
          title="Campaign Health"
          icon={Activity}
          description={`${campaignHealth.activeCampaigns} active campaigns — health scores, alerts, test-to-scale tracking`}
        />

        {/* Campaign KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard label="Active" value={campaignHealth.activeCampaigns} icon={Activity} color="text-primary" />
          <MetricCard label="In Test" value={campaignHealth.inTest} icon={Zap} color="text-amber-600" />
          <MetricCard label="Scaled" value={campaignHealth.scaled} icon={TrendingUp} color="text-emerald-600" />
          <MetricCard label="Avg Health" value={`${campaignHealth.avgHealthScore}/100`} icon={Shield} color={campaignHealth.avgHealthScore >= 70 ? "text-emerald-600" : "text-amber-600"} />
        </div>

        {/* Alerts */}
        {campaignHealth.alerts.length > 0 && (
          <div className="glass rounded-2xl p-5 mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Campaign Alerts</h3>
            <div className="space-y-2">
              {campaignHealth.alerts.map((a: any, i: number) => (
                <div
                  key={i}
                  className={`rounded-xl border p-3 flex items-start gap-2.5 ${
                    a.type === "success" ? "bg-emerald-50/60 border-emerald-200" :
                    a.type === "warning" ? "bg-amber-50/60 border-amber-200" :
                    "bg-rose-50/60 border-rose-200"
                  }`}
                >
                  {a.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" /> :
                   a.type === "warning" ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" /> :
                   <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />}
                  <div>
                    <p className="text-xs text-foreground">{a.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{a.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign list */}
        <div className="glass rounded-2xl overflow-hidden mb-10">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Campaigns</h3>
          </div>
          <div className="divide-y divide-border/40">
            {campaignHealth.campaigns.map((c: any, i: number) => (
              <div key={i}>
                <button
                  onClick={() => setExpandedCampaign(expandedCampaign === i ? null : i)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      c.stage === "scaling" || c.stage === "evergreen" ? "bg-emerald-500" :
                      c.stage === "test" ? "bg-amber-400" :
                      c.stage === "at-risk" ? "bg-rose-500" : "bg-muted-foreground/40"
                    }`} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{c.customer}</div>
                      <div className="text-[10px] text-muted-foreground">{c.stage} &middot; {c.daysActive}d active</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-mono text-foreground">${(c.spend / 1000).toFixed(0)}K</div>
                      <div className="text-[10px] text-muted-foreground">KPI: {c.kpiPerformance}%</div>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      c.healthScore >= 80 ? "bg-emerald-100 text-emerald-700" :
                      c.healthScore >= 60 ? "bg-amber-100 text-amber-700" :
                      "bg-rose-100 text-rose-700"
                    }`}>
                      {c.healthScore}
                    </div>
                    {expandedCampaign === i ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </button>
                <AnimatePresence>
                  {expandedCampaign === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 pt-1 ml-5 border-l-2 border-border/40">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Spend</span>
                            <div className="font-mono text-foreground">${c.spend.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">KPI Performance</span>
                            <div className={`font-mono ${c.kpiPerformance >= 100 ? "text-emerald-600" : "text-amber-600"}`}>{c.kpiPerformance}% vs target</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sentiment</span>
                            <div className="flex items-center gap-1">
                              <SentimentDot sentiment={c.sentiment} />
                              <span className="text-foreground capitalize">{c.sentiment}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Next Step</span>
                            <div className="text-foreground">{c.nextStep}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer spacer ── */}
        <div className="h-16" />
      </div>
    </NeuralShell>
  );
}
