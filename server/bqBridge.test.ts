import { describe, it, expect, beforeEach } from "vitest";

/**
 * Tests for the pure Node.js BigQuery bridge.
 * These tests validate the module's exports and live BQ connectivity.
 */
describe("bqBridge", () => {
  beforeEach(async () => {
    const mod = await import("./bqBridge");
    mod.clearBQCache();
  });

  it("should export fetchBQData, getBQStatus, and clearBQCache", async () => {
    const mod = await import("./bqBridge");
    expect(typeof mod.fetchBQData).toBe("function");
    expect(typeof mod.getBQStatus).toBe("function");
    expect(typeof mod.clearBQCache).toBe("function");
  });

  it("getBQStatus should return disconnected state when no data cached", async () => {
    const mod = await import("./bqBridge");
    mod.clearBQCache();
    const status = await mod.getBQStatus();
    expect(status.connected).toBe(false);
    expect(status.lastFetched).toBeNull();
    expect(status.cacheAge).toBe(-1);
    expect(status.dataRange).toBeNull();
  });

  it("clearBQCache should reset cache", async () => {
    const mod = await import("./bqBridge");
    mod.clearBQCache();
    const status = await mod.getBQStatus();
    expect(status.connected).toBe(false);
  });

  it("fetchBQData should return valid BQ data with correct shape", async () => {
    const mod = await import("./bqBridge");
    mod.clearBQCache();
    const result = await mod.fetchBQData(true);

    // If BQ credentials are available, we should get data
    if (result) {
      expect(result.source).toContain("BigQuery");
      expect(result.fallback).toBe(false);
      expect(result.fetched_at).toBeTruthy();
      expect(Array.isArray(result.summary)).toBe(true);
      expect(Array.isArray(result.trailing_7d)).toBe(true);
      expect(Array.isArray(result.monthly)).toBe(true);
      expect(Array.isArray(result.daily_recent)).toBe(true);
      expect(Array.isArray(result.top_advertisers)).toBe(true);
      expect(Array.isArray(result.exchanges)).toBe(true);
      expect(Array.isArray(result.concentration)).toBe(true);

      // Summary should have data
      if (result.summary.length > 0) {
        expect(result.summary[0].total_gas).toBeGreaterThan(0);
        expect(result.summary[0].total_campaigns).toBeGreaterThan(0);
        expect(result.summary[0].total_advertisers).toBeGreaterThan(0);
      }
    } else {
      // If BQ is not available (no credentials), result is null — acceptable
      console.log("[Test] BQ not available — skipping data shape assertions");
    }
  }, 30000);

  it("fetchBQData should return cached data on second call", async () => {
    const mod = await import("./bqBridge");
    mod.clearBQCache();

    const result1 = await mod.fetchBQData(true);
    if (!result1) {
      console.log("[Test] BQ not available — skipping cache test");
      return;
    }

    // Second call without forceRefresh — should use cache
    const result2 = await mod.fetchBQData(false);
    expect(result2).not.toBeNull();
    expect(result2!.fetched_at).toBe(result1.fetched_at);

    // Status should show connected
    const status = await mod.getBQStatus();
    expect(status.connected).toBe(true);
    expect(status.lastFetched).toBeTruthy();
    expect(status.cacheAge).toBeGreaterThanOrEqual(0);
  }, 30000);
});
