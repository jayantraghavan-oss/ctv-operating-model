import { describe, it, expect, beforeAll } from "vitest";

/**
 * Business Insights endpoint test — validates the CTV Business Insights
 * report that aggregates BQ, SFDC, Gong, Slack, and curated data.
 *
 * This test calls the actual endpoint (which hits live data sources),
 * so it has a long timeout.
 */

const BASE = "http://localhost:3000/api/trpc";

interface BusinessInsightsData {
  generatedAt: string;
  revenue: {
    arrPacing: {
      target: number;
      currentARR: number;
      ytdGAS: number;
      dailyRunRate: number;
      trailing7dDaily: number;
      monthlyTrend: { month: string; gas: number }[];
      projectedEOY: number;
      gapToTarget: number;
      pctOfTarget: number;
      acceleration: number;
      confidence: string;
      confidenceRationale: string;
      dataWindow: { start: string; end: string; totalDays: number };
    };
    pipeline: {
      available: boolean;
      openPipeline: number;
      openDeals: number;
      weightedPipeline: number;
      winRate: number;
      closedWon: number;
      closedLost: number;
      byStage: { stage: string; count: number; value: number }[];
      forecastScenarios: { conservative: number; base: number; optimistic: number };
    };
    risksAndOpportunities: {
      id: string;
      type: "risk" | "opportunity";
      title: string;
      description: string;
      impact: string;
      confidence: string;
      source: string;
      sourceType: string;
    }[];
    topAdvertisers: { name: string; gas: number }[];
    concentration: { advertiser: string; gas: number; pctOfTotal: number }[];
    lastRefreshed: string;
  };
  customerIntel: {
    signals: {
      id: string;
      type: string;
      title: string;
      summary: string;
      sentiment: string;
      verifyUrl?: string;
      source: string;
    }[];
    themes: {
      theme: string;
      count: number;
      sentiment: string;
      trend: string;
      description: string;
    }[];
    weekOverWeek: {
      metric: string;
      thisWeek: number;
      lastWeek: number;
      overall: number;
      change: number;
    }[];
    sentimentBreakdown: { positive: number; negative: number; neutral: number; mixed: number };
    totalGongCalls: number;
    totalSlackSignals: number;
    lastRefreshed: string;
  };
  salesCoaching: {
    coachingInsights: {
      id: string;
      area: string;
      description: string;
      priority: string;
      repsAffected: number;
      suggestedAction: string;
    }[];
    repPerformance: {
      name: string;
      closedValue: number;
      pipelineValue: number;
      winRate: number;
    }[];
    winLossBehaviors: {
      behavior: string;
      type: string;
      impact: string;
    }[];
    overallWinRate: number;
    avgDealCycle: number;
    testToScaleRate: number;
    activityTrend: { week: string; calls: number }[];
    lastRefreshed: string;
  };
  market: {
    competitors: {
      name: string;
      winsAgainst: number;
      lossesAgainst: number;
      netPosition: string;
      keyDifferentiator: string;
    }[];
    competitiveSignals: {
      signal: string;
      source: string;
      urgency: string;
    }[];
    marketTrends: {
      trend: string;
      direction: string;
      relevance: string;
    }[];
    molocoAdvantages: { advantage: string; evidence: string }[];
    molocoVulnerabilities: { vulnerability: string; threat: string; mitigation: string }[];
    tamEstimate: { segment: string; tam: number }[];
    lastRefreshed: string;
  };
  dataSources: {
    bq: { connected: boolean };
    sfdc: { connected: boolean; deals: number };
    gong: { connected: boolean; calls: number };
    slack: { connected: boolean; channels: number };
    curated: { connected: boolean; records: number };
  };
}

let data: BusinessInsightsData;

beforeAll(async () => {
  const res = await fetch(`${BASE}/reporting.businessInsights`);
  const raw = await res.json();
  // tRPC + superjson wraps the response
  data = raw.result?.data?.json ?? raw.result?.data ?? raw;
}, 120_000);

// ── Top-level structure ──
describe("Business Insights — Top-level structure", () => {
  it("returns a report with all 4 sections + dataSources", () => {
    expect(data).toHaveProperty("generatedAt");
    expect(data).toHaveProperty("revenue");
    expect(data).toHaveProperty("customerIntel");
    expect(data).toHaveProperty("salesCoaching");
    expect(data).toHaveProperty("market");
    expect(data).toHaveProperty("dataSources");
  });

  it("generatedAt is a valid ISO timestamp", () => {
    expect(typeof data.generatedAt).toBe("string");
    expect(new Date(data.generatedAt).getTime()).toBeGreaterThan(0);
  });

  it("dataSources shows connection status for all 5 sources", () => {
    const ds = data.dataSources;
    expect(ds).toHaveProperty("bq");
    expect(ds).toHaveProperty("sfdc");
    expect(ds).toHaveProperty("gong");
    expect(ds).toHaveProperty("slack");
    expect(ds).toHaveProperty("curated");
    expect(typeof ds.bq.connected).toBe("boolean");
    expect(typeof ds.sfdc.connected).toBe("boolean");
    expect(typeof ds.gong.connected).toBe("boolean");
    expect(typeof ds.slack.connected).toBe("boolean");
    expect(typeof ds.curated.connected).toBe("boolean");
  });
});

// ── Section 1: Revenue & ARR ──
describe("Section 1 — Revenue & ARR Pacing", () => {
  it("has ARR pacing with $100M target", () => {
    const arr = data.revenue.arrPacing;
    expect(arr.target).toBe(100_000_000);
  });

  it("has required ARR pacing fields", () => {
    const arr = data.revenue.arrPacing;
    expect(typeof arr.currentARR).toBe("number");
    expect(typeof arr.ytdGAS).toBe("number");
    expect(typeof arr.dailyRunRate).toBe("number");
    expect(typeof arr.trailing7dDaily).toBe("number");
    expect(typeof arr.projectedEOY).toBe("number");
    expect(typeof arr.gapToTarget).toBe("number");
    expect(typeof arr.pctOfTarget).toBe("number");
    expect(typeof arr.acceleration).toBe("number");
    expect(["high", "medium", "low"]).toContain(arr.confidence);
    expect(typeof arr.confidenceRationale).toBe("string");
    expect(arr.confidenceRationale.length).toBeGreaterThan(10);
  });

  it("has monthly trend data", () => {
    const trend = data.revenue.arrPacing.monthlyTrend;
    expect(Array.isArray(trend)).toBe(true);
    expect(trend.length).toBeGreaterThan(0);
    const first = trend[0];
    expect(typeof first.month).toBe("string");
    expect(typeof first.gas).toBe("number");
  });

  it("has data window with start/end dates", () => {
    const dw = data.revenue.arrPacing.dataWindow;
    expect(typeof dw.start).toBe("string");
    expect(typeof dw.end).toBe("string");
    expect(typeof dw.totalDays).toBe("number");
    expect(dw.totalDays).toBeGreaterThan(0);
  });

  it("has pipeline forecast", () => {
    const p = data.revenue.pipeline;
    expect(typeof p.available).toBe("boolean");
    expect(typeof p.openPipeline).toBe("number");
    expect(typeof p.openDeals).toBe("number");
    expect(typeof p.winRate).toBe("number");
    expect(typeof p.closedWon).toBe("number");
  });

  it("has forecast scenarios when pipeline is available", () => {
    const p = data.revenue.pipeline;
    if (p.available) {
      expect(typeof p.forecastScenarios.conservative).toBe("number");
      expect(typeof p.forecastScenarios.base).toBe("number");
      expect(typeof p.forecastScenarios.optimistic).toBe("number");
      expect(p.forecastScenarios.conservative).toBeLessThanOrEqual(p.forecastScenarios.base);
      expect(p.forecastScenarios.base).toBeLessThanOrEqual(p.forecastScenarios.optimistic);
    }
  });

  it("has risks and opportunities", () => {
    const ro = data.revenue.risksAndOpportunities;
    expect(Array.isArray(ro)).toBe(true);
    expect(ro.length).toBeGreaterThan(0);
    const first = ro[0];
    expect(["risk", "opportunity"]).toContain(first.type);
    expect(typeof first.title).toBe("string");
    expect(typeof first.description).toBe("string");
    expect(["high", "medium", "low"]).toContain(first.impact);
    expect(typeof first.source).toBe("string");
    expect(typeof first.sourceType).toBe("string");
  });

  it("has top advertisers", () => {
    const ta = data.revenue.topAdvertisers;
    expect(Array.isArray(ta)).toBe(true);
    expect(ta.length).toBeGreaterThan(0);
    expect(typeof ta[0].name).toBe("string");
    expect(typeof ta[0].gas).toBe("number");
  });

  it("has concentration data", () => {
    const c = data.revenue.concentration;
    expect(Array.isArray(c)).toBe(true);
    expect(c.length).toBeGreaterThan(0);
    expect(typeof c[0].advertiser).toBe("string");
    expect(typeof c[0].pctOfTotal).toBe("number");
  });
});

// ── Section 2: Customer Intelligence ──
describe("Section 2 — Customer Intelligence", () => {
  it("has customer signals from Gong", () => {
    const signals = data.customerIntel.signals;
    expect(Array.isArray(signals)).toBe(true);
    expect(signals.length).toBeGreaterThan(0);
    const first = signals[0];
    expect(typeof first.id).toBe("string");
    expect(typeof first.title).toBe("string");
    expect(typeof first.summary).toBe("string");
    expect(["positive", "negative", "neutral", "mixed"]).toContain(first.sentiment);
    expect(typeof first.source).toBe("string");
  });

  it("signals have verifiable URLs", () => {
    const gongSignals = data.customerIntel.signals.filter(
      (s) => s.type === "gong_call" && s.verifyUrl
    );
    // At least some Gong calls should have verify URLs
    if (data.dataSources.gong.connected) {
      expect(gongSignals.length).toBeGreaterThan(0);
      expect(gongSignals[0].verifyUrl).toMatch(/^https?:\/\//);
    }
  });

  it("has sentiment themes", () => {
    const themes = data.customerIntel.themes;
    expect(Array.isArray(themes)).toBe(true);
    expect(themes.length).toBeGreaterThan(0);
    const first = themes[0];
    expect(typeof first.theme).toBe("string");
    expect(typeof first.count).toBe("number");
    expect(["positive", "negative", "neutral", "mixed"]).toContain(first.sentiment);
    expect(["up", "down", "flat"]).toContain(first.trend);
  });

  it("has week-over-week trends", () => {
    const wow = data.customerIntel.weekOverWeek;
    expect(Array.isArray(wow)).toBe(true);
    expect(wow.length).toBeGreaterThan(0);
    const first = wow[0];
    expect(typeof first.metric).toBe("string");
    expect(typeof first.thisWeek).toBe("number");
    expect(typeof first.lastWeek).toBe("number");
    expect(typeof first.overall).toBe("number");
  });

  it("has sentiment breakdown", () => {
    const sb = data.customerIntel.sentimentBreakdown;
    expect(typeof sb.positive).toBe("number");
    expect(typeof sb.negative).toBe("number");
    expect(typeof sb.neutral).toBe("number");
    expect(typeof sb.mixed).toBe("number");
  });

  it("has Gong call count", () => {
    expect(typeof data.customerIntel.totalGongCalls).toBe("number");
    if (data.dataSources.gong.connected) {
      expect(data.customerIntel.totalGongCalls).toBeGreaterThan(0);
    }
  });
});

// ── Section 3: Sales Coaching ──
describe("Section 3 — Sales Coaching", () => {
  it("has coaching insights", () => {
    const ci = data.salesCoaching.coachingInsights;
    expect(Array.isArray(ci)).toBe(true);
    expect(ci.length).toBeGreaterThan(0);
    const first = ci[0];
    expect(typeof first.area).toBe("string");
    expect(typeof first.description).toBe("string");
    expect(["high", "medium", "low"]).toContain(first.priority);
    expect(typeof first.repsAffected).toBe("number");
    expect(typeof first.suggestedAction).toBe("string");
  });

  it("has rep performance data", () => {
    const rp = data.salesCoaching.repPerformance;
    expect(Array.isArray(rp)).toBe(true);
    expect(rp.length).toBeGreaterThan(0);
    const first = rp[0];
    expect(typeof first.name).toBe("string");
    expect(typeof first.closedValue).toBe("number");
    expect(typeof first.pipelineValue).toBe("number");
    expect(typeof first.winRate).toBe("number");
  });

  it("has win/loss behaviors", () => {
    const wlb = data.salesCoaching.winLossBehaviors;
    expect(Array.isArray(wlb)).toBe(true);
    expect(wlb.length).toBeGreaterThan(0);
    const first = wlb[0];
    expect(typeof first.behavior).toBe("string");
    expect(["winning", "losing"]).toContain(first.type);
    expect(typeof first.impact).toBe("string");
  });

  it("has overall metrics", () => {
    expect(typeof data.salesCoaching.overallWinRate).toBe("number");
    expect(data.salesCoaching.overallWinRate).toBeGreaterThanOrEqual(0);
    expect(data.salesCoaching.overallWinRate).toBeLessThanOrEqual(1);
    expect(typeof data.salesCoaching.avgDealCycle).toBe("number");
    expect(data.salesCoaching.avgDealCycle).toBeGreaterThan(0);
    expect(typeof data.salesCoaching.testToScaleRate).toBe("number");
  });

  it("has activity trend", () => {
    const at = data.salesCoaching.activityTrend;
    expect(Array.isArray(at)).toBe(true);
    expect(at.length).toBeGreaterThan(0);
    const first = at[0];
    expect(typeof first.week).toBe("string");
    expect(typeof first.calls).toBe("number");
  });
});

// ── Section 4: Market & Competitive ──
describe("Section 4 — Market & Competitive", () => {
  it("has competitor profiles", () => {
    const comp = data.market.competitors;
    expect(Array.isArray(comp)).toBe(true);
    expect(comp.length).toBeGreaterThan(0);
    const first = comp[0];
    expect(typeof first.name).toBe("string");
    expect(typeof first.winsAgainst).toBe("number");
    expect(typeof first.lossesAgainst).toBe("number");
    expect(typeof first.netPosition).toBe("string");
    expect(typeof first.keyDifferentiator).toBe("string");
  });

  it("has market trends", () => {
    const mt = data.market.marketTrends;
    expect(Array.isArray(mt)).toBe(true);
    expect(mt.length).toBeGreaterThan(0);
    const first = mt[0];
    expect(typeof first.trend).toBe("string");
    expect(["accelerating", "decelerating", "stable"]).toContain(first.direction);
    expect(typeof first.relevance).toBe("string");
  });

  it("has TAM estimates", () => {
    const tam = data.market.tamEstimate;
    expect(Array.isArray(tam)).toBe(true);
    expect(tam.length).toBeGreaterThan(0);
    const first = tam[0];
    expect(typeof first.segment).toBe("string");
    expect(typeof first.tam).toBe("number");
    expect(first.tam).toBeGreaterThan(0);
  });

  it("has Moloco advantages and vulnerabilities", () => {
    expect(data.market.molocoAdvantages.length).toBeGreaterThan(0);
    expect(typeof data.market.molocoAdvantages[0].advantage).toBe("string");
    expect(typeof data.market.molocoAdvantages[0].evidence).toBe("string");

    expect(data.market.molocoVulnerabilities.length).toBeGreaterThan(0);
    expect(typeof data.market.molocoVulnerabilities[0].vulnerability).toBe("string");
    expect(typeof data.market.molocoVulnerabilities[0].mitigation).toBe("string");
  });
});
