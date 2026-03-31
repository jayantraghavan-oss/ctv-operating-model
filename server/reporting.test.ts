import { describe, it, expect, beforeAll } from "vitest";

/**
 * Reporting module tests — validates the data aggregation layer
 * that powers the Business Intelligence dashboard.
 */

import { buildInsightsReport, type InsightsReport } from "./reporting";

let report: InsightsReport;

beforeAll(async () => {
  report = await buildInsightsReport();
}, 30_000);

describe("Reporting — buildInsightsReport", () => {
  it("returns a report with all required top-level fields", () => {
    expect(report).toHaveProperty("generatedAt");
    expect(report).toHaveProperty("revenue");
    expect(report).toHaveProperty("voiceOfCustomer");
    expect(report).toHaveProperty("repPulse");
    expect(report).toHaveProperty("gtmFunnel");
    expect(report).toHaveProperty("campaignHealth");
    expect(report).toHaveProperty("executiveSummary");
    expect(report).toHaveProperty("keyRisks");
    expect(report).toHaveProperty("keyWins");
    expect(report).toHaveProperty("recommendations");
  });

  it("generatedAt is a recent timestamp", () => {
    const now = Date.now();
    expect(report.generatedAt).toBeLessThanOrEqual(now);
    expect(report.generatedAt).toBeGreaterThan(now - 60_000);
  });

  it("executiveSummary is a non-empty string", () => {
    expect(typeof report.executiveSummary).toBe("string");
    expect(report.executiveSummary.length).toBeGreaterThan(10);
  });

  it("keyRisks, keyWins, recommendations are non-empty arrays of strings", () => {
    expect(Array.isArray(report.keyRisks)).toBe(true);
    expect(report.keyRisks.length).toBeGreaterThan(0);
    report.keyRisks.forEach((r) => expect(typeof r).toBe("string"));

    expect(Array.isArray(report.keyWins)).toBe(true);
    expect(report.keyWins.length).toBeGreaterThan(0);

    expect(Array.isArray(report.recommendations)).toBe(true);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });
});

// ── Revenue ──
describe("Reporting — Revenue", () => {
  it("has required revenue fields", () => {
    const { revenue } = report;
    expect(revenue).toHaveProperty("annualTarget");
    expect(revenue).toHaveProperty("closedWon");
    expect(revenue).toHaveProperty("pipelineTotal");
    expect(revenue).toHaveProperty("pipelineWeighted");
    expect(revenue).toHaveProperty("runRate");
    expect(revenue).toHaveProperty("gapToTarget");
    expect(revenue).toHaveProperty("onTrack");
    expect(revenue).toHaveProperty("confidence");
    expect(revenue).toHaveProperty("monthlyTrend");
    expect(revenue).toHaveProperty("byStage");
    expect(revenue).toHaveProperty("byRegion");
    expect(revenue).toHaveProperty("byVertical");
  });

  it("annualTarget is $10M", () => {
    expect(report.revenue.annualTarget).toBe(10_000_000);
  });

  it("gapToTarget = annualTarget - closedWon - pipelineWeighted", () => {
    expect(report.revenue.gapToTarget).toBe(
      report.revenue.annualTarget - report.revenue.closedWon - report.revenue.pipelineWeighted
    );
  });

  it("confidence is one of high/medium/low", () => {
    expect(["high", "medium", "low"]).toContain(report.revenue.confidence);
  });

  it("monthlyTrend has entries with month, closed, pipeline, target", () => {
    expect(report.revenue.monthlyTrend.length).toBeGreaterThan(0);
    const first = report.revenue.monthlyTrend[0];
    expect(first).toHaveProperty("month");
    expect(first).toHaveProperty("closed");
    expect(first).toHaveProperty("pipeline");
    expect(first).toHaveProperty("target");
  });

  it("byStage is an array (may be empty if no SFDC data)", () => {
    expect(Array.isArray(report.revenue.byStage)).toBe(true);
    if (report.revenue.byStage.length > 0) {
      const first = report.revenue.byStage[0];
      expect(first).toHaveProperty("stage");
      expect(first).toHaveProperty("count");
      expect(first).toHaveProperty("value");
      expect(first).toHaveProperty("weightedValue");
    }
  });

  it("byRegion entries have region, pipeline, closed", () => {
    expect(report.revenue.byRegion.length).toBeGreaterThan(0);
    const first = report.revenue.byRegion[0];
    expect(first).toHaveProperty("region");
    expect(first).toHaveProperty("pipeline");
    expect(first).toHaveProperty("closed");
  });

  it("byVertical entries have vertical, deals, pipeline", () => {
    expect(report.revenue.byVertical.length).toBeGreaterThan(0);
    const first = report.revenue.byVertical[0];
    expect(first).toHaveProperty("vertical");
    expect(first).toHaveProperty("deals");
    expect(first).toHaveProperty("pipeline");
  });
});

// ── Voice of Customer ──
describe("Reporting — Voice of Customer", () => {
  it("has required VoC fields", () => {
    const voc = report.voiceOfCustomer;
    expect(voc).toHaveProperty("totalCalls");
    expect(voc).toHaveProperty("period");
    expect(voc).toHaveProperty("sentimentBreakdown");
    expect(voc).toHaveProperty("topThemes");
    expect(voc).toHaveProperty("objections");
    expect(voc).toHaveProperty("competitorMentions");
    expect(voc).toHaveProperty("pitchLearnings");
  });

  it("sentimentBreakdown has positive, neutral, negative", () => {
    const sb = report.voiceOfCustomer.sentimentBreakdown;
    expect(sb).toHaveProperty("positive");
    expect(sb).toHaveProperty("neutral");
    expect(sb).toHaveProperty("negative");
  });

  it("sentiment counts sum to totalCalls", () => {
    const { positive, neutral, negative } = report.voiceOfCustomer.sentimentBreakdown;
    expect(positive + neutral + negative).toBe(report.voiceOfCustomer.totalCalls);
  });

  it("topThemes is an array (may be empty if no Gong data)", () => {
    expect(Array.isArray(report.voiceOfCustomer.topThemes)).toBe(true);
    if (report.voiceOfCustomer.topThemes.length > 0) {
      const first = report.voiceOfCustomer.topThemes[0];
      expect(first).toHaveProperty("theme");
      expect(first).toHaveProperty("count");
      expect(first).toHaveProperty("trend");
    }
  });

  it("objections is an array (may be empty if no Gong data)", () => {
    expect(Array.isArray(report.voiceOfCustomer.objections)).toBe(true);
    if (report.voiceOfCustomer.objections.length > 0) {
      const first = report.voiceOfCustomer.objections[0];
      expect(first).toHaveProperty("objection");
      expect(first).toHaveProperty("frequency");
      expect(first).toHaveProperty("winRateWhenRaised");
    }
  });

  it("competitorMentions entries have competitor, count", () => {
    expect(report.voiceOfCustomer.competitorMentions.length).toBeGreaterThan(0);
    const first = report.voiceOfCustomer.competitorMentions[0];
    expect(first).toHaveProperty("competitor");
    expect(first).toHaveProperty("count");
  });

  it("pitchLearnings entries have learning, source, date, actionable", () => {
    expect(report.voiceOfCustomer.pitchLearnings.length).toBeGreaterThan(0);
    const first = report.voiceOfCustomer.pitchLearnings[0];
    expect(first).toHaveProperty("learning");
    expect(first).toHaveProperty("source");
    expect(first).toHaveProperty("date");
    expect(first).toHaveProperty("actionable");
  });
});

// ── Rep Pulse ──
describe("Reporting — Rep Pulse", () => {
  it("has required repPulse fields", () => {
    const rp = report.repPulse;
    expect(rp).toHaveProperty("totalReps");
    expect(rp).toHaveProperty("activeReps");
    expect(rp).toHaveProperty("avgCallsPerWeek");
    expect(rp).toHaveProperty("avgDealCycledays");
    expect(rp).toHaveProperty("morale");
    expect(rp).toHaveProperty("moraleSignals");
    expect(rp).toHaveProperty("activityTrend");
    expect(rp).toHaveProperty("slackSentiment");
    expect(rp).toHaveProperty("trainingGaps");
  });

  it("activeReps <= totalReps", () => {
    expect(report.repPulse.activeReps).toBeLessThanOrEqual(report.repPulse.totalReps);
  });

  it("morale is one of high/medium/low", () => {
    expect(["high", "medium", "low"]).toContain(report.repPulse.morale);
  });

  it("moraleSignals have signal, sentiment, source", () => {
    expect(report.repPulse.moraleSignals.length).toBeGreaterThan(0);
    const first = report.repPulse.moraleSignals[0];
    expect(first).toHaveProperty("signal");
    expect(first).toHaveProperty("sentiment");
    expect(first).toHaveProperty("source");
  });

  it("activityTrend entries have week, calls, meetings", () => {
    expect(report.repPulse.activityTrend.length).toBeGreaterThan(0);
    const first = report.repPulse.activityTrend[0];
    expect(first).toHaveProperty("week");
    expect(first).toHaveProperty("calls");
    expect(first).toHaveProperty("meetings");
  });

  it("slackSentiment entries have channel, sentiment, messageCount, topTopics", () => {
    expect(report.repPulse.slackSentiment.length).toBeGreaterThan(0);
    const first = report.repPulse.slackSentiment[0];
    expect(first).toHaveProperty("channel");
    expect(first).toHaveProperty("sentiment");
    expect(first).toHaveProperty("messageCount");
    expect(first).toHaveProperty("topTopics");
    expect(Array.isArray(first.topTopics)).toBe(true);
  });

  it("trainingGaps entries have topic, repsNeedingTraining, priority", () => {
    expect(report.repPulse.trainingGaps.length).toBeGreaterThan(0);
    const first = report.repPulse.trainingGaps[0];
    expect(first).toHaveProperty("topic");
    expect(first).toHaveProperty("repsNeedingTraining");
    expect(first).toHaveProperty("priority");
  });
});

// ── GTM Funnel ──
describe("Reporting — GTM Funnel", () => {
  it("has required gtmFunnel fields", () => {
    const f = report.gtmFunnel;
    expect(f).toHaveProperty("stages");
    expect(f).toHaveProperty("funnelHealth");
    expect(f).toHaveProperty("bottleneckStage");
    expect(f).toHaveProperty("testToScaleRate");
    expect(f).toHaveProperty("avgTestDuration");
    expect(f).toHaveProperty("customerPersonas");
  });

  it("funnelHealth is one of healthy/bottleneck/leaking", () => {
    expect(["healthy", "bottleneck", "leaking"]).toContain(report.gtmFunnel.funnelHealth);
  });

  it("stages has 5 entries", () => {
    expect(report.gtmFunnel.stages.length).toBe(5);
    const first = report.gtmFunnel.stages[0];
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("count");
    expect(first).toHaveProperty("value");
    expect(first).toHaveProperty("conversionRate");
  });

  it("testToScaleRate is between 0 and 1", () => {
    expect(report.gtmFunnel.testToScaleRate).toBeGreaterThanOrEqual(0);
    expect(report.gtmFunnel.testToScaleRate).toBeLessThanOrEqual(1);
  });

  it("customerPersonas have persona, count, winRate", () => {
    expect(report.gtmFunnel.customerPersonas.length).toBeGreaterThan(0);
    const first = report.gtmFunnel.customerPersonas[0];
    expect(first).toHaveProperty("persona");
    expect(first).toHaveProperty("count");
    expect(first).toHaveProperty("winRate");
  });
});

// ── Campaign Health ──
describe("Reporting — Campaign Health", () => {
  it("has required campaignHealth fields", () => {
    const ch = report.campaignHealth;
    expect(ch).toHaveProperty("activeCampaigns");
    expect(ch).toHaveProperty("inTest");
    expect(ch).toHaveProperty("scaled");
    expect(ch).toHaveProperty("avgHealthScore");
    expect(ch).toHaveProperty("alerts");
    expect(ch).toHaveProperty("campaigns");
  });

  it("activeCampaigns >= inTest + scaled", () => {
    expect(report.campaignHealth.activeCampaigns).toBeGreaterThanOrEqual(
      report.campaignHealth.inTest + report.campaignHealth.scaled
    );
  });

  it("avgHealthScore is between 0 and 100", () => {
    expect(report.campaignHealth.avgHealthScore).toBeGreaterThanOrEqual(0);
    expect(report.campaignHealth.avgHealthScore).toBeLessThanOrEqual(100);
  });

  it("alerts have type, message, date", () => {
    // alerts may be empty if no campaigns, so check structure only if present
    if (report.campaignHealth.alerts.length > 0) {
      const first = report.campaignHealth.alerts[0];
      expect(first).toHaveProperty("type");
      expect(first).toHaveProperty("message");
      expect(first).toHaveProperty("date");
    }
  });

  it("campaigns have customer, stage, healthScore, spend, kpiPerformance, sentiment, nextStep, daysActive", () => {
    if (report.campaignHealth.campaigns.length > 0) {
      const first = report.campaignHealth.campaigns[0];
      expect(first).toHaveProperty("customer");
      expect(first).toHaveProperty("stage");
      expect(first).toHaveProperty("healthScore");
      expect(first).toHaveProperty("spend");
      expect(first).toHaveProperty("kpiPerformance");
      expect(first).toHaveProperty("sentiment");
      expect(first).toHaveProperty("nextStep");
      expect(first).toHaveProperty("daysActive");
    }
  });
});
