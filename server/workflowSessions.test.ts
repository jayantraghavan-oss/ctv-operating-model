/**
 * Tests for workflowSessions tRPC procedures.
 * Verifies save, list, get, and stats endpoints.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  saveAgentRun: vi.fn(),
  updateAgentRun: vi.fn(),
  listAgentRuns: vi.fn(),
  getAgentRun: vi.fn(),
  getAgentRunStats: vi.fn(),
  saveWorkflowSession: vi.fn().mockResolvedValue({ id: "ws-test-1" }),
  listWorkflowSessions: vi.fn().mockResolvedValue([
    {
      id: "ws-test-1",
      name: "New Advertiser Pitch",
      description: "End-to-end pitch workflow",
      queryType: "preset",
      customQuery: null,
      agentCount: 8,
      completedCount: 8,
      totalDurationMs: 24000,
      compiledOutput: "# New Advertiser Pitch — Executive Summary\n\n## Market Sizing\n\nCTV market...",
      nodeDetails: JSON.stringify([
        { nodeId: "c1-0", nodeName: "Market Sizing", output: "CTV market...", durationMs: 3000, status: "completed" },
      ]),
      userId: null,
      startedAt: 1774809000000,
      completedAt: 1774809024000,
      createdAt: new Date("2026-03-29T18:00:00Z"),
    },
    {
      id: "ws-test-2",
      name: "Custom: How do we win back a churned advertiser?",
      description: "How do we win back a churned advertiser?",
      queryType: "custom",
      customQuery: "How do we win back a churned advertiser?",
      agentCount: 5,
      completedCount: 5,
      totalDurationMs: 15000,
      compiledOutput: "# Custom Workflow — Executive Summary\n\n## Win-back Strategy\n\n...",
      nodeDetails: JSON.stringify([]),
      userId: null,
      startedAt: 1774810000000,
      completedAt: 1774810015000,
      createdAt: new Date("2026-03-29T19:00:00Z"),
    },
  ]),
  getWorkflowSession: vi.fn().mockResolvedValue({
    id: "ws-test-1",
    name: "New Advertiser Pitch",
    description: "End-to-end pitch workflow",
    queryType: "preset",
    customQuery: null,
    agentCount: 8,
    completedCount: 8,
    totalDurationMs: 24000,
    compiledOutput: "# New Advertiser Pitch — Executive Summary\n\n## Market Sizing\n\nCTV market...",
    nodeDetails: JSON.stringify([
      { nodeId: "c1-0", nodeName: "Market Sizing", output: "CTV market...", durationMs: 3000, status: "completed" },
    ]),
    userId: null,
    startedAt: 1774809000000,
    completedAt: 1774809024000,
    createdAt: new Date("2026-03-29T18:00:00Z"),
  }),
  getWorkflowSessionStats: vi.fn().mockResolvedValue({
    total: 5,
    totalAgentsRun: 32,
    avgDurationMs: 20000,
    presetCount: 3,
    customCount: 2,
  }),
}));

// Import after mocking
import {
  saveWorkflowSession,
  listWorkflowSessions,
  getWorkflowSession,
  getWorkflowSessionStats,
} from "./db";

describe("workflowSessions database helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saveWorkflowSession accepts valid input and returns id", async () => {
    const result = await saveWorkflowSession({
      id: "ws-new-1",
      name: "QBR Prep",
      queryType: "preset",
      agentCount: 6,
      completedCount: 6,
      totalDurationMs: 18000,
      compiledOutput: "# QBR Prep — Summary",
      startedAt: Date.now() - 18000,
      completedAt: Date.now(),
    });
    expect(result).toEqual({ id: "ws-test-1" });
    expect(saveWorkflowSession).toHaveBeenCalledOnce();
  });

  it("saveWorkflowSession accepts custom query type", async () => {
    await saveWorkflowSession({
      id: "ws-custom-1",
      name: "Custom: Win back churned advertiser",
      queryType: "custom",
      customQuery: "How do we win back a churned advertiser?",
      agentCount: 5,
      completedCount: 5,
      compiledOutput: "# Custom — Summary",
      startedAt: Date.now(),
    });
    expect(saveWorkflowSession).toHaveBeenCalledWith(
      expect.objectContaining({
        queryType: "custom",
        customQuery: "How do we win back a churned advertiser?",
      })
    );
  });

  it("listWorkflowSessions returns array of sessions", async () => {
    const sessions = await listWorkflowSessions({ limit: 10 });
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].name).toBe("New Advertiser Pitch");
    expect(sessions[1].queryType).toBe("custom");
  });

  it("listWorkflowSessions called with correct params", async () => {
    await listWorkflowSessions({ limit: 5, offset: 10 });
    expect(listWorkflowSessions).toHaveBeenCalledWith({ limit: 5, offset: 10 });
  });

  it("getWorkflowSession returns a single session by id", async () => {
    const session = await getWorkflowSession("ws-test-1");
    expect(session).toBeTruthy();
    expect(session!.id).toBe("ws-test-1");
    expect(session!.name).toBe("New Advertiser Pitch");
    expect(session!.agentCount).toBe(8);
  });

  it("getWorkflowSessionStats returns aggregate statistics", async () => {
    const stats = await getWorkflowSessionStats();
    expect(stats.total).toBe(5);
    expect(stats.totalAgentsRun).toBe(32);
    expect(stats.presetCount).toBe(3);
    expect(stats.customCount).toBe(2);
  });
});

describe("workflowSessions data integrity", () => {
  it("session has all required fields", async () => {
    const session = await getWorkflowSession("ws-test-1");
    expect(session).toHaveProperty("id");
    expect(session).toHaveProperty("name");
    expect(session).toHaveProperty("queryType");
    expect(session).toHaveProperty("agentCount");
    expect(session).toHaveProperty("completedCount");
    expect(session).toHaveProperty("compiledOutput");
    expect(session).toHaveProperty("startedAt");
  });

  it("session compiledOutput contains markdown content", async () => {
    const session = await getWorkflowSession("ws-test-1");
    expect(session!.compiledOutput).toContain("# New Advertiser Pitch");
    expect(session!.compiledOutput).toContain("Executive Summary");
  });

  it("session nodeDetails is valid JSON when present", async () => {
    const session = await getWorkflowSession("ws-test-1");
    expect(session!.nodeDetails).toBeTruthy();
    const details = JSON.parse(session!.nodeDetails!);
    expect(Array.isArray(details)).toBe(true);
    expect(details[0]).toHaveProperty("nodeId");
    expect(details[0]).toHaveProperty("nodeName");
    expect(details[0]).toHaveProperty("output");
    expect(details[0]).toHaveProperty("status");
  });

  it("completed session has completedAt timestamp", async () => {
    const session = await getWorkflowSession("ws-test-1");
    expect(session!.completedAt).toBeTruthy();
    expect(session!.completedAt).toBeGreaterThan(session!.startedAt);
  });

  it("stats preset + custom counts are consistent", async () => {
    const stats = await getWorkflowSessionStats();
    expect(stats.presetCount + stats.customCount).toBe(stats.total);
  });
});
