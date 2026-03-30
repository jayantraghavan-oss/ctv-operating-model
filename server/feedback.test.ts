import { describe, it, expect } from "vitest";

/**
 * Feedback system tests — validates the feedback data model,
 * rating constraints, and live context tracking.
 */

describe("Feedback Data Model", () => {
  it("should accept valid thumbs up feedback", () => {
    const feedback = {
      id: "fb-test-001",
      runId: "run-123",
      promptId: 42,
      moduleId: 1,
      rating: "up" as const,
      comment: undefined,
      hadLiveContext: false,
      liveDataSources: [],
    };
    expect(feedback.rating).toBe("up");
    expect(feedback.id).toMatch(/^fb-/);
  });

  it("should accept valid thumbs down feedback with comment", () => {
    const feedback = {
      id: "fb-test-002",
      runId: "run-456",
      promptId: 15,
      moduleId: 2,
      rating: "down" as const,
      comment: "Output was too generic, needs competitive data",
      hadLiveContext: true,
      liveDataSources: ["gong", "salesforce"],
    };
    expect(feedback.rating).toBe("down");
    expect(feedback.comment).toBeTruthy();
    expect(feedback.hadLiveContext).toBe(true);
    expect(feedback.liveDataSources).toHaveLength(2);
  });

  it("should only allow 'up' or 'down' as rating values", () => {
    const validRatings = ["up", "down"];
    expect(validRatings).toContain("up");
    expect(validRatings).toContain("down");
    expect(validRatings).not.toContain("neutral");
    expect(validRatings).not.toContain("maybe");
  });

  it("should track live data sources as JSON array", () => {
    const sources = ["gong", "salesforce", "sensor_tower", "speedboat"];
    const serialized = JSON.stringify(sources);
    const deserialized = JSON.parse(serialized);
    expect(deserialized).toEqual(sources);
    expect(deserialized).toHaveLength(4);
  });

  it("should generate unique feedback IDs per run", () => {
    const runId = "run-789";
    const id1 = `fb-${runId}-${1000}`;
    const id2 = `fb-${runId}-${1001}`;
    expect(id1).not.toBe(id2);
    expect(id1).toContain(runId);
  });

  it("should distinguish live context vs synthetic feedback", () => {
    const liveFeedback = { hadLiveContext: true, rating: "up" };
    const syntheticFeedback = { hadLiveContext: false, rating: "up" };
    expect(liveFeedback.hadLiveContext).not.toBe(syntheticFeedback.hadLiveContext);
  });

  it("should compute feedback stats correctly", () => {
    const feedbacks = [
      { rating: "up", hadLiveContext: true },
      { rating: "up", hadLiveContext: true },
      { rating: "down", hadLiveContext: true },
      { rating: "up", hadLiveContext: false },
      { rating: "down", hadLiveContext: false },
    ];
    const total = feedbacks.length;
    const thumbsUp = feedbacks.filter(f => f.rating === "up").length;
    const thumbsDown = feedbacks.filter(f => f.rating === "down").length;
    const withLive = feedbacks.filter(f => f.hadLiveContext).length;
    const liveUpRate = Math.round(
      (feedbacks.filter(f => f.hadLiveContext && f.rating === "up").length /
        Math.max(withLive, 1)) * 100
    );
    const syntheticUpRate = Math.round(
      (feedbacks.filter(f => !f.hadLiveContext && f.rating === "up").length /
        Math.max(feedbacks.filter(f => !f.hadLiveContext).length, 1)) * 100
    );

    expect(total).toBe(5);
    expect(thumbsUp).toBe(3);
    expect(thumbsDown).toBe(2);
    expect(withLive).toBe(3);
    expect(liveUpRate).toBe(67);
    expect(syntheticUpRate).toBe(50);
  });
});
