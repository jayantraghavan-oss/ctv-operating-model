import { describe, it, expect, beforeAll } from "vitest";

/**
 * Reporting module tests — validates the 4-question strategic intelligence
 * data model that powers the CTV Reporting dashboard.
 *
 * Q1: Are we on track to hit $100M ARR?
 * Q2: What are our customers actually telling us?
 * Q3: What separates winning behaviors from losing ones?
 * Q4: How are we positioned in the market?
 */

import { buildInsightsReport, type InsightsReport } from "./reporting";

let report: InsightsReport;

beforeAll(async () => {
  report = await buildInsightsReport();
}, 120_000);

// ── Top-level structure ──
describe("Reporting — Top-level structure", () => {
  it("returns a report with all 4 strategic question sections", () => {
    expect(report).toHaveProperty("generatedAt");
    expect(report).toHaveProperty("revenueTrajectory");
    expect(report).toHaveProperty("customerVoice");
    expect(report).toHaveProperty("winLossPatterns");
    expect(report).toHaveProperty("marketPosition");
    expect(report).toHaveProperty("executiveSummary");
    expect(report).toHaveProperty("keyRisks");
    expect(report).toHaveProperty("keyOpportunities");
    expect(report).toHaveProperty("openQuestions");
    expect(report).toHaveProperty("liveDataStatus");
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

  it("keyRisks, keyOpportunities, openQuestions are non-empty arrays", () => {
    expect(Array.isArray(report.keyRisks)).toBe(true);
    expect(report.keyRisks.length).toBeGreaterThan(0);
    report.keyRisks.forEach((r) => expect(typeof r).toBe("string"));

    expect(Array.isArray(report.keyOpportunities)).toBe(true);
    expect(report.keyOpportunities.length).toBeGreaterThan(0);

    expect(Array.isArray(report.openQuestions)).toBe(true);
    expect(report.openQuestions.length).toBeGreaterThan(0);
  });
});

// ── Q1: Revenue Trajectory ──
describe("Q1 — Revenue Trajectory", () => {
  it("has required revenue fields", () => {
    const rev = report.revenueTrajectory;
    expect(rev).toHaveProperty("annualTarget");
    expect(rev).toHaveProperty("ctvContributionTarget");
    expect(rev).toHaveProperty("closedWon");
    expect(rev).toHaveProperty("pipelineTotal");
    expect(rev).toHaveProperty("pipelineWeighted");
    expect(rev).toHaveProperty("gapToTarget");
    expect(rev).toHaveProperty("onTrack");
    expect(rev).toHaveProperty("confidence");
    expect(rev).toHaveProperty("confidenceRationale");
    expect(rev).toHaveProperty("dataMaturity");
    expect(rev).toHaveProperty("monthlyTrend");
    expect(rev).toHaveProperty("byStage");
    expect(rev).toHaveProperty("byRegion");
    expect(rev).toHaveProperty("earlySignals");
  });

  it("annualTarget is $100M", () => {
    expect(report.revenueTrajectory.annualTarget).toBe(100_000_000);
  });

  it("ctvContributionTarget is $10M", () => {
    expect(report.revenueTrajectory.ctvContributionTarget).toBe(10_000_000);
  });

  it("gapToTarget = ctvContributionTarget - closedWon - pipelineWeighted", () => {
    const rev = report.revenueTrajectory;
    expect(rev.gapToTarget).toBe(
      rev.ctvContributionTarget - rev.closedWon - rev.pipelineWeighted
    );
  });

  it("confidence is one of high/medium/low", () => {
    expect(["high", "medium", "low"]).toContain(report.revenueTrajectory.confidence);
  });

  it("monthlyTrend has entries with month, closed, pipeline, target", () => {
    expect(report.revenueTrajectory.monthlyTrend.length).toBeGreaterThan(0);
    const first = report.revenueTrajectory.monthlyTrend[0];
    expect(first).toHaveProperty("month");
    expect(first).toHaveProperty("closed");
    expect(first).toHaveProperty("pipeline");
    expect(first).toHaveProperty("target");
  });

  it("byStage entries have stage, count, value, weightedValue", () => {
    expect(Array.isArray(report.revenueTrajectory.byStage)).toBe(true);
    if (report.revenueTrajectory.byStage.length > 0) {
      const first = report.revenueTrajectory.byStage[0];
      expect(first).toHaveProperty("stage");
      expect(first).toHaveProperty("count");
      expect(first).toHaveProperty("value");
      expect(first).toHaveProperty("weightedValue");
    }
  });

  it("byRegion entries have region, pipeline, closed", () => {
    expect(report.revenueTrajectory.byRegion.length).toBeGreaterThan(0);
    const first = report.revenueTrajectory.byRegion[0];
    expect(first).toHaveProperty("region");
    expect(first).toHaveProperty("pipeline");
    expect(first).toHaveProperty("closed");
  });

  it("earlySignals have signal, type, confidence, source", () => {
    expect(report.revenueTrajectory.earlySignals.length).toBeGreaterThan(0);
    const first = report.revenueTrajectory.earlySignals[0];
    expect(first).toHaveProperty("signal");
    expect(first).toHaveProperty("type");
    expect(first).toHaveProperty("confidence");
    expect(first).toHaveProperty("source");
  });
});

// ── Q2: Customer Voice ──
describe("Q2 — Customer Voice", () => {
  it("has required customer voice fields", () => {
    const cv = report.customerVoice;
    expect(cv).toHaveProperty("totalCalls");
    expect(cv).toHaveProperty("period");
    expect(cv).toHaveProperty("sentimentBreakdown");
    expect(cv).toHaveProperty("sentimentTrend");
    expect(cv).toHaveProperty("topThemes");
    expect(cv).toHaveProperty("objections");
    expect(cv).toHaveProperty("competitorMentions");
    expect(cv).toHaveProperty("topQuotes");
    expect(cv).toHaveProperty("experimentalInsights");
    expect(cv).toHaveProperty("dataMaturity");
  });

  it("sentimentBreakdown has positive, neutral, negative", () => {
    const sb = report.customerVoice.sentimentBreakdown;
    expect(sb).toHaveProperty("positive");
    expect(sb).toHaveProperty("neutral");
    expect(sb).toHaveProperty("negative");
  });

  it("sentiment counts sum to totalCalls", () => {
    const { positive, neutral, negative } = report.customerVoice.sentimentBreakdown;
    expect(positive + neutral + negative).toBe(report.customerVoice.totalCalls);
  });

  it("sentimentTrend entries have week, positive, neutral, negative", () => {
    expect(report.customerVoice.sentimentTrend.length).toBeGreaterThan(0);
    const first = report.customerVoice.sentimentTrend[0];
    expect(first).toHaveProperty("week");
    expect(first).toHaveProperty("positive");
    expect(first).toHaveProperty("neutral");
    expect(first).toHaveProperty("negative");
  });

  it("topThemes entries have theme, count, trend, implication", () => {
    expect(report.customerVoice.topThemes.length).toBeGreaterThan(0);
    const first = report.customerVoice.topThemes[0];
    expect(first).toHaveProperty("theme");
    expect(first).toHaveProperty("count");
    expect(first).toHaveProperty("trend");
    expect(first).toHaveProperty("implication");
  });

  it("objections entries have objection, frequency, winRateWhenRaised, bestResponse", () => {
    expect(report.customerVoice.objections.length).toBeGreaterThan(0);
    const first = report.customerVoice.objections[0];
    expect(first).toHaveProperty("objection");
    expect(first).toHaveProperty("frequency");
    expect(first).toHaveProperty("winRateWhenRaised");
    expect(first).toHaveProperty("bestResponse");
  });

  it("competitorMentions entries have competitor, count, context, threatLevel", () => {
    expect(report.customerVoice.competitorMentions.length).toBeGreaterThan(0);
    const first = report.customerVoice.competitorMentions[0];
    expect(first).toHaveProperty("competitor");
    expect(first).toHaveProperty("count");
    expect(first).toHaveProperty("context");
    expect(first).toHaveProperty("threatLevel");
  });

  it("topQuotes entries have quote, customer, sentiment, date", () => {
    expect(report.customerVoice.topQuotes.length).toBeGreaterThan(0);
    const first = report.customerVoice.topQuotes[0];
    expect(first).toHaveProperty("quote");
    expect(first).toHaveProperty("customer");
    expect(first).toHaveProperty("sentiment");
    expect(first).toHaveProperty("date");
  });

  it("experimentalInsights is a non-empty array of strings", () => {
    expect(Array.isArray(report.customerVoice.experimentalInsights)).toBe(true);
    expect(report.customerVoice.experimentalInsights.length).toBeGreaterThan(0);
    report.customerVoice.experimentalInsights.forEach((s: string) =>
      expect(typeof s).toBe("string")
    );
  });
});

// ── Q3: Win/Loss Patterns ──
describe("Q3 — Win/Loss Patterns", () => {
  it("has required win/loss fields", () => {
    const wl = report.winLossPatterns;
    expect(wl).toHaveProperty("winRate");
    expect(wl).toHaveProperty("avgDealCycleDays");
    expect(wl).toHaveProperty("testToScaleRate");
    expect(wl).toHaveProperty("winningBehaviors");
    expect(wl).toHaveProperty("losingPatterns");
    expect(wl).toHaveProperty("testToScaleDrivers");
    expect(wl).toHaveProperty("repLeaderboard");
    expect(wl).toHaveProperty("coachingOpportunities");
    expect(wl).toHaveProperty("activityTrend");
    expect(wl).toHaveProperty("dataMaturity");
  });

  it("winRate is between 0 and 1", () => {
    expect(report.winLossPatterns.winRate).toBeGreaterThanOrEqual(0);
    expect(report.winLossPatterns.winRate).toBeLessThanOrEqual(1);
  });

  it("testToScaleRate is between 0 and 1", () => {
    expect(report.winLossPatterns.testToScaleRate).toBeGreaterThanOrEqual(0);
    expect(report.winLossPatterns.testToScaleRate).toBeLessThanOrEqual(1);
  });

  it("winningBehaviors entries have behavior, impact, evidence, confidence", () => {
    expect(report.winLossPatterns.winningBehaviors.length).toBeGreaterThan(0);
    const first = report.winLossPatterns.winningBehaviors[0];
    expect(first).toHaveProperty("behavior");
    expect(first).toHaveProperty("impact");
    expect(first).toHaveProperty("evidence");
    expect(first).toHaveProperty("confidence");
  });

  it("losingPatterns entries have pattern, frequency, impact, evidence", () => {
    expect(report.winLossPatterns.losingPatterns.length).toBeGreaterThan(0);
    const first = report.winLossPatterns.losingPatterns[0];
    expect(first).toHaveProperty("pattern");
    expect(first).toHaveProperty("frequency");
    expect(first).toHaveProperty("impact");
    expect(first).toHaveProperty("evidence");
  });

  it("testToScaleDrivers entries have driver, correlation, evidence", () => {
    expect(report.winLossPatterns.testToScaleDrivers.length).toBeGreaterThan(0);
    const first = report.winLossPatterns.testToScaleDrivers[0];
    expect(first).toHaveProperty("driver");
    expect(first).toHaveProperty("correlation");
    expect(first).toHaveProperty("evidence");
  });

  it("repLeaderboard entries have name, closedValue, pipelineValue, winRate, avgCycleDays, topStrength", () => {
    expect(report.winLossPatterns.repLeaderboard.length).toBeGreaterThan(0);
    const first = report.winLossPatterns.repLeaderboard[0];
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("closedValue");
    expect(first).toHaveProperty("pipelineValue");
    expect(first).toHaveProperty("winRate");
    expect(first).toHaveProperty("avgCycleDays");
    expect(first).toHaveProperty("topStrength");
  });

  it("coachingOpportunities entries have area, priority, repsAffected, suggestedAction", () => {
    expect(report.winLossPatterns.coachingOpportunities.length).toBeGreaterThan(0);
    const first = report.winLossPatterns.coachingOpportunities[0];
    expect(first).toHaveProperty("area");
    expect(first).toHaveProperty("priority");
    expect(first).toHaveProperty("repsAffected");
    expect(first).toHaveProperty("suggestedAction");
  });

  it("activityTrend entries have week, calls, meetings", () => {
    expect(report.winLossPatterns.activityTrend.length).toBeGreaterThan(0);
    const first = report.winLossPatterns.activityTrend[0];
    expect(first).toHaveProperty("week");
    expect(first).toHaveProperty("calls");
    expect(first).toHaveProperty("meetings");
  });
});

// ── Q4: Market Position ──
describe("Q4 — Market Position", () => {
  it("has required market position fields", () => {
    const mp = report.marketPosition;
    expect(mp).toHaveProperty("winLossDynamics");
    expect(mp).toHaveProperty("competitiveSignals");
    expect(mp).toHaveProperty("tamEstimate");
    expect(mp).toHaveProperty("molocoAdvantages");
    expect(mp).toHaveProperty("molocoVulnerabilities");
    expect(mp).toHaveProperty("dataMaturity");
  });

  it("winLossDynamics entries have competitor, winsAgainst, lossesAgainst, netPosition, keyDifferentiator", () => {
    expect(report.marketPosition.winLossDynamics.length).toBeGreaterThan(0);
    const first = report.marketPosition.winLossDynamics[0];
    expect(first).toHaveProperty("competitor");
    expect(first).toHaveProperty("winsAgainst");
    expect(first).toHaveProperty("lossesAgainst");
    expect(first).toHaveProperty("netPosition");
    expect(first).toHaveProperty("keyDifferentiator");
  });

  it("competitiveSignals entries have signal, source, date, urgency, implication", () => {
    expect(report.marketPosition.competitiveSignals.length).toBeGreaterThan(0);
    const first = report.marketPosition.competitiveSignals[0];
    expect(first).toHaveProperty("signal");
    expect(first).toHaveProperty("source");
    expect(first).toHaveProperty("date");
    expect(first).toHaveProperty("urgency");
    expect(first).toHaveProperty("implication");
  });

  it("tamEstimate entries have segment, tam, samReachable, currentPenetration", () => {
    expect(report.marketPosition.tamEstimate.length).toBeGreaterThan(0);
    const first = report.marketPosition.tamEstimate[0];
    expect(first).toHaveProperty("segment");
    expect(first).toHaveProperty("tam");
    expect(first).toHaveProperty("samReachable");
    expect(first).toHaveProperty("currentPenetration");
  });

  it("molocoAdvantages entries have advantage, evidence, durability", () => {
    expect(report.marketPosition.molocoAdvantages.length).toBeGreaterThan(0);
    const first = report.marketPosition.molocoAdvantages[0];
    expect(first).toHaveProperty("advantage");
    expect(first).toHaveProperty("evidence");
    expect(first).toHaveProperty("durability");
  });

  it("molocoVulnerabilities entries have vulnerability, threat, mitigation", () => {
    expect(report.marketPosition.molocoVulnerabilities.length).toBeGreaterThan(0);
    const first = report.marketPosition.molocoVulnerabilities[0];
    expect(first).toHaveProperty("vulnerability");
    expect(first).toHaveProperty("threat");
    expect(first).toHaveProperty("mitigation");
  });
});

// ── Live Data Status ──
describe("Reporting — Live Data Status", () => {
  it("has required liveDataStatus fields", () => {
    const lds = report.liveDataStatus;
    expect(lds).toHaveProperty("slackConnected");
    expect(lds).toHaveProperty("gongConnected");
    expect(lds).toHaveProperty("salesforceConnected");
    expect(lds).toHaveProperty("speedboatConnected");
    expect(lds).toHaveProperty("lastRefreshed");
  });

  it("connected flags are booleans", () => {
    const lds = report.liveDataStatus;
    expect(typeof lds.slackConnected).toBe("boolean");
    expect(typeof lds.gongConnected).toBe("boolean");
    expect(typeof lds.salesforceConnected).toBe("boolean");
    expect(typeof lds.speedboatConnected).toBe("boolean");
  });
});
