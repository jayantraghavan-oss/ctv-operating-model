/*
 * BuyerSim — Nth-Degree CTV Buyer Simulation
 * Deep technical back-and-forth (20+ turns) grounded in real CTV sales dynamics.
 * Each turn shows which agents/modules activate. Apple glassy UX.
 */
import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  MessageSquare, Send, User, Bot, RotateCcw, ChevronRight,
  Zap, Shield, BarChart3, Target, TrendingUp, Layers,
  Activity, Brain, Radar, Clock, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────

interface AgentTrace {
  moduleId: number;
  moduleName: string;
  subModule: string;
  action: string;
  dataSource: string;
  confidence: number;
}

interface SimMessage {
  id: string;
  role: "buyer" | "seller" | "system" | "agent-trace";
  text: string;
  timestamp: Date;
  traces?: AgentTrace[];
  turnNumber?: number;
  phase?: string;
}

interface Persona {
  id: string;
  name: string;
  title: string;
  company: string;
  vertical: string;
  budget: string;
  priority: string;
  currentStack: string;
  kpis: string[];
  objections: string[];
  dealComplexity: "high" | "very-high" | "extreme";
  stakeholders: string[];
  timeline: string;
}

// ── Personas — Real CTV buyer archetypes ───────────────────────────────

const PERSONAS: Persona[] = [
  {
    id: "gaming-vp",
    name: "Sarah Chen",
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
    id: "dtc-cmo",
    name: "Marcus Rivera",
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
    id: "agency-dir",
    name: "Priya Patel",
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
  {
    id: "retail-svp",
    name: "David Kim",
    title: "SVP Digital Commerce",
    company: "ShopStream Retail Media",
    vertical: "Retail Media Network",
    budget: "$1M+ for off-site CTV activation",
    priority: "First-party data activation on CTV, complement Amazon",
    currentStack: "Amazon DSP for on-site, building off-site capability",
    kpis: ["Advertiser adoption > 40%", "ROAS for advertisers > 4x", "Incremental reach > 30%", "Data match rate > 70%"],
    objections: ["How do you complement Amazon?", "First-party data integration complexity", "Measurement standards for RMN", "Need white-label capability"],
    dealComplexity: "extreme",
    stakeholders: ["SVP Digital (champion)", "CTO (tech validation)", "VP Advertiser Sales (revenue)", "Legal (data governance)", "CPO (product roadmap)"],
    timeline: "Technical POC → 3-month pilot with 5 advertisers → platform decision",
  },
];

// ── Deep CTV Technical Conversation Scripts ────────────────────────────
// Each persona gets 20+ turns of real technical back-and-forth

interface ScriptTurn {
  role: "buyer" | "seller";
  text: string;
  phase: string;
  traces: AgentTrace[];
}

function getGamingScript(): ScriptTurn[] {
  return [
    // Phase 1: Discovery & Current State
    {
      role: "seller", phase: "Discovery",
      text: "Sarah, thanks for making time. I know you're running a significant UA program — TopPlay is one of the top 20 gaming publishers by revenue. Before I dive in, can you walk me through your current CTV setup? I want to make sure I'm not wasting your time with things you already know.",
      traces: [
        { moduleId: 1, moduleName: "Market Intelligence", subModule: "Competitive Landscape Monitoring", action: "Pulled TopPlay's current DSP stack from Sensor Tower SDK data", dataSource: "Sensor Tower", confidence: 92 },
        { moduleId: 1, moduleName: "Market Intelligence", subModule: "ICP Scoring & Segmentation", action: "Scored TopPlay as Tier-1 gaming prospect based on app revenue + CTV spend signals", dataSource: "Brand Pipeline + Sensor Tower", confidence: 88 },
      ],
    },
    {
      role: "buyer", phase: "Discovery",
      text: "Sure. We're spending about $400K/month on CTV through TTD, mostly for our RPG titles. Performance has been... okay. We're seeing 2.2x ROAS on a 7-day window, but honestly our data science team questions whether that's truly incremental. We also run DV360 for some YouTube CTV inventory. The challenge is we can't really tell what's driving installs versus what would have happened anyway.",
      traces: [],
    },
    {
      role: "seller", phase: "Discovery",
      text: "That incrementality question is exactly what I hear from sophisticated gaming teams. A 2.2x ROAS on last-touch looks fine on paper, but if 40-60% of those conversions would have happened organically — which is what we typically see with broad CTV targeting — your true incremental ROAS might be closer to 1.0-1.3x. Let me ask: are you using AppsFlyer's incrementality suite, or running your own holdout tests?",
      traces: [
        { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Test Design & Execution", action: "Retrieved incrementality benchmarks for gaming vertical CTV campaigns", dataSource: "Internal test results database", confidence: 85 },
        { moduleId: 3, moduleName: "Customer Success", subModule: "Technical Performance Monitoring", action: "Pulled typical organic overlap rates for gaming CTV campaigns", dataSource: "Cross-account performance data", confidence: 78 },
      ],
    },
    {
      role: "buyer", phase: "Discovery",
      text: "We've tried AppsFlyer's incrementality tool but the sample sizes are too small for CTV — we'd need to run tests for months to get statistical significance. And our holdout tests are messy because we can't cleanly isolate CTV exposure from our other channels. It's a real problem. Our CFO is starting to ask hard questions about whether CTV spend is justified.",
      traces: [],
    },
    // Phase 2: Technical Deep-Dive — ML & Measurement
    {
      role: "seller", phase: "ML Architecture",
      text: "This is exactly where Moloco's approach is fundamentally different. Let me get technical for a second. TTD and most DSPs use a two-stage optimization: first they bid on inventory using contextual signals, then they measure outcomes after the fact. Moloco's ML runs a single unified model that optimizes directly for your downstream event — in your case, Day-7 ROAS. The model ingests 200+ signals per bid request including device graph data, app usage patterns, and temporal behavior signals. The key difference: we're not optimizing for impressions and hoping they convert. We're optimizing for conversions and working backward to the right impressions.",
      traces: [
        { moduleId: 1, moduleName: "Market Intelligence", subModule: "Competitive Landscape Monitoring", action: "Retrieved TTD vs Moloco architecture comparison for battlecard", dataSource: "Competitive intelligence database", confidence: 94 },
        { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Pitch Narrative Construction", action: "Generated ML architecture explanation tailored to gaming VP audience", dataSource: "Pitch narrative templates + persona data", confidence: 90 },
      ],
    },
    {
      role: "buyer", phase: "ML Architecture",
      text: "Okay, that sounds good in theory, but I've heard similar pitches from every DSP. Here's my real question: how does your model handle the CTV-to-mobile attribution gap? CTV is a lean-back, household-level device. My installs happen on individual mobile devices. The probabilistic matching between a Samsung TV and an iPhone is inherently noisy. How do you solve that?",
      traces: [],
    },
    {
      role: "seller", phase: "ML Architecture",
      text: "Great question — this is the hardest technical problem in CTV-to-App. Here's our approach, and I'll be honest about the limitations too. First, we use a deterministic device graph where available — about 35-40% of CTV impressions can be matched to a mobile device via IP-based household mapping through our partnerships with Tapad and LiveRamp. For the remaining 60%, we use a probabilistic model that factors in temporal proximity (install within 24hrs of exposure), geographic co-location, and behavioral signals. But here's the key innovation: our ML model is trained on the deterministic matches and then applied to score probabilistic matches. So the model learns what a real CTV-driven install looks like from the clean data, then applies that pattern to the noisy data. We typically see 65-70% match rates for gaming apps, which is significantly higher than the industry average of 45-50%.",
      traces: [
        { moduleId: 3, moduleName: "Customer Success", subModule: "Technical Performance Monitoring", action: "Retrieved device graph match rate benchmarks for gaming vertical", dataSource: "Cross-account measurement data", confidence: 86 },
        { moduleId: 1, moduleName: "Market Intelligence", subModule: "MMP & Measurement Monitoring", action: "Pulled latest device graph partnership status and match rates", dataSource: "Partnership database", confidence: 91 },
      ],
    },
    {
      role: "buyer", phase: "ML Architecture",
      text: "65-70% match rate is better than what we're seeing with TTD, which is around 50%. But what about the other 30%? That's still a lot of unattributed spend. And how do you handle the incrementality question? Even with perfect matching, I still don't know if the user would have installed anyway.",
      traces: [],
    },
    // Phase 3: Incrementality Methodology
    {
      role: "seller", phase: "Incrementality",
      text: "Two-part answer. For the unattributed 30%, we use a statistical model called 'expected conversions' — essentially, we look at the historical conversion rate for users in similar cohorts who weren't exposed to CTV and subtract that baseline. It's not perfect, but it gives you a directional read on whether you're over-counting.\n\nFor true incrementality, here's what we recommend for your test: a geo-based holdout design. We split your target markets into matched pairs — say, Dallas/Houston, Phoenix/Denver, Atlanta/Charlotte. One market gets Moloco CTV, the other gets no CTV or continues with TTD. We measure the incremental lift in installs, Day-7 retention, and ROAS between the test and control markets. With your $500K budget, we can run this across 6 market pairs for 4 weeks and get statistically significant results at 95% confidence. We've done this exact design for three other gaming publishers in the last quarter.",
      traces: [
        { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Test Design & Execution", action: "Generated geo-holdout test design for $500K gaming budget", dataSource: "Test design templates + historical test results", confidence: 93 },
        { moduleId: 4, moduleName: "Executive Governance", subModule: "Strength of Conviction Tracker", action: "Flagged this as high-value test for Learning Goal #1 (ML performance proof)", dataSource: "Learning goals framework", confidence: 87 },
      ],
    },
    {
      role: "buyer", phase: "Incrementality",
      text: "Geo-holdout is the gold standard, I agree. But 4 weeks might not be enough for our RPG titles — the monetization window is 14-30 days post-install. Can we extend to 6 weeks? And what's the minimum spend per market to get clean data? I don't want to spread $500K so thin that we can't read the results.",
      traces: [],
    },
    {
      role: "seller", phase: "Incrementality",
      text: "Smart pushback. For RPG titles with longer monetization windows, 6 weeks is actually what I'd recommend too — 4 weeks of active spend plus 2 weeks of observation for the monetization tail. On budget allocation: with 6 market pairs, you're looking at roughly $42K per test market over 6 weeks, which translates to about $1,000/day per market. For CTV in mid-size DMAs, that gives you roughly 150-200K impressions per market per week — enough for statistical power. We'd want a minimum of 500 attributed installs per market to read the results cleanly. Based on your current CPI of $8, that's achievable.\n\nOne thing I'd add: we should align on the primary KPI before we start. I'd recommend incremental CPI as the primary metric, with incremental ROAS as secondary. The reason is that ROAS depends on monetization timing, which varies by title, but CPI is clean and comparable.",
      traces: [
        { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Test Fund Allocation & Tracking", action: "Calculated budget allocation for 6-market geo-holdout at $500K", dataSource: "Test fund calculator", confidence: 95 },
        { moduleId: 3, moduleName: "Customer Success", subModule: "Onboarding & Activation Playbooks", action: "Retrieved RPG-specific test design parameters and timeline", dataSource: "Vertical playbook database", confidence: 89 },
      ],
    },
    // Phase 4: Competitive Comparison
    {
      role: "buyer", phase: "Competitive",
      text: "That makes sense on the test design. But let me be direct — we're also evaluating tvScientific. They're pitching us on their built-in incrementality measurement and they claim 30% lower CPMs than TTD. They also have a CTV-native attribution model that doesn't rely on device graphs. How do you compare?",
      traces: [],
    },
    {
      role: "seller", phase: "Competitive",
      text: "I appreciate the directness. Let me give you an honest comparison.\n\ntvScientific's strengths: They are CTV-native, their incrementality measurement is integrated (not bolted on), and yes, their CPMs tend to be 15-25% lower — though I'd push back on the 30% claim, that's usually comparing different inventory quality tiers.\n\nWhere Moloco wins: Three things. First, ML optimization depth. tvScientific uses a rules-based optimization engine with some ML on top. Moloco's model is end-to-end ML trained on billions of conversion events across our mobile DSP — we have a massive training data advantage because we see the full funnel from impression to in-app event. Second, scale. tvScientific has roughly 40% of the CTV inventory that Moloco accesses through our SSP integrations. Third, and this is the big one for gaming: our CTV-to-App attribution is built on the same device graph and ML matching that powers our mobile DSP, which processes 10 billion+ bid requests daily. tvScientific's 'CTV-native attribution' sounds good, but it's essentially IP-based household matching without the mobile signal enrichment.\n\nWhere tvScientific wins: If your primary use case is CTV-to-Web (driving website visits), their pixel-based measurement is simpler and more accurate than probabilistic mobile matching. But for CTV-to-App, which is your use case, Moloco has a structural advantage.",
      traces: [
        { moduleId: 1, moduleName: "Market Intelligence", subModule: "Competitive Landscape Monitoring", action: "Retrieved tvScientific battlecard with latest competitive intelligence", dataSource: "Competitive intelligence database", confidence: 96 },
        { moduleId: 1, moduleName: "Market Intelligence", subModule: "Win/Loss Pattern Analysis", action: "Analyzed recent wins vs tvScientific — ML depth is top differentiator", dataSource: "Win/loss database", confidence: 88 },
        { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Pitch Narrative Construction", action: "Generated honest competitive comparison framework", dataSource: "Battlecard templates", confidence: 91 },
      ],
    },
    {
      role: "buyer", phase: "Competitive",
      text: "That's a more nuanced answer than I usually get. Most reps just trash the competition. Let me push on the CPM question though. Our current TTD CPMs are $28-32 for gaming audiences. tvScientific quoted us $22-26. What should we expect from Moloco? And how do you justify a premium if your CPMs are higher?",
      traces: [],
    },
    {
      role: "seller", phase: "Competitive",
      text: "Our CPMs for gaming audiences typically land at $25-30, so we're between TTD and tvScientific. But here's why CPM is the wrong metric to optimize for — and I think your data science team would agree.\n\nLet me frame it differently. If Moloco's CPM is $28 but our incremental CPI is $6, and tvScientific's CPM is $23 but their incremental CPI is $9, which is the better deal? You're paying 22% more per impression but getting 33% more efficient conversions. The ML optimization means we're buying fewer but better impressions. We actually see this pattern consistently: our win rate on bid requests is lower than TTD (we bid on maybe 15% of available inventory vs TTD's 30-40%), but our conversion rate per impression is 2-3x higher because we're more selective.\n\nI'd propose we structure the test so you can see this directly. Run Moloco and tvScientific head-to-head in matched markets. Same budget, same audiences, same measurement framework. Let the data decide.",
      traces: [
        { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Test Design & Execution", action: "Generated head-to-head test design vs tvScientific", dataSource: "Competitive test frameworks", confidence: 90 },
        { moduleId: 3, moduleName: "Customer Success", subModule: "Technical Performance Monitoring", action: "Retrieved CPM vs CPI efficiency benchmarks for gaming", dataSource: "Cross-account performance data", confidence: 85 },
      ],
    },
    // Phase 5: Brand Safety & Inventory Quality
    {
      role: "buyer", phase: "Brand Safety",
      text: "The head-to-head test is interesting — let me bring that to our team. But before we go further, I need to address brand safety. We had an incident last quarter where our ads ran next to political content on a FAST channel. Our CEO was furious. Do you have GARM certification? What's your inventory quality framework?",
      traces: [],
    },
    {
      role: "seller", phase: "Brand Safety",
      text: "Brand safety is non-negotiable, especially for gaming publishers with younger audiences. Here's our framework:\n\nFirst, pre-bid filtering. We integrate with DoubleVerify and IAS for real-time content classification. Every bid request is scored against GARM categories before we bid. You can set category-level blocks (e.g., no political, no adult, no gambling) and we enforce them at the bid level, not post-serve.\n\nSecond, inventory curation. We maintain an allow-list of 2,400+ CTV apps and channels that have been individually reviewed. We also maintain a block-list of 800+ apps flagged for quality issues. For gaming advertisers specifically, we recommend our 'Premium Entertainment' inventory package which covers the top streaming apps, sports, and gaming content — about 65% of total CTV inventory but the highest quality tier.\n\nThird, post-serve verification. Every impression is logged with app name, content category, and device type. You get full transparency in reporting — no black-box inventory.\n\nOn GARM specifically: we're currently in the certification process, expected to complete by end of Q2. In the interim, we offer contractual brand safety guarantees with make-good provisions if any impression serves against your blocked categories.",
      traces: [
        { moduleId: 1, moduleName: "Market Intelligence", subModule: "Competitive Landscape Monitoring", action: "Retrieved brand safety certification status and timeline", dataSource: "Partnership database", confidence: 97 },
        { moduleId: 3, moduleName: "Customer Success", subModule: "Onboarding & Activation Playbooks", action: "Generated brand safety framework explanation for gaming vertical", dataSource: "Brand safety playbook", confidence: 93 },
      ],
    },
    {
      role: "buyer", phase: "Brand Safety",
      text: "The contractual guarantee is helpful while you're getting GARM certified. What about frequency capping? We've seen issues with TTD where the same user gets hit 15+ times in a week because CTV frequency capping is broken across devices. A household might have 3 TVs and TTD treats each as a separate user.",
      traces: [],
    },
    {
      role: "seller", phase: "Brand Safety",
      text: "Frequency capping on CTV is genuinely hard, and anyone who tells you they've solved it perfectly is lying. Here's what we do and where the gaps are.\n\nOur frequency cap operates at three levels: device level (the TV), household level (IP-based), and user level (device graph). The device-level cap is 100% accurate. The household-level cap catches about 85% of multi-TV households — the 15% miss rate comes from households with multiple IP addresses (e.g., mesh networks with different exit points). The user-level cap, which tries to coordinate frequency across CTV and mobile, is about 70% accurate.\n\nFor your use case, I'd recommend setting a household-level cap of 3x/week and a device-level cap of 2x/day. This keeps effective frequency in the 4-6x/week range at the household level, which our data shows is the sweet spot for gaming app installs — below 4x you lose reach, above 8x you get diminishing returns and user annoyance.\n\nOne thing we're building that TTD doesn't have: ML-optimized frequency. Instead of a hard cap, the model learns the optimal frequency for each household based on their response pattern. Some households convert after 2 exposures, others need 6. We're in beta with this — I can get you early access if you're interested.",
      traces: [
        { moduleId: 3, moduleName: "Customer Success", subModule: "Technical Performance Monitoring", action: "Retrieved frequency capping accuracy rates and benchmarks", dataSource: "Technical infrastructure data", confidence: 84 },
        { moduleId: 1, moduleName: "Market Intelligence", subModule: "MMP & Measurement Monitoring", action: "Pulled household-level frequency optimization research", dataSource: "Product roadmap + research", confidence: 79 },
      ],
    },
    // Phase 6: Creative & Optimization
    {
      role: "buyer", phase: "Creative Optimization",
      text: "ML-optimized frequency is interesting — that's the kind of innovation I'm looking for. Let's talk creative. We have 15-second and 30-second spots. TTD's creative optimization is basically A/B testing with manual rotation. What does Moloco offer?",
      traces: [],
    },
    {
      role: "seller", phase: "Creative Optimization",
      text: "Creative is where our ML really shines because we can optimize at a granularity that's impossible manually.\n\nHere's how it works: you upload your creative variants — let's say you have 4 x 15-second and 3 x 30-second spots. Our model doesn't just A/B test them. It learns which creative performs best for which audience segment, at which time of day, on which content type. So your action-oriented 15-second spot might win for casual gamers watching comedy content in the evening, while your story-driven 30-second spot wins for core gamers watching sci-fi content on weekends.\n\nThe model also detects creative fatigue automatically. When a creative's conversion rate drops below its historical baseline by more than 15% over a 3-day rolling window, it gets deprioritized and you get an alert to refresh. We typically see creative fatigue set in after 2-3 weeks for gaming, faster for DTC.\n\nOne recommendation: for your RPG titles, we've seen that 30-second spots with gameplay footage outperform 15-second brand spots by 40-60% on CPI. The extra time lets you show the depth of the game. I'd suggest we start the test with a 70/30 split favoring 30-second and let the ML optimize from there.",
      traces: [
        { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Pitch Narrative Construction", action: "Generated creative optimization explanation with gaming-specific benchmarks", dataSource: "Creative performance database", confidence: 88 },
        { moduleId: 3, moduleName: "Customer Success", subModule: "Technical Performance Monitoring", action: "Retrieved creative fatigue patterns for gaming vertical", dataSource: "Cross-account creative data", confidence: 82 },
      ],
    },
    // Phase 7: Pricing & Deal Structure
    {
      role: "buyer", phase: "Deal Structure",
      text: "This is all compelling. Let me shift to the business side. What does the deal structure look like? We're not going to commit $500K without some performance guarantees. tvScientific offered us a CPI guarantee — if we don't hit $7 CPI within the first 4 weeks, they refund the difference. Can you match that?",
      traces: [],
    },
    {
      role: "seller", phase: "Deal Structure",
      text: "I'll be straight with you: we don't do CPI guarantees, and I'd actually caution you about tvScientific's offer. Here's why.\n\nA CPI guarantee creates a perverse incentive. If the DSP guarantees $7 CPI, they'll optimize aggressively for the cheapest installs — which often means targeting users who install everything and never monetize. You'll hit your CPI target but miss your ROAS target. We've seen this pattern with guaranteed deals from other DSPs: CPI looks great, Day-7 retention is 40% below organic benchmarks.\n\nWhat we offer instead: a structured test with clear success criteria and a commitment to transparency. Here's the deal I'd propose:\n\n1. $500K test budget over 6 weeks across 6 geo-matched markets\n2. Moloco covers the measurement setup costs (AppsFlyer incrementality + our own geo-holdout analysis) — that's about $15K in value\n3. Weekly performance reviews with our dedicated gaming optimization team\n4. If incremental ROAS is below 1.5x after 6 weeks, we'll extend the test by 2 weeks at no additional cost and bring in our data science team for a deep optimization review\n5. No minimum commitment beyond the test. If the results don't justify scaling, you walk away clean\n\nThe goal is to prove value, not lock you in. If our ML works as well as we believe it does for gaming, you'll want to scale. If it doesn't, we both learn something.",
      traces: [
        { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Test Fund Allocation & Tracking", action: "Generated deal structure for $500K gaming test with measurement coverage", dataSource: "Deal structure templates + pricing models", confidence: 92 },
        { moduleId: 4, moduleName: "Executive Governance", subModule: "Revenue Pacing & ARR Tracking", action: "Flagged TopPlay as potential $2M ARR account if test succeeds", dataSource: "Pipeline projection model", confidence: 75 },
      ],
    },
    {
      role: "buyer", phase: "Deal Structure",
      text: "That's a fair structure. I appreciate the honesty about CPI guarantees — our data science team has actually flagged the same concern. The measurement coverage is a nice touch. Let me ask about onboarding: how quickly can we go live? We want to start the test before our Q2 planning cycle closes in 3 weeks.",
      traces: [],
    },
    // Phase 8: Onboarding & Timeline
    {
      role: "seller", phase: "Onboarding",
      text: "Three weeks is tight but doable. Here's the onboarding timeline:\n\n**Week 1 (Days 1-5):**\n- Day 1: Kick-off call, AppsFlyer postback configuration, creative asset upload\n- Day 2-3: Audience segment setup, geo-market selection, frequency cap configuration\n- Day 3-4: Brand safety settings, inventory package selection, QA testing\n- Day 5: Test launch in 2 markets (soft launch for ML learning)\n\n**Week 2 (Days 6-10):**\n- ML learning period across all 6 test markets\n- Daily performance monitoring, bid adjustments\n- First data quality check on attribution matching\n\n**Week 3-8:**\n- Full optimization mode\n- Weekly performance reviews\n- Mid-test creative refresh recommendation\n- Week 6: Final analysis and scale recommendation\n\nThe critical path item is the AppsFlyer postback setup. If your team can configure that in Day 1, we can hit your timeline. I'll assign our senior gaming optimization specialist — she's onboarded 8 gaming publishers in the last quarter and knows the AppsFlyer integration inside out.",
      traces: [
        { moduleId: 3, moduleName: "Customer Success", subModule: "Onboarding & Activation Playbooks", action: "Generated gaming-specific onboarding timeline for 3-week deadline", dataSource: "Onboarding playbook + resource calendar", confidence: 94 },
        { moduleId: 3, moduleName: "Customer Success", subModule: "Technical Performance Monitoring", action: "Checked optimization specialist availability for gaming accounts", dataSource: "Resource allocation system", confidence: 90 },
      ],
    },
    // Phase 9: Stakeholder Alignment
    {
      role: "buyer", phase: "Stakeholder Alignment",
      text: "The timeline works. Last thing — I need to get our CFO on board. She's going to ask two questions: (1) What's the expected ROI on this $500K test? (2) What's the risk if it fails? Can you help me build the internal business case?",
      traces: [],
    },
    {
      role: "seller", phase: "Stakeholder Alignment",
      text: "Absolutely. Here's the business case framework I'd present to your CFO:\n\n**Expected ROI scenario analysis:**\n- **Bull case (40% probability):** Incremental ROAS of 3.0x+ → $500K test generates $1.5M in incremental revenue → clear signal to scale to $2M annual\n- **Base case (45% probability):** Incremental ROAS of 1.5-3.0x → $500K test generates $750K-$1.5M in incremental revenue → scale with optimization adjustments\n- **Bear case (15% probability):** Incremental ROAS below 1.5x → $500K test generates <$750K → valuable learning about CTV channel economics, no further commitment required\n\n**Risk mitigation:**\n- Geo-holdout design means you can measure true incrementality, not just attributed performance\n- No long-term commitment — test is self-contained\n- Moloco covers measurement costs ($15K value)\n- Weekly reviews mean you can pause at any point if results are clearly negative\n- The $500K represents 2.5% of your estimated annual UA budget — standard test allocation for a new channel\n\n**Opportunity cost of NOT testing:**\n- If Moloco delivers 20% better incremental ROAS than TTD (which is what we've seen in 3 of 5 comparable gaming tests), that's $960K in annual incremental value at your current CTV spend level\n- Delaying by one quarter costs you ~$240K in unrealized value\n\nI can put this into a one-page executive summary that you can share directly with your CFO. Want me to draft that?",
      traces: [
        { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Pitch Narrative Construction", action: "Generated CFO-ready business case with scenario analysis", dataSource: "ROI model templates + historical test outcomes", confidence: 91 },
        { moduleId: 4, moduleName: "Executive Governance", subModule: "Exec Communications", action: "Drafted executive summary framework for stakeholder alignment", dataSource: "Exec communication templates", confidence: 87 },
        { moduleId: 1, moduleName: "Market Intelligence", subModule: "Win/Loss Pattern Analysis", action: "Retrieved comparable gaming test outcomes for probability weighting", dataSource: "Win/loss database", confidence: 83 },
      ],
    },
    // Phase 10: Close
    {
      role: "buyer", phase: "Close",
      text: "Yes, please draft that executive summary. If the business case holds up with our data science team and CFO, I think we can move forward. What are the next steps from your side?",
      traces: [],
    },
    {
      role: "seller", phase: "Close",
      text: "Great. Here's what happens next:\n\n1. **Today:** I'll send you the executive summary, the detailed test design document, and the onboarding checklist\n2. **This week:** Let's schedule a 30-minute technical call with your data science team and our measurement specialist to align on the incrementality methodology. This usually resolves the remaining technical questions and gives your DS team confidence in the approach\n3. **Next week:** Once your CFO signs off, we kick off onboarding. I'll introduce you to your dedicated optimization specialist and we'll start the AppsFlyer configuration\n4. **Week 3:** Test goes live\n\nI'll also share two things that might help your internal process: (a) a case study from a comparable gaming publisher who ran this exact test design and saw 28% incremental ROAS improvement over TTD, and (b) a reference contact at that publisher who's willing to speak with your team.\n\nDoes this work for your timeline?",
      traces: [
        { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Outbound Sequencing & Personalization", action: "Generated next-steps sequence with collateral package", dataSource: "Sales playbook + collateral library", confidence: 95 },
        { moduleId: 3, moduleName: "Customer Success", subModule: "Onboarding & Activation Playbooks", action: "Queued onboarding specialist assignment and AppsFlyer prep", dataSource: "Resource allocation system", confidence: 92 },
        { moduleId: 4, moduleName: "Executive Governance", subModule: "OKR & Action Item Tracking", action: "Created action items for TopPlay deal progression", dataSource: "Action item tracker", confidence: 89 },
      ],
    },
    {
      role: "buyer", phase: "Close",
      text: "That works perfectly. The reference call will be especially helpful for our CFO. Let's get this moving. I'm cautiously optimistic — this is the most technically rigorous CTV pitch I've heard. If the results match the methodology, we'll scale aggressively.",
      traces: [],
    },
  ];
}

function getDtcScript(): ScriptTurn[] {
  return [
    { role: "seller", phase: "Discovery", text: "Marcus, thanks for the time. GlowUp has been crushing it on Meta and Google — I saw your recent campaign with the dermatologist testimonials. CTV is a different beast though. Before I pitch anything, what's driving the interest in CTV? Is this coming from you or the board?", traces: [{ moduleId: 1, moduleName: "Market Intelligence", subModule: "ICP Scoring & Segmentation", action: "Scored GlowUp as mid-tier DTC prospect — first CTV buyer, education-heavy sale", dataSource: "Brand Pipeline", confidence: 82 }] },
    { role: "buyer", phase: "Discovery", text: "Honestly, it's both. Our Meta CPMs have gone up 35% year-over-year and we're hitting a ceiling on Google Shopping. The board wants us to diversify. I've been reading about CTV but I'm skeptical — our average order value is $65 and I can't see how a $28 CPM TV ad drives a $65 skincare purchase. The math doesn't work on paper.", traces: [] },
    { role: "seller", phase: "Education", text: "The math concern is valid and it's the #1 objection from DTC brands. Let me reframe it. CTV isn't a direct response channel like Meta — it's a mid-funnel channel that makes your existing channels work harder. Here's what we see with DTC brands on Moloco CTV:\n\n1. **Halo effect on search:** Brands running CTV see 15-25% increase in branded search volume within 2 weeks. For a skincare brand, that means more people Googling 'GlowUp Skincare' after seeing your CTV ad\n2. **Social lift:** CTV-exposed audiences convert 20-30% better on Meta retargeting. The TV ad does the awareness work, Meta closes the deal\n3. **Direct response:** Yes, some users do convert directly — we see 0.3-0.8% visit rates from CTV for DTC, which at a $65 AOV and $28 CPM gives you a $35-$93 cost per site visit. Not great in isolation, but combined with the halo effects, total ROAS typically lands at 2.0-3.5x\n\nThe key is measuring all three effects together, not just direct response.", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Pitch Narrative Construction", action: "Generated DTC-specific value framework with halo effect data", dataSource: "DTC vertical playbook + cross-account data", confidence: 87 }, { moduleId: 1, moduleName: "Market Intelligence", subModule: "ICP Scoring & Segmentation", action: "Retrieved DTC skincare CTV benchmarks", dataSource: "Vertical benchmark database", confidence: 80 }] },
    { role: "buyer", phase: "Education", text: "The halo effect argument is interesting but hard to prove. How do you actually measure the branded search lift? And how do I separate the CTV effect from everything else we're running?", traces: [] },
    { role: "seller", phase: "Measurement", text: "Great question. We use a three-layer measurement approach for DTC:\n\n**Layer 1 — Exposed vs. Control:** We create a matched audience panel. Users exposed to your CTV ad vs. a statistically matched control group who weren't. We measure the difference in site visits, search queries, and purchases between the two groups. This gives you clean incrementality.\n\n**Layer 2 — Media Mix Modeling (MMM):** We work with your analytics team or agency to feed CTV impression data into your MMM. This shows CTV's contribution alongside Meta, Google, and other channels. Most DTC brands using Moloco CTV see it as the 3rd or 4th most efficient channel after branded search and email.\n\n**Layer 3 — Brand Lift Study:** We partner with Lucid or Kantar to run a brand awareness and consideration study. Pre/post measurement of unaided awareness, consideration, and purchase intent. For a $150K test, we can include a brand lift study at no additional cost.\n\nFor your specific situation, I'd recommend starting with Layer 1 (exposed vs. control) and Layer 3 (brand lift). Layer 2 requires 3+ months of data to be meaningful.", traces: [{ moduleId: 3, moduleName: "Customer Success", subModule: "Technical Performance Monitoring", action: "Generated DTC measurement framework with three-layer approach", dataSource: "Measurement playbook + partner integrations", confidence: 91 }, { moduleId: 1, moduleName: "Market Intelligence", subModule: "MMP & Measurement Monitoring", action: "Retrieved brand lift study partnership options and costs", dataSource: "Partnership database", confidence: 88 }] },
    { role: "buyer", phase: "Measurement", text: "The brand lift study at no cost is appealing. But $150K is a lot for a channel we've never tested. What if we start smaller — say $50K — to dip our toes in?", traces: [] },
    { role: "seller", phase: "Deal Structure", text: "I understand the instinct to start small, but I'd actually push back on $50K. Here's why: at $50K over 4-6 weeks, you're spending about $1,200/day on CTV. In a mid-size DMA, that buys you maybe 40-50K impressions per day. For a brand lift study to be statistically significant, you need a minimum of 2 million impressions in the test group. At $50K, you'd barely hit that threshold, and the results would be noisy.\n\nHere's what I'd propose instead: $100K over 6 weeks, focused on 3 DMAs where you already have strong Meta/Google presence. This gives you:\n- Enough impression volume for clean measurement\n- Ability to see the halo effect on your existing channels\n- A brand lift study with statistical significance\n- Clear data for a go/no-go decision on scaling\n\nThe remaining $50K from your original budget stays in reserve. If the test works, you deploy it immediately. If not, you've saved $50K.\n\nAlternatively, if $100K is truly the ceiling, we can do a 4-week test in 2 DMAs. Tighter but still readable.", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Test Fund Allocation & Tracking", action: "Calculated minimum viable test budget for DTC brand lift measurement", dataSource: "Test design calculator + statistical power models", confidence: 93 }, { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Test Design & Execution", action: "Generated two test design options at $100K and $50K budgets", dataSource: "Test design templates", confidence: 89 }] },
    { role: "buyer", phase: "Deal Structure", text: "The $100K in 3 DMAs makes more sense. I can probably get that approved if I frame it as a channel diversification test. What about creative? We don't have TV-quality creative. Our best performing assets are UGC-style videos on Meta.", traces: [] },
    { role: "seller", phase: "Creative", text: "This is actually great news. The DTC brands that perform best on CTV are NOT the ones with expensive TV commercials. UGC-style creative works incredibly well on CTV because it feels authentic in a sea of polished brand ads.\n\nHere's what I'd recommend:\n1. **Repurpose your top Meta UGC** — take your best-performing 15-second Meta videos and upscale them to CTV resolution. We have a creative partner who can do this for $2-3K per asset\n2. **Add a CTV-specific CTA** — instead of 'Shop Now' (which doesn't work on TV), use 'Search GlowUp Skincare' or display a QR code. This bridges the CTV-to-mobile gap\n3. **Test 3-4 variants** — our ML will optimize creative rotation automatically. We typically see the winning creative emerge within the first 5-7 days\n\nThe total creative investment would be $8-12K for 4 CTV-ready assets. Some of our DTC clients have even used their existing Instagram Reels with just a resolution upscale and a new end card — zero additional production cost.", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Pitch Narrative Construction", action: "Generated DTC creative strategy with UGC-to-CTV conversion approach", dataSource: "Creative best practices + DTC case studies", confidence: 86 }, { moduleId: 3, moduleName: "Customer Success", subModule: "Onboarding & Activation Playbooks", action: "Retrieved creative partner options and pricing for DTC upscale", dataSource: "Partner network database", confidence: 84 }] },
    { role: "buyer", phase: "Creative", text: "That's way more accessible than I expected. I was picturing $50K+ in production costs. The QR code idea is smart — we've seen good QR engagement on our packaging. Okay, I'm getting more interested. Walk me through what the first two weeks look like if we say yes.", traces: [] },
    { role: "seller", phase: "Onboarding", text: "Here's the fast-track onboarding for DTC:\n\n**Week 1:**\n- Day 1: Kick-off + creative review. You send us your top 5 Meta assets, we select the best 3-4 for CTV adaptation\n- Day 2-3: Creative partner upscales assets, adds CTV end cards. You approve finals\n- Day 3: Pixel setup on your Shopify store for direct response tracking. We also configure the exposed/control audience panels\n- Day 4-5: Campaign build — DMA selection, audience targeting, frequency caps, brand safety settings\n\n**Week 2:**\n- Day 6: Soft launch in DMA #1 at 50% budget. ML learning phase\n- Day 8: Expand to all 3 DMAs at full budget\n- Day 10: First performance check — impression delivery, frequency, brand safety compliance\n- Day 12-14: First directional read on site visit rates and branded search lift\n\nBy end of Week 2, you'll have enough data to see if the channel is directionally working. By Week 4, you'll have statistically significant brand lift results. By Week 6, you'll have a full incrementality read.\n\nI'll be your primary contact throughout, with a weekly 30-minute review call. No managed service fees — this is all included.", traces: [{ moduleId: 3, moduleName: "Customer Success", subModule: "Onboarding & Activation Playbooks", action: "Generated DTC-specific fast-track onboarding timeline", dataSource: "DTC onboarding playbook", confidence: 95 }] },
    { role: "buyer", phase: "Close", text: "This is well structured. Let me take this to our CEO this week. Can you send me a one-pager with the test design, expected outcomes, and the competitive context — specifically why CTV now and why Moloco vs. just increasing our Meta budget? That's the question she'll ask.", traces: [] },
    { role: "seller", phase: "Close", text: "I'll have that one-pager to you by tomorrow morning. It'll cover:\n\n1. **Why CTV now:** Meta CPM inflation (+35% YoY for DTC), audience saturation on social, CTV viewership growing 22% YoY in your target demo (women 25-45)\n2. **Why not just more Meta:** Diminishing returns curve — your Meta ROAS has declined from 4.2x to 3.1x over 12 months as you've scaled. CTV opens a new audience pool\n3. **Why Moloco:** ML-optimized CTV buying (not just programmatic), DTC-specific measurement framework, no managed service fees, brand lift study included\n4. **Test structure:** $100K / 6 weeks / 3 DMAs / clear success criteria\n5. **Risk:** Capped at $100K, no long-term commitment, weekly reviews with pause option\n\nI'll also include a case study from a comparable DTC beauty brand that saw 2.8x total ROAS (including halo effects) on their first CTV test with us.\n\nOne more thing — would it help if I joined the CEO call? Sometimes having the vendor in the room to answer technical questions directly speeds up the decision.", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Outbound Sequencing & Personalization", action: "Generated CEO-ready one-pager with competitive positioning", dataSource: "Collateral library + competitive data", confidence: 93 }, { moduleId: 4, moduleName: "Executive Governance", subModule: "Exec Communications", action: "Prepared executive stakeholder alignment materials", dataSource: "Exec communication templates", confidence: 88 }] },
    { role: "buyer", phase: "Close", text: "The one-pager would be great. And yes, let's plan for you to join the CEO call — she'll have technical questions I can't answer. Send me some time slots for next week. I think this could work, Marcus is cautiously optimistic.", traces: [] },
  ];
}

function getAgencyScript(): ScriptTurn[] {
  return [
    { role: "seller", phase: "Discovery", text: "Priya, thanks for making time. Managing CTV across 12 clients is no small feat. Before we dive in, I'd love to understand your current pain points with TTD and Roku OneView. What's working, what's not?", traces: [{ moduleId: 1, moduleName: "Market Intelligence", subModule: "ICP Scoring & Segmentation", action: "Scored MediaForce as Tier-1 agency prospect — multi-client, high volume", dataSource: "Brand Pipeline", confidence: 90 }] },
    { role: "buyer", phase: "Discovery", text: "TTD is our primary CTV platform and it works well for execution. The reporting is solid, the inventory is broad. But three things are killing us: (1) Campaign setup takes 4-6 hours per client because every vertical needs different optimization settings, (2) cross-client reporting is manual — I have an analyst spending 2 days/week pulling reports from TTD into our client dashboards, and (3) TTD's managed service team is stretched thin and response times have gone from same-day to 3-5 days. Roku OneView is fine for Roku inventory but it's a walled garden.", traces: [] },
    { role: "seller", phase: "Platform Capabilities", text: "Those are exactly the pain points we hear from agencies at your scale. Let me address each one:\n\n**Campaign setup:** Moloco's platform has vertical-specific templates. Gaming, DTC, entertainment, retail — each has pre-configured optimization goals, audience segments, and bid strategies. Your team selects the vertical, uploads creative, sets budget, and the ML handles the rest. Average setup time: 45 minutes per campaign. We also support bulk campaign creation via API if your team wants to automate further.\n\n**Cross-client reporting:** We offer a unified agency dashboard that aggregates all client campaigns into a single view. Custom report templates, automated weekly email reports, and API access for feeding data into your existing BI tools. Your analyst gets 2 days/week back.\n\n**Support:** Every agency partner gets a dedicated account manager with a 4-hour SLA for critical issues and same-day for standard requests. For an agency managing $2M+, you'd also get quarterly business reviews and early access to new features.\n\nBut I want to be honest about where we're still building: our self-serve UI is good but not as mature as TTD's. For advanced audience segmentation and custom deal setup, you'd still need to work with your account manager for the first few months.", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Pitch Narrative Construction", action: "Generated agency-specific platform comparison vs TTD", dataSource: "Agency playbook + platform feature matrix", confidence: 91 }, { moduleId: 3, moduleName: "Customer Success", subModule: "Onboarding & Activation Playbooks", action: "Retrieved agency onboarding timeline and resource requirements", dataSource: "Agency onboarding playbook", confidence: 88 }] },
    { role: "buyer", phase: "Platform Capabilities", text: "45-minute setup is appealing. But the self-serve gap concerns me. My team runs 30+ campaigns at any given time. We can't have them going through an account manager for every change. When does the self-serve UI reach parity with TTD?", traces: [] },
    { role: "seller", phase: "Platform Capabilities", text: "Fair concern. Our self-serve roadmap has three phases:\n\n**Now (available today):** Campaign creation, budget management, creative upload/rotation, basic audience targeting, real-time reporting, frequency cap management. This covers about 80% of day-to-day operations.\n\n**Q2 (next 2 months):** Advanced audience builder with custom segment creation, deal ID management, bulk operations, and automated rules (e.g., pause campaign if CPI exceeds $X). This gets you to about 95% self-serve.\n\n**Q3:** Full API parity with UI, custom attribution windows, and white-label reporting for your clients.\n\nFor the transition period, here's what I'd propose: start with 2 clients as a pilot. Your team uses self-serve for the 80% that's available today, and your dedicated AM handles the remaining 20%. As the Q2 features roll out, we transition those 2 clients to full self-serve, then expand to the rest of your book.\n\nThe advantage of starting now vs. waiting for full parity: your team builds muscle memory on the platform while the features catch up, and you get early input into our product roadmap. We've actually built several features based on agency partner feedback.", traces: [{ moduleId: 1, moduleName: "Market Intelligence", subModule: "Competitive Landscape Monitoring", action: "Retrieved platform roadmap timeline for agency self-serve features", dataSource: "Product roadmap", confidence: 85 }, { moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Test Design & Execution", action: "Designed 2-client pilot structure for agency onboarding", dataSource: "Agency pilot templates", confidence: 90 }] },
    { role: "buyer", phase: "Pricing", text: "The 2-client pilot makes sense. Let's talk economics. TTD charges us a platform fee of 10-12% of spend. What's Moloco's fee structure? And do you offer agency volume discounts?", traces: [] },
    { role: "seller", phase: "Pricing", text: "Our standard platform fee is 12% of media spend, which is comparable to TTD. For agency partners managing $1M+ annually, we offer a tiered discount:\n\n- $1-2M annual spend: 11%\n- $2-5M annual spend: 10%\n- $5M+: Custom negotiation\n\nAt your current $2M across clients, you'd be at 10% — saving you 2 percentage points vs. TTD's 12%. On $2M, that's $40K/year back in your margin.\n\nBut here's where it gets more interesting for agencies: our ML optimization typically delivers 15-25% better performance than TTD for comparable campaigns. If you're passing performance improvements through to clients, that's a stronger retention lever than the fee savings. And if you're keeping a performance margin, the better ROAS means more room for your agency margin.\n\nWe also offer co-marketing support: joint case studies, agency certification program, and priority access to beta features. The certification program in particular is valuable — it gives your team a credential that differentiates you in new business pitches.", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Test Fund Allocation & Tracking", action: "Generated agency pricing model with volume discount tiers", dataSource: "Pricing models + agency deal structures", confidence: 94 }] },
    { role: "buyer", phase: "Pricing", text: "10% is competitive. The co-marketing support is interesting too — we're always looking for differentiation in pitches. Let me ask about the pilot: which 2 clients should we start with? I'm thinking one gaming client and one DTC client to test across verticals.", traces: [] },
    { role: "seller", phase: "Pilot Design", text: "Gaming + DTC is the perfect combination. Here's why and how I'd structure it:\n\n**Gaming client:** This is where Moloco's ML advantage is strongest. CTV-to-App measurement is our core competency. Pick your gaming client with the highest CTV spend — the larger the budget, the faster the ML learns and the cleaner the results. I'd recommend a $50-75K test over 4 weeks.\n\n**DTC client:** This tests our CTV-to-Web capabilities and brand lift measurement. Pick a DTC client who's currently Meta-heavy and looking to diversify. $30-50K test over 6 weeks (longer because DTC measurement includes brand lift which takes more time).\n\n**Success criteria for the pilot:**\n1. Gaming: Incremental CPI within 20% of TTD benchmark, with higher Day-7 retention\n2. DTC: Measurable branded search lift of >10%, total ROAS >2.0x including halo effects\n3. Operational: Campaign setup time <1 hour, reporting quality matches or exceeds TTD\n\nIf both pilots hit these bars, we expand to 4-5 clients in Month 2, then full book by Month 4. If one vertical works and the other doesn't, we focus on the winning vertical and iterate on the other.\n\nI'll build a detailed pilot proposal with timelines, budgets, and measurement frameworks for both clients. Can you share the client names so I can customize the approach?", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Test Design & Execution", action: "Generated dual-vertical agency pilot design with success criteria", dataSource: "Agency pilot templates + vertical benchmarks", confidence: 92 }, { moduleId: 3, moduleName: "Customer Success", subModule: "Onboarding & Activation Playbooks", action: "Mapped agency pilot timeline to resource availability", dataSource: "Resource calendar", confidence: 87 }] },
    { role: "buyer", phase: "Close", text: "I'll share the client details after our internal review. This is the most structured pilot proposal I've seen from a DSP. Let me take this to our SVP Media this week. If she's aligned, we can kick off the pilot next month.", traces: [] },
    { role: "seller", phase: "Close", text: "Perfect. I'll send you the full pilot proposal document by end of day — it'll include everything we discussed plus competitive benchmarks, measurement methodology, and the onboarding timeline. I'll also include a one-page 'Agency Partner Benefits' summary for your SVP that highlights the margin improvement, co-marketing support, and certification program.\n\nOne suggestion for the SVP conversation: frame this as a strategic platform diversification play, not just a vendor evaluation. Agencies that are 100% dependent on TTD for CTV are exposed to pricing risk and feature stagnation. Having a credible second platform gives you negotiating leverage with TTD too.\n\nLet me know how the SVP meeting goes — I'm available to join if that would help.", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Outbound Sequencing & Personalization", action: "Generated SVP-ready agency partner summary", dataSource: "Agency collateral library", confidence: 93 }, { moduleId: 4, moduleName: "Executive Governance", subModule: "Exec Communications", action: "Prepared stakeholder alignment materials for agency SVP", dataSource: "Exec communication templates", confidence: 86 }] },
  ];
}

function getRetailScript(): ScriptTurn[] {
  return [
    { role: "seller", phase: "Discovery", text: "David, thanks for the meeting. ShopStream's retail media network is one of the fastest-growing in the space. I understand you're building out off-site CTV capabilities to complement your on-site offering. Can you walk me through where you are in that journey and what you're looking for in a DSP partner?", traces: [{ moduleId: 1, moduleName: "Market Intelligence", subModule: "ICP Scoring & Segmentation", action: "Scored ShopStream as strategic Tier-1 RMN prospect — high complexity, high value", dataSource: "Brand Pipeline + market research", confidence: 94 }] },
    { role: "buyer", phase: "Discovery", text: "We're early. Our on-site retail media business is doing $200M/year and growing 40% YoY. The board wants us to build off-site capabilities — CTV is the top priority because our CPG and electronics advertisers are asking for it. We're currently using Amazon DSP for some off-site display, but CTV is a different animal. We need a partner who can: (1) activate our first-party shopper data on CTV inventory, (2) provide closed-loop measurement back to in-store and online purchases, and (3) potentially offer a white-label solution we can brand as ShopStream CTV.", traces: [] },
    { role: "seller", phase: "Technical Architecture", text: "Those three requirements are exactly what we've been building toward. Let me address each one technically:\n\n**First-party data activation:** Moloco supports clean room integrations with LiveRamp, Snowflake, and AWS Clean Rooms. Your shopper data stays in your environment — we receive hashed audience segments that we match against our CTV device graph. Typical match rates for retail first-party data: 65-75% at the household level. This means if you have 10M active shoppers, we can reach 6.5-7.5M of them on CTV.\n\n**Closed-loop measurement:** This is the killer feature for RMNs. We integrate with your transaction data (via clean room) to measure actual purchase lift — not just impressions or clicks, but 'did the household that saw the CTV ad buy more Tide at your stores?' We support both online purchase attribution (real-time) and in-store attribution (weekly batch via loyalty card matching). The measurement methodology is based on exposed vs. matched control groups with a minimum 95% confidence threshold.\n\n**White-label:** We offer a white-label CTV solution that your advertisers access through a ShopStream-branded interface. They see ShopStream CTV, not Moloco. The UI is customizable — your logo, your color scheme, your reporting templates. Under the hood, it's Moloco's ML and infrastructure.\n\nThe white-label is our most complex offering and requires a deeper partnership structure. Want me to go into the technical architecture?", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Pitch Narrative Construction", action: "Generated RMN-specific technical architecture overview", dataSource: "RMN playbook + clean room integration docs", confidence: 93 }, { moduleId: 1, moduleName: "Market Intelligence", subModule: "MMP & Measurement Monitoring", action: "Retrieved clean room integration specs and match rate benchmarks", dataSource: "Technical partnership database", confidence: 90 }] },
    { role: "buyer", phase: "Technical Architecture", text: "Yes, let's go deep on the white-label architecture. Our CTO will need to understand the data flow, latency, and where our data lives vs. yours. Also, how does this compare to what Amazon offers? They're our benchmark for everything.", traces: [] },
    { role: "seller", phase: "Technical Architecture", text: "Here's the data flow architecture:\n\n**Layer 1 — Data Ingestion:**\nYour shopper data (hashed emails, purchase history, loyalty segments) flows into a shared clean room (we recommend Snowflake or AWS). Moloco's device graph data sits in the same clean room. Matching happens inside the clean room — your raw data never leaves your environment. Match output: anonymized household IDs with CTV device mappings.\n\n**Layer 2 — Campaign Execution:**\nYour advertisers create campaigns through the ShopStream-branded UI. They select audience segments (e.g., 'Households that bought competitor brand in last 90 days'), set budgets, upload creative. Moloco's ML engine receives the anonymized audience segments and optimizes bid decisions in real-time across 150+ CTV supply partners.\n\n**Layer 3 — Measurement & Attribution:**\nPost-campaign, we feed exposure data back into the clean room. Your transaction data matches against exposed households. You generate the attribution report inside your environment and surface it through the ShopStream UI. Moloco never sees your raw transaction data.\n\n**Latency:** Audience segment sync: daily batch or real-time via API. Bid decisions: <100ms. Attribution: online purchases within 24hrs, in-store within 7 days (dependent on your loyalty data refresh cycle).\n\n**vs. Amazon:** Amazon DSP's off-site CTV is limited to Amazon's own device graph (Fire TV + Ring + Echo). Moloco accesses the broader CTV ecosystem — Roku, Samsung, LG, Vizio, plus all FAST channels. Amazon's advantage is their purchase data depth; your advantage with Moloco is that you're using YOUR purchase data, which is more relevant for your advertisers than Amazon's generic purchase signals.", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Pitch Narrative Construction", action: "Generated detailed white-label architecture diagram and data flow", dataSource: "RMN technical architecture docs", confidence: 95 }, { moduleId: 1, moduleName: "Market Intelligence", subModule: "Competitive Landscape Monitoring", action: "Retrieved Amazon DSP CTV capabilities for competitive comparison", dataSource: "Competitive intelligence database", confidence: 92 }] },
    { role: "buyer", phase: "Data Governance", text: "The clean room architecture addresses our CTO's concerns about data leakage. But our legal team will want to understand the data governance framework. Who owns the matched audience data? What happens if we terminate the partnership? And how do you handle CCPA/state privacy compliance?", traces: [] },
    { role: "seller", phase: "Data Governance", text: "Data governance is non-negotiable for RMN partnerships. Here's our framework:\n\n**Data ownership:** Your first-party data remains 100% yours. The matched audience segments in the clean room are jointly controlled — you control access and can revoke at any time. Moloco's device graph data remains ours. Upon termination, all matched segments are deleted within 30 days, and we provide a certification of deletion.\n\n**CCPA/Privacy:** We maintain a comprehensive privacy framework that covers CCPA, CPRA, and all current state privacy laws. Specifically:\n- All audience matching uses hashed identifiers (SHA-256)\n- We support consumer opt-out signals via IAB's US Privacy String\n- Our clean room architecture means your PII never enters Moloco's systems\n- We undergo annual SOC 2 Type II audits\n- We'll sign a Data Processing Agreement (DPA) that specifies data handling obligations\n\n**Contractual protections:** Our RMN partnership agreement includes:\n- Data use restrictions (your data can only be used for your campaigns)\n- No commingling with other clients' data\n- Audit rights — your team can audit our data handling practices annually\n- Breach notification within 24 hours\n\nI can connect your legal team with our privacy counsel to work through the DPA details. We've completed this process with two other retail media networks, so we have templates ready.", traces: [{ moduleId: 1, moduleName: "Market Intelligence", subModule: "Competitive Landscape Monitoring", action: "Retrieved data governance framework and privacy compliance documentation", dataSource: "Legal/compliance database", confidence: 97 }, { moduleId: 3, moduleName: "Customer Success", subModule: "Onboarding & Activation Playbooks", action: "Prepared RMN legal/compliance onboarding checklist", dataSource: "RMN partnership templates", confidence: 91 }] },
    { role: "buyer", phase: "Pilot Design", text: "This is thorough. Let me shift to the practical side. If we move forward, what does a pilot look like? We'd want to start with 5 advertisers — 2 CPG, 2 electronics, 1 auto. Total budget around $500K over 3 months.", traces: [] },
    { role: "seller", phase: "Pilot Design", text: "Here's the pilot structure I'd recommend:\n\n**Month 1 — Foundation:**\n- Week 1-2: Clean room setup and data integration. Your engineering team + our integration team. Typically 40-60 hours of engineering effort on your side\n- Week 3-4: Audience segment creation and validation. We build 10-15 segments per advertiser (e.g., 'lapsed buyers', 'competitor brand buyers', 'high-value shoppers'). Validate match rates and segment sizes\n\n**Month 2 — Launch:**\n- Week 5: Soft launch with 2 advertisers (1 CPG, 1 electronics) at 50% budget\n- Week 6-7: Expand to all 5 advertisers at full budget\n- Week 8: First performance review — delivery metrics, match rates, early attribution signals\n\n**Month 3 — Optimization & Measurement:**\n- Weeks 9-10: ML optimization based on early conversion data\n- Week 11: Mid-pilot review with full attribution data\n- Week 12: Final analysis, ROI report, scale recommendation\n\n**Budget allocation:** $500K across 5 advertisers = $100K each. I'd recommend 60/40 split between CPG and electronics, since CPG typically has higher purchase frequency and faster attribution cycles.\n\n**Success criteria:**\n1. Data: Match rate >65%, segment accuracy >90%\n2. Performance: Incremental purchase lift >5% for exposed vs. control households\n3. Advertiser satisfaction: NPS >7 from pilot advertisers\n4. Operational: Campaign setup <2 hours, reporting latency <48 hours\n\nIf the pilot hits these bars, we move to a full partnership with white-label buildout in Q3.", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Test Design & Execution", action: "Generated RMN pilot structure with 5-advertiser design", dataSource: "RMN pilot templates + resource planning", confidence: 94 }, { moduleId: 4, moduleName: "Executive Governance", subModule: "Revenue Pacing & ARR Tracking", action: "Flagged ShopStream as potential $5M+ ARR strategic account", dataSource: "Pipeline projection model", confidence: 80 }] },
    { role: "buyer", phase: "Close", text: "This is exactly the level of detail I needed. I'll take this to our CTO and VP Advertiser Sales this week. The clean room architecture and data governance framework will satisfy our CTO. The advertiser ROI story will satisfy our VP Sales. Can you put this into a formal proposal document?", traces: [] },
    { role: "seller", phase: "Close", text: "I'll have a comprehensive proposal to you by Friday. It'll include:\n\n1. **Executive summary** for your leadership team\n2. **Technical architecture document** with data flow diagrams for your CTO\n3. **Advertiser ROI model** with scenario analysis for your VP Sales\n4. **Pilot timeline and budget** with resource requirements on both sides\n5. **Data governance framework** and draft DPA for your legal team\n6. **Competitive comparison** — Moloco vs. Amazon DSP vs. TTD for RMN use cases\n\nI'd also like to propose a technical deep-dive session with your CTO and engineering lead. We can walk through the clean room integration in detail and answer any architecture questions. Our solutions architect who built the integration for our other RMN partners would join.\n\nThis is a strategic partnership, not just a vendor relationship. If ShopStream's CTV offering succeeds, it's a proof point for our entire RMN strategy. We're invested in making this work.", traces: [{ moduleId: 2, moduleName: "Pipeline & Activation", subModule: "Outbound Sequencing & Personalization", action: "Generated comprehensive RMN proposal package outline", dataSource: "RMN collateral library", confidence: 95 }, { moduleId: 4, moduleName: "Executive Governance", subModule: "Exec Communications", action: "Prepared multi-stakeholder proposal for RMN strategic deal", dataSource: "Strategic deal templates", confidence: 90 }, { moduleId: 3, moduleName: "Customer Success", subModule: "Onboarding & Activation Playbooks", action: "Scheduled technical deep-dive with solutions architect", dataSource: "Resource calendar", confidence: 88 }] },
  ];
}

const SCRIPTS: Record<string, () => ScriptTurn[]> = {
  "gaming-vp": getGamingScript,
  "dtc-cmo": getDtcScript,
  "agency-dir": getAgencyScript,
  "retail-svp": getRetailScript,
};

// ── Helpers ────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 10); }

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const moduleColors: Record<number, string> = {
  1: "text-blue-600 bg-blue-50 border-blue-200",
  2: "text-emerald-600 bg-emerald-50 border-emerald-200",
  3: "text-amber-600 bg-amber-50 border-amber-200",
  4: "text-violet-600 bg-violet-50 border-violet-200",
};

const moduleIcons: Record<number, typeof Radar> = {
  1: Radar,
  2: Target,
  3: Shield,
  4: BarChart3,
};

// ── Component ──────────────────────────────────────────────────────────

export default function BuyerSim() {
  const { runAgent } = useAgent();
  const [persona, setPersona] = useState<string | null>(null);
  const [messages, setMessages] = useState<SimMessage[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [showSelect, setShowSelect] = useState(true);
  const [showTraces, setShowTraces] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [totalAgentsActivated, setTotalAgentsActivated] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef(false);

  useEffect(() => { autoPlayRef.current = autoPlay; }, [autoPlay]);
  useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [messages]);

  const script = useMemo(() => persona ? SCRIPTS[persona]?.() || [] : [], [persona]);

  const start = (id: string) => {
    setPersona(id);
    setCurrentTurn(0);
    setTotalAgentsActivated(0);
    setMessages([{
      id: genId(), role: "system",
      text: `Simulation initialized. You are ${PERSONAS.find(p => p.id === id)?.name}, ${PERSONAS.find(p => p.id === id)?.title} at ${PERSONAS.find(p => p.id === id)?.company}. The Moloco CTV sales team is about to pitch you. Watch how every agent in the operating model activates to support this deal.`,
      timestamp: new Date(),
    }]);
    setShowSelect(false);
    runAgent(900, `Buyer simulation: ${id}`, 1, `buyer-sim-${id}`);
    // Auto-advance first turn
    setTimeout(() => advanceTurn(SCRIPTS[id]?.() || [], 0), 800);
  };

  const advanceTurn = (s: ScriptTurn[], turnIdx: number) => {
    if (turnIdx >= s.length) return;
    const turn = s[turnIdx];
    setThinking(true);

    const delay = turn.role === "seller" ? 1200 + Math.random() * 800 : 600 + Math.random() * 400;
    setTimeout(() => {
      const msg: SimMessage = {
        id: genId(),
        role: turn.role,
        text: turn.text,
        timestamp: new Date(),
        traces: turn.traces,
        turnNumber: turnIdx + 1,
        phase: turn.phase,
      };
      setMessages(prev => [...prev, msg]);
      setCurrentTurn(turnIdx + 1);
      setTotalAgentsActivated(prev => prev + (turn.traces?.length || 0));
      setThinking(false);

      // Fire agent runs for each trace
      turn.traces?.forEach((t, i) => {
        setTimeout(() => {
          runAgent(900 + turnIdx * 10 + i, t.action.slice(0, 60), t.moduleId, t.subModule);
        }, i * 200);
      });

      // Auto-advance if autoplay is on
      if (autoPlayRef.current && turnIdx + 1 < s.length) {
        const nextDelay = 2500 + Math.random() * 1500;
        setTimeout(() => advanceTurn(s, turnIdx + 1), nextDelay);
      }
    }, delay);
  };

  const nextTurn = () => {
    if (currentTurn < script.length && !thinking) {
      advanceTurn(script, currentTurn);
    }
  };

  const toggleAutoPlay = () => {
    const newVal = !autoPlay;
    setAutoPlay(newVal);
    if (newVal && currentTurn < script.length && !thinking) {
      advanceTurn(script, currentTurn);
    }
  };

  const reset = () => {
    setPersona(null);
    setMessages([]);
    setCurrentTurn(0);
    setShowSelect(true);
    setAutoPlay(false);
    setTotalAgentsActivated(0);
  };

  const p = PERSONAS.find(x => x.id === persona);
  const progress = script.length > 0 ? Math.round((currentTurn / script.length) * 100) : 0;
  const currentPhase = currentTurn > 0 && currentTurn <= script.length ? script[currentTurn - 1]?.phase : "—";

  return (
    <NeuralShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-200/50 flex items-center justify-center">
                <MessageSquare className="w-4.5 h-4.5 text-violet-600" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Buyer Simulation</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">Experience the full Moloco CTV pitch from the buyer's side. Watch every agent activate in real-time.</p>
          </div>
          {!showSelect && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTraces(!showTraces)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showTraces ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-white border-gray-200 text-gray-500 hover:text-gray-700"}`}>
                <Brain className="w-3 h-3 inline mr-1" /> Agent Traces
              </button>
              <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          )}
        </div>

        {showSelect ? (
          /* ── Persona Selection ─────────────────────────────────── */
          <div className="space-y-5">
            <div className="glass-card rounded-xl p-5">
              <div className="text-sm font-medium text-foreground mb-1">Choose Your Buyer Persona</div>
              <p className="text-xs text-muted-foreground">Each simulation runs a 20+ turn deep technical CTV sales conversation. Every turn shows which agents activate, what data they pull, and how the operating model supports the deal.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {PERSONAS.map(per => (
                <motion.button
                  key={per.id}
                  onClick={() => start(per.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={spring}
                  className="glass-card rounded-xl p-5 text-left hover:shadow-lg hover:border-violet-200/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200/50 flex items-center justify-center">
                        <User className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{per.name}</div>
                        <div className="text-xs text-muted-foreground">{per.title}, {per.company}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${per.dealComplexity === "extreme" ? "bg-rose-50 text-rose-600 border border-rose-200" : per.dealComplexity === "very-high" ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-blue-50 text-blue-600 border border-blue-200"}`}>
                      {per.dealComplexity} complexity
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                    <div><span className="text-muted-foreground">Vertical</span><div className="font-medium text-foreground mt-0.5">{per.vertical}</div></div>
                    <div><span className="text-muted-foreground">Budget</span><div className="font-medium text-foreground mt-0.5">{per.budget}</div></div>
                    <div><span className="text-muted-foreground">Current Stack</span><div className="font-medium text-foreground mt-0.5">{per.currentStack}</div></div>
                    <div><span className="text-muted-foreground">Timeline</span><div className="font-medium text-foreground mt-0.5">{per.timeline}</div></div>
                  </div>

                  <div className="mb-3">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">KPIs</div>
                    <div className="flex flex-wrap gap-1">{per.kpis.map((k, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/50">{k}</span>)}</div>
                  </div>

                  <div className="mb-3">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">LIKELY OBJECTIONS</div>
                    <div className="flex flex-wrap gap-1">{per.objections.map((o, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/50">{o}</span>)}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">STAKEHOLDERS</div>
                    <div className="flex flex-wrap gap-1">{per.stakeholders.map((s, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 border border-gray-200/50">{s}</span>)}</div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{SCRIPTS[per.id]?.().length || 0} turns · Deep technical conversation</span>
                    <ChevronRight className="w-4 h-4 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Active Simulation ─────────────────────────────────── */
          <div className="flex gap-4" style={{ height: "calc(100vh - 200px)" }}>
            {/* Main conversation */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Persona + progress bar */}
              {p && (
                <div className="glass-card rounded-t-xl border-b-0 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200/50 flex items-center justify-center">
                        <User className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.title}, {p.company}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">Phase: <span className="font-medium text-foreground">{currentPhase}</span></span>
                      <span className="text-muted-foreground">Turn {currentTurn}/{script.length}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                  </div>
                </div>
              )}

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto glass-card rounded-none border-t-0 border-b-0 p-4 space-y-4">
                <AnimatePresence>
                  {messages.map(m => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
                      {m.role === "system" ? (
                        <div className="text-center py-2">
                          <span className="text-xs text-muted-foreground bg-gray-50 px-3 py-1 rounded-full border border-gray-100">{m.text}</span>
                        </div>
                      ) : (
                        <div className={`flex gap-3 ${m.role === "buyer" ? "flex-row-reverse" : ""}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "buyer" ? "bg-violet-100 border border-violet-200" : "bg-blue-100 border border-blue-200"}`}>
                            {m.role === "buyer" ? <User className="w-4 h-4 text-violet-600" /> : <Bot className="w-4 h-4 text-blue-600" />}
                          </div>
                          <div className={`max-w-[80%] space-y-2`}>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="font-medium">{m.role === "buyer" ? p?.name : "Moloco Seller"}</span>
                              {m.phase && <span className="px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100">{m.phase}</span>}
                              {m.turnNumber && <span>Turn {m.turnNumber}</span>}
                            </div>
                            <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${m.role === "buyer" ? "bg-violet-50 border border-violet-100 text-foreground" : "bg-white border border-gray-200 text-foreground/90 shadow-sm"}`}>
                              {m.text.split("\n\n").map((para, i) => (
                                <p key={i} className={i > 0 ? "mt-3" : ""}>{para.split("\n").map((line, j) => (
                                  <span key={j}>{j > 0 && <br />}{line.startsWith("**") ? <strong>{line.replace(/\*\*/g, "")}</strong> : line.startsWith("- ") ? <span className="block ml-3">{line}</span> : line}</span>
                                ))}</p>
                              ))}
                            </div>
                            {/* Agent traces inline */}
                            {showTraces && m.traces && m.traces.length > 0 && (
                              <div className="ml-1 space-y-1">
                                {m.traces.map((t, i) => {
                                  const Icon = moduleIcons[t.moduleId] || Zap;
                                  const colors = moduleColors[t.moduleId] || "text-gray-600 bg-gray-50 border-gray-200";
                                  return (
                                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-[11px] ${colors}`}>
                                      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                      <div className="min-w-0">
                                        <div className="font-medium">M{t.moduleId}: {t.subModule}</div>
                                        <div className="opacity-75 mt-0.5">{t.action}</div>
                                        <div className="flex items-center gap-2 mt-1 opacity-60">
                                          <span>Source: {t.dataSource}</span>
                                          <span>·</span>
                                          <span>Confidence: {t.confidence}%</span>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {thinking && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                      <span className="inline-flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="glass-card rounded-b-xl rounded-t-none border-t-0 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={nextTurn}
                      disabled={thinking || currentTurn >= script.length}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium hover:from-violet-600 hover:to-purple-700 transition-all disabled:opacity-40 shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                      {currentTurn >= script.length ? "Simulation Complete" : "Next Turn"}
                    </button>
                    <button
                      onClick={toggleAutoPlay}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${autoPlay ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-gray-200 text-gray-600 hover:text-gray-800"}`}
                    >
                      <Activity className={`w-3.5 h-3.5 ${autoPlay ? "animate-pulse" : ""}`} />
                      {autoPlay ? "Auto-Playing..." : "Auto-Play"}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> {totalAgentsActivated} agents activated</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {currentTurn}/{script.length} turns</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar — Deal Intelligence */}
            {showTraces && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-72 shrink-0 glass-card rounded-xl overflow-y-auto">
                <div className="p-4 border-b border-gray-100">
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wider">Deal Intelligence</div>
                </div>
                <div className="p-4 space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Conversation Progress</div>
                    <div className="space-y-1.5">
                      {["Discovery", "ML Architecture", "Incrementality", "Competitive", "Brand Safety", "Creative Optimization", "Deal Structure", "Onboarding", "Stakeholder Alignment", "Close", "Education", "Measurement", "Platform Capabilities", "Pricing", "Pilot Design", "Technical Architecture", "Data Governance", "Creative"].filter((phase, i, arr) => {
                        // Only show phases relevant to current script
                        return script.some(t => t.phase === phase);
                      }).map(phase => {
                        const turnsInPhase = script.filter(t => t.phase === phase);
                        const completedInPhase = turnsInPhase.filter((_, i) => {
                          const globalIdx = script.indexOf(turnsInPhase[0]);
                          return globalIdx + i < currentTurn;
                        });
                        const isActive = currentTurn > 0 && currentTurn <= script.length && script[currentTurn - 1]?.phase === phase;
                        const isDone = completedInPhase.length === turnsInPhase.length && turnsInPhase.length > 0;
                        return (
                          <div key={phase} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${isActive ? "bg-violet-50 border border-violet-100" : ""}`}>
                            {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> : isActive ? <Activity className="w-3 h-3 text-violet-500 animate-pulse shrink-0" /> : <div className="w-3 h-3 rounded-full border border-gray-200 shrink-0" />}
                            <span className={isDone ? "text-emerald-700" : isActive ? "text-violet-700 font-medium" : "text-muted-foreground"}>{phase}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">{completedInPhase.length}/{turnsInPhase.length}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Module activation heatmap */}
                  <div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Module Activations</div>
                    <div className="space-y-1.5">
                      {[1, 2, 3, 4].map(modId => {
                        const allTraces = messages.flatMap(m => m.traces || []);
                        const modTraces = allTraces.filter(t => t.moduleId === modId);
                        const Icon = moduleIcons[modId] || Zap;
                        const names = ["", "Market Intelligence", "Pipeline & Activation", "Customer Success", "Executive Governance"];
                        return (
                          <div key={modId} className="flex items-center gap-2 text-xs">
                            <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-muted-foreground truncate flex-1">{names[modId]}</span>
                            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${modTraces.length > 0 ? "bg-violet-50 text-violet-700" : "bg-gray-50 text-gray-400"}`}>{modTraces.length}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Key metrics */}
                  {p && (
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deal Profile</div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-medium">{p.budget}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Complexity</span><span className={`font-medium ${p.dealComplexity === "extreme" ? "text-rose-600" : p.dealComplexity === "very-high" ? "text-amber-600" : "text-blue-600"}`}>{p.dealComplexity}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Stakeholders</span><span className="font-medium">{p.stakeholders.length}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Timeline</span><span className="font-medium text-[10px]">{p.timeline}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Completion badge */}
                  {currentTurn >= script.length && script.length > 0 && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-lg p-3 text-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <div className="text-xs font-semibold text-emerald-700">Simulation Complete</div>
                      <div className="text-[10px] text-emerald-600 mt-0.5">{totalAgentsActivated} agents activated across {script.length} turns</div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </NeuralShell>
  );
}
