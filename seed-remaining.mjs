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
      `INSERT INTO curated_intel (id, category, subcategory, label, value1, value2, text1, text2, text3, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        uid(),
        category,
        r.sub || null,
        r.label || null,
        r.v1 || null,
        r.v2 || null,
        r.t1 || null,
        r.t2 || null,
        r.t3 || null,
        r.sort ?? count,
      ]
    );
    count++;
  }
  console.log(`  ${category}: ${count} records`);
}

console.log("=== Seeding remaining data ===");

// 1. DataPulse Gong insights (full 8)
await seed("datapulse_gong", [
  { label: "CTV Performance Proof Points", v1: "12", t1: "strong", t2: "12 calls reference ROAS improvement. Average cited: 22% lift vs incumbent DSP. Gaming vertical strongest.", v2: "1" },
  { label: "Brand Safety Concerns", v1: "8", t1: "warning", t2: "8 calls flagged brand safety as a blocker. Buyers want GARM certification before scaling spend.", v2: "1" },
  { label: "Measurement & Attribution", v1: "15", t1: "strong", t2: "15 calls discuss measurement. AppsFlyer integration is the #1 cited enabler. Branch partnership requested 4x.", v2: "1" },
  { label: "Competitive Positioning vs TTD", v1: "6", t1: "neutral", t2: "6 calls compare to The Trade Desk. ML optimization is our differentiator. TTD has brand recognition advantage.", v2: "1" },
  { label: "CTV-to-Web Interest", v1: "4", t1: "emerging", t2: "4 calls express interest in CTV-to-Web. Retail media and DTC brands most interested. Product not yet ready.", v2: "2" },
  { label: "Pricing & Test Fund Sensitivity", v1: "10", t1: "warning", t2: "10 calls discuss pricing. $50K test fund threshold is common. CPM sensitivity high in mid-market.", v2: "3" },
  { label: "SDK Integration Questions", v1: "7", t1: "neutral", t2: "7 calls about SDK requirements. Integration timeline is a concern. Pre-integrated MMP partners reduce friction.", v2: "3" },
  { label: "Creative Format Capabilities", v1: "9", t1: "strong", t2: "9 calls about creative. Video completion rate optimization is a key differentiator. Dynamic creative interest growing.", v2: "2" },
]);

// 2. DataPulse pipeline stages (full 5)
await seed("datapulse_pipeline", [
  { label: "Prospecting", v1: "28", t1: "$2.1M", t2: "bg-foreground/20" },
  { label: "Qualification", v1: "15", t1: "$3.4M", t2: "bg-amber-signal" },
  { label: "Testing", v1: "8", t1: "$1.8M", t2: "bg-primary" },
  { label: "Scaling", v1: "5", t1: "$4.2M", t2: "bg-emerald-signal" },
  { label: "Churned/Lost", v1: "12", t1: "$1.9M", t2: "bg-rose-signal" },
]);

// 3. DataPulse verticals (full 6)
await seed("datapulse_vertical", [
  { label: "Gaming", v1: "18", t1: "hot" },
  { label: "DTC E-commerce", v1: "14", t1: "warm" },
  { label: "Streaming/Entertainment", v1: "11", t1: "warm" },
  { label: "Retail Media", v1: "8", t1: "emerging" },
  { label: "Financial Services", v1: "6", t1: "cool" },
  { label: "Travel & Hospitality", v1: "5", t1: "cool" },
]);

// 4. LearningLoops data
await seed("learning_loop_page", [
  { label: "Gong → Win/Loss → Pitch Refinement", sub: "active", t1: "Gong call analysis feeds win/loss patterns back into pitch materials and talk tracks.", t2: "Gong", t3: "M1 → M1", v1: "87", sort: 0 },
  { label: "Campaign Data → Insight → Selling Point", sub: "active", t1: "BQ performance data generates proof points that strengthen sales narratives.", t2: "BigQuery", t3: "M3 → M1", v1: "72", sort: 1 },
  { label: "Buyer Sim → Objection Bank → Training", sub: "active", t1: "Simulated buyer conversations surface new objections that update training materials.", t2: "BuyerSim", t3: "M2 → M1", v1: "65", sort: 2 },
  { label: "Competitive Intel → Positioning → Pitch", sub: "active", t1: "Market intelligence updates competitive positioning and battle cards in real-time.", t2: "WarRoom", t3: "M2 → M1", v1: "91", sort: 3 },
  { label: "Support Tickets → Product Feedback → Roadmap", sub: "partial", t1: "Customer support patterns feed product improvement priorities.", t2: "Support", t3: "M3 → M4", v1: "45", sort: 4 },
  { label: "Pipeline Signals → Forecast → Resource Allocation", sub: "active", t1: "SFDC pipeline signals drive forecast accuracy and resource allocation decisions.", t2: "Salesforce", t3: "M3 → M4", v1: "78", sort: 5 },
  { label: "Creative Performance → Format Optimization → Brief", sub: "partial", t1: "Creative performance data optimizes format recommendations in new briefs.", t2: "Creative", t3: "M2 → M2", v1: "55", sort: 6 },
  { label: "Market Trends → Strategy Update → GTM Plan", sub: "active", t1: "Market trend analysis triggers strategy updates and GTM plan revisions.", t2: "Research", t3: "M1 → M4", v1: "83", sort: 7 },
]);

// 5. BuyerSim personas (full 4 with all fields) — v1/v2 are decimal so use metadata for vertical/segment
await seed("buyer_persona", [
  { label: "Sarah Chen", sub: "vp_growth", t1: "VP Growth, Gaming Studio", t2: "Aggressive UA targets, CPI-focused, runs $2M/mo mobile. Skeptical of CTV measurement but intrigued by cross-device attribution. Needs hard ROAS proof before any test.", t3: "skeptical|gaming|enterprise" },
  { label: "Marcus Johnson", sub: "head_digital", t1: "Head of Digital, DTC Brand", t2: "Brand-building + performance hybrid. $500K/mo budget, 60% social. Interested in CTV for upper-funnel but needs to justify to CFO. Measurement is the #1 concern.", t3: "curious|dtc|mid-market" },
  { label: "Priya Patel", sub: "dir_programmatic", t1: "Director of Programmatic, Agency", t2: "Manages 15 clients' programmatic. Uses TTD and DV360 heavily. Evaluating Moloco for CTV-specific clients. Cares about scale, brand safety, and reporting granularity.", t3: "analytical|agency|enterprise" },
  { label: "David Kim", sub: "cmo", t1: "CMO, Streaming Service", t2: "Launching ad-supported tier. Needs to prove ad revenue model to board. Interested in CTV-to-App for subscriber acquisition. Budget is flexible if attribution is clear.", t3: "visionary|streaming|enterprise" },
]);

// 6. WarRoom competitors (full 6)
await seed("warroom_competitor", [
  { label: "The Trade Desk", sub: "ttd", t1: "Brand recognition, self-serve, CTV scale", t2: "Rules-based optimization, premium pricing", t3: "high" },
  { label: "tvScientific", sub: "tvs", t1: "CTV-native, incrementality, lower CPMs", t2: "Smaller scale, limited brand safety", t3: "high" },
  { label: "Mntn/Performance TV", sub: "mn", t1: "Self-serve CTV, creative tools, DTC focus", t2: "Limited ML, narrow vertical", t3: "medium" },
  { label: "Innovid", sub: "innovid", t1: "Creative optimization, cross-screen measurement", t2: "Not a DSP, limited buying", t3: "medium" },
  { label: "Roku OneView", sub: "roku", t1: "First-party data, owned inventory", t2: "Walled garden, limited transparency", t3: "medium" },
  { label: "Amazon DSP", sub: "amazon", t1: "Shopping data, massive scale, Fire TV", t2: "Complex UI, Amazon-centric", t3: "high" },
]);

// 7. WarRoom scenarios (full 5)
await seed("warroom_scenario", [
  { label: "Head-to-Head: Gaming Vertical", t1: "Run a competitive bake-off simulation in the gaming vertical. Moloco ML DSP vs The Trade Desk and tvScientific. Analyze win probability, key differentiators, and recommended battle strategy with specific talking points and proof points.", t2: "ttd" },
  { label: "Brand Safety Objection", t1: "A major enterprise buyer raises brand safety concerns about Moloco's CTV offering. Generate a comprehensive objection-handling playbook including current controls, GARM certification timeline, competitive comparison, and risk mitigation strategy.", t2: "tvs" },
  { label: "Price War: Mid-Market CPMs", t1: "A mid-market buyer is comparing CPMs across Moloco, MNTN/Performance TV, and tvScientific. Generate a counter-positioning strategy that shifts the conversation from CPM to effective CPA/ROAS, including specific data points and a test fund proposal.", t2: "mn" },
  { label: "Measurement Shootout", t1: "A sophisticated buyer wants incrementality proof and is comparing Moloco against tvScientific's native incrementality and Innovid's cross-screen measurement. Generate a measurement strategy that leverages MMP partnerships and proposes a joint measurement study.", t2: "innovid" },
  { label: "Retail Media CTV Play", t1: "A retail media network is evaluating Amazon DSP vs Moloco for their CTV advertising program. Generate a positioning strategy that addresses Amazon's first-party data advantage while highlighting Moloco's transparency, cross-publisher optimization, and open-web reach.", t2: "amazon" },
]);

// 8. CCCTVReporting fallback data — ensure all arrays are in DB
// themeData
await seed("ccctv_theme", [
  { label: "Measurement & Attribution", v1: "34", t1: "#0091FF" },
  { label: "Brand Safety", v1: "22", t1: "#F97316" },
  { label: "Creative Optimization", v1: "18", t1: "#8B5CF6" },
  { label: "Cross-Device", v1: "14", t1: "#10B981" },
  { label: "Pricing & CPMs", v1: "12", t1: "#EAB308" },
]);

// verbatims
await seed("ccctv_verbatim", [
  { label: "VP Growth, Gaming", t1: "If you can show me incrementality proof on CTV the way you do on mobile, I'll move $500K tomorrow.", t2: "positive" },
  { label: "Head of Digital, DTC", t1: "We love the ML story but our CFO needs a clear attribution path from TV spot to website visit.", t2: "neutral" },
  { label: "Dir Programmatic, Agency", t1: "TTD gives us one platform for everything. Why should I add another DSP just for CTV?", t2: "negative" },
  { label: "CMO, Streaming", t1: "The CTV-to-App story is exactly what we need for our ad-supported tier launch.", t2: "positive" },
  { label: "VP Marketing, Retail", t1: "Brand safety is non-negotiable. We need GARM certification before we can even test.", t2: "negative" },
  { label: "Growth Lead, Fintech", t1: "The $50K minimum test is steep for us. Can we start smaller and scale based on results?", t2: "neutral" },
]);

// behaviorData
await seed("ccctv_behavior", [
  { label: "Showed ROAS proof points early", v1: "78", t1: "winning" },
  { label: "Led with ML differentiation", v1: "72", t1: "winning" },
  { label: "Proposed test fund structure", v1: "68", t1: "winning" },
  { label: "Addressed measurement proactively", v1: "65", t1: "winning" },
  { label: "Failed to address brand safety", v1: "45", t1: "losing" },
  { label: "No competitive differentiation", v1: "38", t1: "losing" },
  { label: "Skipped discovery questions", v1: "32", t1: "losing" },
  { label: "Oversold capabilities", v1: "28", t1: "losing" },
]);

// lossReasons
await seed("ccctv_loss_reason", [
  { label: "Measurement gaps", v1: "28" },
  { label: "Brand safety concerns", v1: "22" },
  { label: "Incumbent relationship (TTD)", v1: "18" },
  { label: "Budget constraints", v1: "16" },
  { label: "Product readiness (CTV2Web)", v1: "10" },
  { label: "Internal priorities shifted", v1: "6" },
]);

// competitorData
await seed("ccctv_competitor", [
  { label: "The Trade Desk", v1: "42", t1: "high" },
  { label: "DV360", v1: "28", t1: "high" },
  { label: "tvScientific", v1: "18", t1: "medium" },
  { label: "Amazon DSP", v1: "15", t1: "medium" },
  { label: "MNTN", v1: "12", t1: "low" },
  { label: "Roku OneView", v1: "8", t1: "low" },
]);

// winRateByBehavior
await seed("ccctv_winrate_behavior", [
  { label: "ROAS proof early", v1: "62" },
  { label: "ML differentiation", v1: "58" },
  { label: "Test fund proposal", v1: "55" },
  { label: "Measurement plan", v1: "52" },
  { label: "No proof points", v1: "18" },
]);

// winRateByCompetitor
await seed("ccctv_winrate_competitor", [
  { label: "vs TTD", v1: "34" },
  { label: "vs DV360", v1: "41" },
  { label: "vs tvScientific", v1: "52" },
  { label: "vs Amazon", v1: "48" },
  { label: "vs MNTN", v1: "61" },
]);

// tamData
await seed("ccctv_tam", [
  { label: "Gaming", v1: "2800" },
  { label: "DTC/E-commerce", v1: "2200" },
  { label: "Streaming", v1: "1800" },
  { label: "Retail Media", v1: "1500" },
  { label: "Financial Services", v1: "1200" },
]);

// competitiveSignals
await seed("ccctv_comp_signal", [
  { label: "TTD launched CTV self-serve for mid-market", t1: "high", t2: "2 weeks ago" },
  { label: "tvScientific raised $28M Series B", t1: "medium", t2: "1 month ago" },
  { label: "Amazon DSP added CTV incrementality reporting", t1: "high", t2: "3 weeks ago" },
  { label: "Roku OneView expanded to 5 new markets", t1: "low", t2: "1 month ago" },
  { label: "MNTN partnered with Shopify for DTC CTV", t1: "medium", t2: "2 weeks ago" },
]);

// pipelineStages for CCCTVReporting
await seed("ccctv_pipeline", [
  { label: "Contact Qualified", v1: "18", t1: "$1.2M", t2: "bg-foreground/20" },
  { label: "Sales Qualified", v1: "12", t1: "$2.8M", t2: "bg-amber-signal" },
  { label: "Pitched", v1: "8", t1: "$1.5M", t2: "bg-primary" },
  { label: "Planned", v1: "5", t1: "$0.9M", t2: "bg-violet-500" },
  { label: "DPA Negotiation", v1: "3", t1: "$0.6M", t2: "bg-emerald-signal" },
  { label: "In Legal", v1: "2", t1: "$0.4M", t2: "bg-rose-signal" },
]);

// concentration
await seed("ccctv_concentration", [
  { label: "Top 5 accounts", v1: "45" },
  { label: "Top 10 accounts", v1: "62" },
  { label: "Top 20 accounts", v1: "78" },
  { label: "Top 50 accounts", v1: "91" },
  { label: "Long tail", v1: "9" },
]);

// risk signals
await seed("ccctv_risk_signal", [
  { label: "3 enterprise deals stalled >30 days in DPA stage", t1: "high" },
  { label: "Top account concentration risk: 45% from top 5", t1: "medium" },
  { label: "CTV2Web pipeline thin — only 8 qualified opps", t1: "high" },
  { label: "2 key champions changed roles at target accounts", t1: "medium" },
]);

const [r] = await conn.execute("SELECT COUNT(*) as total FROM curated_intel");
console.log(`\n=== Total records: ${r[0].total} ===`);
const [r2] = await conn.execute("SELECT COUNT(DISTINCT category) as cats FROM curated_intel");
console.log(`=== Categories: ${r2[0].cats} ===`);

await conn.end();
console.log("Done!");
