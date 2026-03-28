// ============================================================================
// AI-First CTV Commercial Operating Model — Complete Data Model
// Source: CTV operating model doc (Mar 9, 2026) + 200 agent prompts
// Every sub-module, ownership type, cluster rationale, and prompt captured.
// ============================================================================

export type OwnerType = "agent" | "agent-human" | "human-led";

export type AgentType = "persistent" | "triggered" | "orchestrator";

export type PromptStatus = "active" | "pending" | "blocked" | "complete";

export interface Prompt {
  id: number;
  text: string;
  agentType: AgentType;
  status: PromptStatus;
  moduleId: number;
  sectionKey: string;
}

export interface SubModule {
  name: string;
  owner: OwnerType;
  description: string;
  prompts: number[]; // prompt IDs
}

export interface Section {
  key: string;
  name: string;
  description: string;
  subModules: SubModule[];
}

export interface Module {
  id: number;
  name: string;
  shortName: string;
  description: string;
  sections: Section[];
  clusterId: number;
  clusterIds?: number[];
}

export interface Cluster {
  id: number;
  name: string;
  shortName: string;
  primaryModuleCoverage: string;
  whyCluster: string;
  humanRole: string;
  moduleIds: number[];
  twoModes?: { app: string; web: string };
}

// ============================================================================
// CLUSTERS — 5 Human Orchestrator Clusters
// ============================================================================

export const clusters: Cluster[] = [
  {
    id: 1,
    name: "Market Intelligence & Positioning",
    shortName: "Market Intel",
    primaryModuleCoverage: "Module 1 (all sub-modules)",
    whyCluster:
      "Every agent here produces a different lens on the same fundamental question: what does the market want, and how should Moloco tell its story? Positioning is not a single-input decision. You can't set positioning by only watching competitors — you need to know what analysts are saying, what partners are building, what customers are actually telling you in sales conversations, and how the broader industry narrative is shifting.",
    humanRole:
      "The human sitting on this cluster is the one who holds the complete picture of the outside world mapped against Moloco's capabilities. When the competitor agent surfaces that tvScientific just launched a new feature, and the win-loss agent shows that two prospects just cited that feature as a reason they chose tvScientific, and the analyst tracking agent shows that eMarketer just published a report emphasizing that capability — it's the same human who connects those three signals and says 'we have a positioning problem here, and here's how we respond.' Without one brain across all of these, the signals stay siloed and the positioning lags.",
    moduleIds: [1],
  },
  {
    id: 2,
    name: "Growth & Demand Generation",
    shortName: "Growth & Demand",
    primaryModuleCoverage:
      "Module 2 demand machine (ICP Intelligence, Outbounding, Digital Awareness, Content Engine, Website, Effectiveness Analysis)",
    whyCluster:
      "These agents are all executing against the positioning that Cluster 1 sets — but the learning loops between them are interconnected in ways agents can't see alone. When outbound to fintech CTV buyers gets 5% response but digital awareness for the same segment gets zero, the human asks: is the ICP wrong, the message wrong for this channel, or the channel wrong for this segment?",
    humanRole:
      "The human orchestrator connects the learning loops across ICP intelligence, outbounding, digital awareness, and content to identify systemic issues vs local optimization failures.",
    moduleIds: [2],
  },
  {
    id: 3,
    name: "Commercial Sales & Partnerships",
    shortName: "Sales & Partnerships",
    primaryModuleCoverage:
      "Module 2 sales & partnership sub-modules (Pitch & Sales Engagement, Partnership & Channel Activation, Event Activation, Test Funding)",
    whyCluster:
      "The value here is created in human-to-human moments: pitching, building partner trust, interviewing for case studies, being present at events. The person who pitches a CTV-to-Web prospect at a conference walks across the room to talk to an MMP partner about a co-marketing webinar, then follows up with an App customer about a case study. They are Moloco CTV's face in the market.",
    humanRole:
      "This person IS the commercial interface. Agents make it possible for one person to run both motions — conversation intelligence means every call feeds the system, follow-up agents eliminate post-meeting busywork, and the sales coaching agent helps the AMER sellers improve without this person manually reviewing every call.",
    moduleIds: [2],
    twoModes: {
      app: "CTV-to-App: Dotted-line resource to the existing AMER MA sales team — supporting them, upleveling their CTV selling capabilities, managing the CTV-specific complexity the generalist sellers can't handle alone.",
      web: "CTV-to-Web: This person IS the entire commercial human interface. They run the full pitch, close, and follow-up motion because there is no existing team for Web.",
    },
  },
  {
    id: 4,
    name: "Customer Success & Commercial Delivery",
    shortName: "Customer Success",
    primaryModuleCoverage: "Module 3 (all sub-modules)",
    whyCluster:
      "Customer success at this stage of the business is inseparable from product learning. When the monitoring agent flags a performance issue and the cross-account agent shows the same pattern across three customers in the same vertical, and sentiment is declining — the human connects those dots: this is a product issue, not a campaign issue, and it needs to go to engineering with specific evidence and the customer needs to hear from us proactively.",
    humanRole:
      "The same human feeds patterns into customer advisory board conversations, generating product hypotheses that get validated back through the pipeline. They hold the full picture of how every customer is doing and what the product's real strengths and weaknesses are based on live evidence. This cluster partners closely with GDS / Data Science (dotted line from the Product & Engineering org) for measurement credibility and performance debugging.",
    moduleIds: [3],
  },
  {
    id: 5,
    name: "DRI // XFN Management",
    shortName: "DRI / XFN",
    primaryModuleCoverage: "Module 4 (all sub-modules)",
    whyCluster:
      "With strong system design and use of agentic reporting, the DRI can synthesize upward from all clusters to set the strategic direction, enable the XFN teams to work together, and provide accountability for a matrixed organization.",
    humanRole:
      "The DRI sits on top of the entire operation, providing synthesis, visibility, and accountability that makes the system legible to leadership and enables go/no-go investment decisions at EOQ2.",
    moduleIds: [4],
  },
];

// ============================================================================
// ALL 200 PROMPTS — organized by module and section
// ============================================================================

export const prompts: Prompt[] = [
  // MODULE 1 — Market Intelligence & Positioning (40 prompts)
  // Industry + Market Sensing (1-10)
  { id: 1, text: "Continuously scan top 50 CTV industry sources and extract weekly shifts in buyer priorities, tagging by vertical, budget size, and measurement sophistication.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "industry-sensing" },
  { id: 2, text: "Build a rolling 'CTV narrative map' showing how industry messaging themes evolve over time and where Moloco is misaligned.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "industry-sensing" },
  { id: 3, text: "Identify emerging categories of CTV buyers not currently targeted and generate hypotheses on their motivations.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "industry-sensing" },
  { id: 4, text: "Track macro trends (privacy, signal loss, retail media) and map implications to Moloco's positioning.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "industry-sensing" },
  { id: 5, text: "Generate a weekly 'what changed in the market' brief with implications for messaging and product gaps.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "industry-sensing" },
  { id: 6, text: "Detect contradictions between analyst reports and real buyer behavior.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "industry-sensing" },
  { id: 7, text: "Identify which industry narratives are overhyped vs underpriced opportunities.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "industry-sensing" },
  { id: 8, text: "Build a dataset of all recent CTV product launches across competitors and classify them by capability.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "industry-sensing" },
  { id: 9, text: "Surface 3 'strategic threats' and 3 'strategic opportunities' weekly based on market signals.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "industry-sensing" },
  { id: 10, text: "Detect when a competitor feature becomes table stakes.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "industry-sensing" },
  // Competitor Intelligence (11-20)
  { id: 11, text: "Maintain live battlecards for top 10 competitors with updated messaging, strengths, and weaknesses.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "competitor-intel" },
  { id: 12, text: "Compare Moloco win/loss reasons vs competitor claims.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "competitor-intel" },
  { id: 13, text: "Identify gaps where competitors are winning disproportionately.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "competitor-intel" },
  { id: 14, text: "Track hiring patterns of competitors to infer roadmap direction.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "competitor-intel" },
  { id: 15, text: "Detect pricing shifts across competitors and estimate implications.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "competitor-intel" },
  { id: 16, text: "Build a 'competitor narrative vs reality' gap analysis.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "competitor-intel" },
  { id: 17, text: "Identify which competitor features are most cited in losses.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "competitor-intel" },
  { id: 18, text: "Generate counter-positioning messaging for each competitor.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "competitor-intel" },
  { id: 19, text: "Map competitor partnerships and ecosystem strength.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "competitor-intel" },
  { id: 20, text: "Flag when a competitor narrative is gaining traction across multiple channels.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "competitor-intel" },
  // Customer Voice & Win/Loss (21-30)
  { id: 21, text: "Ingest Gong + CRM notes and extract structured win/loss drivers.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "customer-voice" },
  { id: 22, text: "Cluster objections into top 10 themes and track over time.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "customer-voice" },
  { id: 23, text: "Identify which ICP segments have the highest loss rates and why.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "customer-voice" },
  { id: 24, text: "Detect misalignment between marketing messaging and sales objections.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "customer-voice" },
  { id: 25, text: "Generate 'why we lose' narratives with supporting evidence.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "customer-voice" },
  { id: 26, text: "Surface latent needs customers express but are not explicitly buying for.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "customer-voice" },
  { id: 27, text: "Compare perceived vs actual strengths of Moloco.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "customer-voice" },
  { id: 28, text: "Identify repeated confusion points in sales conversations.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "customer-voice" },
  { id: 29, text: "Track sentiment shifts across pipeline stages.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "customer-voice" },
  { id: 30, text: "Generate recommendations for positioning changes based on win/loss.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "customer-voice" },
  // Analyst + Thought Leader Tracking (31-40)
  { id: 31, text: "Track top 100 influencers shaping CTV buying decisions.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "analyst-tracking" },
  { id: 32, text: "Identify which narratives are gaining credibility among analysts.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "analyst-tracking" },
  { id: 33, text: "Detect when Moloco is missing from key industry conversations.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "analyst-tracking" },
  { id: 34, text: "Map analyst recommendations vs Moloco capabilities.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "analyst-tracking" },
  { id: 35, text: "Generate outreach strategies to influence narrative.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "analyst-tracking" },
  { id: 36, text: "Identify misperceptions about Moloco in public discourse.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "analyst-tracking" },
  { id: 37, text: "Track agency POVs vs advertiser POVs.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "analyst-tracking" },
  { id: 38, text: "Detect shifts in how 'incrementality' is discussed.", agentType: "persistent", status: "active", moduleId: 1, sectionKey: "analyst-tracking" },
  { id: 39, text: "Identify which content pieces drive narrative change.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "analyst-tracking" },
  { id: 40, text: "Recommend strategic narrative wedges.", agentType: "triggered", status: "active", moduleId: 1, sectionKey: "analyst-tracking" },

  // MODULE 2 — Growth & Demand Generation (60 prompts)
  // ICP Intelligence (41-50)
  { id: 41, text: "Generate ICP hypotheses segmented by vertical, budget, and maturity.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "icp-intelligence" },
  { id: 42, text: "Map buying committees within target accounts.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "icp-intelligence" },
  { id: 43, text: "Identify which roles influence CTV decisions.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "icp-intelligence" },
  { id: 44, text: "Detect which ICP segments convert fastest.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "icp-intelligence" },
  { id: 45, text: "Flag ICPs with high engagement but low conversion.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "icp-intelligence" },
  { id: 46, text: "Build a scoring model for ICP prioritization.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "icp-intelligence" },
  { id: 47, text: "Identify 'hidden ICPs' based on behavioral signals.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "icp-intelligence" },
  { id: 48, text: "Map ICP pain points to product capabilities.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "icp-intelligence" },
  { id: 49, text: "Detect overfitting in ICP targeting.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "icp-intelligence" },
  { id: 50, text: "Generate next ICP experiments based on performance data.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "icp-intelligence" },
  // Outbound System (51-60)
  { id: 51, text: "Generate ICP-specific messaging variants grounded in positioning.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "outbound-system" },
  { id: 52, text: "Optimize email sequences for response likelihood.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "outbound-system" },
  { id: 53, text: "Personalize outreach using company-specific signals.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "outbound-system" },
  { id: 54, text: "Test tone variations (technical vs strategic vs ROI-driven).", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "outbound-system" },
  { id: 55, text: "Identify which messaging themes drive replies.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "outbound-system" },
  { id: 56, text: "Optimize send timing by ICP.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "outbound-system" },
  { id: 57, text: "Generate multi-channel sequences (email + LinkedIn + content).", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "outbound-system" },
  { id: 58, text: "Detect fatigue signals in outreach campaigns.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "outbound-system" },
  { id: 59, text: "Recommend new outreach angles based on performance.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "outbound-system" },
  { id: 60, text: "Build outbound learning reports after each cycle.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "outbound-system" },
  // Channel + Message Optimization (61-70)
  { id: 61, text: "Map channel effectiveness by ICP segment.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "channel-optimization" },
  { id: 62, text: "Detect when a channel underperforms relative to peers.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "channel-optimization" },
  { id: 63, text: "Optimize spend allocation across channels.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "channel-optimization" },
  { id: 64, text: "Identify channel-message mismatch issues.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "channel-optimization" },
  { id: 65, text: "Generate hypotheses for channel experiments.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "channel-optimization" },
  { id: 66, text: "Track engagement funnels per channel.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "channel-optimization" },
  { id: 67, text: "Identify drop-off points in funnel.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "channel-optimization" },
  { id: 68, text: "Compare inbound vs outbound conversion quality.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "channel-optimization" },
  { id: 69, text: "Detect diminishing returns in channels.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "channel-optimization" },
  { id: 70, text: "Recommend new channels to test.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "channel-optimization" },
  // Digital Awareness Engine (71-80)
  { id: 71, text: "Generate campaign strategies aligned to ICP segments.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "digital-awareness" },
  { id: 72, text: "Design test matrices for campaigns.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "digital-awareness" },
  { id: 73, text: "Optimize creatives based on engagement signals.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "digital-awareness" },
  { id: 74, text: "Detect which messages resonate at awareness vs consideration stages.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "digital-awareness" },
  { id: 75, text: "Build measurement frameworks for awareness impact.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "digital-awareness" },
  { id: 76, text: "Identify proxy metrics for early success.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "digital-awareness" },
  { id: 77, text: "Generate nurture sequences for engaged prospects.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "digital-awareness" },
  { id: 78, text: "Optimize retargeting strategies.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "digital-awareness" },
  { id: 79, text: "Detect when campaigns saturate audiences.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "digital-awareness" },
  { id: 80, text: "Recommend campaign pivots.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "digital-awareness" },
  // Sales Engagement Support (81-90)
  { id: 81, text: "Determine when a lead is sales-ready.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "sales-engagement" },
  { id: 82, text: "Package lead context for sellers (pain points, signals, history).", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "sales-engagement" },
  { id: 83, text: "Extract insights from sales calls.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "sales-engagement" },
  { id: 84, text: "Generate follow-up materials tailored to each prospect.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "sales-engagement" },
  { id: 85, text: "Provide coaching insights from call transcripts.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "sales-engagement" },
  { id: 86, text: "Identify objection patterns by seller.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "sales-engagement" },
  { id: 87, text: "Recommend next best action for each opportunity.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "sales-engagement" },
  { id: 88, text: "Detect deal risk signals early.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "sales-engagement" },
  { id: 89, text: "Generate pitch decks tailored to ICP + use case.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "sales-engagement" },
  { id: 90, text: "Optimize sales narratives based on win patterns.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "sales-engagement" },
  // Partnerships + Ecosystem (91-100)
  { id: 91, text: "Identify high-value partners (MMPs, measurement, platforms).", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "partnerships" },
  { id: 92, text: "Map partnership opportunities by strategic value.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "partnerships" },
  { id: 93, text: "Generate co-marketing proposals.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "partnerships" },
  { id: 94, text: "Track partner engagement and pipeline contribution.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "partnerships" },
  { id: 95, text: "Identify underutilized partnerships.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "partnerships" },
  { id: 96, text: "Recommend joint campaigns.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "partnerships" },
  { id: 97, text: "Detect partner overlap/conflicts.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "partnerships" },
  { id: 98, text: "Optimize partner messaging alignment.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "partnerships" },
  { id: 99, text: "Generate warm intro requests.", agentType: "triggered", status: "active", moduleId: 2, sectionKey: "partnerships" },
  { id: 100, text: "Track partner ROI.", agentType: "persistent", status: "active", moduleId: 2, sectionKey: "partnerships" },

  // MODULE 3 — Customer Success & Delivery (60 prompts)
  // Onboarding & Setup (101-110)
  { id: 101, text: "Generate onboarding checklists for each customer type.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "onboarding" },
  { id: 102, text: "Validate measurement setup completeness.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "onboarding" },
  { id: 103, text: "Map customer KPIs to campaign metrics.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "onboarding" },
  { id: 104, text: "Identify risks in onboarding process.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "onboarding" },
  { id: 105, text: "Generate customer education materials.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "onboarding" },
  { id: 106, text: "Detect gaps in customer understanding.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "onboarding" },
  { id: 107, text: "Standardize onboarding data capture.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "onboarding" },
  { id: 108, text: "Optimize onboarding timelines.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "onboarding" },
  { id: 109, text: "Flag onboarding friction points.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "onboarding" },
  { id: 110, text: "Recommend onboarding improvements.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "onboarding" },
  // Campaign Monitoring (111-120)
  { id: 111, text: "Monitor campaign performance 24/7 for anomalies.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "campaign-monitoring" },
  { id: 112, text: "Detect performance drops and root causes.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "campaign-monitoring" },
  { id: 113, text: "Compare performance vs benchmarks.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "campaign-monitoring" },
  { id: 114, text: "Identify optimization opportunities.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "campaign-monitoring" },
  { id: 115, text: "Generate recommended actions.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "campaign-monitoring" },
  { id: 116, text: "Detect cross-account performance patterns.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "campaign-monitoring" },
  { id: 117, text: "Flag underperforming segments.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "campaign-monitoring" },
  { id: 118, text: "Optimize budget allocation.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "campaign-monitoring" },
  { id: 119, text: "Track pacing vs goals.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "campaign-monitoring" },
  { id: 120, text: "Predict future performance.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "campaign-monitoring" },
  // Customer Communication (121-130)
  { id: 121, text: "Generate weekly reports with insights.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "customer-comms" },
  { id: 122, text: "Tailor reporting to customer priorities.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "customer-comms" },
  { id: 123, text: "Identify key narrative for each account.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "customer-comms" },
  { id: 124, text: "Detect sentiment shifts.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "customer-comms" },
  { id: 125, text: "Generate proactive communication triggers.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "customer-comms" },
  { id: 126, text: "Optimize customer touchpoint cadence.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "customer-comms" },
  { id: 127, text: "Identify disengaged customers.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "customer-comms" },
  { id: 128, text: "Recommend re-engagement strategies.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "customer-comms" },
  { id: 129, text: "Generate executive summaries.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "customer-comms" },
  { id: 130, text: "Highlight key wins and risks.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "customer-comms" },
  // Performance Readouts & Scaling (131-140)
  { id: 131, text: "Generate 4-week performance reports.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "performance-scaling" },
  { id: 132, text: "Build scale pitch decks.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "performance-scaling" },
  { id: 133, text: "Identify expansion opportunities.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "performance-scaling" },
  { id: 134, text: "Estimate incremental impact.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "performance-scaling" },
  { id: 135, text: "Generate business cases for budget increases.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "performance-scaling" },
  { id: 136, text: "Identify upsell signals.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "performance-scaling" },
  { id: 137, text: "Detect readiness for scaling.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "performance-scaling" },
  { id: 138, text: "Compare performance vs competitors.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "performance-scaling" },
  { id: 139, text: "Optimize scale strategy.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "performance-scaling" },
  { id: 140, text: "Support negotiation with data.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "performance-scaling" },
  // Churn Prevention (141-150)
  { id: 141, text: "Monitor leading churn indicators.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "churn-prevention" },
  { id: 142, text: "Detect declining engagement.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "churn-prevention" },
  { id: 143, text: "Identify at-risk accounts early.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "churn-prevention" },
  { id: 144, text: "Generate intervention plans.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "churn-prevention" },
  { id: 145, text: "Recommend escalation strategies.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "churn-prevention" },
  { id: 146, text: "Track recovery success rates.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "churn-prevention" },
  { id: 147, text: "Identify churn patterns by segment.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "churn-prevention" },
  { id: 148, text: "Optimize retention strategies.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "churn-prevention" },
  { id: 149, text: "Predict churn probability.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "churn-prevention" },
  { id: 150, text: "Recommend proactive actions.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "churn-prevention" },
  // Cross-Account Intelligence (151-160)
  { id: 151, text: "Identify patterns across accounts.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "cross-account" },
  { id: 152, text: "Build competitive performance database.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "cross-account" },
  { id: 153, text: "Compare vertical performance trends.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "cross-account" },
  { id: 154, text: "Detect repeatable winning strategies.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "cross-account" },
  { id: 155, text: "Identify failing patterns.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "cross-account" },
  { id: 156, text: "Generate evidence-backed insights.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "cross-account" },
  { id: 157, text: "Recommend product improvements.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "cross-account" },
  { id: 158, text: "Track long-term customer value.", agentType: "persistent", status: "active", moduleId: 3, sectionKey: "cross-account" },
  { id: 159, text: "Identify expansion pathways.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "cross-account" },
  { id: 160, text: "Build learning synthesis reports.", agentType: "triggered", status: "active", moduleId: 3, sectionKey: "cross-account" },

  // MODULE 4 — Governance & BI (20 prompts)
  { id: 161, text: "Build a global pipeline dashboard.", agentType: "persistent", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 162, text: "Track conversion rates by stage.", agentType: "persistent", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 163, text: "Identify funnel bottlenecks.", agentType: "persistent", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 164, text: "Forecast revenue vs targets.", agentType: "triggered", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 165, text: "Track ARR pacing.", agentType: "persistent", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 166, text: "Monitor test fund usage.", agentType: "persistent", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 167, text: "Identify resource allocation inefficiencies.", agentType: "triggered", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 168, text: "Generate weekly executive reports.", agentType: "triggered", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 169, text: "Map learnings to strategic goals.", agentType: "triggered", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 170, text: "Track OKR progress.", agentType: "persistent", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 171, text: "Identify cross-functional blockers.", agentType: "persistent", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 172, text: "Recommend escalation actions.", agentType: "triggered", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 173, text: "Generate XFN meeting agendas.", agentType: "triggered", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 174, text: "Summarize key decisions needed.", agentType: "triggered", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 175, text: "Track dependencies across teams.", agentType: "persistent", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 176, text: "Generate executive communication drafts.", agentType: "triggered", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 177, text: "Identify risks to quarterly goals.", agentType: "persistent", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 178, text: "Recommend strategic pivots.", agentType: "triggered", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 179, text: "Track system-level performance.", agentType: "persistent", status: "active", moduleId: 4, sectionKey: "governance" },
  { id: 180, text: "Generate 'state of the business' summaries.", agentType: "triggered", status: "active", moduleId: 4, sectionKey: "governance" },

  // HUMAN ORCHESTRATION LAYER (20 prompts)
  { id: 181, text: "Synthesize signals across all modules into a unified narrative.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 182, text: "Identify contradictions between modules (e.g., demand vs sales).", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 183, text: "Connect competitor signals to win/loss data.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 184, text: "Detect when positioning is misaligned with reality.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 185, text: "Prioritize top 3 strategic actions weekly.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 186, text: "Identify systemic vs local issues.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 187, text: "Translate insights into executive decisions.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 188, text: "Recommend where human intervention is required.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 189, text: "Detect when agents are optimizing locally but hurting globally.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 190, text: "Generate 'what matters most' summaries.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 191, text: "Identify missing data needed for decisions.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 192, text: "Connect customer signals to product roadmap gaps.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 193, text: "Detect when learning loops are broken.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 194, text: "Recommend cross-module experiments.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 195, text: "Align messaging, ICP, and sales narratives.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 196, text: "Generate strategic hypotheses.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 197, text: "Evaluate strength of conviction in learnings.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 198, text: "Identify where to double down vs pivot.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 199, text: "Translate insights into GTM strategy.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
  { id: 200, text: "Continuously refine the operating model itself.", agentType: "orchestrator", status: "active", moduleId: 0, sectionKey: "orchestration" },
];

// ============================================================================
// MODULES — 4 Work Modules + Module 0 (Orchestration)
// ============================================================================

export const modules: Module[] = [
  {
    id: 1,
    name: "Market Intelligence & Positioning Engine",
    shortName: "Market Intel",
    description:
      "The intelligence backbone of the CTV commercial operation. Its job is to continuously understand the outside world, map it against Moloco's product capabilities and roadmap, and produce messaging that wins in the market.",
    clusterId: 1,
    sections: [
      {
        key: "industry-sensing",
        name: "Industry Landscape Monitoring",
        description: "Continuously scans publications, trade press, earnings calls for CTV market shifts.",
        subModules: [
          { name: "Industry Landscape Monitoring", owner: "agent", description: "Continuously scans publications, trade press, earnings calls for CTV market shifts.", prompts: [1, 2, 3, 4, 5] },
          { name: "Competitive Signal Detection", owner: "agent", description: "Detects when competitor features become table stakes and surfaces strategic threats and opportunities.", prompts: [8, 10] },
        ],
      },
      {
        key: "competitor-intel",
        name: "Competitor Intelligence",
        description: "Company-by-company tracking: capabilities, talent, tech quality. Generates and maintains battlecards.",
        subModules: [
          { name: "Competitor Intelligence", owner: "agent", description: "Company-by-company tracking: capabilities, talent, tech quality. Generates and maintains battlecards.", prompts: [11, 12, 13, 14, 15] },
          { name: "Counter-Positioning", owner: "agent", description: "Generate counter-positioning messaging and gap analysis for each competitor.", prompts: [16, 17, 18, 19, 20] },
        ],
      },
      {
        key: "customer-voice",
        name: "Customer Voice / Win-Loss Intelligence",
        description: "Ingests Gong transcripts, SFDC notes, GM feedback. Extracts structured insights on why deals win, lose, or stall.",
        subModules: [
          { name: "Customer Voice / Win-Loss Intelligence", owner: "agent", description: "Ingests Gong transcripts, SFDC notes, GM feedback. Extracts structured insights on why deals win, lose, or stall.", prompts: [21, 22, 23, 24, 25] },
          { name: "Perception Analysis", owner: "agent", description: "Compare perceived vs actual strengths, identify confusion points, track sentiment shifts.", prompts: [26, 27, 28, 29, 30] },
        ],
      },
      {
        key: "analyst-tracking",
        name: "Analyst & Thought Leader Tracking",
        description: "Monitors individuals and firms shaping buyer perception in CTV (eMarketer, trade press, agency thought leaders).",
        subModules: [
          { name: "Analyst & Thought Leader Tracking", owner: "agent", description: "Monitors individuals and firms shaping buyer perception in CTV.", prompts: [31, 32, 33, 34, 35] },
          { name: "Narrative Influence", owner: "agent-human", description: "Identify misperceptions, track agency vs advertiser POVs, recommend strategic narrative wedges.", prompts: [36, 37, 38, 39, 40] },
          { name: "Partner Ecosystem Mapping", owner: "agent-human", description: "Agent monitors who's building what (MMPs, measurement partners). Human escalates strategic integration opportunities.", prompts: [] },
          { name: "Message Generation", owner: "agent-human", description: "Agent produces ICP-tailored messaging variants. Human reviews, edits, and approves all messaging before market release.", prompts: [] },
          { name: "Industry Events & Spaces", owner: "agent-human", description: "Agent tracks events and competitor presence. Human decides where Moloco shows up and what the presence looks like.", prompts: [] },
          { name: "Positioning Intelligence", owner: "human-led", description: "Human synthesizes all inputs above, maps against Moloco's product, sets strategic positioning, flags capability gaps to product team.", prompts: [] },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Distribution & Activation",
    shortName: "Distribution",
    description:
      "Turns the positioning and messaging from Module 1 into pipeline. It encompasses everything from identifying who to target, through outbound and digital marketing execution, to the pitch and close motion. A key design principle: agents generate, recommend, and surface insights, but a human approves all content going to market and actively drives the learning loops.",
    clusterId: 2,
    clusterIds: [2, 3],
    sections: [
      {
        key: "icp-intelligence",
        name: "ICP Intelligence",
        description: "Identifies who to target, generates segment hypotheses, validates and refines ICPs.",
        subModules: [
          { name: "Market Structure Mapping", owner: "agent", description: "Ingests competitor case studies, Sensor Tower data, industry reports to map who's buying CTV, in what segments, and in what verticals.", prompts: [41, 42, 43] },
          { name: "ICP Hypothesis Generation", owner: "agent-human", description: "Agent generates segment hypotheses by product line, buyer mindset, vertical, and role. Human reviews and prioritizes which to test first.", prompts: [44, 45, 46] },
          { name: "ICP Validation & Refinement", owner: "agent", description: "Tracks which segments respond, convert, or ghost. Auto-flags underperforming hypotheses for deprioritization.", prompts: [47, 48, 49, 50] },
          { name: "Org Mapping & Buyer Navigation", owner: "agent", description: "Maps org structures inside target companies to find CTV decision-makers.", prompts: [] },
        ],
      },
      {
        key: "outbound-system",
        name: "AI-Native Outbounding",
        description: "Explicitly replaces traditional SDR/NBS motion with agent-driven system. All outbound messages are human-approved before sending.",
        subModules: [
          { name: "Contact Acquisition", owner: "agent", description: "Finds names and enriches with contact data (emails, LinkedIn profiles).", prompts: [51, 53] },
          { name: "Message-to-ICP Mapping", owner: "agent-human", description: "Agent tailors positioning from Module 1 to each ICP segment. Human approves the messaging matrix.", prompts: [52, 54, 55] },
          { name: "Multi-Channel Execution", owner: "agent-human", description: "Agent sends human-approved sequences across email, LinkedIn, and other channels.", prompts: [56, 57, 58] },
          { name: "Channel Effectiveness Analysis", owner: "agent", description: "Measures which channels work for which segments.", prompts: [59, 60] },
          { name: "Message Effectiveness Analysis", owner: "agent", description: "Measures engagement signals: clicks, website visits, whitepaper downloads, replies.", prompts: [] },
          { name: "Outbound Learning Report", owner: "agent", description: "Synthesizes each round into a structured readout on ICP, messaging, positioning, and channel performance.", prompts: [] },
          { name: "Continuous Experimentation Engine", owner: "agent", description: "Generates next round of A/B tests based on learnings. New variants require human approval.", prompts: [] },
        ],
      },
      {
        key: "channel-optimization",
        name: "Channel & Message Optimization",
        description: "Optimizes spend allocation, detects underperformance, and identifies channel-message mismatches.",
        subModules: [
          { name: "Channel Effectiveness Mapping", owner: "agent", description: "Map channel effectiveness by ICP segment and detect underperformance.", prompts: [61, 62, 63, 64, 65] },
          { name: "Funnel Optimization", owner: "agent", description: "Track engagement funnels, identify drop-offs, compare inbound vs outbound quality.", prompts: [66, 67, 68, 69, 70] },
        ],
      },
      {
        key: "digital-awareness",
        name: "Digital Awareness & Consideration Engine",
        description: "Human oversight is critical throughout this sub-module. The human actively drives learning loops rather than passively reviewing agent output.",
        subModules: [
          { name: "Digital Channel Execution", owner: "agent-human", description: "Agent proposes channel strategy and campaign setup. Human approves before launch and approves significant budget reallocation.", prompts: [71, 72, 73] },
          { name: "Channel-Message-ICP Testing", owner: "agent-human", description: "Agent designs test matrix. Human reviews and approves what gets tested.", prompts: [74, 75, 76] },
          { name: "Awareness Measurement", owner: "agent-human", description: "Agent proposes measurement frameworks and collects proxy signals. Human evaluates credibility.", prompts: [] },
          { name: "Consideration Nurture", owner: "agent-human", description: "Agent designs nurture sequences. Human reviews content and flow before activation.", prompts: [77, 78, 79, 80] },
          { name: "Effectiveness Analysis & Learning Loop", owner: "agent-human", description: "Agent surfaces insights with recommendations. Human actively drives decisions on what to change. Not passive review.", prompts: [] },
        ],
      },
      {
        key: "sales-engagement",
        name: "Pitch & Sales Engagement",
        description: "Manages the handoff from marketing to sales, supports the sales conversation, and captures intelligence from every interaction.",
        subModules: [
          { name: "Qualified Lead Handoff", owner: "agent", description: "Determines when a lead crosses the threshold for human engagement and packages context for the seller.", prompts: [81, 82] },
          { name: "Sales Conversation Execution", owner: "human-led", description: "Human-led pitch and discovery calls. Relationship, judgment, and real-time reading of the buyer.", prompts: [] },
          { name: "Conversation Intelligence Extraction", owner: "agent", description: "Reviews Gong recordings and extracts structured insights: what resonated, objections, competitor mentions, product gaps.", prompts: [83, 84, 85] },
          { name: "Insight Routing", owner: "agent", description: "Sends extracted insights to right destinations: positioning to Module 1, product gaps to engineering, buyer patterns to ICP.", prompts: [86, 87] },
          { name: "Sales Coaching", owner: "agent-human", description: "Agent generates coaching feedback from calls. Human sales leader periodically validates calibration.", prompts: [88, 89, 90] },
          { name: "Personalized Follow-Up Package", owner: "agent-human", description: "Agent generates tailored info packet for prospect. Human reviews before sending.", prompts: [] },
        ],
      },
      {
        key: "partnerships",
        name: "Partnership & Channel Activation",
        description: "Identifies, activates, and manages strategic partnerships with MMPs, measurement providers, and complementary platforms.",
        subModules: [
          { name: "Partner Identification & Mapping", owner: "agent", description: "Research and mapping of potential partners (MMPs, measurement providers, complementary platforms).", prompts: [91, 92] },
          { name: "Co-Marketing Activation", owner: "human-led", description: "Human builds trust and negotiates terms. Agent drafts proposals and tracks progress.", prompts: [93, 94, 95, 96] },
          { name: "Warm Introduction Pipeline", owner: "human-led", description: "Human manages the ask and relationship. Agent tracks which introductions have been requested and follows up.", prompts: [97, 98, 99, 100] },
          { name: "Partnership Relationship Management", owner: "human-led", description: "Partnerships are built on trust and personal credibility. Human-led at this stage.", prompts: [] },
        ],
      },
      {
        key: "content-engine",
        name: "Content Engine",
        description: "Every piece of content is agent-drafted, human-reviewed and approved. No content goes to market without human sign-off.",
        subModules: [
          { name: "Content Strategy & Calendar", owner: "agent-human", description: "Agent maps what content is needed per funnel stage per ICP per product line. Human approves priorities.", prompts: [] },
          { name: "Content Production", owner: "agent-human", description: "Agent produces first drafts (whitepapers, blog posts, one-pagers). Human edits for quality, accuracy, and strategic alignment.", prompts: [] },
          { name: "Case Study Development", owner: "agent-human", description: "Agent identifies candidates and drafts. Human conducts interviews, manages quotes, navigates legal approval.", prompts: [] },
          { name: "Content Personalization", owner: "agent-human", description: "Agent tailors base content to specific segments. Human approves personalized variants before distribution.", prompts: [] },
          { name: "Content Performance Tracking", owner: "agent", description: "Measures which content drives engagement and funnel progression.", prompts: [] },
        ],
      },
      {
        key: "website-digital",
        name: "Website & Digital Destination Management",
        description: "Manages landing pages, conversion optimization, visitor intelligence, and organic discovery.",
        subModules: [
          { name: "Landing Page Strategy & Creation", owner: "agent-human", description: "Agent builds and iterates on pages. Human approves before going live.", prompts: [] },
          { name: "CTA & Conversion Path Optimization", owner: "agent", description: "Continuous testing and optimization of what converts.", prompts: [] },
          { name: "Visitor Intelligence", owner: "agent", description: "Captures and enriches visitor data. Maps back to ICP segments and campaigns.", prompts: [] },
          { name: "SEO & Organic Discovery", owner: "agent", description: "Keyword strategy, content optimization, technical SEO.", prompts: [] },
        ],
      },
      {
        key: "test-funding",
        name: "Test Funding & Commitment Management",
        description: "Manages test fund allocation, contract processes, and activation setup.",
        subModules: [
          { name: "Test Fund Tracker", owner: "agent", description: "Live monitoring of committed vs. deployed vs. remaining testing dollars. Alerts when approaching limits.", prompts: [] },
          { name: "Deal Closing & Activation Setup", owner: "agent-human", description: "Agent drives process (contracts, activation info, logging). Human reviews contracts before sending.", prompts: [] },
        ],
      },
      {
        key: "event-activation",
        name: "Event Activation",
        description: "Human-led, agent-supported. Agent handles research, logistics, and preparation. Humans execute in-market presence. Placeholder — to be fleshed out as event strategy develops.",
        subModules: [
          { name: "Event Research & Logistics", owner: "agent-human", description: "Agent handles research, logistics, and preparation for events.", prompts: [] },
          { name: "In-Market Execution", owner: "human-led", description: "Humans execute in-market presence at conferences and industry events.", prompts: [] },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "Customer Activation & Performance Management",
    shortName: "Customer Success",
    description:
      "Covers the full customer lifecycle from test commitment through long-term health. It has more human involvement than Module 2 by nature: customers need to feel a human cares, and the judgment calls around measurement, performance interpretation, and relationship management are high-stakes.",
    clusterId: 4,
    sections: [
      {
        key: "onboarding",
        name: "Test Onboarding & Setup",
        description: "Human-led across the board. The complexity of getting measurement right and the education required means humans are primary, with agents making their workflows easier.",
        subModules: [
          { name: "Goal & Creative Ingestion", owner: "human-led", description: "Human-led with agent structuring intake into standardized comparison framework.", prompts: [101, 107] },
          { name: "Measurement Verification", owner: "human-led", description: "Human-led audit of MMP (app) or web measurement setup. Agent runs checklist to ensure nothing is missed.", prompts: [102, 103] },
          { name: "Customer Business Metrics Mapping", owner: "human-led", description: "Human discovers customer's true KPIs through conversation. Agent captures and structures what's learned so it persists.", prompts: [104, 106] },
          { name: "Customer Education", owner: "human-led", description: "Human delivers education with agent-produced materials. Trust-building moment.", prompts: [105, 108] },
          { name: "Campaign Activation", owner: "agent", description: "Technical setup, automated and checklist-driven.", prompts: [109, 110] },
          { name: "Measurement Baseline Setup", owner: "agent-human", description: "Agent configures analytics. Human verifies alignment to customer business metrics.", prompts: [] },
        ],
      },
      {
        key: "campaign-monitoring",
        name: "Live Campaign Monitoring & Optimization",
        description: "24/7 monitoring with human action on anomalies. Solves the timezone dependency on Asia-based DS team.",
        subModules: [
          { name: "Performance Monitoring & Issue Detection", owner: "agent-human", description: "Agent monitors 24/7 and flags anomalies with diagnostics. Human takes action. Solves the timezone dependency on Asia-based DS team.", prompts: [111, 112, 113, 114, 115] },
          { name: "Weekly Customer Touchpoint", owner: "human-led", description: "Human-led with agent-prepared reporting, trends, and talking points.", prompts: [116, 117, 118, 119, 120] },
          { name: "Customer Sentiment Capture", owner: "agent", description: "Continuously extracts sentiment from all touchpoints. Produces rolling health score. Feeds flags into monitoring alerts.", prompts: [] },
        ],
      },
      {
        key: "customer-comms",
        name: "Customer Communication & Reporting",
        description: "Generates tailored reports, detects sentiment shifts, and manages proactive customer touchpoints.",
        subModules: [
          { name: "Weekly Report Generation", owner: "agent-human", description: "Agent compiles reports with insights. Human reviews for accuracy and strategic framing.", prompts: [121, 122, 123] },
          { name: "Sentiment & Engagement Tracking", owner: "agent", description: "Detect sentiment shifts, identify disengaged customers, generate proactive triggers.", prompts: [124, 125, 126, 127] },
          { name: "Executive Communication", owner: "agent-human", description: "Generate executive summaries, highlight key wins and risks, recommend re-engagement.", prompts: [128, 129, 130] },
        ],
      },
      {
        key: "performance-scaling",
        name: "Performance Readout & Scale Pitch",
        description: "Compiles performance readouts, builds scale pitch packages, and supports budget expansion negotiations.",
        subModules: [
          { name: "Four-Week Performance Report", owner: "agent-human", description: "Agent compiles comprehensive readout. Human reviews for accuracy and strategic framing, delivers to customer.", prompts: [131, 132, 133] },
          { name: "Customer Metrics Alignment Validation", owner: "human-led", description: "Human ensures incrementality maps to what customer actually cares about, not just what Moloco's systems measure.", prompts: [134, 135] },
          { name: "Scale Pitch Package", owner: "agent-human", description: "Agent drafts business case for expanded budget. Human refines and delivers.", prompts: [136, 137, 138] },
          { name: "Budget Expansion Negotiation Support", owner: "agent-human", description: "Agent provides data, competitive context, objection handling. Human executes the negotiation.", prompts: [139, 140] },
        ],
      },
      {
        key: "churn-prevention",
        name: "Churn Prevention & Early Warning",
        description: "Watches for leading indicators of churn across all accounts and triggers human intervention when needed.",
        subModules: [
          { name: "Leading Indicator Monitoring", owner: "agent", description: "Watches for signals across all accounts: declining engagement, performance below benchmark, unresponsive contacts.", prompts: [141, 142, 143] },
          { name: "Intervention Trigger", owner: "agent-human", description: "Agent flags risk and proposes intervention. Human decides whether and how to engage.", prompts: [144, 145, 146] },
          { name: "Churn Pattern Analysis", owner: "agent", description: "Identify churn patterns by segment, predict probability, recommend proactive actions.", prompts: [147, 148, 149, 150] },
        ],
      },
      {
        key: "cross-account",
        name: "Cross-Account Intelligence",
        description: "All outputs must include specific evidence with references, not just synthesis. Humans need to see the 'why' with supporting data.",
        subModules: [
          { name: "Pattern Recognition", owner: "agent", description: "Looks across all live tests for patterns by vertical, inventory source, campaign setup, measurement config.", prompts: [151, 152, 153] },
          { name: "Competitive Performance Database", owner: "agent", description: "Compiles and maintains Moloco performance vs. every competitor from every test.", prompts: [154, 155, 156] },
          { name: "Learnings Synthesis", owner: "agent-human", description: "Agent produces synthesis with evidence. Human validates accuracy and decides what to escalate.", prompts: [157, 158, 159, 160] },
        ],
      },
      {
        key: "case-study-pipeline",
        name: "Case Study Development Pipeline",
        description: "Systematic identification, development, and distribution of customer case studies as sales enablement assets.",
        subModules: [
          { name: "Case Study Trigger & Draft", owner: "agent-human", description: "Agent flags candidates at four-week mark and drafts with performance metrics. Human edits heavily.", prompts: [] },
          { name: "Customer Interview & Approval", owner: "human-led", description: "Human conducts interview, captures quotes, manages customer and legal approval.", prompts: [] },
          { name: "Multi-Channel Distribution", owner: "agent-human", description: "Agent pushes approved case study across channels. Human approves distribution plan.", prompts: [] },
        ],
      },
      {
        key: "long-term-health",
        name: "Long-Term Customer Health & Product Co-Development",
        description: "Ongoing customer health monitoring, product co-development through advisory boards, and lifetime value tracking.",
        subModules: [
          { name: "Monthly Customer Health Check", owner: "agent-human", description: "Agent generates health report. Human reviews and acts on declining accounts.", prompts: [] },
          { name: "Automated Sentiment Capture", owner: "agent", description: "Continuous extraction from all touchpoints. Feeds flags into core monitoring.", prompts: [] },
          { name: "Confidence Driver Analysis", owner: "agent-human", description: "Agent surfaces possible signals. Human augments with offline context and judgment.", prompts: [] },
          { name: "Virtual Customer Advisory Board", owner: "human-led", description: "Human-led product co-development. Agent supports micro-engagement surveys and aggregation.", prompts: [] },
          { name: "Product Hypothesis Validation Pipeline", owner: "human-led", description: "Human-led with agent-surfaced insights from other workflows. Human decides which hypotheses to test.", prompts: [] },
          { name: "Customer Lifetime Value & Growth Tracking", owner: "agent", description: "Data tracking and trend analysis on post-scale revenue trajectory and share of wallet.", prompts: [] },
        ],
      },
      {
        key: "feedback-routing",
        name: "Feedback Routing & Executive Reporting",
        description: "Aggregates feedback across all customer touchpoints and routes to appropriate teams for action.",
        subModules: [
          { name: "Product & Engineering Feedback Loop", owner: "agent-human", description: "Agent aggregates and structures all feedback. Human prioritizes what gets escalated.", prompts: [] },
          { name: "Executive Weekly Learnings Report", owner: "agent-human", description: "Agent drafts synthesis across all live accounts. Human reviews and adds strategic interpretation.", prompts: [] },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "Executive Governance & Business Intelligence",
    shortName: "Governance & BI",
    description:
      "Sits on top of the entire operation, providing the synthesis, visibility, and accountability that makes the system legible to leadership and enables the go/no-go investment decisions at EOQ2.",
    clusterId: 5,
    sections: [
      {
        key: "commercial-performance",
        name: "Commercial Performance",
        description: "Pipeline visibility, conversion tracking, ARR pacing, and test fund burn tracking.",
        subModules: [
          { name: "Global Pipeline Visibility", owner: "agent-human", description: "Single view across all regions showing every funnel stage. Human validates data accuracy and interprets trends.", prompts: [161, 162, 163] },
          { name: "Stage-by-Stage Conversion Tracking", owner: "agent-human", description: "Measures whether each stage of the funnel is improving over time. Human contextualizes and acts on signals.", prompts: [] },
          { name: "Revenue Pacing & ARR Tracking", owner: "agent-human", description: "Tracks pacing toward $200M App ARR target and Web product validation. Human interprets trajectory and flags risks.", prompts: [164, 165, 166] },
          { name: "Test Fund Burn Tracking", owner: "agent-human", description: "Live monitoring of committed vs. deployed vs. remaining testing dollars. Human manages allocation decisions.", prompts: [167] },
        ],
      },
      {
        key: "learning-goals",
        name: "Learning Goals Synthesis",
        description: "Maps learnings from across all modules back to the strategic learning goals that drive the EOQ2 investment decision.",
        subModules: [
          { name: "Strength of Conviction Tracker", owner: "agent-human", description: "Agent maps learnings from across all modules back to the learning goals. Human evaluates strength of conviction from learnings from each weekly cycle.", prompts: [169] },
        ],
      },
      {
        key: "operating-rhythm",
        name: "Operating Rhythm Management",
        description: "Weekly preparation, OKR tracking, dependency surfacing, executive communications, and MA steering alignment.",
        subModules: [
          { name: "XFN Leadership Weekly Preparation", owner: "agent-human", description: "Agent auto-generates agenda and pre-read from all modules. Human determines what needs XFN management focus.", prompts: [168, 173, 174] },
          { name: "Customer Success Weekly Preparation", owner: "agent-human", description: "Agent compiles per-customer metrics. Human adds offline context.", prompts: [] },
          { name: "OKR & Action Item Tracking", owner: "agent-human", description: "Tracks EOQ1/EOQ2 deliverables, captures commitments, follows up on delivery. Human validates completion and escalates.", prompts: [170, 175] },
          { name: "Dependency & Blocker Surfacing", owner: "agent-human", description: "Agent identifies cross-functional blocks. Human decides how to intervene.", prompts: [171, 172] },
          { name: "Exec Communications", owner: "agent-human", description: "Agent drafts exec-appropriate updates. Human edits for tone and strategic framing.", prompts: [176, 177, 178] },
          { name: "MA Steering Alignment", owner: "human-led", description: "Human-led alignment with broader Moloco Ads steering rhythm.", prompts: [179, 180] },
        ],
      },
    ],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getOwnerLabel(owner: OwnerType): string {
  switch (owner) {
    case "agent": return "AI-Driven";
    case "agent-human": return "AI + Review";
    case "human-led": return "Human-Led";
  }
}

export function getOwnerColor(owner: OwnerType): string {
  switch (owner) {
    case "agent": return "#0091FF";
    case "agent-human": return "#D4A017";
    case "human-led": return "#64748B";
  }
}

export function getOwnerBg(owner: OwnerType): string {
  switch (owner) {
    case "agent": return "bg-blue-50 text-blue-700 border-blue-200";
    case "agent-human": return "bg-amber-50 text-amber-700 border-amber-200";
    case "human-led": return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export function getAgentTypeLabel(type: AgentType): string {
  switch (type) {
    case "persistent": return "Always-On";
    case "triggered": return "On-Demand";
    case "orchestrator": return "Coordinator";
  }
}

export function getAgentTypeBg(type: AgentType): string {
  switch (type) {
    case "persistent": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "triggered": return "bg-violet-50 text-violet-700 border-violet-200";
    case "orchestrator": return "bg-rose-50 text-rose-700 border-rose-200";
  }
}

/** Technical term for agent type (shown in tooltips) */
export function getAgentTypeTechnical(type: AgentType): string {
  switch (type) {
    case "persistent": return "Persistent Agent";
    case "triggered": return "Triggered Agent";
    case "orchestrator": return "Orchestrator Agent";
  }
}

/** Technical term for ownership model (shown in tooltips) */
export function getOwnerTechnical(owner: OwnerType): string {
  switch (owner) {
    case "agent": return "Agent-Owned";
    case "agent-human": return "Agent+Human";
    case "human-led": return "Human-Led";
  }
}

export function getStatusColor(status: PromptStatus): string {
  switch (status) {
    case "active": return "bg-emerald-500";
    case "pending": return "bg-amber-500";
    case "blocked": return "bg-red-500";
    case "complete": return "bg-slate-400";
  }
}

// Computed stats
export function getModuleStats(moduleId: number) {
  const mod = modules.find((m) => m.id === moduleId);
  if (!mod) return { sections: 0, subModules: 0, prompts: 0, agents: 0, agentHuman: 0, humanLed: 0 };
  let subModules = 0, promptCount = 0, agents = 0, agentHuman = 0, humanLed = 0;
  mod.sections.forEach((s) => {
    subModules += s.subModules.length;
    s.subModules.forEach((sm) => {
      promptCount += sm.prompts.length;
      if (sm.owner === "agent") agents++;
      else if (sm.owner === "agent-human") agentHuman++;
      else humanLed++;
    });
  });
  return { sections: mod.sections.length, subModules, prompts: promptCount, agents, agentHuman, humanLed };
}

export function getTotalStats() {
  const modulePrompts = prompts.filter((p) => p.moduleId !== 0).length;
  const orchPrompts = prompts.filter((p) => p.moduleId === 0).length;
  let totalSubModules = 0, totalAgents = 0, totalAgentHuman = 0, totalHumanLed = 0;
  modules.forEach((m) => {
    m.sections.forEach((s) => {
      totalSubModules += s.subModules.length;
      s.subModules.forEach((sm) => {
        if (sm.owner === "agent") totalAgents++;
        else if (sm.owner === "agent-human") totalAgentHuman++;
        else totalHumanLed++;
      });
    });
  });
  return {
    modules: modules.length,
    clusters: clusters.length,
    totalSubModules,
    totalPrompts: prompts.length,
    modulePrompts,
    orchPrompts,
    persistent: prompts.filter((p) => p.agentType === "persistent").length,
    triggered: prompts.filter((p) => p.agentType === "triggered").length,
    orchestrator: prompts.filter((p) => p.agentType === "orchestrator").length,
    totalAgents,
    totalAgentHuman,
    totalHumanLed,
  };
}
