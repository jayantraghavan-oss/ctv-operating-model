/**
 * useCuratedData — Shared hook for fetching curated intel from the database.
 * All pages should use this instead of hardcoded arrays.
 *
 * Usage:
 *   const { data, loading } = useCuratedData(["toolkit_competitor", "toolkit_scenario"]);
 *   const competitors = data.toolkit_competitor || [];
 */
import { useState, useEffect, useRef } from "react";
import { trpcQuery } from "@/lib/trpcFetch";

export interface CuratedRow {
  id: string;
  category: string;
  subcategory: string | null;
  label: string;
  value1: string | number | null; // MySQL decimal returns string
  value2: string | number | null;
  value3: string | number | null;
  text1: string | null;
  text2: string | null;
  text3: string | null;
  text4: string | null;
  metadata: any;
  sortOrder: number;
  isActive: number;
  dataSource: string | null;
}

type CuratedMap = Record<string, CuratedRow[]>;

// Module-level cache so multiple components don't re-fetch
let _cache: CuratedMap | null = null;
let _fetchPromise: Promise<CuratedMap> | null = null;

async function fetchAllCurated(): Promise<CuratedMap> {
  if (_cache) return _cache;
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = trpcQuery<CuratedMap>("reporting.curatedIntel").then((data) => {
    _cache = data;
    _fetchPromise = null;
    return data;
  }).catch((err) => {
    _fetchPromise = null;
    console.error("Failed to fetch curated data:", err);
    return {};
  });
  return _fetchPromise;
}

/**
 * Invalidate the cache (e.g., after a data refresh).
 */
export function invalidateCuratedCache() {
  _cache = null;
  _fetchPromise = null;
}

/**
 * Hook to get curated data from the database.
 * @param categories - Optional list of categories to filter. If omitted, returns all.
 * @returns { data, loading, error }
 */
export function useCuratedData(categories?: string[]) {
  const [data, setData] = useState<CuratedMap>(_cache || {});
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (_cache) {
      setData(_cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAllCurated()
      .then((result) => {
        if (mounted.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted.current) {
          setError(err);
          setLoading(false);
        }
      });
    return () => { mounted.current = false; };
  }, []);

  // Filter to requested categories if specified
  if (categories && categories.length > 0) {
    const filtered: CuratedMap = {};
    for (const cat of categories) {
      if (data[cat]) filtered[cat] = data[cat];
    }
    return { data: filtered, loading, error };
  }

  return { data, loading, error };
}

// ── Typed helper functions for common data shapes ──

/** Extract a simple { label, value, trend, desc } array from curated rows */
export function toInsightCards(rows: CuratedRow[]) {
  return rows.map((r) => ({
    label: r.label,
    value: r.text1 || "",
    trend: r.text2 || "",
    desc: r.text3 || "",
    icon: r.text2 || "",
    color: r.text3 || "",
    bg: r.text4 || "",
  }));
}

/** Extract a simple { name, focus, threat } array from toolkit competitors */
export function toCompetitors(rows: CuratedRow[]) {
  return rows.map((r) => ({
    name: r.label,
    focus: r.text1 || "",
    threat: r.text2 || "",
  }));
}

/** Extract { name, desc } array from toolkit scenarios */
export function toScenarios(rows: CuratedRow[]) {
  return rows.map((r, i) => ({
    id: i + 1,
    name: r.label,
    desc: r.text1 || "",
  }));
}

/** Extract weekly highlights as string array */
export function toHighlights(rows: CuratedRow[]) {
  return rows.map((r) => r.text1 || r.label);
}

/** Extract learning loops */
export function toLoops(rows: CuratedRow[]) {
  return rows.map((r) => ({
    id: r.sortOrder,
    name: r.label,
    status: (r.text1 || "active") as "active" | "partial",
    source: r.text2 || "",
    target: r.text3 || "",
    signal: r.text4 || "",
  }));
}

/** Extract pipeline stages */
export function toPipelineStages(rows: CuratedRow[]) {
  return rows.map((r) => ({
    stage: r.label,
    count: Number(r.value1) || 0,
    value: r.text1 || "",
    color: r.text2 || "",
  }));
}

/** Extract top verticals */
export function toVerticals(rows: CuratedRow[]) {
  return rows.map((r) => ({
    vertical: r.label,
    deals: Number(r.value1) || 0,
    revenue: r.text1 || "",
    growth: r.text2 || "",
  }));
}

/** Extract war room competitors */
export function toWarRoomCompetitors(rows: CuratedRow[]) {
  return rows.map((r) => ({
    name: r.label,
    status: r.text1 || "",
    color: r.text2 || "",
    bg: r.text3 || "",
    detail: r.text4 || "",
  }));
}

/** Extract war room scenarios */
export function toWarRoomScenarios(rows: CuratedRow[]) {
  return rows.map((r, i) => ({
    id: i + 1,
    name: r.label,
    impact: r.text1 || "medium",
    response: r.text2 || "",
  }));
}

/** Extract buyer personas from DB */
export function toPersonas(rows: CuratedRow[]) {
  return rows.map((r) => {
    const meta = r.metadata || {};
    return {
      id: r.text1 || "",
      name: r.label,
      title: r.text2 || "",
      company: r.text3 || "",
      vertical: r.text4 || "",
      budget: meta.budget || "",
      priority: meta.priority || "",
      currentStack: meta.currentStack || "",
      kpis: meta.kpis || [],
      objections: meta.objections || [],
      dealComplexity: meta.dealComplexity || "high",
      stakeholders: meta.stakeholders || [],
      timeline: meta.timeline || "",
    };
  });
}

/** Extract buyer scripts from DB */
export function toScripts(rows: CuratedRow[]) {
  const scripts: Record<string, any[]> = {};
  for (const r of rows) {
    const personaId = r.subcategory || "";
    try {
      scripts[personaId] = JSON.parse(r.text1 || "[]");
    } catch {
      scripts[personaId] = [];
    }
  }
  return scripts;
}

/** Extract CCCTV behavior data */
export function toCCCTVBehaviors(rows: CuratedRow[]) {
  return rows.map((r) => ({
    behavior: r.label,
    won: Number(r.value1) || 0,
    lost: Number(r.value2) || 0,
    delta: r.text1 || "",
    signal: r.text2 || "",
  }));
}

/** Extract CCCTV win rate by behavior */
export function toCCCTVWinRateBehavior(rows: CuratedRow[]) {
  return rows.map((r) => ({
    behavior: r.label,
    rate: Number(r.value1) || 0,
  }));
}

/** Extract CCCTV loss reasons */
export function toCCCTVLossReasons(rows: CuratedRow[]) {
  return rows.map((r) => ({
    reason: r.label,
    pct: Number(r.value1) || 0,
  }));
}

/** Extract CCCTV competitor data */
export function toCCCTVCompetitors(rows: CuratedRow[]) {
  return rows.map((r) => ({
    competitor: r.label,
    deals: Number(r.value1) || 0,
    winRate: Number(r.value2) || 0,
    theirEdge: r.text1 || "",
    ourCounter: r.text2 || "",
  }));
}

/** Extract CCCTV win rate by competitor */
export function toCCCTVWinRateCompetitor(rows: CuratedRow[]) {
  return rows.map((r) => ({
    name: r.label,
    rate: Number(r.value1) || 0,
  }));
}

/** Extract CCCTV TAM data */
export function toCCCTVTam(rows: CuratedRow[]) {
  return rows.map((r) => ({
    label: r.label,
    value: r.text1 || "",
    width: r.text2 || "",
    amount: r.text3 || "",
  }));
}

/** Extract CCCTV competitive signals */
export function toCCCTVCompSignals(rows: CuratedRow[]) {
  return rows.map((r) => ({
    title: r.label,
    body: r.text1 || "",
    source: r.text2 || "",
  }));
}

/** Extract CCCTV themes */
export function toCCCTVThemes(rows: CuratedRow[]) {
  return rows.map((r) => ({
    theme: r.label,
    calls: Number(r.value1) || 0,
    pct: Number(r.value2) || 0,
    sentiment: r.text1 || "",
  }));
}

/** Extract CCCTV verbatims */
export function toCCCTVVerbatims(rows: CuratedRow[]) {
  return rows.map((r) => ({
    text: r.text1 || "",
    source: r.label,
    sentiment: r.text2 || "",
  }));
}

/** Extract CCCTV concentration */
export function toCCCTVConcentration(rows: CuratedRow[]) {
  return rows.map((r) => ({
    exchange: r.label,
    pct: Number(r.value1) || 0,
  }));
}

/** Extract CCCTV risk signals */
export function toCCCTVRiskSignals(rows: CuratedRow[]) {
  return rows.map((r) => ({
    signal: r.label,
    type: r.text1 || "risk",
    severity: r.text2 || "medium",
  }));
}

/** Extract CCCTV pipeline stages */
export function toCCCTVPipeline(rows: CuratedRow[]) {
  return rows.map((r) => ({
    stage: r.label,
    count: Number(r.value1) || 0,
    color: r.text1 || "",
  }));
}

/** Extract learning loops (full) */
export function toLearningLoopsFull(rows: CuratedRow[]) {
  return rows.map((r) => {
    const meta = r.metadata || {};
    return {
      id: `loop-${r.sortOrder}`,
      name: r.label,
      from_module: Number(r.value1) || 0,
      from_section: r.text1 || "",
      to_module: Number(r.value2) || 0,
      to_section: r.text2 || "",
      frequency: r.text3 || "",
      status: (r.text4 || "active") as "active" | "partial",
      signal: meta.signal || "",
      mechanism: meta.mechanism || "",
      criticalFor: meta.criticalFor || "",
    };
  });
}
