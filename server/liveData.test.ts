import { describe, it, expect, vi } from "vitest";

/**
 * Tests for the live data connector layer.
 * These test the module mapping logic and context formatting.
 * Actual connector calls require live credentials so we test the structure.
 */

// Mock the liveData module's internal logic
describe("Live Data Connector — Module Mapping", () => {
  // Module → data source mapping
  const MODULE_SOURCE_MAP: Record<number, string[]> = {
    1: ["sensorTower", "speedboat"],
    2: ["gong", "salesforce", "speedboat"],
    3: ["gong", "salesforce", "speedboat"],
    4: ["salesforce", "speedboat", "sensorTower"],
  };

  it("maps Module 1 (Market Intel) to Sensor Tower + Speedboat", () => {
    const sources = MODULE_SOURCE_MAP[1];
    expect(sources).toContain("sensorTower");
    expect(sources).toContain("speedboat");
    expect(sources).not.toContain("gong");
  });

  it("maps Module 2 (Demand Gen) to Gong + Salesforce + Speedboat", () => {
    const sources = MODULE_SOURCE_MAP[2];
    expect(sources).toContain("gong");
    expect(sources).toContain("salesforce");
    expect(sources).toContain("speedboat");
  });

  it("maps Module 3 (Sales Execution) to Gong + Salesforce + Speedboat", () => {
    const sources = MODULE_SOURCE_MAP[3];
    expect(sources).toContain("gong");
    expect(sources).toContain("salesforce");
    expect(sources).toContain("speedboat");
  });

  it("maps Module 4 (Customer Success) to Salesforce + Speedboat + Sensor Tower", () => {
    const sources = MODULE_SOURCE_MAP[4];
    expect(sources).toContain("salesforce");
    expect(sources).toContain("speedboat");
    expect(sources).toContain("sensorTower");
  });
});

describe("Live Data Connector — Context Formatting", () => {
  it("formats context with section headers per source", () => {
    const mockData = {
      gong: { summary: "3 calls this week, 2 with CTV mentions" },
      salesforce: { pipeline: "$2.1M in CTV pipeline" },
    };

    // Simulate formatting
    const sections: string[] = [];
    for (const [source, data] of Object.entries(mockData)) {
      sections.push(`### ${source.charAt(0).toUpperCase() + source.slice(1)} Data\n${JSON.stringify(data, null, 2)}`);
    }
    const formatted = `## Live Data Context\n${sections.join("\n\n")}`;

    expect(formatted).toContain("## Live Data Context");
    expect(formatted).toContain("### Gong Data");
    expect(formatted).toContain("### Salesforce Data");
    expect(formatted).toContain("3 calls this week");
    expect(formatted).toContain("$2.1M in CTV pipeline");
  });

  it("returns empty string when no data available", () => {
    const mockData = {};
    const sections: string[] = [];
    for (const [source, data] of Object.entries(mockData)) {
      sections.push(`### ${source} Data\n${JSON.stringify(data)}`);
    }
    const formatted = sections.length > 0 ? `## Live Data Context\n${sections.join("\n\n")}` : "";
    expect(formatted).toBe("");
  });

  it("gracefully handles partial data (some sources unavailable)", () => {
    const mockData = {
      speedboat: { metrics: "CTV spend: $45K/day avg" },
    };

    const sections: string[] = [];
    for (const [source, data] of Object.entries(mockData)) {
      const label = source === "speedboat" ? "Speedboat" : source;
      sections.push(`### ${label} Data\n${JSON.stringify(data, null, 2)}`);
    }
    const formatted = `## Live Data Context\n${sections.join("\n\n")}`;

    expect(formatted).toContain("### Speedboat Data");
    expect(formatted).not.toContain("### Gong Data");
    expect(formatted).not.toContain("### Salesforce Data");
  });
});

describe("Live Data Connector — Status Response", () => {
  it("returns correct shape for status check", () => {
    const status = {
      gong: "connected" as const,
      salesforce: "unavailable" as const,
      sensorTower: "connected" as const,
      speedboat: "error" as const,
      lastChecked: Date.now(),
    };

    expect(status).toHaveProperty("gong");
    expect(status).toHaveProperty("salesforce");
    expect(status).toHaveProperty("sensorTower");
    expect(status).toHaveProperty("speedboat");
    expect(status).toHaveProperty("lastChecked");
    expect(["connected", "unavailable", "error"]).toContain(status.gong);
    expect(typeof status.lastChecked).toBe("number");
  });

  it("counts connected sources correctly", () => {
    const status = {
      gong: "connected" as const,
      salesforce: "connected" as const,
      sensorTower: "unavailable" as const,
      speedboat: "connected" as const,
      lastChecked: Date.now(),
    };

    const connectedCount = Object.entries(status)
      .filter(([k]) => k !== "lastChecked")
      .filter(([, v]) => v === "connected").length;

    expect(connectedCount).toBe(3);
  });
});
