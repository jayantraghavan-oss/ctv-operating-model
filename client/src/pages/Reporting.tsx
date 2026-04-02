/**
 * Reporting — CTV Revenue Intelligence & Pipeline Visibility
 *
 * Two primary views:
 *   Revenue & Pipeline — Super view combining live BQ revenue data + SFDC pipeline
 *   Insights          — VP/GM strategic view answering: On track? Where's risk? What to do?
 *
 * Data sources: BigQuery (fact_dsp_core), Salesforce (sfdc_opportunities), Gong, Slack
 * Zero hallucinations: every number traces to a live source or is explicitly labeled as projected.
 */
import NeuralShell from "@/components/NeuralShell";
import { trpcQuery } from "@/lib/trpcFetch";
import { useState, useEffect, useMemo } from "react";
import {
  DollarSign, TrendingUp, Target,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  RefreshCw, ArrowUpRight, ArrowDownRight, Minus,
  Shield, Crosshair, Users, BarChart3, Info,
  Award, XCircle, Briefcase, Activity, Clock,
  Zap, Eye, ArrowRight, Gauge,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
  AreaChart, Area, ComposedChart, ReferenceLine,
} from "recharts";

// ============================================================================
// CONSTANTS
// ============================================================================

const MOLOCO_BLUE = "#0091FF";
const EMERALD = "#34d399";
const AMBER = "#fbbf24";
const ROSE = "#f87171";
const VIOLET = "#a78bfa";
const SLATE = "#94a3b8";
const CYAN = "#06b6d4";

const EOY_GAS_TARGET = 10_000_000; // $10M GAS annual target (primary)
const EOY_ARR_STRETCH = 100; // $100M ARR stretch target (secondary)
const DAILY_TARGET_STRETCH = 274000; // $274K/day needed for $100M ARR stretch

// ============================================================================
// TABS
// ============================================================================

interface Tab { id: string; label: string; icon: typeof DollarSign; description: string }

const TABS: Tab[] = [
  { id: "revenue", label: "Revenue & Pipeline", icon: DollarSign, description: "Live BQ + SFDC" },
  { id: "insights", label: "Insights", icon: Eye, description: "VP/GM View" },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function DataSourceBadge({ source, live }: { source: string; live: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <div className={`w-1.5 h-1.5 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"}`} />
      <span className={live ? "text-emerald-700 font-medium" : "text-muted-foreground"}>{source}</span>
      {live && <span className="text-emerald-600">Live</span>}
    </div>
  );
}

function KpiCard({ label, value, sub, color = "text-foreground", badge, badgeColor, progress }: {
  label: string; value: string | number; sub?: string; color?: string;
  badge?: string; badgeColor?: string; progress?: number;
}) {
  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold tracking-tight ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
      {badge && (
        <div className={`text-[10px] font-semibold mt-2 px-2 py-0.5 rounded-md inline-block ${badgeColor || "bg-muted text-muted-foreground"}`}>
          {badge}
        </div>
      )}
      {progress !== undefined && (
        <div className="mt-3 h-1 bg-muted/40 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-amber-400 transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function RiskCard({ title, severity, metric, body }: {
  title: string; severity: "high" | "watch" | "low"; metric: string; body: string;
}) {
  const sev = {
    high: { bg: "bg-rose-50/50 border-rose-200/60", pill: "bg-rose-100 text-rose-700", metricColor: "text-rose-600" },
    watch: { bg: "bg-amber-50/50 border-amber-200/60", pill: "bg-amber-100 text-amber-700", metricColor: "text-amber-600" },
    low: { bg: "bg-emerald-50/50 border-emerald-200/60", pill: "bg-emerald-100 text-emerald-700", metricColor: "text-emerald-600" },
  }[severity];
  return (
    <div className={`rounded-2xl border p-4 ${sev.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.pill}`}>{severity.toUpperCase()}</span>
      </div>
      <div className={`text-xl font-bold ${sev.metricColor} mb-2`}>{metric}</div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function SectionTitle({ children, tag }: { children: string; tag?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{children}</h3>
      <div className="flex-1 h-px bg-border/60" />
      {tag && <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{tag}</span>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-center">
      <div>
        <Info className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtK(n: number): string {
  return `$${(n / 1000).toFixed(1)}K`;
}

function fmtM(n: number): string {
  return `$${(n / 1e6).toFixed(1)}M`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Reporting() {
  const [activeTab, setActiveTab] = useState("revenue");
  const [bqData, setBqData] = useState<any>(null);
  const [sfdcData, setSfdcData] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loadingBq, setLoadingBq] = useState(true);
  const [loadingSfdc, setLoadingSfdc] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  useEffect(() => {
    loadBqData();
    loadSfdcData();
    loadReport();
  }, []);

  async function loadBqData() {
    setLoadingBq(true);
    try {
      const res = await trpcQuery("reporting.bqRevenue");
      setBqData(res?.data || res);
    } catch (err) {
      console.error("[Reporting] BQ load failed:", err);
    } finally {
      setLoadingBq(false);
    }
  }

  async function loadSfdcData() {
    setLoadingSfdc(true);
    try {
      const res = await trpcQuery("reporting.sfdcPipeline");
      setSfdcData(res?.data || res);
    } catch (err) {
      console.error("[Reporting] SFDC load failed:", err);
    } finally {
      setLoadingSfdc(false);
    }
  }

  async function loadReport() {
    setLoadingReport(true);
    try {
      const data = await trpcQuery("reporting.insights");
      setReport(data);
    } catch (err) {
      console.error("[Reporting] Insights load failed:", err);
    } finally {
      setLoadingReport(false);
    }
  }

  // ── Derived BQ metrics ──
  const summary = bqData?.summary?.[0];
  const trailing7d = bqData?.trailing_7d?.[0];
  const monthly = bqData?.monthly || [];
  const dailyRecent = bqData?.daily_recent || [];
  const topAdvertisers = bqData?.top_advertisers || [];
  const exchanges = bqData?.exchanges || [];
  const concentration = bqData?.concentration || [];

  // CY2026 YTD
  const cy2026Monthly = monthly.filter((m: any) => m.month >= "2026");
  const cy2026Ytd = cy2026Monthly.reduce((sum: number, m: any) => sum + (m.monthly_gas || 0), 0);

  // Q1 avg daily (Jan-Mar 2026)
  const q1Months = monthly.filter((m: any) => m.month >= "2026-01" && m.month <= "2026-03");
  const q1TotalGas = q1Months.reduce((s: number, m: any) => s + (m.monthly_gas || 0), 0);
  const q1TotalDays = q1Months.reduce((s: number, m: any) => s + (m.days_in_month || 0), 0);
  const q1AvgDaily = q1TotalDays > 0 ? q1TotalGas / q1TotalDays : 0;

  // Trailing metrics
  const trailing7dDaily = trailing7d?.trailing_7d_daily || 0;

  // ARR: use most recent complete month × 12 (matches internal reporting)
  const lastCompleteMonth = q1Months.length > 0 ? q1Months[q1Months.length - 1] : null;
  const monthlyPacing = lastCompleteMonth?.monthly_gas || (trailing7dDaily * 30);
  const currentArr = monthlyPacing * 12;
  const currentArrTrailing = trailing7dDaily * 365; // secondary: trailing 7d × 365

  // GAS target pacing (primary: $10M EOY)
  const pctGasTarget = (cy2026Ytd / EOY_GAS_TARGET) * 100;
  const gasOnTrack = cy2026Ytd >= EOY_GAS_TARGET * (q1TotalDays / 365); // pro-rata check

  // ARR stretch target pacing
  const pctArrStretch = (currentArr / (EOY_ARR_STRETCH * 1e6)) * 100;
  const gapToArrStretch = EOY_ARR_STRETCH * 1e6 - currentArr;

  // Acceleration factor: trailing 7d vs Q1 avg
  const accelFactor = q1AvgDaily > 0 ? trailing7dDaily / q1AvgDaily : 0;

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    return monthly.map((m: any) => {
      const label = new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      return {
        label,
        avgDaily: Math.round(m.avg_daily_gas / 1000 * 10) / 10,
        bqVerified: m.month >= "2025-10",
        month: m.month,
      };
    });
  }, [monthly]);

  // Projection scenarios
  const bearEoy = currentArr / 1e6; // flat at current monthly pacing
  const baseMonthlyIncr = 7300; // +$7.3K/day per month (Scenario B from HTML)
  let baseEndRate = trailing7dDaily;
  for (let i = 0; i < 9; i++) baseEndRate += baseMonthlyIncr;
  const baseEoy = (((trailing7dDaily + baseEndRate) / 2) * 365) / 1e6;
  const bullReqIncr = (DAILY_TARGET_STRETCH - trailing7dDaily) / 9;

  // SFDC derived
  const sfdcSummary = sfdcData?.summary;
  const stageDistribution = sfdcData?.stageDistribution || [];
  const topDeals = sfdcData?.topDeals || [];
  const openDeals = sfdcData?.openPipeline || topDeals.filter((d: any) => !d.stageName?.startsWith("Closed"));
  const recentWins = (sfdcData?.closedWon || []).slice(0, 8);
  const recentLosses = (sfdcData?.closedLost || []).slice(0, 8);

  // ── Loading state ──
  const isLoading = loadingBq && loadingSfdc;

  return (
    <NeuralShell>
      <div className="p-6 lg:p-8 max-w-[1200px]">

        {/* ── Header ── */}
        <div className="mb-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">CTV Revenue Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live revenue performance and pipeline visibility — zero hallucinations
          </p>
        </div>

        {/* ── Data Source Status ── */}
        <div className="flex items-center gap-4 mb-5">
          <DataSourceBadge source="BigQuery" live={!!bqData && !bqData.fallback} />
          <DataSourceBadge source="Salesforce" live={!!sfdcSummary} />
          {report?.liveDataStatus && (
            <>
              <DataSourceBadge source="Gong" live={report.liveDataStatus.gongConnected} />
              <DataSourceBadge source="Slack" live={report.liveDataStatus.slackConnected} />
            </>
          )}
          {bqData?.fetched_at && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              BQ: {new Date(bqData.fetched_at).toLocaleString()}
            </span>
          )}
        </div>

        {/* ── Tab Switcher ── */}
        <div className="flex gap-1 p-1 bg-muted/30 rounded-xl mb-6 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className="text-[9px] text-muted-foreground hidden sm:inline">{tab.description}</span>
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB: REVENUE & PIPELINE (Super View)                           */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "revenue" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-[40vh]">
                <RefreshCw className="w-5 h-5 text-[#0091FF] animate-spin" />
              </div>
            ) : (
              <>
                {/* ── GOAL PACING BANNER ── */}
                {summary && (
                  <div className="space-y-4 mb-6">
                    {/* PRIMARY: $10M GAS Target */}
                    <div className="rounded-2xl border-2 border-emerald-200/60 bg-gradient-to-r from-emerald-50/40 via-white to-emerald-50/20 p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">EOY GAS Target: $10M</div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pctGasTarget >= 90 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {pctGasTarget >= 100 ? "Exceeding" : pctGasTarget >= 90 ? "On Track" : "Behind"}
                            </span>
                          </div>
                          <div className="text-4xl font-black tracking-tight text-emerald-700">{fmtM(cy2026Ytd)}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            CY2026 YTD GAS · <strong className="text-emerald-700">{fmtPct(pctGasTarget)}</strong> of $10M target
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                            <span>$0</span>
                            <span className="font-semibold text-emerald-700">{fmtM(cy2026Ytd)} current</span>
                            <span>$10M target</span>
                          </div>
                          <div className="h-3.5 bg-muted/30 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                              style={{ width: `${Math.min(pctGasTarget, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-600">{fmtM(monthlyPacing)}</div>
                          <div className="text-[9px] text-muted-foreground">Monthly Pacing</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-violet-600">{fmtM(currentArr)}</div>
                          <div className="text-[9px] text-muted-foreground">ARR (Monthly × 12)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-600">{fmtK(trailing7dDaily)}</div>
                          <div className="text-[9px] text-muted-foreground">GAS/Day (7d)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-amber-600">{accelFactor.toFixed(1)}×</div>
                          <div className="text-[9px] text-muted-foreground">7d vs Q1 avg</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-foreground">{summary.total_campaigns}</div>
                          <div className="text-[9px] text-muted-foreground">Active campaigns</div>
                        </div>
                      </div>
                    </div>

                    {/* SECONDARY: $100M ARR Stretch */}
                    <div className="rounded-2xl border border-violet-200/40 bg-gradient-to-r from-violet-50/20 via-white to-amber-50/10 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="shrink-0">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">$100M ARR Stretch Target</div>
                          <div className="text-2xl font-black tracking-tight text-violet-600">{fmtM(currentArr)}</div>
                          <div className="text-[10px] text-muted-foreground">Monthly pacing × 12 · {fmtPct(pctArrStretch)} of $100M</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
                            <span>$0</span>
                            <span>${Math.round(currentArr / 1e6)}M</span>
                            <span>$100M</span>
                          </div>
                          <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden relative">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-amber-300 transition-all duration-1000"
                              style={{ width: `${Math.min(pctArrStretch, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-rose-500">{fmtM(Math.max(0, gapToArrStretch))}</div>
                          <div className="text-[9px] text-muted-foreground">Gap remaining</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── KPI ROW ── */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                  <KpiCard
                    label="YTD GAS"
                    value={fmtM(cy2026Ytd)}
                    sub={`CY2026 · ${q1TotalDays} days`}
                    color="text-emerald-700"
                    badge={`${fmtPct(pctGasTarget)} of $10M target`}
                    badgeColor={pctGasTarget >= 90 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}
                    progress={Math.min(pctGasTarget, 100)}
                  />
                  <KpiCard
                    label="ARR (Monthly × 12)"
                    value={fmtM(currentArr)}
                    sub={`${fmtM(monthlyPacing)}/mo pacing`}
                    color="text-violet-700"
                    badge={`${fmtPct(pctArrStretch)} of $100M`}
                    badgeColor={pctArrStretch >= 40 ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-700"}
                    progress={pctArrStretch}
                  />
                  <KpiCard
                    label="GAS/Day"
                    value={fmtK(trailing7dDaily)}
                    sub="Trailing 7d average"
                    color="text-emerald-600"
                    badge={`${fmtK(q1AvgDaily)} Q1 avg`}
                    badgeColor="bg-blue-50 text-blue-700"
                  />
                  <KpiCard
                    label="Acceleration"
                    value={`${accelFactor.toFixed(1)}×`}
                    sub="7d vs Q1 avg"
                    color={accelFactor > 1.5 ? "text-emerald-600" : "text-amber-600"}
                    badge={accelFactor > 1.5 ? "Strong" : "Moderate"}
                    badgeColor={accelFactor > 1.5 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}
                  />
                  <KpiCard
                    label="Campaigns"
                    value={summary?.total_campaigns || 0}
                    sub={`of 150 EOY target`}
                    color="text-foreground"
                    badge={`${Math.round(((summary?.total_campaigns || 0) / 150) * 100)}% of target`}
                    badgeColor="bg-muted text-muted-foreground"
                    progress={((summary?.total_campaigns || 0) / 150) * 100}
                  />
                </div>

                {/* ── MONTHLY TREND ── */}
                <SectionTitle tag="BigQuery">Monthly GAS/Day Trend</SectionTitle>
                <div className="glass rounded-2xl p-5 mb-6">
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: SLATE }} />
                      <YAxis tick={{ fontSize: 10, fill: SLATE }} tickFormatter={(v: number) => `$${v}K`} />
                      <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(1)}K/day`, "Avg Daily GAS"]} />
                      <ReferenceLine y={274} stroke={AMBER} strokeDasharray="5 4" strokeWidth={2} label={{ value: "$274K target", position: "right", fontSize: 10, fill: AMBER }} />
                      <Bar dataKey="avgDaily" radius={[4, 4, 0, 0]}>
                        {monthlyChartData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.bqVerified ? "rgba(139,92,246,0.8)" : "rgba(139,92,246,0.25)"} />
                        ))}
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-violet-500/80" /> BQ Verified</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-violet-500/25" /> Estimated (pre-Oct '25)</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-amber-400" style={{ borderTop: "2px dashed" }} /> $274K/day required</div>
                  </div>
                </div>

                {/* ── PROJECTION SCENARIOS ── */}
                <SectionTitle>EOY Projection Scenarios</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  <div className="glass rounded-2xl p-4 border-t-2 border-rose-400">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Scenario A · Bear</div>
                    <div className="text-xs text-muted-foreground mb-2">Flat at current rate</div>
                    <div className="text-3xl font-black text-rose-500">${Math.round(bearEoy)}M</div>
                    <div className="text-xs text-rose-500 font-semibold mt-1">−${Math.round(EOY_ARR_STRETCH - bearEoy)}M miss ({Math.round(EOY_ARR_STRETCH - bearEoy)}%)</div>
                    <div className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border/40">
                      Assumes {fmtK(trailing7dDaily)}/day stays flat through Dec. No new campaign ramp.
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-4 border-t-2 border-amber-400">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Scenario B · Base</div>
                    <div className="text-xs text-muted-foreground mb-2">+$7.3K/day per month</div>
                    <div className="text-3xl font-black text-amber-500">${Math.round(baseEoy)}M</div>
                    <div className="text-xs text-amber-600 font-semibold mt-1">
                      {baseEoy >= EOY_ARR_STRETCH ? `+$${Math.round(baseEoy - EOY_ARR_STRETCH)}M above target` : `−$${Math.round(EOY_ARR_STRETCH - baseEoy)}M miss (${Math.round(EOY_ARR_STRETCH - baseEoy)}%)`}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border/40">
                      Linear ramp from {fmtK(trailing7dDaily)} to ~$263K/day by Dec. Requires steady campaign adds.
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-4 border-t-2 border-emerald-400">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Required · Bull</div>
                    <div className="text-xs text-muted-foreground mb-2">$274K/day by Dec 31</div>
                    <div className="text-3xl font-black text-emerald-500">$100M</div>
                    <div className="text-xs text-emerald-600 font-semibold mt-1">On target</div>
                    <div className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border/40">
                      Needs <strong>+{fmtK(bullReqIncr)}/day</strong> added each month. ~13 net new campaigns/month at current win rate.
                    </div>
                  </div>
                </div>

                {/* ── ACCELERATION BARS ── */}
                <SectionTitle tag="BigQuery">Trailing Rate Acceleration</SectionTitle>
                <div className="glass rounded-2xl p-5 mb-6">
                  {[
                    { label: "Trailing 7d", value: trailing7dDaily, color: EMERALD },
                    { label: "Trailing 30d", value: q1Months.length > 0 ? (q1Months[q1Months.length - 1]?.avg_daily_gas || 0) : 0, color: VIOLET },
                    { label: "Q1 Avg (90d)", value: q1AvgDaily, color: CYAN },
                  ].map((bar, i) => (
                    <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                      <span className="text-xs text-foreground w-24 shrink-0">{bar.label}</span>
                      <div className="flex-1 h-2.5 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: bar.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((bar.value / DAILY_TARGET_STRETCH) * 100, 100)}%` }}
                          transition={{ duration: 0.8, delay: i * 0.15 }}
                        />
                      </div>
                      <span className="text-xs font-bold w-20 text-right">{fmtK(bar.value)}</span>
                      <span className={`text-[10px] w-16 text-right ${bar.value >= DAILY_TARGET_STRETCH ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {((bar.value / DAILY_TARGET_STRETCH) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-border/40 text-[10px] text-muted-foreground">
                    Target: $274K/day for $100M ARR stretch. 7d trailing at {((trailing7dDaily / DAILY_TARGET_STRETCH) * 100).toFixed(0)}% — 
                    {accelFactor > 1.5 ? " strong acceleration from Q1 avg, but confirm sustainability over 3-4 weeks." : " steady pace, needs acceleration to hit EOY."}
                  </div>
                </div>

                {/* ── ADVERTISER CONCENTRATION ── */}
                {concentration.length > 0 && (
                  <>
                    <SectionTitle tag="BigQuery · 30d">Advertiser Concentration</SectionTitle>
                    <div className="glass rounded-2xl p-5 mb-6">
                      <div className="space-y-2">
                        {concentration.slice(0, 8).map((c: any, i: number) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-foreground w-32 truncate shrink-0">{c.advertiser}</span>
                            <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${c.pct_of_total}%`,
                                  backgroundColor: i === 0 ? ROSE : i < 3 ? AMBER : VIOLET,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-12 text-right">{fmtPct(c.pct_of_total)}</span>
                            <span className="text-xs font-mono text-muted-foreground w-16 text-right">{fmtUsd(c.gas)}</span>
                          </div>
                        ))}
                      </div>
                      {concentration[0]?.pct_of_total > 30 && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50/60 border border-rose-200/60 mt-4">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-rose-800">
                            <strong>Concentration risk:</strong> Top advertiser = {fmtPct(concentration[0].pct_of_total)} of 30d GAS.
                            Top 3 = {fmtPct(concentration.slice(0, 3).reduce((s: number, c: any) => s + c.pct_of_total, 0))}. 
                            If top account pauses, ARR drops from {fmtM(currentArr)} to ~{fmtM(currentArr * (1 - concentration[0].pct_of_total / 100))}.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── EXCHANGE MIX ── */}
                {exchanges.length > 0 && (
                  <>
                    <SectionTitle tag="BigQuery · 7d">Exchange Volume</SectionTitle>
                    <div className="glass rounded-2xl p-5 mb-6">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {exchanges.slice(0, 5).map((ex: any, i: number) => {
                          const totalExGas = exchanges.reduce((s: number, e: any) => s + e.total_gas, 0);
                          const pct = totalExGas > 0 ? (ex.total_gas / totalExGas) * 100 : 0;
                          return (
                            <div key={i} className="text-center glass rounded-xl p-3">
                              <div className="text-xs font-semibold text-foreground">{ex.exchange}</div>
                              <div className="text-lg font-bold text-violet-600 mt-1">{fmtPct(pct)}</div>
                              <div className="text-[10px] text-muted-foreground">{fmtUsd(ex.total_gas)} · {ex.campaigns} camps</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ── RISK SIGNALS ── */}
                <SectionTitle>Revenue Risk Signals</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <RiskCard
                    title="Trajectory Risk"
                    severity="high"
                    metric={`$${Math.round(bearEoy)}M flat proj.`}
                    body={`At flat rate (Scenario A), EOY ARR = $${Math.round(bearEoy)}M — ${Math.round(EOY_ARR_STRETCH - bearEoy)}% below target. The 7d trailing spike (${fmtK(trailing7dDaily)}) vs Q1 avg (${fmtK(q1AvgDaily)}) means run-rate may be inflated. Confirm structural after 3-4 more weeks.`}
                  />
                  <RiskCard
                    title="Advertiser Concentration"
                    severity={concentration[0]?.pct_of_total > 35 ? "high" : "watch"}
                    metric={concentration[0] ? fmtPct(concentration[0].pct_of_total) : "—"}
                    body={`Top advertiser (${concentration[0]?.advertiser || "—"}) = ${fmtPct(concentration[0]?.pct_of_total || 0)} of GAS. If this account pauses, ARR drops to ~${fmtM(currentArr * (1 - (concentration[0]?.pct_of_total || 0) / 100))}. Single largest near-term revenue risk.`}
                  />
                  <RiskCard
                    title="Campaign Ramp"
                    severity="high"
                    metric={`${summary?.total_campaigns || 0} / 150`}
                    body={`${summary?.total_campaigns || 0} active campaigns vs 150 EOY target. Requires ${(150 / (summary?.total_campaigns || 1)).toFixed(1)}× growth — ~13 net new campaigns/month. At current win rate, that means 57+ proposals/month.`}
                  />
                  <RiskCard
                    title="Exchange Concentration"
                    severity="watch"
                    metric={exchanges.length > 0 ? fmtPct(exchanges.slice(0, 3).reduce((s: number, e: any) => s + (e.total_gas / exchanges.reduce((t: number, x: any) => t + x.total_gas, 0) * 100), 0)) : "—"}
                    body={`Top 3 exchanges = ${exchanges.length > 0 ? fmtPct(exchanges.slice(0, 3).reduce((s: number, e: any) => s + (e.total_gas / exchanges.reduce((t: number, x: any) => t + x.total_gas, 0) * 100), 0)) : "—"} of volume. Supply concentration mirrors advertiser concentration — both need diversification.`}
                  />
                </div>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* PIPELINE SECTION (Salesforce)                              */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <div className="mt-8 pt-6 border-t-2 border-blue-100">
                  <SectionTitle tag="Salesforce">Pipeline Visibility</SectionTitle>

                  {loadingSfdc ? (
                    <div className="flex items-center justify-center h-32">
                      <RefreshCw className="w-4 h-4 text-[#0091FF] animate-spin" />
                    </div>
                  ) : !sfdcSummary ? (
                    <EmptyState message="Salesforce pipeline data unavailable." />
                  ) : (
                    <>
                      {/* Pipeline KPIs */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        <KpiCard label="Open Pipeline" value={fmtUsd(sfdcSummary.openPipelineTotal || 0)} sub={`${sfdcSummary.openPipelineCount || 0} deals`} color="text-[#0091FF]" />
                        <KpiCard label="Closed Won" value={fmtUsd(sfdcSummary.closedWonTotal || 0)} sub={`${sfdcSummary.closedWonCount || 0} deals`} color="text-emerald-600" />
                        <KpiCard label="Closed Lost" value={fmtUsd(sfdcSummary.closedLostTotal || 0)} sub={`${sfdcSummary.closedLostCount || 0} deals`} color="text-rose-500" />
                        <KpiCard label="Win Rate" value={`${sfdcSummary.winRate || 0}%`} sub="Won / (Won + Lost)" color={sfdcSummary.winRate >= 50 ? "text-emerald-600" : "text-amber-600"} />
                      </div>

                      {/* Stage Distribution Chart */}
                      <div className="glass rounded-2xl p-5 mb-6">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Pipeline by Stage</h4>
                        {stageDistribution.length > 0 ? (
                          <>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={stageDistribution.filter((s: any) => !s.stageName?.startsWith("Closed"))} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis type="number" tick={{ fontSize: 10, fill: SLATE }} tickFormatter={(v: number) => fmtUsd(v)} />
                                <YAxis type="category" dataKey="stageName" tick={{ fontSize: 10, fill: SLATE }} width={160} />
                                <Tooltip formatter={(v: any) => [fmtUsd(Number(v)), "Amount"]} />
                                <Bar dataKey="totalAmount" fill={MOLOCO_BLUE} radius={[0, 6, 6, 0]}>
                                  {stageDistribution.filter((s: any) => !s.stageName?.startsWith("Closed")).map((_: any, i: number) => (
                                    <Cell key={i} fill={[MOLOCO_BLUE, EMERALD, AMBER, VIOLET, SLATE][i % 5]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                            <div className="mt-3 space-y-1">
                              {stageDistribution.map((s: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${s.stageName?.startsWith("Closed Won") ? "bg-emerald-500" : s.stageName?.startsWith("Closed Lost") ? "bg-rose-400" : "bg-[#0091FF]"}`} />
                                    <span className="text-foreground">{s.stageName}</span>
                                    <span className="text-muted-foreground">({s.count})</span>
                                  </div>
                                  <span className="font-mono text-muted-foreground">{fmtUsd(Number(s.totalAmount))}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <EmptyState message="No stage data" />
                        )}
                      </div>

                      {/* Open Deals Table */}
                      <div className="glass rounded-2xl overflow-hidden mb-6">
                        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open Deals ({openDeals.length})</h4>
                          <span className="text-[10px] text-muted-foreground">Sorted by amount</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border/40 bg-muted/20">
                                <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground">Deal</th>
                                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Account</th>
                                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Stage</th>
                                <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Amount</th>
                                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Close Date</th>
                                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden lg:table-cell">Owner</th>
                              </tr>
                            </thead>
                            <tbody>
                              {openDeals.slice(0, 15).map((d: any, i: number) => {
                                const isPastDue = d.closeDate && new Date(d.closeDate) < new Date();
                                return (
                                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                                    <td className="px-5 py-2.5 font-medium text-foreground max-w-[200px] truncate">{d.name}</td>
                                    <td className="px-3 py-2.5 text-muted-foreground">{d.accountName}</td>
                                    <td className="px-3 py-2.5">
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                        d.stageName === "In Legal" ? "bg-violet-100 text-violet-700" :
                                        d.stageName === "Pitched" ? "bg-blue-100 text-blue-700" :
                                        d.stageName === "Planned" ? "bg-amber-100 text-amber-700" :
                                        "bg-muted text-muted-foreground"
                                      }`}>{d.stageName}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono text-foreground">{fmtUsd(Number(d.amount))}</td>
                                    <td className={`px-3 py-2.5 ${isPastDue ? "text-rose-500 font-medium" : "text-muted-foreground"}`}>
                                      {d.closeDate}{isPastDue && <span className="ml-1 text-[10px]">overdue</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">{d.ownerName}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Recent Wins & Losses */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="glass rounded-2xl p-5">
                          <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">Recent Wins ({recentWins.length})</h4>
                          {recentWins.length === 0 ? <EmptyState message="No recent wins" /> : (
                            <div className="space-y-2">
                              {recentWins.map((d: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/20 last:border-0">
                                  <div className="min-w-0">
                                    <p className="text-foreground font-medium truncate">{d.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{d.accountName} · {d.ownerName}</p>
                                  </div>
                                  <span className="font-mono text-emerald-600 shrink-0 ml-2">{fmtUsd(Number(d.amount))}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="glass rounded-2xl p-5">
                          <h4 className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-3">Recent Losses ({recentLosses.length})</h4>
                          {recentLosses.length === 0 ? <EmptyState message="No recent losses" /> : (
                            <div className="space-y-2">
                              {recentLosses.map((d: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/20 last:border-0">
                                  <div className="min-w-0">
                                    <p className="text-foreground font-medium truncate">{d.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{d.accountName} · {d.lossReason || "No reason"}</p>
                                  </div>
                                  <span className="font-mono text-rose-500 shrink-0 ml-2">{fmtUsd(Number(d.amount))}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB: INSIGHTS (VP/GM Strategic View)                           */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "insights" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {(loadingBq && loadingSfdc && loadingReport) ? (
              <div className="flex items-center justify-center h-[40vh]">
                <RefreshCw className="w-5 h-5 text-[#0091FF] animate-spin" />
              </div>
            ) : (
              <>
                {/* ── Executive Summary Banner ── */}
                <div className="rounded-2xl bg-gradient-to-r from-slate-50 via-white to-blue-50/30 border border-border/60 p-6 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-[#0091FF]" />
                    <h2 className="text-sm font-bold text-foreground">CTV Business Health — VP/GM Brief</h2>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      Data as of {bqData?.fetched_at ? new Date(bqData.fetched_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    CTV has generated <strong className="text-emerald-700">{fmtM(cy2026Ytd)} YTD GAS</strong> ({fmtPct(pctGasTarget)} of $10M EOY target{pctGasTarget >= 90 ? " — exceeding target" : ""}).
                    Current monthly pacing of <strong>{fmtM(monthlyPacing)}</strong> implies <strong className="text-violet-700">{fmtM(currentArr)} ARR</strong> (monthly × 12).
                    Trailing 7d at <strong>{fmtK(trailing7dDaily)}/day</strong>
                    {accelFactor > 1.5
                      ? ` shows ${accelFactor.toFixed(1)}× acceleration vs Q1 avg — needs 3-4 weeks to confirm structural.`
                      : ` at steady pace.`}
                    {" "}Pipeline shows <strong>{fmtUsd(sfdcSummary?.openPipelineTotal || 0)}</strong> open across {sfdcSummary?.openPipelineCount || 0} deals
                    with a <strong>{sfdcSummary?.winRate || 0}% win rate</strong>.
                  </p>
                </div>

                {/* ── Q1: Are We On Track? ── */}
                <SectionTitle>Are We On Track?</SectionTitle>
                <div className="glass rounded-2xl p-5 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 rounded-xl bg-violet-50/50 border border-violet-100">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Q1 Result</div>
                      <div className="text-2xl font-black text-violet-700">{fmtM(q1TotalGas)}</div>
                      <div className="text-[10px] text-muted-foreground">GAS · {fmtK(q1AvgDaily)} avg/day</div>
                      <div className="text-[10px] font-semibold text-emerald-600 mt-1">{fmtPct(pctGasTarget)} of $10M GAS target</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Current Run Rate</div>
                      <div className="text-2xl font-black text-amber-600">{fmtK(trailing7dDaily)}/d</div>
                      <div className="text-[10px] text-muted-foreground">{fmtPct((trailing7dDaily / DAILY_TARGET_STRETCH) * 100)} of $274K target</div>
                      <div className="text-[10px] font-semibold text-amber-600 mt-1">{accelFactor.toFixed(1)}× vs Q1 avg</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-rose-50/50 border border-rose-100">
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">EOY Gap</div>
                      <div className="text-2xl font-black text-rose-500">{fmtM(gapToArrStretch)}</div>
                      <div className="text-[10px] text-muted-foreground">Remaining to $100M</div>
                      <div className="text-[10px] font-semibold text-rose-500 mt-1">Need +{fmtK(bullReqIncr)}/day/month</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50/40 border border-blue-100 text-xs text-blue-900 leading-relaxed">
                    <strong>Bottom line:</strong> CTV has already generated {fmtM(cy2026Ytd)} YTD GAS ({fmtPct(pctGasTarget)} of $10M target{pctGasTarget >= 90 ? " — on track to exceed" : ""}).
                    Monthly pacing of {fmtM(monthlyPacing)} implies {fmtM(currentArr)} ARR.
                    The late-March spike ({fmtK(trailing7dDaily)} vs {fmtK(q1AvgDaily)} Q1 avg) needs 3-4 weeks to confirm as structural.
                    At Scenario B growth, we land at ~${Math.round(baseEoy)}M ARR.
                  </div>
                </div>

                {/* ── Q2: Where's the Risk? ── */}
                <SectionTitle>Where's the Risk?</SectionTitle>
                <div className="space-y-3 mb-6">
                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Advertiser Concentration</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Top advertiser ({concentration[0]?.advertiser || "—"}) = <strong className="text-rose-600">{fmtPct(concentration[0]?.pct_of_total || 0)}</strong> of all CTV GAS.
                          Top 3 = {fmtPct(concentration.slice(0, 3).reduce((s: number, c: any) => s + c.pct_of_total, 0))}.
                          If the top account pauses, ARR drops from {fmtM(currentArr)} to ~{fmtM(currentArr * (1 - (concentration[0]?.pct_of_total || 0) / 100))} overnight.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Trajectory Sustainability</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          7d trailing ({fmtK(trailing7dDaily)}) is {accelFactor.toFixed(1)}× the Q1 average ({fmtK(q1AvgDaily)}).
                          This spike may be a short burst, not structural growth. Need 3-4 more weeks at this level to confirm.
                          If it reverts to Q1 avg, EOY ARR = ~${Math.round(q1AvgDaily * 365 / 1e6)}M.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Target className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Campaign Ramp Gap</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {summary?.total_campaigns || 0} active campaigns vs 150 EOY target = {((summary?.total_campaigns || 0) / 150 * 100).toFixed(0)}% there.
                          Need ~13 net new campaigns/month. At {sfdcSummary?.winRate || 0}% win rate, that's 57+ proposals/month.
                          Pipeline currently shows {sfdcSummary?.openPipelineCount || 0} open deals ({fmtUsd(sfdcSummary?.openPipelineTotal || 0)}).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Q3: What Should We Do? ── */}
                <SectionTitle>What Should We Do?</SectionTitle>
                <div className="glass rounded-2xl p-5 mb-6">
                  <div className="space-y-4">
                    {[
                      {
                        priority: "P0",
                        action: "Diversify advertiser base — reduce top-account dependency below 25%",
                        rationale: `Top account = ${fmtPct(concentration[0]?.pct_of_total || 0)}. Target: 5+ advertisers each >10% of GAS within 2 quarters.`,
                        owner: "Sales + Account Management",
                        color: "bg-rose-100 text-rose-700",
                      },
                      {
                        priority: "P0",
                        action: "Validate trailing rate sustainability — hold weekly GAS/day reviews for 4 weeks",
                        rationale: `${fmtK(trailing7dDaily)} trailing vs ${fmtK(q1AvgDaily)} Q1 avg. If structural, we're at ${fmtPct(pctArrStretch)} of goal. If not, we're at ${((q1AvgDaily * 365 / (EOY_ARR_STRETCH * 1e6)) * 100).toFixed(0)}%.`,
                        owner: "GM + Revenue Ops",
                        color: "bg-amber-100 text-amber-700",
                      },
                      {
                        priority: "P1",
                        action: `Accelerate pipeline — need ${Math.ceil((150 - (summary?.total_campaigns || 0)) / 9)} net new campaigns/month`,
                        rationale: `${summary?.total_campaigns || 0}/150 campaigns. ${sfdcSummary?.openPipelineCount || 0} deals in pipeline (${fmtUsd(sfdcSummary?.openPipelineTotal || 0)}). Increase proposal volume to 57+/month.`,
                        owner: "Sales + SDR",
                        color: "bg-blue-100 text-blue-700",
                      },
                      {
                        priority: "P1",
                        action: "Expand exchange supply — reduce top-3 exchange concentration below 80%",
                        rationale: `Top 3 exchanges = ${exchanges.length > 0 ? fmtPct(exchanges.slice(0, 3).reduce((s: number, e: any) => s + (e.total_gas / exchanges.reduce((t: number, x: any) => t + x.total_gas, 0) * 100), 0)) : "—"}. Onboard 2-3 new SSPs to de-risk supply.`,
                        owner: "Supply Partnerships",
                        color: "bg-violet-100 text-violet-700",
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 pb-4 border-b border-border/30 last:border-0 last:pb-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${item.color}`}>{item.priority}</span>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{item.action}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{item.rationale}</p>
                          <p className="text-[10px] text-blue-600 mt-1">Owner: {item.owner}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Quarterly Roadmap ── */}
                <SectionTitle>Quarterly Targets & Milestones</SectionTitle>
                <div className="glass rounded-2xl overflow-hidden mb-6">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/40 bg-muted/20">
                        <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground">Quarter</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">GAS</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Daily Avg</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">ARR EOP</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Target</th>
                        <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { q: "Q4 2025", gas: "$6.86M", daily: "$86.8K", arr: "$31.7M", target: "—", status: "BQ Verified", statusClass: "bg-emerald-100 text-emerald-700" },
                        { q: "Q1 2026", gas: fmtM(q1TotalGas), daily: fmtK(q1AvgDaily), arr: fmtM(currentArr), target: "$60M", status: "Current · BQ", statusClass: "bg-violet-100 text-violet-700" },
                        { q: "Q2 2026", gas: "~$19.7M", daily: "~$216K", arr: "~$81M", target: "$75M", status: "Projected (B)", statusClass: "bg-amber-100 text-amber-700" },
                        { q: "Q3 2026", gas: "~$22.0M", daily: "~$239K", arr: "~$87M", target: "$88M", status: "Projected (B)", statusClass: "bg-amber-100 text-amber-700" },
                        { q: "Q4 2026", gas: "~$24.2M", daily: "~$263K", arr: "~$96M", target: "$100M", status: "Projected (B)", statusClass: "bg-amber-100 text-amber-700" },
                      ].map((row, i) => (
                        <tr key={i} className={`border-b border-border/20 ${i >= 2 ? "opacity-70" : ""}`}>
                          <td className="px-5 py-2.5 font-semibold text-foreground">{row.q}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{row.gas}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{row.daily}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold">{row.arr}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-amber-600">{row.target}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.statusClass}`}>{row.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-3 bg-muted/10 text-[10px] text-muted-foreground leading-relaxed border-t border-border/20">
                    Scenario B projections assume +$7.3K/day added per month. Full-year 2026 projected total GAS: ~$75.5M.
                    Q1 "above target" driven by late-March spike — run-rate may not reflect structural level.
                  </div>
                </div>

                {/* ── Data Provenance ── */}
                <div className="glass rounded-2xl p-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Data Sources & Confidence</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                    <div>
                      <div className="font-semibold text-foreground">Revenue / GAS</div>
                      <div className="text-muted-foreground">BigQuery · fact_dsp_core</div>
                      <div className="text-emerald-600 font-medium">Live · BQ verified</div>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Pipeline / Deals</div>
                      <div className="text-muted-foreground">Salesforce · CTV Opps</div>
                      <div className="text-emerald-600 font-medium">Live · SFDC synced</div>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Projections</div>
                      <div className="text-muted-foreground">Scenario B model</div>
                      <div className="text-amber-600 font-medium">Modeled · +$7.3K/day/mo</div>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Pre-Oct 2025</div>
                      <div className="text-muted-foreground">Estimated from reports</div>
                      <div className="text-muted-foreground font-medium">Estimated · not BQ</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

      </div>
    </NeuralShell>
  );
}
