import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildAgentSystemPrompt } from "./llm";

// We can test the pure functions without mocking fetch
// The actual API calls require real credentials so we test the prompt builder

describe("buildAgentSystemPrompt", () => {
  it("includes module context in system prompt", () => {
    const prompt = buildAgentSystemPrompt(
      "Analyze competitive landscape",
      1,
      "Competitive Intelligence",
      "persistent",
      "agent"
    );
    expect(prompt).toContain("Module");
    expect(prompt).toContain("M1");
    expect(prompt).toContain("Market Intelligence & Positioning");
    expect(prompt).toContain("Competitive Intelligence");
    expect(prompt).toContain("persistent");
  });

  it("includes agent type description for persistent", () => {
    const prompt = buildAgentSystemPrompt("Test", 1, "Sub", "persistent", "agent");
    expect(prompt).toContain("runs continuously");
  });

  it("includes agent type description for triggered", () => {
    const prompt = buildAgentSystemPrompt("Test", 2, "Sub", "triggered", "agent-human");
    expect(prompt).toContain("fires on specific events");
  });

  it("includes agent type description for orchestrator", () => {
    const prompt = buildAgentSystemPrompt("Test", 0, "Sub", "orchestrator", "agent");
    expect(prompt).toContain("coordinates other agents");
  });

  it("includes ownership model description for agent", () => {
    const prompt = buildAgentSystemPrompt("Test", 1, "Sub", "persistent", "agent");
    expect(prompt).toContain("fully autonomous");
  });

  it("includes ownership model description for agent-human", () => {
    const prompt = buildAgentSystemPrompt("Test", 1, "Sub", "persistent", "agent-human");
    expect(prompt).toContain("you generate, human approves");
  });

  it("includes ownership model description for human-led", () => {
    const prompt = buildAgentSystemPrompt("Test", 1, "Sub", "persistent", "human-led");
    expect(prompt).toContain("human leads, you assist");
  });

  it("includes the actual task prompt text", () => {
    const taskText = "Monitor competitor pricing across CTV DSPs";
    const prompt = buildAgentSystemPrompt(taskText, 1, "Sub", "persistent", "agent");
    expect(prompt).toContain(taskText);
  });

  it("includes Moloco CTV context", () => {
    const prompt = buildAgentSystemPrompt("Test", 1, "Sub", "persistent", "agent");
    expect(prompt).toContain("Moloco");
    expect(prompt).toContain("CTV");
    expect(prompt).toContain("$200M");
  });

  it("includes output formatting requirements", () => {
    const prompt = buildAgentSystemPrompt("Test", 1, "Sub", "persistent", "agent");
    expect(prompt).toContain("markdown");
    expect(prompt).toContain("600 words");
  });

  it("handles all 4 module IDs correctly", () => {
    const moduleNames: Record<number, string> = {
      1: "Market Intelligence & Positioning",
      2: "Demand Generation & Pipeline",
      3: "Sales Execution & Revenue",
      4: "Customer Success & Growth",
    };
    for (const [id, name] of Object.entries(moduleNames)) {
      const prompt = buildAgentSystemPrompt("Test", parseInt(id), "Sub", "persistent", "agent");
      expect(prompt).toContain(name);
    }
  });

  it("handles unknown module ID gracefully", () => {
    const prompt = buildAgentSystemPrompt("Test", 99, "Sub", "persistent", "agent");
    expect(prompt).toContain("Cross-Module");
  });
});

describe("LLM Client exports", () => {
  it("exports all expected functions", async () => {
    const mod = await import("./llm");
    expect(typeof mod.callLLM).toBe("function");
    expect(typeof mod.callLLMStream).toBe("function");
    expect(typeof mod.buildAgentSystemPrompt).toBe("function");
    expect(typeof mod.executeAgentPrompt).toBe("function");
    expect(typeof mod.executeAgentPromptStream).toBe("function");
  });
});
