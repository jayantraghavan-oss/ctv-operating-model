/**
 * Seed script: Import data from moloco_ctv_dashboard.html into curated_intel DB
 * This replaces stale records with the latest numbers from Jay's desktop file
 * Updated: 2026-04-01 — reflects April 1 upload
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

// ═══ Q1 REVENUE DATA (from BQ data block — updated Apr 1) ═══
await seedCategory('html_bq_kpi', [
  { label: 'gas_per_day', value1: 208624, source: 'BigQuery · fact_dsp_core · 7-day trailing', text: '$209K/day GAS (7-day trailing average, BQ verified)' },
  { label: 'arr_run_rate_m', value1: 76.1, source: 'BigQuery · derived (gas_per_day × 365)', text: '$76.1M ARR run-rate' },
  { label: 'goal_m', value1: 100, source: 'Internal target', text: '$100M ARR goal' },
  { label: 'gap_m', value1: 23.9, source: 'Derived (goal - ARR)', text: '$23.9M gap to $100M target' },
  { label: 'trailing_7d_k', value1: 208.6, source: 'BigQuery · fact_dsp_core · 7-day window', text: '$208.6K/day trailing 7-day average' },
  { label: 'active_campaigns', value1: 38, source: 'BigQuery · fact_dsp_core · 30-day with spend', text: '38 active CTV campaigns (BQ verified)' },
  { label: 'ytd_gas_m', value1: 9.67, source: 'BigQuery · fact_dsp_core · Jan 1 to yesterday', text: '$9.67M YTD gross ad spend' },
  { label: 'ytd_days', value1: 90, source: 'Calendar', text: '90 days YTD' },
  { label: 'last_updated', value1: null, source: 'System', text: '2026-03-31' },
  { label: 'pct_to_goal', value1: 76.1, source: 'Derived (ARR / $100M)', text: '76.1% to $100M goal' },
]);

await seedCategory('html_bq_monthly', [
  { label: 'Nov', value1: 57.9, source: 'BigQuery · fact_dsp_core', text: 'Nov avg daily GAS $57.9K' },
  { label: 'Dec', value1: 79.2, source: 'BigQuery · fact_dsp_core', text: 'Dec avg daily GAS $79.2K' },
  { label: 'Jan', value1: 86.8, source: 'BigQuery · fact_dsp_core', text: 'Jan avg daily GAS $86.8K' },
  { label: 'Feb', value1: 102.7, source: 'BigQuery · fact_dsp_core', text: 'Feb avg daily GAS $102.7K' },
  { label: 'Mar', value1: 132.2, source: 'BigQuery · fact_dsp_core', text: 'Mar avg daily GAS $132.2K' },
  { label: 'Apr', value1: 84.6, source: 'BigQuery · fact_dsp_core', text: 'Apr avg daily GAS $84.6K (partial month)' },
]);

await seedCategory('html_bq_concentration', [
  { label: 'PMG/FBG', value1: 37.77, source: 'BigQuery · fact_dsp_core · 30-day', text: 'PMG/FBG Oppco LLC — 37.77% of GAS' },
  { label: 'Kraken', value1: 12.18, source: 'BigQuery · fact_dsp_core · 30-day', text: 'Kraken — 12.18% of GAS' },
  { label: 'ARBGaming', value1: 10.08, source: 'BigQuery · fact_dsp_core · 30-day', text: 'ARBGaming — 10.08% of GAS' },
  { label: 'Luckymoney', value1: 7.44, source: 'BigQuery · fact_dsp_core · 30-day', text: 'Luckymoney — 7.44% of GAS' },
  { label: 'NOVIG', value1: 5.04, source: 'BigQuery · fact_dsp_core · 30-day', text: 'NOVIG — 5.04% of GAS' },
  { label: 'Rest', value1: 27.49, source: 'BigQuery · derived', text: 'Rest — 27.49% of GAS' },
]);

await seedCategory('html_bq_pipeline', [
  { label: 'Prospecting', value1: 24.1, source: 'SearchLight / CRM · estimated', text: '$24.1M total pipeline value, 87 open deals' },
  { label: 'Qualification', value1: 8.7, source: 'SearchLight / CRM · estimated', text: '$8.7M in qualification stage' },
  { label: 'Proposal', value1: 5.2, source: 'SearchLight / CRM · estimated', text: '$5.2M in proposal stage' },
  { label: 'Negotiation', value1: 3.4, source: 'SearchLight / CRM · estimated', text: '$3.4M in negotiation/close stage' },
]);

await seedCategory('html_bq_exchange', [
  { label: 'MCTV', value1: 418273, value2: 21.8, source: 'BigQuery · 7-day · per exchange', text: 'MCTV: $418K 7d total, $21.8M ARR', metadata: { gas_7d: 418273, arr_m: 21.8 } },
  { label: 'FREE_WHEEL', value1: 386305, value2: 20.1, source: 'BigQuery · 7-day · per exchange', text: 'FreeWheel: $386K 7d total, $20.1M ARR', metadata: { gas_7d: 386305, arr_m: 20.1 } },
  { label: 'INDEX', value1: 380038, value2: 19.8, source: 'BigQuery · 7-day · per exchange', text: 'Index: $380K 7d total, $19.8M ARR', metadata: { gas_7d: 380038, arr_m: 19.8 } },
  { label: 'NEXXEN', value1: 268177, value2: 14.0, source: 'BigQuery · 7-day · per exchange', text: 'Nexxen: $268K 7d total, $14.0M ARR', metadata: { gas_7d: 268177, arr_m: 14.0 } },
  { label: 'IRONSOURCE', value1: 7573, value2: 0.4, source: 'BigQuery · 7-day · per exchange', text: 'IronSource: $7.6K 7d total, $0.4M ARR', metadata: { gas_7d: 7573, arr_m: 0.4 } },
]);

await seedCategory('html_bq_window', [
  { label: '7d', value1: 208624, value2: 76.1, source: 'BigQuery · 7-day trailing', text: '7-day: $209K/day, $76.1M ARR', metadata: { active_campaigns: 38 } },
  { label: '30d', value1: 113500, value2: 41.4, source: 'BigQuery · 30-day trailing', text: '30-day: $114K/day, $41.4M ARR', metadata: { active_campaigns: 35 } },
  { label: '90d', value1: 111000, value2: 40.5, source: 'BigQuery · 90-day trailing', text: '90-day: $111K/day, $40.5M ARR', metadata: { active_campaigns: 32 } },
]);

await seedCategory('html_bq_exchange_detail', [
  { label: 'all', value1: 208624, value2: 76.1, source: 'BigQuery · all exchanges · 7d', text: 'All exchanges: $209K/day, $76.1M ARR' },
  { label: 'MCTV', value1: 59753, value2: 21.8, source: 'BigQuery · MCTV · 7d', text: 'MCTV: $60K/day, $21.8M ARR' },
  { label: 'FREE_WHEEL', value1: 55186, value2: 20.1, source: 'BigQuery · FreeWheel · 7d', text: 'FreeWheel: $55K/day, $20.1M ARR' },
  { label: 'INDEX', value1: 54291, value2: 19.8, source: 'BigQuery · Index · 7d', text: 'Index: $54K/day, $19.8M ARR' },
  { label: 'NEXXEN', value1: 38311, value2: 14.0, source: 'BigQuery · Nexxen · 7d', text: 'Nexxen: $38K/day, $14.0M ARR' },
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
  { label: 'Nov', value1: 5, value2: 4, source: 'Gong · monthly', text: 'Nov: 5 positive, 4 mixed, 2 friction', metadata: { friction: 2 } },
  { label: 'Dec', value1: 6, value2: 3, source: 'Gong · monthly', text: 'Dec: 6 positive, 3 mixed, 3 friction', metadata: { friction: 3 } },
  { label: 'Jan', value1: 7, value2: 4, source: 'Gong · monthly', text: 'Jan: 7 positive, 4 mixed, 2 friction', metadata: { friction: 2 } },
  { label: 'Feb', value1: 7, value2: 4, source: 'Gong · monthly', text: 'Feb: 7 positive, 4 mixed, 2 friction', metadata: { friction: 2 } },
  { label: 'Mar', value1: 8, value2: 4, source: 'Gong · monthly', text: 'Mar: 8 positive, 4 mixed, 2 friction', metadata: { friction: 2 } },
  { label: 'Apr', value1: 9, value2: 5, source: 'Gong · monthly', text: 'Apr: 9 positive, 5 mixed, 3 friction', metadata: { friction: 3 } },
]);

// ═══ Q3 WIN/LOSS (N=31 deals) ═══
await seedCategory('html_winloss_kpi', [
  { label: 'won_deals', value1: 18, source: 'SearchLight · N=31 CTV deals', text: '18 won deals, avg $87K ARR, avg cycle 47 days', metadata: { avg_deal: 87000, avg_cycle: 47 } },
  { label: 'lost_deals', value1: 13, source: 'SearchLight · N=31 CTV deals', text: '13 lost deals, most common loss: attribution not credible 38%, avg cycle 68 days', metadata: { top_loss: 'Attribution not credible', top_loss_pct: 38, avg_cycle: 68 } },
  { label: 'deal_velocity_won', value1: 47, source: 'SearchLight · Discovery to Close', text: '47 days avg deal velocity (won), 30% faster than lost' },
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

// ═══ Q4 MARKET POSITION (Q4 now has placeholder "—%" for win rates) ═══
await seedCategory('html_market_win_rate', [
  { label: 'overall', value1: null, source: 'SearchLight · 90-day · CTV deals only · PLACEHOLDER', text: 'Overall win rate: —% (SearchLight data needed)' },
]);

await seedCategory('html_market_competitive_mentions', [
  { label: 'Tatari', value1: null, source: 'Gong · N=43 calls · PLACEHOLDER', text: 'Tatari mentioned — exact count needs Gong export' },
  { label: 'The Trade Desk', value1: null, source: 'Gong · N=43 calls · PLACEHOLDER', text: 'TTD mentioned — exact count needs Gong export' },
  { label: 'tvScientific', value1: null, source: 'Gong · N=43 calls · PLACEHOLDER', text: 'tvScientific mentioned — exact count needs Gong export' },
  { label: 'Amazon', value1: null, source: 'Gong · N=43 calls · PLACEHOLDER', text: 'Amazon mentioned — exact count needs Gong export' },
  { label: 'Magnite', value1: null, source: 'Gong · N=43 calls · PLACEHOLDER', text: 'Magnite mentioned — exact count needs Gong export' },
]);

await seedCategory('html_market_win_rate_vs_competitor', [
  { label: 'tvScientific', value1: 60, source: 'Chart.js data (chartWinComp)', text: '60% win rate vs tvScientific (from chart data)' },
  { label: 'Innovid/MNTN', value1: 75, source: 'Chart.js data (chartWinComp)', text: '75% win rate vs Innovid/MNTN (from chart data)' },
  { label: 'Trade Desk', value1: 43, source: 'Chart.js data (chartWinComp)', text: '43% win rate vs Trade Desk (from chart data)' },
  { label: 'Tatari', value1: 34, source: 'Chart.js data (chartWinComp)', text: '34% win rate vs Tatari (from chart data)' },
  { label: 'Magnite', value1: 33, source: 'Chart.js data (chartWinComp)', text: '33% win rate vs Magnite (from chart data)' },
]);

await seedCategory('html_market_competitors', [
  { label: 'Tatari', value1: null, source: 'Gong + SearchLight · PLACEHOLDER', text: 'Head-to-head: N=? deals, win rate: —%',
    metadata: { edge_theirs: 'Measurement credibility, holdout testing, TV-native', our_counter: 'ML optimization, cross-screen attribution, lower CPM' } },
  { label: 'The Trade Desk', value1: null, source: 'Gong + SearchLight · PLACEHOLDER', text: 'Head-to-head: N=? deals, win rate: —%',
    metadata: { edge_theirs: 'Brand recognition, self-serve, existing relationships', our_counter: 'Performance ML, app-to-CTV cross-screen, dedicated CS' } },
  { label: 'tvScientific', value1: null, source: 'Gong + SearchLight · PLACEHOLDER', text: 'Head-to-head: N=? deals, win rate: —%',
    metadata: { edge_theirs: 'Incrementality testing, outcome-based pricing', our_counter: 'ML targeting quality, reach breadth (Tubi/Samsung/Vizio)' } },
  { label: 'Innovid / MNTN', value1: null, source: 'Gong + SearchLight · PLACEHOLDER', text: 'Head-to-head: N=? deals, win rate: —%',
    metadata: { edge_theirs: 'Creative optimization, brand safety tools', our_counter: 'Performance focus, better ROI for direct response' } },
  { label: 'Magnite / SSNC', value1: null, source: 'Gong + SearchLight · PLACEHOLDER', text: 'Head-to-head: N=? deals, win rate: —%',
    metadata: { edge_theirs: 'Supply ownership (SSP), publisher relationships', our_counter: 'Demand-side ML, cross-publisher optimization' } },
  { label: 'No vendor (internal)', value1: null, source: 'Gong + SearchLight · PLACEHOLDER', text: 'Head-to-head: N=? deals, win rate: —%',
    metadata: { edge_theirs: 'Full control, no margin sharing, team buy-in', our_counter: 'Scale of ML, cost-efficiency vs. building in-house' } },
]);

await seedCategory('html_market_tam', [
  { label: 'Total CTV', value1: 21, source: 'eMarketer 2026 AMER estimate · PLACEHOLDER', text: '$21B total CTV market (AMER) — not independently verified' },
  { label: 'Programmatic CTV', value1: 4.2, source: 'eMarketer 2026 AMER estimate · PLACEHOLDER', text: '$4.2B programmatic CTV — not independently verified' },
  { label: 'Addressable (our exchanges)', value1: null, source: 'eMarketer + internal estimate · PLACEHOLDER', text: 'Addressable via our exchanges — needs verification' },
  { label: 'Our ARR', value1: 74.8, source: 'BQ ARR run-rate', text: '$74.8M current ARR run-rate' },
  { label: '$100M Target', value1: 100, source: 'Internal target', text: '$100M ARR target' },
]);

await seedCategory('html_market_competitive_signals', [
  { label: 'Tatari holdout testing', value1: 8, source: 'Gong · Feb-Mar calls', text: 'Tatari\'s holdout-based incrementality testing is being cited in 38% of our lost deals as the deciding factor. Buyers say "Tatari proves lift, everyone else claims it."', subcategory: 'Tatari',
    metadata: { mentions: 8, period: 'February-March 2026' } },
  { label: 'TTD managed service push', value1: 4, source: 'Slack · #ctv-sales-signals', text: 'Multiple buyers mention TTD is now offering higher-touch CTV service including dedicated optimization teams. This is a new motion from TTD and shifts them from self-serve to a managed-service competitor in mid-market.', subcategory: 'Trade Desk',
    metadata: { mentions: 4, period: 'March 2026' } },
  { label: 'tvScientific losing on reach', value1: 3, source: 'SearchLight win notes', text: 'In 3 of 5 head-to-head deals we won against tvScientific, the buyer cited Tubi and Samsung access as the deciding factor. Our exchange breadth is a genuine competitive moat.', subcategory: 'tvScientific',
    metadata: { mentions: 3, period: 'March 2026' } },
  { label: 'Amazon Prime Video CTV', value1: 2, source: 'Slack · #competitive-intel', text: 'Amazon advertising is now pitching CTV performance to direct-response buyers with access to Prime Video inventory. Not yet a named competitor in our deals but could emerge in H2 2026, especially in retail vertical.', subcategory: 'Amazon',
    metadata: { mentions: 2, period: 'March 2026' } },
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

// ═══ PIPELINE DEALS (updated from Sales Intelligence tab) ═══
await seedCategory('html_pipeline_deals', [
  { label: 'PMG / FBG Oppco LLC', subcategory: 'Active', value1: 74000, source: 'SearchLight / CRM',
    text: 'Gaming vertical, $74K/day, Live',
    metadata: { vertical: 'Gaming', daily_gas: 74000, health: 'green', last_gong: '2026-03-27', days_badge: 'Live' } },
  { label: 'Kraken', subcategory: 'Active', value1: 15000, source: 'SearchLight / CRM',
    text: 'Finance/Crypto vertical, ~$15K/day, Live',
    metadata: { vertical: 'Finance / Crypto', daily_gas: 15000, health: 'green', last_gong: '2026-03-25', days_badge: 'Live' } },
  { label: 'ARBGaming', subcategory: 'Active', value1: 13000, source: 'SearchLight / CRM',
    text: 'Gaming/iGaming vertical, ~$13K/day, Live',
    metadata: { vertical: 'Gaming / iGaming', daily_gas: 13000, health: 'green', last_gong: '2026-03-22', days_badge: 'Live' } },
  { label: 'Luckymoney', subcategory: 'Active', value1: 9000, source: 'SearchLight / CRM',
    text: 'Gaming/Mobile vertical, ~$9K/day, Live',
    metadata: { vertical: 'Gaming / Mobile', daily_gas: 9000, health: 'green', last_gong: '2026-03-19', days_badge: 'Live' } },
  { label: 'Finance Vertical Prospect', subcategory: 'Negotiation', value1: 120000, source: 'SearchLight / CRM',
    text: 'Finance vertical, $120K ARR, 8 days in stage',
    metadata: { vertical: 'Finance', arr_est: 120000, health: 'yellow', last_gong: '2026-03-15', days_in_stage: 8 } },
  { label: 'NOVIG', subcategory: 'Negotiation', value1: 95000, source: 'SearchLight / CRM',
    text: 'Sports Betting vertical, $95K ARR, 11 days in stage',
    metadata: { vertical: 'Sports Betting', arr_est: 95000, health: 'yellow', last_gong: '2026-03-12', days_in_stage: 11 } },
  { label: 'Entertainment Vertical Co.', subcategory: 'Proposal', value1: 200000, source: 'SearchLight / CRM',
    text: 'Entertainment/Streaming vertical, $200K ARR, 3 days in stage',
    metadata: { vertical: 'Entertainment / Streaming', arr_est: 200000, health: 'green', last_gong: '2026-03-29', days_in_stage: 3 } },
  { label: 'Gaming Vertical Brand (CTV-to-Web)', subcategory: 'Proposal', value1: 85000, source: 'SearchLight / CRM',
    text: 'Gaming/Mobile vertical, $85K ARR, 6 days in stage',
    metadata: { vertical: 'Gaming / Mobile', arr_est: 85000, health: 'green', last_gong: '2026-03-24', days_in_stage: 6 } },
  { label: 'Retail Vertical Account', subcategory: 'Discovery', value1: 150000, source: 'SearchLight / CRM',
    text: 'Retail/eCommerce vertical, $150K ARR est., 19 days STALE',
    metadata: { vertical: 'Retail / e-Commerce', arr_est: 150000, health: 'stale', last_gong: '2026-02-14', days_in_stage: 19 } },
  { label: 'Sports Vertical Brand', subcategory: 'Discovery', value1: 90000, source: 'SearchLight / CRM',
    text: 'Sports/Live Events vertical, $90K ARR est., 22 days STALE',
    metadata: { vertical: 'Sports / Live Events', arr_est: 90000, health: 'stale', last_gong: '2026-03-08', days_in_stage: 22 } },
]);

// ═══ SLACK SIGNALS (expanded from Sales Intelligence tab) ═══
await seedCategory('html_slack_signals', [
  { label: 'New enterprise inbound — gaming vertical (MMP referral)', subcategory: 'deal_signal', source: 'Slack · #ctv-sales-signals · Mar 30, 2026',
    text: 'Large mobile-first gaming brand inbound via MMP partner. Already knows Moloco mobile product. Asking specifically about CTV. Fast-track to demo — this is a warm ICP match.',
    metadata: { channel: '#ctv-sales-signals', reactions: 3, date: '2026-03-30', sentiment: 'green' } },
  { label: 'Retail account stalling — CFO attribution ask', subcategory: 'deal_signal', source: 'Slack · #ctv-sales-signals · Mar 25, 2026',
    text: 'Deal at risk. CFO demanding third-party attribution validation before approving budget. Tatari\'s holdout methodology being compared to ours. GDS loop needed urgently.',
    metadata: { channel: '#ctv-sales-signals', reactions: 5, date: '2026-03-25', sentiment: 'red' } },
  { label: 'Entertainment prospect: Tubi reach pitch landed', subcategory: 'deal_signal', source: 'Slack · #ctv-sales-signals · Mar 29, 2026',
    text: 'Rep reports exchange coverage slide (Tubi + Samsung vs tvScientific) moved the deal from "evaluating" to "ready to commit." Test fund proposal being drafted. Fastest stage transition this quarter.',
    metadata: { channel: '#ctv-sales-signals', reactions: 7, date: '2026-03-29', sentiment: 'green' } },
  { label: 'Sports vertical account: no response in 3 weeks', subcategory: 'deal_signal', source: 'Slack · #ctv-sales-signals · Mar 22, 2026',
    text: 'Rep flagged 22-day silence from sports vertical Discovery prospect. No reply to emails or follow-up. Likely competing demo in progress with Tatari. Escalation or re-engage with new angle needed immediately.',
    metadata: { channel: '#ctv-sales-signals', reactions: 2, date: '2026-03-22', sentiment: 'red' } },
  { label: 'Tatari now leading with holdout test methodology on call 1', subcategory: 'competitive', source: 'Slack · #competitive-intel · Mar 28, 2026',
    text: 'Tatari reps positioning measurement credibility before targeting performance. Showing up in 38% of our lost deals. Counter: proactively propose GDS holdout framework before buyer asks.',
    metadata: { channel: '#competitive-intel', mentions: 4, date: '2026-03-28', sentiment: 'red' } },
  { label: 'TTD expanding CTV managed service into mid-market', subcategory: 'competitive', source: 'Slack · #competitive-intel · Mar 20, 2026',
    text: 'TTD now offering dedicated CTV optimization teams — no longer self-serve only. Directly overlaps our mid-market ICP. Counter: ML performance at scale vs manual optimization teams.',
    metadata: { channel: '#competitive-intel', mentions: 4, date: '2026-03-20', sentiment: 'yellow' } },
  { label: 'Amazon Prime Video pitching DR performance CTV', subcategory: 'competitive', source: 'Slack · #competitive-intel · Mar 15, 2026',
    text: 'Amazon pitching CTV performance to direct-response buyers with Prime Video access. Not yet in active deals. Retail vertical reps should track — H2 2026 threat especially for e-commerce ICPs.',
    metadata: { channel: '#competitive-intel', mentions: 2, date: '2026-03-15', sentiment: 'cyan' } },
]);

// ═══ SALES INTELLIGENCE KPIs ═══
await seedCategory('html_sales_intel_kpi', [
  { label: 'total_pipeline', value1: 24.1, source: 'SearchLight / CRM · estimated', text: '$24.1M total pipeline value, 87 open deals' },
  { label: 'gong_calls_90d', value1: 43, source: 'Gong · CTV-tagged · 90-day', text: '43 CTV-tagged Gong calls, 54% positive sentiment' },
  { label: 'slack_signals_30d', value1: 12, source: 'Slack · #ctv-sales-signals + #competitive-intel', text: '12 Slack signals (4 competitive, 8 deal signals)' },
  { label: 'stalled_deals', value1: 12, source: 'SearchLight / CRM', text: '12 stalled deals (>14 days no activity)' },
]);

// ═══ MARKET INTELLIGENCE LINKS ═══
await seedCategory('html_market_links', [
  { label: 'BigQuery', source: 'Internal', text: 'Direct access to moloco-ae-view.athena.fact_dsp_core. Ad-hoc queries against live campaign spend.',
    metadata: { url: 'https://console.cloud.google.com/bigquery?project=moloco-ae-view', icon: 'bq' } },
  { label: 'SearchLight / CRM', source: 'Internal', text: 'All 87 open deals, closed-won/lost history, stage data, owner assignments, and deal notes.',
    metadata: { url: 'https://app.searchlight.ai/', icon: 'sl' } },
  { label: 'Gong', source: 'Internal', text: 'Browse, search, and filter all 43 CTV-tagged calls by account, rep, date, or keyword.',
    metadata: { url: 'https://app.gong.io/calls', icon: 'gong' } },
  { label: 'Slack: #ctv-sales-signals', source: 'Internal', text: 'Real-time deal updates, rep signals, customer meeting notes, activation news.',
    metadata: { url: 'https://moloco.slack.com/channels/ctv-sales-signals', icon: 'slack' } },
  { label: 'Slack: #competitive-intel', source: 'Internal', text: 'Competitive signals from the field — Tatari, TTD, tvScientific, Amazon.',
    metadata: { url: 'https://moloco.slack.com/channels/competitive-intel', icon: 'slack' } },
  { label: 'eMarketer', source: 'External', text: 'Source for $4.2B AMER programmatic CTV TAM and $21B total CTV market estimates.',
    metadata: { url: 'https://www.emarketer.com/topics/topic/connected-tv', icon: 'ext' } },
  { label: 'AdExchanger', source: 'External', text: 'Industry coverage of programmatic CTV, DSP landscape, competitor moves, and buyer trends.',
    metadata: { url: 'https://www.adexchanger.com/tag/ctv/', icon: 'ext' } },
  { label: 'IAB', source: 'External', text: 'IAB 2026 guidelines on CTV attribution methodologies, viewability, and incrementality standards.',
    metadata: { url: 'https://www.iab.com/topics/connected-tv/', icon: 'ext' } },
  { label: 'TVNewsCheck', source: 'External', text: 'Trade publication covering CTV advertising market developments, M&A activity, platform launches.',
    metadata: { url: 'https://tvnewscheck.com/streaming/', icon: 'ext' } },
]);

// ═══ DATA PROVENANCE METHODOLOGY ═══
await seedCategory('html_data_provenance', [
  { label: 'Q1 Revenue', subcategory: 'q1', source: 'BigQuery · fact_dsp_core',
    text: 'GAS/day, ARR, campaigns from BigQuery fact_dsp_core. 7-day trailing window. Pipeline/win rate from SearchLight (estimated, not BQ-verified). Monthly trend: SUM(GAS)/COUNT(DISTINCT dates) per month.' },
  { label: 'Q2 Customer Voice', subcategory: 'q2', source: 'Gong · N=43 calls',
    text: '43 CTV-tagged calls manually reviewed and clustered by keyword themes. Sentiment classification based on theme type, not automated NLP. Monthly trend buckets contain 8-15 calls — noisy at this N.' },
  { label: 'Q3 Win/Loss', subcategory: 'q3', source: 'SearchLight · N=31 deals + Gong',
    text: 'Closed CTV deals from SearchLight. Velocity = Discovery to Close. Behavior presence coded per Gong transcript. N=31 is small — two outlier deals can shift percentages meaningfully.' },
  { label: 'Q4 Market Position', subcategory: 'q4', source: 'Gong + SearchLight + Slack + eMarketer',
    text: 'Win rates from SearchLight head-to-head. Competitive mentions from Gong transcripts (buyer-reported). TAM from eMarketer 2026 AMER estimates (PLACEHOLDER — not verified). Competitive signals from Slack channels (anecdotal, not validated).' },
  { label: 'Sales Intelligence', subcategory: 'sales', source: 'SearchLight + Gong + Slack',
    text: 'Pipeline from SearchLight/CRM (manually extracted, not live BQ). Gong: N=43 calls. Slack: anecdotal signals. Click links to verify and act in source systems.' },
]);

// ═══ INSIGHTS TAB — SCORECARD (derived from BQ) ═══
await seedCategory('html_insights_scorecard', [
  { label: 'gas_per_day', value1: 208624, value2: 274000, source: 'BigQuery · 7d trailing vs $274K/day target', text: '$209K/day vs $274K/day target (76.1%)' },
  { label: 'arr_run_rate', value1: 76.1, value2: 100, source: 'BigQuery · derived', text: '$76.1M ARR vs $100M goal' },
  { label: 'ytd_gas', value1: 9.67, value2: 90, source: 'BigQuery · Jan 1 to yesterday', text: '$9.67M YTD over 90 days, implies $39.2M/yr at YTD pace' },
  { label: 'active_campaigns', value1: 38, value2: 150, source: 'BigQuery · 30d with spend', text: '38 active vs 150 target (25%)' },
]);

// ═══ INSIGHTS TAB — GM AGENDA ITEMS (computed from BQ data) ═══
await seedCategory('html_insights_gm_agenda', [
  { label: 'gap_to_close', subcategory: 'action', source: 'Derived from BQ',
    text: 'Close $23.9M ARR gap: need $65K more/day. At $87K avg deal size, 275 additional campaigns needed. Current ramp: 38 active. 7-day trailing rate ($208.6K/day) is encouraging — question is whether it holds for 4+ weeks.',
    metadata: { icon: 'target', type: 'action' } },
  { label: 'concentration_risk', subcategory: 'alert', source: 'BigQuery · 30d concentration',
    text: 'Top advertiser = 37.8% of GAS. One account pause = −$79K/day. If this account pauses or cuts budget, ARR run-rate drops from $76.1M to ~$47.3M immediately. Build 3 diversification replacements before it moves.',
    metadata: { icon: 'warning', type: 'alert' } },
  { label: 'acceleration_signal', subcategory: 'watch', source: 'BigQuery · 7d vs YTD',
    text: 'Trailing 7d ($208.6K/day) is 1.9× YTD avg ($107K/day). Recent acceleration is real but needs 3-4 more weeks of data to confirm it is structural.',
    metadata: { icon: 'chart', type: 'watch' } },
  { label: 'campaign_ramp', subcategory: 'watch', source: 'BigQuery + calendar',
    text: 'Need 12 net new campaigns/month through EOY to hit 150. Currently 38 active (BQ-verified). 112 more needed across 9 months.',
    metadata: { icon: 'rocket', type: 'watch' } },
]);

const [rows] = await conn.execute('SELECT COUNT(*) as cnt FROM curated_intel');
console.log(`\n✅ Done. Total records in curated_intel: ${rows[0].cnt}`);

await conn.end();
