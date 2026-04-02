/**
 * CTV Business Insights — Leadership Intelligence Report
 * 4 tabs: Revenue & ARR | Customer Intel | Sales Coaching | Market & Competitive
 */
import NeuralShell from "@/components/NeuralShell";
import { trpcQuery } from "@/lib/trpcFetch";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  TrendingUp, MessageSquare, Target, Crosshair,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
  ExternalLink, Shield, Zap, RefreshCw,
  CheckCircle2, XCircle, ChevronDown, Phone,
  Download,  DollarSign, ThumbsUp, ThumbsDown,
  Minus, Award, Search, Activity, Star,
  Lightbulb, TrendingDown,} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
} from "recharts";

/* ── Design Tokens ── */
const BLUE = "#0057FF";
const EMERALD = "#10B981";
const AMBER = "#F59E0B";
const ROSE = "#EF4444";
const VIOLET = "#8B5CF6";
const CYAN = "#06B6D4";
const ORANGE = "#F97316";
const CHART_COLORS = [BLUE, EMERALD, VIOLET, AMBER, CYAN, ORANGE, ROSE];

/* ── Tabs ── */
const TABS = [
  { id: "revenue", label: "Revenue & ARR", icon: DollarSign, question: "Are we on track to hit $100M ARR?" },
  { id: "customer", label: "Customer Intel", icon: MessageSquare, question: "What are our customers telling us?" },
  { id: "coaching", label: "Sales Coaching", icon: Award, question: "How can we help the team win more?" },
  { id: "market", label: "Market & Competitive", icon: Crosshair, question: "What's happening in the market?" },
] as const;

/* ── Types ── */
interface BusinessInsightsReport {
  generatedAt: string;
  revenue: {
    arrPacing: {
      target: number; currentARR: number; ytdGAS: number; dailyRunRate: number;
      trailing7dDaily: number; projectedEOY: number; gapToTarget: number;
      pctOfTarget: number; acceleration: number;
      confidence: "high" | "medium" | "low"; confidenceRationale: string;
      dataWindow: { start: string; end: string; totalDays: number };
      monthlyTrend: { month: string; gas: number; dailyAvg: number; campaigns: number; advertisers: number }[];
      dailyTrend: { date: string; gas: number; campaigns: number }[];
    };
    pipeline: {
      available: boolean; openPipeline: number; openDeals: number;
      weightedPipeline: number; winRate: number; closedWon: number; closedLost: number;
      byStage: { stage: string; count: number; value: number }[];
      topDeals: { name: string; amount: number; stage: string; owner: string; type: string }[];
      byOwner: { owner: string; pipeline: number; deals: number }[];
      forecastScenarios: { conservative: number; base: number; optimistic: number };
    };
    risksAndOpportunities: {
      id: string; type: "risk" | "opportunity"; title: string; description: string;
      impact: "high" | "medium" | "low"; confidence: "high" | "medium" | "low";
      source: string; sourceType: string; actionItem?: string;
    }[];
    topAdvertisers: { name: string; gas: number; campaigns: number; firstActive: string; lastActive: string }[];
    exchangeBreakdown: { exchange: string; gas: number; campaigns: number }[];
    concentration: { advertiser: string; gas: number; pctOfTotal: number; cumulativePct: number }[];
    lastRefreshed: string;
  };
  customerIntel: {
    signals: {
      id: string; type: string; title: string; summary: string;
      sentiment: "positive" | "negative" | "neutral" | "mixed";
      advertiser?: string; date: string; verifyUrl?: string; verifyChannel?: string;
      source: string; tags: string[];
    }[];
    themes: {
      theme: string; count: number; sentiment: "positive" | "negative" | "neutral" | "mixed";
      trend: "up" | "down" | "flat"; description: string;
      evidence: { advertiser: string; snippet: string; url?: string; date?: string }[];
    }[];
    weekOverWeek: {
      metric: string; thisWeek: number; lastWeek: number; overall: number;
      change: number; changePct: number; direction: "up" | "down" | "flat";
    }[];
    sentimentBreakdown: { positive: number; negative: number; neutral: number; mixed: number };
    totalGongCalls: number; totalSlackSignals: number;
    gongDateRange: { earliest: string | null; latest: string | null };
    topAdvertisersByMentions: { advertiser: string; callCount: number; sentiment: string }[];
    lastRefreshed: string;
  };
  salesCoaching: {
    coachingInsights: {
      id: string; area: string; description: string;
      priority: "high" | "medium" | "low"; repsAffected: number;
      suggestedAction: string; evidence: string; source: string;
    }[];
    repPerformance: {
      name: string; closedValue: number; pipelineValue: number;
      winRate: number; avgCycleDays: number; callCount: number;
      topStrength: string; coachingArea?: string;
    }[];
    winLossBehaviors: {
      behavior: string; type: "winning" | "losing"; impact: string;
      evidence: string; confidence: "high" | "medium" | "low"; frequency?: number;
    }[];
    overallWinRate: number; avgDealCycle: number; testToScaleRate: number;
    activityTrend: { week: string; calls: number; meetings: number; emails: number }[];
    lastRefreshed: string;
  };
  market: {
    competitors: {
      name: string; winsAgainst: number; lossesAgainst: number;
      netPosition: string; keyDifferentiator: string;
      threatLevel: "high" | "medium" | "low"; recentMentions: number;
    }[];
    competitiveSignals: {
      signal: string; competitor?: string; source: string; date: string;
      urgency: "high" | "medium" | "low"; implication: string; verifyUrl?: string;
    }[];
    marketTrends: { trend: string; direction: "accelerating" | "decelerating" | "stable"; relevance: string; source: string }[];
    molocoAdvantages: { advantage: string; evidence: string; durability: string }[];
    molocoVulnerabilities: { vulnerability: string; threat: string; mitigation: string }[];
    tamEstimate: { segment: string; tam: number; samReachable: number; currentPenetration: number }[];
    lastRefreshed: string;
  };
  dataSources: {
    bq: { connected: boolean; lastFetched: string | null; dataRange: string | null };
    sfdc: { connected: boolean; deals: number };
    gong: { connected: boolean; calls: number; advertisers: number };
    slack: { connected: boolean; channels: number };
    curated: { connected: boolean; records: number; categories: number };
  };
}

/* ── Helpers ── */
function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function exportCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const v = row[h];
      return typeof v === "string" && (v.includes(",") || v.includes('"'))
        ? `"${v.replace(/"/g, '""')}"` : v ?? "";
    }).join(",")
  );
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
  Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${filename}.csv` }).click();
}

function exportJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${filename}.json` }).click();
}

/* ── Shared UI Atoms ── */
function SourceTag({ source, verified }: { source: string; verified?: boolean }) {
  const c: Record<string, string> = {
    "BQ Live": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Gong Live": "bg-blue-50 text-blue-700 border-blue-200",
    "SFDC Live": "bg-violet-50 text-violet-700 border-violet-200",
    "Slack Live": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "Curated": "bg-amber-50 text-amber-700 border-amber-200",
    "Derived": "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${c[source] || c["Curated"]}`}>
      {verified && <CheckCircle2 className="w-2.5 h-2.5" />}{source}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  const s: Record<string, string> = {
    high: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s[level] || s.medium}`}>
      <Shield className="w-2.5 h-2.5" />{level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function ImpactPill({ level }: { level: string }) {
  const s: Record<string, string> = { high: "bg-rose-50 text-rose-700", medium: "bg-amber-50 text-amber-700", low: "bg-slate-50 text-slate-600" };
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${s[level] || s.medium}`}>{level}</span>;
}

function SentimentDot({ sentiment }: { sentiment: string }) {
  if (sentiment === "positive") return <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (sentiment === "negative") return <ThumbsDown className="w-3.5 h-3.5 text-rose-500" />;
  if (sentiment === "mixed") return <Activity className="w-3.5 h-3.5 text-amber-500" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

function DataHealth({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-400"}`} />
      <span className="font-medium text-foreground">{label}</span>
      {detail && <span className="text-muted-foreground/60">· {detail}</span>}
    </div>
  );
}

function Expandable({ title, badge, children, defaultOpen = false }: {
  title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/60 rounded-xl bg-white/60 backdrop-blur-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left">
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
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-border/40">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterBar({ search, setSearch, children }: { search: string; setSearch: (v: string) => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5 px-4 py-2.5 rounded-xl border border-border/40 bg-white/50 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent text-xs outline-none flex-1 placeholder:text-muted-foreground/50"
        />
      </div>
      {children}
    </div>
  );
}

function SelectFilter({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="text-xs bg-white/70 border border-border/50 rounded-lg px-2 py-1.5 outline-none">
      <option value="all">{label}: All</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function KPICard({ label, value, sub, icon, color, source }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color?: string; source?: string;
}) {
  return (
    <div className="border border-border/50 rounded-xl bg-white/70 backdrop-blur-sm p-4 relative">
      {source && <div className="absolute top-2 right-2"><SourceTag source={source} verified={source.includes("Live")} /></div>}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color || "bg-primary/10"}`}>{icon}</div>
      </div>
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground/70 mt-1">{sub}</div>}
    </div>
  );
}

function TrendArrow({ dir }: { dir: string }) {
  if (dir === "up") return <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />;
  if (dir === "down") return <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

/* ── Loading ── */
function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-44 rounded-2xl bg-muted/30" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 rounded-xl bg-muted/30"/>)}</div>
      <div className="h-64 rounded-xl bg-muted/30" />
    </div>
  );
}

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */
export default function CTVBusinessInsights() {
  const [tab, setTab] = useState("revenue");
  const [data, setData] = useState<BusinessInsightsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await trpcQuery<BusinessInsightsReport>("reporting.businessInsights");
      if (r) { setData(r); setError(null); }
    } catch (e: any) { setError(e.message || "Failed to load"); }
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const switchTab = (id: string) => { setTab(id); ref.current?.scrollTo({ top: 0, behavior: "smooth" }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleExport = () => {
    if (!data) return;
    const ts = new Date().toISOString().slice(0, 10);
    if (tab === "revenue") exportJSON({ arrPacing: data.revenue.arrPacing, pipeline: data.revenue.pipeline, risks: data.revenue.risksAndOpportunities, advertisers: data.revenue.topAdvertisers }, `ctv-revenue-${ts}`);
    else if (tab === "customer") exportCSV(data.customerIntel.signals.map(s => ({ type: s.type, title: s.title, summary: s.summary, sentiment: s.sentiment, advertiser: s.advertiser || "", date: s.date, source: s.source, verify: s.verifyUrl || s.verifyChannel || "" })), `ctv-customer-signals-${ts}`);
    else if (tab === "coaching") exportCSV(data.salesCoaching.repPerformance.map(r => ({ name: r.name, closedValue: r.closedValue, pipeline: r.pipelineValue, winRate: r.winRate, cycleDays: r.avgCycleDays, calls: r.callCount, strength: r.topStrength, coaching: r.coachingArea || "" })), `ctv-coaching-${ts}`);
    else exportJSON({ competitors: data.market.competitors, signals: data.market.competitiveSignals, trends: data.market.marketTrends, tam: data.market.tamEstimate }, `ctv-market-${ts}`);
  };

  return (
    <NeuralShell>
      <div className="p-4 lg:p-6 max-w-[1440px]">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">CTV Business Insights</h1>
            <p className="text-sm text-muted-foreground mt-1">Actionable intelligence for sales leadership — live data, verified sources, confidence-scored</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} disabled={!data} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/60 bg-white/70 hover:bg-muted/50 transition-colors disabled:opacity-50">
              <Download className="w-3.5 h-3.5" />Export
            </button>
            <button onClick={refresh} disabled={refreshing||loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/60 bg-white/70 hover:bg-muted/50 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing?"animate-spin":""}`} />Refresh
            </button>
          </div>
        </div>

        {/* Data Health */}
        {data && (
          <div className="flex flex-wrap items-center gap-4 mb-6 px-4 py-2.5 rounded-xl border border-border/40 bg-white/50 backdrop-blur-sm">
            <DataHealth label="BigQuery" ok={data.dataSources.bq.connected} detail={data.dataSources.bq.dataRange||undefined} />
            <DataHealth label="Salesforce" ok={data.dataSources.sfdc.connected} detail={data.dataSources.sfdc.deals>0?`${data.dataSources.sfdc.deals} deals`:undefined} />
            <DataHealth label="Gong" ok={data.dataSources.gong.connected} detail={data.dataSources.gong.calls>0?`${data.dataSources.gong.calls} calls`:undefined} />
            <DataHealth label="Slack" ok={data.dataSources.slack.connected} detail={data.dataSources.slack.channels>0?`${data.dataSources.slack.channels} ch`:undefined} />
            <DataHealth label="Curated" ok={data.dataSources.curated.connected} detail={data.dataSources.curated.records>0?`${data.dataSources.curated.records} rec`:undefined} />
            <div className="ml-auto text-[10px] text-muted-foreground/60">
              {new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => switchTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                <Icon className="w-3.5 h-3.5" />{t.label}
                {active && <span className="hidden md:inline text-[10px] opacity-70 ml-1">— {t.question}</span>}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div ref={ref}>
          {loading ? <Skeleton /> : error ? (
            <div className="border border-rose-200 rounded-xl bg-rose-50/50 p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
              <button onClick={refresh} className="mt-3 text-xs text-rose-600 underline">Try again</button>
            </div>
          ) : data ? (
            <>
              {tab === "revenue" && <RevenueTab data={data.revenue} search={search} setSearch={setSearch} />}
              {tab === "customer" && <CustomerTab data={data.customerIntel} search={search} setSearch={setSearch} />}
              {tab === "coaching" && <CoachingTab data={data.salesCoaching} search={search} setSearch={setSearch} />}
              {tab === "market" && <MarketTab data={data.market} search={search} setSearch={setSearch} />}
            </>
          ) : null}
        </div>
      </div>
    </NeuralShell>
  );
}

/* ============================================================================
   TAB 1: REVENUE & ARR PACING
   ============================================================================ */
function RevenueTab({ data, search, setSearch }: { data: BusinessInsightsReport["revenue"]; search: string; setSearch: (v: string) => void }) {
  const { arrPacing: arr, pipeline: pipe, risksAndOpportunities: ro } = data;
  const [impactFilter, setImpactFilter] = useState("all");

  const monthlyChart = useMemo(() => arr.monthlyTrend.map(m => ({
    label: m.month.length > 7 ? new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : m.month,
    gas: Math.round(m.gas), dailyAvg: Math.round(m.dailyAvg), campaigns: m.campaigns,
  })), [arr.monthlyTrend]);

  const filtered = useMemo(() => {
    let items = ro;
    if (search) { const q = search.toLowerCase(); items = items.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)); }
    if (impactFilter !== "all") items = items.filter(r => r.impact === impactFilter);
    return items;
  }, [ro, search, impactFilter]);

  const risks = filtered.filter(r => r.type === "risk");
  const opps = filtered.filter(r => r.type === "opportunity");

  return (
    <div className="space-y-6">
      {/* ARR Banner */}
      <div className="border border-border/50 rounded-2xl bg-gradient-to-r from-white/80 to-blue-50/40 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">$100M CTV ARR Target</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {arr.dataWindow.totalDays > 0 ? `${arr.dataWindow.totalDays} days of BQ data (${arr.dataWindow.start} → ${arr.dataWindow.end})` : "Awaiting live BQ data"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceBadge level={arr.confidence} />
            <SourceTag source="BQ Live" verified={arr.currentARR > 0} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div><div className="text-3xl font-bold text-foreground">{fmtMoney(arr.currentARR)}</div><div className="text-xs text-muted-foreground">ARR Run-Rate</div></div>
          <div><div className="text-xl font-semibold text-emerald-600">{fmtMoney(arr.trailing7dDaily)}/day</div><div className="text-xs text-muted-foreground">Trailing 7d Daily</div></div>
          <div><div className="text-xl font-semibold text-amber-600">{fmtMoney(arr.gapToTarget)}</div><div className="text-xs text-muted-foreground">Gap to $100M</div></div>
          <div><div className="text-xl font-semibold text-foreground">{fmtMoney(arr.projectedEOY)}</div><div className="text-xs text-muted-foreground">Projected EOY</div></div>
          <div><div className={`text-xl font-semibold ${arr.acceleration > 0 ? "text-emerald-600" : arr.acceleration < 0 ? "text-rose-600" : "text-foreground"}`}>{arr.acceleration > 0 ? "+" : ""}{arr.acceleration.toFixed(1)}%</div><div className="text-xs text-muted-foreground">MoM Acceleration</div></div>
        </div>
        <div className="w-full h-3 bg-muted/40 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" initial={{ width: 0 }} animate={{ width: `${Math.min(arr.pctOfTarget, 100)}%` }} transition={{ duration: 1, ease: "easeOut" }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>$0</span><span className="font-medium">{arr.pctOfTarget.toFixed(1)}%</span><span>$100M</span></div>
        {arr.confidenceRationale && <div className="mt-3 p-3 rounded-lg bg-white/50 border border-border/30"><p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Rationale:</span> {arr.confidenceRationale}</p></div>}
      </div>

      {/* Monthly Chart */}
      {monthlyChart.length > 0 && (
        <Expandable title="Monthly Revenue Trend" badge={`${monthlyChart.length} months`} defaultOpen>
          <div className="pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyChart}>
                <defs>
                  <linearGradient id="biGasGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BLUE} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v: number) => fmtMoney(v)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} labelStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="gas" stroke={BLUE} fill="url(#biGasGrad)" strokeWidth={2} name="Monthly GAS" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Expandable>
      )}

      {/* Pipeline Forecast */}
      {pipe.available && (
        <Expandable title="SFDC Pipeline & Forecast" badge={`${pipe.openDeals} open deals`} defaultOpen>
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Open Pipeline" value={fmtMoney(pipe.openPipeline)} icon={<DollarSign className="w-4 h-4 text-blue-600" />} color="bg-blue-50" source="SFDC Live" />
              <KPICard label="Weighted Pipeline" value={fmtMoney(pipe.weightedPipeline)} icon={<Target className="w-4 h-4 text-violet-600" />} color="bg-violet-50" source="Derived" />
              <KPICard label="Win Rate" value={`${pipe.winRate}%`} icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} color="bg-emerald-50" source="SFDC Live" />
              <KPICard label="Closed Won" value={fmtMoney(pipe.closedWon)} sub={`Lost: ${fmtMoney(pipe.closedLost)}`} icon={<Award className="w-4 h-4 text-amber-600" />} color="bg-amber-50" source="SFDC Live" />
            </div>

            {/* Forecast Scenarios */}
            <div className="border border-border/40 rounded-xl bg-white/50 p-4">
              <h4 className="text-xs font-semibold text-foreground mb-3">Forecast Scenarios (Pipeline × Win Rate)</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-rose-50/50 border border-rose-100">
                  <div className="text-lg font-bold text-rose-700">{fmtMoney(pipe.forecastScenarios.conservative)}</div>
                  <div className="text-[10px] text-rose-600 font-medium">Conservative</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                  <div className="text-lg font-bold text-blue-700">{fmtMoney(pipe.forecastScenarios.base)}</div>
                  <div className="text-[10px] text-blue-600 font-medium">Base Case</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                  <div className="text-lg font-bold text-emerald-700">{fmtMoney(pipe.forecastScenarios.optimistic)}</div>
                  <div className="text-[10px] text-emerald-600 font-medium">Optimistic</div>
                </div>
              </div>
            </div>

            {/* Stage Distribution */}
            {pipe.byStage.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">Pipeline by Stage</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={pipe.byStage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tickFormatter={(v: number) => fmtMoney(v)} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                    <Bar dataKey="value" name="Pipeline Value" radius={[0, 4, 4, 0]}>
                      {pipe.byStage.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Deals */}
            {pipe.topDeals.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-foreground mb-2">Top Open Deals</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border/40 text-muted-foreground">
                      <th className="text-left py-2 px-2 font-semibold">Deal</th>
                      <th className="text-right py-2 px-2 font-semibold">Amount</th>
                      <th className="text-left py-2 px-2 font-semibold">Stage</th>
                      <th className="text-left py-2 px-2 font-semibold">Owner</th>
                      <th className="text-left py-2 px-2 font-semibold">Type</th>
                    </tr></thead>
                    <tbody>
                      {pipe.topDeals.slice(0, 10).map((d, i) => (
                        <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                          <td className="py-2 px-2 font-medium text-foreground">{d.name}</td>
                          <td className="py-2 px-2 text-right font-mono">{fmtMoney(d.amount)}</td>
                          <td className="py-2 px-2">{d.stage}</td>
                          <td className="py-2 px-2">{d.owner}</td>
                          <td className="py-2 px-2">{d.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Expandable>
      )}

      {/* Top Advertisers */}
      {data.topAdvertisers.length > 0 && (
        <Expandable title="Top Advertisers by GAS" badge={`${data.topAdvertisers.length} advertisers`}>
          <div className="pt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border/40 text-muted-foreground">
                <th className="text-left py-2 px-2 font-semibold">#</th>
                <th className="text-left py-2 px-2 font-semibold">Advertiser</th>
                <th className="text-right py-2 px-2 font-semibold">GAS</th>
                <th className="text-right py-2 px-2 font-semibold">Campaigns</th>
                <th className="text-left py-2 px-2 font-semibold">Active</th>
              </tr></thead>
              <tbody>
                {data.topAdvertisers.slice(0, 15).map((a, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="py-2 px-2 font-mono text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-2 font-medium text-foreground">{a.name}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtMoney(a.gas)}</td>
                    <td className="py-2 px-2 text-right">{a.campaigns}</td>
                    <td className="py-2 px-2 text-muted-foreground">{a.firstActive} → {a.lastActive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Expandable>
      )}

      {/* Concentration */}
      {data.concentration.length > 0 && (
        <Expandable title="Revenue Concentration" badge={`Top 5 = ${data.concentration.length >= 5 ? data.concentration[4].cumulativePct.toFixed(0) : "N/A"}%`}>
          <div className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.concentration.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="advertiser" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                <Bar dataKey="pctOfTotal" name="% of Total GAS" radius={[4, 4, 0, 0]}>
                  {data.concentration.slice(0, 10).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Expandable>
      )}

      {/* Risks & Opportunities */}
      <div>
        <FilterBar search={search} setSearch={setSearch}>
          <SelectFilter value={impactFilter} onChange={setImpactFilter} label="Impact" options={[{ value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} />
        </FilterBar>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-rose-200/60 rounded-xl bg-rose-50/30 p-4">
            <h3 className="text-sm font-semibold text-rose-700 mb-3 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Risks ({risks.length})</h3>
            <div className="space-y-3">
              {risks.length === 0 ? <p className="text-xs text-muted-foreground">No risks match filters</p> : risks.map((r) => (
                <div key={r.id} className="p-3 rounded-lg bg-white/60 border border-rose-100/60">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">{r.title}</span>
                    <div className="flex items-center gap-1"><ImpactPill level={r.impact} /><ConfidenceBadge level={r.confidence} /></div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1">{r.description}</p>
                  {r.actionItem && <p className="text-[11px] text-rose-700"><span className="font-semibold">Action:</span> {r.actionItem}</p>}
                  <div className="mt-1"><SourceTag source={r.source} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-emerald-200/60 rounded-xl bg-emerald-50/30 p-4">
            <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-1.5"><Zap className="w-4 h-4" /> Opportunities ({opps.length})</h3>
            <div className="space-y-3">
              {opps.length === 0 ? <p className="text-xs text-muted-foreground">No opportunities match filters</p> : opps.map((o) => (
                <div key={o.id} className="p-3 rounded-lg bg-white/60 border border-emerald-100/60">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">{o.title}</span>
                    <div className="flex items-center gap-1"><ImpactPill level={o.impact} /><ConfidenceBadge level={o.confidence} /></div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1">{o.description}</p>
                  {o.actionItem && <p className="text-[11px] text-emerald-700"><span className="font-semibold">Action:</span> {o.actionItem}</p>}
                  <div className="mt-1"><SourceTag source={o.source} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   TAB 2: CUSTOMER INTELLIGENCE
   ============================================================================ */
function CustomerTab({ data, search, setSearch }: { data: BusinessInsightsReport["customerIntel"]; search: string; setSearch: (v: string) => void }) {
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const filteredSignals = useMemo(() => {
    let items = data.signals;
    if (search) { const q = search.toLowerCase(); items = items.filter(s => s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q) || (s.advertiser || "").toLowerCase().includes(q)); }
    if (sentimentFilter !== "all") items = items.filter(s => s.sentiment === sentimentFilter);
    if (sourceFilter !== "all") items = items.filter(s => s.type.includes(sourceFilter));
    return items;
  }, [data.signals, search, sentimentFilter, sourceFilter]);

  const sb = data.sentimentBreakdown;
  const total = sb.positive + sb.negative + sb.neutral + sb.mixed;

  return (
    <div className="space-y-6">
      {/* Sentiment Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total Gong Calls" value={data.totalGongCalls} icon={<Phone className="w-4 h-4 text-blue-600" />} color="bg-blue-50" source="Gong Live" />
        <KPICard label="Slack Signals" value={data.totalSlackSignals} icon={<MessageSquare className="w-4 h-4 text-cyan-600" />} color="bg-cyan-50" source="Slack Live" />
        <KPICard label="Positive Sentiment" value={total > 0 ? `${((sb.positive / total) * 100).toFixed(0)}%` : "N/A"} sub={`${sb.positive} of ${total} signals`} icon={<ThumbsUp className="w-4 h-4 text-emerald-600" />} color="bg-emerald-50" />
        <KPICard label="Negative Sentiment" value={total > 0 ? `${((sb.negative / total) * 100).toFixed(0)}%` : "N/A"} sub={`${sb.negative} of ${total} signals`} icon={<ThumbsDown className="w-4 h-4 text-rose-600" />} color="bg-rose-50" />
      </div>

      {/* Week-over-Week Trends */}
      {data.weekOverWeek.length > 0 && (
        <Expandable title="Week-over-Week Trends" badge="Last week vs. overall" defaultOpen>
          <div className="pt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border/40 text-muted-foreground">
                <th className="text-left py-2 px-2 font-semibold">Metric</th>
                <th className="text-right py-2 px-2 font-semibold">This Week</th>
                <th className="text-right py-2 px-2 font-semibold">Last Week</th>
                <th className="text-right py-2 px-2 font-semibold">Change</th>
                <th className="text-right py-2 px-2 font-semibold">Overall Avg</th>
                <th className="text-center py-2 px-2 font-semibold">Trend</th>
              </tr></thead>
              <tbody>
                {data.weekOverWeek.map((w, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="py-2 px-2 font-medium text-foreground">{w.metric}</td>
                    <td className="py-2 px-2 text-right font-mono">{w.thisWeek}</td>
                    <td className="py-2 px-2 text-right font-mono">{w.lastWeek}</td>
                    <td className={`py-2 px-2 text-right font-mono ${w.change > 0 ? "text-emerald-600" : w.change < 0 ? "text-rose-600" : ""}`}>
                      {w.change > 0 ? "+" : ""}{w.change} ({w.changePct > 0 ? "+" : ""}{w.changePct.toFixed(0)}%)
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-muted-foreground">{w.overall.toFixed(1)}</td>
                    <td className="py-2 px-2 text-center"><TrendArrow dir={w.direction} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Expandable>
      )}

      {/* Sentiment Themes */}
      {data.themes.length > 0 && (
        <Expandable title="Emerging Themes" badge={`${data.themes.length} themes`} defaultOpen>
          <div className="pt-4 space-y-3">
            {data.themes.map((t, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/40 bg-white/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <SentimentDot sentiment={t.sentiment} />
                    <span className="text-sm font-semibold text-foreground">{t.theme}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t.count} mentions</span>
                  </div>
                  <div className="flex items-center gap-1"><TrendArrow dir={t.trend} /><span className="text-[10px] text-muted-foreground">{t.trend}</span></div>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">{t.description}</p>
                {t.evidence.length > 0 && (
                  <div className="space-y-1">
                    {t.evidence.slice(0, 3).map((e, j) => (
                      <div key={j} className="flex items-start gap-2 text-[11px] pl-2 border-l-2 border-border/40">
                        <span className="font-medium text-foreground">{e.advertiser}:</span>
                        <span className="text-muted-foreground italic">"{e.snippet}"</span>
                        {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline shrink-0"><ExternalLink className="w-3 h-3" /></a>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Expandable>
      )}

      {/* Signal Feed */}
      <div>
        <FilterBar search={search} setSearch={setSearch}>
          <SelectFilter value={sentimentFilter} onChange={setSentimentFilter} label="Sentiment" options={[{ value: "positive", label: "Positive" }, { value: "negative", label: "Negative" }, { value: "neutral", label: "Neutral" }, { value: "mixed", label: "Mixed" }]} />
          <SelectFilter value={sourceFilter} onChange={setSourceFilter} label="Source" options={[{ value: "gong", label: "Gong" }, { value: "slack", label: "Slack" }]} />
        </FilterBar>
        <div className="space-y-2">
          {filteredSignals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No signals match your filters</p>
          ) : filteredSignals.slice(0, 50).map((s) => (
            <div key={s.id} className="p-3 rounded-lg border border-border/40 bg-white/50 hover:bg-white/70 transition-colors">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <SentimentDot sentiment={s.sentiment} />
                  <span className="text-xs font-semibold text-foreground">{s.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{s.date}</span>
                  <SourceTag source={s.source} verified={s.source.includes("Live")} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mb-1">{s.summary}</p>
              <div className="flex items-center gap-2">
                {s.advertiser && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{s.advertiser}</span>}
                {s.verifyUrl && (
                  <a href={s.verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                    <Phone className="w-3 h-3" />Verify in Gong<ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {s.verifyChannel && <span className="text-[10px] text-cyan-600">#{s.verifyChannel}</span>}
                {s.tags.map((tag, i) => <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>)}
              </div>
            </div>
          ))}
          {filteredSignals.length > 50 && <p className="text-xs text-muted-foreground text-center py-2">Showing 50 of {filteredSignals.length} — use filters to narrow</p>}
        </div>
      </div>

      {/* Top Advertisers by Mentions */}
      {data.topAdvertisersByMentions.length > 0 && (
        <Expandable title="Top Advertisers by Call Volume" badge={`${data.topAdvertisersByMentions.length} accounts`}>
          <div className="pt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border/40 text-muted-foreground">
                <th className="text-left py-2 px-2 font-semibold">Advertiser</th>
                <th className="text-right py-2 px-2 font-semibold">Calls</th>
                <th className="text-center py-2 px-2 font-semibold">Sentiment</th>
              </tr></thead>
              <tbody>
                {data.topAdvertisersByMentions.slice(0, 15).map((a, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="py-2 px-2 font-medium text-foreground">{a.advertiser}</td>
                    <td className="py-2 px-2 text-right font-mono">{a.callCount}</td>
                    <td className="py-2 px-2 text-center"><SentimentDot sentiment={a.sentiment} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Expandable>
      )}
    </div>
  );
}

/* ============================================================================
   TAB 3: SALES COACHING
   ============================================================================ */
function CoachingTab({ data, search, setSearch }: { data: BusinessInsightsReport["salesCoaching"]; search: string; setSearch: (v: string) => void }) {
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filteredInsights = useMemo(() => {
    let items = data.coachingInsights;
    if (search) { const q = search.toLowerCase(); items = items.filter(c => c.area.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)); }
    if (priorityFilter !== "all") items = items.filter(c => c.priority === priorityFilter);
    return items;
  }, [data.coachingInsights, search, priorityFilter]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Overall Win Rate" value={`${data.overallWinRate}%`} icon={<Target className="w-4 h-4 text-emerald-600" />} color="bg-emerald-50" source="SFDC Live" />
        <KPICard label="Avg Deal Cycle" value={`${data.avgDealCycle}d`} icon={<Activity className="w-4 h-4 text-blue-600" />} color="bg-blue-50" source="SFDC Live" />
        <KPICard label="Test→Scale Rate" value={`${data.testToScaleRate}%`} icon={<TrendingUp className="w-4 h-4 text-violet-600" />} color="bg-violet-50" source="Derived" />
        <KPICard label="Coaching Areas" value={filteredInsights.length} sub={`${filteredInsights.filter(c => c.priority === "high").length} high priority`} icon={<Lightbulb className="w-4 h-4 text-amber-600" />} color="bg-amber-50" />
      </div>

      {/* Coaching Insights */}
      <div>
        <FilterBar search={search} setSearch={setSearch}>
          <SelectFilter value={priorityFilter} onChange={setPriorityFilter} label="Priority" options={[{ value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} />
        </FilterBar>
        <div className="space-y-3">
          {filteredInsights.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No coaching insights match filters</p>
          ) : filteredInsights.map((c) => (
            <div key={c.id} className={`p-4 rounded-xl border ${c.priority === "high" ? "border-rose-200/60 bg-rose-50/20" : c.priority === "medium" ? "border-amber-200/60 bg-amber-50/20" : "border-border/40 bg-white/50"}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className={`w-4 h-4 ${c.priority === "high" ? "text-rose-500" : c.priority === "medium" ? "text-amber-500" : "text-slate-400"}`} />
                  <span className="text-sm font-semibold text-foreground">{c.area}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ImpactPill level={c.priority} />
                  <span className="text-[10px] text-muted-foreground">{c.repsAffected} reps</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{c.description}</p>
              <div className="p-2 rounded-lg bg-white/60 border border-border/30 mb-2">
                <p className="text-xs text-foreground"><span className="font-semibold text-emerald-700">Suggested Action:</span> {c.suggestedAction}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground italic">Evidence: {c.evidence}</span>
                <SourceTag source={c.source} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Win/Loss Behaviors */}
      {data.winLossBehaviors.length > 0 && (
        <Expandable title="Winning vs. Losing Behaviors" badge={`${data.winLossBehaviors.length} patterns`} defaultOpen>
          <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Winning Behaviors</h4>
              <div className="space-y-2">
                {data.winLossBehaviors.filter(b => b.type === "winning").map((b, i) => (
                  <div key={i} className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-100/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{b.behavior}</span>
                      <ConfidenceBadge level={b.confidence} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{b.impact}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 italic">{b.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-rose-700 mb-2 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Losing Behaviors</h4>
              <div className="space-y-2">
                {data.winLossBehaviors.filter(b => b.type === "losing").map((b, i) => (
                  <div key={i} className="p-3 rounded-lg bg-rose-50/40 border border-rose-100/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{b.behavior}</span>
                      <ConfidenceBadge level={b.confidence} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">{b.impact}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 italic">{b.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Expandable>
      )}

      {/* Rep Performance */}
      {data.repPerformance.length > 0 && (
        <Expandable title="Rep Performance Snapshot" badge={`${data.repPerformance.length} reps`}>
          <div className="pt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border/40 text-muted-foreground">
                <th className="text-left py-2 px-2 font-semibold">Rep</th>
                <th className="text-right py-2 px-2 font-semibold">Closed</th>
                <th className="text-right py-2 px-2 font-semibold">Pipeline</th>
                <th className="text-right py-2 px-2 font-semibold">Win %</th>
                <th className="text-right py-2 px-2 font-semibold">Cycle</th>
                <th className="text-right py-2 px-2 font-semibold">Calls</th>
                <th className="text-left py-2 px-2 font-semibold">Strength</th>
                <th className="text-left py-2 px-2 font-semibold">Coaching</th>
              </tr></thead>
              <tbody>
                {data.repPerformance.map((r, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="py-2 px-2 font-medium text-foreground">{r.name}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtMoney(r.closedValue)}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtMoney(r.pipelineValue)}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.winRate}%</td>
                    <td className="py-2 px-2 text-right font-mono">{r.avgCycleDays}d</td>
                    <td className="py-2 px-2 text-right">{r.callCount}</td>
                    <td className="py-2 px-2 text-emerald-700">{r.topStrength}</td>
                    <td className="py-2 px-2 text-amber-700">{r.coachingArea || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Expandable>
      )}

      {/* Activity Trend */}
      {data.activityTrend.length > 0 && (
        <Expandable title="Weekly Activity Trend" badge={`${data.activityTrend.length} weeks`}>
          <div className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.activityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="calls" name="Calls" fill={BLUE} radius={[2, 2, 0, 0]} />
                <Bar dataKey="meetings" name="Meetings" fill={EMERALD} radius={[2, 2, 0, 0]} />
                <Bar dataKey="emails" name="Emails" fill={VIOLET} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Expandable>
      )}
    </div>
  );
}

/* ============================================================================
   TAB 4: MARKET & COMPETITIVE
   ============================================================================ */
function MarketTab({ data, search, setSearch }: { data: BusinessInsightsReport["market"]; search: string; setSearch: (v: string) => void }) {
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  const filteredSignals = useMemo(() => {
    let items = data.competitiveSignals;
    if (search) { const q = search.toLowerCase(); items = items.filter(s => s.signal.toLowerCase().includes(q) || (s.competitor || "").toLowerCase().includes(q)); }
    if (urgencyFilter !== "all") items = items.filter(s => s.urgency === urgencyFilter);
    return items;
  }, [data.competitiveSignals, search, urgencyFilter]);

  return (
    <div className="space-y-6">
      {/* Competitor Landscape */}
      {data.competitors.length > 0 && (
        <Expandable title="Competitive Landscape" badge={`${data.competitors.length} competitors`} defaultOpen>
          <div className="pt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border/40 text-muted-foreground">
                <th className="text-left py-2 px-2 font-semibold">Competitor</th>
                <th className="text-center py-2 px-2 font-semibold">Wins</th>
                <th className="text-center py-2 px-2 font-semibold">Losses</th>
                <th className="text-center py-2 px-2 font-semibold">Net</th>
                <th className="text-left py-2 px-2 font-semibold">Differentiator</th>
                <th className="text-center py-2 px-2 font-semibold">Threat</th>
                <th className="text-center py-2 px-2 font-semibold">Mentions</th>
              </tr></thead>
              <tbody>
                {data.competitors.map((c, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="py-2 px-2 font-semibold text-foreground">{c.name}</td>
                    <td className="py-2 px-2 text-center font-mono text-emerald-600">{c.winsAgainst}</td>
                    <td className="py-2 px-2 text-center font-mono text-rose-600">{c.lossesAgainst}</td>
                    <td className="py-2 px-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.netPosition.includes("+") || c.netPosition.toLowerCase().includes("favorable") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{c.netPosition}</span></td>
                    <td className="py-2 px-2 text-muted-foreground">{c.keyDifferentiator}</td>
                    <td className="py-2 px-2 text-center"><ImpactPill level={c.threatLevel} /></td>
                    <td className="py-2 px-2 text-center font-mono">{c.recentMentions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Expandable>
      )}

      {/* Market Trends */}
      {data.marketTrends.length > 0 && (
        <Expandable title="Market Trends" badge={`${data.marketTrends.length} trends`} defaultOpen>
          <div className="pt-4 space-y-2">
            {data.marketTrends.map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-white/50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.direction === "accelerating" ? "bg-emerald-50" : t.direction === "decelerating" ? "bg-rose-50" : "bg-slate-50"}`}>
                  {t.direction === "accelerating" ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : t.direction === "decelerating" ? <TrendingDown className="w-4 h-4 text-rose-600" /> : <Minus className="w-4 h-4 text-slate-500" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-foreground">{t.trend}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.direction === "accelerating" ? "bg-emerald-50 text-emerald-700" : t.direction === "decelerating" ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"}`}>{t.direction}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t.relevance}</p>
                  <div className="mt-1"><SourceTag source={t.source} /></div>
                </div>
              </div>
            ))}
          </div>
        </Expandable>
      )}

      {/* Competitive Signals */}
      <div>
        <FilterBar search={search} setSearch={setSearch}>
          <SelectFilter value={urgencyFilter} onChange={setUrgencyFilter} label="Urgency" options={[{ value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} />
        </FilterBar>
        <div className="space-y-2">
          {filteredSignals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No competitive signals match filters</p>
          ) : filteredSignals.map((s, i) => (
            <div key={i} className={`p-3 rounded-lg border ${s.urgency === "high" ? "border-rose-200/60 bg-rose-50/20" : "border-border/40 bg-white/50"}`}>
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  {s.competitor && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-medium">{s.competitor}</span>}
                  <span className="text-xs font-semibold text-foreground">{s.signal}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <ImpactPill level={s.urgency} />
                  <span className="text-[10px] text-muted-foreground">{s.date}</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mb-1">{s.implication}</p>
              <div className="flex items-center gap-2">
                <SourceTag source={s.source} />
                {s.verifyUrl && (
                  <a href={s.verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                    Verify<ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Moloco Advantages & Vulnerabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.molocoAdvantages.length > 0 && (
          <div className="border border-emerald-200/60 rounded-xl bg-emerald-50/30 p-4">
            <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-1.5"><Star className="w-4 h-4" /> Moloco Advantages</h3>
            <div className="space-y-2">
              {data.molocoAdvantages.map((a, i) => (
                <div key={i} className="p-2 rounded-lg bg-white/60">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-foreground">{a.advantage}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.durability === "durable" ? "bg-emerald-50 text-emerald-700" : a.durability === "at-risk" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{a.durability}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{a.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.molocoVulnerabilities.length > 0 && (
          <div className="border border-rose-200/60 rounded-xl bg-rose-50/30 p-4">
            <h3 className="text-sm font-semibold text-rose-700 mb-3 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Vulnerabilities</h3>
            <div className="space-y-2">
              {data.molocoVulnerabilities.map((v, i) => (
                <div key={i} className="p-2 rounded-lg bg-white/60">
                  <span className="text-xs font-semibold text-foreground block mb-0.5">{v.vulnerability}</span>
                  <p className="text-[10px] text-rose-700 mb-0.5">Threat: {v.threat}</p>
                  <p className="text-[10px] text-emerald-700">Mitigation: {v.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TAM */}
      {data.tamEstimate.length > 0 && (
        <Expandable title="Total Addressable Market" badge={`${data.tamEstimate.length} segments`}>
          <div className="pt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border/40 text-muted-foreground">
                <th className="text-left py-2 px-2 font-semibold">Segment</th>
                <th className="text-right py-2 px-2 font-semibold">TAM</th>
                <th className="text-right py-2 px-2 font-semibold">SAM Reachable</th>
                <th className="text-right py-2 px-2 font-semibold">Penetration</th>
              </tr></thead>
              <tbody>
                {data.tamEstimate.map((t, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="py-2 px-2 font-medium text-foreground">{t.segment}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtMoney(t.tam)}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtMoney(t.samReachable)}</td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(t.currentPenetration, 100)}%` }} />
                        </div>
                        <span className="font-mono">{t.currentPenetration.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Expandable>
      )}
    </div>
  );
}
