/**
 * bqBridge.ts — BigQuery Data Bridge
 *
 * Calls the Python BQ fetcher script via child_process and caches results.
 * Falls back gracefully if Python/BQ is unavailable (e.g., in production deployment).
 *
 * Data source: moloco-ae-view.athena.fact_dsp_core
 * Filter: campaign.os = 'CTV' AND moloco_product = 'DSP'
 */

import { execFile } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// TYPES
// ============================================================================

export interface BQSummary {
  total_gas: number;
  avg_daily_gas: number;
  total_campaigns: number;
  total_advertisers: number;
  min_date: string;
  max_date: string;
  total_days: number;
}

export interface BQTrailing7d {
  trailing_7d_daily: number;
  trailing_7d_total: number;
  active_campaigns_7d: number;
  active_advertisers_7d: number;
  period_start: string;
  period_end: string;
}

export interface BQMonthly {
  month: string;
  monthly_gas: number;
  avg_daily_gas: number;
  active_campaigns: number;
  active_advertisers: number;
  days_in_month: number;
}

export interface BQDailyRecent {
  date_utc: string;
  daily_gas: number;
  active_campaigns: number;
}

export interface BQAdvertiser {
  advertiser: string;
  total_gas: number;
  campaigns: number;
  first_active: string;
  last_active: string;
}

export interface BQExchange {
  exchange: string;
  total_gas: number;
  campaigns: number;
}

export interface BQConcentration {
  advertiser: string;
  gas: number;
  pct_of_total: number;
  cumulative_pct: number;
}

export interface BQAllData {
  summary: BQSummary[];
  trailing_7d: BQTrailing7d[];
  monthly: BQMonthly[];
  daily_recent: BQDailyRecent[];
  top_advertisers: BQAdvertiser[];
  exchanges: BQExchange[];
  concentration: BQConcentration[];
  fetched_at: string;
  source: string;
  fallback: boolean;
}

// ============================================================================
// CACHE
// ============================================================================

let cachedData: BQAllData | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// PYTHON SCRIPT EXECUTOR
// ============================================================================

// Resolve script path relative to this file's location
// In dev: server/bqBridge.ts -> server/scripts/bq_fetch_ctv.py
// In prod: dist/bqBridge.js -> ../server/scripts/bq_fetch_ctv.py
const SCRIPT_PATH = resolve(__dirname, "scripts/bq_fetch_ctv.py");
const SCRIPT_PATH_ALT = resolve(process.cwd(), "server/scripts/bq_fetch_ctv.py");

function execPython(queryType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = existsSync(SCRIPT_PATH)
      ? SCRIPT_PATH
      : SCRIPT_PATH_ALT;

    // Use explicit python3.11 path to avoid uv's python3.13 which conflicts with system packages
    const pythonBin = existsSync("/usr/bin/python3.11") ? "/usr/bin/python3.11" : "python3";
    execFile(
      pythonBin,
      [scriptPath, queryType],
      {
        timeout: 120_000, // 2 minutes max
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: {
          ...process.env,
          // Ensure HOME is set so gcloud ADC can be found at ~/.config/gcloud/
          HOME: process.env.HOME || "/home/ubuntu",
          // Clear Python path contamination from uv/tsx environment
          PYTHONPATH: "",
          PYTHONHOME: "",
          // Force clean PATH that prioritizes system Python
          PATH: `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH || ""}`,
          // Also pass GOOGLE_APPLICATION_CREDENTIALS if explicitly set
          ...(process.env.GOOGLE_APPLICATION_CREDENTIALS
            ? { GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS }
            : {}),
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error("[BQ Bridge] Python script error:", error.message);
          if (stderr) console.error("[BQ Bridge] stderr:", stderr);
          reject(new Error(`BQ script failed: ${error.message}`));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Fetch all BQ CTV data. Returns cached data if fresh, otherwise re-fetches.
 * Falls back to null if BQ is unavailable.
 */
export async function fetchBQData(forceRefresh = false): Promise<BQAllData | null> {
  // Return cache if fresh
  if (!forceRefresh && cachedData && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  try {
    console.log("[BQ Bridge] Fetching fresh CTV data from BigQuery...");
    const stdout = await execPython("all");
    const parsed = JSON.parse(stdout);

    if (parsed.error || parsed.fallback) {
      console.warn("[BQ Bridge] BQ returned fallback:", parsed.error);
      return null;
    }

    // Parse numeric strings back to numbers
    const data = normalizeData(parsed);
    cachedData = data;
    cacheTimestamp = Date.now();
    console.log("[BQ Bridge] BQ data cached successfully. Source:", data.source);
    return data;
  } catch (err: any) {
    console.error("[BQ Bridge] Failed to fetch BQ data:", err.message);
    // Return stale cache if available
    if (cachedData) {
      console.log("[BQ Bridge] Returning stale cache from", new Date(cacheTimestamp).toISOString());
      return cachedData;
    }
    return null;
  }
}

/**
 * Get BQ connection status for the live data status panel.
 */
export async function getBQStatus(): Promise<{
  connected: boolean;
  lastFetched: string | null;
  cacheAge: number;
  dataRange: string | null;
}> {
  const data = cachedData;
  return {
    connected: data !== null && !data.fallback,
    lastFetched: data?.fetched_at || null,
    cacheAge: data ? Math.round((Date.now() - cacheTimestamp) / 1000) : -1,
    dataRange: data?.summary?.[0]
      ? `${data.summary[0].min_date} to ${data.summary[0].max_date}`
      : null,
  };
}

/**
 * Clear the BQ cache (force next request to re-fetch).
 */
export function clearBQCache(): void {
  cachedData = null;
  cacheTimestamp = 0;
  console.log("[BQ Bridge] Cache cleared");
}

// ============================================================================
// DATA NORMALIZATION
// ============================================================================

function normalizeData(raw: any): BQAllData {
  return {
    summary: (raw.summary || []).map((r: any) => ({
      total_gas: parseFloat(r.total_gas) || 0,
      avg_daily_gas: parseFloat(r.avg_daily_gas) || 0,
      total_campaigns: parseFloat(r.total_campaigns) || 0,
      total_advertisers: parseFloat(r.total_advertisers) || 0,
      min_date: r.min_date || "",
      max_date: r.max_date || "",
      total_days: parseFloat(r.total_days) || 0,
    })),
    trailing_7d: (raw.trailing_7d || []).map((r: any) => ({
      trailing_7d_daily: parseFloat(r.trailing_7d_daily) || 0,
      trailing_7d_total: parseFloat(r.trailing_7d_total) || 0,
      active_campaigns_7d: parseFloat(r.active_campaigns_7d) || 0,
      active_advertisers_7d: parseFloat(r.active_advertisers_7d) || 0,
      period_start: r.period_start || "",
      period_end: r.period_end || "",
    })),
    monthly: (raw.monthly || []).map((r: any) => ({
      month: r.month || "",
      monthly_gas: parseFloat(r.monthly_gas) || 0,
      avg_daily_gas: parseFloat(r.avg_daily_gas) || 0,
      active_campaigns: parseFloat(r.active_campaigns) || 0,
      active_advertisers: parseFloat(r.active_advertisers) || 0,
      days_in_month: parseFloat(r.days_in_month) || 0,
    })),
    daily_recent: (raw.daily_recent || []).map((r: any) => ({
      date_utc: r.date_utc || "",
      daily_gas: parseFloat(r.daily_gas) || 0,
      active_campaigns: parseFloat(r.active_campaigns) || 0,
    })),
    top_advertisers: (raw.top_advertisers || []).map((r: any) => ({
      advertiser: r.advertiser || "",
      total_gas: parseFloat(r.total_gas) || 0,
      campaigns: parseFloat(r.campaigns) || 0,
      first_active: r.first_active || "",
      last_active: r.last_active || "",
    })),
    exchanges: (raw.exchanges || []).map((r: any) => ({
      exchange: r.exchange || "",
      total_gas: parseFloat(r.total_gas) || 0,
      campaigns: parseFloat(r.campaigns) || 0,
    })),
    concentration: (raw.concentration || []).map((r: any) => ({
      advertiser: r.advertiser || "",
      gas: parseFloat(r.gas) || 0,
      pct_of_total: parseFloat(r.pct_of_total) || 0,
      cumulative_pct: parseFloat(r.cumulative_pct) || 0,
    })),
    fetched_at: raw.fetched_at || new Date().toISOString(),
    source: raw.source || "BigQuery",
    fallback: raw.fallback || false,
  };
}
