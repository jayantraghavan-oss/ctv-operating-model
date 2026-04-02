/**
 * seed-all-data.mjs — Seeds ALL remaining hardcoded data into curated_intel DB.
 * Uses actual column names: id, category, subcategory, label, value1, value2, value3,
 * text1, text2, text3, text4, metadata, sort_order, is_active, data_source
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

function uid() { return crypto.randomUUID().replace(/-/g, "").slice(0, 16); }

async function seed(category, subcategory, label, { v1, v2, v3, t1, t2, t3, t4, meta, sort, src } = {}) {
  const id = uid();
  await conn.execute(
    `INSERT INTO curated_intel (id, category, subcategory, label, value1, value2, value3, text1, text2, text3, text4, metadata, sort_order, is_active, data_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [id, category, subcategory || null, label, v1 ?? null, v2 ?? null, v3 ?? null, t1 ?? null, t2 ?? null, t3 ?? null, t4 ?? null, meta ? JSON.stringify(meta) : null, sort ?? 0, src ?? null]
  );
}

let count = 0;
function inc() { count++; }

// ============================================================================
// 1. TOOLKIT — competitors
// ============================================================================
for (const [i, c] of [
  { name: "The Trade Desk", focus: "Premium CTV, UID2 identity", threat: "high" },
  { name: "DV360 (Google)", focus: "YouTube CTV, cross-channel", threat: "high" },
  { name: "Amazon DSP", focus: "Retail + CTV convergence", threat: "medium" },
  { name: "Roku OneView", focus: "OS-level CTV data", threat: "medium" },
  { name: "Samsung Ads", focus: "ACR data, smart TV", threat: "low" },
].entries()) {
  await seed("toolkit_competitor", null, c.name, { t1: c.focus, t2: c.threat, sort: i+1 }); inc();
}

// ============================================================================
// 2. TOOLKIT — competitive scenarios
// ============================================================================
for (const [i, s] of [
  { name: "Head-to-Head vs TTD", desc: "Simulate a pitch against The Trade Desk for a DTC brand's CTV budget" },
  { name: "Google CTV Bundling", desc: "Counter DV360's cross-channel bundling strategy" },
  { name: "Amazon Retail + CTV", desc: "Compete against Amazon's retail data advantage in CTV" },
  { name: "First-Party Data Play", desc: "Position Moloco's ML against walled garden data moats" },
].entries()) {
  await seed("toolkit_scenario", null, s.name, { t1: s.desc, sort: i+1 }); inc();
}

// ============================================================================
// 3. TOOLKIT — gong insights
// ============================================================================
for (const [i, g] of [
  { label: "Calls This Week", value: "23", trend: "+12%", desc: "CTV-related calls across team" },
  { label: "Win Rate", value: "34%", trend: "+5pp", desc: "CTV deals closed vs. pitched" },
  { label: "Top Objection", value: "Measurement", trend: "", desc: "Attribution and incrementality concerns" },
  { label: "Avg Deal Cycle", value: "47d", trend: "-8d", desc: "Days from first call to close" },
].entries()) {
  await seed("toolkit_gong_insight", null, g.label, { t1: g.value, t2: g.trend, t3: g.desc, sort: i+1 }); inc();
}

// ============================================================================
// 4. TOOLKIT — pipeline insights
// ============================================================================
for (const [i, p] of [
  { label: "CTV Pipeline", value: "$4.2M", trend: "+18%", desc: "Active CTV opportunities" },
  { label: "Weighted", value: "$1.8M", trend: "+22%", desc: "Probability-weighted pipeline" },
  { label: "New This Month", value: "12", trend: "+3", desc: "New CTV opportunities created" },
  { label: "At Risk", value: "4", trend: "-1", desc: "Deals flagged for attention" },
].entries()) {
  await seed("toolkit_pipeline_insight", null, p.label, { t1: p.value, t2: p.trend, t3: p.desc, sort: i+1 }); inc();
}

// ============================================================================
// 5. TOOLKIT — weekly highlights
// ============================================================================
for (const [i, h] of [
  "3 new CTV RFPs received — 2 from gaming verticals, 1 from retail media",
  "TTD announced new CTV measurement partnership with iSpot — competitive response needed",
  "SDK integration with 2 new SSPs completed — expands CTV inventory 15%",
  "Q2 conviction score at 62% — need evidence on web attribution before EOQ2 decision",
].entries()) {
  await seed("toolkit_weekly_highlight", null, `highlight_${i+1}`, { t1: h, sort: i+1 }); inc();
}

// ============================================================================
// 6. TOOLKIT — learning loops
// ============================================================================
for (const [i, l] of [
  { name: "Pitch → Win/Loss → Pitch Refinement", status: "active", source: "M1", target: "M1", signal: "Win/loss patterns from Gong" },
  { name: "Campaign Data → Insight → Selling Point", status: "active", source: "M3", target: "M1", signal: "Performance benchmarks" },
  { name: "Buyer Sim → Objection Bank → Training", status: "partial", source: "M2", target: "M1", signal: "Simulated objections" },
  { name: "Competitive Intel → Positioning → Pitch", status: "active", source: "M2", target: "M1", signal: "Competitor moves" },
  { name: "Support Tickets → Product Feedback → Roadmap", status: "partial", source: "M3", target: "M4", signal: "Customer pain points" },
].entries()) {
  await seed("toolkit_loop", null, l.name, { t1: l.status, t2: l.source, t3: l.target, t4: l.signal, sort: i+1 }); inc();
}

// ============================================================================
// 7. TOOLKIT — section definitions
// ============================================================================
for (const [i, s] of [
  { id: "status", label: "System Status", icon: "Activity", description: "KPIs, cluster health, live runs" },
  { id: "assistants", label: "AI Assistants", icon: "Zap", description: "Search and run 200 agents" },
  { id: "competitive", label: "Competitive Intel", icon: "Crosshair", description: "Competitor landscape & sims" },
  { id: "insights", label: "Insights", icon: "Radio", description: "Gong, Pipeline, System analytics" },
  { id: "approvals", label: "Review Queue", icon: "Shield", description: "Approve/reject agent outputs" },
  { id: "conviction", label: "Conviction", icon: "Target", description: "Decision framework & evidence" },
  { id: "weekly", label: "Weekly Prep", icon: "FileText", description: "Leadership pre-read" },
  { id: "loops", label: "Learning Loops", icon: "RefreshCw", description: "Cross-module feedback" },
  { id: "reference", label: "Reference", icon: "BookOpen", description: "Operating model & agent registry" },
].entries()) {
  await seed("toolkit_section", null, s.label, { t1: s.id, t2: s.icon, t3: s.description, sort: i+1 }); inc();
}

// ============================================================================
// 8. DATAPULSE — gong insights
// ============================================================================
for (const [i, g] of [
  { label: "CTV Calls (7d)", value: "23", icon: "Phone", color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Win Rate", value: "34%", icon: "TrendingUp", color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Top Objection", value: "Measurement", icon: "AlertTriangle", color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Avg Cycle", value: "47d", icon: "Clock", color: "text-violet-600", bg: "bg-violet-50" },
].entries()) {
  await seed("datapulse_gong", null, g.label, { t1: g.value, t2: g.icon, t3: g.color, t4: g.bg, sort: i+1 }); inc();
}

// ============================================================================
// 9. DATAPULSE — pipeline stages
// ============================================================================
for (const [i, p] of [
  { stage: "Prospecting", count: 12, value: "$1.2M", color: "bg-blue-500" },
  { stage: "Qualification", count: 8, value: "$890K", color: "bg-indigo-500" },
  { stage: "Demo/POC", count: 5, value: "$620K", color: "bg-violet-500" },
  { stage: "Negotiation", count: 3, value: "$340K", color: "bg-purple-500" },
  { stage: "Closed Won", count: 2, value: "$180K", color: "bg-emerald-500" },
].entries()) {
  await seed("datapulse_pipeline", null, p.stage, { v1: p.count, t1: p.value, t2: p.color, sort: i+1 }); inc();
}

// ============================================================================
// 10. DATAPULSE — top verticals
// ============================================================================
for (const [i, v] of [
  { vertical: "Gaming", deals: 8, revenue: "$420K", growth: "+34%" },
  { vertical: "DTC/E-comm", deals: 6, revenue: "$310K", growth: "+22%" },
  { vertical: "Retail Media", deals: 4, revenue: "$280K", growth: "+45%" },
  { vertical: "Streaming", deals: 3, revenue: "$190K", growth: "+18%" },
].entries()) {
  await seed("datapulse_vertical", null, v.vertical, { v1: v.deals, t1: v.revenue, t2: v.growth, sort: i+1 }); inc();
}

// ============================================================================
// 11. WAR ROOM — competitors
// ============================================================================
for (const [i, c] of [
  { name: "Tatari", status: "Active Threat", color: "text-rose-600", bg: "bg-rose-50", detail: "Leading on measurement credibility. Holdout testing cited in 38% of losses." },
  { name: "The Trade Desk", status: "Established", color: "text-amber-600", bg: "bg-amber-50", detail: "Brand recognition and self-serve. Expanding managed CTV service." },
  { name: "tvScientific", status: "Emerging", color: "text-blue-600", bg: "bg-blue-50", detail: "Incrementality focus. Losing to us on reach breadth." },
  { name: "Amazon DSP", status: "Watching", color: "text-violet-600", bg: "bg-violet-50", detail: "Prime Video CTV entering performance market. H2 2026 risk." },
].entries()) {
  await seed("warroom_competitor", null, c.name, { t1: c.status, t2: c.color, t3: c.bg, t4: c.detail, sort: i+1 }); inc();
}

// ============================================================================
// 12. WAR ROOM — scenarios
// ============================================================================
for (const [i, s] of [
  { name: "Tatari wins measurement narrative", impact: "high", response: "Accelerate incrementality product, partner with MTA vendor" },
  { name: "TTD launches CTV-specific ML", impact: "high", response: "Differentiate on app-to-CTV cross-screen, publish benchmarks" },
  { name: "Amazon bundles Prime Video + retail data", impact: "medium", response: "Position as neutral alternative, emphasize multi-publisher reach" },
  { name: "Google integrates YouTube CTV into DV360 deeply", impact: "medium", response: "Focus on non-Google inventory, highlight ML independence" },
].entries()) {
  await seed("warroom_scenario", null, s.name, { t1: s.impact, t2: s.response, sort: i+1 }); inc();
}

// ============================================================================
// 13. LEARNING LOOPS — full data
// ============================================================================
for (const [i, l] of [
  { name: "Market Intel → Outbound", from_module: 1, from_section: "Industry Sensing", to_module: 2, to_section: "Outbound System", signal: "Market shifts and competitive moves detected by Module 1 agents feed directly into Module 2 messaging variants.", mechanism: "When the competitor agent detects a new feature launch or the analyst tracker surfaces a narrative shift, the outbound system automatically generates new messaging angles that address the changed landscape.", frequency: "Weekly cycle — market brief triggers messaging refresh", status: "active", criticalFor: "Ensures outbound messaging stays current with market reality instead of running on stale positioning." },
  { name: "Win/Loss → Positioning", from_module: 1, from_section: "Customer Voice & Win/Loss", to_module: 1, to_section: "Positioning Intelligence", signal: "Win/loss patterns from Gong + CRM feed back into positioning decisions.", mechanism: "When the win/loss agent detects that 'lack of incrementality measurement' is cited in 3+ losses, the positioning intelligence agent flags this as a gap and generates counter-positioning recommendations.", frequency: "Continuous — each win/loss event triggers re-evaluation", status: "active", criticalFor: "Prevents positioning from drifting away from what actually wins and loses deals." },
  { name: "Test Results → ICP Refinement", from_module: 3, from_section: "Campaign Monitoring", to_module: 2, to_section: "ICP Intelligence", signal: "Campaign performance data from active tests feeds back into ICP scoring and prioritization.", mechanism: "When a vertical consistently outperforms (e.g., gaming at 12% MQL→SQL), the ICP agent increases conviction on that segment. When a segment underperforms, it flags for deprioritization.", frequency: "Weekly — performance data aggregated and fed back", status: "active", criticalFor: "Ensures ICP targeting improves with every test cycle rather than staying static." },
  { name: "Customer Success → Market Intel", from_module: 3, from_section: "Cross-Account Intelligence", to_module: 1, to_section: "Competitor Intelligence", signal: "Cross-account patterns and competitive benchmarks from live campaigns feed back into market intelligence.", mechanism: "When the cross-account agent detects that Moloco consistently outperforms a specific competitor in a vertical, this becomes evidence for battlecard updates and positioning claims.", frequency: "Monthly — cross-account synthesis cycle", status: "partial", criticalFor: "Turns customer delivery data into competitive ammunition. Currently partial because cross-account synthesis is manual." },
  { name: "Pipeline → Resource Allocation", from_module: 4, from_section: "Commercial Performance", to_module: 2, to_section: "Channel & Message Optimization", signal: "Pipeline velocity and conversion data inform where to allocate demand gen resources.", mechanism: "When pipeline data shows a channel is generating volume but not converting, the optimization agent recommends reallocation. When a segment shows high conversion, it recommends doubling down.", frequency: "Bi-weekly — pipeline review triggers reallocation", status: "active", criticalFor: "Prevents throwing resources at channels that generate activity but not revenue." },
  { name: "Churn Signals → Product Feedback", from_module: 3, from_section: "Churn Prevention", to_module: 4, to_section: "Learning Goals Synthesis", signal: "Churn patterns and at-risk signals feed into strategic learning goals about product-market fit.", mechanism: "When the churn agent detects that customers leave for a specific reason (e.g., measurement gaps), this becomes evidence against the relevant learning goal and may trigger a conviction downgrade.", frequency: "Continuous — each churn signal evaluated", status: "partial", criticalFor: "Ensures strategic decisions account for customer retention reality, not just acquisition metrics." },
  { name: "Conviction → Operating Model", from_module: 4, from_section: "Learning Goals Synthesis", to_module: 4, to_section: "Operating Rhythm Management", signal: "Conviction score changes trigger operating model adjustments.", mechanism: "When overall conviction drops below 40%, the operating rhythm agent flags for strategic review. When a specific learning goal moves to 'strong,' it triggers scaling recommendations.", frequency: "Weekly — conviction reviewed in XFN weekly", status: "active", criticalFor: "The meta-loop — ensures the operating model itself evolves based on what we're learning." },
  { name: "Outbound → Content Engine", from_module: 2, from_section: "Outbound System", to_module: 2, to_section: "Content Engine", signal: "Outbound response rates and engagement data feed back into content creation priorities.", mechanism: "When a specific messaging angle gets 3x the response rate, the content engine prioritizes creating supporting assets (case studies, one-pagers, webinar topics) around that angle.", frequency: "Bi-weekly — outbound performance reviewed", status: "active", criticalFor: "Ensures content production is driven by what actually resonates with buyers, not internal assumptions." },
].entries()) {
  await seed("learning_loop", null, l.name, {
    v1: l.from_module, v2: l.to_module,
    t1: l.from_section, t2: l.to_section, t3: l.frequency, t4: l.status,
    sort: i+1,
    meta: { mechanism: l.mechanism, criticalFor: l.criticalFor, signal: l.signal }
  }); inc();
}

// ============================================================================
// 14. BUYER SIM — personas
// ============================================================================
for (const [i, p] of [
  { id: "gaming-vp", name: "Sarah Chen", title: "VP Growth", company: "TopPlay Games", vertical: "Mobile Gaming", budget: "$500K test → $2M annual", priority: "ROAS at scale with incrementality proof", currentStack: "TTD + DV360 for CTV, AppsFlyer MMP", kpis: ["ROAS > 3.0x", "Incremental lift > 15%", "CPI < $8", "Day-7 retention > 25%"], objections: ["TTD has years of CTV data", "Need GARM brand safety", "Incrementality methodology unclear", "ML black box concern"], dealComplexity: "high", stakeholders: ["VP Growth (decision maker)", "Head of UA (influencer)", "CFO (budget approval)", "Data Science (validation)"], timeline: "4-week evaluation → 8-week test → scale decision" },
  { id: "dtc-cmo", name: "Marcus Rivera", title: "CMO", company: "GlowUp Skincare", vertical: "DTC E-commerce", budget: "$150K test budget", priority: "Customer acquisition cost + brand lift", currentStack: "Meta + Google primary, no CTV experience", kpis: ["CAC < $45", "Brand lift > 8%", "Site visit rate > 0.5%", "ROAS > 2.0x"], objections: ["CTV is new for us", "Attribution is unclear", "Budget is tight", "Board wants proven channels"], dealComplexity: "high", stakeholders: ["CMO (champion)", "VP Marketing (influencer)", "CEO (final sign-off)", "Agency partner (advisor)"], timeline: "2-week education → 6-week pilot → board review" },
  { id: "agency-dir", name: "Priya Patel", title: "Director of Programmatic", company: "MediaForce Agency", vertical: "Agency (multi-vertical)", budget: "$2M across 12 clients", priority: "Platform capabilities, self-serve, unified reporting", currentStack: "TTD primary, Roku OneView, Amazon DSP", kpis: ["Client retention > 95%", "Campaign setup < 2hrs", "Cross-client reporting", "Margin preservation"], objections: ["Need full self-serve", "12 verticals need different optimization", "Reporting must match TTD", "Managed service doesn't scale"], dealComplexity: "very-high", stakeholders: ["Director Programmatic (champion)", "SVP Media (approver)", "Client leads x12 (influencers)", "Tech team (integration)"], timeline: "Platform evaluation → 2 client pilots → agency-wide rollout" },
  { id: "retail-svp", name: "David Kim", title: "SVP Digital Commerce", company: "ShopStream Retail Media", vertical: "Retail Media Network", budget: "$1M+ for off-site CTV activation", priority: "First-party data activation on CTV, complement Amazon", currentStack: "Amazon DSP for on-site, building off-site capability", kpis: ["Advertiser adoption > 40%", "ROAS for advertisers > 4x", "Incremental reach > 30%", "Data match rate > 70%"], objections: ["How do you complement Amazon?", "First-party data integration complexity", "Measurement standards for RMN", "Need white-label capability"], dealComplexity: "extreme", stakeholders: ["SVP Digital (champion)", "CTO (tech validation)", "VP Advertiser Sales (revenue)", "Legal (data governance)", "CPO (product roadmap)"], timeline: "Technical POC → 3-month pilot with 5 advertisers → platform decision" },
].entries()) {
  await seed("buyer_persona", null, p.name, {
    t1: p.id, t2: p.title, t3: p.company, t4: p.vertical,
    sort: i+1,
    meta: { budget: p.budget, priority: p.priority, currentStack: p.currentStack, kpis: p.kpis, objections: p.objections, dealComplexity: p.dealComplexity, stakeholders: p.stakeholders, timeline: p.timeline }
  }); inc();
}

// ============================================================================
// 15. REPORTING — section definitions
// ============================================================================
for (const [i, s] of [
  { id: "revenue", label: "Revenue & Pipeline", question: "Are we on track to hit $100M ARR?", icon: "DollarSign" },
  { id: "customer", label: "Customer Voice", question: "What are customers telling us?", icon: "MessageSquare" },
  { id: "patterns", label: "Win/Loss Patterns", question: "What separates winning from losing?", icon: "Target" },
  { id: "market", label: "Market Position", question: "How are we positioned?", icon: "Crosshair" },
].entries()) {
  await seed("reporting_section", null, s.label, { t1: s.id, t2: s.icon, t3: s.question, sort: i+1 }); inc();
}

// ============================================================================
// 16. CCCTV — concentration data
// ============================================================================
for (const [i, c] of [
  { exchange: "Tubi", pct: 42 },
  { exchange: "Samsung TV+", pct: 24 },
  { exchange: "Vizio WatchFree", pct: 18 },
  { exchange: "Pluto TV", pct: 10 },
  { exchange: "Other", pct: 6 },
].entries()) {
  await seed("ccctv_concentration", null, c.exchange, { v1: c.pct, sort: i+1 }); inc();
}

// ============================================================================
// 17. CCCTV — pipeline stages
// ============================================================================
for (const [i, p] of [
  { stage: "Contact Qualified", count: 18, color: "#6366f1" },
  { stage: "Sales Qualified", count: 12, color: "#8b5cf6" },
  { stage: "Pitched", count: 8, color: "#a78bfa" },
  { stage: "DPA Negotiation", count: 5, color: "#c084fc" },
  { stage: "Closed Won", count: 3, color: "#10b981" },
  { stage: "Closed Lost", count: 6, color: "#ef4444" },
].entries()) {
  await seed("ccctv_pipeline", null, p.stage, { v1: p.count, t1: p.color, sort: i+1 }); inc();
}

// ============================================================================
// 18. CCCTV — risk signals
// ============================================================================
for (const [i, r] of [
  { signal: "3 deals stuck in DPA >30 days", type: "risk", severity: "high" },
  { signal: "Gaming vertical pipeline growing +40% QoQ", type: "opportunity", severity: "high" },
  { signal: "Tatari mentioned in 5 competitive deals this month", type: "risk", severity: "medium" },
  { signal: "2 enterprise RFPs received (>$500K each)", type: "opportunity", severity: "high" },
].entries()) {
  await seed("ccctv_risk_signal", null, r.signal, { t1: r.type, t2: r.severity, sort: i+1 }); inc();
}

// ============================================================================
// 19. CCCTV — behavior data
// ============================================================================
for (const [i, b] of [
  { behavior: "ML demo shown in first call", won: 82, lost: 34, delta: "+48pp", signal: "Strong" },
  { behavior: "Exec sponsor engaged", won: 78, lost: 23, delta: "+55pp", signal: "Strong" },
  { behavior: "Attribution story presented", won: 83, lost: 54, delta: "+29pp", signal: "Medium" },
  { behavior: "Case study shared (same vertical)", won: 72, lost: 31, delta: "+41pp", signal: "Strong" },
  { behavior: "Next step confirmed in call", won: 94, lost: 46, delta: "+48pp", signal: "Strong" },
  { behavior: "Pricing objection unaddressed", won: 11, lost: 62, delta: "−51pp", signal: "Strong" },
  { behavior: "No follow-up within 48h", won: 6, lost: 77, delta: "−71pp", signal: "Medium" },
  { behavior: "Multi-threading (3+ contacts)", won: 67, lost: 23, delta: "+44pp", signal: "Medium" },
].entries()) {
  await seed("ccctv_behavior", null, b.behavior, { v1: b.won, v2: b.lost, t1: b.delta, t2: b.signal, sort: i+1 }); inc();
}

// ============================================================================
// 20. CCCTV — win rate by behavior
// ============================================================================
for (const [i, w] of [
  { behavior: "ML Demo", rate: 87 },
  { behavior: "Exec Sponsor", rate: 82 },
  { behavior: "Case Study", rate: 78 },
  { behavior: "Next Step Confirmed", rate: 76 },
  { behavior: "No Pricing Gap", rate: 71 },
].entries()) {
  await seed("ccctv_winrate_behavior", null, w.behavior, { v1: w.rate, sort: i+1 }); inc();
}

// ============================================================================
// 21. CCCTV — loss reasons
// ============================================================================
for (const [i, l] of [
  { reason: "Attribution not credible", pct: 38 },
  { reason: "Lost to Tatari (measurement)", pct: 31 },
  { reason: "No exec sponsor", pct: 20 },
  { reason: "Price / CPM too high", pct: 11 },
].entries()) {
  await seed("ccctv_loss_reason", null, l.reason, { v1: l.pct, sort: i+1 }); inc();
}

// ============================================================================
// 22. CCCTV — competitor data
// ============================================================================
for (const [i, c] of [
  { competitor: "Tatari", deals: 9, winRate: 34, theirEdge: "Measurement credibility, holdout testing, TV-native", ourCounter: "ML optimization, cross-screen attribution, lower CPM" },
  { competitor: "The Trade Desk", deals: 7, winRate: 43, theirEdge: "Brand recognition, self-serve, existing relationships", ourCounter: "Performance ML, app-to-CTV cross-screen, dedicated CS" },
  { competitor: "tvScientific", deals: 5, winRate: 60, theirEdge: "Incrementality testing, outcome-based pricing", ourCounter: "ML targeting quality, reach breadth (Tubi/Samsung/Vizio)" },
  { competitor: "Innovid / MNTN", deals: 4, winRate: 75, theirEdge: "Creative optimization, brand safety tools", ourCounter: "Performance focus, better ROI for direct response" },
  { competitor: "Magnite / SSNC", deals: 3, winRate: 33, theirEdge: "Supply ownership (SSP), publisher relationships", ourCounter: "Demand-side ML, cross-publisher optimization" },
  { competitor: "No vendor (internal)", deals: 3, winRate: 33, theirEdge: "Full control, no margin sharing, team buy-in", ourCounter: "Scale of ML, cost-efficiency vs. building in-house" },
].entries()) {
  await seed("ccctv_competitor", null, c.competitor, { v1: c.deals, v2: c.winRate, t1: c.theirEdge, t2: c.ourCounter, sort: i+1 }); inc();
}

// ============================================================================
// 23. CCCTV — win rate by competitor
// ============================================================================
for (const [i, w] of [
  { name: "Innovid/MNTN", rate: 75 },
  { name: "tvScientific", rate: 60 },
  { name: "Trade Desk", rate: 43 },
  { name: "Tatari", rate: 34 },
  { name: "Magnite", rate: 33 },
].entries()) {
  await seed("ccctv_winrate_competitor", null, w.name, { v1: w.rate, sort: i+1 }); inc();
}

// ============================================================================
// 24. CCCTV — TAM data
// ============================================================================
for (const [i, t] of [
  { label: "Total CTV Ad Market (AMER)", value: "$21B total", width: "100%", amount: "$21.0B" },
  { label: "Programmatic CTV (TAM)", value: "$4.2B", width: "20%", amount: "$4.2B" },
  { label: "Addressable (our exchanges)", value: "~$2.0B", width: "9.5%", amount: "~$2.0B" },
  { label: "Our Current ARR Run-Rate", value: "$33.6M", width: "1.6%", amount: "$33.6M" },
  { label: "$100M ARR Target", value: "$100M", width: "4.8%", amount: "$100M" },
].entries()) {
  await seed("ccctv_tam", null, t.label, { t1: t.value, t2: t.width, t3: t.amount, sort: i+1 }); inc();
}

// ============================================================================
// 25. CCCTV — competitive signals
// ============================================================================
for (const [i, s] of [
  { title: "Tatari leading on measurement credibility", body: "Tatari's holdout-based incrementality testing is being cited in 38% of our lost deals as the deciding factor.", source: "Gong · 8 call mentions · Feb–Mar 2026" },
  { title: "The Trade Desk expanding CTV managed service push", body: "Multiple buyers mention TTD is now offering higher-touch CTV service including dedicated optimization teams.", source: "Slack · #ctv-sales-signals · 4 mentions · Mar 2026" },
  { title: "tvScientific losing on reach breadth", body: "In 3 of 5 head-to-head deals we won against tvScientific, the buyer cited Tubi and Samsung access as the deciding factor.", source: "SearchLight win notes · Mar 2026" },
  { title: "Amazon/Prime Video CTV entering performance market", body: "Early signal: Amazon advertising is now pitching CTV performance to direct-response buyers with access to Prime Video inventory.", source: "Slack · #competitive-intel · 2 mentions · Mar 2026" },
].entries()) {
  await seed("ccctv_comp_signal", null, s.title, { t1: s.body, t2: s.source, sort: i+1 }); inc();
}

// ============================================================================
// 26. CCCTV — theme data (customer voice)
// ============================================================================
for (const [i, t] of [
  { theme: "Attribution / measurement", calls: 31, pct: 72, sentiment: "mixed" },
  { theme: "CTV + app retargeting", calls: 24, pct: 56, sentiment: "positive" },
  { theme: "Incrementality proof", calls: 22, pct: 51, sentiment: "friction" },
  { theme: "Brand safety / inventory", calls: 16, pct: 37, sentiment: "friction" },
].entries()) {
  await seed("ccctv_theme", null, t.theme, { v1: t.calls, v2: t.pct, t1: t.sentiment, sort: i+1 }); inc();
}

// ============================================================================
// 27. CCCTV — verbatims
// ============================================================================
for (const [i, v] of [
  { text: "We need to see incrementality, not just ROAS. Our board won't approve CTV without a holdout test.", source: "VP Growth, Gaming — Gong call 3/12", sentiment: "friction" },
  { text: "The cross-screen story from app to CTV is what got our CEO excited. Nobody else can do that.", source: "Head of UA, DTC — Gong call 3/8", sentiment: "positive" },
  { text: "Honestly, Tatari's measurement dashboard is better. But your ML targeting is clearly superior.", source: "Dir. Programmatic, Agency — Gong call 3/15", sentiment: "mixed" },
  { text: "If you can prove CTV drives incremental app installs, we'll move $2M from Meta.", source: "CMO, Gaming — Gong call 3/18", sentiment: "positive" },
].entries()) {
  await seed("ccctv_verbatim", null, v.source, { t1: v.text, t2: v.sentiment, sort: i+1 }); inc();
}

// ============================================================================
// 28. BUYER SIM — conversation scripts (stored as JSON in metadata)
// ============================================================================
// Scripts are stored per-persona as large JSON blobs in metadata
const SCRIPTS = {
  "gaming-vp": [
    { turn: 1, speaker: "buyer", text: "Thanks for coming in. We're spending about $500K on CTV through TTD right now, but honestly, we're not sure we're getting incremental value versus our mobile UA spend. What's different about Moloco's approach?" },
    { turn: 2, speaker: "seller", text: "Great question, Sarah. The fundamental difference is that Moloco's ML was built for performance advertising — specifically for app-based outcomes. When we extend that to CTV, we're not just buying TV impressions; we're optimizing for downstream app events like installs, day-7 retention, and in-app purchases. TTD optimizes for reach and frequency on CTV. We optimize for the actions that actually matter to your P&L." },
    { turn: 3, speaker: "buyer", text: "That sounds good in theory, but TTD has years of CTV data. How can your ML compete when you're newer to the CTV space?" },
    { turn: 4, speaker: "seller", text: "Fair challenge. Two things: First, our ML advantage isn't about CTV-specific historical data — it's about the cross-screen signal graph. We see what happens after a CTV impression at the device level. When someone sees your ad on Tubi and then installs your app 3 days later, we can attribute and learn from that. TTD sees the CTV impression but loses the thread at the app level. Second, we've been running CTV campaigns for 18 months now with 51 active campaigns. Our models have learned CTV-specific patterns — optimal frequency, daypart effects, creative fatigue curves — but the real edge is connecting CTV exposure to app outcomes." },
    { turn: 5, speaker: "buyer", text: "Interesting. But our board is very focused on incrementality. They've been burned by attribution claims before. How do you prove that CTV spend is actually incremental and not just taking credit for organic installs?" },
  ],
  "dtc-cmo": [
    { turn: 1, speaker: "buyer", text: "I'll be honest — I'm skeptical about CTV for DTC. We've built our entire growth engine on Meta and Google. Our CAC is $38 on Meta. Why should I risk budget on a channel I don't understand?" },
    { turn: 2, speaker: "seller", text: "Marcus, that skepticism is healthy. Let me address it directly: You're right that Meta at $38 CAC is strong. But here's the trend we're seeing across DTC brands — Meta CACs have increased 40% over the past 18 months as iOS privacy changes bite harder. The brands that are winning are the ones diversifying before they're forced to. CTV isn't about replacing Meta. It's about building a second acquisition engine while your Meta performance is still strong enough to fund the experiment." },
    { turn: 3, speaker: "buyer", text: "But CTV feels like a brand play. We're a performance-driven company. Our board looks at CAC and ROAS, not brand lift." },
    { turn: 4, speaker: "seller", text: "Totally get it. Here's what's changed: CTV in 2026 is not the brand awareness channel it was in 2022. With Moloco, you're running performance CTV — we optimize for site visits, add-to-carts, and purchases, not just impressions. We have DTC brands seeing $2.4x ROAS on CTV, with CACs in the $40-55 range. Not as low as your best Meta campaigns, but incremental — these are customers who weren't in your Meta funnel." },
    { turn: 5, speaker: "buyer", text: "How do you know they're incremental? That's the part I struggle with. Someone sees a CTV ad, then Googles us — Meta or Google gets the credit." },
  ],
  "agency-dir": [
    { turn: 1, speaker: "buyer", text: "We manage CTV for 12 clients across TTD, Roku OneView, and Amazon DSP. I don't need another platform. What I need is a reason to consolidate or switch. What's your pitch?" },
    { turn: 2, speaker: "seller", text: "Priya, I appreciate the directness. I'm not going to pitch you on switching everything. Here's the honest case: For your performance-focused clients — the ones where you're measured on ROAS, CPI, or CAC — Moloco's ML will outperform TTD on CTV. We consistently see 20-40% better performance outcomes because our ML was built for performance, not reach. For your brand awareness clients, TTD is probably fine. The question is: do you have 2-3 clients where CTV performance really matters?" },
    { turn: 3, speaker: "buyer", text: "We have 4-5 clients where performance is the primary KPI. But switching platforms is expensive — training, integration, reporting changes. What's the ROI of that switching cost?" },
    { turn: 4, speaker: "seller", text: "Let me quantify it. For a typical $200K/quarter CTV client, our performance advantage translates to roughly $40-80K in additional attributed conversions per quarter. Against a switching cost of maybe 40 hours of team time for onboarding, you're looking at payback in the first month. Plus, our API is TTD-compatible for the basics, so your team's programmatic knowledge transfers directly." },
    { turn: 5, speaker: "buyer", text: "Reporting is my biggest concern. My clients get weekly TTD reports. If I switch them to Moloco, the reports need to look at least as good. Can you match TTD's reporting?" },
  ],
  "retail-svp": [
    { turn: 1, speaker: "buyer", text: "We're building an off-site media capability for our retail media network. Amazon dominates on-site, but we believe there's a massive opportunity in off-site CTV activation using our first-party shopper data. How does Moloco fit into that vision?" },
    { turn: 2, speaker: "seller", text: "David, you're describing exactly the use case where Moloco adds the most value. Here's the architecture: Your first-party shopper data is your competitive moat — purchase history, browsing behavior, loyalty status. Moloco's ML takes that signal and activates it across CTV inventory at scale. We're connected to Tubi, Samsung TV+, Vizio, Pluto TV, and 15+ other CTV exchanges. So your advertisers can reach their exact shopper segments on premium CTV content, with Moloco's ML optimizing for the outcomes that matter — store visits, online purchases, or app engagement." },
    { turn: 3, speaker: "buyer", text: "How is that different from what Amazon DSP already does? They have shopper data too, and they're adding Prime Video CTV inventory." },
    { turn: 4, speaker: "seller", text: "Great question. Three key differences: First, Amazon's CTV is a walled garden — your advertisers can only reach Amazon shoppers on Amazon-owned inventory. With Moloco, you activate YOUR shopper data across the entire open CTV ecosystem. Your data, your relationships, your margin. Second, Amazon is your competitor in retail media. Every dollar your advertisers spend on Amazon DSP strengthens Amazon's flywheel, not yours. With Moloco, you're building your own flywheel. Third, we offer white-label capability — your advertisers see your platform, your brand, your reporting. With Amazon, they see Amazon." },
    { turn: 5, speaker: "buyer", text: "The white-label piece is interesting. But our CTO is concerned about data integration complexity. We have 50M+ shopper profiles. How does the data flow work?" },
  ],
};

for (const [personaId, turns] of Object.entries(SCRIPTS)) {
  await seed("buyer_script", personaId, `${personaId}_script`, {
    t1: JSON.stringify(turns),
    sort: 0,
    meta: { personaId, turnCount: turns.length }
  }); inc();
}

console.log(`\n✅ Seeded ${count} records across all categories.`);
await conn.end();
