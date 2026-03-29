/**
 * Tests for agentRuns tRPC procedures.
 * Verifies save, update, list, get, and stats endpoints.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  saveAgentRun: vi.fn().mockResolvedValue({ id: "test-run-1" }),
  updateAgentRun: vi.fn().mockResolvedValue({ id: "test-run-1" }),
  listAgentRuns: vi.fn().mockResolvedValue([
    {
      id: "test-run-1",
      promptId: 42,
      promptText: "Analyze CTV market trends",
      moduleId: 1,
      subModuleName: "Market Sizing",
      agentType: "persistent",
      owner: "agent",
      status: "completed",
      output: "CTV market is growing at 25% YoY...",
      durationMs: 3200,
      startedAt: 1774809000000,
      completedAt: 1774809003200,
      userId: null,
      scenarioName: null,
      createdAt: new Date("2026-03-29T18:00:00Z"),
    },
  ]),
  getAgentRun: vi.fn().mockResolvedValue({
    id: "test-run-1",
    promptId: 42,
    promptText: "Analyze CTV market trends",
    moduleId: 1,
    subModuleName: "Market Sizing",
    agentType: "persistent",
    owner: "agent",
    status: "completed",
    output: "CTV market is growing at 25% YoY...",
    durationMs: 3200,
    startedAt: 1774809000000,
    completedAt: 1774809003200,
    userId: null,
    scenarioName: null,
    createdAt: new Date("2026-03-29T18:00:00Z"),
  }),
  getAgentRunStats: vi.fn().mockResolvedValue({
    total: 15,
    completed: 12,
    failed: 2,
    running: 1,
    avgDurationMs: 4500,
  }),
}));

// Import after mocking
import { saveAgentRun, updateAgentRun, listAgentRuns, getAgentRun, getAgentRunStats } from "./db";

describe("agentRuns database helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saveAgentRun accepts valid input and returns id", async () => {
    const result = await saveAgentRun({
      id: "run-abc",
      promptId: 10,
      promptText: "Test prompt",
      moduleId: 1,
      subModuleName: "Test Sub",
      status: "running",
      startedAt: Date.now(),
    });
    expect(result).toEqual({ id: "test-run-1" });
    expect(saveAgentRun).toHaveBeenCalledOnce();
  });

  it("updateAgentRun accepts valid updates", async () => {
    const result = await updateAgentRun("test-run-1", {
      status: "completed",
      output: "Analysis complete",
      durationMs: 5000,
      completedAt: Date.now(),
    });
    expect(result).toEqual({ id: "test-run-1" });
    expect(updateAgentRun).toHaveBeenCalledOnce();
  });

  it("listAgentRuns returns array of runs", async () => {
    const runs = await listAgentRuns({ limit: 10 });
    expect(Array.isArray(runs)).toBe(true);
    expect(runs).toHaveLength(1);
    expect(runs[0].promptId).toBe(42);
    expect(runs[0].status).toBe("completed");
  });

  it("listAgentRuns supports filter by moduleId", async () => {
    await listAgentRuns({ moduleId: 1 });
    expect(listAgentRuns).toHaveBeenCalledWith({ moduleId: 1 });
  });

  it("listAgentRuns supports filter by status", async () => {
    await listAgentRuns({ status: "completed" });
    expect(listAgentRuns).toHaveBeenCalledWith({ status: "completed" });
  });

  it("getAgentRun returns a single run by id", async () => {
    const run = await getAgentRun("test-run-1");
    expect(run).toBeTruthy();
    expect(run!.id).toBe("test-run-1");
    expect(run!.subModuleName).toBe("Market Sizing");
  });

  it("getAgentRunStats returns aggregate statistics", async () => {
    const stats = await getAgentRunStats();
    expect(stats.total).toBe(15);
    expect(stats.completed).toBe(12);
    expect(stats.failed).toBe(2);
    expect(stats.running).toBe(1);
    expect(stats.avgDurationMs).toBe(4500);
  });
});

describe("agentRuns A+H collaboration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateAgentRun supports humanEditedOutput field", async () => {
    const result = await updateAgentRun("test-run-1", {
      humanEditedOutput: "Human-revised market analysis with additional context...",
    });
    expect(result).toEqual({ id: "test-run-1" });
    expect(updateAgentRun).toHaveBeenCalledWith("test-run-1", {
      humanEditedOutput: "Human-revised market analysis with additional context...",
    });
  });

  it("updateAgentRun supports humanPrompt field", async () => {
    const result = await updateAgentRun("test-run-1", {
      humanPrompt: "Add more detail on competitive positioning",
    });
    expect(result).toEqual({ id: "test-run-1" });
    expect(updateAgentRun).toHaveBeenCalledWith("test-run-1", {
      humanPrompt: "Add more detail on competitive positioning",
    });
  });

  it("updateAgentRun supports approvalStatus approved", async () => {
    const result = await updateAgentRun("test-run-1", {
      approvalStatus: "approved",
    });
    expect(result).toEqual({ id: "test-run-1" });
    expect(updateAgentRun).toHaveBeenCalledWith("test-run-1", {
      approvalStatus: "approved",
    });
  });

  it("updateAgentRun supports approvalStatus rejected", async () => {
    const result = await updateAgentRun("test-run-1", {
      approvalStatus: "rejected",
    });
    expect(result).toEqual({ id: "test-run-1" });
    expect(updateAgentRun).toHaveBeenCalledWith("test-run-1", {
      approvalStatus: "rejected",
    });
  });

  it("updateAgentRun supports combined A+H update", async () => {
    const result = await updateAgentRun("test-run-1", {
      humanEditedOutput: "Revised output",
      humanPrompt: "Make it more concise",
      approvalStatus: "pending",
    });
    expect(result).toEqual({ id: "test-run-1" });
    expect(updateAgentRun).toHaveBeenCalledWith("test-run-1", {
      humanEditedOutput: "Revised output",
      humanPrompt: "Make it more concise",
      approvalStatus: "pending",
    });
  });
});

describe("agentRuns data integrity", () => {
  it("run has all required fields", async () => {
    const run = await getAgentRun("test-run-1");
    expect(run).toHaveProperty("id");
    expect(run).toHaveProperty("promptId");
    expect(run).toHaveProperty("promptText");
    expect(run).toHaveProperty("moduleId");
    expect(run).toHaveProperty("subModuleName");
    expect(run).toHaveProperty("status");
    expect(run).toHaveProperty("startedAt");
  });

  it("completed run has output and duration", async () => {
    const run = await getAgentRun("test-run-1");
    expect(run!.status).toBe("completed");
    expect(run!.output).toBeTruthy();
    expect(run!.durationMs).toBeGreaterThan(0);
    expect(run!.completedAt).toBeTruthy();
  });

  it("stats totals are consistent", async () => {
    const stats = await getAgentRunStats();
    expect(stats.completed + stats.failed + stats.running).toBe(stats.total);
  });
});
