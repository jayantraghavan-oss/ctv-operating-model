/**
 * DataExplorer — Browse live data from Gong, Salesforce, Sensor Tower, Speedboat.
 * Includes Health Check panel with deep verification, latency, and sample data.
 * Apple-style glassy UI, mobile-friendly.
 */
import NeuralShell from "@/components/NeuralShell";
import { trpcQuery, trpcMutation } from "@/lib/trpcFetch";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Database,
  Phone,
  BarChart3,
  Rocket,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";

type Tab = "health" | "gong" | "salesforce" | "sensorTower" | "speedboat";

const TABS: { id: Tab; label: string; shortLabel: string; icon: typeof Activity; color: string }[] = [
  { id: "health", label: "Health Check", shortLabel: "Health", icon: Activity, color: "text-emerald-600" },
  { id: "gong", label: "Gong", shortLabel: "Gong", icon: Phone, color: "text-purple-600" },
  { id: "salesforce", label: "Salesforce", shortLabel: "SF", icon: Database, color: "text-blue-600" },
  { id: "sensorTower", label: "Sensor Tower", shortLabel: "ST", icon: BarChart3, color: "text-orange-600" },
  { id: "speedboat", label: "Speedboat", shortLabel: "SB", icon: Rocket, color: "text-teal-600" },
];

/* ── Shared UI ── */

function StatusDot({ status }: { status: string }) {
  const color =
    status === "connected" ? "bg-emerald-500" :
    status === "error" ? "bg-red-500" : "bg-amber-500";
  return <div className={`w-2.5 h-2.5 rounded-full ${color}`} />;
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/70 backdrop-blur-xl border border-black/[0.06] rounded-2xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: typeof Activity; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-foreground/70">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{sub}</p>
    </div>
  );
}

function JsonPreview({ data, label }: { data: any; label: string }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>{label}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 p-3 bg-muted/30 rounded-xl text-[11px] font-mono text-foreground/70 overflow-x-auto max-h-64 overflow-y-auto"
          >
            {JSON.stringify(data, null, 2)}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Generic data-fetching hook ── */

function useLiveQuery<T>(path: string, input?: Record<string, any>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const result = await trpcQuery<T>(path, input || undefined);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [path, JSON.stringify(input)]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, fetching, refetch: load };
}

/* ============================================================================
   HEALTH CHECK PANEL
   ============================================================================ */

interface DeepHealthResult {
  source: string;
  status: "connected" | "unavailable" | "error";
  latencyMs: number;
  message: string;
  sampleData: any | null;
  checkedAt: number;
}

interface DeepHealthReport {
  results: DeepHealthResult[];
  overallStatus: "all_connected" | "partial" | "all_unavailable";
  checkedAt: number;
}

function HealthCheckPanel() {
  const { data: report, loading, fetching, refetch } = useLiveQuery<DeepHealthReport>("liveData.deepHealth");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Deep Verification</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Calls each API endpoint, measures latency, returns sample data
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={fetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
          {fetching ? "Checking..." : "Re-check All"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : report ? (
        <>
          {/* Overall status banner */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              {report.overallStatus === "all_connected" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : report.overallStatus === "partial" ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {report.overallStatus === "all_connected"
                    ? "All sources connected"
                    : report.overallStatus === "partial"
                    ? "Some sources unavailable"
                    : "All sources unavailable"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {report.results.filter((r: DeepHealthResult) => r.status === "connected").length}/{report.results.length} connected
                  {" · "}Checked {new Date(report.checkedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Per-source cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.results.map((r: DeepHealthResult) => {
              const tab = TABS.find(t => t.id === r.source);
              const Icon = tab?.icon || Activity;
              return (
                <GlassCard key={r.source} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center">
                        <Icon className={`w-4 h-4 ${tab?.color || "text-foreground"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{r.source === "sensorTower" ? "Sensor Tower" : r.source}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <StatusDot status={r.status} />
                          <span className="text-[11px] text-muted-foreground capitalize">{r.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{r.latencyMs}ms</span>
                    </div>
                  </div>
                  {r.status !== "connected" && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-2">{r.message}</p>
                  )}
                  <JsonPreview data={r.sampleData} label="Sample data preview" />
                </GlassCard>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState icon={Activity} title="No health data" sub="Click Re-check All to run deep verification" />
      )}
    </div>
  );
}

/* ============================================================================
   GONG TAB
   ============================================================================ */

function GongTab() {
  const [account, setAccount] = useState("");
  const [days, setDays] = useState(30);
  const { data, loading, fetching, refetch } = useLiveQuery<any>(
    "liveData.gong",
    { accountName: account || undefined, days }
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by account name..."
            value={account}
            onChange={e => setAccount(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/60 border border-black/[0.06] rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="px-3 py-2 text-sm bg-white/60 border border-black/[0.06] rounded-xl focus:outline-none"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <button
          onClick={() => refetch()}
          disabled={fetching}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <GlassCard className="p-3 text-center">
              <p className="text-lg font-semibold">{data.callVolume?.total || 0}</p>
              <p className="text-[11px] text-muted-foreground">Calls ({data.callVolume?.period})</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <p className="text-lg font-semibold">{data.recentCalls?.length || 0}</p>
              <p className="text-[11px] text-muted-foreground">Recent Calls</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <p className="text-lg font-semibold">{data.topThemes?.length || 0}</p>
              <p className="text-[11px] text-muted-foreground">Themes</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <p className="text-lg font-semibold">{data.objectionPatterns?.length || 0}</p>
              <p className="text-[11px] text-muted-foreground">Objections</p>
            </GlassCard>
          </div>

          {(data.topThemes?.length > 0 || data.objectionPatterns?.length > 0) && (
            <GlassCard className="p-4">
              {data.topThemes?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Themes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.topThemes.map((t: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.objectionPatterns?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Objection Patterns</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.objectionPatterns.map((o: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 text-xs bg-amber-50 text-amber-700 rounded-lg">{o}</span>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          {data.recentCalls?.length > 0 && (
            <GlassCard className="overflow-hidden">
              <div className="px-4 py-3 border-b border-black/[0.04]">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Calls</p>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {data.recentCalls.map((c: any, i: number) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.account} · {c.date}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{c.duration}min</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {data.rawSummary && (
            <GlassCard className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{data.rawSummary}</p>
            </GlassCard>
          )}

          <JsonPreview data={data} label="View raw JSON response" />
        </div>
      ) : (
        <EmptyState icon={Phone} title="No Gong data available" sub="Check that Gong API credentials are configured and the connector is healthy." />
      )}
    </div>
  );
}

/* ============================================================================
   SALESFORCE TAB
   ============================================================================ */

function SalesforceTab() {
  const [account, setAccount] = useState("");
  const { data, loading, fetching, refetch } = useLiveQuery<any>(
    "liveData.salesforce",
    { accountName: account || undefined }
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by account name..."
            value={account}
            onChange={e => setAccount(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/60 border border-black/[0.06] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <button
          onClick={() => refetch()}
          disabled={fetching}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : data ? (
        <div className="space-y-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pipeline</p>
              <p className="text-lg font-semibold">${((data.pipelineTotal || 0) / 1_000_000).toFixed(1)}M</p>
            </div>
            {data.pipeline?.length > 0 && (
              <div className="space-y-2">
                {data.pipeline.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">{p.stage}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{p.count} deals</span>
                      <span className="font-medium">${(p.value / 1_000_000).toFixed(1)}M</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {data.topAccounts?.length > 0 && (
            <GlassCard className="overflow-hidden">
              <div className="px-4 py-3 border-b border-black/[0.04]">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Accounts</p>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {data.topAccounts.map((a: any, i: number) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{a.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700">{a.stage}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">Next: {a.nextStep}</p>
                      <p className="text-xs font-medium">${a.spend?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.recentWins?.length > 0 && (
              <GlassCard className="p-4">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Recent Wins</p>
                <div className="space-y-2">
                  {data.recentWins.map((w: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{w.name}</span>
                      <span className="font-medium text-emerald-700">${w.value?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
            {data.recentLosses?.length > 0 && (
              <GlassCard className="p-4">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Recent Losses</p>
                <div className="space-y-2">
                  {data.recentLosses.map((l: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{l.name}</span>
                      <span className="text-xs text-muted-foreground">{l.lossReason}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>

          <JsonPreview data={data} label="View raw JSON response" />
        </div>
      ) : (
        <EmptyState icon={Database} title="No Salesforce data available" sub="Check that Salesforce credentials are configured and the connector is healthy." />
      )}
    </div>
  );
}

/* ============================================================================
   SENSOR TOWER TAB
   ============================================================================ */

function SensorTowerTab() {
  const [category, setCategory] = useState("");
  const { data, loading, fetching, refetch } = useLiveQuery<any>(
    "liveData.sensorTower",
    { category: category || undefined }
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by category..."
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/60 border border-black/[0.06] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <button
          onClick={() => refetch()}
          disabled={fetching}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : data ? (
        <div className="space-y-4">
          {data.competitorApps?.length > 0 && (
            <GlassCard className="overflow-hidden">
              <div className="px-4 py-3 border-b border-black/[0.04]">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Competitor Apps</p>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {data.competitorApps.map((a: any, i: number) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.downloads?.toLocaleString()} downloads · ${a.revenue?.toLocaleString()} rev</p>
                    </div>
                    <span className="text-xs font-medium">{a.rating}★</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {data.marketTrends?.length > 0 && (
            <GlassCard className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Market Trends</p>
              <div className="space-y-3">
                {data.marketTrends.map((t: any, i: number) => (
                  <div key={i}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{t.category}</p>
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700">{t.growth}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Top: {t.topApps?.slice(0, 3).join(", ")}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {data.sdkIntel?.length > 0 && (
            <GlassCard className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">SDK Intelligence</p>
              <div className="space-y-2">
                {data.sdkIntel.map((s: any, i: number) => (
                  <div key={i} className="flex items-start justify-between">
                    <p className="text-sm font-medium">{s.appName}</p>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                      {s.sdks?.slice(0, 5).map((sdk: string, j: number) => (
                        <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">{sdk}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          <JsonPreview data={data} label="View raw JSON response" />
        </div>
      ) : (
        <EmptyState icon={BarChart3} title="No Sensor Tower data available" sub="Check that Sensor Tower API key is configured and the connector is healthy." />
      )}
    </div>
  );
}

/* ============================================================================
   SPEEDBOAT TAB
   ============================================================================ */

function SpeedboatTab() {
  const [advertiser, setAdvertiser] = useState("");
  const { data, loading, fetching, refetch } = useLiveQuery<any>(
    "liveData.speedboat",
    { advertiserName: advertiser || undefined }
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by advertiser..."
            value={advertiser}
            onChange={e => setAdvertiser(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/60 border border-black/[0.06] rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <button
          onClick={() => refetch()}
          disabled={fetching}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : data ? (
        <div className="space-y-4">
          {data.advertiserPerformance?.length > 0 && (
            <GlassCard className="overflow-hidden">
              <div className="px-4 py-3 border-b border-black/[0.04]">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Advertiser Performance</p>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {data.advertiserPerformance.map((a: any, i: number) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{a.name}</p>
                      <span className="text-xs font-medium">{a.roas?.toFixed(2)}x ROAS</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>${a.spend?.toLocaleString()} spend</span>
                      <span>{a.installs?.toLocaleString()} installs</span>
                      <span>${a.cpi?.toFixed(2)} CPI</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {data.campaignBreakdown?.length > 0 && (
            <GlassCard className="overflow-hidden">
              <div className="px-4 py-3 border-b border-black/[0.04]">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaigns</p>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {data.campaignBreakdown.map((c: any, i: number) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">Budget: ${c.budget?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-muted/50 text-muted-foreground"}`}>
                        {c.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">${c.spend?.toLocaleString()} spent</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {data.geoSplits?.length > 0 && (
            <GlassCard className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Geo Breakdown</p>
              <div className="space-y-2">
                {data.geoSplits.map((g: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{g.country}</span>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>${g.spend?.toLocaleString()}</span>
                      <span>{g.installs?.toLocaleString()} installs</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          <JsonPreview data={data} label="View raw JSON response" />
        </div>
      ) : (
        <EmptyState icon={Rocket} title="No Speedboat data available" sub="Check that Speedboat MCP is configured and the connector is healthy." />
      )}
    </div>
  );
}

/* ============================================================================
   MAIN PAGE
   ============================================================================ */

export default function DataExplorer() {
  const [activeTab, setActiveTab] = useState<Tab>("health");

  return (
    <NeuralShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Data Explorer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse live data from connected sources. Verify credentials, explore raw data, see what agents see.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-muted/30 rounded-2xl mb-6 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-xl whitespace-nowrap transition-all ${
                  active
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? tab.color : ""}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "health" && <HealthCheckPanel />}
            {activeTab === "gong" && <GongTab />}
            {activeTab === "salesforce" && <SalesforceTab />}
            {activeTab === "sensorTower" && <SensorTowerTab />}
            {activeTab === "speedboat" && <SpeedboatTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </NeuralShell>
  );
}
