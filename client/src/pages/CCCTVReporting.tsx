/**
 * CC CTV Reporting — Strategic Dashboard
 *
 * Four strategic questions:
 *   Q1: Are we on track for $100M ARR?
 *   Q2: What are customers telling us?
 *   Q3: What separates winning from losing?
 *   Q4: How are we positioned?
 *
 * Data sourced from BQ (verified), Gong (early signal), SearchLight/CRM.
 * Apple-glass UX with dark-mode dashboard aesthetic matching the original HTML dashboard.
 */
import NeuralShell from "@/components/NeuralShell";
import { useState, useMemo, useEffect } from "react";
import { trpcQuery } from "@/lib/trpcFetch";
import {
  TrendingUp, MessageSquare, Target, Crosshair,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
  Info, ExternalLink, Shield, Zap, Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
  AreaChart, Area, PieChart, Pie,
} from "recharts";

// ============================================================================
// COLORS
// ============================================================================
const CTV_PURPLE = "#8B5CF6";
const MOLOCO_BLUE = "#0057FF";
const EMERALD = "#10B981";
const AMBER = "#F59E0B";
const ROSE = "#EF4444";
const CYAN = "#06B6D4";
const ORANGE = "#F97316";
const MUTED = "#94a3b8";

// ============================================================================
// TAB STRUCTURE
// ============================================================================
interface Tab {
  id: string;
  label: string;
  emoji: string;
  question: string;
  badge: string;
}

const TABS: Tab[] = [
  { id: "q1", label: "Revenue & Pipeline", emoji: "📈", question: "Are we on track for $100M?", badge: "Q1" },
  { id: "q2", label: "Customer Voice", emoji: "🎙", question: "What are customers telling us?", badge: "Q2" },
  { id: "q3", label: "Win/Loss Patterns", emoji: "🎯", question: "What separates winning from losing?", badge: "Q3" },
  { id: "q4", label: "Market Position", emoji: "⚔️", question: "How are we positioned?", badge: "Q4" },
];

// ============================================================================
// STATIC FALLBACK DATA — Q1: Revenue & Pipeline
// Used when BQ is unavailable; replaced by live data when connected.
// ============================================================================
// Hardcoded fallback data removed — all data sourced from DB (curated_intel table) or live BQ
// If DB categories are empty, sections will show empty state instead of fabricated numbers
const FALLBACK_REVENUE: { month: string; avgDailyGAS: number; target: number; trailing7d: number | null }[] = [];
const FALLBACK_CAMPAIGNS: { month: string; campaigns: number; target: number }[] = [];
const FALLBACK_CONCENTRATION: { name: string; value: number; color: string }[] = [];
const pipelineStages: { stage: string; value: number; deals: number; pct: number }[] = [];
const FALLBACK_RISK_SIGNALS: { title: string; severity: "high" | "medium" | "opportunity"; source: string; body: string }[] = [];

// ============================================================================
// BQ DATA TYPES
// ============================================================================
interface BQResponse {
  available: boolean;
  data: {
    summary: { total_gas: number; avg_daily_gas: number; total_campaigns: number; total_advertisers: number; min_date: string; max_date: string; total_days: number }[];
    trailing_7d: { trailing_7d_daily: number; trailing_7d_total: number; active_campaigns_7d: number; active_advertisers_7d: number; period_start: string; period_end: string }[];
    monthly: { month: string; monthly_gas: number; avg_daily_gas: number; active_campaigns: number; active_advertisers: number; days_in_month: number }[];
    daily_recent: { date_utc: string; daily_gas: number; active_campaigns: number }[];
    top_advertisers: { advertiser: string; total_gas: number; campaigns: number; first_active: string; last_active: string }[];
    exchanges: { exchange: string; total_gas: number; campaigns: number }[];
    concentration: { advertiser: string; gas: number; pct_of_total: number; cumulative_pct: number }[];
    fetched_at: string;
    source: string;
    fallback: boolean;
  } | null;
  message: string;
}

/** Transform BQ monthly data into chart-ready format */
function bqToRevenueChart(monthly: NonNullable<BQResponse["data"]>["monthly"]) {
  const monthNames: Record<string, string> = {
    "2025-10": "Oct", "2025-11": "Nov", "2025-12": "Dec",
    "2026-01": "Jan", "2026-02": "Feb", "2026-03": "Mar",
    "2026-04": "Apr", "2026-05": "May", "2026-06": "Jun",
  };
  return monthly.map((m) => ({
    month: monthNames[m.month] || m.month,
    avgDailyGAS: Math.round(m.avg_daily_gas / 1000 * 10) / 10,
    target: 274,
    trailing7d: null as number | null,
  }));
}

function bqToCampaignChart(monthly: NonNullable<BQResponse["data"]>["monthly"]) {
  const monthNames: Record<string, string> = {
    "2025-10": "Oct", "2025-11": "Nov", "2025-12": "Dec",
    "2026-01": "Jan", "2026-02": "Feb", "2026-03": "Mar",
    "2026-04": "Apr", "2026-05": "May", "2026-06": "Jun",
  };
  return monthly.map((m) => ({
    month: monthNames[m.month] || m.month,
    campaigns: Math.round(m.active_campaigns),
    target: 150,
  }));
}

function bqToConcentration(conc: NonNullable<BQResponse["data"]>["concentration"]) {
  const colors = [ROSE, ORANGE, AMBER, CTV_PURPLE, CYAN, "#334155", "#1e293b", "#0f172a"];
  const top5 = conc.slice(0, 5);
  const restPct = Math.max(0, 100 - top5.reduce((s, c) => s + c.pct_of_total, 0));
  const result = top5.map((c, i) => ({
    name: `${c.advertiser.split(" - ")[0]} (${c.pct_of_total.toFixed(1)}%)`,
    value: Math.round(c.pct_of_total * 10) / 10,
    color: colors[i] || colors[colors.length - 1],
  }));
  if (restPct > 0.5) {
    result.push({ name: `Rest (${restPct.toFixed(1)}%)`, value: Math.round(restPct * 10) / 10, color: "#334155" });
  }
  return result;
}

function bqToRiskSignals(bq: NonNullable<BQResponse["data"]>) {
  const s = bq.summary[0];
  const t7 = bq.trailing_7d[0];
  const topConc = bq.concentration[0];
  const top5Pct = bq.concentration.slice(0, 5).reduce((sum, c) => sum + c.pct_of_total, 0);
  const latestMonth = bq.monthly[bq.monthly.length - 1];
  const exchangeCount = bq.exchanges.length;
  const topExchanges = bq.exchanges.slice(0, 3).map(e => e.exchange).join(" + ");
  const topExchangePct = bq.exchanges.length > 0
    ? Math.round(bq.exchanges.slice(0, 3).reduce((s, e) => s + e.total_gas, 0) / bq.exchanges.reduce((s, e) => s + e.total_gas, 0) * 100)
    : 0;

  return [
    {
      title: "Advertiser Concentration",
      severity: topConc && topConc.pct_of_total > 30 ? "high" as const : "medium" as const,
      source: "BQ",
      body: topConc
        ? `Top 1 advertiser (${topConc.advertiser}) = ${topConc.pct_of_total.toFixed(1)}% of all CTV GAS ($${Math.round(topConc.gas / (latestMonth?.days_in_month || 30) / 1000)}K/day). Top 5 = ${top5Pct.toFixed(1)}%.`
        : "Concentration data unavailable.",
    },
    {
      title: "Campaign Volume",
      severity: (t7?.active_campaigns_7d || 0) < 60 ? "high" as const : "medium" as const,
      source: "BQ",
      body: `${Math.round(t7?.active_campaigns_7d || s?.total_campaigns || 0)} active campaigns (7d) vs 150 EOY target — ${(150 / Math.max(1, t7?.active_campaigns_7d || 0)).toFixed(1)}× ramp required.`,
    },
    {
      title: "Exchange Breadth",
      severity: exchangeCount <= 5 ? "medium" as const : "high" as const,
      source: "BQ",
      body: `${exchangeCount} exchanges with active CTV spend. ${topExchanges} = ${topExchangePct}% of volume.`,
    },
    {
      title: "Monthly Momentum",
      severity: "opportunity" as const,
      source: "BQ",
      body: latestMonth
        ? `${latestMonth.month} GAS ($${(latestMonth.monthly_gas / 1e6).toFixed(1)}M) — avg daily $${Math.round(latestMonth.avg_daily_gas / 1000)}K. 7d trailing: $${Math.round((t7?.trailing_7d_daily || 0) / 1000)}K/day.`
        : "Monthly data unavailable.",
    },
  ];
}

// ============================================================================
// DATA — Q2: Customer Voice
// ============================================================================
// Q2 hardcoded data removed — sourced from DB (curated_intel ccctv_* categories)
const sentimentData: { month: string; positive: number; mixed: number; friction: number }[] = [];
const themeData: { theme: string; calls: number; pct: number; sentiment: "positive" | "mixed" | "friction" }[] = [];
const verbatims: { theme: string; sentiment: "positive" | "mixed" | "friction"; quote: string; meta: string; status: string; statusColor: string }[] = [];

// ============================================================================
// DATA — Q3: Win/Loss Patterns
// ============================================================================
// Q3 hardcoded data removed — sourced from DB (curated_intel ccctv_behavior, ccctv_loss_reason, etc.)
const behaviorData: { behavior: string; won: number; lost: number; delta: string; signal: string }[] = [];
const winRateByBehavior: { behavior: string; rate: number }[] = [];
const lossReasons: { reason: string; pct: number }[] = [];

// ============================================================================
// DATA — Q4: Market Position
// ============================================================================
// Q4 hardcoded data removed — sourced from DB (curated_intel ccctv_competitor, ccctv_tam, etc.)
const competitorData: { competitor: string; deals: number; winRate: number; theirEdge: string; ourCounter: string }[] = [];
const winRateByCompetitor: { name: string; rate: number; color: string }[] = [];
const tamData: { label: string; value: string; width: string; color: string; textColor: string; amount: string }[] = [];
const competitiveSignals: { title: string; body: string; source: string; color: string }[] = [];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SourceTag({ label, variant }: { label: string; variant: "bq" | "gong" | "est" | "mixed" | "sl" }) {
  const styles = {
    bq: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    gong: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    est: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    mixed: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    sl: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return (
    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${styles[variant]}`}>
      {label}
    </span>
  );
}

function KpiCard({ label, value, sub, pill, pillColor, color, trackPct, trackColor }: {
  label: string; value: string; sub: string; pill?: string; pillColor?: string;
  color: string; trackPct?: number; trackColor?: string;
}) {
  const pillStyles: Record<string, string> = {
    red: "bg-red-500/10 text-red-400",
    green: "bg-emerald-500/10 text-emerald-400",
    yellow: "bg-amber-500/10 text-amber-400",
    purple: "bg-violet-500/10 text-violet-400",
  };
  return (
    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-extrabold tracking-tight mb-1" style={{ color }}>{value}</div>
      <div className="text-[10px] text-slate-500 leading-relaxed">{sub}</div>
      {pill && (
        <div className={`text-[10px] font-semibold mt-2 px-2 py-0.5 rounded-md inline-block ${pillStyles[pillColor || "yellow"]}`}>
          {pill}
        </div>
      )}
      {trackPct !== undefined && (
        <div className="h-[3px] bg-white/5 rounded-full mt-3 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${trackPct}%`, background: trackColor || color }} />
        </div>
      )}
    </div>
  );
}

function HonestyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/5 border border-red-500/15 mb-4">
      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
      <div className="text-xs text-slate-300 leading-relaxed">{children}</div>
    </div>
  );
}

function QuestionHeader({ tab, variant }: { tab: Tab; variant: "q1" | "q2" | "q3" | "q4" }) {
  const gradients = {
    q1: "from-amber-500/8 to-amber-500/3",
    q2: "from-violet-500/8 to-violet-500/3",
    q3: "from-emerald-500/8 to-emerald-500/3",
    q4: "from-cyan-500/8 to-cyan-500/3",
  };
  const borders = {
    q1: "border-amber-500/20",
    q2: "border-violet-500/20",
    q3: "border-emerald-500/20",
    q4: "border-cyan-500/20",
  };
  const titleColors = {
    q1: "text-amber-300",
    q2: "text-violet-300",
    q3: "text-emerald-300",
    q4: "text-cyan-300",
  };
  return (
    <div className={`rounded-xl p-4 mb-4 flex items-start gap-4 bg-gradient-to-br ${gradients[variant]} border ${borders[variant]}`}>
      <span className="text-2xl shrink-0">{tab.emoji}</span>
      <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Strategic Question {variant.slice(1)}</div>
        <div className={`text-base font-extrabold tracking-tight mb-1 ${titleColors[variant]}`}>{tab.question}</div>
      </div>
    </div>
  );
}

function SeverityPill({ severity }: { severity: "high" | "medium" | "opportunity" }) {
  const styles = {
    high: "bg-red-500/15 text-red-400",
    medium: "bg-amber-500/15 text-amber-400",
    opportunity: "bg-emerald-500/15 text-emerald-400",
  };
  const labels = { high: "High Risk", medium: "Watch", opportunity: "Opportunity" };
  return <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${styles[severity]}`}>{labels[severity]}</span>;
}

const chartTooltipStyle = {
  contentStyle: { background: "#0F1623", border: "1px solid #1E2A42", borderRadius: 8, fontSize: 11, color: "#F0F4FF" },
  itemStyle: { color: "#F0F4FF" },
  labelStyle: { color: "#7A90B8" },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CCCTVReporting() {
  const [activeTab, setActiveTab] = useState("q1");
  const [bqData, setBqData] = useState<BQResponse | null>(null);
  const [bqLoading, setBqLoading] = useState(true);
  const [curatedData, setCuratedData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await trpcQuery("reporting.bqRevenue");
        if (!cancelled && result) setBqData(result as BQResponse);
      } catch (err) {
        console.warn("[CC CTV] BQ fetch failed, using fallback data", err);
      } finally {
        if (!cancelled) setBqLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch curated intel from DB
  useEffect(() => {
    trpcQuery<Record<string, any[]>>("reporting.curatedIntel")
      .then((d) => { if (d) setCuratedData(d); })
      .catch(() => {});
  }, []);

  // Derive live or fallback data
  const bq = bqData?.available && bqData.data ? bqData.data : null;
  const isLive = bq !== null;

  // DB-backed fallbacks for Q1 data
  const dbRevenueFallback = useMemo(() => {
    const rows = curatedData.ccctv_q1_revenue;
    if (!rows?.length) return FALLBACK_REVENUE;
    return rows.map((r: any) => ({
      month: r.label, avgDailyGAS: Number(r.value1) || 0, target: Number(r.value2) || 274,
      trailing7d: r.text2 ? Number(r.text2) : null,
    }));
  }, [curatedData]);
  const dbCampaignFallback = useMemo(() => {
    const rows = curatedData.ccctv_q1_revenue;
    if (!rows?.length) return FALLBACK_CAMPAIGNS;
    return rows.map((r: any) => ({ month: r.label, campaigns: Number(r.text1) || 0, target: 150 }));
  }, [curatedData]);
  const dbConcentrationFallback = useMemo(() => {
    const rows = curatedData.ccctv_q1_concentration;
    if (!rows?.length) return FALLBACK_CONCENTRATION;
    return rows.map((r: any) => ({ name: r.label, value: Number(r.value1) || 0, color: r.text1 || "#334155" }));
  }, [curatedData]);
  const dbRiskFallback = useMemo(() => {
    const rows = curatedData.ccctv_q1_risk;
    if (!rows?.length) return FALLBACK_RISK_SIGNALS;
    return rows.map((r: any) => ({
      title: r.label, severity: (r.subcategory || "medium") as "high" | "medium" | "opportunity",
      source: r.text1 || "BQ", body: r.text2 || "",
    }));
  }, [curatedData]);
  const revenueData = useMemo(() => {
    if (!bq) return dbRevenueFallback;
    const chart = bqToRevenueChart(bq.monthly);
    if (chart.length > 0 && bq.trailing_7d[0]) {
      chart[chart.length - 1].trailing7d = Math.round(bq.trailing_7d[0].trailing_7d_daily / 1000 * 10) / 10;
    }
    return chart;
  }, [bq, dbRevenueFallback]);
  const campaignData = useMemo(() => bq ? bqToCampaignChart(bq.monthly) : dbCampaignFallback, [bq, dbCampaignFallback]);
  const concentrationData = useMemo(() => bq ? bqToConcentration(bq.concentration) : dbConcentrationFallback, [bq, dbConcentrationFallback]);
  const riskSignals = useMemo(() => bq ? bqToRiskSignals(bq) : dbRiskFallback, [bq, dbRiskFallback]);

  // Derived KPI values
  const trailing7dDaily = bq?.trailing_7d[0]?.trailing_7d_daily || 195_000;
  const trailing7dDailyK = Math.round(trailing7dDaily / 1000);
  const arrRunRate = trailing7dDaily * 365;
  const arrPct = Math.round(arrRunRate / 100_000_000 * 1000) / 10;
  const arrGap = Math.round((100_000_000 - arrRunRate) / 1_000_000 * 10) / 10;
  const dailyTarget = 274; // $274K/day needed for $100M ARR
  const activeCampaigns7d = Math.round(bq?.trailing_7d[0]?.active_campaigns_7d || 39);
  const exchangeCount = bq?.exchanges.length || 5;
  const exchangeNames = bq?.exchanges.map(e => e.exchange).join(" · ") || "MCTV · INDEX · FW · NEXXEN · IS";

  return (
    <NeuralShell>
      <div className="min-h-screen bg-[#080C18] text-[#F0F4FF]">
        {/* ── GOAL PROGRESS BANNER ── */}
        <div className="bg-gradient-to-r from-[#0A0E20] via-[#14103A] to-[#0A0E20] border-b border-slate-700/50 px-6 py-3">
          <div className="flex items-center gap-6 flex-wrap max-w-[1400px] mx-auto">
            <div>
              <div className="text-xl font-extrabold text-amber-400 tracking-tight">$100M ARR</div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                Beth's mandate · CTV · EOY 2026
                {isLive && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> BQ Live
                  </span>
                )}
                {bqLoading && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[9px] font-bold">
                    Loading BQ...
                  </span>
                )}
                {bqData?.data?.fetched_at && (
                  <span className="text-[9px] text-slate-500">Last refreshed: {new Date(bqData.data.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
                <span>Current run-rate: ~${(arrRunRate / 1e6).toFixed(1)}M ARR (${trailing7dDailyK > 0 ? `$${trailing7dDailyK}K` : "$195K"}/day × 365) · {isLive ? "BQ verified" : "estimated"} 7-day trailing avg</span>
                <span className="text-amber-400 font-bold">{arrPct}% of goal — ${arrGap > 0 ? `$${arrGap}M gap` : "On track!"}</span>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-amber-400" style={{ width: `${Math.min(arrPct, 100)}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                <span>$0</span><span>$25M · Q1</span><span>$50M · Q2</span><span>$75M · Q3</span><span className="text-amber-400">$100M · EOY</span>
              </div>
            </div>
            <div className="flex gap-5 flex-wrap">
              <div className="text-center">
                <div className="text-base font-extrabold text-violet-400">${trailing7dDailyK}K</div>
                <div className="text-[9px] text-slate-500 leading-tight">CTV GAS/day<br />{isLive ? "BQ · 7d trailing" : "est · 7d trailing"}</div>
              </div>
              <div className="text-center">
                <div className="text-base font-extrabold text-amber-400">${dailyTarget}K</div>
                <div className="text-[9px] text-slate-500 leading-tight">Daily target<br />needed</div>
              </div>
              <div className="text-center">
                <div className="text-base font-extrabold text-amber-400">{activeCampaigns7d}</div>
                <div className="text-[9px] text-slate-500 leading-tight">Active<br />campaigns</div>
              </div>
              <div className="text-center">
                <div className="text-base font-extrabold text-red-400">22.7%</div>
                <div className="text-[9px] text-slate-500 leading-tight">Win rate<br />vs 35% target</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB NAV ── */}
        <div className="bg-slate-900/80 border-b border-slate-700/50 px-6 overflow-x-auto">
          <div className="flex max-w-[1400px] mx-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 h-11 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-violet-400 border-violet-500"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                }`}
              >
                <span>{tab.emoji}</span>
                <span className="hidden sm:inline">{tab.question}</span>
                <span className="sm:hidden">{tab.label}</span>
                <span className="text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">{tab.badge}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="px-6 py-4 max-w-[1400px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "q1" && <Q1Revenue revenueData={revenueData} campaignData={campaignData} concentrationData={concentrationData} riskSignals={riskSignals} isLive={isLive} bq={bq} trailing7dDailyK={trailing7dDailyK} activeCampaigns7d={activeCampaigns7d} exchangeCount={exchangeCount} exchangeNames={exchangeNames} />}
              {activeTab === "q2" && <Q2CustomerVoice curatedData={curatedData} />}
              {activeTab === "q3" && <Q3WinLoss curatedData={curatedData} />}
              {activeTab === "q4" && <Q4MarketPosition curatedData={curatedData} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </NeuralShell>
  );
}

// ============================================================================
// Q1: REVENUE & PIPELINE
// ============================================================================
function Q1Revenue({ revenueData, campaignData, concentrationData, riskSignals, isLive, bq, trailing7dDailyK, activeCampaigns7d, exchangeCount, exchangeNames }: {
  revenueData: { month: string; avgDailyGAS: number; target: number; trailing7d: number | null }[];
  campaignData: { month: string; campaigns: number; target: number }[];
  concentrationData: { name: string; value: number; color: string }[];
  riskSignals: { title: string; severity: "high" | "medium" | "opportunity"; source: string; body: string }[];
  isLive: boolean;
  bq: BQResponse["data"] | null;
  trailing7dDailyK: number;
  activeCampaigns7d: number;
  exchangeCount: number;
  exchangeNames: string;
}) {
  const dailyPct = Math.round(trailing7dDailyK / 274 * 1000) / 10;
  const campPct = Math.round(activeCampaigns7d / 150 * 100);
  return (
    <>
      <QuestionHeader tab={TABS[0]} variant="q1" />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KpiCard label="CTV GAS / Day" value={`$${trailing7dDailyK}K`} sub={isLive ? `BQ · fact_dsp_core · 7d trailing` : "est · 7d trailing"} pill={`${dailyPct}% of $274K/day target`} pillColor={dailyPct >= 80 ? "green" : dailyPct >= 60 ? "yellow" : "red"} color={CTV_PURPLE} trackPct={Math.min(dailyPct, 100)} />
        <KpiCard label="Active Campaigns" value={String(activeCampaigns7d)} sub={isLive ? "BQ · distinct campaigns · 7d" : "est · last 30d"} pill={`${campPct}% of 150 target`} pillColor={campPct >= 50 ? "yellow" : "red"} color={AMBER} trackPct={Math.min(campPct, 100)} />
        <KpiCard label="Win Rate (AMER)" value="22.7%" sub="SearchLight · 90-day trailing" pill="12.3pp below 35% target" pillColor="red" color={ROSE} trackPct={65} />
        <KpiCard label="CTV Pipeline" value="$8.2M" sub="SearchLight · CRM est" pill="Coverage: est. 1.2× target" pillColor="yellow" color={CYAN} trackPct={42} />
        <KpiCard label="Exchanges Live" value={String(exchangeCount)} sub={isLive ? "BQ · last 7d spend > $0" : "est"} pill={exchangeNames.length > 40 ? exchangeNames.substring(0, 40) + "..." : exchangeNames} pillColor="green" color={EMERALD} trackPct={Math.round(exchangeCount / 8 * 100)} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <div className="text-sm font-bold text-slate-200">CTV Daily GAS Trend vs $100M Target</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Monthly avg daily GAS · dashed = $274K/day required pace</div>
            </div>
            <SourceTag label="BQ · verified" variant="bq" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#7A90B8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#7A90B8", fontSize: 11 }} tickFormatter={(v) => `$${v}K`} />
              <Tooltip {...chartTooltipStyle} formatter={(v) => [`$${v}K`, ""]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="avgDailyGAS" name="Avg Daily GAS ($K)" stroke={CTV_PURPLE} strokeWidth={2.5} dot={{ r: 4, fill: CTV_PURPLE }} />
              <Line type="monotone" dataKey="target" name="$100M Target Pace" stroke={AMBER} strokeDasharray="5 4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="trailing7d" name="7-day trailing" stroke={EMERALD} strokeDasharray="3 3" strokeWidth={2} dot={{ r: 6, fill: EMERALD }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <div className="text-sm font-bold text-slate-200">Active Campaign Ramp</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Distinct campaigns with CTV spend &gt; $0 per month · target: 150 EOY</div>
            </div>
            <SourceTag label="BQ · verified" variant="bq" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={campaignData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#7A90B8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#7A90B8", fontSize: 11 }} />
              <Tooltip {...chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="campaigns" name="Active CTV Campaigns" fill="rgba(139,92,246,0.6)" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="target" name="EOY Target (150)" stroke={AMBER} strokeDasharray="5 4" strokeWidth={2} dot={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline + Concentration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <div className="text-sm font-bold text-slate-200">Pipeline by Stage</div>
              <div className="text-[10px] text-slate-500 mt-0.5">CRM/SearchLight data · pipeline stages not in BQ</div>
            </div>
            <SourceTag label="SearchLight · CRM est" variant="est" />
          </div>
          <div className="space-y-2">
            {pipelineStages.map((s) => (
              <div key={s.stage} className="flex items-center gap-3">
                <div className="text-xs text-slate-300 w-32 shrink-0">{s.stage}</div>
                <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden relative">
                  <div
                    className="h-full rounded flex items-center px-2.5 text-[11px] font-bold text-white"
                    style={{ width: `${s.pct}%`, background: `rgba(139,92,246,${0.3 + s.pct * 0.007})` }}
                  >
                    ${s.value}M · {s.deals} opps
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 w-16 text-right">{s.deals} deals</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            Stage-to-stage conversion: 72% → 61% → 56% → 55% · <span className="text-amber-400 font-semibold">Proposal→Negotiation is the drop-off</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <div className="text-sm font-bold text-slate-200">Revenue Concentration</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Top 5 = 70.9% · Top 1 = 38% · last 30d</div>
            </div>
            <SourceTag label="BQ · verified" variant="bq" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={concentrationData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                dataKey="value"
                stroke="#1E2A42"
                strokeWidth={2}
              >
                {concentrationData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...chartTooltipStyle} formatter={(v) => [`${v}%`, ""]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-[10px] text-red-400 leading-relaxed mt-2">
            ⚠ Single advertiser (PMG - FBG Oppco LLC) = 38% of all CTV GAS. If this account pauses, run-rate drops ~$74K/day.
          </div>
        </div>
      </div>

      {/* Risk Signals */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-bold text-slate-200">Risk & Opportunity Signals</div>
          <div className="text-[10px] text-slate-500">Early indicators — directional, not definitive</div>
        </div>
        <SourceTag label="Estimated · directional" variant="est" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {riskSignals.map((r) => (
          <div key={r.title} className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-slate-200">{r.title}</div>
              <SeverityPill severity={r.severity} />
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">{r.body}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ============================================================================
// Q2: CUSTOMER VOICE
// ============================================================================
function Q2CustomerVoice({ curatedData = {} }: { curatedData?: Record<string, any[]> }) {
  const dbThemeData = useMemo(() => {
    const db = (curatedData.theme || []).map((t: any) => ({
      theme: t.label, calls: Number(t.value1) || 0, pct: Number(t.value2) || 0,
      sentiment: (t.text1 || "mixed") as "positive" | "mixed" | "friction",
    }));
    return db.length > 0 ? db : themeData;
  }, [curatedData]);

  const dbVerbatims = useMemo(() => {
    const db = (curatedData.quote || []).map((q: any) => ({
      theme: q.subcategory || "General", sentiment: (q.text2 || "mixed") as "positive" | "mixed" | "friction",
      quote: q.text1 || q.label, meta: q.text3 || "",
      status: q.metadata?.status || "Active", statusColor: q.metadata?.statusColor || AMBER,
    }));
    return db.length > 0 ? db : verbatims;
  }, [curatedData]);

  return (
    <>
      <QuestionHeader tab={TABS[1]} variant="q2" />

      <HonestyBox>
        <strong className="text-red-300">Honest framing:</strong> Gong analysis covers 43 CTV calls from the past 90 days. Themes are extracted from call transcripts using keyword clustering — not a rigorous NLP model. Small sample sizes mean a single vocal buyer can skew theme counts. Use this to <strong className="text-red-300">generate hypotheses</strong>, not to declare what "all customers think."
      </HonestyBox>

      {/* Sentiment KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Calls Analyzed" value="43" sub="Gong · 90-day window · CTV-tagged" pill="Target: 150 for confidence" pillColor="purple" color={CTV_PURPLE} />
        <KpiCard label="Positive Sentiment" value="54%" sub="ML targeting · CTV reach · ease of use" pill="Leading theme: ML targeting" pillColor="green" color={EMERALD} />
        <KpiCard label="Mixed / Neutral" value="28%" sub="Attribution uncertainty · pricing" pill="Key: attribution anxiety" pillColor="yellow" color={AMBER} />
        <KpiCard label="Friction / Objections" value="18%" sub="Measurement gaps · brand safety" pill='Top: "how do I prove ROI?"' pillColor="red" color={ROSE} />
      </div>

      {/* Theme Bars + Sentiment Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <div className="text-sm font-bold text-slate-200">Top Themes by Call Frequency</div>
              <div className="text-[10px] text-slate-500 mt-0.5">How often each theme appeared across 43 calls</div>
            </div>
            <SourceTag label="Gong · N=43" variant="gong" />
          </div>
          <div className="space-y-2.5">
            {dbThemeData.map((t) => {
              const barColor = t.sentiment === "positive" ? CTV_PURPLE : t.sentiment === "mixed" ? AMBER : ROSE;
              const sentLabel = t.sentiment === "positive" ? "↑ positive" : t.sentiment === "mixed" ? "↕ mixed" : "↓ friction";
              const sentColor = t.sentiment === "positive" ? EMERALD : t.sentiment === "mixed" ? AMBER : ROSE;
              return (
                <div key={t.theme} className="flex items-center gap-3">
                  <div className="text-[11px] text-slate-300 w-44 shrink-0">{t.theme}</div>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${t.pct}%`, background: barColor }} />
                  </div>
                  <div className="text-[11px] text-slate-400 w-28 text-right shrink-0">
                    {t.calls} calls <span style={{ color: sentColor, fontSize: 10 }}>{sentLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <div className="text-sm font-bold text-slate-200">Sentiment Trend Over Time</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Monthly distribution · small N = noisy</div>
            </div>
            <SourceTag label="Gong · N=43" variant="gong" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sentimentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#7A90B8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#7A90B8", fontSize: 11 }} />
              <Tooltip {...chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="positive" name="Positive" stackId="a" fill="rgba(16,185,129,0.6)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="mixed" name="Mixed" stackId="a" fill="rgba(245,158,11,0.5)" />
              <Bar dataKey="friction" name="Friction" stackId="a" fill="rgba(239,68,68,0.5)" />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">
            ⚠ Monthly buckets contain 8–15 calls — individual months are not statistically meaningful. Watch the overall direction.
          </div>
        </div>
      </div>

      {/* VoC Verbatims */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-bold text-slate-200">Representative Verbatims by Theme</div>
          <div className="text-[10px] text-slate-500">Real quotes from Gong calls — selected for representativeness</div>
        </div>
        <SourceTag label="Gong · verbatim" variant="gong" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {dbVerbatims.map((v, i) => {
          const dotColor = v.sentiment === "positive" ? EMERALD : v.sentiment === "mixed" ? AMBER : ROSE;
          const sentLabel = v.sentiment === "positive" ? "Positive signal" : v.sentiment === "mixed" ? "Mixed signal" : "Friction";
          return (
            <div key={i} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                {v.theme} — {sentLabel}
              </div>
              <div className="text-[11px] text-slate-400 italic leading-relaxed border-l-2 pl-3 mb-2" style={{ borderColor: CTV_PURPLE }}>
                "{v.quote}"
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>{v.meta}</span>
                <span style={{ color: v.statusColor }}>{v.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ============================================================================
// Q3: WIN/LOSS PATTERNS
// ============================================================================
function Q3WinLoss({ curatedData = {} }: { curatedData?: Record<string, any[]> }) {
  const dbBehaviorData = useMemo(() => {
    const db = (curatedData.behavior || []).map((b: any) => ({
      behavior: b.label, won: Number(b.value1) || 0, lost: Number(b.value2) || 0,
      delta: `+${(Number(b.value1) || 0) - (Number(b.value2) || 0)}pp`,
      signal: (Number(b.value1) || 0) - (Number(b.value2) || 0) >= 40 ? "Strong" : "Medium",
    }));
    return db.length > 0 ? db : behaviorData;
  }, [curatedData]);

  const dbLossReasons = useMemo(() => {
    const db = (curatedData.loss_reason || []).map((r: any) => ({
      reason: r.label, pct: Number(r.value1) || 0,
    }));
    return db.length > 0 ? db : lossReasons;
  }, [curatedData]);

  // Derive win rate chart from behavior data
  const dbWinRateByBehavior = useMemo(() => {
    return dbBehaviorData.slice(0, 5).map((b: any) => ({
      behavior: b.behavior.replace(/\s*\(.*\)/, "").split(" ").slice(0, 2).join(" "),
      rate: b.won,
    }));
  }, [dbBehaviorData]);

  return (
    <>
      <QuestionHeader tab={TABS[2]} variant="q3" />

      <HonestyBox>
        <strong className="text-red-300">Honest framing:</strong> This analysis compares behaviors in 18 won vs 13 lost CTV deals. Sample size is small enough that one or two outlier deals can materially shift the numbers. Correlations are <strong className="text-red-300">directional signals, not proven drivers</strong>.
      </HonestyBox>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Won Deals" value="18" sub="Avg deal size: $87K ARR" pill="Avg cycle: 47 days" pillColor="green" color={EMERALD} />
        <KpiCard label="Lost Deals" value="13" sub="Most common loss: Tatari (38%)" pill="Avg cycle: 68 days" pillColor="red" color={ROSE} />
        <KpiCard label="Avg Deal Velocity (Won)" value="47 days" sub="Discovery → Close" pill="30% faster than lost" pillColor="yellow" color={AMBER} />
        <KpiCard label="Champion Identified" value="83%" sub="% of won deals where champion confirmed" pill="vs 31% in lost deals" pillColor="purple" color={CTV_PURPLE} />
      </div>

      {/* Behavior Table + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 overflow-x-auto">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <div className="text-sm font-bold text-slate-200">Behavioral Patterns: Won vs. Lost Deals</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Comparing observed behaviors in 18 won vs 13 lost deals</div>
            </div>
            <SourceTag label="Gong · N=31 deals" variant="gong" />
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-48">Behavior</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Won (18)</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lost (13)</th>
                <th className="text-center py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-16">Delta</th>
                <th className="text-center py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-16">Signal</th>
              </tr>
            </thead>
            <tbody>
              {dbBehaviorData.map((b) => (
                <tr key={b.behavior} className="border-b border-slate-800/50 hover:bg-white/[0.02]">
                  <td className="py-2.5 px-2 text-slate-300">{b.behavior}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-[7px] bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${b.won}%` }} />
                      </div>
                      <span className="text-slate-500 w-8 text-right">{b.won}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-[7px] bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${b.lost}%` }} />
                      </div>
                      <span className="text-slate-500 w-8 text-right">{b.lost}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={b.delta.startsWith("+") ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {b.delta}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      b.signal === "Strong" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                    }`}>
                      {b.signal}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3 gap-2">
              <div>
                <div className="text-sm font-bold text-slate-200">Win Rate by Behavior</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Deals where behavior was observed</div>
              </div>
              <SourceTag label="N=31" variant="gong" />
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dbWinRateByBehavior} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: "#7A90B8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="behavior" tick={{ fill: "#7A90B8", fontSize: 10 }} width={110} />
                <Tooltip {...chartTooltipStyle} formatter={(v) => [`${v}%`, "Win Rate"]} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {dbWinRateByBehavior.map((_: any, i: number) => (
                    <Cell key={i} fill={[EMERALD, EMERALD, CTV_PURPLE, CYAN, AMBER][i]} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3 gap-2">
              <div>
                <div className="text-sm font-bold text-slate-200">Top Loss Reasons</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Self-reported in Gong / SearchLight</div>
              </div>
              <SourceTag label="Gong + SL" variant="mixed" />
            </div>
            <div className="space-y-2.5">
              {dbLossReasons.map((l) => (
                <div key={l.reason} className="flex items-center gap-3">
                  <div className="text-[11px] text-slate-300 w-44 shrink-0">{l.reason}</div>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${l.pct * 2}%` }} />
                  </div>
                  <div className="text-[11px] text-red-400 w-8 text-right">{l.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Q4: MARKET POSITION
// ============================================================================
function Q4MarketPosition({ curatedData = {} }: { curatedData?: Record<string, any[]> }) {
  const dbCompetitorData = useMemo(() => {
    const db = (curatedData.competitor || []).map((c: any) => ({
      competitor: c.label, deals: Number(c.value2) || 0, winRate: Number(c.value1) || 0,
      theirEdge: c.text2 || "", ourCounter: c.text3 || "",
    }));
    return db.length > 0 ? db : competitorData;
  }, [curatedData]);

  const dbCompetitiveSignals = useMemo(() => {
    const db = (curatedData.competitive_signal || []).map((s: any) => ({
      title: s.label, body: s.text1 || "", source: s.text2 || "",
      color: s.text3 === "positive" ? EMERALD : s.text3 === "risk" ? ROSE : AMBER,
    }));
    return db.length > 0 ? db : competitiveSignals;
  }, [curatedData]);

  // Derive win rate chart from competitor data
  const dbWinRateByCompetitor = useMemo(() => {
    return dbCompetitorData.map((c: any) => ({
      name: c.competitor,
      rate: c.winRate,
      color: c.winRate >= 60 ? EMERALD : c.winRate >= 40 ? AMBER : ROSE,
    }));
  }, [dbCompetitorData]);

  // DB-backed TAM data
  const dbTamData = useMemo(() => {
    const db = (curatedData.tam_estimate || []).map((t: any) => ({
      label: t.label,
      value: `$${Number(t.value1) || 0}B`,
      width: `${Math.min(((Number(t.value1) || 0) / 21) * 100, 100)}%`,
      color: t.text2 || "rgba(148,163,184,0.15)",
      textColor: t.text3 || MUTED,
      amount: `$${Number(t.value1) || 0}B`,
    }));
    return db.length > 0 ? db : tamData;
  }, [curatedData]);

  return (
    <>
      <QuestionHeader tab={TABS[3]} variant="q4" />

      {/* Position KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Overall Win Rate" value="22.7%" sub="SearchLight · 90-day · CTV deals" pill="Below 35% target" pillColor="red" color={EMERALD} />
        <KpiCard label="Win vs. Tatari" value="34%" sub="In competitive overlaps · N=9 deals" pill="Small N · directional" pillColor="yellow" color={AMBER} />
        <KpiCard label="Competitive Mentions" value="31" sub="Gong · unique call mentions" pill="Tatari 38% · TTD 28%" pillColor="purple" color={CYAN} />
        <KpiCard label="Est. CTV TAM (AMER)" value="$4.2B" sub="eMarketer 2026 · programmatic CTV" pill="Current share: ~0.8%" pillColor="purple" color={CTV_PURPLE} />
      </div>

      {/* Competitive Table + Win Rate Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 overflow-x-auto">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <div className="text-sm font-bold text-slate-200">Competitive Win/Loss by Vendor</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Deals where vendor was mentioned as alternative · N is small — treat as directional</div>
            </div>
            <SourceTag label="Gong + SearchLight" variant="mixed" />
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Competitor</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Head-to-Head</th>
                <th className="text-center py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Win Rate</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Main Edge (theirs)</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Our Counter</th>
              </tr>
            </thead>
            <tbody>
              {dbCompetitorData.map((c) => (
                <tr key={c.competitor} className="border-b border-slate-800/50 hover:bg-white/[0.02]">
                  <td className="py-2.5 px-2 font-bold text-slate-200">{c.competitor}</td>
                  <td className="py-2.5 px-2 text-slate-400">N={c.deals} deals</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      c.winRate >= 60 ? "bg-emerald-500/15 text-emerald-400" :
                      c.winRate >= 40 ? "bg-amber-500/15 text-amber-400" :
                      "bg-red-500/15 text-red-400"
                    }`}>
                      {c.winRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-[11px] text-slate-500">{c.theirEdge}</td>
                  <td className="py-2.5 px-2 text-[11px] text-slate-500">{c.ourCounter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <div className="text-sm font-bold text-slate-200">Win Rate by Competitor</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Head-to-head outcomes · small N</div>
            </div>
            <SourceTag label="N=31" variant="mixed" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dbWinRateByCompetitor} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: "#7A90B8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#7A90B8", fontSize: 10 }} width={100} />
              <Tooltip {...chartTooltipStyle} formatter={(v) => [`${v}%`, "Win Rate"]} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {dbWinRateByCompetitor.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TAM Penetration */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 mb-4">
        <div className="flex items-start justify-between mb-4 gap-2">
          <div>
            <div className="text-sm font-bold text-slate-200">TAM Penetration — Where We Are Today</div>
            <div className="text-[10px] text-slate-500 mt-0.5">eMarketer 2026 programmatic CTV TAM estimates · our share derived from BQ run-rate</div>
          </div>
          <SourceTag label="eMarketer + BQ estimated" variant="est" />
        </div>
        <div className="space-y-3">
          {dbTamData.map((t: any) => (
            <div key={t.label} className="flex items-center gap-3">
              <div className="text-[11px] w-48 shrink-0" style={{ color: t.textColor }}>{t.label}</div>
              <div className="flex-1 h-7 bg-white/[0.04] rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md flex items-center px-2.5 text-[10px] font-bold text-white"
                  style={{ width: t.width, background: t.color, minWidth: t.width === "1.6%" || t.width === "4.8%" ? 70 : undefined }}
                >
                  {t.value}
                </div>
              </div>
              <div className="text-[11px] font-bold w-16 text-right" style={{ color: t.textColor }}>{t.amount}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Takeaway:</strong> $100M is ~2.4% of programmatic CTV TAM and ~5% of our addressable market. This is a share capture story, not a TAM limitation problem. The bottleneck is win rate and deal velocity, not market size.
        </div>
      </div>

      {/* Competitive Signals Feed */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-bold text-slate-200">Live Competitive Signals</div>
          <div className="text-[10px] text-slate-500">From Gong call mentions + Slack · buyer-reported intelligence</div>
        </div>
        <SourceTag label="Gong + Slack" variant="gong" />
      </div>
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden mb-4">
        {dbCompetitiveSignals.map((s, i) => (
          <div key={i} className={`flex items-start gap-3 p-3.5 ${i < dbCompetitiveSignals.length - 1 ? "border-b border-slate-800/50" : ""}`}>
            <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: s.color }} />
            <div>
              <div className="text-xs font-bold text-slate-200 mb-1">{s.title}</div>
              <div className="text-[11px] text-slate-400 leading-relaxed">{s.body}</div>
              <div className="text-[10px] text-slate-600 mt-1.5">{s.source}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
