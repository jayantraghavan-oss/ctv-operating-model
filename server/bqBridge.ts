/**
 * bqBridge.ts — BigQuery Data Bridge (Pure Node.js)
 *
 * Uses @google-cloud/bigquery directly — no Python dependency.
 * Works in both sandbox (ADC) and production (service account JSON via env).
 *
 * Data source: moloco-ae-view.athena.fact_dsp_core
 * Filter: campaign.os = 'CTV' AND moloco_product = 'DSP'
 * Advertiser: Uses tracking_entity (per Dan's BQ guide)
 *
 * NOTE: Fraud exclusion via moloco-data-prod.gtm.payment_fraud_account
 * is recommended by Dan's guide but requires Drive credentials not available
 * to this service account. CTV campaigns are low fraud risk. Add fraud CTE
 * when credentials are upgraded.
 */

import { BigQuery } from "@google-cloud/bigquery";

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
// BQ CLIENT INITIALIZATION
// ============================================================================

function createBQClient(): BigQuery | null {
  try {
    // Option 1: Service account JSON from env (production)
    const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (credJson) {
      const credentials = JSON.parse(credJson);
      return new BigQuery({
        projectId: "moloco-ae-view",
        credentials,
      });
    }

    // Option 2: ADC file path (sandbox / local dev)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return new BigQuery({ projectId: "moloco-ae-view" });
    }

    // Option 3: Default ADC (gcloud auth application-default login)
    return new BigQuery({ projectId: "moloco-ae-view" });
  } catch (err: any) {
    console.error("[BQ Bridge] Failed to create BQ client:", err.message);
    return null;
  }
}

let bqClient: BigQuery | null = null;

function getClient(): BigQuery | null {
  if (!bqClient) {
    bqClient = createBQClient();
  }
  return bqClient;
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

async function runQuery(sql: string): Promise<any[]> {
  const client = getClient();
  if (!client) throw new Error("BigQuery client not available");

  const [rows] = await client.query({ query: sql, location: "US" });
  return rows.map((row: any) => {
    const d: any = {};
    for (const key of Object.keys(row)) {
      const val = row[key];
      if (val === null || val === undefined) {
        d[key] = null;
      } else if (val instanceof Date) {
        d[key] = val.toISOString().split("T")[0];
      } else if (typeof val === "object" && val.value !== undefined) {
        // BigQuery returns some types as {value: ...}
        d[key] = typeof val.value === "string" ? val.value : Number(val.value);
      } else {
        d[key] = typeof val === "bigint" ? Number(val) : val;
      }
    }
    return d;
  });
}

// ============================================================================
// QUERIES
// ============================================================================

async function getSummary(): Promise<BQSummary[]> {
  const rows = await runQuery(`
    SELECT 
      SUM(gross_spend_usd) as total_gas,
      SUM(gross_spend_usd) / COUNT(DISTINCT date_utc) as avg_daily_gas,
      COUNT(DISTINCT campaign.title_id) as total_campaigns,
      COUNT(DISTINCT campaign.tracking_entity) as total_advertisers,
      MIN(date_utc) as min_date,
      MAX(date_utc) as max_date,
      COUNT(DISTINCT date_utc) as total_days
    FROM \`moloco-ae-view.athena.fact_dsp_core\`
    WHERE campaign.os = 'CTV'
      AND moloco_product = 'DSP'
      AND date_utc >= '2025-10-01'
  `);
  return rows.map((r: any) => ({
    total_gas: Number(r.total_gas) || 0,
    avg_daily_gas: Number(r.avg_daily_gas) || 0,
    total_campaigns: Number(r.total_campaigns) || 0,
    total_advertisers: Number(r.total_advertisers) || 0,
    min_date: String(r.min_date || ""),
    max_date: String(r.max_date || ""),
    total_days: Number(r.total_days) || 0,
  }));
}

async function getTrailing7d(): Promise<BQTrailing7d[]> {
  const rows = await runQuery(`
    SELECT 
      SUM(gross_spend_usd) / COUNT(DISTINCT date_utc) as trailing_7d_daily,
      SUM(gross_spend_usd) as trailing_7d_total,
      COUNT(DISTINCT campaign.title_id) as active_campaigns_7d,
      COUNT(DISTINCT campaign.tracking_entity) as active_advertisers_7d,
      MIN(date_utc) as period_start,
      MAX(date_utc) as period_end
    FROM \`moloco-ae-view.athena.fact_dsp_core\`
    WHERE campaign.os = 'CTV'
      AND moloco_product = 'DSP'
      AND date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  `);
  return rows.map((r: any) => ({
    trailing_7d_daily: Number(r.trailing_7d_daily) || 0,
    trailing_7d_total: Number(r.trailing_7d_total) || 0,
    active_campaigns_7d: Number(r.active_campaigns_7d) || 0,
    active_advertisers_7d: Number(r.active_advertisers_7d) || 0,
    period_start: String(r.period_start || ""),
    period_end: String(r.period_end || ""),
  }));
}

async function getMonthly(): Promise<BQMonthly[]> {
  const rows = await runQuery(`
    SELECT 
      FORMAT_DATE('%Y-%m', date_utc) as month,
      SUM(gross_spend_usd) as monthly_gas,
      SUM(gross_spend_usd) / COUNT(DISTINCT date_utc) as avg_daily_gas,
      COUNT(DISTINCT campaign.title_id) as active_campaigns,
      COUNT(DISTINCT campaign.tracking_entity) as active_advertisers,
      COUNT(DISTINCT date_utc) as days_in_month
    FROM \`moloco-ae-view.athena.fact_dsp_core\`
    WHERE campaign.os = 'CTV'
      AND moloco_product = 'DSP'
      AND date_utc >= '2025-10-01'
    GROUP BY 1
    ORDER BY 1
  `);
  return rows.map((r: any) => ({
    month: String(r.month || ""),
    monthly_gas: Number(r.monthly_gas) || 0,
    avg_daily_gas: Number(r.avg_daily_gas) || 0,
    active_campaigns: Number(r.active_campaigns) || 0,
    active_advertisers: Number(r.active_advertisers) || 0,
    days_in_month: Number(r.days_in_month) || 0,
  }));
}

async function getDailyRecent(): Promise<BQDailyRecent[]> {
  const rows = await runQuery(`
    SELECT 
      date_utc,
      SUM(gross_spend_usd) as daily_gas,
      COUNT(DISTINCT campaign.title_id) as active_campaigns
    FROM \`moloco-ae-view.athena.fact_dsp_core\`
    WHERE campaign.os = 'CTV'
      AND moloco_product = 'DSP'
      AND date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY 1
    ORDER BY 1
  `);
  return rows.map((r: any) => ({
    date_utc: String(r.date_utc || ""),
    daily_gas: Number(r.daily_gas) || 0,
    active_campaigns: Number(r.active_campaigns) || 0,
  }));
}

async function getTopAdvertisers(): Promise<BQAdvertiser[]> {
  const rows = await runQuery(`
    SELECT 
      campaign.tracking_entity as advertiser,
      SUM(gross_spend_usd) as total_gas,
      COUNT(DISTINCT campaign.title_id) as campaigns,
      MIN(date_utc) as first_active,
      MAX(date_utc) as last_active
    FROM \`moloco-ae-view.athena.fact_dsp_core\`
    WHERE campaign.os = 'CTV'
      AND moloco_product = 'DSP'
      AND date_utc >= '2025-10-01'
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 15
  `);
  return rows.map((r: any) => ({
    advertiser: String(r.advertiser || ""),
    total_gas: Number(r.total_gas) || 0,
    campaigns: Number(r.campaigns) || 0,
    first_active: String(r.first_active || ""),
    last_active: String(r.last_active || ""),
  }));
}

async function getExchanges(): Promise<BQExchange[]> {
  const rows = await runQuery(`
    SELECT 
      exchange,
      SUM(gross_spend_usd) as total_gas,
      COUNT(DISTINCT campaign.title_id) as campaigns
    FROM \`moloco-ae-view.athena.fact_dsp_core\`
    WHERE campaign.os = 'CTV'
      AND moloco_product = 'DSP'
      AND date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10
  `);
  return rows.map((r: any) => ({
    exchange: String(r.exchange || ""),
    total_gas: Number(r.total_gas) || 0,
    campaigns: Number(r.campaigns) || 0,
  }));
}

async function getConcentration(): Promise<BQConcentration[]> {
  const rows = await runQuery(`
    WITH ranked AS (
      SELECT 
        campaign.tracking_entity as advertiser,
        SUM(gross_spend_usd) as gas
      FROM \`moloco-ae-view.athena.fact_dsp_core\`
      WHERE campaign.os = 'CTV'
        AND moloco_product = 'DSP'
        AND date_utc >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY 1
      ORDER BY 2 DESC
    )
    SELECT 
      advertiser,
      gas,
      gas / SUM(gas) OVER() * 100 as pct_of_total,
      SUM(gas) OVER(ORDER BY gas DESC) / SUM(gas) OVER() * 100 as cumulative_pct
    FROM ranked
    LIMIT 10
  `);
  return rows.map((r: any) => ({
    advertiser: String(r.advertiser || ""),
    gas: Number(r.gas) || 0,
    pct_of_total: Number(r.pct_of_total) || 0,
    cumulative_pct: Number(r.cumulative_pct) || 0,
  }));
}

// ============================================================================
// CACHE
// ============================================================================

let cachedData: BQAllData | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

    // Run all queries in parallel for speed
    const [summary, trailing_7d, monthly, daily_recent, top_advertisers, exchanges, concentration] =
      await Promise.all([
        getSummary(),
        getTrailing7d(),
        getMonthly(),
        getDailyRecent(),
        getTopAdvertisers(),
        getExchanges(),
        getConcentration(),
      ]);

    const data: BQAllData = {
      summary,
      trailing_7d,
      monthly,
      daily_recent,
      top_advertisers,
      exchanges,
      concentration,
      fetched_at: new Date().toISOString(),
      source: "BigQuery:moloco-ae-view.athena.fact_dsp_core (tracking_entity, CTV+DSP filter)",
      fallback: false,
    };

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
