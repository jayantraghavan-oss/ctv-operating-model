// ============================================================================
// OPERATIONAL METADATA — Enriches each sub-module with workflow details
// Derived from Beth Berger's operating model doc + domain inference
// ============================================================================

export interface WorkflowStep {
  actor: "agent" | "human";
  action: string;
}

export interface SubModuleOps {
  /** Match key: "sectionKey::subModuleName" */
  key: string;
  inputs: string[];
  outputs: string[];
  dataSources: string[];
  workflow: WorkflowStep[];
  frequency: string;
  handoffPoint: string;
  criticalContext: string;
  xfnDependencies: string[];
  learningLoop?: string;
}

// ============================================================================
// MODULE 1 — Market Intelligence & Positioning
// ============================================================================

const module1Ops: SubModuleOps[] = [
  {
    key: "industry-sensing::Industry Landscape Monitoring",
    inputs: ["Trade press feeds", "Earnings call transcripts", "Industry reports", "Conference proceedings"],
    outputs: ["Weekly market shift brief", "Vertical-tagged trend database", "Emerging buyer category alerts"],
    dataSources: ["eMarketer", "AdExchanger", "Digiday", "SEC filings", "Conference agendas"],
    workflow: [
      { actor: "agent", action: "Scan 50+ CTV industry sources daily" },
      { actor: "agent", action: "Extract and tag shifts by vertical, budget size, measurement sophistication" },
      { actor: "agent", action: "Generate weekly 'what changed in the market' brief" },
      { actor: "human", action: "Review brief, validate signal strength, route to positioning" },
    ],
    frequency: "Continuous scan · Weekly synthesis",
    handoffPoint: "Weekly brief → Cluster 1 orchestrator for positioning synthesis",
    criticalContext: "This is the raw signal layer. Everything downstream depends on the quality of what gets captured here. The human orchestrator in Cluster 1 uses these signals to update Moloco's strategic positioning.",
    xfnDependencies: ["Product Marketing", "Corp Comms"],
    learningLoop: "Feeds Module 1 Positioning Intelligence → which feeds Module 2 messaging",
  },
  {
    key: "competitor-intel::Competitor Intelligence",
    inputs: ["Competitor websites", "Job postings", "Patent filings", "Customer win/loss data", "Industry press"],
    outputs: ["Live battlecards (top 10)", "Competitor narrative vs reality gap analysis", "Counter-positioning messaging"],
    dataSources: ["LinkedIn", "Glassdoor", "Crunchbase", "Gong transcripts", "SFDC win/loss fields"],
    workflow: [
      { actor: "agent", action: "Maintain live battlecards for top 10 competitors" },
      { actor: "agent", action: "Track hiring patterns to infer roadmap direction" },
      { actor: "agent", action: "Detect pricing shifts and estimate implications" },
      { actor: "agent", action: "Generate counter-positioning messaging per competitor" },
      { actor: "human", action: "Validate battlecard accuracy, add qualitative context from sales conversations" },
    ],
    frequency: "Continuous monitoring · Battlecards updated weekly",
    handoffPoint: "Battlecards → Sales team for pitch prep · Gap analysis → Positioning Intelligence",
    criticalContext: "Company-by-company tracking of capabilities, talent moves, and tech quality. The battlecards are living documents that sellers use in real conversations.",
    xfnDependencies: ["Sales", "Product"],
    learningLoop: "Win/loss data from Module 2 Pitch & Sales feeds back to refine battlecards",
  },
  {
    key: "customer-voice::Customer Voice / Win-Loss Intelligence",
    inputs: ["Gong call recordings", "SFDC opportunity notes", "GM feedback", "Customer emails"],
    outputs: ["Structured win/loss drivers", "Top 10 objection themes", "ICP loss rate analysis", "Positioning change recommendations"],
    dataSources: ["Gong API", "Salesforce CRM", "Slack (GM channels)", "Customer survey data"],
    workflow: [
      { actor: "agent", action: "Ingest Gong transcripts + CRM notes continuously" },
      { actor: "agent", action: "Extract structured win/loss drivers and cluster objections" },
      { actor: "agent", action: "Identify ICP segments with highest loss rates" },
      { actor: "agent", action: "Detect misalignment between marketing messaging and sales objections" },
      { actor: "human", action: "Validate patterns, add offline context, decide what to escalate to product" },
    ],
    frequency: "Continuous ingestion · Weekly synthesis report",
    handoffPoint: "Win/loss patterns → Positioning Intelligence · Product gaps → Engineering",
    criticalContext: "This is the voice of the market filtered through actual sales interactions. The agent extracts structured insights on why deals win, lose, or stall — but the human adds the 'why behind the why' from relationship context.",
    xfnDependencies: ["Sales", "Product", "Engineering"],
    learningLoop: "Feeds Module 1 Positioning → Module 2 ICP refinement → Module 2 messaging optimization",
  },
  {
    key: "analyst-tracking::Analyst & Thought Leader Tracking",
    inputs: ["Analyst reports", "Social media feeds", "Conference presentations", "Podcast transcripts"],
    outputs: ["Top 100 influencer tracker", "Narrative credibility index", "Outreach strategy recommendations"],
    dataSources: ["eMarketer", "Forrester", "Twitter/X", "LinkedIn", "YouTube", "Industry podcasts"],
    workflow: [
      { actor: "agent", action: "Track top 100 influencers shaping CTV buying decisions" },
      { actor: "agent", action: "Identify narratives gaining credibility among analysts" },
      { actor: "agent", action: "Detect when Moloco is missing from key industry conversations" },
      { actor: "human", action: "Decide which narratives to engage with and how" },
    ],
    frequency: "Continuous monitoring · Bi-weekly influencer report",
    handoffPoint: "Narrative gaps → Content Engine · Outreach strategies → Partnerships",
    criticalContext: "Monitors individuals and firms shaping buyer perception in CTV. The human decides where Moloco needs to insert itself into conversations.",
    xfnDependencies: ["Corp Comms", "Content Marketing"],
  },
  {
    key: "positioning::Positioning Intelligence",
    inputs: ["All Module 1 agent outputs", "Product roadmap", "Competitive landscape", "Customer voice data"],
    outputs: ["Strategic positioning framework", "Capability gap flags to product", "Messaging direction for Module 2"],
    dataSources: ["All Module 1 sub-modules", "Product team roadmap docs", "GDrive strategy docs"],
    workflow: [
      { actor: "human", action: "Synthesize all Module 1 inputs into coherent market picture" },
      { actor: "human", action: "Map market reality against Moloco's actual product capabilities" },
      { actor: "human", action: "Set strategic positioning and messaging direction" },
      { actor: "human", action: "Flag capability gaps to product team with evidence" },
    ],
    frequency: "Weekly synthesis · Monthly strategic positioning review",
    handoffPoint: "Positioning → Module 2 (all demand + sales sub-modules) · Gaps → Product/Engineering",
    criticalContext: "This is the HUMAN-LED capstone of Module 1. The human holds the complete picture of the outside world mapped against Moloco's capabilities. This is where market intelligence becomes strategy.",
    xfnDependencies: ["Product", "Engineering", "Executive team"],
    learningLoop: "Module 2 campaign results feed back to validate/invalidate positioning hypotheses",
  },
  {
    key: "industry-sensing::Partner Ecosystem Mapping",
    inputs: ["MMP product updates", "Measurement partner announcements", "Industry partnership news"],
    outputs: ["Partner capability map", "Strategic integration opportunities", "Competitive dynamics alerts"],
    dataSources: ["Partner websites", "Industry press", "Conference announcements", "LinkedIn"],
    workflow: [
      { actor: "agent", action: "Monitor who's building what across MMPs and measurement partners" },
      { actor: "agent", action: "Map partner capabilities and integration opportunities" },
      { actor: "human", action: "Escalate strategic integration opportunities" },
      { actor: "human", action: "Assess competitive dynamics of partner moves" },
    ],
    frequency: "Continuous monitoring · Monthly partner landscape review",
    handoffPoint: "Integration opportunities → Product · Partnership signals → Module 2 Partnerships",
    criticalContext: "Agent monitors the ecosystem; human decides which partnerships are strategically important and which competitive dynamics need attention.",
    xfnDependencies: ["Product", "Partnerships", "Engineering"],
  },
  {
    key: "positioning::Message Generation",
    inputs: ["Positioning framework", "ICP definitions", "Competitive battlecards", "Win/loss patterns"],
    outputs: ["ICP-tailored messaging variants", "Approved messaging matrix", "A/B test variants"],
    dataSources: ["Module 1 Positioning Intelligence", "Module 2 ICP Intelligence", "Gong insights"],
    workflow: [
      { actor: "agent", action: "Produce ICP-tailored messaging variants based on positioning" },
      { actor: "agent", action: "Generate variants for different buyer personas and stages" },
      { actor: "human", action: "Review, edit, and approve all messaging before market release" },
    ],
    frequency: "Triggered by positioning updates · Monthly messaging refresh",
    handoffPoint: "Approved messaging → Module 2 Outbounding + Content Engine + Digital Awareness",
    criticalContext: "No messaging goes to market without human sign-off. The agent generates at scale; the human ensures quality, accuracy, and strategic alignment.",
    xfnDependencies: ["Content Marketing", "Sales"],
  },
  {
    key: "positioning::Industry Events & Spaces",
    inputs: ["Event calendars", "Competitor event presence", "Industry conference agendas"],
    outputs: ["Event participation recommendations", "Competitor presence analysis", "Event strategy briefs"],
    dataSources: ["Event websites", "Industry calendars", "Social media", "Competitor marketing"],
    workflow: [
      { actor: "agent", action: "Track events and competitor presence across CTV industry" },
      { actor: "agent", action: "Analyze which events drive the most buyer engagement" },
      { actor: "human", action: "Decide where Moloco shows up and what the presence looks like" },
    ],
    frequency: "Continuous tracking · Quarterly event strategy review",
    handoffPoint: "Event decisions → Module 2 Event Activation · Competitive presence → Battlecards",
    criticalContext: "Agent handles research and logistics; human makes the strategic call on where Moloco's limited resources should be deployed.",
    xfnDependencies: ["Marketing", "Sales", "Executive team"],
  },
];

// ============================================================================
// MODULE 2 — Distribution & Activation
// ============================================================================

const module2Ops: SubModuleOps[] = [
  {
    key: "icp-intelligence::Market Structure Mapping",
    inputs: ["Competitor case studies", "Sensor Tower data", "Industry reports", "CRM data"],
    outputs: ["CTV buyer map by segment/vertical", "Market structure database", "Addressable market sizing"],
    dataSources: ["Sensor Tower API", "Competitor websites", "Industry reports", "SFDC"],
    workflow: [
      { actor: "agent", action: "Ingest competitor case studies and industry data" },
      { actor: "agent", action: "Map who's buying CTV, in what segments, and in what verticals" },
      { actor: "agent", action: "Size addressable market by segment" },
    ],
    frequency: "Monthly refresh · Triggered by new data sources",
    handoffPoint: "Market map → ICP Hypothesis Generation · Sizing → Executive Governance",
    criticalContext: "This is the foundation of targeting. Gets the 'who' right before any outbound or demand gen happens.",
    xfnDependencies: ["Data Science"],
  },
  {
    key: "icp-intelligence::ICP Hypothesis Generation",
    inputs: ["Market structure map", "Win/loss data", "Positioning framework"],
    outputs: ["ICP segment hypotheses", "Prioritized test list", "Buyer persona profiles"],
    dataSources: ["Module 1 outputs", "SFDC pipeline data", "Gong call themes"],
    workflow: [
      { actor: "agent", action: "Generate segment hypotheses by product line, buyer mindset, vertical, role" },
      { actor: "human", action: "Review and prioritize which ICPs to test first" },
    ],
    frequency: "Monthly hypothesis generation · Continuous refinement",
    handoffPoint: "Prioritized ICPs → Outbounding + Digital Awareness + Content Engine",
    criticalContext: "Agent generates at scale; human applies judgment on which segments are worth testing given limited resources and strategic priorities.",
    xfnDependencies: ["Sales", "Product Marketing"],
    learningLoop: "Module 2 outbound results + Module 3 customer performance feed back to validate/kill ICPs",
  },
  {
    key: "icp-intelligence::ICP Validation & Refinement",
    inputs: ["Outbound response data", "Pipeline conversion data", "Customer performance data"],
    outputs: ["ICP performance scorecards", "Deprioritization flags", "Refined ICP definitions"],
    dataSources: ["Email/LinkedIn engagement data", "SFDC conversion rates", "Module 3 performance data"],
    workflow: [
      { actor: "agent", action: "Track which segments respond, convert, or ghost" },
      { actor: "agent", action: "Auto-flag underperforming hypotheses for deprioritization" },
      { actor: "agent", action: "Score ICPs based on multi-signal performance" },
    ],
    frequency: "Continuous tracking · Weekly scorecard update",
    handoffPoint: "Deprioritization flags → ICP Hypothesis Generation for next cycle",
    criticalContext: "This closes the loop. Without this, the system keeps targeting segments that don't convert. The auto-flagging is critical for a 2-FTE operation.",
    xfnDependencies: [],
    learningLoop: "Feeds back into ICP Hypothesis Generation and Module 1 Customer Voice",
  },
  {
    key: "icp-intelligence::Org Mapping & Buyer Navigation",
    inputs: ["Target company data", "LinkedIn data", "CRM contact records"],
    outputs: ["Org charts for target accounts", "CTV decision-maker identification", "Buying committee maps"],
    dataSources: ["LinkedIn Sales Navigator", "SFDC contacts", "Company websites"],
    workflow: [
      { actor: "agent", action: "Map org structures inside target companies" },
      { actor: "agent", action: "Identify CTV decision-makers and influencers" },
      { actor: "agent", action: "Map buying committees and power dynamics" },
    ],
    frequency: "Triggered per target account · Refreshed monthly",
    handoffPoint: "Org maps → Outbounding (for targeting) + Sales Engagement (for pitch prep)",
    criticalContext: "CTV buying decisions often involve multiple stakeholders across media, data, and product teams. Knowing who matters is half the battle.",
    xfnDependencies: [],
  },
  {
    key: "outbounding::Contact Acquisition",
    inputs: ["ICP definitions", "Org maps", "Target account lists"],
    outputs: ["Enriched contact database", "Email + LinkedIn profiles", "Contact quality scores"],
    dataSources: ["LinkedIn", "ZoomInfo/Apollo", "Company websites", "SFDC"],
    workflow: [
      { actor: "agent", action: "Find names matching ICP criteria in target accounts" },
      { actor: "agent", action: "Enrich with contact data (emails, LinkedIn profiles)" },
      { actor: "agent", action: "Score contact quality and reachability" },
    ],
    frequency: "Continuous · Triggered by new ICP prioritization",
    handoffPoint: "Enriched contacts → Message-to-ICP Mapping → Multi-Channel Execution",
    criticalContext: "The raw fuel for outbound. Quality of contacts directly determines outbound effectiveness.",
    xfnDependencies: [],
  },
  {
    key: "outbounding::Message-to-ICP Mapping",
    inputs: ["Module 1 positioning", "ICP definitions", "Contact data", "Past performance data"],
    outputs: ["Messaging matrix (ICP × message variant)", "Approved sequences", "A/B test plan"],
    dataSources: ["Module 1 Message Generation", "Outbound performance data", "Gong insights"],
    workflow: [
      { actor: "agent", action: "Tailor positioning from Module 1 to each ICP segment" },
      { actor: "agent", action: "Generate message variants per persona, stage, and channel" },
      { actor: "human", action: "Approve the messaging matrix before any outbound goes live" },
    ],
    frequency: "Updated per outbound cycle · Refreshed with new positioning",
    handoffPoint: "Approved matrix → Multi-Channel Execution",
    criticalContext: "All outbound messages are human-approved before sending. This is the quality gate that prevents brand damage at scale.",
    xfnDependencies: ["Content Marketing"],
    learningLoop: "Message Effectiveness Analysis feeds back to refine the matrix",
  },
  {
    key: "outbounding::Multi-Channel Execution",
    inputs: ["Approved messaging matrix", "Contact database", "Channel strategy"],
    outputs: ["Executed outbound sequences", "Engagement data", "Response tracking"],
    dataSources: ["Email platform", "LinkedIn", "CRM activity logs"],
    workflow: [
      { actor: "agent", action: "Send human-approved sequences across email, LinkedIn, and other channels" },
      { actor: "agent", action: "Track engagement signals in real-time" },
      { actor: "human", action: "Monitor quality and intervene on high-value prospects" },
    ],
    frequency: "Continuous execution · Cycle-based campaigns",
    handoffPoint: "Engaged leads → Qualified Lead Handoff · Engagement data → Effectiveness Analysis",
    criticalContext: "This explicitly replaces the traditional SDR/NBS motion with an agent-driven system. The 2-FTE model depends on this working at scale.",
    xfnDependencies: [],
  },
  {
    key: "pitch-sales::Qualified Lead Handoff",
    inputs: ["Engagement signals", "ICP scores", "Contact history", "Behavioral data"],
    outputs: ["Sales-ready lead packages", "Context briefs for sellers", "Handoff notifications"],
    dataSources: ["Outbound engagement data", "Website visitor data", "Content engagement data"],
    workflow: [
      { actor: "agent", action: "Determine when a lead crosses the threshold for human engagement" },
      { actor: "agent", action: "Package full context for the seller (pain points, signals, history)" },
      { actor: "agent", action: "Route to appropriate seller based on segment and geography" },
    ],
    frequency: "Real-time · Triggered by engagement threshold",
    handoffPoint: "Lead package → Sales Conversation Execution (human-led)",
    criticalContext: "This is the critical handoff from machine to human. The quality of the context package determines whether the seller walks into the conversation prepared or cold.",
    xfnDependencies: ["Sales"],
  },
  {
    key: "pitch-sales::Sales Conversation Execution",
    inputs: ["Lead context package", "Battlecards", "Competitor intelligence", "Account history"],
    outputs: ["Call recordings", "Deal progression", "Relationship context"],
    dataSources: ["Gong", "SFDC", "Module 1 battlecards"],
    workflow: [
      { actor: "human", action: "Run pitch and discovery calls — relationship, judgment, real-time reading of buyer" },
      { actor: "human", action: "Navigate objections using battlecards and positioning" },
      { actor: "human", action: "Build trust and advance the deal" },
    ],
    frequency: "Per opportunity · Multiple touchpoints per deal",
    handoffPoint: "Call recordings → Conversation Intelligence Extraction · Deal updates → SFDC",
    criticalContext: "This is HUMAN-LED. Relationship, judgment, and real-time reading of the buyer cannot be automated. This is where deals are won or lost.",
    xfnDependencies: ["Sales leadership"],
  },
  {
    key: "pitch-sales::Conversation Intelligence Extraction",
    inputs: ["Gong call recordings", "Meeting transcripts", "Chat logs"],
    outputs: ["Structured call insights", "Objection patterns", "Competitor mentions", "Product gap flags"],
    dataSources: ["Gong API", "Meeting platforms", "Email threads"],
    workflow: [
      { actor: "agent", action: "Review Gong recordings and extract structured insights" },
      { actor: "agent", action: "Tag what resonated, objections raised, competitors mentioned" },
      { actor: "agent", action: "Flag product gaps and feature requests" },
    ],
    frequency: "After every sales call · Batch processing daily",
    handoffPoint: "Insights → Insight Routing agent for distribution across modules",
    criticalContext: "Every call feeds the system. This is how a 2-FTE operation learns from every interaction without manual note-taking.",
    xfnDependencies: [],
    learningLoop: "Feeds Module 1 (positioning), Module 2 (ICP refinement), Product (gap flags)",
  },
  {
    key: "pitch-sales::Insight Routing",
    inputs: ["Extracted call insights", "Product gap flags", "Buyer patterns"],
    outputs: ["Routed insights to correct destinations", "Prioritized product feedback", "ICP pattern updates"],
    dataSources: ["Conversation Intelligence Extraction output"],
    workflow: [
      { actor: "agent", action: "Classify insights by destination: positioning, product, ICP, competitive" },
      { actor: "agent", action: "Route positioning insights to Module 1" },
      { actor: "agent", action: "Route product gaps to engineering feedback pipeline" },
      { actor: "agent", action: "Route buyer patterns to ICP Intelligence" },
    ],
    frequency: "Real-time after extraction · Daily batch routing",
    handoffPoint: "Positioning → Module 1 · Product gaps → Engineering · Buyer patterns → ICP Intelligence",
    criticalContext: "This is the nervous system of the operating model. Without routing, insights die in call recordings. This agent ensures every signal reaches the right destination.",
    xfnDependencies: ["Product", "Engineering", "Module 1 team"],
  },
  {
    key: "pitch-sales::Sales Coaching",
    inputs: ["Call transcripts", "Win/loss patterns", "Best practice library"],
    outputs: ["Coaching feedback per rep", "Calibration reports", "Skill gap analysis"],
    dataSources: ["Gong API", "SFDC win rates by rep", "Call scoring data"],
    workflow: [
      { actor: "agent", action: "Generate coaching feedback from call transcripts" },
      { actor: "agent", action: "Identify objection patterns by seller" },
      { actor: "agent", action: "Compare rep performance against best practices" },
      { actor: "human", action: "Periodically validate calibration and adjust coaching criteria" },
    ],
    frequency: "After each call · Weekly coaching summary",
    handoffPoint: "Coaching insights → Sales leadership · Skill gaps → Training programs",
    criticalContext: "For CTV-to-App, this helps uplevel the AMER MA sellers on CTV-specific complexity without the Cluster 3 person manually reviewing every call.",
    xfnDependencies: ["Sales leadership"],
  },
  {
    key: "partnerships::Partner Identification & Mapping",
    inputs: ["Industry landscape data", "Partner ecosystem map", "Strategic priorities"],
    outputs: ["Partner opportunity map", "Strategic value rankings", "Partnership recommendations"],
    dataSources: ["Module 1 Partner Ecosystem Mapping", "Industry reports", "LinkedIn"],
    workflow: [
      { actor: "agent", action: "Research and map potential partners (MMPs, measurement, platforms)" },
      { actor: "agent", action: "Rank by strategic value and complementarity" },
    ],
    frequency: "Monthly scan · Triggered by strategic shifts",
    handoffPoint: "Partner recommendations → Co-Marketing Activation (human-led)",
    criticalContext: "Agent does the research; human builds the relationships. Partnerships are built on trust and personal credibility.",
    xfnDependencies: ["Product", "Business Development"],
  },
  {
    key: "partnerships::Co-Marketing Activation",
    inputs: ["Partner recommendations", "Marketing calendar", "Content assets"],
    outputs: ["Co-marketing proposals", "Joint campaign plans", "Partner engagement tracking"],
    dataSources: ["Partner communications", "Marketing calendar", "Content library"],
    workflow: [
      { actor: "agent", action: "Draft co-marketing proposals and joint campaign plans" },
      { actor: "agent", action: "Track partner engagement and pipeline contribution" },
      { actor: "human", action: "Build trust, negotiate terms, and manage the relationship" },
    ],
    frequency: "Per partnership · Quarterly review",
    handoffPoint: "Joint campaigns → Digital Awareness + Content Engine",
    criticalContext: "Human builds trust and negotiates terms. Agent drafts proposals and tracks progress. The human IS the relationship.",
    xfnDependencies: ["Marketing", "Legal"],
  },
  {
    key: "digital-awareness::Digital Channel Execution",
    inputs: ["ICP definitions", "Messaging matrix", "Budget allocation", "Channel performance data"],
    outputs: ["Campaign setups", "Budget recommendations", "Performance dashboards"],
    dataSources: ["Ad platforms", "Analytics tools", "Module 2 ICP data"],
    workflow: [
      { actor: "agent", action: "Propose channel strategy and campaign setup" },
      { actor: "human", action: "Approve before launch and approve significant budget reallocation" },
      { actor: "agent", action: "Execute campaigns and monitor performance" },
    ],
    frequency: "Continuous campaign management · Weekly optimization",
    handoffPoint: "Performance data → Effectiveness Analysis · Engaged prospects → Nurture sequences",
    criticalContext: "Human oversight is critical throughout. The human actively drives learning loops rather than passively reviewing agent output.",
    xfnDependencies: ["Marketing"],
    learningLoop: "Effectiveness Analysis feeds back to refine channel strategy",
  },
  {
    key: "content-engine::Content Strategy & Calendar",
    inputs: ["ICP definitions", "Funnel stage data", "Product line priorities", "Competitive gaps"],
    outputs: ["Content calendar", "Priority content briefs", "Gap analysis"],
    dataSources: ["Module 1 outputs", "Module 2 ICP data", "Content performance data"],
    workflow: [
      { actor: "agent", action: "Map what content is needed per funnel stage per ICP per product line" },
      { actor: "agent", action: "Identify content gaps and prioritize production" },
      { actor: "human", action: "Approve priorities and strategic direction" },
    ],
    frequency: "Monthly calendar · Weekly priority updates",
    handoffPoint: "Content briefs → Content Production · Calendar → Marketing team",
    criticalContext: "Every piece of content is agent-drafted, human-reviewed and approved. No content goes to market without human sign-off.",
    xfnDependencies: ["Content Marketing", "Product Marketing"],
  },
  {
    key: "content-engine::Content Production",
    inputs: ["Content briefs", "Positioning framework", "ICP data", "Brand guidelines"],
    outputs: ["Draft whitepapers", "Blog posts", "One-pagers", "Sales collateral"],
    dataSources: ["Module 1 positioning", "Brand guidelines", "Existing content library"],
    workflow: [
      { actor: "agent", action: "Produce first drafts (whitepapers, blog posts, one-pagers)" },
      { actor: "human", action: "Edit for quality, accuracy, and strategic alignment" },
      { actor: "human", action: "Approve final versions for publication" },
    ],
    frequency: "Per content brief · Continuous production pipeline",
    handoffPoint: "Approved content → Distribution channels · Performance data → Content Performance Tracking",
    criticalContext: "Agent produces at scale; human ensures every piece meets the quality bar. This is how 2 FTEs produce the content volume of a 10-person team.",
    xfnDependencies: ["Content Marketing", "Legal (for case studies)"],
  },
  {
    key: "website::Landing Page Strategy & Creation",
    inputs: ["ICP data", "Campaign strategy", "Conversion data", "Brand guidelines"],
    outputs: ["Landing pages", "A/B test variants", "Conversion reports"],
    dataSources: ["Website analytics", "Campaign data", "ICP performance data"],
    workflow: [
      { actor: "agent", action: "Build and iterate on landing pages" },
      { actor: "agent", action: "Run A/B tests on layouts, copy, and CTAs" },
      { actor: "human", action: "Approve pages before going live" },
    ],
    frequency: "Per campaign · Continuous optimization",
    handoffPoint: "Live pages → Visitor Intelligence · Conversion data → Channel Effectiveness",
    criticalContext: "The digital destination where all demand gen efforts converge. Quality of landing pages directly impacts conversion rates.",
    xfnDependencies: ["Web Engineering", "Design"],
  },
  {
    key: "test-funding::Test Fund Tracker",
    inputs: ["Committed test budgets", "Deployment data", "Campaign spend data"],
    outputs: ["Live fund status dashboard", "Burn rate alerts", "Remaining budget projections"],
    dataSources: ["SFDC opportunity data", "Campaign spend platforms", "Finance systems"],
    workflow: [
      { actor: "agent", action: "Monitor committed vs. deployed vs. remaining testing dollars in real-time" },
      { actor: "agent", action: "Alert when approaching limits or burn rate is off-track" },
      { actor: "human", action: "Make allocation decisions based on alerts" },
    ],
    frequency: "Real-time monitoring · Daily alerts",
    handoffPoint: "Fund status → Module 4 Test Fund Burn Tracking · Alerts → DRI for allocation decisions",
    criticalContext: "Test funding is the lifeblood of the CTV POC. Running out of test dollars or misallocating them could kill promising tests.",
    xfnDependencies: ["Finance", "Sales"],
  },
  {
    key: "test-funding::Deal Closing & Activation Setup",
    inputs: ["Qualified opportunities", "Contract templates", "Activation requirements"],
    outputs: ["Executed contracts", "Activation packages", "CRM updates"],
    dataSources: ["SFDC", "Contract management system", "Activation checklists"],
    workflow: [
      { actor: "agent", action: "Drive process: contracts, activation info, CRM logging" },
      { actor: "human", action: "Review contracts before sending" },
      { actor: "agent", action: "Set up activation requirements and hand off to Module 3" },
    ],
    frequency: "Per deal · Triggered by deal stage progression",
    handoffPoint: "Closed deal → Module 3 Test Onboarding & Setup",
    criticalContext: "The bridge between sales and customer success. Clean handoff here prevents onboarding delays.",
    xfnDependencies: ["Legal", "Finance", "Customer Success"],
  },
];

// ============================================================================
// MODULE 3 — Customer Activation & Performance Management
// ============================================================================

const module3Ops: SubModuleOps[] = [
  {
    key: "onboarding::Goal & Creative Ingestion",
    inputs: ["Customer goals", "Creative assets", "Campaign requirements", "Historical data"],
    outputs: ["Standardized comparison framework", "Structured intake document", "Campaign brief"],
    dataSources: ["Customer communications", "Creative files", "SFDC opportunity data"],
    workflow: [
      { actor: "human", action: "Lead intake conversation to understand customer's true goals" },
      { actor: "agent", action: "Structure intake into standardized comparison framework" },
      { actor: "human", action: "Validate framework captures customer intent accurately" },
    ],
    frequency: "Per new customer · One-time setup",
    handoffPoint: "Structured intake → Measurement Verification + Campaign Activation",
    criticalContext: "Human-led because understanding the customer's real goals (not just stated goals) requires conversation and judgment. This is a trust-building moment.",
    xfnDependencies: ["Sales (for context handoff)", "GDS"],
  },
  {
    key: "onboarding::Measurement Verification",
    inputs: ["MMP setup details", "Web measurement config", "Customer tech stack"],
    outputs: ["Measurement audit report", "Gap identification", "Remediation checklist"],
    dataSources: ["MMP dashboards", "Customer analytics", "Technical documentation"],
    workflow: [
      { actor: "human", action: "Lead audit of MMP (app) or web measurement setup" },
      { actor: "agent", action: "Run checklist to ensure nothing is missed" },
      { actor: "human", action: "Validate measurement will capture what customer cares about" },
    ],
    frequency: "Per new customer · One-time verification",
    handoffPoint: "Verified setup → Campaign Activation · Gaps → Customer for remediation",
    criticalContext: "Getting measurement right is critical. If measurement is wrong, the entire test is compromised. Human-led because of complexity and stakes.",
    xfnDependencies: ["GDS / Data Science", "MMP partners"],
  },
  {
    key: "monitoring::Performance Monitoring & Issue Detection",
    inputs: ["Campaign performance data", "Benchmarks", "Historical patterns", "Customer KPIs"],
    outputs: ["Anomaly alerts with diagnostics", "Recommended actions", "Performance dashboards"],
    dataSources: ["Campaign platforms", "Analytics dashboards", "Benchmark database"],
    workflow: [
      { actor: "agent", action: "Monitor campaign performance 24/7 for anomalies" },
      { actor: "agent", action: "Flag issues with diagnostics and root cause analysis" },
      { actor: "human", action: "Take action on flagged issues — decide intervention approach" },
    ],
    frequency: "24/7 continuous monitoring · Alerts in real-time",
    handoffPoint: "Critical alerts → Human for immediate action · Patterns → Cross-Account Intelligence",
    criticalContext: "This solves the timezone dependency on the Asia-based DS team. Agent monitors 24/7 so the US-based human can act on issues during their working hours.",
    xfnDependencies: ["GDS / Data Science"],
    learningLoop: "Issue patterns feed Cross-Account Intelligence for systemic learning",
  },
  {
    key: "monitoring::Weekly Customer Touchpoint",
    inputs: ["Performance data", "Trend analysis", "Talking points", "Customer sentiment"],
    outputs: ["Weekly report", "Conversation guide", "Action items"],
    dataSources: ["Campaign platforms", "Sentiment data", "Customer communication history"],
    workflow: [
      { actor: "agent", action: "Prepare reporting, trends, and talking points" },
      { actor: "human", action: "Lead the customer conversation — build relationship, address concerns" },
      { actor: "human", action: "Capture commitments and update action items" },
    ],
    frequency: "Weekly per customer",
    handoffPoint: "Action items → Campaign optimization · Sentiment → Customer Sentiment Capture",
    criticalContext: "Human-led because customer relationships require personal attention. The agent makes the human maximally prepared so the conversation is high-value.",
    xfnDependencies: [],
  },
  {
    key: "performance-readout::Four-Week Performance Report",
    inputs: ["4 weeks of campaign data", "Benchmarks", "Customer KPIs", "Competitive context"],
    outputs: ["Comprehensive performance readout", "Incrementality analysis", "Scale recommendation"],
    dataSources: ["Campaign platforms", "Benchmark database", "Customer KPI framework"],
    workflow: [
      { actor: "agent", action: "Compile comprehensive readout with all performance metrics" },
      { actor: "agent", action: "Compare against benchmarks and customer KPIs" },
      { actor: "human", action: "Review for accuracy and strategic framing" },
      { actor: "human", action: "Deliver to customer with context and recommendations" },
    ],
    frequency: "At 4-week mark per customer test",
    handoffPoint: "Readout → Customer · Scale recommendation → Scale Pitch Package",
    criticalContext: "This is the moment of truth. The 4-week readout determines whether the customer scales, maintains, or churns. Human framing is critical.",
    xfnDependencies: ["GDS / Data Science"],
  },
  {
    key: "performance-readout::Scale Pitch Package",
    inputs: ["Performance readout", "Business case data", "Competitive context", "Customer goals"],
    outputs: ["Scale pitch deck", "Business case document", "Budget expansion proposal"],
    dataSources: ["Performance data", "Competitive database", "Customer KPI framework"],
    workflow: [
      { actor: "agent", action: "Draft business case for expanded budget with data and competitive context" },
      { actor: "human", action: "Refine pitch for the specific customer's decision-making style" },
      { actor: "human", action: "Deliver the scale pitch" },
    ],
    frequency: "Per customer at scale decision point",
    handoffPoint: "Scale decision → Budget Expansion Negotiation · Success → Case Study Pipeline",
    criticalContext: "Agent provides the ammunition; human delivers the pitch. The human knows the buyer's psychology and decision-making process.",
    xfnDependencies: ["Sales"],
  },
  {
    key: "churn-prevention::Leading Indicator Monitoring",
    inputs: ["Engagement data", "Performance benchmarks", "Contact responsiveness", "Sentiment scores"],
    outputs: ["Risk flags", "Early warning alerts", "Churn probability scores"],
    dataSources: ["Campaign platforms", "Email/meeting engagement", "Sentiment data", "Benchmark database"],
    workflow: [
      { actor: "agent", action: "Watch for signals across all accounts: declining engagement, performance below benchmark, unresponsive contacts" },
      { actor: "agent", action: "Score churn probability and generate early warning alerts" },
    ],
    frequency: "Continuous monitoring · Daily risk assessment",
    handoffPoint: "Risk flags → Intervention Trigger agent",
    criticalContext: "Early detection is everything. By the time a customer says they're leaving, it's usually too late. This agent catches the signals before the conversation happens.",
    xfnDependencies: [],
    learningLoop: "Churn patterns feed back to improve the prediction model",
  },
  {
    key: "churn-prevention::Intervention Trigger",
    inputs: ["Risk flags", "Account context", "Intervention playbook", "Historical success rates"],
    outputs: ["Intervention recommendations", "Escalation alerts", "Recovery plans"],
    dataSources: ["Leading Indicator Monitoring output", "Account history", "Recovery playbook"],
    workflow: [
      { actor: "agent", action: "Flag risk and propose specific intervention based on signal type" },
      { actor: "human", action: "Decide whether and how to engage — call, email, executive escalation" },
    ],
    frequency: "Triggered by risk flags",
    handoffPoint: "Intervention decision → Human action · Recovery data → Leading Indicator Monitoring",
    criticalContext: "Agent proposes; human decides. The intervention approach depends on relationship context the agent doesn't have.",
    xfnDependencies: ["Sales leadership (for executive escalation)"],
  },
  {
    key: "case-study::Case Study Trigger & Draft",
    inputs: ["4-week performance data", "Customer profile", "Performance metrics"],
    outputs: ["Case study draft", "Performance highlights", "Customer approval request"],
    dataSources: ["Performance data", "Customer profile", "Campaign results"],
    workflow: [
      { actor: "agent", action: "Flag candidates at four-week mark based on performance" },
      { actor: "agent", action: "Draft case study with performance metrics" },
      { actor: "human", action: "Edit heavily for narrative quality and accuracy" },
    ],
    frequency: "Triggered at 4-week mark per successful test",
    handoffPoint: "Draft → Customer Interview & Approval (human-led)",
    criticalContext: "Case studies are the most powerful sales tool in CTV. Agent identifies candidates and drafts; human ensures the story is compelling and accurate.",
    xfnDependencies: ["Content Marketing", "Legal"],
  },
  {
    key: "cross-account::Pattern Recognition",
    inputs: ["All live test data", "Campaign configurations", "Measurement setups", "Vertical data"],
    outputs: ["Cross-account patterns", "Vertical insights", "Setup recommendations"],
    dataSources: ["All campaign platforms", "SFDC", "Performance databases"],
    workflow: [
      { actor: "agent", action: "Look across all live tests for patterns by vertical, inventory source, campaign setup, measurement config" },
      { actor: "agent", action: "Generate pattern reports with specific evidence and references" },
    ],
    frequency: "Weekly pattern analysis · Continuous monitoring",
    handoffPoint: "Patterns → Learnings Synthesis · Setup recommendations → Onboarding",
    criticalContext: "All outputs must include specific evidence with references, not just synthesis. Humans need to see the 'why' with supporting data.",
    xfnDependencies: ["GDS / Data Science"],
  },
  {
    key: "cross-account::Competitive Performance Database",
    inputs: ["Test results vs competitors", "Win/loss data", "Performance benchmarks"],
    outputs: ["Competitive performance database", "Head-to-head comparisons", "Benchmark reports"],
    dataSources: ["Campaign results", "Customer feedback", "Module 1 competitive intel"],
    workflow: [
      { actor: "agent", action: "Compile and maintain Moloco performance vs. every competitor from every test" },
      { actor: "agent", action: "Generate head-to-head comparison reports" },
    ],
    frequency: "Continuous compilation · Weekly database update",
    handoffPoint: "Competitive data → Module 1 Battlecards · Scale Pitch Package · Sales Engagement",
    criticalContext: "This is the evidence base that makes sales conversations credible. Real performance data, not marketing claims.",
    xfnDependencies: [],
    learningLoop: "Feeds Module 1 Competitor Intelligence and Module 2 Sales Engagement",
  },
  {
    key: "cross-account::Learnings Synthesis",
    inputs: ["Pattern Recognition output", "Competitive data", "Customer feedback", "Performance trends"],
    outputs: ["Synthesis reports with evidence", "Escalation recommendations", "Strategic insights"],
    dataSources: ["All Module 3 sub-module outputs"],
    workflow: [
      { actor: "agent", action: "Produce synthesis with evidence from all live accounts" },
      { actor: "human", action: "Validate accuracy and decide what to escalate" },
    ],
    frequency: "Weekly synthesis · Monthly strategic review",
    handoffPoint: "Validated insights → Module 4 Strength of Conviction Tracker · Product feedback → Engineering",
    criticalContext: "This is where individual customer learnings become system-level intelligence. The human ensures the synthesis is accurate before it influences strategy.",
    xfnDependencies: ["Product", "Engineering", "Executive team"],
  },
  {
    key: "feedback-routing::Product & Engineering Feedback Loop",
    inputs: ["All customer feedback", "Product gap flags", "Feature requests", "Performance issues"],
    outputs: ["Structured feedback database", "Prioritized escalation list", "Product impact analysis"],
    dataSources: ["All Module 3 outputs", "Module 2 Insight Routing", "Customer communications"],
    workflow: [
      { actor: "agent", action: "Aggregate and structure all feedback from across the system" },
      { actor: "human", action: "Prioritize what gets escalated to product and engineering" },
    ],
    frequency: "Continuous aggregation · Weekly prioritization",
    handoffPoint: "Prioritized feedback → Product team · Engineering issues → Engineering",
    criticalContext: "The bridge between customer reality and product development. Without this, customer pain stays in CRM notes and never reaches the people who can fix it.",
    xfnDependencies: ["Product", "Engineering"],
  },
  {
    key: "feedback-routing::Executive Weekly Learnings Report",
    inputs: ["All live account data", "Cross-account patterns", "Strategic insights", "Conviction data"],
    outputs: ["Weekly learnings synthesis", "Strategic interpretation", "Action recommendations"],
    dataSources: ["All Module 3 outputs", "Module 4 data"],
    workflow: [
      { actor: "agent", action: "Draft synthesis across all live accounts with key learnings" },
      { actor: "human", action: "Review and add strategic interpretation" },
      { actor: "human", action: "Decide what to highlight for executive audience" },
    ],
    frequency: "Weekly",
    handoffPoint: "Report → Module 4 Executive Governance · DRI for XFN distribution",
    criticalContext: "This feeds directly into the EOQ2 investment decision. The quality of this report determines whether leadership has the information they need.",
    xfnDependencies: ["Executive team"],
  },
  {
    key: "customer-health::Monthly Customer Health Check",
    inputs: ["Performance data", "Sentiment scores", "Engagement metrics", "Revenue trajectory"],
    outputs: ["Health report per account", "Declining account alerts", "Action recommendations"],
    dataSources: ["Campaign platforms", "Sentiment data", "Revenue data", "Engagement logs"],
    workflow: [
      { actor: "agent", action: "Generate comprehensive health report per account" },
      { actor: "human", action: "Review and act on declining accounts" },
    ],
    frequency: "Monthly per account",
    handoffPoint: "Declining accounts → Churn Prevention · Healthy accounts → Scale Pitch",
    criticalContext: "Long-term customer health is the foundation of the $200M ARR target. This is where retention meets growth.",
    xfnDependencies: ["Sales", "GDS"],
  },
  {
    key: "customer-health::Virtual Customer Advisory Board",
    inputs: ["Customer feedback", "Product hypotheses", "Market trends", "Customer needs"],
    outputs: ["Product co-development insights", "Feature validation data", "Customer engagement scores"],
    dataSources: ["Customer communications", "Survey data", "Product roadmap"],
    workflow: [
      { actor: "human", action: "Lead product co-development conversations with key customers" },
      { actor: "agent", action: "Support with micro-engagement surveys and aggregation" },
      { actor: "human", action: "Synthesize customer input into product recommendations" },
    ],
    frequency: "Quarterly advisory board · Monthly micro-engagements",
    handoffPoint: "Product recommendations → Product team · Validated hypotheses → Product Hypothesis Pipeline",
    criticalContext: "Human-led because product co-development requires trust and strategic relationship management. Customers share more when they feel heard.",
    xfnDependencies: ["Product", "Engineering", "Executive team"],
  },
];

// ============================================================================
// MODULE 4 — Executive Governance & Business Intelligence
// ============================================================================

const module4Ops: SubModuleOps[] = [
  {
    key: "commercial-performance::Global Pipeline Visibility",
    inputs: ["SFDC pipeline data", "Regional reports", "Funnel stage data"],
    outputs: ["Global pipeline dashboard", "Trend analysis", "Data quality flags"],
    dataSources: ["Salesforce CRM", "Regional sales reports", "Finance data"],
    workflow: [
      { actor: "agent", action: "Build single view across all regions showing every funnel stage" },
      { actor: "agent", action: "Track conversion rates and identify bottlenecks" },
      { actor: "human", action: "Validate data accuracy and interpret trends" },
    ],
    frequency: "Real-time dashboard · Weekly trend analysis",
    handoffPoint: "Pipeline data → XFN Weekly Prep · Trends → DRI for strategic decisions",
    criticalContext: "This is the single source of truth for pipeline health. The DRI uses this to make resource allocation and strategic decisions.",
    xfnDependencies: ["Sales", "Finance", "Regional GMs"],
  },
  {
    key: "commercial-performance::Stage-by-Stage Conversion Tracking",
    inputs: ["Pipeline stage data", "Historical conversion rates", "Deal velocity data"],
    outputs: ["Stage conversion reports", "Improvement trends", "Bottleneck identification"],
    dataSources: ["SFDC", "Historical pipeline data"],
    workflow: [
      { actor: "agent", action: "Measure whether each stage of the funnel is improving over time" },
      { actor: "agent", action: "Identify which stages have the lowest conversion and why" },
      { actor: "human", action: "Contextualize signals and decide where to intervene" },
    ],
    frequency: "Weekly tracking · Monthly trend review",
    handoffPoint: "Bottlenecks → Relevant module for intervention · Trends → DRI",
    criticalContext: "Conversion tracking tells you WHERE the system is breaking. Without this, you're flying blind on whether improvements are working.",
    xfnDependencies: ["Sales", "Marketing"],
  },
  {
    key: "commercial-performance::Revenue Pacing & ARR Tracking",
    inputs: ["Revenue data", "ARR targets", "Deal pipeline", "Historical pacing"],
    outputs: ["Pacing dashboard", "Trajectory projections", "Risk flags"],
    dataSources: ["Finance systems", "SFDC", "Revenue recognition data"],
    workflow: [
      { actor: "agent", action: "Track pacing toward $200M App ARR target and Web product validation" },
      { actor: "agent", action: "Project trajectory based on current pipeline and conversion rates" },
      { actor: "human", action: "Interpret trajectory and flag risks to leadership" },
    ],
    frequency: "Real-time pacing · Weekly trajectory update",
    handoffPoint: "Pacing data → Exec Communications · Risk flags → DRI for intervention",
    criticalContext: "The $200M App ARR target and Web product validation are THE metrics for the EOQ2 investment decision. This is the scoreboard.",
    xfnDependencies: ["Finance", "Executive team"],
  },
  {
    key: "commercial-performance::Test Fund Burn Tracking",
    inputs: ["Module 2 Test Fund Tracker data", "Deployment data", "Budget commitments"],
    outputs: ["Executive-level fund status", "Allocation recommendations", "Burn rate analysis"],
    dataSources: ["Module 2 Test Fund Tracker", "Finance systems"],
    workflow: [
      { actor: "agent", action: "Aggregate test fund data into executive-level view" },
      { actor: "agent", action: "Analyze burn rate and project remaining runway" },
      { actor: "human", action: "Make allocation decisions and manage budget constraints" },
    ],
    frequency: "Real-time monitoring · Weekly executive summary",
    handoffPoint: "Allocation decisions → Module 2 Test Funding · Executive summary → Exec Communications",
    criticalContext: "Test fund allocation is a strategic lever. Over-investing in a failing test or under-investing in a winning one both have consequences.",
    xfnDependencies: ["Finance", "Sales"],
  },
  {
    key: "learning-goals::Strength of Conviction Tracker",
    inputs: ["All module learnings", "Strategic learning goals", "Evidence from tests", "Customer data"],
    outputs: ["Conviction scores per learning goal", "Evidence maps", "EOQ2 readiness assessment"],
    dataSources: ["All module outputs", "Strategic planning docs", "Test results"],
    workflow: [
      { actor: "agent", action: "Map learnings from across all modules back to the learning goals" },
      { actor: "agent", action: "Score conviction strength based on evidence quality and consistency" },
      { actor: "human", action: "Evaluate strength of conviction from learnings from each weekly cycle" },
      { actor: "human", action: "Determine whether conviction is strong enough for EOQ2 decision" },
    ],
    frequency: "Weekly conviction assessment",
    handoffPoint: "Conviction scores → EOQ2 investment decision · Evidence gaps → Module teams for targeted learning",
    criticalContext: "This is THE sub-module that drives the EOQ2 go/no-go decision. It synthesizes everything the system has learned into actionable conviction levels.",
    xfnDependencies: ["Executive team", "All module leads"],
    learningLoop: "Identifies evidence gaps that drive targeted experiments across all modules",
  },
  {
    key: "operating-rhythm::XFN Leadership Weekly Preparation",
    inputs: ["All module reports", "OKR status", "Blocker list", "Key decisions needed"],
    outputs: ["Auto-generated agenda", "Pre-read document", "Decision items list"],
    dataSources: ["All module dashboards", "OKR tracker", "Blocker database"],
    workflow: [
      { actor: "agent", action: "Auto-generate agenda and pre-read from all modules" },
      { actor: "agent", action: "Identify top decisions needed and blockers to resolve" },
      { actor: "human", action: "Determine what needs XFN management focus this week" },
      { actor: "human", action: "Set the agenda priorities and frame the narrative" },
    ],
    frequency: "Weekly — Monday preparation for Wednesday XFN meeting",
    handoffPoint: "Agenda → XFN leadership team · Decisions → Relevant module owners",
    criticalContext: "This is how the DRI keeps the matrixed organization aligned. Without automated prep, the DRI spends half their week just preparing for meetings.",
    xfnDependencies: ["All XFN leaders", "Regional GMs"],
  },
  {
    key: "operating-rhythm::Customer Success Weekly Preparation",
    inputs: ["Per-customer metrics", "Sentiment data", "Action items", "Escalation flags"],
    outputs: ["Customer status dashboard", "Talking points per account", "Escalation list"],
    dataSources: ["Module 3 outputs", "SFDC", "Sentiment data"],
    workflow: [
      { actor: "agent", action: "Compile per-customer metrics and status" },
      { actor: "agent", action: "Generate talking points and flag escalations" },
      { actor: "human", action: "Add offline context and prioritize discussion topics" },
    ],
    frequency: "Weekly — preparation for CS team sync",
    handoffPoint: "Customer status → CS team meeting · Escalations → DRI for intervention",
    criticalContext: "The human adds the offline context that agents can't capture — relationship dynamics, verbal commitments, strategic importance.",
    xfnDependencies: ["Customer Success team", "GDS"],
  },
  {
    key: "operating-rhythm::OKR & Action Item Tracking",
    inputs: ["EOQ1/EOQ2 deliverables", "Meeting commitments", "Action item database"],
    outputs: ["OKR progress dashboard", "Overdue item alerts", "Completion reports"],
    dataSources: ["OKR system", "Meeting notes", "Action item tracker"],
    workflow: [
      { actor: "agent", action: "Track EOQ1/EOQ2 deliverables and capture commitments from meetings" },
      { actor: "agent", action: "Follow up on delivery and flag overdue items" },
      { actor: "human", action: "Validate completion and escalate blocked items" },
    ],
    frequency: "Continuous tracking · Weekly progress report",
    handoffPoint: "Overdue items → Relevant owners · Blocked items → DRI for escalation",
    criticalContext: "Accountability mechanism for the entire system. Without this, commitments made in meetings evaporate.",
    xfnDependencies: ["All module leads", "XFN leaders"],
  },
  {
    key: "operating-rhythm::Dependency & Blocker Surfacing",
    inputs: ["Cross-functional workflows", "Blocked items", "Resource constraints", "Timeline data"],
    outputs: ["Blocker map", "Intervention recommendations", "Dependency chain analysis"],
    dataSources: ["All module status reports", "OKR tracker", "Resource allocation data"],
    workflow: [
      { actor: "agent", action: "Identify cross-functional blocks and dependency chains" },
      { actor: "agent", action: "Assess impact and recommend intervention approach" },
      { actor: "human", action: "Decide how to intervene — direct action, escalation, or resequencing" },
    ],
    frequency: "Continuous monitoring · Weekly blocker review",
    handoffPoint: "Intervention decisions → Relevant XFN teams · Systemic blockers → Executive escalation",
    criticalContext: "In a matrixed organization, blockers are the #1 killer of velocity. This agent surfaces them before they become crises.",
    xfnDependencies: ["All XFN teams"],
  },
  {
    key: "operating-rhythm::Exec Communications",
    inputs: ["All module summaries", "Key metrics", "Strategic narrative", "Risk flags"],
    outputs: ["Executive updates", "Board-ready summaries", "Strategic narrative documents"],
    dataSources: ["All module dashboards", "Financial data", "Strategic planning docs"],
    workflow: [
      { actor: "agent", action: "Draft exec-appropriate updates synthesizing all modules" },
      { actor: "human", action: "Edit for tone and strategic framing" },
      { actor: "human", action: "Decide what to highlight and what to de-emphasize" },
    ],
    frequency: "Weekly exec updates · Monthly board summaries",
    handoffPoint: "Updates → Executive team · Board summaries → Board of Directors",
    criticalContext: "The DRI's voice to leadership. Tone and framing matter as much as the data. The human ensures the narrative is strategically sound.",
    xfnDependencies: ["Executive team", "Finance", "Board"],
  },
  {
    key: "operating-rhythm::MA Steering Alignment",
    inputs: ["CTV operating model status", "Moloco Ads steering rhythm", "Strategic priorities"],
    outputs: ["Alignment recommendations", "Steering meeting inputs", "Strategic coordination notes"],
    dataSources: ["CTV module outputs", "MA steering docs", "Strategic planning"],
    workflow: [
      { actor: "human", action: "Align CTV operations with broader Moloco Ads steering rhythm" },
      { actor: "human", action: "Represent CTV priorities in MA steering discussions" },
      { actor: "human", action: "Translate MA strategic shifts into CTV operational adjustments" },
    ],
    frequency: "Per MA steering cycle",
    handoffPoint: "Strategic adjustments → All CTV modules · MA inputs → MA steering committee",
    criticalContext: "Human-led because this requires political judgment and organizational navigation. CTV must stay aligned with the broader Moloco Ads strategy.",
    xfnDependencies: ["MA leadership", "Regional GMs", "Product"],
  },
];

// ============================================================================
// LOOKUP FUNCTION
// ============================================================================

const allOps = [...module1Ops, ...module2Ops, ...module3Ops, ...module4Ops];

/**
 * Look up operational metadata for a sub-module.
 * Match by sectionKey::subModuleName or by partial name match.
 */
export function getSubModuleOps(sectionKey: string, subModuleName: string): SubModuleOps | undefined {
  const exactKey = `${sectionKey}::${subModuleName}`;
  const exact = allOps.find((o) => o.key === exactKey);
  if (exact) return exact;
  
  // Fuzzy match by sub-module name
  return allOps.find((o) => o.key.endsWith(`::${subModuleName}`));
}

/**
 * Get all operational metadata for a given section.
 */
export function getSectionOps(sectionKey: string): SubModuleOps[] {
  return allOps.filter((o) => o.key.startsWith(`${sectionKey}::`));
}

export { allOps };
