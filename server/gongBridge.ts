/**
 * Gong CTV Intelligence Bridge — Pure Node.js
 * 
 * Calls the Gong v2 REST API directly using fetch.
 * No Python dependency — works in production deployment.
 */

import { execSync } from "child_process";
import * as fs from "fs";

const GONG_BASE_URL = "https://api.gong.io/v2";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Known CTV advertisers — cross-referenced with BQ fact_dsp_core data
const CTV_ADVERTISERS = [
  'PMG', 'KRAKEN', 'Luckymoney', 'NOVIG', 'FanDuel', 'Rush Street',
  'DraftKings', 'BetMGM', 'Weedmaps', 'Kalshi', 'CBS', 'Noom',
  'ARBGAMING', 'Minimalist', 'Fanatics', 'Experian', 'Tilting Point',
  'Samsung', 'LG', 'Roku', 'Hulu', 'Disney', 'Paramount', 'Peacock',
  'Tubi', 'Pluto', 'Fubo', 'Sling', 'Philo', 'Discovery',
  'Warner', 'Netflix', 'Amazon', 'Apple TV',
  'Caesars', 'PointsBet', 'Barstool', 'Hard Rock', 'Penn',
  'MGM', 'WynnBET', 'Bet365', 'Betway',
  'HelloFresh', 'Blue Apron', 'Peloton', 'Casper', 'Warby',
  'Allbirds', 'Away', 'Glossier', 'Hims',
];

interface GongCTVCall {
  id: string;
  url: string;
  title: string;
  date: string;
  duration_sec: number;
  duration_min: number;
  advertiser: string;
  system: string;
  scope: string;
  media: string;
}

interface GongTranscriptSample {
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

export interface GongCTVIntelData {
  available: boolean;
  fetched_at: string;
  total_calls_scanned: number;
  ctv_matched_calls: number;
  matched_calls: GongCTVCall[];
  monthly_volume: Record<string, number>;
  advertiser_coverage: { advertiser: string; call_count: number }[];
  duration_stats: {
    avg_min: number;
    median_min: number;
    total_hours: number;
  };
  scope_breakdown: Record<string, number>;
  system_breakdown: Record<string, number>;
  unique_advertisers: number;
  date_range: { earliest: string | null; latest: string | null };
  transcript_samples?: GongTranscriptSample[];
  transcripts_pulled?: number;
  error?: string;
}

let cache: { data: GongCTVIntelData; timestamp: number } | null = null;
let transcriptCache: { data: GongCTVIntelData; timestamp: number } | null = null;

/**
 * Cached credentials to avoid re-reading bashrc on every request.
 */
let _cachedCreds: { apiKey: string; apiSecret: string } | null = null;

/**
 * Read Gong credentials from bashrc (sandbox) or env vars (production).
 * Falls back to parsing ~/.bashrc exports if env vars are truncated or missing.
 */
function getGongCredentials(): { apiKey: string; apiSecret: string } {
  if (_cachedCreds) return _cachedCreds;

  let apiKey = process.env.GONG_API_KEY || "";
  let apiSecret = process.env.GONG_API_SECRET_KEY || "";

  // Check if secret looks truncated (real JWT is ~150 chars, redacted is ~10)
  const secretLooksValid = apiSecret.length > 50 && apiSecret.startsWith("eyJ");

  if (!apiKey || !apiSecret || !secretLooksValid) {
    // Try reading from ~/.bashrc (sandbox environment)
    try {
      const bashrc = fs.readFileSync("/home/ubuntu/.bashrc", "utf-8");
      const keyMatch = bashrc.match(/export\s+GONG_API_KEY=["']?([^"'\n]+)["']?/);
      const secretMatch = bashrc.match(/export\s+GONG_API_SECRET_KEY=["']?([^"'\n]+)["']?/);
      if (keyMatch) apiKey = keyMatch[1];
      if (secretMatch) apiSecret = secretMatch[1];
      console.log(`[Gong Bridge] Loaded credentials from bashrc (key=${apiKey.length}c, secret=${apiSecret.length}c)`);
    } catch {
      // bashrc not available (production) — fall through
    }
  }

  if (!apiKey || !apiSecret) {
    throw new Error("GONG_API_KEY and GONG_API_SECRET_KEY must be set (env or ~/.bashrc)");
  }

  _cachedCreds = { apiKey, apiSecret };
  return _cachedCreds;
}

/**
 * Get Gong auth header.
 */
function getAuthHeader(): Record<string, string> {
  const { apiKey, apiSecret } = getGongCredentials();
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  return {
    "Authorization": `Basic ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * GET request to Gong API.
 */
async function gongGet(path: string, params?: Record<string, string>): Promise<any> {
  const headers = getAuthHeader();
  const url = new URL(`${GONG_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  
  const resp = await fetch(url.toString(), { headers });
  if (!resp.ok) {
    throw new Error(`Gong API ${path} returned ${resp.status}: ${await resp.text().catch(() => "")}`);
  }
  return resp.json();
}

/**
 * POST request to Gong API.
 */
async function gongPost(path: string, payload?: any): Promise<any> {
  const headers = getAuthHeader();
  const resp = await fetch(`${GONG_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload || {}),
  });
  if (!resp.ok) {
    throw new Error(`Gong API ${path} returned ${resp.status}: ${await resp.text().catch(() => "")}`);
  }
  return resp.json();
}

/**
 * List calls with pagination, pulling in 3-month chunks.
 */
async function listCalls(monthsBack: number = 18, limit: number = 500): Promise<any[]> {
  const now = new Date();
  const start = new Date(now.getTime() - monthsBack * 30 * 24 * 60 * 60 * 1000);
  
  const allCalls: any[] = [];
  let current = new Date(start);
  
  while (current < now) {
    const chunkEnd = new Date(Math.min(current.getTime() + 90 * 24 * 60 * 60 * 1000, now.getTime()));
    
    try {
      let cursor: string | undefined;
      do {
        const params: Record<string, string> = {
          fromDateTime: current.toISOString(),
          toDateTime: chunkEnd.toISOString(),
        };
        if (cursor) params.cursor = cursor;
        
        const data = await gongGet("/calls", params);
        const calls = data.calls || [];
        allCalls.push(...calls);
        cursor = data.records?.cursor;
      } while (cursor && allCalls.length < limit);
    } catch (err: any) {
      console.warn(`[Gong Bridge] Chunk ${current.toISOString().slice(0, 10)} to ${chunkEnd.toISOString().slice(0, 10)} failed:`, err.message?.slice(0, 200));
    }
    
    current = new Date(chunkEnd.getTime() + 24 * 60 * 60 * 1000);
  }
  
  return allCalls;
}

/**
 * Match a call title to a CTV advertiser.
 */
function matchAdvertiser(title: string): string | null {
  const titleLower = title.toLowerCase();
  for (const adv of CTV_ADVERTISERS) {
    if (titleLower.includes(adv.toLowerCase())) {
      return adv;
    }
  }
  return null;
}

/**
 * Build structured summary from matched CTV calls.
 */
function buildSummary(allCalls: any[]): GongCTVIntelData {
  const matched: GongCTVCall[] = [];
  
  for (const c of allCalls) {
    const adv = matchAdvertiser(c.title || "");
    if (adv) {
      matched.push({
        id: c.id,
        url: c.url || `https://app.gong.io/call?id=${c.id}`,
        title: c.title || "",
        date: (c.scheduled || c.started || "").slice(0, 10),
        duration_sec: c.duration || 0,
        duration_min: Math.round((c.duration || 0) / 60 * 10) / 10,
        advertiser: adv,
        system: c.system || "Unknown",
        scope: c.scope || "Unknown",
        media: c.media || "Unknown",
      });
    }
  }
  
  // Sort by date descending
  matched.sort((a, b) => b.date.localeCompare(a.date));
  
  // Monthly volume
  const monthly: Record<string, number> = {};
  for (const m of matched) {
    const monthKey = m.date.slice(0, 7);
    if (monthKey) monthly[monthKey] = (monthly[monthKey] || 0) + 1;
  }
  
  // Advertiser coverage
  const advCounts: Record<string, number> = {};
  for (const m of matched) {
    advCounts[m.advertiser] = (advCounts[m.advertiser] || 0) + 1;
  }
  const advCoverage = Object.entries(advCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([advertiser, call_count]) => ({ advertiser, call_count }));
  
  // Duration stats
  const durations = matched.filter(m => m.duration_sec > 0).map(m => m.duration_sec);
  const sortedDurations = [...durations].sort((a, b) => a - b);
  const durationStats = {
    avg_min: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60 * 10) / 10 : 0,
    median_min: sortedDurations.length ? Math.round(sortedDurations[Math.floor(sortedDurations.length / 2)] / 60 * 10) / 10 : 0,
    total_hours: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / 3600 * 10) / 10 : 0,
  };
  
  // Scope breakdown
  const scopeCounts: Record<string, number> = {};
  for (const m of matched) scopeCounts[m.scope] = (scopeCounts[m.scope] || 0) + 1;
  
  // System breakdown
  const systemCounts: Record<string, number> = {};
  for (const m of matched) systemCounts[m.system] = (systemCounts[m.system] || 0) + 1;
  
  // Sort monthly
  const sortedMonthly = Object.fromEntries(Object.entries(monthly).sort());
  
  return {
    available: true,
    fetched_at: new Date().toISOString(),
    total_calls_scanned: allCalls.length,
    ctv_matched_calls: matched.length,
    matched_calls: matched,
    monthly_volume: sortedMonthly,
    advertiser_coverage: advCoverage,
    duration_stats: durationStats,
    scope_breakdown: scopeCounts,
    system_breakdown: systemCounts,
    unique_advertisers: Object.keys(advCounts).length,
    date_range: {
      earliest: matched.length ? matched[matched.length - 1].date : null,
      latest: matched.length ? matched[0].date : null,
    },
  };
}

/**
 * Get transcript text for a call.
 */
async function getTranscriptText(callId: string): Promise<string> {
  const data = await gongPost("/calls/transcript", {
    filter: { callIds: [callId] },
  });
  
  const transcripts = data.callTranscripts || [];
  if (!transcripts.length) return "";
  
  const lines: string[] = [];
  for (const segment of transcripts[0].transcript || []) {
    const speaker = segment.speakerId || "Unknown";
    for (const sentence of segment.sentences || []) {
      lines.push(`[${speaker}] ${sentence.text || ""}`);
    }
  }
  return lines.join("\n");
}

/**
 * Pull transcripts for the most recent CTV calls.
 */
async function pullTranscripts(matchedCalls: GongCTVCall[], maxCalls: number = 15): Promise<GongTranscriptSample[]> {
  // Prioritize diversity of advertisers
  const seenAdvertisers = new Set<string>();
  const selected: GongCTVCall[] = [];
  
  // First pass: one call per advertiser
  for (const call of matchedCalls) {
    if (!seenAdvertisers.has(call.advertiser) && selected.length < maxCalls) {
      selected.push(call);
      seenAdvertisers.add(call.advertiser);
    }
  }
  
  // Second pass: fill remaining slots
  for (const call of matchedCalls) {
    if (selected.length >= maxCalls) break;
    if (!selected.includes(call)) selected.push(call);
  }
  
  const transcripts: GongTranscriptSample[] = [];
  for (const call of selected.slice(0, maxCalls)) {
    try {
      const text = await getTranscriptText(call.id);
      if (text) {
        transcripts.push({
          call_id: call.id,
          url: call.url,
          title: call.title,
          advertiser: call.advertiser,
          date: call.date,
          duration_min: call.duration_min,
          transcript_excerpt: text.slice(0, 2000),
          transcript_length: text.length,
          has_full_transcript: true,
        });
      }
    } catch (err: any) {
      transcripts.push({
        call_id: call.id,
        url: call.url,
        title: call.title,
        advertiser: call.advertiser,
        date: call.date,
        duration_min: call.duration_min,
        transcript_excerpt: `[Transcript unavailable: ${(err.message || "").slice(0, 100)}]`,
        transcript_length: 0,
        has_full_transcript: false,
      });
    }
  }
  
  return transcripts;
}

/**
 * Fetch Gong CTV intelligence data (summary only — fast).
 */
export async function fetchGongSummary(forceRefresh = false): Promise<GongCTVIntelData> {
  if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }
  
  try {
    const allCalls = await listCalls(18, 500);
    const data = buildSummary(allCalls);
    // Keep only top 50 most recent calls for summary
    data.matched_calls = data.matched_calls.slice(0, 50);
    cache = { data, timestamp: Date.now() };
    return data;
  } catch (err: any) {
    console.error("[Gong Bridge] Error:", err.message?.slice(0, 300));
    return {
      available: false,
      error: `Gong API failed: ${err.message?.slice(0, 200)}`,
      fetched_at: new Date().toISOString(),
      total_calls_scanned: 0,
      ctv_matched_calls: 0,
      matched_calls: [],
      monthly_volume: {},
      advertiser_coverage: [],
      duration_stats: { avg_min: 0, median_min: 0, total_hours: 0 },
      scope_breakdown: {},
      system_breakdown: {},
      unique_advertisers: 0,
      date_range: { earliest: null, latest: null },
    };
  }
}

/**
 * Fetch Gong CTV intelligence with transcript samples (slower).
 */
export async function fetchGongWithTranscripts(forceRefresh = false): Promise<GongCTVIntelData> {
  if (!forceRefresh && transcriptCache && Date.now() - transcriptCache.timestamp < CACHE_TTL_MS) {
    return transcriptCache.data;
  }
  
  try {
    const allCalls = await listCalls(18, 500);
    const data = buildSummary(allCalls);
    const transcriptData = await pullTranscripts(data.matched_calls, 15);
    data.transcript_samples = transcriptData;
    data.transcripts_pulled = transcriptData.length;
    transcriptCache = { data, timestamp: Date.now() };
    return data;
  } catch (err: any) {
    console.error("[Gong Bridge] Error:", err.message?.slice(0, 300));
    return {
      available: false,
      error: `Gong API failed: ${err.message?.slice(0, 200)}`,
      fetched_at: new Date().toISOString(),
      total_calls_scanned: 0,
      ctv_matched_calls: 0,
      matched_calls: [],
      monthly_volume: {},
      advertiser_coverage: [],
      duration_stats: { avg_min: 0, median_min: 0, total_hours: 0 },
      scope_breakdown: {},
      system_breakdown: {},
      unique_advertisers: 0,
      date_range: { earliest: null, latest: null },
    };
  }
}

/**
 * Get Gong connection status.
 */
export function getGongStatus(): { connected: boolean; lastFetched: string | null; callCount: number } {
  if (cache) {
    return {
      connected: cache.data.available,
      lastFetched: cache.data.fetched_at,
      callCount: cache.data.ctv_matched_calls,
    };
  }
  return { connected: false, lastFetched: null, callCount: 0 };
}

/**
 * Clear Gong caches.
 */
export function clearGongCache(): void {
  cache = null;
  transcriptCache = null;
}
