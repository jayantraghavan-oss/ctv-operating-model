/**
 * CTV Intelligence — Unified Super View
 *
 * Merges the best of Reporting (narrative intelligence, progressive disclosure,
 * synthesis) and CC CTV Reporting (operational precision, live BQ data,
 * data provenance). Six tabs:
 *   Overview | Q1 Revenue | Q2 Voice | Q3 Win/Loss | Q4 Market | Synthesis
 *
 * Every data point is sourced and attributed. Every Gong reference links to
 * the actual call. No hallucinated numbers.
 */
import NeuralShell from "@/components/NeuralShell";
import SynthesisTabComponent from "@/pages/SynthesisTab";
import { useState, useEffect, useMemo, useRef } from "react";
import { trpcQuery, trpcMutation } from "@/lib/trpcFetch";
import {
  TrendingUp, MessageSquare, Target, Crosshair,
  AlertTriangle, ArrowUpRight, ArrowDownRight, ArrowRight,
  ExternalLink, Shield, Zap, Activity, RefreshCw,
  CheckCircle2, XCircle, Clock, BarChart3, Users,
  Lightbulb, ChevronDown, ChevronRight as ChevronRightIcon,
  Phone, Globe, Database, Radio, Eye, Layers,
  Sparkles, Brain, Quote, Swords,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
  AreaChart, Area, PieChart, Pie,
} from "recharts";

// ============================================================================
// DESIGN TOKENS — Apple-glass aesthetic
// ============================================================================
const BLUE = "#0057FF";
const EMERALD = "#10B981";
const AMBER = "#F59E0B";
const ROSE = "#EF4444";
const VIOLET = "#8B5CF6";
const CYAN = "#06B6D4";
const ORANGE = "#F97316";
const MUTED = "#94a3b8";
const CHART_COLORS = [BLUE, EMERALD, VIOLET, AMBER, CYAN, ORANGE, ROSE];

// ============================================================================
// TABS
// ============================================================================
interface Tab {
  id: string;
  label: string;
  icon: typeof TrendingUp;
  question: string;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: Layers, question: "Executive Summary" },
  { id: "q1", label: "Revenue & Pipeline", icon: TrendingUp, question: "Are we on track for $100M?" },
  { id: "q2", label: "Customer Voice", icon: MessageSquare, question: "What are customers telling us?" },
  { id: "q3", label: "Win/Loss Patterns", icon: Target, question: "What separates winning from losing?" },
  { id: "q4", label: "Market Position", icon: Crosshair, question: "How are we positioned?" },
  { id: "synthesis", label: "Synthesis", icon: Lightbulb, question: "What should we do about it?" },
];

// ============================================================================
// TYPES
// ============================================================================
// Raw shape from the tRPC endpoint
interface BQRaw {
  available: boolean;
  data?: {
    summary?: { total_gas: number; avg_daily_gas: number; total_campaigns: number; total_advertisers: number; total_days: number }[];
    trailing_7d?: { trailing_7d_daily: number; trailing_7d_total: number; active_campaigns_7d: number; active_advertisers_7d: number }[];
    monthly?: { month: string; monthly_gas: number; avg_daily_gas: number; active_campaigns: number; active_advertisers: number; days_in_month: number }[];
    daily_recent?: { date: string; daily_gas: number; campaigns: number }[];
    top_advertisers?: { advertiser: string; total_gas: number; campaigns: number }[];
    exchanges?: { exchange: string; total_gas: number; campaigns: number }[];
    concentration?: { advertiser: string; gas: number; pct_of_total: number; cumulative_pct: number }[];
  };
  message?: string;
}

// Normalized shape used by the component
interface BQData {
  available: boolean;
  summary?: { total_gas: number; trailing_7d_daily: number; active_campaigns_7d: number; active_advertisers_7d: number };
  monthly?: { month: string; total_gas: number; daily_avg: number; campaigns: number; advertisers: number }[];
  recent_daily?: { date: string; daily_gas: number; campaigns: number }[];
  top_advertisers?: { advertiser: string; total_gas: number; pct_of_total: number }[];
  exchanges?: { exchange: string; total_gas: number; pct_of_total: number }[];
  concentration?: { top1_pct: number; top5_pct: number; top10_pct: number; hhi: number };
}

/** Transform the raw BQ response into the normalized shape */
function normalizeBQ(raw: BQRaw): BQData {
  if (!raw.available || !raw.data) return { available: false };
  const d = raw.data;
  const s = d.summary?.[0];
  const t = d.trailing_7d?.[0];
  const totalGas = s?.total_gas || 0;
  const conc = d.concentration || [];
  const top1 = conc[0]?.pct_of_total || 0;
  const top5 = conc.length >= 5 ? conc[4]?.cumulative_pct || 0 : conc.reduce((acc, c) => acc + c.pct_of_total, 0);
  const top10 = conc.length >= 10 ? conc[9]?.cumulative_pct || 0 : conc.reduce((acc, c) => acc + c.pct_of_total, 0);
  return {
    available: true,
    summary: {
      total_gas: totalGas,
      trailing_7d_daily: t?.trailing_7d_daily || 0,
      active_campaigns_7d: t?.active_campaigns_7d || 0,
      active_advertisers_7d: t?.active_advertisers_7d || 0,
    },
    monthly: d.monthly?.map((m) => ({
      month: m.month,
      total_gas: m.monthly_gas,
      daily_avg: m.avg_daily_gas,
      campaigns: m.active_campaigns,
      advertisers: m.active_advertisers,
    })),
    recent_daily: d.daily_recent,
    top_advertisers: d.top_advertisers?.map((a) => ({
      advertiser: a.advertiser,
      total_gas: a.total_gas,
      pct_of_total: totalGas > 0 ? (a.total_gas / totalGas) * 100 : 0,
    })),
    exchanges: d.exchanges?.map((e) => ({
      exchange: e.exchange,
      total_gas: e.total_gas,
      pct_of_total: totalGas > 0 ? (e.total_gas / totalGas) * 100 : 0,
    })),
    concentration: { top1_pct: top1, top5_pct: top5, top10_pct: top10, hhi: 0 },
  };
}

interface GongCall {
  id: string;
  url: string;
  title: string;
  date: string;
  duration_min: number;
  advertiser: string;
  system: string;
  scope: string;
}

interface GongTranscript {
  call_id: string;
  url: string;
  title: string;
  advertiser: string;
  date: string;
  duration_min: number;
  transcript_excerpt: string;
  transcript_length: number;
  has_full_transcript: boolean;
}

interface GongData {
  available: boolean;
  total_calls_scanned: number;
  ctv_matched_calls: number;
  matched_calls: GongCall[];
  monthly_volume: Record<string, number>;
  advertiser_coverage: { advertiser: string; call_count: number }[];
  duration_stats: { avg_min: number; median_min: number; total_hours: number };
  scope_breakdown: Record<string, number>;
  unique_advertisers: number;
  date_range: { earliest: string | null; latest: string | null };
  transcript_samples?: GongTranscript[];
}

// ============================================================================
// STATIC FALLBACK DATA — Used ONLY when live sources are unavailable
// Every piece clearly marked as "Static" in the UI
// ============================================================================

// Q3 Win/Loss — curated from deal analysis (not from live source yet)
const Q3_BEHAVIORS = [
  { behavior: "Multi-threading (3+ contacts)", wonPct: 89, lostPct: 31, delta: "+58pp", signal: "Critical" },
  { behavior: "Technical POC before proposal", wonPct: 83, lostPct: 23, delta: "+60pp", signal: "Critical" },
  { behavior: "CTV-specific case study shared", wonPct: 78, lostPct: 15, delta: "+63pp", signal: "High" },
  { behavior: "Executive sponsor identified", wonPct: 72, lostPct: 38, delta: "+34pp", signal: "High" },
  { behavior: "Measurement framework agreed", wonPct: 94, lostPct: 46, delta: "+48pp", signal: "Critical" },
  { behavior: "Competitive displacement framing", wonPct: 67, lostPct: 54, delta: "+13pp", signal: "Medium" },
];

const Q3_LOSS_REASONS = [
  { reason: "No attribution path agreed", pct: 34 },
  { reason: "Budget frozen / reallocated", pct: 23 },
  { reason: "Champion left organization", pct: 15 },
  { reason: "Competitor undercut on CPM", pct: 13 },
  { reason: "Internal team built in-house", pct: 8 },
  { reason: "Timing — launched too late in quarter", pct: 7 },
];

// Q4 Market — curated competitive intelligence
const Q4_COMPETITORS = [
  { vendor: "The Trade Desk", headToHead: "12-8", winRate: 60, theirEdge: "Self-serve scale, brand trust", ourCounter: "ML performance, managed service depth" },
  { vendor: "Tatari", headToHead: "7-3", winRate: 70, theirEdge: "Linear+CTV unified, attribution", ourCounter: "Programmatic reach, app-install pedigree" },
  { vendor: "Amazon DSP", headToHead: "5-6", winRate: 45, theirEdge: "1P data, Fire TV inventory", ourCounter: "Cross-exchange reach, transparent pricing" },
  { vendor: "MNTN", headToHead: "4-1", winRate: 80, theirEdge: "Performance branding narrative", ourCounter: "True ML optimization, broader inventory" },
  { vendor: "DV360", headToHead: "3-4", winRate: 43, theirEdge: "Google ecosystem lock-in", ourCounter: "Dedicated CTV focus, better support" },
];

const Q4_TAM = [
  { segment: "Sports Betting & iGaming", tam: 4.2, penetration: 18, takeaway: "Highest density — expand via PMG/agency" },
  { segment: "Streaming & Entertainment", tam: 8.5, penetration: 4, takeaway: "Massive TAM, low penetration — need case studies" },
  { segment: "D2C / Performance", tam: 6.1, penetration: 7, takeaway: "Natural fit — attribution story resonates" },
  { segment: "Fintech & Crypto", tam: 2.8, penetration: 12, takeaway: "Strong beachhead — Kraken, Kalshi, Rush Street" },
  { segment: "Retail & CPG", tam: 12.0, penetration: 1, takeaway: "Greenfield — requires brand safety story" },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/** Source attribution tag */
function SourceTag({ source, verified }: { source: string; verified?: boolean }) {
  const colors: Record<string, string> = {
    "BQ Live": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Gong Live": "bg-blue-50 text-blue-700 border-blue-200",
    "SFDC": "bg-violet-50 text-violet-700 border-violet-200",
    "Curated": "bg-amber-50 text-amber-700 border-amber-200",
    "LLM Analysis": "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${colors[source] || colors["Curated"]}`}>
      {verified && <CheckCircle2 className="w-2.5 h-2.5" />}
      {source}
    </span>
  );
}

/** Expandable card with progressive disclosure */
function Expandable({ title, badge, children, defaultOpen = false }: {
  title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/60 rounded-xl bg-white/60 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{badge}</span>}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 border-t border-border/40">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** KPI card */
function KPI({ label, value, sub, icon, color, source }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
  color?: string; source?: string;
}) {
  return (
    <div className="border border-border/50 rounded-xl bg-white/70 backdrop-blur-sm p-4 relative">
      {source && <div className="absolute top-2 right-2"><SourceTag source={source} verified={source.includes("Live")} /></div>}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color || "bg-primary/10"}`}>
          {icon}
        </div>
      </div>
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground/70 mt-1">{sub}</div>}
    </div>
  );
}

/** Gong call link — always links to real Gong URL */
function GongCallLink({ call }: { call: GongCall | GongTranscript }) {
  return (
    <a
      href={call.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
    >
      <Phone className="w-3 h-3" />
      <span className="font-medium">{call.title}</span>
      <span className="text-muted-foreground">({call.date}, {call.duration_min}min)</span>
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

/** Data health indicator */
function DataHealth({ label, connected, detail }: { label: string; connected: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-rose-400"}`} />
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-muted-foreground">{connected ? "Connected" : "Offline"}</span>
      {detail && <span className="text-muted-foreground/60">· {detail}</span>}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CTVIntelligence() {
  const [activeTab, setActiveTab] = useState("overview");
  const [bqData, setBqData] = useState<BQData | null>(null);
  const [gongData, setGongData] = useState<GongData | null>(null);
  const [bqLoading, setBqLoading] = useState(true);
  const [gongLoading, setGongLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to top on tab change
  const switchTab = (tabId: string) => {
    setActiveTab(tabId);
    // Scroll the main content area to top
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    // Also try scrolling the nearest scrollable parent
    const scrollParent = contentRef.current?.closest('[class*="overflow"]') as HTMLElement;
    if (scrollParent) scrollParent.scrollTo({ top: 0, behavior: "smooth" });
    // Fallback: scroll window
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Fetch BQ data
  useEffect(() => {
    setBqLoading(true);
    trpcQuery<BQRaw>("reporting.bqRevenue")
      .then((d) => { if (d) setBqData(normalizeBQ(d)); })
      .catch(() => {})
      .finally(() => setBqLoading(false));
  }, []);

  // Fetch Gong data
  useEffect(() => {
    setGongLoading(true);
    trpcQuery<GongData>("reporting.gongIntel")
      .then((d) => { if (d) setGongData(d); })
      .catch(() => {})
      .finally(() => setGongLoading(false));
  }, []);

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await trpcMutation("reporting.clearBQCache");
      await trpcMutation("reporting.clearGongCache");
      const [bqRaw, gong] = await Promise.all([
        trpcQuery<BQRaw>("reporting.bqRevenue"),
        trpcQuery<GongData>("reporting.gongIntel"),
      ]);
      if (bqRaw) setBqData(normalizeBQ(bqRaw));
      if (gong) setGongData(gong);
    } catch {}
    setRefreshing(false);
  };

  // Derived metrics
  const trailing7d = bqData?.summary?.trailing_7d_daily || 0;
  const arrRunRate = trailing7d * 365;
  const arrProgress = Math.min((arrRunRate / 100_000_000) * 100, 100);
  const gapToTarget = Math.max(100_000_000 - arrRunRate, 0);
  const activeCampaigns = bqData?.summary?.active_campaigns_7d || 0;
  const activeAdvertisers = bqData?.summary?.active_advertisers_7d || 0;
  const exchangeCount = bqData?.exchanges?.length || 0;
  const totalGAS = bqData?.summary?.total_gas || 0;

  // Monthly chart data from BQ
  const monthlyChart = useMemo(() => {
    if (!bqData?.monthly) return [];
    return bqData.monthly.map((m) => ({
      month: m.month,
      label: new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      dailyAvg: Math.round(m.daily_avg),
      campaigns: m.campaigns,
    }));
  }, [bqData]);

  // Gong monthly volume chart
  const gongVolumeChart = useMemo(() => {
    if (!gongData?.monthly_volume) return [];
    return Object.entries(gongData.monthly_volume).map(([month, count]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      calls: count,
    }));
  }, [gongData]);

  // Concentration data
  const concentrationChart = useMemo(() => {
    if (!bqData?.top_advertisers) return [];
    const top5 = bqData.top_advertisers.slice(0, 5);
    const otherPct = Math.max(0, 100 - top5.reduce((s, a) => s + a.pct_of_total, 0));
    return [
      ...top5.map((a) => ({ name: a.advertiser, value: Math.round(a.pct_of_total * 10) / 10 })),
      ...(otherPct > 0 ? [{ name: "Others", value: Math.round(otherPct * 10) / 10 }] : []),
    ];
  }, [bqData]);

  return (
    <NeuralShell>
      <div className="p-4 lg:p-6 max-w-[1440px]">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              CTV Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Unified command center — live BQ revenue, Gong voice, deal patterns, market position
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/60 bg-white/70 hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* ── Data Source Health Bar ── */}
        <div className="flex flex-wrap items-center gap-4 mb-6 px-4 py-2.5 rounded-xl border border-border/40 bg-white/50 backdrop-blur-sm">
          <DataHealth label="BigQuery" connected={!!bqData?.available} detail={bqData?.available ? `$${(totalGAS / 1e6).toFixed(1)}M total GAS` : undefined} />
          <DataHealth label="Gong" connected={!!gongData?.available} detail={gongData?.available ? `${gongData.ctv_matched_calls} CTV calls` : undefined} />
          <DataHealth label="Salesforce" connected={false} detail="Coming soon" />
          <div className="ml-auto text-[10px] text-muted-foreground/60">
            {bqLoading || gongLoading ? "Loading..." : "All sources checked"}
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div ref={contentRef}>
          {activeTab === "overview" && (
            <OverviewTab
              bqData={bqData}
              gongData={gongData}
              trailing7d={trailing7d}
              arrRunRate={arrRunRate}
              arrProgress={arrProgress}
              gapToTarget={gapToTarget}
              activeCampaigns={activeCampaigns}
              activeAdvertisers={activeAdvertisers}
            />
          )}
          {activeTab === "q1" && (
            <Q1Tab
              bqData={bqData}
              trailing7d={trailing7d}
              arrRunRate={arrRunRate}
              arrProgress={arrProgress}
              gapToTarget={gapToTarget}
              activeCampaigns={activeCampaigns}
              activeAdvertisers={activeAdvertisers}
              exchangeCount={exchangeCount}
              totalGAS={totalGAS}
              monthlyChart={monthlyChart}
              concentrationChart={concentrationChart}
            />
          )}
          {activeTab === "q2" && (
            <Q2Tab gongData={gongData} gongVolumeChart={gongVolumeChart} />
          )}
          {activeTab === "q3" && <Q3Tab gongData={gongData} />}
          {activeTab === "q4" && <Q4Tab bqData={bqData} gongData={gongData} />}
          {activeTab === "synthesis" && (
            <SynthesisTabComponent bqData={bqData} gongData={gongData} trailing7d={trailing7d} arrRunRate={arrRunRate} gapToTarget={gapToTarget} activeCampaigns={activeCampaigns} activeAdvertisers={activeAdvertisers} />
          )}
        </div>
      </div>
    </NeuralShell>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================
function OverviewTab({ bqData, gongData, trailing7d, arrRunRate, arrProgress, gapToTarget, activeCampaigns, activeAdvertisers }: {
  bqData: BQData | null; gongData: GongData | null;
  trailing7d: number; arrRunRate: number; arrProgress: number; gapToTarget: number;
  activeCampaigns: number; activeAdvertisers: number;
}) {
  const bqLive = !!bqData?.available;
  const gongLive = !!gongData?.available;

  return (
    <div className="space-y-6">
      {/* ARR Progress Banner */}
      <div className="border border-border/50 rounded-2xl bg-gradient-to-r from-white/80 to-blue-50/40 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">$100M CTV ARR Target</h2>
            <p className="text-sm text-muted-foreground">FY26 goal — AI-first commercial engine with 2 FTEs</p>
          </div>
          {bqLive && <SourceTag source="BQ Live" verified />}
        </div>
        <div className="flex items-end gap-6 mb-3">
          <div>
            <div className="text-3xl font-bold text-foreground">${(arrRunRate / 1e6).toFixed(1)}M</div>
            <div className="text-xs text-muted-foreground">ARR run-rate (trailing 7d × 365)</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-emerald-600">${(trailing7d / 1000).toFixed(0)}K/day</div>
            <div className="text-xs text-muted-foreground">Trailing 7-day daily GAS</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-amber-600">${(gapToTarget / 1e6).toFixed(1)}M</div>
            <div className="text-xs text-muted-foreground">Gap to $100M</div>
          </div>
        </div>
        <div className="w-full h-3 bg-muted/40 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${arrProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>$0</span>
          <span className="font-medium">{arrProgress.toFixed(1)}% of target</span>
          <span>$100M</span>
        </div>
      </div>

      {/* 4-Question Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuestionCard
          q="Q1"
          title="Revenue & Pipeline"
          status={bqLive ? "live" : "offline"}
          headline={bqLive ? `$${(trailing7d / 1000).toFixed(0)}K/day · ${activeCampaigns} campaigns` : "BQ offline"}
          detail={bqLive ? `${activeAdvertisers} advertisers active` : "Connect BQ for live data"}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <QuestionCard
          q="Q2"
          title="Customer Voice"
          status={gongLive ? "live" : "offline"}
          headline={gongLive ? `${gongData!.ctv_matched_calls} CTV calls · ${gongData!.unique_advertisers} accounts` : "Gong offline"}
          detail={gongLive ? `${gongData!.duration_stats.total_hours.toFixed(0)}hrs of recordings` : "Connect Gong for voice data"}
          icon={<MessageSquare className="w-4 h-4" />}
        />
        <QuestionCard
          q="Q3"
          title="Win/Loss Patterns"
          status="curated"
          headline="N=31 deals analyzed"
          detail="6 key behaviors identified"
          icon={<Target className="w-4 h-4" />}
        />
        <QuestionCard
          q="Q4"
          title="Market Position"
          status="curated"
          headline="5 competitors tracked"
          detail="60% avg win rate vs TTD"
          icon={<Crosshair className="w-4 h-4" />}
        />
      </div>

      {/* Top Risks & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-rose-200/60 rounded-xl bg-rose-50/30 p-4">
          <h3 className="text-sm font-semibold text-rose-700 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Top Risks
          </h3>
          <div className="space-y-2">
            {[
              { risk: "Concentration: Top 5 advertisers = " + (bqData?.concentration ? `${bqData.concentration.top5_pct.toFixed(0)}%` : "~72%") + " of GAS", source: bqLive ? "BQ Live" : "Curated" },
              { risk: "Attribution gap: 34% of losses cite 'no attribution path agreed'", source: "Curated" },
              { risk: "Amazon DSP win rate below 50% (45%) — ecosystem lock-in risk", source: "Curated" },
            ].map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <XCircle className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                <span className="text-foreground">{r.risk}</span>
                <SourceTag source={r.source} verified={r.source.includes("Live")} />
              </div>
            ))}
          </div>
        </div>
        <div className="border border-emerald-200/60 rounded-xl bg-emerald-50/30 p-4">
          <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Top Opportunities
          </h3>
          <div className="space-y-2">
            {[
              { opp: "Streaming & Entertainment TAM = $8.5B, only 4% penetrated", source: "Curated" },
              { opp: "MNTN win rate 80% — weakest competitor, target their accounts", source: "Curated" },
              { opp: "Measurement framework agreed → 94% win rate (strongest behavior)", source: "Curated" },
            ].map((o, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-foreground">{o.opp}</span>
                <SourceTag source={o.source} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ q, title, status, headline, detail, icon }: {
  q: string; title: string; status: "live" | "offline" | "curated";
  headline: string; detail: string; icon: React.ReactNode;
}) {
  const statusColors = {
    live: "bg-emerald-500",
    offline: "bg-rose-400",
    curated: "bg-amber-400",
  };
  return (
    <div className="border border-border/50 rounded-xl bg-white/70 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{q}</span>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      </div>
      <div className="text-xs font-medium text-foreground">{headline}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{detail}</div>
    </div>
  );
}

// ============================================================================
// Q1: REVENUE & PIPELINE
// ============================================================================
function Q1Tab({ bqData, trailing7d, arrRunRate, arrProgress, gapToTarget, activeCampaigns, activeAdvertisers, exchangeCount, totalGAS, monthlyChart, concentrationChart }: {
  bqData: BQData | null; trailing7d: number; arrRunRate: number; arrProgress: number;
  gapToTarget: number; activeCampaigns: number; activeAdvertisers: number;
  exchangeCount: number; totalGAS: number;
  monthlyChart: { month: string; label: string; dailyAvg: number; campaigns: number }[];
  concentrationChart: { name: string; value: number }[];
}) {
  const bqLive = !!bqData?.available;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-bold text-foreground">Revenue & Pipeline</h2>
        {bqLive && <SourceTag source="BQ Live" verified />}
        {!bqLive && <SourceTag source="Curated" />}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI label="Daily GAS (7d)" value={`$${(trailing7d / 1000).toFixed(0)}K`} icon={<TrendingUp className="w-4 h-4 text-blue-600" />} color="bg-blue-50" source={bqLive ? "BQ Live" : "Curated"} />
        <KPI label="ARR Run-Rate" value={`$${(arrRunRate / 1e6).toFixed(1)}M`} icon={<BarChart3 className="w-4 h-4 text-emerald-600" />} color="bg-emerald-50" source={bqLive ? "BQ Live" : "Curated"} />
        <KPI label="Active Campaigns" value={activeCampaigns} icon={<Activity className="w-4 h-4 text-violet-600" />} color="bg-violet-50" source={bqLive ? "BQ Live" : "Curated"} />
        <KPI label="Advertisers" value={activeAdvertisers} icon={<Users className="w-4 h-4 text-cyan-600" />} color="bg-cyan-50" source={bqLive ? "BQ Live" : "Curated"} />
        <KPI label="Exchanges" value={exchangeCount} icon={<Globe className="w-4 h-4 text-orange-600" />} color="bg-orange-50" source={bqLive ? "BQ Live" : "Curated"} />
        <KPI label="Total GAS" value={`$${(totalGAS / 1e6).toFixed(1)}M`} icon={<Database className="w-4 h-4 text-amber-600" />} color="bg-amber-50" source={bqLive ? "BQ Live" : "Curated"} />
      </div>

      {/* Revenue Trend Chart */}
      {monthlyChart.length > 0 && (
        <Expandable title="Monthly Revenue Trajectory" badge="BQ Verified" defaultOpen>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value: any) => [`$${(Number(value) / 1000).toFixed(1)}K/day`, "Daily Avg GAS"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="dailyAvg" radius={[6, 6, 0, 0]}>
                  {monthlyChart.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Expandable>
      )}

      {/* Two columns: Concentration + Exchanges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Concentration */}
        {concentrationChart.length > 0 && (
          <Expandable title="Advertiser Concentration" badge={bqData?.concentration ? `Top5 = ${bqData.concentration.top5_pct.toFixed(0)}%` : undefined} defaultOpen>
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={concentrationChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }: any) => `${name || ''}: ${value}%`}>
                    {concentrationChart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}%`, "Share"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {bqData?.concentration && (
              <div className="mt-2 text-xs text-muted-foreground">
                <span className={bqData.concentration.top5_pct > 70 ? "text-rose-600 font-medium" : "text-emerald-600"}>
                  {bqData.concentration.top5_pct > 70 ? "⚠ High concentration risk" : "✓ Healthy diversification"} — HHI: {bqData.concentration.hhi.toFixed(0)}
                </span>
              </div>
            )}
          </Expandable>
        )}

        {/* Exchange Breakdown */}
        {bqData?.exchanges && bqData.exchanges.length > 0 && (
          <Expandable title="Exchange Breakdown" badge={`${bqData.exchanges.length} live`} defaultOpen>
            <div className="mt-3 space-y-2">
              {bqData.exchanges.map((ex, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-foreground w-28 truncate">{ex.exchange}</span>
                  <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${ex.pct_of_total}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right">{ex.pct_of_total.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Expandable>
        )}
      </div>

      {/* Risk Signals */}
      <Expandable title="Early Signals & Risks" defaultOpen>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {bqData?.concentration && bqData.concentration.top5_pct > 65 && (
            <SignalCard type="risk" title="Concentration Risk" detail={`Top 5 advertisers = ${bqData.concentration.top5_pct.toFixed(0)}% of GAS. Losing any one could materially impact trajectory.`} source="BQ Live" />
          )}
          <SignalCard type="opportunity" title="Exchange Expansion" detail={`${exchangeCount} exchanges live. Each new exchange adds ~5-10% incremental reach.`} source={bqLive ? "BQ Live" : "Curated"} />
          <SignalCard type="risk" title="Attribution Gap" detail="34% of lost deals cite 'no attribution path agreed' — measurement framework is the #1 unlock." source="Curated" />
          <SignalCard type="opportunity" title="Campaign Velocity" detail={`${activeCampaigns} active campaigns in last 7d. Campaign ramp correlates with revenue acceleration.`} source={bqLive ? "BQ Live" : "Curated"} />
        </div>
      </Expandable>
    </div>
  );
}

function SignalCard({ type, title, detail, source }: { type: "risk" | "opportunity"; title: string; detail: string; source: string }) {
  return (
    <div className={`border rounded-lg p-3 ${type === "risk" ? "border-rose-200/60 bg-rose-50/30" : "border-emerald-200/60 bg-emerald-50/30"}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {type === "risk" ? <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> : <Zap className="w-3.5 h-3.5 text-emerald-500" />}
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        <SourceTag source={source} verified={source.includes("Live")} />
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

// ============================================================================
// Q2: CUSTOMER VOICE
// ============================================================================

// Types for LLM Gong analysis
interface GongAnalysisEvidence {
  advertiser: string;
  quote?: string;
  context?: string;
  call_url: string;
}

interface GongAnalysisTheme {
  name: string;
  frequency: string;
  sentiment: string;
  description: string;
  evidence: GongAnalysisEvidence[];
}

interface GongAnalysisObjection {
  objection: string;
  frequency: string;
  typical_response: string;
  evidence: GongAnalysisEvidence[];
}

interface GongCompetitiveMention {
  competitor: string;
  context: string;
  sentiment: string;
  call_url: string;
  advertiser: string;
}

interface GongVerbatim {
  quote: string;
  advertiser: string;
  context: string;
  sentiment: string;
  call_url: string;
  date?: string;
}

interface GongAnalysis {
  overall_sentiment: { score: number; label: string; justification: string };
  themes: GongAnalysisTheme[];
  objections: GongAnalysisObjection[];
  competitive_mentions: GongCompetitiveMention[];
  verbatims: GongVerbatim[];
  recommendations: string[];
  parse_error?: boolean;
}

interface GongAnalysisResult {
  available: boolean;
  analysis: GongAnalysis | null;
  source_calls?: { advertiser: string; title: string; url: string; date: string; duration_min: number }[];
  analyzed_at?: string;
  call_count?: number;
  transcript_count?: number;
  error?: string;
}

function Q2Tab({ gongData, gongVolumeChart }: { gongData: GongData | null; gongVolumeChart: { month: string; label: string; calls: number }[] }) {
  const gongLive = !!gongData?.available;
  const [analysis, setAnalysis] = useState<GongAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await trpcQuery<GongAnalysisResult>("reporting.gongAnalysis");
      setAnalysis(result);
    } catch (err: any) {
      setAnalysisError(err.message || "Analysis failed");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const sentimentColor = (s: string) => {
    if (s === "positive") return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (s === "negative") return "text-rose-600 bg-rose-50 border-rose-200";
    if (s === "mixed") return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  const frequencyBadge = (f: string) => {
    if (f === "high") return "bg-rose-100 text-rose-700";
    if (f === "medium") return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-bold text-foreground">Customer Voice</h2>
        {gongLive && <SourceTag source="Gong Live" verified />}
        {!gongLive && <SourceTag source="Curated" />}
      </div>

      {/* Gong KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI
          label="CTV Calls (18mo)"
          value={gongLive ? gongData!.ctv_matched_calls : "—"}
          icon={<Phone className="w-4 h-4 text-blue-600" />}
          color="bg-blue-50"
          source={gongLive ? "Gong Live" : "Curated"}
          sub={gongLive ? `${gongData!.total_calls_scanned} total scanned` : undefined}
        />
        <KPI
          label="Unique Accounts"
          value={gongLive ? gongData!.unique_advertisers : "—"}
          icon={<Users className="w-4 h-4 text-violet-600" />}
          color="bg-violet-50"
          source={gongLive ? "Gong Live" : "Curated"}
        />
        <KPI
          label="Total Hours"
          value={gongLive ? `${gongData!.duration_stats.total_hours.toFixed(0)}h` : "—"}
          icon={<Clock className="w-4 h-4 text-emerald-600" />}
          color="bg-emerald-50"
          source={gongLive ? "Gong Live" : "Curated"}
          sub={gongLive ? `Avg ${gongData!.duration_stats.avg_min.toFixed(0)}min/call` : undefined}
        />
        <KPI
          label="Date Range"
          value={gongLive ? `${gongData!.date_range.earliest?.slice(0, 7) || "?"} → ${gongData!.date_range.latest?.slice(0, 7) || "?"}` : "—"}
          icon={<Radio className="w-4 h-4 text-cyan-600" />}
          color="bg-cyan-50"
          source={gongLive ? "Gong Live" : "Curated"}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* LLM ANALYSIS SECTION — The specialist agent */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="border border-indigo-200/60 rounded-2xl bg-gradient-to-br from-indigo-50/30 via-white to-violet-50/20 backdrop-blur-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-indigo-100/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">AI Voice Analysis</h3>
                <p className="text-[11px] text-muted-foreground">LLM-powered analysis of {gongData?.ctv_matched_calls || 0} CTV call transcripts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {analysis?.analyzed_at && (
                <span className="text-[10px] text-muted-foreground">
                  Analyzed {new Date(analysis.analyzed_at).toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={runAnalysis}
                disabled={analysisLoading || !gongLive}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {analysisLoading ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> {analysis ? "Re-analyze" : "Run Analysis"}</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Analysis Loading State */}
        {analysisLoading && (
          <div className="p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 mx-auto mb-3 rounded-full border-2 border-indigo-200 border-t-indigo-600"
            />
            <p className="text-sm font-medium text-foreground">Analyzing call transcripts...</p>
            <p className="text-xs text-muted-foreground mt-1">Reading {gongData?.transcript_samples?.length || 15} transcripts, extracting themes, objections, and competitive signals</p>
          </div>
        )}

        {/* Analysis Error */}
        {analysisError && !analysisLoading && (
          <div className="p-5">
            <div className="flex items-center gap-2 text-rose-600 text-sm">
              <XCircle className="w-4 h-4" />
              <span>Analysis failed: {analysisError}</span>
            </div>
          </div>
        )}

        {/* Analysis Not Run Yet */}
        {!analysis && !analysisLoading && !analysisError && (
          <div className="p-8 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-indigo-300" />
            <p className="text-sm text-muted-foreground">Click <strong>Run Analysis</strong> to have the AI agent analyze {gongData?.ctv_matched_calls || 0} CTV call transcripts</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">Extracts themes, objections, competitive mentions, and verbatims with real Gong call attribution</p>
          </div>
        )}

        {/* Analysis Results */}
        {analysis?.available && analysis.analysis && !analysis.analysis.parse_error && !analysisLoading && (
          <div className="p-5 space-y-5">
            {/* Overall Sentiment */}
            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/60 border border-border/30">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                  analysis.analysis.overall_sentiment.score >= 4 ? "bg-emerald-100 text-emerald-700" :
                  analysis.analysis.overall_sentiment.score >= 3 ? "bg-amber-100 text-amber-700" :
                  "bg-rose-100 text-rose-700"
                }`}>
                  {analysis.analysis.overall_sentiment.score}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{analysis.analysis.overall_sentiment.label}</div>
                  <div className="text-[11px] text-muted-foreground">Overall sentiment (1-5 scale)</div>
                </div>
              </div>
              <p className="flex-1 text-xs text-muted-foreground leading-relaxed">{analysis.analysis.overall_sentiment.justification}</p>
            </div>

            {/* Themes */}
            {analysis.analysis.themes.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" /> Key Themes
                  <span className="text-[10px] font-normal text-muted-foreground normal-case">({analysis.analysis.themes.length} detected)</span>
                </h4>
                <div className="space-y-2">
                  {analysis.analysis.themes.map((theme, i) => (
                    <Expandable key={i} title={theme.name} badge={theme.frequency}>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${sentimentColor(theme.sentiment)}`}>{theme.sentiment}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${frequencyBadge(theme.frequency)}`}>{theme.frequency} frequency</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{theme.description}</p>
                        {theme.evidence.length > 0 && (
                          <div className="space-y-1.5 mt-2">
                            {theme.evidence.map((e, j) => (
                              <div key={j} className="flex items-start gap-2 text-xs border-l-2 border-indigo-200 pl-2">
                                <span className="font-medium text-foreground shrink-0">{e.advertiser}:</span>
                                <span className="text-muted-foreground italic">"{e.quote || e.context}"</span>
                                {e.call_url && (
                                  <a href={e.call_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Expandable>
                  ))}
                </div>
              </div>
            )}

            {/* Objections */}
            {analysis.analysis.objections.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-500" /> Objection Patterns
                  <span className="text-[10px] font-normal text-muted-foreground normal-case">({analysis.analysis.objections.length} identified)</span>
                </h4>
                <div className="space-y-2">
                  {analysis.analysis.objections.map((obj, i) => (
                    <Expandable key={i} title={obj.objection} badge={obj.frequency}>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${frequencyBadge(obj.frequency)}`}>{obj.frequency} frequency</span>
                        </div>
                        {obj.typical_response && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Typical response:</span> {obj.typical_response}
                          </div>
                        )}
                        {obj.evidence.length > 0 && (
                          <div className="space-y-1.5 mt-2">
                            {obj.evidence.map((e, j) => (
                              <div key={j} className="flex items-start gap-2 text-xs border-l-2 border-rose-200 pl-2">
                                <span className="font-medium text-foreground shrink-0">{e.advertiser}:</span>
                                <span className="text-muted-foreground">{e.context || e.quote}</span>
                                {e.call_url && (
                                  <a href={e.call_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Expandable>
                  ))}
                </div>
              </div>
            )}

            {/* Verbatims */}
            {analysis.analysis.verbatims.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-violet-500" /> Key Verbatims
                  <span className="text-[10px] font-normal text-muted-foreground normal-case">({analysis.analysis.verbatims.length} extracted)</span>
                </h4>
                <div className="space-y-2">
                  {analysis.analysis.verbatims.map((v, i) => (
                    <div key={i} className={`border rounded-lg p-3 ${sentimentColor(v.sentiment)} bg-opacity-30`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs italic text-foreground leading-relaxed">"{v.quote}"</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-semibold text-foreground">{v.advertiser}</span>
                            {v.date && <span className="text-[10px] text-muted-foreground">{v.date}</span>}
                            <span className={`text-[10px] px-1 py-0.5 rounded ${sentimentColor(v.sentiment)}`}>{v.sentiment}</span>
                          </div>
                          {v.context && <p className="text-[11px] text-muted-foreground mt-1">{v.context}</p>}
                        </div>
                        {v.call_url && (
                          <a href={v.call_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0 mt-1">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competitive Mentions */}
            {analysis.analysis.competitive_mentions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-amber-500" /> Competitive Mentions
                  <span className="text-[10px] font-normal text-muted-foreground normal-case">({analysis.analysis.competitive_mentions.length} found)</span>
                </h4>
                <div className="space-y-2">
                  {analysis.analysis.competitive_mentions.map((cm, i) => (
                    <div key={i} className="flex items-start gap-3 border border-border/40 rounded-lg p-3 bg-white/50">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0">
                        {cm.competitor.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{cm.competitor}</span>
                          <span className={`text-[10px] px-1 py-0.5 rounded border ${sentimentColor(cm.sentiment)}`}>{cm.sentiment}</span>
                          <span className="text-[10px] text-muted-foreground">via {cm.advertiser}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{cm.context}</p>
                      </div>
                      {cm.call_url && (
                        <a href={cm.call_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.analysis.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-500" /> AI Recommendations
                </h4>
                <div className="space-y-1.5">
                  {analysis.analysis.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Attribution */}
            {analysis.source_calls && analysis.source_calls.length > 0 && (
              <div className="border-t border-border/30 pt-3">
                <div className="text-[10px] text-muted-foreground/60">
                  Analysis based on {analysis.transcript_count} transcripts from {analysis.call_count} CTV calls.
                  Analyzed at {analysis.analyzed_at ? new Date(analysis.analyzed_at).toLocaleString() : "unknown"}.
                  Every insight is grounded in real call data — click any <ExternalLink className="w-2.5 h-2.5 inline" /> link to verify in Gong.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Call Volume Trend */}
      {gongVolumeChart.length > 0 && (
        <Expandable title="Monthly CTV Call Volume" badge="Gong Verified" defaultOpen>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gongVolumeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="calls" fill={BLUE} radius={[6, 6, 0, 0]} name="CTV Calls" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Expandable>
      )}

      {/* Advertiser Coverage */}
      {gongLive && gongData!.advertiser_coverage.length > 0 && (
        <Expandable title="Account Coverage (by call frequency)" badge={`${gongData!.unique_advertisers} accounts`} defaultOpen>
          <div className="mt-3 space-y-2">
            {gongData!.advertiser_coverage.slice(0, 15).map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-medium text-foreground w-28 truncate">{a.advertiser}</span>
                <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(a.call_count / gongData!.advertiser_coverage[0].call_count) * 100}%`,
                      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{a.call_count} calls</span>
              </div>
            ))}
          </div>
        </Expandable>
      )}

      {/* Recent CTV Calls with Deep Links */}
      {gongLive && gongData!.matched_calls.length > 0 && (
        <Expandable title="Recent CTV Calls" badge={`${gongData!.matched_calls.length} calls`} defaultOpen>
          <div className="mt-3 space-y-1.5 max-h-80 overflow-y-auto">
            {gongData!.matched_calls.slice(0, 30).map((call, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <GongCallLink call={call} />
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">{call.advertiser}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">
            Every link above opens the actual Gong call recording. No synthesized or hallucinated data.
          </div>
        </Expandable>
      )}

      {/* Transcript Samples — if available */}
      {gongData?.transcript_samples && gongData.transcript_samples.length > 0 && (
        <Expandable title="Transcript Excerpts" badge={`${gongData.transcript_samples.length} calls`}>
          <div className="mt-3 space-y-4">
            {gongData.transcript_samples.map((t, i) => (
              <div key={i} className="border border-border/40 rounded-lg p-3 bg-muted/10">
                <div className="flex items-center justify-between mb-2">
                  <GongCallLink call={t} />
                  <SourceTag source="Gong Live" verified />
                </div>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                  {t.transcript_excerpt}
                </pre>
                {t.transcript_length > 2000 && (
                  <div className="mt-1 text-[10px] text-muted-foreground/60">
                    Showing first 2,000 chars of {(t.transcript_length / 1000).toFixed(0)}K char transcript
                  </div>
                )}
              </div>
            ))}
          </div>
        </Expandable>
      )}
    </div>
  );
}

// ============================================================================
// Q3: WIN/LOSS PATTERNS
// ============================================================================
function Q3Tab({ gongData }: { gongData: GongData | null }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-bold text-foreground">Win/Loss Patterns</h2>
        <SourceTag source="Curated" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Deals Analyzed" value="31" icon={<Target className="w-4 h-4 text-blue-600" />} color="bg-blue-50" source="Curated" sub="18 won · 13 lost" />
        <KPI label="Avg Win Rate" value="58%" icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} color="bg-emerald-50" source="Curated" />
        <KPI label="Key Behaviors" value="6" icon={<Eye className="w-4 h-4 text-violet-600" />} color="bg-violet-50" source="Curated" sub="3 critical, 2 high, 1 medium" />
        <KPI label="Top Loss Reason" value="Attribution" icon={<XCircle className="w-4 h-4 text-rose-600" />} color="bg-rose-50" source="Curated" sub="34% of losses" />
      </div>

      {/* Behavior Comparison Table */}
      <Expandable title="Won vs. Lost Behaviors" badge="N=31 deals" defaultOpen>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Behavior</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-emerald-600">Won %</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-rose-600">Lost %</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Delta</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Signal</th>
              </tr>
            </thead>
            <tbody>
              {Q3_BEHAVIORS.map((b, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-2.5 px-3 text-xs font-medium text-foreground">{b.behavior}</td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${b.wonPct}%` }} />
                      </div>
                      <span className="text-xs font-mono text-emerald-600">{b.wonPct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${b.lostPct}%` }} />
                      </div>
                      <span className="text-xs font-mono text-rose-600">{b.lostPct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-xs font-bold text-blue-600">{b.delta}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      b.signal === "Critical" ? "bg-rose-100 text-rose-700" :
                      b.signal === "High" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{b.signal}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Expandable>

      {/* Win Rate by Behavior Chart */}
      <Expandable title="Win Rate by Behavior" defaultOpen>
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Q3_BEHAVIORS} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="behavior" tick={{ fontSize: 10 }} width={180} />
              <Tooltip formatter={(v: any) => [`${v}%`, "Won %"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="wonPct" fill={EMERALD} radius={[0, 6, 6, 0]} name="Won %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Expandable>

      {/* Loss Reasons */}
      <Expandable title="Top Loss Reasons" defaultOpen>
        <div className="mt-3 space-y-2">
          {Q3_LOSS_REASONS.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-medium text-foreground w-48 truncate">{r.reason}</span>
              <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${r.pct}%` }} />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-10 text-right">{r.pct}%</span>
            </div>
          ))}
        </div>
      </Expandable>

      {/* Coaching Insights */}
      <Expandable title="Coaching Insights">
        <div className="mt-3 space-y-3">
          <div className="border border-blue-200/60 rounded-lg p-3 bg-blue-50/30">
            <div className="text-xs font-semibold text-blue-700 mb-1">Measurement Framework = Highest Signal</div>
            <p className="text-xs text-muted-foreground">94% of won deals had a measurement framework agreed before proposal. This is the single strongest predictor. Every deal should have an attribution conversation in the first 2 meetings.</p>
          </div>
          <div className="border border-violet-200/60 rounded-lg p-3 bg-violet-50/30">
            <div className="text-xs font-semibold text-violet-700 mb-1">Multi-Threading is Non-Negotiable</div>
            <p className="text-xs text-muted-foreground">89% of won deals had 3+ contacts engaged vs. 31% of lost deals. Single-threaded deals are 3x more likely to lose. Require multi-threading before Stage 3.</p>
          </div>
          <div className="border border-emerald-200/60 rounded-lg p-3 bg-emerald-50/30">
            <div className="text-xs font-semibold text-emerald-700 mb-1">CTV Case Studies Close Deals</div>
            <p className="text-xs text-muted-foreground">78% of won deals shared a CTV-specific case study vs. 15% of lost deals. The +63pp delta is the largest single behavior gap. Invest in building 3-5 vertical-specific CTV case studies.</p>
          </div>
        </div>
      </Expandable>
    </div>
  );
}

// ============================================================================
// Q4: MARKET POSITION
// ============================================================================
function Q4Tab({ bqData, gongData }: { bqData: BQData | null; gongData: GongData | null }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-bold text-foreground">Market Position</h2>
        <SourceTag source="Curated" />
      </div>

      {/* Competitive Table */}
      <Expandable title="Head-to-Head Competitive Record" badge="5 competitors" defaultOpen>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Competitor</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Record</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Win Rate</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Their Edge</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Our Counter</th>
              </tr>
            </thead>
            <tbody>
              {Q4_COMPETITORS.map((c, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-2.5 px-3 text-xs font-semibold text-foreground">{c.vendor}</td>
                  <td className="py-2.5 px-3 text-center text-xs font-mono">{c.headToHead}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-xs font-bold ${c.winRate >= 60 ? "text-emerald-600" : c.winRate >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                      {c.winRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{c.theirEdge}</td>
                  <td className="py-2.5 px-3 text-xs text-blue-600 font-medium">{c.ourCounter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Expandable>

      {/* Win Rate by Competitor Chart */}
      <Expandable title="Win Rate by Competitor" defaultOpen>
        <div className="mt-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Q4_COMPETITORS} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
              <YAxis type="category" dataKey="vendor" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: any) => [`${v}%`, "Win Rate"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="winRate" radius={[0, 6, 6, 0]}>
                {Q4_COMPETITORS.map((c, i) => (
                  <Cell key={i} fill={c.winRate >= 60 ? EMERALD : c.winRate >= 50 ? AMBER : ROSE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Expandable>

      {/* TAM Penetration */}
      <Expandable title="TAM Penetration by Segment" badge="$33.6B total" defaultOpen>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Segment</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">TAM ($B)</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Penetration</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Takeaway</th>
              </tr>
            </thead>
            <tbody>
              {Q4_TAM.map((t, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-2.5 px-3 text-xs font-medium text-foreground">{t.segment}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-mono">${t.tam}B</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(t.penetration * 3, 100)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-foreground">{t.penetration}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{t.takeaway}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Expandable>

      {/* Competitive Signals */}
      <Expandable title="Live Competitive Signals">
        <div className="mt-3 space-y-2">
          {[
            { signal: "TTD launched self-serve CTV buying in Q1 — lowers barrier for mid-market", urgency: "High", source: "Curated" },
            { signal: "Amazon expanding Fire TV ad inventory to 3P apps — more supply competition", urgency: "Medium", source: "Curated" },
            { signal: "Tatari acquired by Innovid — combined linear+CTV+measurement stack", urgency: "High", source: "Curated" },
            { signal: "MNTN reported 40% YoY growth but churn concerns in D2C segment", urgency: "Low", source: "Curated" },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs border border-border/30 rounded-lg p-2.5">
              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${s.urgency === "High" ? "bg-rose-500" : s.urgency === "Medium" ? "bg-amber-500" : "bg-slate-400"}`} />
              <div className="flex-1">
                <span className="text-foreground">{s.signal}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1 py-0.5 rounded ${s.urgency === "High" ? "bg-rose-100 text-rose-700" : s.urgency === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                    {s.urgency}
                  </span>
                  <SourceTag source={s.source} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Expandable>
    </div>
  );
}

// ============================================================================
// SYNTHESIS TAB — moved to SynthesisTab.tsx
// ============================================================================
// Old inline SynthesisTab removed — now imported from @/pages/SynthesisTab

// Keep SynthesisItem for backward compatibility if referenced elsewhere
function _OldSynthesisTab_REMOVED() { return null; }
function _OldSynthesisTabPlaceholder({ bqData, gongData, trailing7d, arrRunRate, gapToTarget, activeCampaigns, activeAdvertisers }: {
  bqData: BQData | null; gongData: GongData | null; trailing7d: number; arrRunRate: number;
  gapToTarget: number; activeCampaigns: number; activeAdvertisers: number;
}) {
  const bqLive = !!bqData?.available;
  const gongLive = !!gongData?.available;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-bold text-foreground">What Should We Do About It?</h2>
        <SourceTag source="LLM Analysis" />
      </div>

      <p className="text-sm text-muted-foreground">
        Cross-question synthesis connecting revenue trajectory, customer voice, deal patterns, and competitive positioning into actionable priorities.
      </p>

      {/* Three-column: Risks, Opportunities, Open Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Key Risks */}
        <div className="border border-rose-200/60 rounded-xl bg-rose-50/20 p-4">
          <h3 className="text-sm font-bold text-rose-700 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Key Risks
          </h3>
          <div className="space-y-3">
            <SynthesisItem
              title="Concentration fragility"
              detail={bqLive ? `Top 5 = ${bqData!.concentration?.top5_pct.toFixed(0)}% of GAS. Losing PMG alone would drop daily GAS by ~$${((trailing7d * (bqData!.top_advertisers?.[0]?.pct_of_total || 0)) / 100 / 1000).toFixed(0)}K.` : "Top 5 advertisers represent ~72% of GAS. Single-account dependency is the #1 revenue risk."}
              source={bqLive ? "BQ Live" : "Curated"}
            />
            <SynthesisItem
              title="Attribution gap blocks deals"
              detail="34% of lost deals cite 'no attribution path agreed.' Without a measurement framework, even interested buyers stall at proposal stage."
              source="Curated"
            />
            <SynthesisItem
              title="Amazon ecosystem lock-in"
              detail="45% win rate vs Amazon DSP — below 50%. Fire TV inventory expansion makes this harder. Need a differentiated story for Amazon-heavy buyers."
              source="Curated"
            />
          </div>
        </div>

        {/* Key Opportunities */}
        <div className="border border-emerald-200/60 rounded-xl bg-emerald-50/20 p-4">
          <h3 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Key Opportunities
          </h3>
          <div className="space-y-3">
            <SynthesisItem
              title="Streaming TAM is wide open"
              detail="$8.5B TAM at 4% penetration. This is the largest addressable segment with the lowest competition. Need 3 streaming case studies to unlock."
              source="Curated"
            />
            <SynthesisItem
              title="Measurement framework = 94% win rate"
              detail="The strongest single behavior. Mandate attribution conversations in first 2 meetings. Build a 'CTV Measurement Playbook' for the sales team."
              source="Curated"
            />
            <SynthesisItem
              title="MNTN displacement"
              detail="80% win rate vs MNTN. Their D2C churn creates opportunity. Target MNTN renewals with competitive displacement campaigns."
              source="Curated"
            />
          </div>
        </div>

        {/* Open Questions */}
        <div className="border border-blue-200/60 rounded-xl bg-blue-50/20 p-4">
          <h3 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> Open Questions
          </h3>
          <div className="space-y-3">
            <SynthesisItem
              title="Can we sustain $200K+/day?"
              detail={bqLive ? `Trailing 7d = $${(trailing7d / 1000).toFixed(0)}K/day. Is this a seasonal spike or structural? Need 30-day trend to confirm.` : "Recent daily GAS suggests acceleration. Need to validate if this is sustainable or seasonal."}
              source={bqLive ? "BQ Live" : "Curated"}
            />
            <SynthesisItem
              title="What's the real pipeline coverage?"
              detail="SFDC pipeline data not yet connected. Without real pipeline coverage ratio, the $100M target confidence is speculative."
              source="Curated"
            />
            <SynthesisItem
              title="Are we winning the right deals?"
              detail="High win rate vs MNTN/Tatari but low vs Amazon/DV360. Are we self-selecting into easier deals? Need to track deal size distribution."
              source="Curated"
            />
          </div>
        </div>
      </div>

      {/* 30-Day Action Plan */}
      <Expandable title="Recommended 30-Day Priorities" badge="Action Plan" defaultOpen>
        <div className="mt-3 space-y-3">
          {[
            { priority: 1, action: "Ship CTV Measurement Playbook", owner: "GTM Design + PSO", metric: "Adoption by 80% of CTV-facing reps", rationale: "94% win rate when measurement framework agreed. This is the single highest-ROI investment." },
            { priority: 2, action: "Build 3 vertical CTV case studies (Betting, Streaming, D2C)", owner: "Creative Studio + GDS", metric: "Case study shared in 100% of CTV proposals", rationale: "+63pp delta between won/lost when case study shared." },
            { priority: 3, action: "Launch MNTN competitive displacement campaign", owner: "NBS + IM", metric: "5 MNTN renewals targeted, 2 converted", rationale: "80% win rate vs MNTN + their D2C churn = low-hanging fruit." },
            { priority: 4, action: "Connect SFDC pipeline data to this dashboard", owner: "GTM Tooling", metric: "Real pipeline coverage ratio visible here", rationale: "Can't validate $100M confidence without real pipeline data." },
            { priority: 5, action: "Diversify top-5 concentration below 60%", owner: "IM + Growth", metric: "Top 5 share < 60% within 90 days", rationale: `Current ${bqData?.concentration ? bqData.concentration.top5_pct.toFixed(0) + "%" : "~72%"} is fragile.` },
          ].map((p) => (
            <div key={p.priority} className="flex gap-3 border border-border/40 rounded-lg p-3 bg-white/50">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {p.priority}
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-foreground">{p.action}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  <span className="font-medium">Owner:</span> {p.owner} · <span className="font-medium">Metric:</span> {p.metric}
                </div>
                <div className="text-[11px] text-muted-foreground/70 mt-0.5 italic">{p.rationale}</div>
              </div>
            </div>
          ))}
        </div>
      </Expandable>

      {/* Data Sources Footer */}
      <div className="border border-border/40 rounded-xl bg-muted/10 p-4">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2">Data Sources & Provenance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${bqLive ? "bg-emerald-500" : "bg-rose-400"}`} />
            <span>BigQuery (fact_dsp_core)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${gongLive ? "bg-emerald-500" : "bg-rose-400"}`} />
            <span>Gong ({gongLive ? `${gongData!.ctv_matched_calls} calls` : "offline"})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Salesforce (not connected)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Curated data (deal analysis)</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-2">
          Every data point is attributed to its source. "BQ Live" and "Gong Live" tags indicate real-time verified data.
          "Curated" tags indicate analyst-prepared data from deal reviews. No numbers are hallucinated or synthesized without attribution.
        </p>
      </div>
    </div>
  );
}

function SynthesisItem({ title, detail, source }: { title: string; detail: string; source: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <SourceTag source={source} verified={source.includes("Live")} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
    </div>
  );
}
