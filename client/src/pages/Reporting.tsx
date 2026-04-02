/**
 * Reporting — CTV Strategic Intelligence
 *
 * Organized around 4 strategic questions:
 *   Q1: Are we on track to hit $100M ARR?
 *   Q2: What are our customers actually telling us?
 *   Q3: What separates winning behaviors from losing ones?
 *   Q4: How are we positioned in the market?
 *
 * Apple-style: white bg, glassy panels, soft shadows, honest data maturity caveats.
 */
import NeuralShell from "@/components/NeuralShell";
import { trpcQuery } from "@/lib/trpcFetch";
import { useState, useEffect, useMemo } from "react";
import {
  DollarSign, TrendingUp, MessageSquare, Target,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  RefreshCw, ArrowUpRight, ArrowDownRight, Minus,
  Shield, Crosshair, Users, BarChart3, Info,
  ExternalLink, Award, XCircle, HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
  AreaChart, Area,
} from "recharts";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

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
// SECTION NAV
// ============================================================================

interface Section { id: string; label: string; question: string; icon: typeof DollarSign }

const SECTIONS: Section[] = [
  { id: "revenue", label: "Revenue & Pipeline", question: "Are we on track to hit $100M ARR?", icon: DollarSign },
  { id: "customer", label: "Customer Voice", question: "What are customers telling us?", icon: MessageSquare },
  { id: "patterns", label: "Win/Loss Patterns", question: "What separates winning from losing?", icon: Target },
  { id: "market", label: "Market Position", question: "How are we positioned?", icon: Crosshair },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function DataMaturityBadge({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 mb-6">
      <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
      <p className="text-xs text-amber-800 leading-relaxed">{text}</p>
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, color = "text-foreground" }: {
  label: string; value: string | number; sub?: string; icon: typeof DollarSign; color?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function SignalRow({ signal, type, confidence, source }: {
  signal: string; type: "risk" | "opportunity"; confidence: string; source: string;
}) {
  const isRisk = type === "risk";
  return (
    <div className={`rounded-xl border p-3 ${isRisk ? "bg-rose-50/40 border-rose-200/60" : "bg-emerald-50/40 border-emerald-200/60"}`}>
      <div className="flex items-start gap-2">
        {isRisk
          ? <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
          : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />}
        <div className="min-w-0">
          <p className="text-xs text-foreground leading-relaxed">{signal}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              confidence === "high" ? "bg-foreground/10 text-foreground" :
              confidence === "medium" ? "bg-muted text-muted-foreground" :
              "bg-muted/50 text-muted-foreground/70"
            }`}>{confidence}</span>
            <span className="text-[10px] text-muted-foreground">{source}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ id, question, description, icon: Icon }: {
  id: string; question: string; description?: string; icon: typeof DollarSign;
}) {
  return (
    <div id={id} className="pt-10 pb-4 scroll-mt-20">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-xl bg-[#0091FF]/8 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#0091FF]" />
        </div>
        <h2 className="text-lg font-semibold text-foreground tracking-tight">{question}</h2>
      </div>
      {description && <p className="text-xs text-muted-foreground ml-11">{description}</p>}
    </div>
  );
}

function ConfidenceDot({ level }: { level: string }) {
  const color = level === "high" ? "bg-emerald-500" : level === "medium" ? "bg-amber-400" : "bg-rose-400";
  return <div className={`w-2 h-2 rounded-full ${color}`} />;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Reporting() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("revenue");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const data = await trpcQuery("reporting.insights");
      setReport(data);
    } catch (err: any) {
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [report]);

  if (loading) {
    return (
      <NeuralShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 text-[#0091FF] animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading strategic intelligence...</p>
          </div>
        </div>
      </NeuralShell>
    );
  }

  if (error || !report) {
    return (
      <NeuralShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-3" />
            <p className="text-sm text-foreground mb-2">Unable to load report</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <button onClick={loadReport} className="text-xs text-[#0091FF] hover:underline flex items-center gap-1 mx-auto">
              <RefreshCw className="w-3 h-3" /> Try again
            </button>
          </div>
        </div>
      </NeuralShell>
    );
  }

  const { revenueTrajectory: rev, customerVoice: voice, winLossPatterns: patterns, marketPosition: market } = report;

  return (
    <NeuralShell>
      <div className="p-6 lg:p-8 max-w-[1100px]">

        {/* ── Header ── */}
        <div className="mb-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">CTV Strategic Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Four questions that matter — updated {new Date(report.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* ── Executive Summary ── */}
        <div className="glass rounded-2xl p-5 mb-6">
          <p className="text-sm text-foreground leading-relaxed">{report.executiveSummary}</p>
        </div>

        {/* ── Section Nav ── */}
        <div className="flex gap-1 mb-2 overflow-x-auto pb-1 -mx-1 px-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" })}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeSection === s.id
                  ? "bg-[#0091FF] text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* Q1: ARE WE ON TRACK TO HIT $100M ARR?                         */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          id="revenue"
          question="Are we on track to hit $100M ARR?"
          description={`CTV contribution target: $${(rev.ctvContributionTarget / 1e6).toFixed(0)}M of the $${(rev.annualTarget / 1e6).toFixed(0)}M company goal`}
          icon={DollarSign}
        />

        <DataMaturityBadge text={rev.dataMaturity} />

        {/* Revenue KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard
            label="Closed Won"
            value={`$${(rev.closedWon / 1e6).toFixed(1)}M`}
            sub="CTV revenue confirmed"
            icon={DollarSign}
            color="text-emerald-600"
          />
          <MetricCard
            label="Weighted Pipeline"
            value={`$${(rev.pipelineWeighted / 1e6).toFixed(1)}M`}
            sub="Stage-weighted value"
            icon={TrendingUp}
            color="text-[#0091FF]"
          />
          <MetricCard
            label="Gap to Target"
            value={`$${(rev.gapToTarget / 1e6).toFixed(1)}M`}
            sub={`${rev.onTrack ? "On pace" : "Acceleration needed"}`}
            icon={Target}
            color={rev.onTrack ? "text-emerald-600" : "text-amber-600"}
          />
          <MetricCard
            label="Confidence"
            value={rev.confidence.charAt(0).toUpperCase() + rev.confidence.slice(1)}
            sub={rev.confidenceRationale.slice(0, 60) + "..."}
            icon={Shield}
            color={rev.confidence === "high" ? "text-emerald-600" : rev.confidence === "medium" ? "text-amber-600" : "text-rose-500"}
          />
        </div>

        {/* Monthly Trend Chart */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Monthly Revenue vs Target</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={rev.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => `$${(v / 1e6).toFixed(1)}M`} />
              <Tooltip formatter={(v: any) => [`$${(Number(v) / 1e6).toFixed(1)}M`, ""]} />
              <Area type="monotone" dataKey="target" stroke={SLATE} fill={SLATE} fillOpacity={0.08} strokeDasharray="4 4" name="Target" />
              <Area type="monotone" dataKey="closed" stroke={EMERALD} fill={EMERALD} fillOpacity={0.15} name="Closed" />
              <Area type="monotone" dataKey="pipeline" stroke={MOLOCO_BLUE} fill={MOLOCO_BLUE} fillOpacity={0.1} name="Pipeline" />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline by Stage + Region */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pipeline by Stage</h3>
            <div className="space-y-2">
              {(rev.byStage || []).map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      s.stage === "Scale" ? "bg-emerald-500" : s.stage === "Test" ? "bg-amber-400" : "bg-muted-foreground/40"
                    }`} />
                    <span className="text-foreground">{s.stage}</span>
                    <span className="text-muted-foreground">({s.count})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground">${(s.value / 1e6).toFixed(2)}M</span>
                    <span className="font-mono text-foreground">${(s.weightedValue / 1e6).toFixed(2)}M wtd</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pipeline by Region</h3>
            <div className="space-y-2">
              {(rev.byRegion || []).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium">{r.region}</span>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-muted-foreground">Pipeline: </span>
                      <span className="font-mono text-foreground">${(r.pipeline / 1e6).toFixed(2)}M</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Closed: </span>
                      <span className="font-mono text-emerald-600">${(r.closed / 1e6).toFixed(2)}M</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Early Signals */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Early Signals</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {(rev.earlySignals || []).map((s: any, i: number) => (
              <SignalRow key={i} signal={s.signal} type={s.type} confidence={s.confidence} source={s.source} />
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* Q2: WHAT ARE OUR CUSTOMERS ACTUALLY TELLING US?                */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          id="customer"
          question="What are our customers actually telling us?"
          description={`${voice.totalCalls} calls analyzed over ${voice.period}`}
          icon={MessageSquare}
        />

        <DataMaturityBadge text={voice.dataMaturity} />

        {/* Sentiment Overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <MetricCard
            label="Positive"
            value={`${Math.round((voice.sentimentBreakdown.positive / (voice.totalCalls || 1)) * 100)}%`}
            sub={`${voice.sentimentBreakdown.positive} calls`}
            icon={CheckCircle2}
            color="text-emerald-600"
          />
          <MetricCard
            label="Neutral"
            value={`${Math.round((voice.sentimentBreakdown.neutral / (voice.totalCalls || 1)) * 100)}%`}
            sub={`${voice.sentimentBreakdown.neutral} calls`}
            icon={Minus}
            color="text-muted-foreground"
          />
          <MetricCard
            label="Negative"
            value={`${Math.round((voice.sentimentBreakdown.negative / (voice.totalCalls || 1)) * 100)}%`}
            sub={`${voice.sentimentBreakdown.negative} calls`}
            icon={AlertTriangle}
            color="text-rose-500"
          />
        </div>

        {/* Sentiment Trend */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Sentiment Trend (Weekly)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={voice.sentimentTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip />
              <Area type="monotone" dataKey="positive" stackId="1" stroke={EMERALD} fill={EMERALD} fillOpacity={0.3} name="Positive" />
              <Area type="monotone" dataKey="neutral" stackId="1" stroke={SLATE} fill={SLATE} fillOpacity={0.15} name="Neutral" />
              <Area type="monotone" dataKey="negative" stackId="1" stroke={ROSE} fill={ROSE} fillOpacity={0.2} name="Negative" />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Themes */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Themes</h3>
          <div className="space-y-2">
            {(voice.topThemes || []).slice(0, 8).map((t: any, i: number) => (
              <div key={i}>
                <button
                  onClick={() => toggleExpand(`theme-${i}`)}
                  className="w-full flex items-center justify-between py-2 text-left hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground w-6">{t.count}</span>
                    <span className="text-xs text-foreground truncate">{t.theme}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.trend === "up" ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> :
                     t.trend === "down" ? <ArrowDownRight className="w-3 h-3 text-rose-400" /> :
                     <Minus className="w-3 h-3 text-muted-foreground" />}
                    {expandedItems.has(`theme-${i}`) ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </button>
                <AnimatePresence>
                  {expandedItems.has(`theme-${i}`) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <p className="text-xs text-muted-foreground pl-8 pb-2 leading-relaxed">{t.implication}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Objections */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Objections & Best Responses</h3>
          <div className="space-y-2">
            {(voice.objections || []).slice(0, 6).map((o: any, i: number) => (
              <div key={i}>
                <button
                  onClick={() => toggleExpand(`obj-${i}`)}
                  className="w-full flex items-center justify-between py-2 text-left hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground w-6">{o.frequency}x</span>
                    <span className="text-xs text-foreground truncate">{o.objection}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-mono ${o.winRateWhenRaised >= 50 ? "text-emerald-600" : "text-amber-600"}`}>
                      {o.winRateWhenRaised}% win
                    </span>
                    {expandedItems.has(`obj-${i}`) ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </button>
                <AnimatePresence>
                  {expandedItems.has(`obj-${i}`) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pl-8 pb-2">
                        <p className="text-xs text-muted-foreground leading-relaxed"><strong className="text-foreground">Best response:</strong> {o.bestResponse}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Competitor Mentions */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Competitor Mentions in Calls</h3>
          <div className="space-y-2">
            {(voice.competitorMentions || []).map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <ConfidenceDot level={c.threatLevel} />
                  <span className="text-foreground font-medium">{c.competitor}</span>
                  <span className="text-muted-foreground">({c.count} mentions)</span>
                </div>
                <span className="text-muted-foreground text-right max-w-[50%] truncate">{c.context}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Quotes */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notable Quotes</h3>
          <div className="space-y-3">
            {(voice.topQuotes || []).map((q: any, i: number) => (
              <div key={i} className={`rounded-xl border p-3 ${
                q.sentiment === "positive" ? "border-emerald-200/60 bg-emerald-50/30" :
                q.sentiment === "negative" ? "border-rose-200/60 bg-rose-50/30" :
                "border-border/40"
              }`}>
                <p className="text-xs text-foreground italic leading-relaxed">"{q.quote}"</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">— {q.customer} · {q.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Experimental Insights */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">What We're Still Testing</h3>
          <div className="space-y-2">
            {(voice.experimentalInsights || []).map((insight: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <HelpCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{insight}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* Q3: WHAT SEPARATES WINNING FROM LOSING?                        */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          id="patterns"
          question="What separates winning behaviors from losing ones?"
          description={`${Math.round(patterns.winRate * 100)}% win rate · ${patterns.avgDealCycleDays}d avg cycle · ${Math.round(patterns.testToScaleRate * 100)}% test-to-scale`}
          icon={Target}
        />

        <DataMaturityBadge text={patterns.dataMaturity} />

        {/* Win/Loss KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard label="Win Rate" value={`${Math.round(patterns.winRate * 100)}%`} icon={Award} color="text-emerald-600" />
          <MetricCard label="Avg Cycle" value={`${patterns.avgDealCycleDays}d`} icon={BarChart3} color="text-[#0091FF]" />
          <MetricCard label="Test→Scale" value={`${Math.round(patterns.testToScaleRate * 100)}%`} icon={TrendingUp} color="text-amber-600" />
          <MetricCard label="Reps Tracked" value={patterns.repLeaderboard?.length || 0} icon={Users} color="text-muted-foreground" />
        </div>

        {/* Winning Behaviors */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Winning Behaviors</h3>
          <div className="space-y-2">
            {(patterns.winningBehaviors || []).map((b: any, i: number) => (
              <div key={i}>
                <button
                  onClick={() => toggleExpand(`win-${i}`)}
                  className="w-full flex items-center justify-between py-2 text-left hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs text-foreground">{b.behavior}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ConfidenceDot level={b.confidence} />
                    {expandedItems.has(`win-${i}`) ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </button>
                <AnimatePresence>
                  {expandedItems.has(`win-${i}`) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pl-8 pb-2 text-xs text-muted-foreground space-y-1">
                        <p><strong className="text-foreground">Impact:</strong> {b.impact}</p>
                        <p><strong className="text-foreground">Evidence:</strong> {b.evidence}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Losing Patterns */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Losing Patterns</h3>
          <div className="space-y-2">
            {(patterns.losingPatterns || []).map((p: any, i: number) => (
              <div key={i}>
                <button
                  onClick={() => toggleExpand(`lose-${i}`)}
                  className="w-full flex items-center justify-between py-2 text-left hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="text-xs text-foreground">{p.pattern}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground">{p.frequency}x</span>
                    {expandedItems.has(`lose-${i}`) ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </button>
                <AnimatePresence>
                  {expandedItems.has(`lose-${i}`) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pl-8 pb-2 text-xs text-muted-foreground space-y-1">
                        <p><strong className="text-foreground">Impact:</strong> {p.impact}</p>
                        <p><strong className="text-foreground">Evidence:</strong> {p.evidence}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Test-to-Scale Drivers */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Test-to-Scale Drivers</h3>
          <div className="space-y-2">
            {(patterns.testToScaleDrivers || []).map((d: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs py-1">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  d.correlation === "strong" ? "bg-emerald-500" : d.correlation === "moderate" ? "bg-amber-400" : "bg-muted-foreground/40"
                }`} />
                <div>
                  <span className="text-foreground">{d.driver}</span>
                  <span className="text-muted-foreground ml-1">({d.correlation})</span>
                  <p className="text-muted-foreground mt-0.5">{d.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rep Leaderboard */}
        <div className="glass rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rep Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground">Rep</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Closed</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Pipeline</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Win %</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Cycle</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden lg:table-cell">Strength</th>
                </tr>
              </thead>
              <tbody>
                {(patterns.repLeaderboard || []).map((r: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-foreground">{r.name}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-600">${(r.closedValue / 1e3).toFixed(0)}K</td>
                    <td className="px-3 py-2.5 text-right font-mono text-foreground">${(r.pipelineValue / 1e3).toFixed(0)}K</td>
                    <td className="px-3 py-2.5 text-right font-mono">{Math.round(r.winRate * 100)}%</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{r.avgCycleDays}d</td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell truncate max-w-[200px]">{r.topStrength}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coaching Opportunities */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Coaching Opportunities</h3>
          <div className="space-y-2">
            {(patterns.coachingOpportunities || []).map((c: any, i: number) => (
              <div key={i} className={`rounded-xl border p-3 ${
                c.priority === "high" ? "border-rose-200/60 bg-rose-50/30" :
                c.priority === "medium" ? "border-amber-200/60 bg-amber-50/30" :
                "border-border/40"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{c.area}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    c.priority === "high" ? "bg-rose-100 text-rose-700" :
                    c.priority === "medium" ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>{c.priority} · {c.repsAffected} reps</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.suggestedAction}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Trend */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Activity Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={patterns.activityTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip />
              <Bar dataKey="calls" fill={MOLOCO_BLUE} radius={[4, 4, 0, 0]} name="Calls" />
              <Bar dataKey="meetings" fill={EMERALD} radius={[4, 4, 0, 0]} name="Meetings" />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* Q4: HOW ARE WE POSITIONED IN THE MARKET?                       */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <SectionHeader
          id="market"
          question="How are we positioned in the market?"
          description="Win/loss dynamics, competitive signals, and TAM"
          icon={Crosshair}
        />

        <DataMaturityBadge text={market.dataMaturity} />

        {/* Win/Loss vs Competitors */}
        <div className="glass rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-border/40">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Win/Loss vs Competitors</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground">Competitor</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-emerald-600">Wins</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-rose-500">Losses</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Position</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden lg:table-cell">Key Differentiator</th>
                </tr>
              </thead>
              <tbody>
                {(market.winLossDynamics || []).map((w: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-foreground">{w.competitor}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-emerald-600">{w.winsAgainst}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-rose-500">{w.lossesAgainst}</td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[200px]">{w.netPosition}</td>
                    <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell max-w-[250px] truncate">{w.keyDifferentiator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Competitive Signals */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Competitive Signals</h3>
          <div className="space-y-2">
            {(market.competitiveSignals || []).map((s: any, i: number) => (
              <div key={i} className={`rounded-xl border p-3 ${
                s.urgency === "high" ? "border-rose-200/60 bg-rose-50/30" :
                s.urgency === "medium" ? "border-amber-200/60 bg-amber-50/30" :
                "border-border/40"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{s.signal}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    s.urgency === "high" ? "bg-rose-100 text-rose-700" :
                    s.urgency === "medium" ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>{s.urgency}</span>
                </div>
                <p className="text-xs text-muted-foreground">{s.implication}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">{s.source} · {s.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* TAM */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">TAM Estimates</h3>
          <div className="space-y-3">
            {(market.tamEstimate || []).map((t: any, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-foreground font-medium">{t.segment}</span>
                  <span className="font-mono text-muted-foreground">${(t.tam / 1e9).toFixed(0)}B TAM · ${(t.samReachable / 1e9).toFixed(1)}B SAM</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#0091FF] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(1, t.currentPenetration * 10000)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{(t.currentPenetration * 100).toFixed(2)}% penetration</p>
              </div>
            ))}
          </div>
        </div>

        {/* Advantages & Vulnerabilities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">Our Advantages</h3>
            <div className="space-y-2">
              {(market.molocoAdvantages || []).map((a: any, i: number) => (
                <div key={i} className="text-xs">
                  <div className="flex items-center gap-2 mb-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-foreground font-medium">{a.advantage}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      a.durability === "durable" ? "bg-emerald-100 text-emerald-700" :
                      a.durability === "temporary" ? "bg-amber-100 text-amber-700" :
                      "bg-rose-100 text-rose-700"
                    }`}>{a.durability}</span>
                  </div>
                  <p className="text-muted-foreground pl-5">{a.evidence}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-3">Our Vulnerabilities</h3>
            <div className="space-y-2">
              {(market.molocoVulnerabilities || []).map((v: any, i: number) => (
                <div key={i} className="text-xs">
                  <div className="flex items-center gap-2 mb-0.5">
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="text-foreground font-medium">{v.vulnerability}</span>
                  </div>
                  <p className="text-muted-foreground pl-5"><strong>Threat:</strong> {v.threat}</p>
                  <p className="text-muted-foreground pl-5"><strong>Mitigation:</strong> {v.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SYNTHESIS: RISKS, OPPORTUNITIES, OPEN QUESTIONS                */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="pt-10 pb-4">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">What Should We Do About It?</h2>
          <p className="text-xs text-muted-foreground mt-1">Synthesis across all 4 questions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Risks */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-3">Key Risks</h3>
            <div className="space-y-2">
              {(report.keyRisks || []).map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-3 h-3 text-rose-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground leading-relaxed">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunities */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">Key Opportunities</h3>
            <div className="space-y-2">
              {(report.keyOpportunities || []).map((o: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground leading-relaxed">{o}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Open Questions */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-[#0091FF] uppercase tracking-wider mb-3">Open Questions</h3>
            <div className="space-y-2">
              {(report.openQuestions || []).map((q: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <HelpCircle className="w-3 h-3 text-[#0091FF] mt-0.5 shrink-0" />
                  <span className="text-muted-foreground leading-relaxed">{q}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Sources Status */}
        {report.liveDataStatus && (
          <div className="glass rounded-2xl p-5 mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Data Sources</h3>
            <div className="flex flex-wrap gap-3">
              {[
                { name: "Slack", connected: report.liveDataStatus.slackConnected },
                { name: "Gong", connected: report.liveDataStatus.gongConnected },
                { name: "Salesforce", connected: report.liveDataStatus.salesforceConnected },
                { name: "Speedboat", connected: report.liveDataStatus.speedboatConnected },
              ].map(s => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs">
                  <div className={`w-2 h-2 rounded-full ${s.connected ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  <span className={s.connected ? "text-foreground" : "text-muted-foreground"}>{s.name}</span>
                </div>
              ))}
              <span className="text-[10px] text-muted-foreground ml-auto">
                Last refreshed: {new Date(report.liveDataStatus.lastRefreshed).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {/* ── Footer spacer ── */}
        <div className="h-16" />
      </div>
    </NeuralShell>
  );
}
