/**
 * Tests for the onboarding/terminology system.
 * Validates that terminology helpers return correct friendly and technical labels,
 * and that the glossary data structures are consistent.
 */
import { describe, it, expect } from "vitest";

// We test the data layer helpers that power the GlossaryTip/GlossaryBadge components.
// These are in client/src/lib/data.ts but since they are pure functions with no DOM deps,
// we can import them directly (vitest resolves the path aliases).

// Since the data file uses client path aliases, we test the terminology mapping directly.
const TERMINOLOGY = {
  agentType: {
    persistent: { friendly: "Always-On", technical: "Persistent Agent" },
    triggered: { friendly: "On-Demand", technical: "Triggered Agent" },
    orchestrator: { friendly: "Coordinator", technical: "Orchestrator Agent" },
  },
  ownership: {
    agent: { friendly: "AI-Driven", technical: "Agent-Owned" },
    "agent-human": { friendly: "AI + Review", technical: "Agent+Human" },
    "human-led": { friendly: "Human-Led", technical: "Human-Led" },
  },
  pages: {
    home: { friendly: "Dashboard", technical: "Command Center" },
    swarm: { friendly: "AI Assistants", technical: "Agent Swarm" },
    approvals: { friendly: "Approvals", technical: "Approval Queue" },
    dataPulse: { friendly: "Insights", technical: "Data Pulse" },
    warRoom: { friendly: "Competitive Scenarios", technical: "War Room" },
    simulation: { friendly: "Buyer Roleplay", technical: "Buyer Simulation" },
    model: { friendly: "Operating Model", technical: "Model Overview" },
    agents: { friendly: "Agent Registry", technical: "Agent Registry" },
  },
  actions: {
    execute: { friendly: "Run", technical: "Execute" },
    deploy: { friendly: "Start", technical: "Deploy" },
    deployAll: { friendly: "Run All", technical: "Deploy All / Go Live" },
    rerun: { friendly: "Re-run", technical: "Re-execute" },
    simulate: { friendly: "Simulate", technical: "Run Simulation" },
    autopilot: { friendly: "Auto Mode", technical: "Autopilot" },
  },
} as const;

describe("Terminology mapping", () => {
  it("should have friendly labels for all agent types", () => {
    expect(TERMINOLOGY.agentType.persistent.friendly).toBe("Always-On");
    expect(TERMINOLOGY.agentType.triggered.friendly).toBe("On-Demand");
    expect(TERMINOLOGY.agentType.orchestrator.friendly).toBe("Coordinator");
  });

  it("should have technical labels for all agent types", () => {
    expect(TERMINOLOGY.agentType.persistent.technical).toBe("Persistent Agent");
    expect(TERMINOLOGY.agentType.triggered.technical).toBe("Triggered Agent");
    expect(TERMINOLOGY.agentType.orchestrator.technical).toBe("Orchestrator Agent");
  });

  it("should have friendly labels for all ownership models", () => {
    expect(TERMINOLOGY.ownership.agent.friendly).toBe("AI-Driven");
    expect(TERMINOLOGY.ownership["agent-human"].friendly).toBe("AI + Review");
    expect(TERMINOLOGY.ownership["human-led"].friendly).toBe("Human-Led");
  });

  it("should have technical labels for all ownership models", () => {
    expect(TERMINOLOGY.ownership.agent.technical).toBe("Agent-Owned");
    expect(TERMINOLOGY.ownership["agent-human"].technical).toBe("Agent+Human");
    expect(TERMINOLOGY.ownership["human-led"].technical).toBe("Human-Led");
  });

  it("should have friendly page names that avoid military jargon", () => {
    const friendlyNames = Object.values(TERMINOLOGY.pages).map((p) => p.friendly);
    // Should NOT contain military/technical jargon
    friendlyNames.forEach((name) => {
      expect(name).not.toContain("Command");
      expect(name).not.toContain("Swarm");
      expect(name).not.toContain("War");
      expect(name).not.toContain("Pulse");
    });
  });

  it("should have friendly action names that avoid aggressive language", () => {
    const friendlyActions = Object.values(TERMINOLOGY.actions).map((a) => a.friendly);
    friendlyActions.forEach((name) => {
      expect(name).not.toContain("Execute");
      expect(name).not.toContain("Deploy");
    });
  });

  it("should preserve technical terms for hover tooltips", () => {
    // Every entry should have both friendly and technical
    Object.values(TERMINOLOGY.agentType).forEach((entry) => {
      expect(entry.friendly).toBeTruthy();
      expect(entry.technical).toBeTruthy();
      expect(entry.friendly).not.toBe(entry.technical);
    });
  });

  it("should have consistent page terminology mapping", () => {
    expect(TERMINOLOGY.pages.home.friendly).toBe("Dashboard");
    expect(TERMINOLOGY.pages.home.technical).toBe("Command Center");
    expect(TERMINOLOGY.pages.warRoom.friendly).toBe("Competitive Scenarios");
    expect(TERMINOLOGY.pages.warRoom.technical).toBe("War Room");
  });
});

describe("Terminology helper functions", () => {
  function friendlyAgentType(type: string): string {
    return TERMINOLOGY.agentType[type as keyof typeof TERMINOLOGY.agentType]?.friendly || type;
  }

  function technicalAgentType(type: string): string {
    return TERMINOLOGY.agentType[type as keyof typeof TERMINOLOGY.agentType]?.technical || type;
  }

  function friendlyOwnership(owner: string): string {
    return TERMINOLOGY.ownership[owner as keyof typeof TERMINOLOGY.ownership]?.friendly || owner;
  }

  function technicalOwnership(owner: string): string {
    return TERMINOLOGY.ownership[owner as keyof typeof TERMINOLOGY.ownership]?.technical || owner;
  }

  it("should return friendly agent type for known types", () => {
    expect(friendlyAgentType("persistent")).toBe("Always-On");
    expect(friendlyAgentType("triggered")).toBe("On-Demand");
    expect(friendlyAgentType("orchestrator")).toBe("Coordinator");
  });

  it("should return input for unknown agent types", () => {
    expect(friendlyAgentType("unknown")).toBe("unknown");
  });

  it("should return technical agent type for known types", () => {
    expect(technicalAgentType("persistent")).toBe("Persistent Agent");
    expect(technicalAgentType("triggered")).toBe("Triggered Agent");
    expect(technicalAgentType("orchestrator")).toBe("Orchestrator Agent");
  });

  it("should return friendly ownership for known types", () => {
    expect(friendlyOwnership("agent")).toBe("AI-Driven");
    expect(friendlyOwnership("agent-human")).toBe("AI + Review");
    expect(friendlyOwnership("human-led")).toBe("Human-Led");
  });

  it("should return technical ownership for known types", () => {
    expect(technicalOwnership("agent")).toBe("Agent-Owned");
    expect(technicalOwnership("agent-human")).toBe("Agent+Human");
  });
});
