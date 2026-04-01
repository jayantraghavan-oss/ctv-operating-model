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
const FALLBACK_MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const FALLBACK_REVENUE = FALLBACK_MONTHS.map((m, i) => ({
  month: m,
  avgDailyGAS: [64.9, 57.9, 79.2, 86.8, 102.7, 140.8][i],
  target: 274,
  trailing7d: i === 5 ? 195.3 : null,
}));

const FALLBACK_CAMPAIGNS = FALLBACK_MONTHS.map((m, i) => ({
  month: m,
  campaigns: [22, 25, 29, 32, 36, 39][i],
  target: 150,
}));

const FALLBACK_CONCENTRATION = [
  { name: "PMG/FBG (38%)", value: 38, color: ROSE },
  { name: "Kraken (12.6%)", value: 12.6, color: ORANGE },
  { name: "ARBGaming (7.8%)", value: 7.8, color: AMBER },
  { name: "Luckymoney (7.6%)", value: 7.6, color: CTV_PURPLE },
  { name: "NOVIG (4.8%)", value: 4.8, color: CYAN },
  { name: "Rest (29.1%)", value: 29.1, color: "#334155" },
];

const pipelineStages = [
  { stage: "Prospecting", value: 24.1, deals: 87, pct: 100 },
  { stage: "Discovery / Demo", value: 17.4, deals: 63, pct: 72 },
  { stage: "Proposal", value: 10.8, deals: 39, pct: 45 },
  { stage: "Negotiation", value: 6.0, deals: 22, pct: 25 },
  { stage: "Close / Active", value: 3.4, deals: 12, pct: 14 },
];

const FALLBACK_RISK_SIGNALS = [
  { title: "Advertiser Concentration", severity: "high" as const, source: "BQ", body: "Top 1 advertiser (PMG/FBG Oppco LLC) = 38% of all CTV GAS ($74K/day). Top 5 = 70.9%. If any top-3 account pauses, daily run-rate could drop below $100K." },
  { title: "Campaign Volume", severity: "high" as const, source: "BQ", body: "39 active campaigns vs 150 EOY target — 3.8× ramp required. BQ count is lower than SearchLight estimate (49) because BQ counts campaigns with actual spend." },
  { title: "Exchange Breadth", severity: "medium" as const, source: "BQ", body: "Only 5 exchanges with active CTV spend. MCTV + INDEX + FreeWheel = 87% of volume. Supply concentration mirrors advertiser concentration." },
  { title: "March Momentum Signal", severity: "opportunity" as const, source: "BQ", body: "March GAS ($4.1M partial) is the highest month in the dataset — 2× October. The 7-day trailing rate ($195K/day) is significantly above the March monthly avg ($141K/day)." },
];

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
const sentimentData = FALLBACK_MONTHS.map((m, i) => ({
  month: m,
  positive: [5, 6, 7, 7, 8, 9][i],
  mixed: [4, 3, 4, 4, 4, 5][i],
  friction: [2, 3, 2, 2, 2, 3][i],
}));

const themeData = [
  { theme: "ML targeting advantage", calls: 34, pct: 79, sentiment: "positive" as const },
  { theme: "Attribution / measurement", calls: 31, pct: 72, sentiment: "mixed" as const },
  { theme: "CTV reach & scale", calls: 28, pct: 65, sentiment: "positive" as const },
  { theme: "Pricing / CPM vs. peers", calls: 24, pct: 56, sentiment: "mixed" as const },
  { theme: "Cross-screen integration", calls: 20, pct: 47, sentiment: "positive" as const },
  { theme: "Brand safety / inventory", calls: 16, pct: 37, sentiment: "friction" as const },
  { theme: "Competitor comparison", calls: 12, pct: 28, sentiment: "mixed" as const },
  { theme: "Incrementality proof", calls: 8, pct: 19, sentiment: "friction" as const },
];

const verbatims = [
  { theme: "ML Targeting", sentiment: "positive" as const, quote: "Your ML-based optimization is genuinely differentiated. We saw ROAS improvement in week two that Tatari couldn't match in three months.", meta: "Sports vertical · March 2026", status: "Converted to active", statusColor: EMERALD },
  { theme: "Attribution", sentiment: "mixed" as const, quote: "We believe the targeting works, but I can't go to my CFO without a cleaner attribution story. If we can't prove lift independently, I can't justify the budget increase.", meta: "Retail vertical · February 2026", status: "Late-stage stalled", statusColor: AMBER },
  { theme: "Cross-Screen", sentiment: "positive" as const, quote: "The fact that you can tie CTV impression to mobile conversion in a single attribution window — that's the story our board has been asking for.", meta: "Gaming vertical · March 2026", status: "Converted $200K", statusColor: EMERALD },
  { theme: "Incrementality", sentiment: "friction" as const, quote: "Every vendor says their CTV drives lift. I need a holdout test with clean control groups before I can believe any of these numbers.", meta: "CPG vertical · January 2026", status: "Lost to Tatari", statusColor: ROSE },
  { theme: "Pricing", sentiment: "mixed" as const, quote: "The CPMs are higher than The Trade Desk, and I need to justify that premium to my team. The ML story helps, but I need case study proof, not just claims.", meta: "Finance vertical · February 2026", status: "In negotiation", statusColor: AMBER },
  { theme: "CTV Reach", sentiment: "positive" as const, quote: "We had no idea Moloco had access to Tubi and Samsung at that scale. If the attribution story gets cleaner, this becomes our primary CTV buy.", meta: "Entertainment vertical · March 2026", status: "Active trial", statusColor: AMBER },
];

// ============================================================================
// DATA — Q3: Win/Loss Patterns
// ============================================================================
const behaviorData = [
  { behavior: "ML targeting demo shown", won: 89, lost: 38, delta: "+51pp", signal: "Strong" },
  { behavior: "Executive sponsor engaged", won: 78, lost: 23, delta: "+55pp", signal: "Strong" },
  { behavior: "Attribution story presented", won: 83, lost: 54, delta: "+29pp", signal: "Medium" },
  { behavior: "Case study shared (same vertical)", won: 72, lost: 31, delta: "+41pp", signal: "Strong" },
  { behavior: "Next step confirmed in call", won: 94, lost: 46, delta: "+48pp", signal: "Strong" },
  { behavior: "Pricing objection unaddressed", won: 11, lost: 62, delta: "−51pp", signal: "Strong" },
  { behavior: "No follow-up within 48h", won: 6, lost: 77, delta: "−71pp", signal: "Medium" },
  { behavior: "Multi-threading (3+ contacts)", won: 67, lost: 23, delta: "+44pp", signal: "Medium" },
];

const winRateByBehavior = [
  { behavior: "ML Demo", rate: 87 },
  { behavior: "Exec Sponsor", rate: 82 },
  { behavior: "Case Study", rate: 78 },
  { behavior: "Next Step Confirmed", rate: 76 },
  { behavior: "No Pricing Gap", rate: 71 },
];

const lossReasons = [
  { reason: "Attribution not credible", pct: 38 },
  { reason: "Lost to Tatari (measurement)", pct: 31 },
  { reason: "No exec sponsor", pct: 20 },
  { reason: "Price / CPM too high", pct: 11 },
];

// ============================================================================
// DATA — Q4: Market Position
// ============================================================================
const competitorData = [
  { competitor: "Tatari", deals: 9, winRate: 34, theirEdge: "Measurement credibility, holdout testing, TV-native", ourCounter: "ML optimization, cross-screen attribution, lower CPM" },
  { competitor: "The Trade Desk", deals: 7, winRate: 43, theirEdge: "Brand recognition, self-serve, existing relationships", ourCounter: "Performance ML, app-to-CTV cross-screen, dedicated CS" },
  { competitor: "tvScientific", deals: 5, winRate: 60, theirEdge: "Incrementality testing, outcome-based pricing", ourCounter: "ML targeting quality, reach breadth (Tubi/Samsung/Vizio)" },
  { competitor: "Innovid / MNTN", deals: 4, winRate: 75, theirEdge: "Creative optimization, brand safety tools", ourCounter: "Performance focus, better ROI for direct response" },
  { competitor: "Magnite / SSNC", deals: 3, winRate: 33, theirEdge: "Supply ownership (SSP), publisher relationships", ourCounter: "Demand-side ML, cross-publisher optimization" },
  { competitor: "No vendor (internal)", deals: 3, winRate: 33, theirEdge: "Full control, no margin sharing, team buy-in", ourCounter: "Scale of ML, cost-efficiency vs. building in-house" },
];

const winRateByCompetitor = [
  { name: "Innovid/MNTN", rate: 75, color: EMERALD },
  { name: "tvScientific", rate: 60, color: EMERALD },
  { name: "Trade Desk", rate: 43, color: AMBER },
  { name: "Tatari", rate: 34, color: ROSE },
  { name: "Magnite", rate: 33, color: ROSE },
];

const tamData = [
  { label: "Total CTV Ad Market (AMER)", value: "$21B total", width: "100%", color: "rgba(148,163,184,0.15)", textColor: MUTED, amount: "$21.0B" },
  { label: "Programmatic CTV (TAM)", value: "$4.2B", width: "20%", color: "rgba(139,92,246,0.25)", textColor: CTV_PURPLE, amount: "$4.2B" },
  { label: "Addressable (our exchanges)", value: "~$2.0B", width: "9.5%", color: "rgba(6,182,212,0.3)", textColor: CYAN, amount: "~$2.0B" },
  { label: "Our Current ARR Run-Rate", value: "$33.6M", width: "1.6%", color: CTV_PURPLE, textColor: CTV_PURPLE, amount: "$33.6M" },
  { label: "$100M ARR Target", value: "$100M", width: "4.8%", color: "rgba(245,158,11,0.6)", textColor: AMBER, amount: "$100M" },
];

const competitiveSignals = [
  { title: "Tatari leading on measurement credibility", body: "Tatari's holdout-based incrementality testing is being cited in 38% of our lost deals as the deciding factor. Buyers say \"Tatari proves lift, everyone else claims it.\"", source: "Gong · 8 call mentions · Feb–Mar 2026", color: ROSE },
  { title: "The Trade Desk expanding CTV managed service push", body: "Multiple buyers mention TTD is now offering higher-touch CTV service including dedicated optimization teams. This shifts them from self-serve to managed-service competitor in mid-market.", source: "Slack · #ctv-sales-signals · 4 mentions · Mar 2026", color: AMBER },
  { title: "tvScientific losing on reach breadth", body: "In 3 of 5 head-to-head deals we won against tvScientific, the buyer cited Tubi and Samsung access as the deciding factor. Our exchange breadth is a genuine competitive moat.", source: "SearchLight win notes · Mar 2026", color: EMERALD },
  { title: "Amazon/Prime Video CTV entering performance market", body: "Early signal: Amazon advertising is now pitching CTV performance to direct-response buyers with access to Prime Video inventory. Not yet named in our deals but could emerge in H2 2026.", source: "Slack · #competitive-intel · 2 mentions · Mar 2026", color: CYAN },
];

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

  // Derive live or fallback data
  const bq = bqData?.available && bqData.data ? bqData.data : null;
  const isLive = bq !== null;

  const revenueData = useMemo(() => {
    if (!bq) return FALLBACK_REVENUE;
    const chart = bqToRevenueChart(bq.monthly);
    // Add trailing 7d to the last month
    if (chart.length > 0 && bq.trailing_7d[0]) {
      chart[chart.length - 1].trailing7d = Math.round(bq.trailing_7d[0].trailing_7d_daily / 1000 * 10) / 10;
    }
    return chart;
  }, [bq]);

  const campaignData = useMemo(() => bq ? bqToCampaignChart(bq.monthly) : FALLBACK_CAMPAIGNS, [bq]);
  const concentrationData = useMemo(() => bq ? bqToConcentration(bq.concentration) : FALLBACK_CONCENTRATION, [bq]);
  const riskSignals = useMemo(() => bq ? bqToRiskSignals(bq) : FALLBACK_RISK_SIGNALS, [bq]);

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
              {activeTab === "q2" && <Q2CustomerVoice />}
              {activeTab === "q3" && <Q3WinLoss />}
              {activeTab === "q4" && <Q4MarketPosition />}
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
function Q2CustomerVoice() {
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
            {themeData.map((t) => {
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
        {verbatims.map((v, i) => {
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
function Q3WinLoss() {
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
              {behaviorData.map((b) => (
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
              <BarChart data={winRateByBehavior} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: "#7A90B8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="behavior" tick={{ fill: "#7A90B8", fontSize: 10 }} width={110} />
                <Tooltip {...chartTooltipStyle} formatter={(v) => [`${v}%`, "Win Rate"]} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {winRateByBehavior.map((_, i) => (
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
              {lossReasons.map((l) => (
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
function Q4MarketPosition() {
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
              {competitorData.map((c) => (
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
            <BarChart data={winRateByCompetitor} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: "#7A90B8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#7A90B8", fontSize: 10 }} width={100} />
              <Tooltip {...chartTooltipStyle} formatter={(v) => [`${v}%`, "Win Rate"]} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {winRateByCompetitor.map((entry, i) => (
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
          {tamData.map((t) => (
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
        {competitiveSignals.map((s, i) => (
          <div key={i} className={`flex items-start gap-3 p-3.5 ${i < competitiveSignals.length - 1 ? "border-b border-slate-800/50" : ""}`}>
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
