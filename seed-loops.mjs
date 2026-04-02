import mysql2 from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql2.createConnection(process.env.DATABASE_URL);
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// Delete existing
await conn.execute("DELETE FROM curated_intel WHERE category = 'learning_loop_full'");

const loops = [
  { id: "loop-1", name: "Market → Messaging", fromMod: 1, fromSec: "Industry Landscape Monitoring", toMod: 2, toSec: "Outbound System", signal: "Market shifts and competitive moves detected by Module 1 agents feed directly into Module 2 messaging variants.", mechanism: "When the competitor agent detects a new feature launch or the analyst tracker surfaces a narrative shift, the outbound system automatically generates new messaging angles that address the changed landscape.", frequency: "Weekly cycle — market brief triggers messaging refresh", status: "active", criticalFor: "Ensures outbound messaging stays current with market reality instead of running on stale positioning." },
  { id: "loop-2", name: "Win/Loss → Positioning", fromMod: 1, fromSec: "Customer Voice & Win/Loss", toMod: 1, toSec: "Positioning Intelligence", signal: "Win/loss patterns from Gong + CRM feed back into positioning decisions.", mechanism: "When the win/loss agent detects that 'lack of incrementality measurement' is cited in 3+ losses, the positioning intelligence agent flags this as a gap and generates counter-positioning recommendations.", frequency: "Continuous — each win/loss event triggers re-evaluation", status: "active", criticalFor: "Prevents positioning from drifting away from what actually wins and loses deals." },
  { id: "loop-3", name: "Test Results → ICP Refinement", fromMod: 3, fromSec: "Campaign Monitoring", toMod: 2, toSec: "ICP Intelligence", signal: "Campaign performance data from active tests feeds back into ICP scoring and prioritization.", mechanism: "When a vertical consistently outperforms (e.g., gaming at 12% MQL→SQL), the ICP agent increases conviction on that segment. When a segment underperforms, it flags for deprioritization.", frequency: "Weekly — performance data aggregated and fed back", status: "active", criticalFor: "Ensures ICP targeting improves with every test cycle rather than staying static." },
  { id: "loop-4", name: "Customer Success → Market Intel", fromMod: 3, fromSec: "Cross-Account Intelligence", toMod: 1, toSec: "Competitor Intelligence", signal: "Cross-account patterns and competitive benchmarks from live campaigns feed back into market intelligence.", mechanism: "When the cross-account agent detects that Moloco consistently outperforms a specific competitor in a vertical, this becomes evidence for battlecard updates and positioning claims.", frequency: "Monthly — cross-account synthesis cycle", status: "partial", criticalFor: "Turns customer delivery data into competitive ammunition. Currently partial because cross-account synthesis is manual." },
  { id: "loop-5", name: "Pipeline → Resource Allocation", fromMod: 4, fromSec: "Commercial Performance", toMod: 2, toSec: "Channel & Message Optimization", signal: "Pipeline velocity and conversion data inform where to allocate demand gen resources.", mechanism: "When pipeline data shows a channel is generating volume but not converting, the optimization agent recommends reallocation. When a segment shows high conversion, it recommends doubling down.", frequency: "Bi-weekly — pipeline review triggers reallocation", status: "active", criticalFor: "Prevents throwing resources at channels that generate activity but not revenue." },
  { id: "loop-6", name: "Churn Signals → Product Feedback", fromMod: 3, fromSec: "Churn Prevention", toMod: 4, toSec: "Learning Goals Synthesis", signal: "Churn patterns and at-risk signals feed into strategic learning goals about product-market fit.", mechanism: "When the churn agent detects that customers leave for a specific reason (e.g., measurement gaps), this becomes evidence against the relevant learning goal and may trigger a conviction downgrade.", frequency: "Continuous — each churn signal evaluated", status: "partial", criticalFor: "Ensures strategic decisions account for customer retention reality, not just acquisition metrics." },
  { id: "loop-7", name: "Conviction → Operating Model", fromMod: 4, fromSec: "Learning Goals Synthesis", toMod: 4, toSec: "Operating Rhythm Management", signal: "Conviction score changes trigger operating model adjustments.", mechanism: "When overall conviction drops below 40%, the operating rhythm agent flags for strategic review. When a specific learning goal moves to 'strong,' it triggers scaling recommendations.", frequency: "Weekly — conviction reviewed in XFN weekly", status: "active", criticalFor: "The meta-loop — ensures the operating model itself evolves based on what we're learning." },
  { id: "loop-8", name: "Outbound → Content Engine", fromMod: 2, fromSec: "Outbound System", toMod: 2, toSec: "Content Engine", signal: "Outbound response patterns inform content creation priorities.", mechanism: "When a specific messaging angle gets high response rates, the content engine prioritizes creating supporting assets (case studies, whitepapers, webinars) around that theme.", frequency: "After each outbound cycle (2-week sprints)", status: "partial", criticalFor: "Ensures content production is demand-driven, not assumption-driven." },
  { id: "loop-9", name: "Onboarding → Sales Enablement", fromMod: 3, fromSec: "Onboarding & Setup", toMod: 2, toSec: "Sales Engagement Support", signal: "Onboarding friction points feed back into sales expectation-setting.", mechanism: "When onboarding reveals that customers were sold on capabilities that don't match reality, the sales enablement agent adjusts pitch materials and coaching recommendations.", frequency: "Per-customer — each onboarding triggers feedback", status: "broken", criticalFor: "Prevents the 'oversell → underdeliver' cycle that kills retention." },
  { id: "loop-10", name: "All Modules → Orchestration Layer", fromMod: 0, fromSec: "All Modules", toMod: 0, toSec: "Human Orchestration (Prompts 181-200)", signal: "The orchestration layer synthesizes signals from all modules into unified strategic decisions.", mechanism: "The 20 orchestrator prompts (181-200) are the 'connective tissue' — they detect contradictions between modules, identify systemic vs. local issues, and generate 'what matters most' summaries that no single module can produce alone.", frequency: "Continuous — orchestrator agents run across all modules", status: "active", criticalFor: "This IS the operating model. Without the orchestration layer, you have 4 siloed modules. With it, you have a learning system." },
];

let count = 0;
for (const l of loops) {
  const meta = JSON.stringify({
    from: { module: l.fromMod, section: l.fromSec },
    to: { module: l.toMod, section: l.toSec },
    mechanism: l.mechanism,
    frequency: l.frequency,
    criticalFor: l.criticalFor,
  });
  await conn.execute(
    `INSERT INTO curated_intel (id, category, subcategory, label, text1, text2, text3, metadata, sort_order, is_active)
     VALUES (?, 'learning_loop_full', ?, ?, ?, ?, ?, ?, ?, 1)`,
    [uid(), l.status, l.name, l.signal, l.mechanism, l.criticalFor, meta, count]
  );
  count++;
}

console.log(`learning_loop_full: ${count} records`);

const [r] = await conn.execute("SELECT COUNT(*) as total FROM curated_intel");
console.log(`Total records: ${r[0].total}`);
await conn.end();
