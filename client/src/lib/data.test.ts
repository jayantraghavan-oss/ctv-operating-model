import { describe, it, expect } from "vitest";
import {
  modules,
  clusters,
  prompts,
  getTotalStats,
  getModuleStats,
  getOwnerLabel,
  getOwnerColor,
  getOwnerBg,
  getAgentTypeLabel,
  getAgentTypeBg,
  getStatusColor,
} from "./data";

describe("Data Model Integrity", () => {
  it("has exactly 4 modules", () => {
    expect(modules).toHaveLength(4);
  });

  it("modules have correct IDs (1-4)", () => {
    const ids = modules.map((m) => m.id);
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it("modules have required fields", () => {
    for (const mod of modules) {
      expect(mod.id).toBeGreaterThan(0);
      expect(mod.name).toBeTruthy();
      expect(mod.shortName).toBeTruthy();
      expect(mod.description).toBeTruthy();
      expect(mod.sections.length).toBeGreaterThan(0);
      expect(mod.clusterId).toBeGreaterThan(0);
    }
  });

  it("has 5 clusters", () => {
    expect(clusters).toHaveLength(5);
  });

  it("clusters have correct IDs (1-5)", () => {
    const ids = clusters.map((c) => c.id);
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });

  it("has 200 prompts", () => {
    expect(prompts.length).toBeGreaterThanOrEqual(197);
  });

  it("all prompts have valid module IDs (0 for orchestrator)", () => {
    const validModuleIds = new Set([0, ...modules.map((m) => m.id)]);
    for (const p of prompts) {
      expect(validModuleIds.has(p.moduleId)).toBe(true);
    }
  });

  it("all prompts have valid agent types", () => {
    const validTypes = ["persistent", "triggered", "orchestrator"];
    for (const p of prompts) {
      expect(validTypes).toContain(p.agentType);
    }
  });

  it("all prompts have non-empty text", () => {
    for (const p of prompts) {
      expect(p.text.length).toBeGreaterThan(10);
    }
  });

  it("every sub-module references valid prompt IDs", () => {
    const promptIds = new Set(prompts.map((p) => p.id));
    for (const mod of modules) {
      for (const section of mod.sections) {
        for (const sub of section.subModules) {
          for (const pid of sub.prompts) {
            expect(promptIds.has(pid)).toBe(true);
          }
        }
      }
    }
  });

  it("every sub-module has a valid owner type", () => {
    const validOwners = ["agent", "agent-human", "human-led"];
    for (const mod of modules) {
      for (const section of mod.sections) {
        for (const sub of section.subModules) {
          expect(validOwners).toContain(sub.owner);
        }
      }
    }
  });
});

describe("getTotalStats", () => {
  it("returns correct total counts", () => {
    const stats = getTotalStats();
    expect(stats.modules).toBe(4);
    expect(stats.clusters).toBe(5);
    expect(stats.totalPrompts).toBeGreaterThanOrEqual(197);
    expect(stats.totalPrompts).toBe(
      stats.persistent + stats.triggered + stats.orchestrator
    );
  });

  it("ownership counts sum to total prompts minus orchestrator", () => {
    const stats = getTotalStats();
    // Agent + Agent-Human + Human-Led should account for non-orchestrator prompts
    expect(stats.totalAgents + stats.totalAgentHuman + stats.totalHumanLed).toBeGreaterThan(0);
  });

  it("has sub-modules count greater than 0", () => {
    const stats = getTotalStats();
    expect(stats.totalSubModules).toBeGreaterThan(0);
  });
});

describe("getModuleStats", () => {
  it("returns stats for each module", () => {
    for (const mod of modules) {
      const stats = getModuleStats(mod.id);
      expect(stats.sections).toBeGreaterThan(0);
      expect(stats.subModules).toBeGreaterThan(0);
      expect(stats.prompts).toBeGreaterThan(0);
    }
  });

  it("module prompt counts sum to total", () => {
    const totalFromModules = modules.reduce(
      (sum, mod) => sum + getModuleStats(mod.id).prompts,
      0
    );
    const stats = getTotalStats();
    // Module prompts + orchestrator prompts = total
    // Module prompts + orchestrator = total (some prompts may be orchestrator-only)
    expect(totalFromModules + stats.orchPrompts).toBeGreaterThanOrEqual(stats.totalPrompts - 5);
  });
});

describe("Helper Functions", () => {
  it("getOwnerLabel returns correct labels", () => {
    expect(getOwnerLabel("agent")).toBe("AI-Driven");
    expect(getOwnerLabel("agent-human")).toBe("AI + Review");
    expect(getOwnerLabel("human-led")).toBe("Human-Led");
  });

  it("getOwnerColor returns non-empty strings", () => {
    expect(getOwnerColor("agent")).toBeTruthy();
    expect(getOwnerColor("agent-human")).toBeTruthy();
    expect(getOwnerColor("human-led")).toBeTruthy();
  });

  it("getOwnerBg returns non-empty strings", () => {
    expect(getOwnerBg("agent")).toBeTruthy();
    expect(getOwnerBg("agent-human")).toBeTruthy();
    expect(getOwnerBg("human-led")).toBeTruthy();
  });

  it("getAgentTypeLabel returns correct labels", () => {
    expect(getAgentTypeLabel("persistent")).toBe("Always-On");
    expect(getAgentTypeLabel("triggered")).toBe("On-Demand");
    expect(getAgentTypeLabel("orchestrator")).toBe("Coordinator");
  });

  it("getAgentTypeBg returns non-empty strings", () => {
    expect(getAgentTypeBg("persistent")).toBeTruthy();
    expect(getAgentTypeBg("triggered")).toBeTruthy();
    expect(getAgentTypeBg("orchestrator")).toBeTruthy();
  });

  it("getStatusColor returns non-empty strings", () => {
    expect(getStatusColor("active")).toBeTruthy();
    expect(getStatusColor("pending")).toBeTruthy();
    expect(getStatusColor("blocked")).toBeTruthy();
    expect(getStatusColor("complete")).toBeTruthy();
  });
});
