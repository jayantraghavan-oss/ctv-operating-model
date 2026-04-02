/**
 * seed-reporting-data.mjs — Seeds remaining hardcoded data from reporting.ts into curated_intel.
 * Categories: campaign, sentiment_trend, activity_trend, weekly_prep_*
 */
import mysql2 from "mysql2/promise";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
dotenv.config();

const conn = await mysql2.createConnection({ uri: process.env.DATABASE_URL, ssl: {} });
const uid = () => randomUUID().replace(/-/g, "").slice(0, 32);

async function seedCategory(category, rows) {
  await conn.execute("DELETE FROM curated_intel WHERE category = ?", [category]);
  let count = 0;
  for (const r of rows) {
    await conn.execute(
      `INSERT INTO curated_intel (id, category, subcategory, label, value1, value2, value3, text1, text2, text3, text4, metadata, sort_order, is_active, data_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        uid(), category, r.sub || null, r.label || "", r.v1 ?? null, r.v2 ?? null, r.v3 ?? null,
        r.t1 ?? null, r.t2 ?? null, r.t3 ?? null, r.t4 ?? null,
        r.meta ? JSON.stringify(r.meta) : null, r.sort ?? count, r.src ?? null
      ]
    );
    count++;
  }
  console.log(`  [${category}] ${count} records`);
}

console.log("Seeding remaining reporting data...\n");

// ============================================================================
// CAMPAIGNS (from REAL_CTV_CAMPAIGNS in reporting.ts)
// ============================================================================
await seedCategory("campaign", [
  { label: "Tang Luck CTV", t1: "scaling", t2: "#ctv-vip-winnerstudio", sort: 0, meta: { customer: "Tang Luck", region: "APAC", vertical: "Gaming", dailySpend: 57000, totalSpend: 570000, d1Roas: 14.1, d7Roas: 52, healthScore: 92, daysActive: 10, kpiPerformance: 118, nextStep: "Continue scaling — model delivering above KPIs at $57K/day", sentiment: "positive" } },
  { label: "Experian CTV (via PMG)", t1: "scaling", t2: "#amer-win-wire", sort: 1, meta: { customer: "Experian / PMG", region: "AMER", vertical: "Fintech", dailySpend: 5000, totalSpend: 100000, d1Roas: 0, d7Roas: 0, healthScore: 85, daysActive: 45, kpiPerformance: 110, nextStep: "Internal case study for PMG to shop Moloco CTV to more clients", sentiment: "positive" } },
  { label: "Fanatics CTV (via PMG)", t1: "test", t2: "#amer-win-wire", sort: 2, meta: { customer: "Fanatics / PMG", region: "AMER", vertical: "E-Commerce", dailySpend: 10000, totalSpend: 200000, d1Roas: 0, d7Roas: 0, healthScore: 78, daysActive: 42, kpiPerformance: 95, nextStep: "Layers of performance, brand, and Tubi — close $200K commit", sentiment: "positive" } },
  { label: "CHAI Research CTV", t1: "scaling", t2: "#external-chai-research", sort: 3, meta: { customer: "CHAI Research Corp", region: "AMER", vertical: "Gaming", dailySpend: 24000, totalSpend: 720000, d1Roas: 0, d7Roas: 0, healthScore: 95, daysActive: 90, kpiPerformance: 130, nextStep: "Finalize Net 45 terms — scaling UA from $30M to $50M+ in 2026", sentiment: "positive" } },
  { label: "CTV2Web Training Phase", t1: "test", t2: "#ctv-all", sort: 4, meta: { customer: "CTV2Web (Internal)", region: "Global", vertical: "Platform", dailySpend: 4200, totalSpend: 127000, d1Roas: 0, d7Roas: 0, healthScore: 72, daysActive: 30, kpiPerformance: 85, nextStep: "Transition from Training to Test Phase — positive CPPV uplift observed", sentiment: "neutral" } },
  { label: "Novig CTV", t1: "test", t2: "#external-novig-moloco", sort: 5, meta: { customer: "Novig", region: "AMER", vertical: "Gaming", dailySpend: 3000, totalSpend: 45000, d1Roas: 0, d7Roas: 0, healthScore: 70, daysActive: 15, kpiPerformance: 80, nextStep: "Updated CTV assets — monitor performance post-creative refresh", sentiment: "neutral" } },
  { label: "APAC CTV Activation (H1 Fund)", t1: "test", t2: "#ctv-chn-activation", sort: 6, meta: { customer: "APAC CTV Fund", region: "APAC", vertical: "Multi-Vertical", dailySpend: 2000, totalSpend: 120000, d1Roas: 0, d7Roas: 0, healthScore: 68, daysActive: 21, kpiPerformance: 75, nextStep: "Target 20 new activations — 20% of 1K DRR for 4 weeks each", sentiment: "neutral" } },
  { label: "CTV Web Activation (H1 Fund)", t1: "test", t2: "#ctv-chn-activation", sort: 7, meta: { customer: "Web CTV Fund", region: "Global", vertical: "Multi-Vertical", dailySpend: 5800, totalSpend: 350000, d1Roas: 0, d7Roas: 0, healthScore: 65, daysActive: 14, kpiPerformance: 70, nextStep: "10 new activations — each customer ~$30K allocation", sentiment: "neutral" } },
]);

// ============================================================================
// SENTIMENT TREND (from reporting.ts buildCustomerVoice)
// ============================================================================
await seedCategory("sentiment_trend", [
  { label: "W1 (Mar 3)", v1: 12, v2: 8, v3: 4, sort: 0 },
  { label: "W2 (Mar 10)", v1: 10, v2: 9, v3: 5, sort: 1 },
  { label: "W3 (Mar 17)", v1: 14, v2: 7, v3: 3, sort: 2 },
  { label: "W4 (Mar 24)", v1: 16, v2: 6, v3: 2, sort: 3 },
]);

// ============================================================================
// ACTIVITY TREND (from reporting.ts buildWinLossPatterns)
// ============================================================================
await seedCategory("activity_trend", [
  { label: "W1 (Mar 3)", v1: 32, v2: 12, v3: 85, sort: 0 },
  { label: "W2 (Mar 10)", v1: 28, v2: 10, v3: 78, sort: 1 },
  { label: "W3 (Mar 17)", v1: 38, v2: 15, v3: 95, sort: 2 },
  { label: "W4 (Mar 24)", v1: 42, v2: 18, v3: 102, sort: 3 },
]);

// ============================================================================
// MONTHLY ACTUALS (from reporting.ts buildRevenueTrajectory)
// ============================================================================
await seedCategory("monthly_actual", [
  { label: "Jan", v1: 180000, sort: 0 },
  { label: "Feb", v1: 320000, sort: 1 },
  { label: "Mar", v1: 890000, sort: 2 },
]);

// ============================================================================
// WEEKLY PREP DATA (from WeeklyPrep.tsx weeklyPrepData)
// ============================================================================
await seedCategory("weekly_prep_summary", [
  { label: "executive_summary", t1: "CTV pipeline continues to build with 12 active opportunities ($4.2M weighted). Three deals advancing to negotiation stage. Key risk: brand safety certification delay may impact Q2 close targets. ML performance data from latest tests supports conviction on Learning Goal #1. Web product beta timeline slipping — needs XFN escalation.", sort: 0 },
]);

await seedCategory("weekly_prep_module", [
  { label: "Market Intelligence", v1: 1, sub: "green", t1: "Competitor tvScientific launched incrementality measurement. Three analyst reports this week emphasize this capability. Our positioning needs to address this gap.", sort: 0, meta: { actionItems: ["Update battlecards with tvScientific incrementality feature", "Draft counter-positioning messaging emphasizing ML optimization advantage", "Schedule product discussion on incrementality roadmap"], metrics: { signalsDetected: 47, battlecardsUpdated: 3, positioningGaps: 1 } } },
  { label: "Pipeline & Activation", v1: 2, sub: "yellow", t1: "Three deals moving to negotiation stage ($1.2M combined). Test-to-scale conversion rate improved to 40% this quarter. APAC activation fund showing early traction with 5 new tests launched.", sort: 1, meta: { actionItems: ["Follow up on Fanatics PMG negotiation — close by month-end", "Review APAC test results and identify scale candidates", "Update pipeline tracker with latest stage movements"], metrics: { activeDeals: 12, testsLaunched: 5, conversionRate: 40 } } },
  { label: "Customer Success", v1: 3, sub: "green", t1: "Tang Luck continues to scale — now at $57K/day with D1 ROAS 14.1%. CHAI Research finalizing Net 45 terms. Experian case study draft ready for PMG review.", sort: 2, meta: { actionItems: ["Finalize CHAI Research contract terms", "Get PMG approval on Experian case study", "Schedule Tang Luck QBR for next month"], metrics: { activeAccounts: 8, healthScore: 87, npsScore: 72 } } },
  { label: "Executive Governance", v1: 4, sub: "red", t1: "CTV-to-Web beta timeline slipping by 2 weeks. Need XFN escalation to Engineering. Brand safety certification (GARM) application submitted — awaiting response. EOQ2 investment decision framework needs updating with latest data.", sort: 3, meta: { actionItems: ["Escalate CTV-to-Web timeline to VP Engineering", "Follow up on GARM certification application", "Update conviction dashboard with latest learning goal evidence"], metrics: { openDecisions: 3, escalations: 1, certificationStatus: "pending" } } },
]);

await seedCategory("weekly_prep_discussion", [
  { label: "CTV-to-Web Beta Timeline", sub: "escalation", t1: "Engineering reports 2-week delay on CTV-to-Web beta. Impact: 3 EMEA deals waiting on this capability. Need VP Engineering alignment on priority.", sort: 0 },
  { label: "APAC Attribution Issues", sub: "technical", t1: "Multiple APAC campaigns showing no revenue/payers despite active spend. Ad-Ops investigating postback configuration. May need product fix.", sort: 1 },
  { label: "Agency Strategy (PMG Expansion)", sub: "strategic", t1: "PMG brought Experian and Fanatics. They're evaluating 3 more clients for CTV. Should we formalize the agency partnership with dedicated support?", sort: 2 },
  { label: "Q2 Hiring Decision", sub: "resource", t1: "Current 2 FTE + agents model is working but stretched. If pipeline exceeds $5M weighted, we may need a third FTE focused on APAC.", sort: 3 },
]);

await seedCategory("weekly_prep_decision", [
  { label: "CTV-to-Web: Delay customer communications or set expectations now?", sub: "high", t1: "Recommend: Set expectations now with affected EMEA prospects. Transparency builds trust. Provide updated timeline and interim CTV-to-App alternative.", sort: 0 },
  { label: "APAC Fund: Continue at current pace or accelerate?", sub: "medium", t1: "Recommend: Continue current pace. 5 tests launched, need results before scaling. Review at end of month.", sort: 1 },
  { label: "PMG Agency Partnership: Formalize or keep informal?", sub: "medium", t1: "Recommend: Formalize with lightweight SVA. PMG has brought $300K+ in pipeline — worth investing in the relationship.", sort: 2 },
]);

await seedCategory("weekly_prep_learning", [
  { label: "CTV-to-App ML Performance", sub: "strong", v1: 75, t1: "Tang Luck D1 ROAS 14.1% at $57K/day validates ML optimization at scale. CHAI at $24K DRR confirms cross-vertical applicability.", sort: 0 },
  { label: "CTV-to-Web Viability", sub: "moderate", v1: 50, t1: "Training phase showing positive CPPV uplift but beta delayed. Need 4 more weeks of data before conviction assessment.", sort: 1 },
  { label: "Agency Flywheel", sub: "moderate", v1: 55, t1: "PMG brought 2 clients (Experian, Fanatics). Early signal that agency channel can scale pipeline. Need 2 more agency activations to confirm pattern.", sort: 2 },
  { label: "APAC Market Readiness", sub: "weak", v1: 30, t1: "Attribution issues in APAC campaigns cast doubt on market readiness. Need to resolve postback problems before drawing conclusions.", sort: 3 },
]);

// ============================================================================
// THEMES (from reporting.ts buildCustomerVoice fallback)
// ============================================================================
await seedCategory("theme", [
  { label: "CTV-to-App performance measurement", v1: 18, t1: "up", t2: "Buyers want proof that CTV drives app installs — our MMP integration story is the key differentiator", sort: 0 },
  { label: "Cross-device attribution (CTV → mobile)", v1: 15, t1: "up", t2: "Household-level attribution is a must-have — this is where Moloco's ML advantage shows", sort: 1 },
  { label: "Incrementality vs existing mobile campaigns", v1: 12, t1: "up", t2: "75% of CTV conversions are net-new users — we need to lead with this in every pitch", sort: 2 },
  { label: "CTV-to-Web measurement gaps", v1: 10, t1: "flat", t2: "This is blocking EMEA/APAC pipeline — standardized deck needed urgently", sort: 3 },
  { label: "Competitive positioning vs TTD/Amazon DSP", v1: 9, t1: "flat", t2: "TTD is the default incumbent — we need sharper battlecards for displacement pitches", sort: 4 },
  { label: "Creative optimization for CTV", v1: 8, t1: "up", t2: "Advertisers want creative guidance — opportunity for Creative Studio to add value", sort: 5 },
  { label: "Test budget sizing and duration", v1: 7, t1: "down", t2: "4-week / $50K minimum is landing well — less friction than before", sort: 6 },
  { label: "Supply quality and inventory transparency", v1: 6, t1: "flat", t2: "FAST channels (Tubi, Roku) are undervalued — Doug Paladino sees opportunity here", sort: 7 },
]);

// ============================================================================
// OBJECTIONS (from reporting.ts buildCustomerVoice fallback)
// ============================================================================
await seedCategory("objection", [
  { label: "How do you measure CTV-to-App attribution without a pixel?", v1: 14, v2: 55, t1: "We integrate with all major MMPs (AppsFlyer, Adjust, Branch) for deterministic attribution. Our ML model also uses probabilistic signals at the household level.", sort: 0 },
  { label: "We already run CTV through TTD — why switch?", v1: 11, v2: 40, t1: "Not asking you to switch — start with a 4-week test alongside TTD. Our ML optimization typically delivers 20-40% better ROAS. Experian ran this exact test and paused TTD.", sort: 1 },
  { label: "CTV budgets are separate from mobile — different buyer", v1: 9, v2: 35, t1: "That's exactly why CTV is incremental. 75% of CTV conversions come from users not seen on mobile. We help you reach the brand buyer with performance metrics they can act on.", sort: 2 },
  { label: "Need Brand Lift Study before committing to scale", v1: 7, v2: 50, t1: "We support BLS through our measurement partners. But consider: Tang Luck scaled to $57K/day based on D1 ROAS alone — hard performance metrics often move faster than BLS.", sort: 3 },
  { label: "CPMs seem high vs linear TV", v1: 6, v2: 60, t1: "CTV CPMs are higher ($25-45) but the targeting precision means lower effective CPA. Our ML optimization drives CPMs down over time as the model learns.", sort: 4 },
  { label: "How does Moloco CTV work for web-only advertisers?", v1: 5, v2: 30, t1: "CTV-to-Web is in active development — we're in training phase with positive CPPV uplift. For now, CTV-to-App is our strongest offering. We'll have a Web solution by mid-2026.", sort: 5 },
]);

// ============================================================================
// COMPETITOR MENTIONS (from reporting.ts buildCustomerVoice fallback)
// ============================================================================
await seedCategory("competitor_mention", [
  { label: "The Trade Desk", v1: 14, t1: "Primary incumbent — mentioned in 30%+ of pitches. UID2/OpenPath is their moat.", t2: "high", sort: 0 },
  { label: "Amazon DSP", v1: 11, t1: "Growing CTV via Freevee/Prime Video. Netflix partnership in Q2.", t2: "high", sort: 1 },
  { label: "DV360", v1: 8, t1: "Google's CTV play — strong with brand-focused buyers.", t2: "medium", sort: 2 },
  { label: "tvScientific", v1: 6, t1: "New 'Guaranteed Outcomes' — pay-for-results positioning. Pinterest acquisition.", t2: "medium", sort: 3 },
  { label: "Roku OneView", v1: 5, t1: "Owns supply + data. Walled garden advantage.", t2: "low", sort: 4 },
]);

// ============================================================================
// QUOTES (from reporting.ts buildCustomerVoice fallback)
// ============================================================================
await seedCategory("quote", [
  { label: "Given the strong performance we are seeing, it is clear that your mobile secret sauce shows a lot of intent at the household level.", t1: "Doug Paladino (Experian)", t2: "2026-03-15", t3: "positive", sort: 0 },
  { label: "FAST channels and cheap stuff in CTV is still really undervalued... there is a lot more value and signals in Tubi and Roku.", t1: "Doug Paladino (Experian)", t2: "2026-03-15", t3: "positive", sort: 1 },
  { label: "Weekend data at $57K/day is nearly complete, and CTV model is delivering above client KPIs.", t1: "Hye Jeong Lee (Tang Luck update)", t2: "2026-03-29", t3: "positive", sort: 2 },
  { label: "We're seeing no revenue or payers on the CTV campaign while mobile campaigns show healthy D7 ROAS.", t1: "APAC client (CTV-sales-apac)", t2: "2026-03-22", t3: "negative", sort: 3 },
]);

// ============================================================================
// WINNING BEHAVIORS (from reporting.ts buildWinLossPatterns fallback)
// ============================================================================
await seedCategory("winning_behavior", [
  { label: "Lead with incrementality data (75% net-new users)", t1: "2x higher conversion from Pitch to Test", t2: "Experian, Tang Luck, CHAI all converted after seeing incrementality proof", t3: "high", sort: 0 },
  { label: "Propose 4-week test with clear KPIs upfront", t1: "60% test-to-scale conversion vs 25% without clear KPIs", t2: "Tang Luck scaled to $57K/day after structured 4-week test", t3: "high", sort: 1 },
  { label: "Engage the mobile/performance buyer, not the brand buyer", t1: "3x faster deal cycle (45d vs 120d+)", t2: "Brand-focused pitches stall at Pitch stage — performance buyers have budget authority", t3: "medium", sort: 2 },
  { label: "Use MMP integration as proof of measurement rigor", t1: "Overcomes #1 objection (attribution without pixel)", t2: "55% win rate when this objection is addressed with MMP story", t3: "medium", sort: 3 },
  { label: "Reference specific customer results (Tang Luck D1 ROAS 14.1%)", t1: "Builds credibility faster than generic CTV claims", t2: "Reps who cite specific results close 30% faster", t3: "low", sort: 4 },
]);

// ============================================================================
// LOSING PATTERNS (from reporting.ts buildWinLossPatterns fallback)
// ============================================================================
await seedCategory("losing_pattern", [
  { label: "Pitching CTV-to-Web before the product is ready", t1: "Creates expectation gap — customer disappointed when measurement isn't available", t2: "Multiple APAC deals stalled on CTV-to-Web measurement gaps", v1: 8, sort: 0 },
  { label: "Not proactively aligning on evergreen criteria before test ends", t1: "Customer pauses to 'evaluate' — momentum dies", t2: "Test-to-scale stall is the #1 funnel bottleneck", v1: 6, sort: 1 },
  { label: "Targeting brand-only buyers without performance angle", t1: "Deal cycle extends to 120+ days, often stalls at Proposal", t2: "CTV-experienced (branding) persona has 35% win rate vs 45% for performance", v1: 5, sort: 2 },
  { label: "Not involving agency partner (PMG, etc.) early enough", t1: "Misses the agency flywheel — PMG brought Experian AND Fanatics", t2: "Agency-sourced deals have 2x pipeline value", v1: 4, sort: 3 },
]);

// ============================================================================
// REP PERFORMANCE (from reporting.ts buildWinLossPatterns fallback)
// ============================================================================
await seedCategory("rep_performance", [
  { label: "Gabriel Green", v1: 720000, v2: 200000, v3: 55, t1: "CHAI relationship — deep trust, fast deal cycles", sort: 0, meta: { avgCycleDays: 35 } },
  { label: "Hye Jeong Lee", v1: 570000, v2: 350000, v3: 50, t1: "APAC market expertise — Tang Luck scaling success", sort: 1, meta: { avgCycleDays: 28 } },
  { label: "Austin White", v1: 300000, v2: 500000, v3: 45, t1: "Agency relationships — PMG flywheel (Experian + Fanatics)", sort: 2, meta: { avgCycleDays: 42 } },
  { label: "Clara Copeland", v1: 0, v2: 400000, v3: 30, t1: "Pipeline builder — strong at generating new opportunities", sort: 3, meta: { avgCycleDays: 55 } },
]);

// ============================================================================
// COACHING (from reporting.ts buildWinLossPatterns fallback)
// ============================================================================
await seedCategory("coaching", [
  { label: "CTV-to-Web pitch (global deck in progress)", v1: 8, t1: "high", t2: "Hold off on CTV-to-Web pitches until standardized deck is ready — use CTV-to-App as primary offering", sort: 0 },
  { label: "Test-to-scale conversion playbook", v1: 10, t1: "high", t2: "Proactively schedule 'evergreen criteria' discussion in week 2 of test — don't wait for test to end", sort: 1 },
  { label: "Competitive positioning vs Amazon DSP / tvScientific", v1: 5, t1: "medium", t2: "Review updated battlecards — Amazon Netflix partnership and tvScientific Guaranteed Outcomes are new angles", sort: 2 },
  { label: "CTV attribution and postback troubleshooting", v1: 6, t1: "high", t2: "Partner with Ad-Ops on pre-launch postback verification checklist — APAC attribution issues are preventable", sort: 3 },
  { label: "EMEA/APAC CTV supply positioning", v1: 4, t1: "medium", t2: "Use Doug Paladino's insight: FAST channels (Tubi, Roku) are undervalued — position as signal-rich, not cheap", sort: 4 },
]);

// ============================================================================
// TEST-TO-SCALE DRIVERS (from reporting.ts buildWinLossPatterns fallback)
// ============================================================================
await seedCategory("test_to_scale", [
  { label: "Clear KPIs agreed before test starts", t1: "strong", t2: "Tang Luck had D1 ROAS 12% target — exceeded at 14.1%, immediate scale decision", sort: 0 },
  { label: "Weekly performance check-ins during test", t1: "strong", t2: "Campaigns with weekly check-ins scale 2x more often than set-and-forget", sort: 1 },
  { label: "Proactive evergreen criteria discussion in week 2", t1: "moderate", t2: "Prevents the 'pause to evaluate' pattern that kills momentum", sort: 2 },
  { label: "Agency partner involvement", t1: "moderate", t2: "PMG-sourced tests have higher scale rates — agency has incentive to show results", sort: 3 },
  { label: "Creative refresh mid-test", t1: "weak", t2: "Novig refreshed creatives — too early to tell if it improves scale conversion", sort: 4 },
]);

// ============================================================================
// WIN/LOSS DYNAMICS (from reporting.ts buildMarketPosition fallback)
// ============================================================================
await seedCategory("win_loss_dynamic", [
  { label: "The Trade Desk", v1: 3, v2: 5, t1: "Challenger — winning on ML/performance, losing on brand reach and UID2 ecosystem", t2: "ML-driven optimization delivers 20-40% better ROAS in head-to-head tests", sort: 0 },
  { label: "Amazon DSP", v1: 2, v2: 3, t1: "Niche — winning with app-first advertisers, losing with brand/retail buyers", t2: "CTV-to-App attribution via MMP integration — Amazon can't match this for non-Amazon advertisers", sort: 1 },
  { label: "DV360", v1: 4, v2: 2, t1: "Advantage — winning on performance metrics, Google's CTV offering is still immature", t2: "Real-time ML optimization vs DV360's batch-based approach", sort: 2 },
  { label: "tvScientific", v1: 1, v2: 1, t1: "Even — too early to tell, but their 'Guaranteed Outcomes' is a compelling pitch", t2: "We have scale and proven ML; they have a novel pricing model", sort: 3 },
  { label: "Roku OneView", v1: 2, v2: 0, t1: "Advantage — Roku is supply-focused, we're demand-focused with better optimization", t2: "Cross-publisher optimization vs Roku's walled garden", sort: 4 },
]);

// ============================================================================
// COMPETITIVE SIGNALS (from reporting.ts buildMarketPosition fallback)
// ============================================================================
await seedCategory("competitive_signal", [
  { label: "tvScientific launched 'Guaranteed Outcomes' — pay only for verified conversions", t1: "#ctv-market-intelligence", t2: "2026-03-20", t3: "high", t4: "Changes the pricing conversation — we need a response or risk losing performance-focused buyers", sort: 0 },
  { label: "Netflix Ads Suite targeting $3B ad revenue by 2027 — Amazon partnership for ad tech", t1: "#ctv-market-intelligence", t2: "2026-03-15", t3: "high", t4: "Premium CTV inventory expanding rapidly — we need Netflix supply integration on the roadmap", sort: 1 },
  { label: "TTD reported $1.9B revenue — CTV is their fastest-growing segment", t1: "Earnings", t2: "2026-02-28", t3: "medium", t4: "TTD is investing heavily in CTV — expect more aggressive pricing and features", sort: 2 },
  { label: "Smadex (Entravision) building CTV partnerships — new entrant in performance CTV", t1: "#ctv-market-intelligence", t2: "2026-03-10", t3: "low", t4: "More competition validates the market but fragments buyer attention", sort: 3 },
  { label: "Signal loss accelerating — cookie deprecation driving more budget to CTV", t1: "Industry reports", t2: "2026-03", t3: "medium", t4: "Tailwind for CTV adoption — our ML advantage becomes more valuable as signals get scarcer", sort: 4 },
]);

// ============================================================================
// TAM SEGMENTS (from reporting.ts buildMarketPosition fallback)
// ============================================================================
await seedCategory("tam_segment", [
  { label: "CTV-to-App (Performance)", v1: 8000000000, v2: 2000000000, v3: 0.0007, sort: 0 },
  { label: "CTV-to-App (Brand + Performance)", v1: 15000000000, v2: 4000000000, v3: 0.0004, sort: 1 },
  { label: "CTV-to-Web (Performance)", v1: 5000000000, v2: 500000000, v3: 0.0003, sort: 2 },
]);

// ============================================================================
// MARKET TRENDS (from reporting.ts buildMarketPosition fallback)
// ============================================================================
await seedCategory("market_trend", [
  { label: "CTV ad spend growing 25% YoY — fastest-growing digital channel", t1: "accelerating", t2: "Rising tide lifts all boats — but competition is intensifying proportionally", sort: 0 },
  { label: "FAST channels (Tubi, Pluto, Roku Channel) gaining share vs premium", t1: "accelerating", t2: "FAST inventory is signal-rich and undervalued — aligns with our ML advantage", sort: 1 },
  { label: "Performance measurement becoming table stakes for CTV buyers", t1: "accelerating", t2: "Our MMP integration and ML optimization are exactly what the market is demanding", sort: 2 },
  { label: "Agency consolidation of CTV buying through fewer platforms", t1: "stable", t2: "PMG flywheel validates this — agencies want one platform for CTV + mobile", sort: 3 },
  { label: "Retail media networks expanding into CTV", t1: "accelerating", t2: "Potential new buyer segment — but may also bring Amazon DSP deeper into CTV", sort: 4 },
]);

// ============================================================================
// MOLOCO ADVANTAGES (from reporting.ts buildMarketPosition fallback)
// ============================================================================
await seedCategory("advantage", [
  { label: "ML-first optimization — proven on mobile, now applied to CTV", t1: "Tang Luck D1 ROAS 14.1% at $57K/day; CHAI $24K DRR record", t2: "durable", sort: 0 },
  { label: "CTV-to-App attribution via MMP integration", t1: "75% of CTV conversions are net-new users not seen on mobile", t2: "durable", sort: 1 },
  { label: "Cross-device household graph from mobile data", t1: "Doug Paladino: 'your mobile secret sauce shows a lot of intent at the household level'", t2: "durable", sort: 2 },
  { label: "Agency flywheel starting (PMG → Experian → Fanatics)", t1: "PMG brought 2 clients in Q1 — shopping Moloco CTV to more", t2: "temporary", sort: 3 },
  { label: "FAST channel signal extraction", t1: "Tubi and Roku data is undervalued — our ML can extract more signal than competitors", t2: "at-risk", sort: 4 },
]);

// ============================================================================
// MOLOCO VULNERABILITIES (from reporting.ts buildMarketPosition fallback)
// ============================================================================
await seedCategory("vulnerability", [
  { label: "No CTV-to-Web measurement yet", t1: "Blocks entire EMEA/APAC pipeline segment — web-only advertisers can't use us", t2: "CTV2Web in training phase — positive CPPV uplift. Target mid-2026 for GA.", sort: 0 },
  { label: "Small CTV team (2 FTEs + agents)", t1: "Can't cover all regions and verticals simultaneously", t2: "AI-first operating model — agents handle 80% of routine work, humans focus on strategic accounts", sort: 1 },
  { label: "No Brand Lift Study integration", t1: "Brand-focused buyers need BLS before scaling", t2: "Partner with measurement vendors for BLS. Lead with performance metrics in the meantime.", sort: 2 },
  { label: "Limited CTV supply partnerships", t1: "TTD and Amazon have deeper supply relationships", t2: "Focus on FAST channels where we can differentiate. Build supply partnerships incrementally.", sort: 3 },
]);

// ============================================================================
// EARLY SIGNALS (from reporting.ts buildRevenueTrajectory fallback)
// ============================================================================
await seedCategory("early_signal", [
  { label: "Tang Luck scaling to $57K/day with D1 ROAS 14.1% — validates CTV-to-App model at scale", t1: "high", t2: "#ctv-vip-winnerstudio", sort: 0 },
  { label: "CHAI Research planning $30M → $50M+ UA in 2026 — CTV is a growing share of their mix", t1: "high", t2: "#external-chai-research", sort: 1 },
  { label: "PMG shopping Moloco CTV to more clients after Experian win — agency flywheel starting", t1: "medium", t2: "#amer-win-wire", sort: 2 },
  { label: "~75% of CTV conversions from users not seen on mobile — strong incrementality story", t1: "medium", t2: "Experian data", sort: 3 },
  { label: "APAC CTV campaigns showing no revenue/payers — postback attribution issues", t1: "high", t2: "#ctv-sales-apac", sort: 4 },
  { label: "CTV-to-Web measurement gaps creating friction in sales conversations", t1: "high", t2: "GTM Alignment Doc", sort: 5 },
  { label: "EMEA/APAC pipeline tracker outdated — may be missing opportunities", t1: "medium", t2: "GTM Alignment Doc", sort: 6 },
  { label: "Test-to-scale stalls when customers pause to evaluate after 4-week test", t1: "medium", t2: "Gong", sort: 7 },
]);

// Print summary
const [r] = await conn.execute("SELECT COUNT(*) as total FROM curated_intel");
console.log(`\n=== Total records: ${r[0].total} ===`);
const [r2] = await conn.execute("SELECT COUNT(DISTINCT category) as cats FROM curated_intel");
console.log(`=== Categories: ${r2[0].cats} ===`);

await conn.end();
console.log("Done!");
