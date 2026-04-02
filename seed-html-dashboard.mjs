/**
 * Seed script: Import data from moloco_ctv_dashboard.html into curated_intel DB
 * This replaces stale records with the latest numbers from Jay's desktop file
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Helper to upsert — delete old records of same category, insert new
async function seedCategory(category, records) {
  await conn.execute('DELETE FROM curated_intel WHERE category = ?', [category]);
  for (const r of records) {
    await conn.execute(
      `INSERT INTO curated_intel (id, category, subcategory, label, value1, value2, text1, data_source, is_active, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        randomUUID(),
        category,
        r.subcategory || null,
        r.label || null,
        r.value1 ?? null,
        r.value2 ?? null,
        r.text || null,
        r.source || null,
        r.metadata ? JSON.stringify(r.metadata) : null
      ]
    );
  }
  console.log(`  ✓ ${category}: ${records.length} records`);
}

console.log('Seeding HTML dashboard data into curated_intel...\n');

// ═══ Q1 REVENUE DATA (from BQ data block) ═══
await seedCategory('html_bq_kpi', [
  { label: 'gas_per_day', value1: 205000, source: 'BigQuery · fact_dsp_core · 7-day trailing', text: '$205K/day GAS (7-day trailing average, BQ verified)' },
  { label: 'arr_run_rate_m', value1: 74.8, source: 'BigQuery · derived (gas_per_day × 365)', text: '$74.8M ARR run-rate' },
  { label: 'goal_m', value1: 100, source: 'Internal target', text: '$100M ARR goal' },
  { label: 'gap_m', value1: 25.2, source: 'Derived (goal - ARR)', text: '$25.2M gap to $100M target' },
  { label: 'trailing_7d_k', value1: 205, source: 'BigQuery · fact_dsp_core · 7-day window', text: '$205K/day trailing 7-day average' },
  { label: 'active_campaigns', value1: 51, source: 'BigQuery · fact_dsp_core · 30-day with spend', text: '51 active CTV campaigns (BQ verified)' },
  { label: 'ytd_gas_m', value1: 9.65, source: 'BigQuery · fact_dsp_core · Jan 1 to yesterday', text: '$9.65M YTD gross ad spend' },
  { label: 'ytd_days', value1: 89, source: 'Calendar', text: '89 days YTD' },
  { label: 'last_updated', value1: null, source: 'System', text: 'Mar 31, 2026' },
]);

await seedCategory('html_bq_monthly', [
  { label: 'Oct', value1: 78, source: 'BigQuery · fact_dsp_core', text: 'Oct avg daily GAS $78K' },
  { label: 'Nov', value1: 95, source: 'BigQuery · fact_dsp_core', text: 'Nov avg daily GAS $95K' },
  { label: 'Dec', value1: 112, source: 'BigQuery · fact_dsp_core', text: 'Dec avg daily GAS $112K' },
  { label: 'Jan', value1: 138, source: 'BigQuery · fact_dsp_core', text: 'Jan avg daily GAS $138K' },
  { label: 'Feb', value1: 168, source: 'BigQuery · fact_dsp_core', text: 'Feb avg daily GAS $168K' },
  { label: 'Mar', value1: 190, source: 'BigQuery · fact_dsp_core', text: 'Mar avg daily GAS $190K' },
]);

await seedCategory('html_bq_concentration', [
  { label: 'PMG/FBG', value1: 37.9, source: 'BigQuery · fact_dsp_core · 30-day', text: 'PMG/FBG Oppco LLC — 37.9% of GAS' },
  { label: 'Kraken', value1: 12.1, source: 'BigQuery · fact_dsp_core · 30-day', text: 'Kraken — 12.1% of GAS' },
  { label: 'ARBGaming', value1: 8.4, source: 'BigQuery · fact_dsp_core · 30-day', text: 'ARBGaming — 8.4% of GAS' },
  { label: 'Luckymoney', value1: 6.2, source: 'BigQuery · fact_dsp_core · 30-day', text: 'Luckymoney — 6.2% of GAS' },
  { label: 'NOVIG', value1: 4.8, source: 'BigQuery · fact_dsp_core · 30-day', text: 'NOVIG — 4.8% of GAS' },
  { label: 'Rest', value1: 30.6, source: 'BigQuery · derived', text: 'Rest — 30.6% of GAS' },
]);

await seedCategory('html_bq_pipeline', [
  { label: 'Prospecting', value1: 24.1, source: 'SearchLight / CRM · estimated', text: '$24.1M in prospecting stage' },
  { label: 'Qualification', value1: 8.7, source: 'SearchLight / CRM · estimated', text: '$8.7M in qualification stage' },
  { label: 'Proposal', value1: 5.2, source: 'SearchLight / CRM · estimated', text: '$5.2M in proposal stage' },
  { label: 'Negotiation', value1: 3.4, source: 'SearchLight / CRM · estimated', text: '$3.4M in negotiation/close stage' },
]);

await seedCategory('html_bq_exchange', [
  { label: 'Tubi', value1: 82000, value2: 29.9, source: 'BigQuery · 7-day · per exchange', text: 'Tubi: $82K/day, $29.9M ARR' },
  { label: 'Samsung', value1: 48000, value2: 17.5, source: 'BigQuery · 7-day · per exchange', text: 'Samsung: $48K/day, $17.5M ARR' },
  { label: 'Roku', value1: 35000, value2: 12.8, source: 'BigQuery · 7-day · per exchange', text: 'Roku: $35K/day, $12.8M ARR' },
  { label: 'VIZIO', value1: 22000, value2: 8.0, source: 'BigQuery · 7-day · per exchange', text: 'VIZIO: $22K/day, $8.0M ARR' },
  { label: 'LG', value1: 18000, value2: 6.6, source: 'BigQuery · 7-day · per exchange', text: 'LG: $18K/day, $6.6M ARR' },
]);

await seedCategory('html_bq_window', [
  { label: '7d', value1: 205000, value2: 74.8, source: 'BigQuery · 7-day trailing', text: '7-day: $205K/day, $74.8M ARR', metadata: { active_campaigns: 51 } },
  { label: '14d', value1: 195000, value2: 71.2, source: 'BigQuery · 14-day trailing', text: '14-day: $195K/day, $71.2M ARR' },
  { label: '30d', value1: 190000, value2: 69.4, source: 'BigQuery · 30-day trailing', text: '30-day: $190K/day, $69.4M ARR' },
]);

await seedCategory('html_top_adv_health', [
  { label: 'PMG/FBG Oppco LLC', value1: 543000, value2: 498000, source: 'BigQuery · WoW comparison', text: 'Top account: $543K this week vs $498K prior (+9.0% WoW)', metadata: { wow_pct: 9.0 } },
]);

// ═══ Q2 CUSTOMER VOICE (from Gong N=43) ═══
await seedCategory('html_gong_sentiment', [
  { label: 'positive', value1: 54, source: 'Gong · N=43 calls · 90-day · manual review', text: '54% positive sentiment' },
  { label: 'mixed', value1: 28, source: 'Gong · N=43 calls · 90-day · manual review', text: '28% mixed sentiment' },
  { label: 'friction', value1: 18, source: 'Gong · N=43 calls · 90-day · manual review', text: '18% friction sentiment' },
]);

await seedCategory('html_gong_themes', [
  { label: 'ML Targeting', value1: 67, source: 'Gong · N=43 calls · keyword clustering', text: 'ML Targeting mentioned in 67% of calls', subcategory: 'positive' },
  { label: 'Attribution', value1: 58, source: 'Gong · N=43 calls · keyword clustering', text: 'Attribution mentioned in 58% of calls', subcategory: 'mixed' },
  { label: 'CTV Reach', value1: 49, source: 'Gong · N=43 calls · keyword clustering', text: 'CTV Reach mentioned in 49% of calls', subcategory: 'positive' },
  { label: 'Pricing', value1: 42, source: 'Gong · N=43 calls · keyword clustering', text: 'Pricing mentioned in 42% of calls', subcategory: 'mixed' },
  { label: 'Measurement', value1: 38, source: 'Gong · N=43 calls · keyword clustering', text: 'Measurement mentioned in 38% of calls', subcategory: 'friction' },
]);

await seedCategory('html_gong_sentiment_trend', [
  { label: 'Oct', value1: 5, value2: 4, source: 'Gong · monthly', text: 'Oct: 5 positive, 4 mixed, 2 friction', metadata: { friction: 2 } },
  { label: 'Nov', value1: 6, value2: 3, source: 'Gong · monthly', text: 'Nov: 6 positive, 3 mixed, 3 friction', metadata: { friction: 3 } },
  { label: 'Dec', value1: 7, value2: 4, source: 'Gong · monthly', text: 'Dec: 7 positive, 4 mixed, 2 friction', metadata: { friction: 2 } },
  { label: 'Jan', value1: 7, value2: 4, source: 'Gong · monthly', text: 'Jan: 7 positive, 4 mixed, 2 friction', metadata: { friction: 2 } },
  { label: 'Feb', value1: 8, value2: 4, source: 'Gong · monthly', text: 'Feb: 8 positive, 4 mixed, 2 friction', metadata: { friction: 2 } },
  { label: 'Mar', value1: 9, value2: 5, source: 'Gong · monthly', text: 'Mar: 9 positive, 5 mixed, 3 friction', metadata: { friction: 3 } },
]);

// ═══ Q3 WIN/LOSS (N=31 deals) ═══
await seedCategory('html_winloss_kpi', [
  { label: 'won_deals', value1: 18, source: 'SearchLight · N=31 CTV deals', text: '18 won deals, avg $87K ARR, avg cycle 47 days', metadata: { avg_deal: 87000, avg_cycle: 47 } },
  { label: 'lost_deals', value1: 13, source: 'SearchLight · N=31 CTV deals', text: '13 lost deals, most common loss: Tatari 38%, avg cycle 68 days', metadata: { top_loss: 'Tatari', top_loss_pct: 38, avg_cycle: 68 } },
  { label: 'deal_velocity_won', value1: 47, source: 'SearchLight · Discovery to Close', text: '47 days avg deal velocity (won)' },
  { label: 'champion_identified', value1: 83, value2: 31, source: 'SearchLight · contact role analysis', text: '83% of won deals had champion vs 31% of lost' },
]);

await seedCategory('html_winloss_behaviors', [
  { label: 'ML targeting demo shown', value1: 89, value2: 38, source: 'Gong + SearchLight · N=31', text: 'Won 89% vs Lost 38% (+51pp) — Strong signal', metadata: { delta: 51, signal: 'Strong' } },
  { label: 'Executive sponsor engaged', value1: 78, value2: 23, source: 'Gong + SearchLight · N=31', text: 'Won 78% vs Lost 23% (+55pp) — Strong signal', metadata: { delta: 55, signal: 'Strong' } },
  { label: 'Attribution story presented', value1: 83, value2: 54, source: 'Gong + SearchLight · N=31', text: 'Won 83% vs Lost 54% (+29pp) — Medium signal', metadata: { delta: 29, signal: 'Medium' } },
  { label: 'Case study shared (same vertical)', value1: 72, value2: 31, source: 'Gong + SearchLight · N=31', text: 'Won 72% vs Lost 31% (+41pp) — Strong signal', metadata: { delta: 41, signal: 'Strong' } },
  { label: 'Next step confirmed in call', value1: 94, value2: 46, source: 'Gong + SearchLight · N=31', text: 'Won 94% vs Lost 46% (+48pp) — Strong signal', metadata: { delta: 48, signal: 'Strong' } },
  { label: 'Pricing objection unaddressed', value1: 11, value2: 62, source: 'Gong + SearchLight · N=31', text: 'Won 11% vs Lost 62% (-51pp) — Strong signal', metadata: { delta: -51, signal: 'Strong' } },
  { label: 'No follow-up within 48h', value1: 6, value2: 77, source: 'Gong + SearchLight · N=31', text: 'Won 6% vs Lost 77% (-71pp) — Medium signal', metadata: { delta: -71, signal: 'Medium' } },
  { label: 'Multi-threading (3+ contacts)', value1: 67, value2: 23, source: 'Gong + SearchLight · N=31', text: 'Won 67% vs Lost 23% (+44pp) — Medium signal', metadata: { delta: 44, signal: 'Medium' } },
]);

await seedCategory('html_winloss_win_rate_by_behavior', [
  { label: 'ML Demo', value1: 87, source: 'Gong + SearchLight · N=31', text: '87% win rate when ML demo shown' },
  { label: 'Exec Sponsor', value1: 82, source: 'Gong + SearchLight · N=31', text: '82% win rate when exec sponsor engaged' },
  { label: 'Case Study', value1: 78, source: 'Gong + SearchLight · N=31', text: '78% win rate when case study shared' },
  { label: 'Next Step Confirmed', value1: 76, source: 'Gong + SearchLight · N=31', text: '76% win rate when next step confirmed' },
  { label: 'No Pricing Gap', value1: 71, source: 'Gong + SearchLight · N=31', text: '71% win rate when pricing objection addressed' },
]);

await seedCategory('html_winloss_loss_reasons', [
  { label: 'Attribution not credible', value1: 38, source: 'Gong + SearchLight · self-reported', text: '38% — most common loss reason' },
  { label: 'Lost to Tatari (measurement)', value1: 31, source: 'Gong + SearchLight · self-reported', text: '31% — lost to Tatari on measurement credibility' },
  { label: 'No exec sponsor', value1: 20, source: 'Gong + SearchLight · self-reported', text: '20% — no executive sponsor identified' },
  { label: 'Price / CPM too high', value1: 11, source: 'Gong + SearchLight · self-reported', text: '11% — pricing was the blocker' },
]);

// ═══ Q4 MARKET POSITION ═══
await seedCategory('html_market_win_rate', [
  { label: 'overall', value1: 22.7, source: 'SearchLight · 90-day · CTV deals only', text: '22.7% overall win rate (AMER)' },
]);

await seedCategory('html_market_competitive_mentions', [
  { label: 'Tatari', value1: 38, source: 'Gong · N=43 calls', text: 'Tatari mentioned in 38% of calls (12 of 31)' },
  { label: 'The Trade Desk', value1: 28, source: 'Gong · N=43 calls', text: 'TTD mentioned in 28% of calls (9 of 31)' },
  { label: 'tvScientific', value1: 18, source: 'Gong · N=43 calls', text: 'tvScientific mentioned in 18% of calls (6 of 31)' },
  { label: 'Amazon', value1: 10, source: 'Gong · N=43 calls', text: 'Amazon mentioned in 10% of calls (3 of 31)' },
  { label: 'Magnite', value1: 6, source: 'Gong · N=43 calls', text: 'Magnite mentioned in 6% of calls (2 of 31)' },
]);

await seedCategory('html_market_win_rate_vs_competitor', [
  { label: 'tvScientific', value1: 60, source: 'SearchLight · head-to-head', text: '60% win rate vs tvScientific' },
  { label: 'Innovid/MNTN', value1: 75, source: 'SearchLight · head-to-head', text: '75% win rate vs Innovid/MNTN' },
  { label: 'Trade Desk', value1: 43, source: 'SearchLight · head-to-head', text: '43% win rate vs Trade Desk' },
  { label: 'Tatari', value1: 34, source: 'SearchLight · head-to-head · N=9 very small', text: '34% win rate vs Tatari (N=9, single win/loss swings ~11pp)' },
  { label: 'Magnite', value1: 33, source: 'SearchLight · head-to-head', text: '33% win rate vs Magnite' },
]);

await seedCategory('html_market_tam', [
  { label: 'Total CTV', value1: 21, source: 'eMarketer 2026 AMER estimate', text: '$21B total CTV market' },
  { label: 'Programmatic CTV', value1: 4.2, source: 'eMarketer 2026 AMER estimate', text: '$4.2B programmatic CTV' },
  { label: 'Addressable (our exchanges)', value1: 2.0, source: 'eMarketer + internal estimate', text: '$2.0B addressable via our 5 active exchanges' },
  { label: 'Our share', value1: 0.8, source: 'BQ ARR / $4.2B TAM', text: '~0.8% market share (order-of-magnitude)' },
]);

await seedCategory('html_market_competitive_signals', [
  { label: 'Tatari holdout testing', value1: 8, source: 'Gong · Feb-Mar calls', text: 'Tatari "holdout testing" mentioned in 8 calls — their measurement story is landing', subcategory: 'Tatari' },
  { label: 'TTD managed service push', value1: 4, source: 'Gong · buyer mentions', text: 'TTD managed service CTV push mentioned in 4 calls', subcategory: 'Trade Desk' },
  { label: 'Amazon Prime Video pitch', value1: 2, source: 'Slack · #competitive-intel', text: 'Amazon Prime Video CTV pitch mentioned 2 times', subcategory: 'Amazon' },
  { label: 'tvScientific Tubi/Samsung reach', value1: 3, source: 'SearchLight · head-to-head wins', text: 'tvScientific won 3 of 5 head-to-head on Tubi/Samsung reach', subcategory: 'tvScientific' },
]);

// ═══ GONG SIGNAL FEED ═══
await seedCategory('html_gong_signals', [
  { label: 'Gaming vertical', subcategory: 'positive', value1: null, source: 'Gong · direct transcript · Mar 27, 2026',
    text: '"Your ML-based optimization is genuinely differentiated. We saw ROAS improvement in week two that Tatari couldn\'t match in three months."',
    metadata: { status: 'Converted to active', themes: ['ML Targeting', 'CTV Reach', 'Attribution'], action: 'Use as reference for gaming pitches', date: '2026-03-27' } },
  { label: 'Retail vertical', subcategory: 'at_risk', value1: null, source: 'Gong · direct transcript · Feb 14, 2026',
    text: '"I can\'t go to my CFO without a cleaner attribution story."',
    metadata: { status: 'Late-stage stalled', themes: ['Attribution', 'CFO Blocker', 'Pricing'], action: 'Share retail case study + propose GDS-led holdout test', date: '2026-02-14', days_stale: 19 } },
  { label: 'Entertainment vertical', subcategory: 'positive', value1: null, source: 'Gong · direct transcript · Mar 29, 2026',
    text: '"We had no idea Moloco had access to Tubi and Samsung at that scale."',
    metadata: { status: 'Active trial', themes: ['Reach Breadth', 'Cross-Screen', 'Attribution'], action: 'Send test fund proposal ($50K trial) this week', date: '2026-03-29' } },
  { label: 'Finance vertical', subcategory: 'mixed', value1: null, source: 'Gong · direct transcript · Mar 15, 2026',
    text: '"The CPMs are higher than TTD — I need to justify that premium to my team."',
    metadata: { status: 'In negotiation', themes: ['Pricing/CPM', 'vs Trade Desk', 'No case study'], action: 'Bring fintech case study showing ROAS premium', date: '2026-03-15' } },
  { label: 'CPG vertical', subcategory: 'lost', value1: null, source: 'Gong · direct transcript · Jan 2026',
    text: '"Every vendor says their CTV drives lift. I need a holdout test with clean control groups."',
    metadata: { status: 'Lost to Tatari', themes: ['Incrementality', 'Lost to Tatari', 'No holdout test'], learning: 'Any deal where buyer mentions "proof of lift" needs GDS measurement protocol ready by call 2', date: '2026-01-15' } },
]);

// ═══ PIPELINE DEALS (from HTML table) ═══
await seedCategory('html_pipeline_deals', [
  { label: 'DTC Brand (CTV-to-App)', subcategory: 'Negotiation', value1: 120000, source: 'SearchLight / CRM',
    text: 'Retail/DTC vertical, 3 days since last activity',
    metadata: { vertical: 'Retail/DTC', type: 'CTV-to-App', days_since: 3, health: 'green', last_activity: '2026-03-29' } },
  { label: 'Gaming Vertical Brand (CTV-to-Web)', subcategory: 'Proposal', value1: 85000, source: 'SearchLight / CRM',
    text: 'Gaming/Mobile vertical, 6 days since last activity',
    metadata: { vertical: 'Gaming/Mobile', type: 'CTV-to-Web', days_since: 6, health: 'green', last_activity: '2026-03-24' } },
  { label: 'Retail Vertical Account', subcategory: 'Discovery', value1: 150000, source: 'SearchLight / CRM',
    text: 'Retail/eCommerce vertical, 19 days STALE — needs immediate attention',
    metadata: { vertical: 'Retail/eCommerce', type: 'CTV', days_since: 19, health: 'stale', last_activity: '2026-02-14' } },
  { label: 'Sports Vertical Brand', subcategory: 'Discovery', value1: 90000, source: 'SearchLight / CRM',
    text: 'Sports/Live Events vertical, 22 days STALE — needs immediate attention',
    metadata: { vertical: 'Sports/Live Events', type: 'CTV', days_since: 22, health: 'stale', last_activity: '2026-03-08' } },
]);

// ═══ SLACK SIGNALS ═══
await seedCategory('html_slack_signals', [
  { label: 'New enterprise inbound — gaming vertical', subcategory: 'deal_signal', source: 'Slack · #ctv-sales-signals · Mar 30, 2026',
    text: 'MMP referral, gaming vertical enterprise inbound', metadata: { channel: '#ctv-sales-signals', reactions: 3, date: '2026-03-30' } },
  { label: 'TTD CTV push', subcategory: 'competitive', source: 'Slack · #competitive-intel',
    text: 'TTD managed service CTV push — 4 mentions in competitive intel channel', metadata: { channel: '#competitive-intel', mentions: 4 } },
  { label: 'Amazon Prime Video pitch', subcategory: 'competitive', source: 'Slack · #competitive-intel',
    text: 'Amazon Prime Video CTV pitch — 2 mentions', metadata: { channel: '#competitive-intel', mentions: 2 } },
  { label: 'tvScientific Tubi/Samsung reach wins', subcategory: 'competitive', source: 'Slack · #competitive-intel + SearchLight',
    text: 'tvScientific winning on Tubi/Samsung reach — 3 of 5 head-to-head wins', metadata: { channel: '#competitive-intel' } },
]);

// ═══ DATA PROVENANCE METHODOLOGY ═══
await seedCategory('html_data_provenance', [
  { label: 'Q1 Revenue', subcategory: 'q1', source: 'BigQuery · fact_dsp_core',
    text: 'GAS/day, ARR, campaigns from BigQuery fact_dsp_core. 7-day trailing window. Pipeline/win rate from SearchLight (estimated, not BQ-verified).' },
  { label: 'Q2 Customer Voice', subcategory: 'q2', source: 'Gong · N=43 calls',
    text: '43 CTV-tagged calls manually reviewed and clustered by keyword themes. Sentiment classification based on theme type, not automated NLP. Monthly trend buckets contain 8-15 calls — noisy at this N.' },
  { label: 'Q3 Win/Loss', subcategory: 'q3', source: 'SearchLight · N=31 deals + Gong',
    text: 'Closed CTV deals from SearchLight. Velocity = Discovery to Close. Behavior presence coded per Gong transcript. N=31 is small — two outlier deals can shift percentages meaningfully.' },
  { label: 'Q4 Market Position', subcategory: 'q4', source: 'Gong + SearchLight + Slack + eMarketer',
    text: 'Win rates from SearchLight head-to-head. Competitive mentions from Gong transcripts (buyer-reported). TAM from eMarketer 2026 AMER estimates. Competitive signals from Slack channels (anecdotal, not validated).' },
]);

const [rows] = await conn.execute('SELECT COUNT(*) as cnt FROM curated_intel');
console.log(`\n✅ Done. Total records in curated_intel: ${rows[0].cnt}`);

await conn.end();
