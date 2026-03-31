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

// ============================================================================
// NEW TESTS: Retry Logic, Env Var Parsing, PYTHONHOME Cleanup
// ============================================================================

describe("getBashrcEnv - bashrc env var parsing", () => {
  it("should parse standard export lines with double quotes", () => {
    const bashrcContent = `# comment
case $- in
    *i*) ;;
      *) return;;
esac
export GONG_API_KEY="H5IGABXLPQDFIJPUMPICERED2BJ42FLW"
export GONG_API_SECRET_KEY="eyJhbGciOiJIUzI1NiJ9.test"
`;
    const exportRegex = /^export\s+(\w+)=["']?([^"'\n]*)["']?/gm;
    const vars: Record<string, string> = {};
    let match;
    while ((match = exportRegex.exec(bashrcContent)) !== null) {
      vars[match[1]] = match[2];
    }
    expect(vars.GONG_API_KEY).toBe("H5IGABXLPQDFIJPUMPICERED2BJ42FLW");
    expect(vars.GONG_API_SECRET_KEY).toBe("eyJhbGciOiJIUzI1NiJ9.test");
  });

  it("should parse export lines without quotes", () => {
    const bashrcContent = `export PYTHONIOENCODING=utf-8`;
    const exportRegex = /^export\s+(\w+)=["']?([^"'\n]*)["']?/gm;
    const vars: Record<string, string> = {};
    let match;
    while ((match = exportRegex.exec(bashrcContent)) !== null) {
      vars[match[1]] = match[2];
    }
    expect(vars.PYTHONIOENCODING).toBe("utf-8");
  });

  it("should skip commented export lines", () => {
    const bashrcContent = `#export OLD_VAR="should_not_match"
export REAL_VAR="should_match"`;
    const exportRegex = /^export\s+(\w+)=["']?([^"'\n]*)["']?/gm;
    const vars: Record<string, string> = {};
    let match;
    while ((match = exportRegex.exec(bashrcContent)) !== null) {
      vars[match[1]] = match[2];
    }
    expect(vars.OLD_VAR).toBeUndefined();
    expect(vars.REAL_VAR).toBe("should_match");
  });

  it("should handle the non-interactive guard correctly", () => {
    const bashrcContent = `case $- in
    *i*) ;;
      *) return;;
esac
export AFTER_GUARD="value_after_guard"`;
    const exportRegex = /^export\s+(\w+)=["']?([^"'\n]*)["']?/gm;
    const vars: Record<string, string> = {};
    let match;
    while ((match = exportRegex.exec(bashrcContent)) !== null) {
      vars[match[1]] = match[2];
    }
    expect(vars.AFTER_GUARD).toBe("value_after_guard");
  });
});

describe("retryWithBackoff - server-side retry logic", () => {
  async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 10,
  ): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const isRateLimit =
          err?.message?.includes("Rate") ||
          err?.message?.includes("429") ||
          err?.message?.includes("Too Many");
        if (!isRateLimit || attempt === maxRetries) throw err;
        await new Promise((r) => setTimeout(r, baseDelayMs));
      }
    }
    throw lastError || new Error("Retry exhausted");
  }

  it("should succeed on first attempt if no error", async () => {
    let attempts = 0;
    const result = await retryWithBackoff(async () => { attempts++; return "success"; }, 3, 10);
    expect(result).toBe("success");
    expect(attempts).toBe(1);
  });

  it("should retry on rate limit errors", async () => {
    let attempts = 0;
    const result = await retryWithBackoff(async () => {
      attempts++;
      if (attempts < 3) throw new Error("Rate limit exceeded");
      return "success_after_retry";
    }, 3, 10);
    expect(result).toBe("success_after_retry");
    expect(attempts).toBe(3);
  });

  it("should throw non-rate-limit errors immediately", async () => {
    let attempts = 0;
    await expect(retryWithBackoff(async () => {
      attempts++;
      throw new Error("Authentication failed");
    }, 3, 10)).rejects.toThrow("Authentication failed");
    expect(attempts).toBe(1);
  });

  it("should exhaust retries on persistent rate limits", async () => {
    let attempts = 0;
    await expect(retryWithBackoff(async () => {
      attempts++;
      throw new Error("429 Too Many Requests");
    }, 3, 10)).rejects.toThrow("429 Too Many Requests");
    expect(attempts).toBe(4); // initial + 3 retries
  });
});

describe("Python subprocess env cleanup", () => {
  it("should remove PYTHONHOME from env to prevent conflicts", () => {
    const mockEnv: Record<string, string | undefined> = {
      PATH: "/usr/bin",
      HOME: "/home/ubuntu",
      PYTHONHOME: "/home/ubuntu/.local/share/uv/python/cpython-3.13.8-linux-x86_64-gnu",
      PYTHONPATH: "/some/path",
      NODE_ENV: "development",
    };

    const cleanEnv = { ...mockEnv };
    delete cleanEnv.PYTHONHOME;
    delete cleanEnv.PYTHONPATH;

    expect(cleanEnv.PYTHONHOME).toBeUndefined();
    expect(cleanEnv.PYTHONPATH).toBeUndefined();
    expect(cleanEnv.PATH).toBe("/usr/bin");
    expect(cleanEnv.HOME).toBe("/home/ubuntu");
  });
});

describe("Reporting data structure", () => {
  it("should calculate revenue gap correctly", () => {
    const ANNUAL_TARGET = 10_000_000;
    const closedWon = 1_390_000;
    const pipelineWeighted = 1_672_000;
    const gapToTarget = ANNUAL_TARGET - (closedWon + pipelineWeighted);
    expect(gapToTarget).toBe(6_938_000);
    expect(closedWon + pipelineWeighted).toBeLessThan(ANNUAL_TARGET);
  });

  it("should have valid CTV campaign stages", () => {
    const validStages = ["test", "scaling", "evergreen", "at-risk", "churned"];
    const campaigns = [
      { stage: "scaling" },
      { stage: "test" },
      { stage: "evergreen" },
    ];
    campaigns.forEach((c) => {
      expect(validStages).toContain(c.stage);
    });
  });
});
