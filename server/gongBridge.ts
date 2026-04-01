/**
 * Gong CTV Intelligence Bridge
 * 
 * Calls the Python gong_ctv_intel.py script via subprocess and caches results.
 * Returns structured Gong call data with real deep links for the super view.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";

const execFileAsync = promisify(execFile);

const SCRIPT_PATH = "/home/ubuntu/ctv-operating-model/server/scripts/gong_ctv_intel.py";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface GongCTVCall {
  id: string;
  url: string;         // Gong deep link
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
 * Read env vars from ~/.bashrc for Gong credentials.
 */
function getBashrcEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const bashrc = fs.readFileSync("/home/ubuntu/.bashrc", "utf-8");
    const exportRegex = /^export\s+(\w+)=["']?([^"'\n]*)["']?/gm;
    let match;
    while ((match = exportRegex.exec(bashrc)) !== null) {
      env[match[1]] = match[2];
    }
  } catch {
    // ignore
  }
  return env;
}

async function runGongScript(mode: "summary" | "transcripts" | "full"): Promise<GongCTVIntelData> {
  const bashrcVars = getBashrcEnv();
  
  // Clean env to avoid Python version conflicts
  const cleanEnv = { ...process.env };
  delete cleanEnv.PYTHONHOME;
  delete cleanEnv.PYTHONPATH;

  try {
    const { stdout, stderr } = await execFileAsync(
      "/usr/bin/python3.11",
      [SCRIPT_PATH, mode],
      {
        timeout: mode === "summary" ? 60000 : 120000, // 1min for summary, 2min for transcripts
        env: {
          ...cleanEnv,
          ...bashrcVars,
          PATH: (process.env.PATH || "").split(":").filter((p: string) => !p.includes("uv/python")).join(":") || "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          HOME: "/home/ubuntu",
          PYTHONPATH: "/home/ubuntu/skills/gong-api/scripts",
        },
        maxBuffer: 10 * 1024 * 1024, // 10MB for transcript data
      }
    );

    if (stderr) {
      console.warn("[Gong Bridge] stderr:", stderr.slice(0, 200));
    }

    return JSON.parse(stdout.trim());
  } catch (err: any) {
    console.error("[Gong Bridge] Script error:", err.message?.slice(0, 300));
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout.trim());
      } catch {
        // not valid JSON
      }
    }
    return {
      available: false,
      error: `Gong script failed: ${err.message?.slice(0, 200)}`,
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
 * Fetch Gong CTV intelligence data (summary only — fast).
 */
export async function fetchGongSummary(forceRefresh = false): Promise<GongCTVIntelData> {
  if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const data = await runGongScript("summary");
  cache = { data, timestamp: Date.now() };
  return data;
}

/**
 * Fetch Gong CTV intelligence with transcript samples (slower).
 */
export async function fetchGongWithTranscripts(forceRefresh = false): Promise<GongCTVIntelData> {
  if (!forceRefresh && transcriptCache && Date.now() - transcriptCache.timestamp < CACHE_TTL_MS) {
    return transcriptCache.data;
  }

  const data = await runGongScript("transcripts");
  transcriptCache = { data, timestamp: Date.now() };
  return data;
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
