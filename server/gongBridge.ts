/**
 * Gong CTV Intelligence Bridge — Pure Node.js
 * 
 * Calls the Gong v2 REST API directly using fetch.
 * No Python dependency — works in production deployment.
 * 
 * Strategy: ALL Moloco calls are CTV-relevant since CTV is the core business.
 * Company names are extracted from call titles using pattern matching.
 * Full pagination ensures we capture all available calls.
 */

import * as fs from "fs";

const GONG_BASE_URL = "https://api.gong.io/v2";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// CREDENTIALS
// ============================================================================

let _cachedCreds: { apiKey: string; apiSecret: string } | null = null;

function getGongCredentials(): { apiKey: string; apiSecret: string } {
  if (_cachedCreds) return _cachedCreds;

  let apiKey = process.env.GONG_API_KEY || "";
  let apiSecret = process.env.GONG_API_SECRET_KEY || "";

  const secretLooksValid = apiSecret.length > 50 && apiSecret.startsWith("eyJ");

  if (!apiKey || !apiSecret || !secretLooksValid) {
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

function getAuthHeader(): Record<string, string> {
  const { apiKey, apiSecret } = getGongCredentials();
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  return {
    "Authorization": `Basic ${token}`,
    "Content-Type": "application/json",
  };
}

// ============================================================================
// API HELPERS
// ============================================================================

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

// ============================================================================
// COMPANY EXTRACTION FROM CALL TITLES
// ============================================================================

/**
 * Extract company/advertiser name from a Gong call title.
 * Handles common patterns:
 *   "Company <> Moloco", "Moloco <> Company", "Company x Moloco",
 *   "Moloco // Company", "Moloco / Company", "Company | Moloco",
 *   "[Ext(Zoom)] Company x Moloco", etc.
 */
function extractCompanyFromTitle(title: string): string {
  if (!title) return "Unknown";

  // Remove common prefixes like [Ext(Zoom)], [Ext(Teams)], etc.
  const cleaned = title.replace(/\[Ext\([^)]*\)\]\s*/gi, "").trim();

  const patterns = [
    // "Company <> Moloco" variants
    /^(.+?)\s*<>\s*Moloco/i,
    /^Moloco\s*<>\s*(.+?)(?:\s*[-:,]|Bi-|Weekly|Sync|$)/i,
    // "Company x Moloco" variants
    /^(.+?)\s*[xX]\s*Moloco/i,
    /^Moloco\s*[xX]\s*(.+?)(?:\s*[-:,]|Bi-|Weekly|Sync|$)/i,
    // "Moloco // Company" variants
    /^Moloco\s*\/\/\s*(.+?)(?:\s*[-:,]|Bi-|Weekly|Sync|$)/i,
    /^(.+?)\s*\/\/\s*Moloco/i,
    // "Moloco / Company" variants
    /^Moloco\s*\/\s*(.+?)(?:\s*[-:,]|Bi-|Weekly|Sync|$)/i,
    /^(.+?)\s*\/\s*Moloco/i,
    // "Company | Moloco" variants
    /^(.+?)\s*\|\s*Moloco/i,
    /^Moloco\s*\|\s*(.+?)(?:\s*[-:,]|Bi-|Weekly|Sync|$)/i,
    // "Company + Moloco" variants
    /^(.+?)\s*\+\s*Moloco/i,
    /^Moloco\s*\+\s*(.+?)(?:\s*[-:,]|Bi-|Weekly|Sync|$)/i,
  ];

  for (const p of patterns) {
    const m = cleaned.match(p);
    if (m) {
      let company = m[1].trim();
      // Clean up trailing noise
      company = company
        .replace(/\s*(Bi-Weekly|Bi-weekly|Weekly|Sync|Kickoff|Intro|Call|Meeting|Check-in|Catch-up|Catchup|Strategy|Review)\s*$/i, "")
        .replace(/\s*[-:]\s*$/, "")
        .trim();
      if (company.length > 1 && company.toLowerCase() !== "moloco") {
        return company;
      }
    }
  }

  // Fallback: if title doesn't match patterns, use the full title (trimmed)
  // but skip internal-only calls
  const internalPatterns = [/^internal/i, /^team\s/i, /^1:1/i, /^standup/i, /^all\s*hands/i];
  if (internalPatterns.some(p => p.test(cleaned))) {
    return "Internal";
  }

  return cleaned.slice(0, 60) || "Unknown";
}

// ============================================================================
// CALL LISTING WITH FULL PAGINATION
// ============================================================================

/**
 * List ALL calls with full pagination.
 * Fetches in 3-month chunks to stay within Gong's date range limits.
 * Paginates within each chunk to get all calls.
 */
async function listAllCalls(monthsBack: number = 12, maxCalls: number = 2000): Promise<any[]> {
  const now = new Date();
  const start = new Date(now.getTime() - monthsBack * 30 * 24 * 60 * 60 * 1000);

  const allCalls: any[] = [];
  let current = new Date(start);

  while (current < now && allCalls.length < maxCalls) {
    const chunkEnd = new Date(Math.min(current.getTime() + 90 * 24 * 60 * 60 * 1000, now.getTime()));

    try {
      let cursor: string | undefined;
      let chunkCalls = 0;
      do {
        const params: Record<string, string> = {
          fromDateTime: current.toISOString(),
          toDateTime: chunkEnd.toISOString(),
        };
        if (cursor) params.cursor = cursor;

        const data = await gongGet("/calls", params);
        const calls = data.calls || [];
        allCalls.push(...calls);
        chunkCalls += calls.length;
        cursor = data.records?.cursor;
      } while (cursor && allCalls.length < maxCalls);

      console.log(`[Gong Bridge] Chunk ${current.toISOString().slice(0, 10)} to ${chunkEnd.toISOString().slice(0, 10)}: ${chunkCalls} calls`);
    } catch (err: any) {
      console.warn(`[Gong Bridge] Chunk failed:`, err.message?.slice(0, 200));
    }

    current = new Date(chunkEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  console.log(`[Gong Bridge] Total calls fetched: ${allCalls.length}`);
  return allCalls;
}

// ============================================================================
// BUILD SUMMARY — ALL CALLS ARE CTV-RELEVANT
// ============================================================================

function buildSummary(allCalls: any[]): GongCTVIntelData {
  const matched: GongCTVCall[] = [];

  for (const c of allCalls) {
    const title = c.title || "";
    const advertiser = extractCompanyFromTitle(title);

    // Skip internal calls
    if (advertiser === "Internal") continue;

    matched.push({
      id: c.id,
      url: c.url || `https://app.gong.io/call?id=${c.id}`,
      title,
      date: (c.scheduled || c.started || "").slice(0, 10),
      duration_sec: c.duration || 0,
      duration_min: Math.round((c.duration || 0) / 60 * 10) / 10,
      advertiser,
      system: c.system || "Unknown",
      scope: c.scope || "Unknown",
      media: c.media || "Unknown",
    });
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
    .slice(0, 50)
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

// ============================================================================
// TRANSCRIPTS
// ============================================================================

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

async function pullTranscripts(matchedCalls: GongCTVCall[], maxCalls: number = 15): Promise<GongTranscriptSample[]> {
  // Prioritize diversity of advertisers
  const seenAdvertisers = new Set<string>();
  const selected: GongCTVCall[] = [];

  // First pass: one call per advertiser (most recent)
  for (const call of matchedCalls) {
    if (!seenAdvertisers.has(call.advertiser) && selected.length < maxCalls) {
      selected.push(call);
      seenAdvertisers.add(call.advertiser);
    }
  }

  // Second pass: fill remaining slots with most recent
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

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Fetch Gong CTV intelligence data (summary only — fast).
 * Returns ALL Moloco calls with company extraction from titles.
 */
export async function fetchGongSummary(forceRefresh = false): Promise<GongCTVIntelData> {
  if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const allCalls = await listAllCalls(12, 2000);
    const data = buildSummary(allCalls);
    // Keep top 100 most recent calls for summary
    data.matched_calls = data.matched_calls.slice(0, 100);
    cache = { data, timestamp: Date.now() };
    console.log(`[Gong Bridge] Summary: ${data.ctv_matched_calls} calls, ${data.unique_advertisers} advertisers, ${Object.keys(data.monthly_volume).length} months`);
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
    const allCalls = await listAllCalls(12, 2000);
    const data = buildSummary(allCalls);
    const transcriptData = await pullTranscripts(data.matched_calls, 20);
    data.transcript_samples = transcriptData;
    data.transcripts_pulled = transcriptData.length;
    transcriptCache = { data, timestamp: Date.now() };
    console.log(`[Gong Bridge] With transcripts: ${data.ctv_matched_calls} calls, ${transcriptData.length} transcripts pulled`);
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
