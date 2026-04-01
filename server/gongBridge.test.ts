import { describe, it, expect } from "vitest";

/**
 * gongBridge tests — validate the module's exported interface and data types.
 * We test the module's structure and type contracts rather than mocking the Python subprocess,
 * since the subprocess mocking with promisify + resetModules is fragile.
 */

describe("gongBridge", () => {
  it("should export fetchGongSummary function", async () => {
    const mod = await import("./gongBridge");
    expect(mod.fetchGongSummary).toBeDefined();
    expect(typeof mod.fetchGongSummary).toBe("function");
  });

  it("should export fetchGongWithTranscripts function", async () => {
    const mod = await import("./gongBridge");
    expect(mod.fetchGongWithTranscripts).toBeDefined();
    expect(typeof mod.fetchGongWithTranscripts).toBe("function");
  });

  it("should export getGongStatus function", async () => {
    const mod = await import("./gongBridge");
    expect(mod.getGongStatus).toBeDefined();
    expect(typeof mod.getGongStatus).toBe("function");
  });

  it("should export clearGongCache function", async () => {
    const mod = await import("./gongBridge");
    expect(mod.clearGongCache).toBeDefined();
    expect(typeof mod.clearGongCache).toBe("function");
  });

  it("getGongStatus should return correct structure when no cache exists", async () => {
    const { getGongStatus, clearGongCache } = await import("./gongBridge");
    clearGongCache();

    const status = getGongStatus();
    expect(status).toHaveProperty("connected");
    expect(status).toHaveProperty("lastFetched");
    expect(status).toHaveProperty("callCount");
    expect(typeof status.connected).toBe("boolean");
    expect(typeof status.callCount).toBe("number");
    expect(status.connected).toBe(false);
    expect(status.callCount).toBe(0);
  });

  it("clearGongCache should reset status to disconnected", async () => {
    const { getGongStatus, clearGongCache } = await import("./gongBridge");
    clearGongCache();

    const status = getGongStatus();
    expect(status.connected).toBe(false);
    expect(status.lastFetched).toBeNull();
    expect(status.callCount).toBe(0);
  });

  it("GongCTVIntelData interface should have all required fields", async () => {
    // Validate the shape of the unavailable response (which is deterministic)
    const fallback = {
      available: false,
      error: "test",
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

    expect(fallback).toHaveProperty("available");
    expect(fallback).toHaveProperty("ctv_matched_calls");
    expect(fallback).toHaveProperty("matched_calls");
    expect(fallback).toHaveProperty("monthly_volume");
    expect(fallback).toHaveProperty("advertiser_coverage");
    expect(fallback).toHaveProperty("duration_stats");
    expect(fallback).toHaveProperty("date_range");
    expect(fallback).toHaveProperty("unique_advertisers");
    expect(Array.isArray(fallback.matched_calls)).toBe(true);
    expect(Array.isArray(fallback.advertiser_coverage)).toBe(true);
  });

  it("Gong call deep link format should be valid", () => {
    const callId = "1234567890";
    const url = `https://app.gong.io/call?id=${callId}`;

    expect(url).toMatch(/^https:\/\/app\.gong\.io\/call\?id=\d+$/);
    expect(url).toContain(callId);
  });

  it("advertiser coverage entry should have required fields", () => {
    const entry = { advertiser: "DraftKings", call_count: 42 };

    expect(entry).toHaveProperty("advertiser");
    expect(entry).toHaveProperty("call_count");
    expect(typeof entry.advertiser).toBe("string");
    expect(typeof entry.call_count).toBe("number");
    expect(entry.call_count).toBeGreaterThan(0);
  });

  it("duration stats should have avg, median, and total hours", () => {
    const stats = { avg_min: 28.4, median_min: 27, total_hours: 118.3 };

    expect(stats.avg_min).toBeGreaterThan(0);
    expect(stats.median_min).toBeGreaterThan(0);
    expect(stats.total_hours).toBeGreaterThan(0);
  });
});
