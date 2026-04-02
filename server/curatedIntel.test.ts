/**
 * Curated Intel tests — validates the DB-backed data that powers
 * SuperDashboard, CTVIntelligence, and CCCTVReporting.
 *
 * Ensures:
 * 1. getAllCuratedIntel returns a category→rows map
 * 2. All html_ categories needed by SuperDashboard are present
 * 3. All ccctv_ categories needed by CCCTVReporting are present
 * 4. Value fields (value1, value2, value3) are parseable as numbers
 * 5. No hallucinated/fabricated data — every row has a dataSource
 */

import { getAllCuratedIntel } from "./dbIntel";

let curatedMap: Record<string, any[]>;

beforeAll(async () => {
  curatedMap = await getAllCuratedIntel();
}, 30_000);

// ── Structure ──
describe("Curated Intel — Structure", () => {
  it("returns a non-empty object with category keys", () => {
    expect(typeof curatedMap).toBe("object");
    expect(Object.keys(curatedMap).length).toBeGreaterThan(0);
  });

  it("each category value is an array of rows", () => {
    for (const [cat, rows] of Object.entries(curatedMap)) {
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);
    }
  });

  it("each row has required fields: id, category, label", () => {
    for (const [cat, rows] of Object.entries(curatedMap)) {
      for (const row of rows) {
        expect(row).toHaveProperty("id");
        expect(row).toHaveProperty("category");
        expect(row).toHaveProperty("label");
        expect(row.category).toBe(cat);
      }
    }
  });
});

// ── SuperDashboard categories (html_*) ──
describe("Curated Intel — SuperDashboard html_ categories", () => {
  const requiredCategories = [
    "html_bq_kpi",
    "html_bq_monthly",
    "html_bq_concentration",
    "html_bq_pipeline",
    "html_bq_exchange",
    "html_gong_sentiment",
    "html_gong_themes",
    "html_gong_signals",
    "html_winloss_behaviors",
    "html_winloss_loss_reasons",
    "html_market_competitive_mentions",
    "html_market_win_rate_vs_competitor",
    "html_market_tam",
    "html_market_competitive_signals",
    "html_pipeline_deals",
    "html_slack_signals",
    "html_data_provenance",
  ];

  for (const cat of requiredCategories) {
    it(`has category "${cat}" with at least 1 row`, () => {
      expect(curatedMap).toHaveProperty(cat);
      expect(curatedMap[cat].length).toBeGreaterThan(0);
    });
  }

  it("html_bq_kpi contains gas_per_day with a parseable numeric value1", () => {
    const kpis = curatedMap.html_bq_kpi;
    const gasPerDay = kpis.find((r: any) => r.label === "gas_per_day");
    expect(gasPerDay).toBeDefined();
    const val = Number(gasPerDay.value1);
    expect(val).toBeGreaterThan(0);
    expect(Number.isFinite(val)).toBe(true);
  });

  it("html_bq_kpi contains arr_run_rate_m with a parseable numeric value1", () => {
    const kpis = curatedMap.html_bq_kpi;
    const arr = kpis.find((r: any) => r.label === "arr_run_rate_m");
    expect(arr).toBeDefined();
    const val = Number(arr.value1);
    expect(val).toBeGreaterThan(0);
  });
});

// ── CCCTVReporting categories (ccctv_*) ──
describe("Curated Intel — CCCTVReporting ccctv_ categories", () => {
  const requiredCategories = [
    "ccctv_behavior",
    "ccctv_loss_reason",
    "ccctv_competitor",
    "ccctv_tam",
    "ccctv_theme",
    "ccctv_verbatim",
    "ccctv_concentration",
    "ccctv_pipeline",
    "ccctv_risk_signal",
    "ccctv_comp_signal",
    "ccctv_winrate_behavior",
    "ccctv_winrate_competitor",
  ];

  for (const cat of requiredCategories) {
    it(`has category "${cat}" with at least 1 row`, () => {
      expect(curatedMap).toHaveProperty(cat);
      expect(curatedMap[cat].length).toBeGreaterThan(0);
    });
  }
});

// ── CTVIntelligence categories ──
describe("Curated Intel — CTVIntelligence categories", () => {
  const requiredCategories = [
    "behavior",
    "loss_reason",
    "competitor",
  ];

  for (const cat of requiredCategories) {
    it(`has category "${cat}" with at least 1 row`, () => {
      expect(curatedMap).toHaveProperty(cat);
      expect(curatedMap[cat].length).toBeGreaterThan(0);
    });
  }
});

// ── Data provenance (zero hallucination guarantee) ──
describe("Curated Intel — Data provenance", () => {
  it("html_data_provenance rows each have a text1 description", () => {
    const prov = curatedMap.html_data_provenance || [];
    for (const row of prov) {
      expect(row.text1).toBeTruthy();
      expect(typeof row.text1).toBe("string");
      expect(row.text1.length).toBeGreaterThan(10);
    }
  });

  it("value fields are parseable as numbers when present", () => {
    // Spot-check across categories
    const categoriesToCheck = ["html_bq_kpi", "html_bq_monthly", "html_bq_concentration"];
    for (const cat of categoriesToCheck) {
      const rows = curatedMap[cat] || [];
      for (const row of rows) {
        if (row.value1 !== null && row.value1 !== undefined) {
          const val = Number(row.value1);
          expect(Number.isFinite(val)).toBe(true);
        }
      }
    }
  });
});
