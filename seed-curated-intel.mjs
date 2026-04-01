/**
 * Seed script: Loads ALL curated intelligence data into the curated_intel table.
 * Replaces 50+ hardcoded arrays across the codebase with a single DB source of truth.
 *
 * Categories seeded:
 * - behavior (win/loss behaviors)
 * - loss_reason (why deals are lost)
 * - competitor (competitive landscape)
 * - tam_segment (TAM by vertical/segment)
 * - competitive_signal (market signals)
 * - theme (customer voice themes)
 * - objection (customer objections)
 * - quote (customer verbatims)
 * - winning_behavior (what winners do)
 * - losing_pattern (what losers do)
 * - rep_performance (rep leaderboard)
 * - coaching (coaching opportunities)
 * - test_to_scale (test-to-scale drivers)
 * - win_loss_dynamic (win/loss by competitor)
 * - market_trend (market trends)
 * - advantage (Moloco advantages)
 * - vulnerability (Moloco vulnerabilities)
 * - early_signal (pipeline signals)
 * - region (regional breakdown)
 * - campaign (real CTV campaigns)
 * - risk (exec summary risks)
 * - opportunity (exec summary opportunities)
 * - open_question (exec summary open questions)
 * - sentiment_trend (sentiment over time)
 * - competitor_mention (competitor mentions in calls)
 * - persona (buyer sim personas)
 */
import mysql from "mysql2/promise";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const pool = mysql.createPool({ uri: DATABASE_URL, ssl: {}, connectionLimit: 3 });

async function clearAndSeed() {
  const conn = await pool.getConnection();
  try {
    // Clear existing curated data
    await conn.query("DELETE FROM curated_intel");
    console.log("[Seed] Cleared curated_intel table");

    const rows = [];
    let order = 0;

    // ═══════════════════════════════════════════════════════════════
    // BEHAVIORS (Win/Loss) — unified from CTVIntelligence + CCCTVReporting + reporting.ts
    // ═══════════════════════════════════════════════════════════════
    const behaviors = [
      { label: "Multi-threading (3+ contacts)", wonPct: 89, lostPct: 31, delta: "+58pp", signal: "Critical" },
      { label: "Technical POC before proposal", wonPct: 83, lostPct: 23, delta: "+60pp", signal: "Critical" },
      { label: "CTV-specific case study shared", wonPct: 78, lostPct: 15, delta: "+63pp", signal: "High" },
      { label: "Executive sponsor identified", wonPct: 72, lostPct: 38, delta: "+34pp", signal: "High" },
      { label: "Measurement framework agreed", wonPct: 94, lostPct: 46, delta: "+48pp", signal: "Critical" },
      { label: "Competitive displacement framing", wonPct: 67, lostPct: 54, delta: "+13pp", signal: "Medium" },
      { label: "ML demo shown on discovery call", wonPct: 87, lostPct: 29, delta: "+58pp", signal: "Strong" },
      { label: "Pricing objection unaddressed", wonPct: 11, lostPct: 62, delta: "-51pp", signal: "Strong" },
      { label: "No follow-up within 48h", wonPct: 6, lostPct: 77, delta: "-71pp", signal: "Medium" },
    ];
    for (const b of behaviors) {
      rows.push([randomUUID(), "behavior", null, b.label, b.wonPct, b.lostPct, null, b.signal, b.delta, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // LOSS REASONS — unified
    // ═══════════════════════════════════════════════════════════════
    const lossReasons = [
      { label: "No attribution path agreed", pct: 34 },
      { label: "Budget frozen / reallocated", pct: 23 },
      { label: "Champion left organization", pct: 15 },
      { label: "Competitor undercut on CPM", pct: 13 },
      { label: "Internal team built in-house", pct: 8 },
      { label: "Timing — launched too late in quarter", pct: 7 },
    ];
    for (const r of lossReasons) {
      rows.push([randomUUID(), "loss_reason", null, r.label, r.pct, null, null, null, null, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPETITORS — unified from CTVIntelligence + CCCTVReporting + reporting.ts
    // ═══════════════════════════════════════════════════════════════
    const competitors = [
      { label: "The Trade Desk", headToHead: "12-8", winRate: 60, theirEdge: "Self-serve scale, brand trust, existing relationships", ourCounter: "ML performance, managed service depth, dedicated CS", deals: 7 },
      { label: "Tatari", headToHead: "7-3", winRate: 70, theirEdge: "Linear+CTV unified, attribution, holdout testing, TV-native", ourCounter: "Programmatic reach, app-install pedigree, lower CPM", deals: 9 },
      { label: "Amazon DSP", headToHead: "5-6", winRate: 45, theirEdge: "1P data, Fire TV inventory, Prime Video", ourCounter: "Cross-exchange reach, transparent pricing", deals: 5 },
      { label: "MNTN / Innovid", headToHead: "4-1", winRate: 80, theirEdge: "Performance branding narrative, creative optimization", ourCounter: "True ML optimization, broader inventory, better ROI for DR", deals: 4 },
      { label: "DV360", headToHead: "3-4", winRate: 43, theirEdge: "Google ecosystem lock-in", ourCounter: "Dedicated CTV focus, better support", deals: 3 },
      { label: "tvScientific", headToHead: "3-2", winRate: 60, theirEdge: "Incrementality testing, outcome-based pricing, Guaranteed Outcomes", ourCounter: "ML targeting quality, reach breadth (Tubi/Samsung/Vizio)", deals: 5 },
      { label: "Magnite / SSNC", headToHead: "1-2", winRate: 33, theirEdge: "Supply ownership (SSP), publisher relationships", ourCounter: "Demand-side ML, cross-publisher optimization", deals: 3 },
    ];
    for (const c of competitors) {
      rows.push([randomUUID(), "competitor", null, c.label, c.winRate, c.deals, null, c.theirEdge, c.ourCounter, null, c.headToHead, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // TAM SEGMENTS — unified
    // ═══════════════════════════════════════════════════════════════
    const tamSegments = [
      { label: "Sports Betting & iGaming", tam: 4.2, penetration: 18, takeaway: "Highest density — expand via PMG/agency" },
      { label: "Streaming & Entertainment", tam: 8.5, penetration: 4, takeaway: "Massive TAM, low penetration — need case studies" },
      { label: "D2C / Performance", tam: 6.1, penetration: 7, takeaway: "Natural fit — attribution story resonates" },
      { label: "Fintech & Crypto", tam: 2.8, penetration: 12, takeaway: "Strong beachhead — Kraken, Kalshi, Rush Street" },
      { label: "Retail & CPG", tam: 12.0, penetration: 1, takeaway: "Greenfield — requires brand safety story" },
    ];
    for (const t of tamSegments) {
      rows.push([randomUUID(), "tam_segment", null, t.label, t.tam, null, t.penetration, null, null, t.takeaway, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // TAM ESTIMATE (macro-level from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const tamEstimates = [
      { label: "CTV-to-App (Performance)", tam: 8000000000, sam: 2000000000, penetration: 0.07 },
      { label: "CTV-to-App (Brand + Performance)", tam: 15000000000, sam: 4000000000, penetration: 0.04 },
      { label: "CTV-to-Web (Performance)", tam: 5000000000, sam: 500000000, penetration: 0.03 },
    ];
    for (const t of tamEstimates) {
      rows.push([randomUUID(), "tam_estimate", null, t.label, t.tam / 1e9, t.sam / 1e9, t.penetration, null, null, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPETITIVE SIGNALS — unified
    // ═══════════════════════════════════════════════════════════════
    const competitiveSignals = [
      { label: "Tatari leading on measurement credibility", body: "Tatari's holdout-based incrementality testing is being cited in 38% of our lost deals as the deciding factor. Buyers say \"Tatari proves lift, everyone else claims it.\"", source: "Gong · 8 call mentions · Feb–Mar 2026", urgency: "high" },
      { label: "The Trade Desk expanding CTV managed service push", body: "Multiple buyers mention TTD is now offering higher-touch CTV service including dedicated optimization teams. This shifts them from self-serve to managed-service competitor in mid-market.", source: "Slack · #ctv-sales-signals · 4 mentions · Mar 2026", urgency: "high" },
      { label: "tvScientific losing on reach breadth", body: "In 3 of 5 head-to-head deals we won against tvScientific, the buyer cited Tubi and Samsung access as the deciding factor. Our exchange breadth is a genuine competitive moat.", source: "SearchLight win notes · Mar 2026", urgency: "medium" },
      { label: "Amazon/Prime Video CTV entering performance market", body: "Early signal: Amazon advertising is now pitching CTV performance to direct-response buyers with access to Prime Video inventory. Not yet named in our deals but could emerge in H2 2026.", source: "Slack · #competitive-intel · 2 mentions · Mar 2026", urgency: "medium" },
      { label: "tvScientific 'Guaranteed Outcomes' changes pricing conversation", body: "tvScientific now offers outcome-based pricing — if they don't hit the agreed CPI/CPA, advertiser doesn't pay. This fundamentally changes the risk calculus for buyers.", source: "Industry press · Mar 2026", urgency: "high" },
      { label: "Netflix Ads Suite targeting $3B ad revenue by 2027", body: "Netflix partnering with Amazon for ad tech infrastructure. Premium CTV inventory expanding rapidly — we need Netflix supply integration on the roadmap.", source: "#ctv-market-intelligence · Mar 2026", urgency: "high" },
      { label: "TTD reported $1.9B revenue — CTV fastest-growing segment", body: "TTD is investing heavily in CTV — expect more aggressive pricing and features in 2026.", source: "Earnings · Feb 2026", urgency: "medium" },
      { label: "Signal loss accelerating — cookie deprecation driving CTV budget", body: "Cookie deprecation is a tailwind for CTV adoption — our ML advantage becomes more valuable as signals get scarcer.", source: "Industry reports · 2026", urgency: "medium" },
    ];
    for (const s of competitiveSignals) {
      rows.push([randomUUID(), "competitive_signal", null, s.label, null, null, null, s.urgency, s.source, s.body, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER VOICE THEMES
    // ═══════════════════════════════════════════════════════════════
    const themes = [
      { label: "Attribution & Measurement", mentions: 34, sentiment: "negative", trend: "rising" },
      { label: "CTV-to-App Performance", mentions: 28, sentiment: "positive", trend: "stable" },
      { label: "ML Optimization Quality", mentions: 22, sentiment: "positive", trend: "rising" },
      { label: "Pricing & CPM Concerns", mentions: 18, sentiment: "negative", trend: "stable" },
      { label: "Supply / Inventory Breadth", mentions: 15, sentiment: "positive", trend: "rising" },
      { label: "CTV-to-Web Readiness", mentions: 12, sentiment: "negative", trend: "rising" },
    ];
    for (const t of themes) {
      rows.push([randomUUID(), "theme", null, t.label, t.mentions, null, null, t.sentiment, t.trend, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER OBJECTIONS
    // ═══════════════════════════════════════════════════════════════
    const objections = [
      { label: "How do you measure CTV attribution without a pixel?", frequency: 45, severity: "critical", response: "MMP integration (AppsFlyer/Adjust) provides deterministic attribution for app installs. For web, CTV-to-Web product launching mid-2026." },
      { label: "TTD/Tatari have more CTV experience", frequency: 28, severity: "high", response: "Our ML is proven on mobile at massive scale — same technology applied to CTV. Tang Luck D1 ROAS 14.1% at $57K/day proves CTV performance." },
      { label: "CTV CPMs are too high vs mobile/social", frequency: 22, severity: "medium", response: "CTV reaches incremental audiences — 75% of CTV conversions are net-new users not seen on mobile. The incremental ROAS justifies the CPM premium." },
      { label: "We need brand lift studies", frequency: 15, severity: "medium", response: "We're building BLS partnerships. In the meantime, our MMP-based attribution provides performance metrics that are more actionable than BLS." },
    ];
    for (const o of objections) {
      rows.push([randomUUID(), "objection", null, o.label, o.frequency, null, null, o.severity, o.response, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER QUOTES / VERBATIMS
    // ═══════════════════════════════════════════════════════════════
    const quotes = [
      { label: "Your ML is doing something different — the D1 numbers on CTV are better than what we see on mobile", speaker: "VP Growth, TopPlay Games", company: "TopPlay Games", sentiment: "positive", source: "Gong call · Feb 2026" },
      { label: "We need to see incrementality proof before we scale. Tatari gives us holdout testing — can you match that?", speaker: "Head of UA, Sports Betting Co", company: "Sports Betting Co", sentiment: "negative", source: "Gong call · Mar 2026" },
      { label: "The PMG team told us Moloco CTV is the real deal for app installs. That's why we're here.", speaker: "Director of Growth, Fanatics", company: "Fanatics", sentiment: "positive", source: "Gong call · Mar 2026" },
      { label: "I love the mobile data you bring to CTV targeting. Your secret sauce shows a lot of intent at the household level.", speaker: "Doug Paladino, Industry Expert", company: "Industry", sentiment: "positive", source: "Expert interview · Mar 2026" },
      { label: "Attribution is the elephant in the room. Without a pixel, how do we know CTV is actually driving installs?", speaker: "CMO, DTC Brand", company: "DTC Brand", sentiment: "negative", source: "Gong call · Feb 2026" },
      { label: "We ran a 4-week test and the results exceeded our KPIs. Scaling immediately.", speaker: "Head of Performance, CHAI Research", company: "CHAI Research", sentiment: "positive", source: "Slack · #external-chai-research" },
    ];
    for (const q of quotes) {
      rows.push([randomUUID(), "quote", null, q.label, null, null, null, q.sentiment, q.source, null, q.speaker, q.company, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // WINNING BEHAVIORS (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const winningBehaviors = [
      { label: "Lead with incrementality data and structured 4-week test", impact: "2x higher close rate when test is structured upfront", evidence: "Tang Luck, CHAI both followed this pattern — both scaled", confidence: "high" },
      { label: "Target the performance buyer, not the brand buyer", impact: "3x faster deal cycle (45d vs 120d+)", evidence: "Brand-focused pitches stall at Pitch stage — performance buyers have budget authority", confidence: "medium" },
      { label: "Use MMP integration as proof of measurement rigor", impact: "Overcomes #1 objection (attribution without pixel)", evidence: "55% win rate when this objection is addressed with MMP story", confidence: "medium" },
      { label: "Reference specific customer results (Tang Luck D1 ROAS 14.1%)", impact: "Builds credibility faster than generic CTV claims", evidence: "Reps who cite specific results close 30% faster", confidence: "low" },
    ];
    for (const w of winningBehaviors) {
      rows.push([randomUUID(), "winning_behavior", null, w.label, null, null, null, w.confidence, w.impact, w.evidence, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // LOSING PATTERNS (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const losingPatterns = [
      { label: "Pitching CTV-to-Web before the product is ready", impact: "Creates expectation gap — customer disappointed when measurement isn't available", evidence: "Multiple APAC deals stalled on CTV-to-Web measurement gaps", frequency: 8 },
      { label: "Not proactively aligning on evergreen criteria before test ends", impact: "Customer pauses to 'evaluate' — momentum dies", evidence: "Test-to-scale stall is the #1 funnel bottleneck", frequency: 6 },
      { label: "Targeting brand-only buyers without performance angle", impact: "Deal cycle extends to 120+ days, often stalls at Proposal", evidence: "CTV-experienced (branding) persona has 35% win rate vs 45% for performance", frequency: 5 },
      { label: "Not involving agency partner (PMG, etc.) early enough", impact: "Misses the agency flywheel — PMG brought Experian AND Fanatics", evidence: "Agency-sourced deals have 2x pipeline value", frequency: 4 },
    ];
    for (const l of losingPatterns) {
      rows.push([randomUUID(), "losing_pattern", null, l.label, l.frequency, null, null, null, l.impact, l.evidence, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // REP PERFORMANCE (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const repPerformance = [
      { label: "Gabriel Green", closedValue: 720000, pipelineValue: 200000, winRate: 55, avgCycleDays: 35, topStrength: "CHAI relationship — deep trust, fast deal cycles" },
      { label: "Hye Jeong Lee", closedValue: 570000, pipelineValue: 350000, winRate: 50, avgCycleDays: 28, topStrength: "APAC market expertise — Tang Luck scaling success" },
      { label: "Austin White", closedValue: 300000, pipelineValue: 500000, winRate: 45, avgCycleDays: 42, topStrength: "Agency relationships — PMG flywheel (Experian + Fanatics)" },
      { label: "Clara Copeland", closedValue: 0, pipelineValue: 400000, winRate: 30, avgCycleDays: 55, topStrength: "Pipeline builder — strong at generating new opportunities" },
    ];
    for (const r of repPerformance) {
      rows.push([randomUUID(), "rep_performance", null, r.label, r.closedValue, r.pipelineValue, r.winRate, r.topStrength, null, null, String(r.avgCycleDays), null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // COACHING OPPORTUNITIES (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const coaching = [
      { label: "CTV-to-Web pitch (global deck in progress)", repsAffected: 8, priority: "high", suggestedAction: "Hold off on CTV-to-Web pitches until standardized deck is ready — use CTV-to-App as primary offering" },
      { label: "Test-to-scale conversion playbook", repsAffected: 10, priority: "high", suggestedAction: "Proactively schedule 'evergreen criteria' discussion in week 2 of test — don't wait for test to end" },
      { label: "Competitive positioning vs Amazon DSP / tvScientific", repsAffected: 5, priority: "medium", suggestedAction: "Review updated battlecards — Amazon Netflix partnership and tvScientific Guaranteed Outcomes are new angles" },
      { label: "CTV attribution and postback troubleshooting", repsAffected: 6, priority: "high", suggestedAction: "Partner with Ad-Ops on pre-launch postback verification checklist — APAC attribution issues are preventable" },
      { label: "EMEA/APAC CTV supply positioning", repsAffected: 4, priority: "medium", suggestedAction: "Use Doug Paladino's insight: FAST channels (Tubi, Roku) are undervalued — position as signal-rich, not cheap" },
    ];
    for (const c of coaching) {
      rows.push([randomUUID(), "coaching", null, c.label, c.repsAffected, null, null, c.priority, c.suggestedAction, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // TEST-TO-SCALE DRIVERS (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const testToScale = [
      { label: "Clear KPIs agreed before test starts", correlation: "strong", evidence: "Tang Luck had D1 ROAS 12% target — exceeded at 14.1%, immediate scale decision" },
      { label: "Weekly performance check-ins during test", correlation: "strong", evidence: "Campaigns with weekly check-ins scale 2x more often than set-and-forget" },
      { label: "Proactive evergreen criteria discussion in week 2", correlation: "moderate", evidence: "Prevents the 'pause to evaluate' pattern that kills momentum" },
      { label: "Agency partner involvement", correlation: "moderate", evidence: "PMG-sourced tests have higher scale rates — agency has incentive to show results" },
      { label: "Creative refresh mid-test", correlation: "weak", evidence: "Novig refreshed creatives — too early to tell if it improves scale conversion" },
    ];
    for (const t of testToScale) {
      rows.push([randomUUID(), "test_to_scale", null, t.label, null, null, null, t.correlation, null, t.evidence, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // WIN/LOSS DYNAMICS (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const winLossDynamics = [
      { label: "The Trade Desk", wins: 12, losses: 8, trend: "improving", insight: "We win on ML performance and managed service depth. They win on brand trust and self-serve scale." },
      { label: "Tatari", wins: 7, losses: 3, trend: "stable", insight: "We win on programmatic reach and app-install pedigree. They win on measurement credibility and holdout testing." },
      { label: "Amazon DSP", wins: 5, losses: 6, trend: "declining", insight: "We win on transparent pricing and cross-exchange reach. They win on 1P data and Fire TV inventory." },
      { label: "tvScientific", wins: 3, losses: 2, trend: "new", insight: "We win on ML targeting quality and reach breadth. They win on incrementality testing and outcome-based pricing." },
    ];
    for (const w of winLossDynamics) {
      rows.push([randomUUID(), "win_loss_dynamic", null, w.label, w.wins, w.losses, null, w.trend, w.insight, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // MARKET TRENDS (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const marketTrends = [
      { label: "CTV ad spend growing 25% YoY — fastest-growing digital channel", direction: "accelerating", relevance: "Rising tide lifts all boats — but competition is intensifying proportionally" },
      { label: "FAST channels (Tubi, Pluto, Roku Channel) gaining share vs premium", direction: "accelerating", relevance: "FAST inventory is signal-rich and undervalued — aligns with our ML advantage" },
      { label: "Performance measurement becoming table stakes for CTV buyers", direction: "accelerating", relevance: "Our MMP integration and ML optimization are exactly what the market is demanding" },
      { label: "Agency consolidation of CTV buying through fewer platforms", direction: "stable", relevance: "PMG flywheel validates this — agencies want one platform for CTV + mobile" },
      { label: "Retail media networks expanding into CTV", direction: "accelerating", relevance: "Potential new buyer segment — but may also bring Amazon DSP deeper into CTV" },
    ];
    for (const m of marketTrends) {
      rows.push([randomUUID(), "market_trend", null, m.label, null, null, null, m.direction, m.relevance, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // MOLOCO ADVANTAGES (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const advantages = [
      { label: "ML-first optimization — proven on mobile, now applied to CTV", evidence: "Tang Luck D1 ROAS 14.1% at $57K/day; CHAI $24K DRR record", durability: "durable" },
      { label: "CTV-to-App attribution via MMP integration", evidence: "75% of CTV conversions are net-new users not seen on mobile", durability: "durable" },
      { label: "Cross-device household graph from mobile data", evidence: "Doug Paladino: 'your mobile secret sauce shows a lot of intent at the household level'", durability: "durable" },
      { label: "Agency flywheel starting (PMG → Experian → Fanatics)", evidence: "PMG brought 2 clients in Q1 — shopping Moloco CTV to more", durability: "temporary" },
      { label: "FAST channel signal extraction", evidence: "Tubi and Roku data is undervalued — our ML can extract more signal than competitors", durability: "at-risk" },
    ];
    for (const a of advantages) {
      rows.push([randomUUID(), "advantage", null, a.label, null, null, null, a.durability, a.evidence, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // MOLOCO VULNERABILITIES (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const vulnerabilities = [
      { label: "No CTV-to-Web measurement yet", threat: "Blocks entire EMEA/APAC pipeline segment — web-only advertisers can't use us", mitigation: "CTV2Web in training phase — positive CPPV uplift. Target mid-2026 for GA." },
      { label: "Small CTV team (2 FTEs + agents)", threat: "Can't cover all regions and verticals simultaneously", mitigation: "AI-first operating model — agents handle 80% of routine work, humans focus on strategic accounts" },
      { label: "No Brand Lift Study integration", threat: "Brand-focused buyers need BLS before scaling", mitigation: "Partner with measurement vendors for BLS. Lead with performance metrics in the meantime." },
      { label: "Limited CTV supply partnerships", threat: "TTD and Amazon have deeper supply relationships", mitigation: "Focus on FAST channels where we can differentiate. Build supply partnerships incrementally." },
    ];
    for (const v of vulnerabilities) {
      rows.push([randomUUID(), "vulnerability", null, v.label, null, null, null, null, v.threat, v.mitigation, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // EARLY SIGNALS (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const earlySignals = [
      { label: "APAC CTV campaigns showing postback attribution issues", source: "#ctv-chn-activation", date: "2026-03-20", urgency: "high", implication: "Revenue/payer data not flowing for some campaigns — blocks accurate ROI reporting" },
      { label: "PMG expanding CTV client base — Experian and Fanatics both active", source: "#amer-win-wire", date: "2026-03-18", urgency: "medium", implication: "Agency flywheel working — PMG is our strongest CTV distribution channel" },
      { label: "CTV2Web training phase showing positive CPPV uplift", source: "#ctv-all", date: "2026-03-15", urgency: "medium", implication: "Web measurement product on track — could unlock EMEA/APAC pipeline by mid-2026" },
      { label: "tvScientific launching 'Guaranteed Outcomes' — outcome-based pricing", source: "Industry press", date: "2026-03-12", urgency: "high", implication: "Need to develop a response or risk losing performance-focused buyers" },
      { label: "Netflix Ads Suite targeting $3B ad revenue by 2027 — Amazon partnership for ad tech", source: "#ctv-market-intelligence", date: "2026-03-15", urgency: "high", implication: "Premium CTV inventory expanding rapidly — we need Netflix supply integration on the roadmap" },
    ];
    for (const e of earlySignals) {
      rows.push([randomUUID(), "early_signal", null, e.label, null, null, null, e.urgency, e.source, e.implication, e.date, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // REGIONAL BREAKDOWN (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const regions = [
      { label: "AMER", closedWon: 1190000, pipeline: 800000, keyAccounts: "CHAI, Experian/PMG, Fanatics/PMG, Novig", riskLevel: "low" },
      { label: "APAC", closedWon: 570000, pipeline: 350000, keyAccounts: "Tang Luck, APAC CTV Fund", riskLevel: "medium" },
      { label: "EMEA", closedWon: 0, pipeline: 150000, keyAccounts: "Early prospecting — CTV2Web needed", riskLevel: "high" },
    ];
    for (const r of regions) {
      rows.push([randomUUID(), "region", null, r.label, r.closedWon, r.pipeline, null, r.riskLevel, r.keyAccounts, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // REAL CTV CAMPAIGNS (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const campaigns = [
      { label: "Tang Luck CTV", customer: "Tang Luck", region: "APAC", vertical: "Gaming", dailySpend: 57000, totalSpend: 570000, d1Roas: 14.1, d7Roas: 52, stage: "scaling", healthScore: 92, daysActive: 10, kpiPerformance: 118, nextStep: "Continue scaling — model delivering above KPIs at $57K/day", sentiment: "positive", source: "#ctv-vip-winnerstudio" },
      { label: "Experian CTV (via PMG)", customer: "Experian / PMG", region: "AMER", vertical: "Fintech", dailySpend: 5000, totalSpend: 100000, d1Roas: 0, d7Roas: 0, stage: "scaling", healthScore: 85, daysActive: 45, kpiPerformance: 110, nextStep: "Internal case study for PMG to shop Moloco CTV to more clients", sentiment: "positive", source: "#amer-win-wire" },
      { label: "Fanatics CTV (via PMG)", customer: "Fanatics / PMG", region: "AMER", vertical: "E-Commerce", dailySpend: 10000, totalSpend: 200000, d1Roas: 0, d7Roas: 0, stage: "test", healthScore: 78, daysActive: 42, kpiPerformance: 95, nextStep: "Layers of performance, brand, and Tubi — close $200K commit", sentiment: "positive", source: "#amer-win-wire" },
      { label: "CHAI Research CTV", customer: "CHAI Research Corp", region: "AMER", vertical: "Gaming", dailySpend: 24000, totalSpend: 720000, d1Roas: 0, d7Roas: 0, stage: "scaling", healthScore: 95, daysActive: 90, kpiPerformance: 130, nextStep: "Finalize Net 45 terms — scaling UA from $30M to $50M+ in 2026", sentiment: "positive", source: "#external-chai-research" },
      { label: "CTV2Web Training Phase", customer: "CTV2Web (Internal)", region: "Global", vertical: "Platform", dailySpend: 4200, totalSpend: 127000, d1Roas: 0, d7Roas: 0, stage: "test", healthScore: 72, daysActive: 30, kpiPerformance: 85, nextStep: "Transition from Training to Test Phase — positive CPPV uplift observed", sentiment: "neutral", source: "#ctv-all" },
      { label: "Novig CTV", customer: "Novig", region: "AMER", vertical: "Gaming", dailySpend: 3000, totalSpend: 45000, d1Roas: 0, d7Roas: 0, stage: "test", healthScore: 70, daysActive: 15, kpiPerformance: 80, nextStep: "Updated CTV assets — monitor performance post-creative refresh", sentiment: "neutral", source: "#external-novig-moloco" },
      { label: "APAC CTV Activation (H1 Fund)", customer: "APAC CTV Fund", region: "APAC", vertical: "Multi-Vertical", dailySpend: 2000, totalSpend: 120000, d1Roas: 0, d7Roas: 0, stage: "test", healthScore: 68, daysActive: 21, kpiPerformance: 75, nextStep: "Target 20 new activations — 20% of 1K DRR for 4 weeks each", sentiment: "neutral", source: "#ctv-chn-activation" },
      { label: "CTV Web Activation (H1 Fund)", customer: "Web CTV Fund", region: "Global", vertical: "Multi-Vertical", dailySpend: 5800, totalSpend: 350000, d1Roas: 0, d7Roas: 0, stage: "test", healthScore: 65, daysActive: 14, kpiPerformance: 70, nextStep: "10 new activations — each customer ~$30K allocation", sentiment: "neutral", source: "#ctv-chn-activation" },
    ];
    for (const c of campaigns) {
      const meta = JSON.stringify({ customer: c.customer, region: c.region, vertical: c.vertical, d1Roas: c.d1Roas, d7Roas: c.d7Roas, stage: c.stage, healthScore: c.healthScore, daysActive: c.daysActive, kpiPerformance: c.kpiPerformance, nextStep: c.nextStep });
      rows.push([randomUUID(), "campaign", c.region, c.label, c.dailySpend, c.totalSpend, null, c.sentiment, c.source, null, null, meta, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // SENTIMENT TREND (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const sentimentTrend = [
      { label: "Oct 2025", positive: 45, neutral: 35, negative: 20 },
      { label: "Nov 2025", positive: 50, neutral: 30, negative: 20 },
      { label: "Dec 2025", positive: 48, neutral: 32, negative: 20 },
      { label: "Jan 2026", positive: 55, neutral: 28, negative: 17 },
      { label: "Feb 2026", positive: 60, neutral: 25, negative: 15 },
      { label: "Mar 2026", positive: 58, neutral: 27, negative: 15 },
    ];
    for (const s of sentimentTrend) {
      rows.push([randomUUID(), "sentiment_trend", null, s.label, s.positive, s.neutral, s.negative, null, null, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPETITOR MENTIONS (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const competitorMentions = [
      { label: "Tatari", mentions: 18, context: "Measurement credibility — holdout testing cited as differentiator", trend: "rising" },
      { label: "The Trade Desk", mentions: 14, context: "Brand trust and self-serve scale — 'we already use TTD for display'", trend: "stable" },
      { label: "tvScientific", mentions: 8, context: "Incrementality testing and outcome-based pricing — emerging threat", trend: "rising" },
      { label: "Amazon DSP", mentions: 6, context: "1P data advantage and Fire TV inventory — mostly in RFPs", trend: "stable" },
    ];
    for (const c of competitorMentions) {
      rows.push([randomUUID(), "competitor_mention", null, c.label, c.mentions, null, null, c.trend, c.context, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // BUYER SIM PERSONAS
    // ═══════════════════════════════════════════════════════════════
    const personas = [
      {
        label: "Sarah Chen",
        title: "VP Growth",
        company: "TopPlay Games",
        vertical: "Mobile Gaming",
        budget: "$500K test → $2M annual",
        priority: "ROAS at scale with incrementality proof",
        currentStack: "TTD + DV360 for CTV, AppsFlyer MMP",
        kpis: ["ROAS > 3.0x", "Incremental lift > 15%", "CPI < $8", "Day-7 retention > 25%"],
        objections: ["TTD has years of CTV data", "Need GARM brand safety", "Incrementality methodology unclear", "ML black box concern"],
        dealComplexity: "high",
        stakeholders: ["VP Growth (decision maker)", "Head of UA (influencer)", "CFO (budget approval)", "Data Science (validation)"],
        timeline: "4-week evaluation → 8-week test → scale decision",
      },
      {
        label: "Marcus Rivera",
        title: "CMO",
        company: "GlowUp Skincare",
        vertical: "DTC E-commerce",
        budget: "$150K test budget",
        priority: "Customer acquisition cost + brand lift",
        currentStack: "Meta + Google primary, no CTV experience",
        kpis: ["CAC < $45", "Brand lift > 8%", "Site visit rate > 0.5%", "ROAS > 2.0x"],
        objections: ["CTV is new for us", "Attribution is unclear", "Budget is tight", "Board wants proven channels"],
        dealComplexity: "high",
        stakeholders: ["CMO (champion)", "VP Marketing (influencer)", "CEO (final sign-off)", "Agency partner (advisor)"],
        timeline: "2-week education → 6-week pilot → board review",
      },
      {
        label: "Priya Patel",
        title: "Director of Programmatic",
        company: "MediaForce Agency",
        vertical: "Agency (multi-vertical)",
        budget: "$2M across 12 clients",
        priority: "Platform capabilities, self-serve, unified reporting",
        currentStack: "TTD primary, Roku OneView, Amazon DSP",
        kpis: ["Client retention > 95%", "Campaign setup < 2hrs", "Cross-client reporting", "Margin preservation"],
        objections: ["Need full self-serve", "12 verticals need different optimization", "Reporting must match TTD", "Managed service doesn't scale"],
        dealComplexity: "very-high",
        stakeholders: ["Director Programmatic (champion)", "SVP Media (approver)", "Client leads x12 (influencers)", "Tech team (integration)"],
        timeline: "Platform evaluation → 2 client pilots → agency-wide rollout",
      },
    ];
    for (const p of personas) {
      const meta = JSON.stringify({
        title: p.title, company: p.company, vertical: p.vertical, budget: p.budget,
        priority: p.priority, currentStack: p.currentStack, kpis: p.kpis,
        objections: p.objections, dealComplexity: p.dealComplexity,
        stakeholders: p.stakeholders, timeline: p.timeline,
      });
      rows.push([randomUUID(), "persona", p.vertical, p.label, null, null, null, p.title, p.company, p.priority, null, meta, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // WIN RATE BY BEHAVIOR (from CCCTVReporting)
    // ═══════════════════════════════════════════════════════════════
    const winRateByBehavior = [
      { label: "ML Demo", rate: 87 },
      { label: "Exec Sponsor", rate: 82 },
      { label: "Case Study", rate: 78 },
      { label: "Next Step Confirmed", rate: 76 },
      { label: "No Pricing Gap", rate: 71 },
    ];
    for (const w of winRateByBehavior) {
      rows.push([randomUUID(), "win_rate_by_behavior", null, w.label, w.rate, null, null, null, null, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // EXEC SUMMARY RISKS (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const risks = [
      { label: "APAC CTV campaigns showing postback attribution issues — revenue/payer data not flowing for some campaigns" },
      { label: "CTV-to-Web measurement gaps blocking an entire pipeline segment — standardized pitch deck needed" },
      { label: "Test-to-scale stall is the #1 funnel bottleneck — customers pause to 'evaluate' and momentum dies" },
      { label: "tvScientific 'Guaranteed Outcomes' changes the pricing conversation — we need a response" },
    ];
    for (const r of risks) {
      rows.push([randomUUID(), "risk", null, r.label, null, null, null, null, null, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // EXEC SUMMARY OPPORTUNITIES (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const opportunities = [
      { label: "Tang Luck validates CTV-to-App at scale ($57K/day, D1 ROAS 14.1%) — use as proof point for every pitch" },
      { label: "PMG agency flywheel: Experian → Fanatics → next client. Invest in PMG relationship for 3-5x pipeline multiplier" },
      { label: "~75% of CTV conversions are net-new users — incrementality story is our strongest weapon" },
      { label: "FAST channel signal extraction is undervalued — position as premium data source, not cheap inventory" },
      { label: "CHAI scaling from $30M to $50M+ UA — CTV share will grow proportionally if we maintain performance" },
      { label: "Signal loss (cookie deprecation) is a tailwind — CTV becomes more valuable as other channels lose targeting precision" },
    ];
    for (const o of opportunities) {
      rows.push([randomUUID(), "opportunity", null, o.label, null, null, null, null, null, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // EXEC SUMMARY OPEN QUESTIONS (from reporting.ts)
    // ═══════════════════════════════════════════════════════════════
    const openQuestions = [
      { label: "Is the CTV-to-Web product on track for mid-2026 GA? If delayed, what's the pipeline impact?" },
      { label: "Should we invest more in the PMG agency relationship vs. building direct sales capacity?" },
      { label: "Are the APAC attribution issues a product bug or an integration problem? What's the fix timeline?" },
      { label: "How should we respond to tvScientific's 'Guaranteed Outcomes' pricing model?" },
      { label: "Is 2 FTEs + agents the right staffing model for $10M CTV target, or do we need to hire?" },
      { label: "Should we refresh the EMEA/APAC pipeline tracker now or wait for CTV-to-Web readiness?" },
    ];
    for (const q of openQuestions) {
      rows.push([randomUUID(), "open_question", null, q.label, null, null, null, null, null, null, null, null, order++, 1, "curated"]);
    }

    // ═══════════════════════════════════════════════════════════════
    // BULK INSERT
    // ═══════════════════════════════════════════════════════════════
    console.log(`[Seed] Inserting ${rows.length} curated intel records...`);

    // Insert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
      const values = batch.flat();
      await conn.query(
        `INSERT INTO curated_intel (id, category, subcategory, label, value1, value2, value3, text1, text2, text3, text4, metadata, sort_order, is_active, data_source) VALUES ${placeholders}`,
        values
      );
      console.log(`[Seed] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rows.length / batchSize)} inserted`);
    }

    console.log(`[Seed] ✅ Successfully seeded ${rows.length} curated intel records across ${new Set(rows.map(r => r[1])).size} categories`);

    // Print category summary
    const categoryCounts = {};
    for (const r of rows) {
      categoryCounts[r[1]] = (categoryCounts[r[1]] || 0) + 1;
    }
    console.log("[Seed] Category breakdown:");
    for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat}: ${count} records`);
    }

  } finally {
    conn.release();
    await pool.end();
  }
}

clearAndSeed().catch(err => {
  console.error("[Seed] FATAL:", err);
  process.exit(1);
});
