import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process to avoid actually calling Python
vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

describe("bqBridge", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
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

  it("fetchBQData should return null when Python script fails", async () => {
    const { execFile } = await import("child_process");
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation(
      (_cmd: any, _args: any, _opts: any, callback: any) => {
        callback(new Error("Python not found"), "", "");
        return {} as any;
      }
    );

    const mod = await import("./bqBridge");
    mod.clearBQCache();
    const result = await mod.fetchBQData(true);
    expect(result).toBeNull();
  });

  it("fetchBQData should parse valid BQ JSON output", async () => {
    const mockData = {
      summary: [
        {
          total_gas: "15859106.91",
          avg_daily_gas: "87137.95",
          total_campaigns: 135,
          total_advertisers: 62,
          min_date: "2025-10-01",
          max_date: "2026-03-31",
          total_days: 182,
        },
      ],
      trailing_7d: [
        {
          trailing_7d_daily: "207500.27",
          trailing_7d_total: "1452501.86",
          active_campaigns_7d: 51,
          active_advertisers_7d: 27,
          period_start: "2026-03-25",
          period_end: "2026-03-31",
        },
      ],
      monthly: [],
      daily_recent: [],
      top_advertisers: [],
      exchanges: [],
      concentration: [],
      fetched_at: "2026-03-31T20:00:00Z",
      source: "BigQuery",
      fallback: false,
    };

    const { execFile } = await import("child_process");
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation(
      (_cmd: any, _args: any, _opts: any, callback: any) => {
        callback(null, JSON.stringify(mockData), "");
        return {} as any;
      }
    );

    const mod = await import("./bqBridge");
    mod.clearBQCache();
    const result = await mod.fetchBQData(true);

    expect(result).not.toBeNull();
    expect(result!.summary[0].total_gas).toBeCloseTo(15859106.91, 1);
    expect(result!.trailing_7d[0].trailing_7d_daily).toBeCloseTo(207500.27, 1);
    expect(result!.source).toBe("BigQuery");
    expect(result!.fallback).toBe(false);
  });

  it("fetchBQData should return cached data on second call", async () => {
    const mockData = {
      summary: [
        {
          total_gas: "100000",
          avg_daily_gas: "1000",
          total_campaigns: 10,
          total_advertisers: 5,
          min_date: "2025-10-01",
          max_date: "2026-03-31",
          total_days: 182,
        },
      ],
      trailing_7d: [],
      monthly: [],
      daily_recent: [],
      top_advertisers: [],
      exchanges: [],
      concentration: [],
      fetched_at: "2026-03-31T20:00:00Z",
      source: "BigQuery",
      fallback: false,
    };

    const { execFile } = await import("child_process");
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation(
      (_cmd: any, _args: any, _opts: any, callback: any) => {
        callback(null, JSON.stringify(mockData), "");
        return {} as any;
      }
    );

    const mod = await import("./bqBridge");
    mod.clearBQCache();

    // First call - should invoke Python
    const result1 = await mod.fetchBQData(true);
    expect(result1).not.toBeNull();

    // Second call without forceRefresh - should use cache
    const result2 = await mod.fetchBQData(false);
    expect(result2).not.toBeNull();
    expect(result2!.summary[0].total_gas).toBe(result1!.summary[0].total_gas);

    // execFile should have been called only once (first call)
    // Second call uses cache
    expect(mockExecFile).toHaveBeenCalledTimes(1);
  });

  it("fetchBQData should return null when BQ returns fallback data", async () => {
    const mockData = {
      error: "No ADC credentials",
      fallback: true,
    };

    const { execFile } = await import("child_process");
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation(
      (_cmd: any, _args: any, _opts: any, callback: any) => {
        callback(null, JSON.stringify(mockData), "");
        return {} as any;
      }
    );

    const mod = await import("./bqBridge");
    mod.clearBQCache();
    const result = await mod.fetchBQData(true);
    expect(result).toBeNull();
  });
});
