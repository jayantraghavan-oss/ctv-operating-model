import mysql2 from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql2.createConnection(process.env.DATABASE_URL);
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

async function seed(category, rows) {
  await conn.execute("DELETE FROM curated_intel WHERE category = ?", [category]);
  let count = 0;
  for (const r of rows) {
    await conn.execute(
      `INSERT INTO curated_intel (id, category, subcategory, label, value1, value2, value3, text1, text2, text3, metadata, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [uid(), category, r.sub || null, r.label || "", r.v1 || null, r.v2 || null, r.v3 || null, r.t1 || null, r.t2 || null, r.t3 || null, r.meta || null, r.sort ?? count]
    );
    count++;
  }
  console.log(`  ${category}: ${count} records`);
}

console.log("=== Seeding final data ===");

// 1. CCCTV Q1 Revenue fallback (monthly data)
await seed("ccctv_q1_revenue", [
  { label: "Oct", v1: 64.9, v2: 274, v3: null, t1: "22" },
  { label: "Nov", v1: 57.9, v2: 274, v3: null, t1: "25" },
  { label: "Dec", v1: 79.2, v2: 274, v3: null, t1: "29" },
  { label: "Jan", v1: 86.8, v2: 274, v3: null, t1: "32" },
  { label: "Feb", v1: 102.7, v2: 274, v3: null, t1: "36" },
  { label: "Mar", v1: 140.8, v2: 274, t1: "39", t2: "195.3" },
]);

// 2. CCCTV Q1 Concentration fallback
await seed("ccctv_q1_concentration", [
  { label: "PMG/FBG (38%)", v1: 38, t1: "#f43f5e" },
  { label: "Kraken (12.6%)", v1: 12.6, t1: "#f97316" },
  { label: "ARBGaming (7.8%)", v1: 7.8, t1: "#eab308" },
  { label: "Luckymoney (7.6%)", v1: 7.6, t1: "#8b5cf6" },
  { label: "NOVIG (4.8%)", v1: 4.8, t1: "#06b6d4" },
  { label: "Rest (29.1%)", v1: 29.1, t1: "#334155" },
]);

// 3. CCCTV Q1 Pipeline stages fallback
await seed("ccctv_q1_pipeline", [
  { label: "Prospecting", v1: 24.1, v2: 87, v3: 100 },
  { label: "Discovery / Demo", v1: 17.4, v2: 63, v3: 72 },
  { label: "Proposal", v1: 10.8, v2: 39, v3: 45 },
  { label: "Negotiation", v1: 6.0, v2: 22, v3: 25 },
  { label: "Close / Active", v1: 3.4, v2: 12, v3: 14 },
]);

// 4. CCCTV Q1 Risk signals fallback
await seed("ccctv_q1_risk", [
  { label: "Advertiser Concentration", sub: "high", t1: "BQ", t2: "Top 1 advertiser (PMG/FBG Oppco LLC) = 38% of all CTV GAS ($74K/day). Top 5 = 70.9%. If any top-3 account pauses, daily run-rate could drop below $100K." },
  { label: "Campaign Volume", sub: "high", t1: "BQ", t2: "39 active campaigns vs 150 EOY target — 3.8× ramp required. BQ count is lower than SearchLight estimate (49) because BQ counts campaigns with actual spend." },
  { label: "Exchange Breadth", sub: "medium", t1: "BQ", t2: "Only 5 exchanges with active CTV spend. MCTV + INDEX + FreeWheel = 87% of volume. Supply concentration mirrors advertiser concentration." },
  { label: "March Momentum Signal", sub: "opportunity", t1: "BQ", t2: "March GAS ($4.1M partial) is the highest month in the dataset — 2× October. The 7-day trailing rate ($195K/day) is significantly above the March monthly avg ($141K/day)." },
]);

// 5. CTVIntelligence DEFAULT_Q3_BEHAVIORS
await seed("ctvi_q3_behavior", [
  { label: "Showed ROAS proof points early", v1: 78, sub: "winning" },
  { label: "Led with ML differentiation", v1: 72, sub: "winning" },
  { label: "Proposed structured test", v1: 68, sub: "winning" },
  { label: "Addressed measurement proactively", v1: 65, sub: "winning" },
  { label: "Failed to address brand safety", v1: 45, sub: "losing" },
  { label: "No competitive differentiation", v1: 38, sub: "losing" },
  { label: "Skipped discovery", v1: 32, sub: "losing" },
]);

// 6. CTVIntelligence DEFAULT_Q3_LOSS_REASONS
await seed("ctvi_q3_loss_reason", [
  { label: "Measurement gaps", v1: 28 },
  { label: "Brand safety concerns", v1: 22 },
  { label: "Incumbent relationship", v1: 18 },
  { label: "Budget constraints", v1: 16 },
  { label: "Product readiness", v1: 10 },
  { label: "Internal priorities", v1: 6 },
]);

// 7. CTVIntelligence DEFAULT_Q4_COMPETITORS
await seed("ctvi_q4_competitor", [
  { label: "The Trade Desk", v1: 42, sub: "high" },
  { label: "DV360", v1: 28, sub: "high" },
  { label: "tvScientific", v1: 18, sub: "medium" },
  { label: "Amazon DSP", v1: 15, sub: "medium" },
  { label: "MNTN", v1: 12, sub: "low" },
  { label: "Roku OneView", v1: 8, sub: "low" },
]);

// 8. CTVIntelligence DEFAULT_Q4_TAM
await seed("ctvi_q4_tam", [
  { label: "Gaming", v1: 2800 },
  { label: "DTC/E-commerce", v1: 2200 },
  { label: "Streaming", v1: 1800 },
  { label: "Retail Media", v1: 1500 },
  { label: "Financial Services", v1: 1200 },
]);

const [r] = await conn.execute("SELECT COUNT(*) as total FROM curated_intel");
console.log(`\n=== Total records: ${r[0].total} ===`);
const [r2] = await conn.execute("SELECT COUNT(DISTINCT category) as cats FROM curated_intel");
console.log(`=== Categories: ${r2[0].cats} ===`);

await conn.end();
console.log("Done!");
