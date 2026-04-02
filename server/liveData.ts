/**
 * Live Data Connectors — Gong, Salesforce, Sensor Tower, Speedboat MCP
 * 
 * Each connector calls the pre-installed Python skills via subprocess.
 * Returns structured context blocks that get injected into agent system prompts.
 * Graceful fallback: if a source is unavailable, returns null (caller uses synthetic context).
 * 
 * Architecture:
 *   Agent prompt builder → calls enrichContext(moduleId, subModule) 
 *     → fans out to relevant connectors based on module mapping
 *     → returns structured context blocks
 */

import { execFile, exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// Cache TTL: 5 minutes for most sources, 15 minutes for Sensor Tower
const CACHE_TTL_MS = 5 * 60 * 1000;
const ST_CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any, ttl: number = CACHE_TTL_MS) {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

// ============================================================================
// CONNECTOR STATUS
// ============================================================================

export interface ConnectorStatus {
  gong: "connected" | "unavailable" | "error";
  salesforce: "connected" | "unavailable" | "error";
  sensorTower: "connected" | "unavailable" | "error";
  speedboat: "connected" | "unavailable" | "error";
  lastChecked: number;
}

let lastStatus: ConnectorStatus | null = null;
let lastStatusCheckedAt = 0;
const STATUS_CACHE_TTL = 60_000; // 1 minute cache for health checks
let statusCheckInFlight: Promise<ConnectorStatus> | null = null;

/**
 * Check health of all connectors. Returns status per source.
 * Cached for 1 minute to prevent repeated slow subprocess calls.
 * De-duplicates concurrent requests.
 */
export async function checkConnectorStatus(): Promise<ConnectorStatus> {
  // Return cached if fresh enough
  if (lastStatus && (Date.now() - lastStatusCheckedAt) < STATUS_CACHE_TTL) {
    return lastStatus;
  }

  // De-duplicate concurrent calls
  if (statusCheckInFlight) return statusCheckInFlight;

  statusCheckInFlight = (async () => {
    try {
      const [gong, sf, st, sb] = await Promise.allSettled([
        runPythonScript("gong_health_check"),
        runPythonScript("sf_health_check"),
        runPythonScript("st_health_check"),
        runSpeedboatHealthCheck(),
      ]);

      lastStatus = {
        gong: gong.status === "fulfilled" && gong.value?.ok ? "connected" : "unavailable",
        salesforce: sf.status === "fulfilled" && sf.value?.ok ? "connected" : "unavailable",
        sensorTower: st.status === "fulfilled" && st.value?.ok ? "connected" : "unavailable",
        speedboat: sb.status === "fulfilled" && sb.value?.ok ? "connected" : "unavailable",
        lastChecked: Date.now(),
      };
      lastStatusCheckedAt = Date.now();

      return lastStatus;
    } finally {
      statusCheckInFlight = null;
    }
  })();

  return statusCheckInFlight;
}

export function getLastStatus(): ConnectorStatus | null {
  return lastStatus;
}

// ============================================================================
// DEEP HEALTH CHECK — actually calls each API and returns latency + sample data
// ============================================================================

export interface DeepHealthResult {
  source: string;
  status: "connected" | "unavailable" | "error";
  latencyMs: number;
  message: string;
  sampleData: any | null;
  checkedAt: number;
}

export interface DeepHealthReport {
  results: DeepHealthResult[];
  overallStatus: "all_connected" | "partial" | "all_unavailable";
  checkedAt: number;
}

async function deepCheckSource(source: string): Promise<DeepHealthResult> {
  const start = Date.now();
  try {
    let data: any = null;
    switch (source) {
      case "gong":
        data = await getGongContext(undefined, 7);
        break;
      case "salesforce":
        data = await getSalesforceContext();
        break;
      case "sensorTower":
        data = await getSensorTowerContext();
        break;
      case "speedboat":
        data = await getSpeedboatContext();
        break;
    }
    const latency = Date.now() - start;
    if (data) {
      // Return a trimmed sample (first few items from each array)
      const sample: any = { source: data.source };
      for (const [k, v] of Object.entries(data)) {
        if (Array.isArray(v)) sample[k] = v.slice(0, 2);
        else if (k === "rawSummary") sample[k] = (v as string)?.slice(0, 200);
        else sample[k] = v;
      }
      return { source, status: "connected", latencyMs: latency, message: "OK", sampleData: sample, checkedAt: Date.now() };
    }
    return { source, status: "unavailable", latencyMs: latency, message: "No data returned — check credentials or API access", sampleData: null, checkedAt: Date.now() };
  } catch (err: any) {
    return { source, status: "error", latencyMs: Date.now() - start, message: err.message?.slice(0, 200) || "Unknown error", sampleData: null, checkedAt: Date.now() };
  }
}

export async function deepHealthCheck(): Promise<DeepHealthReport> {
  const sources = ["gong", "salesforce", "sensorTower", "speedboat"];
  const results = await Promise.all(sources.map(s => deepCheckSource(s)));
  const connected = results.filter(r => r.status === "connected").length;
  return {
    results,
    overallStatus: connected === sources.length ? "all_connected" : connected > 0 ? "partial" : "all_unavailable",
    checkedAt: Date.now(),
  };
}

// ============================================================================
// PYTHON SCRIPT RUNNER
// ============================================================================

const SCRIPTS_DIR = "/home/ubuntu/ctv-operating-model/server/scripts";

/**
 * Read env vars from ~/.bashrc that are behind the non-interactive guard.
 * Caches the result so we only parse once.
 */
let _bashrcEnv: Record<string, string> | null = null;
function getBashrcEnv(): Record<string, string> {
  if (_bashrcEnv) return _bashrcEnv;
  _bashrcEnv = {};
  try {
    const bashrc = fs.readFileSync("/home/ubuntu/.bashrc", "utf-8");
    const exportRegex = /^export\s+(\w+)=["']?([^"'\n]*)["']?/gm;
    let match;
    while ((match = exportRegex.exec(bashrc)) !== null) {
      _bashrcEnv[match[1]] = match[2];
    }
  } catch {
    // ignore
  }
  return _bashrcEnv;
}

async function runPythonScript(scriptName: string, args: string[] = [], timeoutMs: number = 30000): Promise<any> {
  const scriptPath = path.join(SCRIPTS_DIR, `${scriptName}.py`);
  
  try {
    // Inject env vars from bashrc directly (bashrc has non-interactive guard that blocks `source`)
    const bashrcVars = getBashrcEnv();
    // Build clean env: remove PYTHONHOME (conflicts with /usr/bin/python3 when UV sets it to cpython-3.13)
    const cleanEnv = { ...process.env };
    delete cleanEnv.PYTHONHOME;
    delete cleanEnv.PYTHONPATH;
    
    const { stdout, stderr } = await execFileAsync("/usr/bin/python3", [scriptPath, ...args], {
      timeout: timeoutMs,
      env: {
        ...cleanEnv,
        ...bashrcVars,
        PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:" + (process.env.PATH || ""),
        HOME: "/home/ubuntu",
        PYTHONPATH: "/home/ubuntu/skills/gong-api/scripts:/home/ubuntu/skills/salesforce-connector/scripts:/home/ubuntu/skills/sensor-tower-api/scripts",
      },
      maxBuffer: 5 * 1024 * 1024, // 5MB
    });
    
    if (stderr && !stderr.includes("UserWarning")) {
      console.warn(`[LiveData] ${scriptName} stderr:`, stderr.slice(0, 200));
    }
    
    return JSON.parse(stdout.trim());
  } catch (err: any) {
    const stderr = err.stderr ? err.stderr.slice(0, 500) : "";
    const stdout = err.stdout ? err.stdout.slice(0, 500) : "";
    console.error(`[LiveData] ${scriptName} failed:`, err.message?.slice(0, 200));
    if (stderr) console.error(`[LiveData] ${scriptName} stderr:`, stderr);
    if (stdout) console.error(`[LiveData] ${scriptName} stdout:`, stdout);
    // If the script printed valid JSON to stdout before failing, try to parse it
    if (stdout) {
      try {
        return JSON.parse(stdout.trim());
      } catch {
        // not valid JSON
      }
    }
    return null;
  }
}

async function runSpeedboatHealthCheck(): Promise<{ ok: boolean }> {
  try {
    const { stdout } = await execFileAsync("manus-mcp-cli", ["--help"], { timeout: 5000 });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ============================================================================
// GONG CONNECTOR
// ============================================================================

export interface GongContext {
  source: "gong";
  recentCalls: { title: string; date: string; account: string; duration: number }[];
  topThemes: string[];
  objectionPatterns: string[];
  callVolume: { total: number; period: string };
  rawSummary: string;
}

/**
 * Pull recent Gong call data relevant to CTV sales.
 * Returns structured context for agent prompts.
 */
export async function getGongContext(accountName?: string, days: number = 30): Promise<GongContext | null> {
  const cacheKey = `gong:${accountName || "all"}:${days}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const result = await runPythonScript("gong_connector", [
    "--days", String(days),
    ...(accountName ? ["--account", accountName] : []),
  ]);

  if (!result) return null;
  
  const context: GongContext = {
    source: "gong",
    recentCalls: result.calls || [],
    topThemes: result.themes || [],
    objectionPatterns: result.objections || [],
    callVolume: result.volume || { total: 0, period: `${days}d` },
    rawSummary: result.summary || "",
  };

  setCache(cacheKey, context);
  return context;
}

// ============================================================================
// SALESFORCE CONNECTOR
// ============================================================================

export interface SalesforceContext {
  source: "salesforce";
  pipeline: { stage: string; count: number; value: number }[];
  topAccounts: { name: string; spend: number; stage: string; nextStep: string }[];
  recentWins: { name: string; value: number; closeDate: string }[];
  recentLosses: { name: string; value: number; lossReason: string }[];
  pipelineTotal: number;
  rawSummary: string;
}

/**
 * Pull Salesforce pipeline and account data.
 */
export async function getSalesforceContext(accountName?: string): Promise<SalesforceContext | null> {
  const cacheKey = `sf:${accountName || "all"}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const result = await runPythonScript("sf_connector_bridge", [
    ...(accountName ? ["--account", accountName] : []),
  ]);

  if (!result) return null;

  const context: SalesforceContext = {
    source: "salesforce",
    pipeline: result.pipeline || [],
    topAccounts: result.top_accounts || [],
    recentWins: result.recent_wins || [],
    recentLosses: result.recent_losses || [],
    pipelineTotal: result.pipeline_total || 0,
    rawSummary: result.summary || "",
  };

  setCache(cacheKey, context);
  return context;
}

// ============================================================================
// SENSOR TOWER CONNECTOR
// ============================================================================

export interface SensorTowerContext {
  source: "sensor_tower";
  competitorApps: { name: string; downloads: number; revenue: number; rating: number }[];
  marketTrends: { category: string; growth: string; topApps: string[] }[];
  sdkIntel: { appName: string; sdks: string[] }[];
  rawSummary: string;
}

/**
 * Pull Sensor Tower app intelligence and market data.
 */
export async function getSensorTowerContext(appIds?: string[], category?: string): Promise<SensorTowerContext | null> {
  const cacheKey = `st:${appIds?.join(",") || "market"}:${category || "all"}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const result = await runPythonScript("st_connector", [
    ...(appIds ? ["--apps", appIds.join(",")] : []),
    ...(category ? ["--category", category] : []),
  ], 45000); // Sensor Tower can be slow

  if (!result) return null;

  const context: SensorTowerContext = {
    source: "sensor_tower",
    competitorApps: result.competitor_apps || [],
    marketTrends: result.market_trends || [],
    sdkIntel: result.sdk_intel || [],
    rawSummary: result.summary || "",
  };

  setCache(cacheKey, context, ST_CACHE_TTL_MS);
  return context;
}

// ============================================================================
// SPEEDBOAT MCP CONNECTOR
// ============================================================================

export interface SpeedboatContext {
  source: "speedboat";
  advertiserPerformance: { name: string; spend: number; installs: number; cpi: number; roas: number }[];
  campaignBreakdown: { name: string; status: string; budget: number; spend: number }[];
  geoSplits: { country: string; spend: number; installs: number }[];
  trends: { date: string; spend: number; installs: number; cpi: number }[];
  rawSummary: string;
}

/**
 * Pull Speedboat performance data via MCP.
 */
export async function getSpeedboatContext(advertiserName?: string): Promise<SpeedboatContext | null> {
  const cacheKey = `speedboat:${advertiserName || "all"}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const result = await runPythonScript("speedboat_connector", [
    ...(advertiserName ? ["--advertiser", advertiserName] : []),
  ]);

  if (!result) return null;

  const context: SpeedboatContext = {
    source: "speedboat",
    advertiserPerformance: result.performance || [],
    campaignBreakdown: result.campaigns || [],
    geoSplits: result.geo || [],
    trends: result.trends || [],
    rawSummary: result.summary || "",
  };

  setCache(cacheKey, context);
  return context;
}

// ============================================================================
// SLACK LIVE METRICS CONNECTOR
// ============================================================================

export interface SlackSpendAlert {
  advertiser: string;
  appName: string;
  adFormat: string;
  spendBefore: string;
  spendAfter: string;
  pctChange: number;
  delta: string;
  sov?: { before: number; after: number; changePct: number };
}

export interface SlackCampaignUpdate {
  text: string;
  amounts: string[];
  context: string;
}

export interface SlackLiveMetrics {
  source: "slack_live";
  gasArr: { weeklyGas: number; arr: number; source: string; date: string };
  spendAlerts: SlackSpendAlert[];
  campaignUpdates: SlackCampaignUpdate[];
  drrSignals: { channel: string; drr: number }[];
  channelSignals: { channel: string; channelId: string; updatesFound: number; hasSpendData: boolean }[];
  bqQueryPattern: {
    tables: string[];
    ctvFilter: string;
    topPlatforms: string[];
  };
  fetchedAt: string;
  errors: string[];
}

/**
 * Pull live CTV metrics from Slack channels via MCP.
 * Calls the slack_ctv_live.py script which reads from:
 *   - #sdk-biz-alerts (Dan McDonald's automated spend alerts)
 *   - #ctv-all (GAS/ARR headline data)
 *   - #ctv-commercial, #ctv-sales-amer, #ctv-sales-apac
 *   - #ctv-vip-winnerstudio, #ctv-chn-activation
 */
export async function getSlackLiveMetrics(): Promise<SlackLiveMetrics | null> {
  const cacheKey = "slack_live:all";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const result = await runPythonScript("slack_ctv_live", [], 120000); // 2 min timeout for multiple MCP calls

  if (!result) return null;

  const context: SlackLiveMetrics = {
    source: "slack_live",
    gasArr: {
      weeklyGas: result.gas_arr?.weekly_gas || 0,
      arr: result.gas_arr?.arr || 0,
      source: result.gas_arr?.source || "",
      date: result.gas_arr?.date || "",
    },
    spendAlerts: (result.spend_alerts || []).map((a: any) => ({
      advertiser: a.advertiser || "",
      appName: a.app_name || "",
      adFormat: a.ad_format || "",
      spendBefore: a.spend_before || "",
      spendAfter: a.spend_after || "",
      pctChange: a.pct_change || 0,
      delta: a.delta || "",
      sov: a.sov ? { before: a.sov.before, after: a.sov.after, changePct: a.sov.change_pct } : undefined,
    })),
    campaignUpdates: (result.campaign_updates || []).map((u: any) => ({
      text: u.text || "",
      amounts: u.amounts || [],
      context: u.context || "",
    })),
    drrSignals: (result.drr_signals || []).map((d: any) => ({
      channel: d.channel || "",
      drr: d.drr || 0,
    })),
    channelSignals: (result.channel_signals || []).map((s: any) => ({
      channel: s.channel || "",
      channelId: s.channel_id || "",
      updatesFound: s.updates_found || 0,
      hasSpendData: s.has_spend_data || false,
    })),
    bqQueryPattern: {
      tables: result.bq_query_pattern?.tables || [],
      ctvFilter: result.bq_query_pattern?.ctv_filter || "",
      topPlatforms: result.bq_query_pattern?.top_platforms || [],
    },
    fetchedAt: result.metadata?.fetched_at || new Date().toISOString(),
    errors: result.metadata?.errors || [],
  };

  setCache(cacheKey, context, CACHE_TTL_MS);
  return context;
}

// ============================================================================
// CONTEXT ENRICHMENT — Maps modules to data sources
// ============================================================================

export interface LiveContext {
  sources: string[];
  gong: GongContext | null;
  salesforce: SalesforceContext | null;
  sensorTower: SensorTowerContext | null;
  speedboat: SpeedboatContext | null;
  enrichedAt: number;
  fallbackUsed: boolean;
}

/**
 * Module → data source mapping.
 * Each module has primary and secondary sources.
 */
const MODULE_SOURCE_MAP: Record<number, { primary: string[]; secondary: string[] }> = {
  1: { primary: ["gong", "sensorTower"], secondary: ["salesforce"] },           // Market Intel
  2: { primary: ["salesforce", "sensorTower"], secondary: ["gong"] },           // Demand Gen
  3: { primary: ["salesforce", "gong", "speedboat"], secondary: ["sensorTower"] }, // Sales Execution
  4: { primary: ["speedboat", "salesforce"], secondary: ["gong", "sensorTower"] }, // Customer Success
};

/**
 * Enrich context for a specific module and sub-module.
 * Fetches from all mapped sources in parallel, returns structured context.
 */
export async function enrichContext(
  moduleId: number,
  subModuleName?: string,
  accountName?: string,
): Promise<LiveContext> {
  const mapping = MODULE_SOURCE_MAP[moduleId] || MODULE_SOURCE_MAP[1];
  const allSources = Array.from(new Set([...mapping.primary, ...mapping.secondary]));

  const fetchers: Record<string, Promise<any>> = {};

  if (allSources.includes("gong")) {
    fetchers.gong = getGongContext(accountName);
  }
  if (allSources.includes("salesforce")) {
    fetchers.salesforce = getSalesforceContext(accountName);
  }
  if (allSources.includes("sensorTower")) {
    fetchers.sensorTower = getSensorTowerContext();
  }
  if (allSources.includes("speedboat")) {
    fetchers.speedboat = getSpeedboatContext(accountName);
  }

  const results = await Promise.allSettled(Object.values(fetchers));
  const keys = Object.keys(fetchers);

  const context: LiveContext = {
    sources: [],
    gong: null,
    salesforce: null,
    sensorTower: null,
    speedboat: null,
    enrichedAt: Date.now(),
    fallbackUsed: false,
  };

  keys.forEach((key, i) => {
    const result = results[i];
    if (result.status === "fulfilled" && result.value) {
      (context as any)[key] = result.value;
      context.sources.push(key);
    }
  });

  // If no live sources returned data, mark fallback
  if (context.sources.length === 0) {
    context.fallbackUsed = true;
  }

  return context;
}

/**
 * Format live context into a string block for injection into agent system prompts.
 */
export function formatContextForPrompt(liveContext: LiveContext): string {
  if (liveContext.fallbackUsed || liveContext.sources.length === 0) {
    return "\n## Live Data Status\n⚠️ Live data sources unavailable — using baseline market intelligence.\n";
  }

  const blocks: string[] = [];
  blocks.push(`\n## Live Data Context (${new Date(liveContext.enrichedAt).toISOString().split("T")[0]})`);
  blocks.push(`Sources connected: ${liveContext.sources.join(", ")}\n`);

  if (liveContext.gong) {
    const g = liveContext.gong;
    blocks.push("### Gong — Recent Call Intelligence");
    blocks.push(`- Call volume: ${g.callVolume.total} calls in last ${g.callVolume.period}`);
    if (g.topThemes.length > 0) {
      blocks.push(`- Top themes: ${g.topThemes.slice(0, 5).join(", ")}`);
    }
    if (g.objectionPatterns.length > 0) {
      blocks.push(`- Key objections: ${g.objectionPatterns.slice(0, 5).join(", ")}`);
    }
    if (g.recentCalls.length > 0) {
      blocks.push("- Recent calls:");
      g.recentCalls.slice(0, 5).forEach(c => {
        blocks.push(`  - ${c.date}: ${c.title} (${c.account}, ${c.duration}min)`);
      });
    }
    if (g.rawSummary) blocks.push(`- Summary: ${g.rawSummary}`);
    blocks.push("");
  }

  if (liveContext.salesforce) {
    const s = liveContext.salesforce;
    blocks.push("### Salesforce — Pipeline & Accounts");
    blocks.push(`- Pipeline total: $${(s.pipelineTotal / 1000000).toFixed(1)}M`);
    if (s.pipeline.length > 0) {
      blocks.push("- By stage:");
      s.pipeline.forEach(p => {
        blocks.push(`  - ${p.stage}: ${p.count} deals, $${(p.value / 1000000).toFixed(1)}M`);
      });
    }
    if (s.topAccounts.length > 0) {
      blocks.push("- Top accounts:");
      s.topAccounts.slice(0, 5).forEach(a => {
        blocks.push(`  - ${a.name}: $${a.spend.toLocaleString()} (${a.stage}) — Next: ${a.nextStep}`);
      });
    }
    if (s.recentWins.length > 0) {
      blocks.push(`- Recent wins: ${s.recentWins.slice(0, 3).map(w => `${w.name} ($${w.value.toLocaleString()})`).join(", ")}`);
    }
    if (s.recentLosses.length > 0) {
      blocks.push(`- Recent losses: ${s.recentLosses.slice(0, 3).map(l => `${l.name} — ${l.lossReason}`).join(", ")}`);
    }
    if (s.rawSummary) blocks.push(`- Summary: ${s.rawSummary}`);
    blocks.push("");
  }

  if (liveContext.sensorTower) {
    const st = liveContext.sensorTower;
    blocks.push("### Sensor Tower — App & Market Intelligence");
    if (st.competitorApps.length > 0) {
      blocks.push("- Competitor apps:");
      st.competitorApps.slice(0, 5).forEach(a => {
        blocks.push(`  - ${a.name}: ${a.downloads.toLocaleString()} downloads, $${a.revenue.toLocaleString()} rev, ${a.rating}★`);
      });
    }
    if (st.marketTrends.length > 0) {
      blocks.push("- Market trends:");
      st.marketTrends.slice(0, 3).forEach(t => {
        blocks.push(`  - ${t.category}: ${t.growth} growth — Top: ${t.topApps.slice(0, 3).join(", ")}`);
      });
    }
    if (st.sdkIntel.length > 0) {
      blocks.push("- SDK intelligence:");
      st.sdkIntel.slice(0, 3).forEach(s => {
        blocks.push(`  - ${s.appName}: ${s.sdks.slice(0, 5).join(", ")}`);
      });
    }
    if (st.rawSummary) blocks.push(`- Summary: ${st.rawSummary}`);
    blocks.push("");
  }

  if (liveContext.speedboat) {
    const sb = liveContext.speedboat;
    blocks.push("### Speedboat — Advertiser Performance");
    if (sb.advertiserPerformance.length > 0) {
      blocks.push("- Advertiser metrics:");
      sb.advertiserPerformance.slice(0, 5).forEach(a => {
        blocks.push(`  - ${a.name}: $${a.spend.toLocaleString()} spend, ${a.installs.toLocaleString()} installs, $${a.cpi.toFixed(2)} CPI, ${a.roas.toFixed(2)}x ROAS`);
      });
    }
    if (sb.trends.length > 0) {
      blocks.push("- Recent trends:");
      sb.trends.slice(0, 7).forEach(t => {
        blocks.push(`  - ${t.date}: $${t.spend.toLocaleString()} spend, ${t.installs.toLocaleString()} installs, $${t.cpi.toFixed(2)} CPI`);
      });
    }
    if (sb.rawSummary) blocks.push(`- Summary: ${sb.rawSummary}`);
    blocks.push("");
  }

  return blocks.join("\n");
}

/**
 * Clear all cached data (e.g., when user clicks "Refresh Data").
 */
export function clearCache(): void {
  cache.clear();
}
