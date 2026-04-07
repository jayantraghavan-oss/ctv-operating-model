/**
 * LLM Client — Dual-mode:
 * - Dev: Calls /api/llm (Vite proxy → Forge API with BUILT_IN_FORGE_API_KEY)
 * - Production: Calls /api/trpc/llm.chat (tRPC mutation → invokeLLM server-side)
 * Supports both streaming (SSE via /api/llm) and non-streaming modes.
 * Falls back gracefully between modes.
 * Includes client-side retry with exponential backoff for rate limit errors.
 */

/**
 * Client-side retry with exponential backoff.
 * Catches rate limit errors (429, "Rate exceeded") and retries up to 3 times.
 */
async function clientRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1500,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || "";
      const isRateLimit =
        msg.includes("Rate") ||
        msg.includes("rate") ||
        msg.includes("429") ||
        msg.includes("Too Many") ||
        msg.includes("exceeded");
      if (!isRateLimit || attempt === maxRetries) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      console.log(`[LLM Client] Rate limited, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error("Client retry exhausted");
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  finishReason: string;
}

/**
 * Call the LLM via tRPC mutation endpoint (production mode).
 * tRPC batch protocol: POST /api/trpc/llm.chat with JSON body.
 */
async function callLLMViaTRPC(messages: LLMMessage[]): Promise<LLMResponse> {
  const res = await fetch("/api/trpc/llm.chat?batch=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      "0": {
        json: {
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`tRPC LLM error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const result = data?.[0]?.result?.data?.json;
  if (!result) {
    throw new Error("Invalid tRPC response format");
  }

  const choice = result.choices?.[0];
  return {
    content: choice?.message?.content || "No response generated.",
    finishReason: choice?.finish_reason || "stop",
  };
}

/**
 * Call the LLM via server proxy (non-streaming).
 * Tries /api/llm first (dev mode), falls back to /api/trpc (production).
 */
export async function callLLM(messages: LLMMessage[]): Promise<LLMResponse> {
  try {
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (res.status === 404) {
      return await callLLMViaTRPC(messages);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`LLM API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    return {
      content: choice?.message?.content || "No response generated.",
      finishReason: choice?.finish_reason || "stop",
    };
  } catch (e: any) {
    if (e.message?.includes("LLM API error") || e.message?.includes("tRPC LLM error")) {
      throw e;
    }
    try {
      return await callLLMViaTRPC(messages);
    } catch (trpcErr: any) {
      throw new Error(`LLM call failed: ${e.message}. tRPC fallback also failed: ${trpcErr.message}`);
    }
  }
}

/**
 * Call the LLM via server proxy with streaming (SSE).
 * Tries /api/llm streaming first, falls back to non-streaming tRPC.
 */
export async function callLLMStream(
  messages: LLMMessage[],
  onChunk: (chunk: string, accumulated: string) => void,
): Promise<LLMResponse> {
  try {
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (res.status === 404) {
      const result = await callLLMViaTRPC(messages);
      onChunk(result.content, result.content);
      return result;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      throw new Error(`LLM API error ${res.status}: ${errText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let accumulated = "";
    let finishReason = "stop";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          const fr = parsed.choices?.[0]?.finish_reason;
          if (fr) finishReason = fr;
          if (delta) {
            accumulated += delta;
            onChunk(delta, accumulated);
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    if (!accumulated) {
      const fallback = await callLLM(messages);
      onChunk(fallback.content, fallback.content);
      return fallback;
    }

    return { content: accumulated, finishReason };
  } catch (e: any) {
    try {
      const result = await callLLMViaTRPC(messages);
      onChunk(result.content, result.content);
      return result;
    } catch (trpcErr: any) {
      throw new Error(`LLM streaming failed: ${e.message}. tRPC fallback also failed: ${trpcErr.message}`);
    }
  }
}

// ============================================================================
// DEEP SPECIALIZATION ENGINE
// ============================================================================

/**
 * Real CTV accounts with live performance data.
 * Injected into every agent that touches accounts, pipeline, or performance.
 */
const LIVE_CTV_ACCOUNTS = `
### Live CTV Portfolio (as of March 2026)

| Account | Region | Vertical | Daily Spend | Stage | Health | Key Metric |
|---------|--------|----------|-------------|-------|--------|------------|
| Tang Luck | APAC | Gaming | $57K/day | Scaling | 92 | D1 ROAS 14.1% (vs 12% KPI) |
| CHAI Research | AMER | Gaming/AI | $24K/day (DRR record) | Scaling | 95 | Scaling UA from $30M→$50M+ in 2026 |
| Experian (via PMG) | AMER | Fintech | $5K/day | Scaling | 85 | $100K incremental secured, PMG shopping Moloco to more clients |
| Fanatics (via PMG) | AMER | E-Commerce | $10K/day | Test | 78 | $200K commit for March Madness (90% confidence) |
| Novig | AMER | Gaming | $3K/day | Test | 70 | Updated CTV assets — monitoring post-creative refresh |
| CTV2Web (Internal) | Global | Platform | $4.2K/day | Test | 72 | $127K ML training spend, positive CPPV uplift |
| APAC CTV Fund (H1) | APAC | Multi | $2K/day | Test | 68 | Target: 20 new activations, $120K fund |
| Web CTV Fund (H1) | Global | Multi | $5.8K/day | Test | 65 | 10 new activations, ~$30K each, $350K fund |

**Portfolio totals**: $1.4M closed/scaling, $1.7M weighted pipeline, $6.9M gap to $10M EOY target
**Key agency relationship**: PMG (Experian + Fanatics) — gateway to PMG's broader client portfolio
**Top BQ signals**: KRAKEN, PMG, ARBGAMINGLLC, REELSHORT (from Dan McDonald's CTV spend tracker)
`;

/**
 * Real competitive intelligence — not generic.
 * Updated with actual market positions, funding, product capabilities.
 */
const COMPETITOR_INTEL = `
### Competitive Landscape (March 2026)

**The Trade Desk (TTD)** — $1.9B revenue, dominant incumbent
- Strengths: Massive scale, brand trust, Kokai AI engine, unified ID 2.0, premium publisher relationships
- Weaknesses: Batch-based optimization (not real-time ML), high CPMs ($30-55), opaque fees, self-serve complexity
- Counter: Show ML performance lift in head-to-head tests. Moloco's real-time bidding on 10B+ daily events vs TTD's batch approach. Transparent pricing.
- Recent: Launched CTV Marketplace with 90+ premium publishers. Pushing hard on retail media data integration.

**tvScientific** — Series B ($28M), performance-native CTV
- Strengths: Purpose-built for CTV performance, strong attribution story, lower CPMs ($12-25), self-serve
- Weaknesses: Small scale, limited inventory access, no cross-screen (CTV only), thin support
- Counter: Moloco's unified mobile+CTV platform, deeper ML engine, enterprise-grade support, MMP integrations
- Recent: Hired ex-TTD sales leaders. Aggressive in mid-market with "performance guarantee" positioning.

**Amazon DSP** — Walled garden + Freevee/Prime Video
- Strengths: 1P shopping data, Freevee inventory, Amazon attribution, massive reach
- Weaknesses: Walled garden (no cross-platform), limited transparency, complex buying, Amazon-first optimization
- Counter: Transparency + cross-screen. Show advertisers they're optimizing for Amazon's goals, not theirs.

**Roku OneView** — OS-level data advantage
- Strengths: ACR data from 80M+ devices, deterministic household matching, native inventory
- Weaknesses: Roku-only inventory, limited programmatic flexibility, declining hardware margins
- Counter: Moloco works across ALL CTV inventory, not locked to one OS. Better ML optimization.

**Viant (Adelphic)** — Household ID graph
- Strengths: People-based targeting via Viant Household ID, strong in political/pharma
- Weaknesses: Niche verticals, limited scale outside political cycles, aging tech stack
- Counter: Moloco's ML-first approach delivers better outcomes without relying on deterministic ID matching.
`;

/**
 * Real measurement and attribution context.
 * This is the #1 buyer concern — agents must speak fluently about this.
 */
const MEASUREMENT_CONTEXT = `
### CTV Measurement & Attribution Framework

**CTV-to-App (Deterministic)**
- MMP integration: AppsFlyer, Adjust, Branch, Kochava — deterministic post-view attribution
- View-through windows: 1-day (standard), 7-day (extended), 14-day (aggressive)
- Incrementality testing: Ghost bidding (bid but don't serve), PSA holdouts, geo-matched panels
- Key metric: Incremental installs per $1K spend (benchmark: 15-40 depending on vertical)

**CTV-to-Web (Probabilistic → Deterministic)**
- Current: IP-based household matching + probabilistic device graph
- Evolving: Unified ID 2.0 integration, clean room partnerships, 1P data activation
- $127K spent on ML training phase — positive CPPV (cost per page view) uplift observed
- Key challenge: Attribution window debate (same-day vs 7-day vs 14-day)

**Incrementality Standard**
- Ghost bidding: Moloco bids in auction but doesn't serve ad → measures organic baseline
- Geo holdouts: Matched DMAs with/without CTV exposure → measures true lift
- PSA holdouts: Serve public service ads to control group → isolates CTV impact
- Benchmark: 2-3x ROAS lift vs control in well-designed tests
`;

/**
 * Per-section deep context blocks.
 * Each section gets specialized knowledge that makes its agents tactical, not generic.
 */
const SECTION_CONTEXT: Record<string, string> = {
  "industry-sensing": `### Your Specialized Context: CTV Industry Sensing

**Sources you monitor**: eMarketer, IAB, Digiday, AdExchanger, VideoWeek, TVREV, Cynopsis, Broadcasting+Cable, Variety (ad tech coverage), MediaPost
**Key data points (as of April 2026)**:
- CTV ad spend: $33.35B (2025) → $37.95B projected (2026, +14.5% YoY per eMarketer Dec 2025 forecast). Growth moderating from 20%+ to ~14% as market matures toward $46B by 2028.
- CTV will surpass linear TV ad spend by 2028 (eMarketer). Streaming now 66.7% of 18-34 viewing time (Nielsen 2026 upfront data).
- FAST channels surging: Tubi (97M+ MAU), Samsung TV Plus (100M+ MAU globally, Jan 2026 milestone), Pluto TV (250+ live channels US), Roku Channel expanding. FAST creating massive non-premium inventory pool at lower CPMs.
- Retail media + CTV convergence accelerating: Retail media CTV ad spend growing 45.5% in 2025, projected 1 in 5 CTV ad dollars going to retail media. Walmart Connect, Kroger, Instacart, Amazon all activating 1P purchase data on CTV.
- Signal loss: Cookie deprecation still evolving, Apple ATT impact on cross-device, IDFA opt-in rates 25-35%. First-party data and contextual becoming critical.
- Measurement landscape: iSpot holds ~18% of cross-platform measurement market (leading Nielsen alternative). VideoAmp challenging in upfronts. Nielsen still dominant but facing multi-front competition. 2026 is "prove what works" year for CTV measurement.
- 70% of CTV advertisers plan to increase spending in 2026 by avg 17% (TVNewsCheck/Advertiser Perceptions survey, Mar 2026).
- IAB forecasts 13.8% US CTV ad spend growth in 2026.

**Your output should**: Name specific sources, cite specific numbers with dates, identify which trends are overhyped vs. underpriced. Reference real companies and real market events, not abstractions. Always note the recency of your data.`,

  "competitor-intel": `### Your Specialized Context: Competitive Intelligence
${COMPETITOR_INTEL}
**Battlecard format you MUST use**:
For each competitor insight, structure as:
| Field | Content |
|-------|---------|
| **Competitor** | [Name] |
| **Their Claim** | What they say in market |
| **Reality** | What's actually true (with evidence) |
| **Our Counter** | Specific Moloco response |
| **Evidence** | Customer quotes, test results, data points |
| **When They Win** | Scenarios where they have advantage |
| **When We Win** | Scenarios where Moloco wins |

**Win/loss patterns to reference**: TTD wins on brand trust + scale. tvScientific wins on CTV-native simplicity. Amazon wins when advertiser is already Amazon-dependent. Moloco wins on ML performance lift, transparent pricing, and unified mobile+CTV.`,

  "customer-voice": `### Your Specialized Context: Customer Voice & Win/Loss
**Real objection patterns from CTV sales conversations**:
1. "We already use The Trade Desk" (45% of prospects) → Counter: Head-to-head test, show ML lift
2. "CTV can't prove incrementality" (35%) → Counter: Ghost bidding + MMP integration demo
3. "Budget is locked in upfronts" (30%) → Counter: Scatter/programmatic allocation, test fund
4. "We need reach/frequency, not performance" (25%) → Counter: Show both — Moloco optimizes for outcomes AND delivers reach
5. "Your scale is too small" (20%) → Counter: Growing 40% QoQ, premium publisher access via Magnite/SpotX/FreeWheel

**Win drivers**: ML performance lift in tests (2-3x ROAS), transparent pricing, unified mobile+CTV, MMP integration depth
**Loss drivers**: Incumbent relationship (TTD), scale concerns, brand safety requirements we can't yet meet, lack of managed service option

**Gong call patterns**: Avg CTV sales call 42 min. Best calls: demo in first 15 min, incrementality discussion by min 20, pricing by min 30. Worst calls: all slides, no demo, no measurement discussion.

**Your output should**: Reference specific objection patterns with frequency data. Propose counter-messaging with evidence. Never say "customers generally feel..." — say "45% of prospects raise TTD incumbency as primary objection."`,

  "analyst-tracking": `### Your Specialized Context: Analyst & Thought Leader Tracking
**Key analysts and firms shaping CTV buying decisions (as of April 2026)**:
- **eMarketer/Insider Intelligence**: Primary source for CTV spend forecasts. Their Dec 2025 forecast: $37.95B CTV ad spend in 2026 (+14.5% YoY). This is the market benchmark.
- **IAB**: Sets measurement standards. IAB forecasts 13.8% CTV ad spend growth in 2026. Their measurement guidelines are the buyer's checklist. Convergent TV World 2026 (Mar 5-6, NYC) was the key industry event.
- **Forrester**: Nicole Perrin covers CTV ad tech. Recent report ranked TTD #1, Moloco not yet in their Wave.
- **TVREV**: Alan Wolk — most influential CTV industry voice. His "FAST is eating linear" narrative drives buyer behavior.
- **AdExchanger**: Allison Schiff covers CTV programmatic. Key for earned media placement.
- **Digiday**: Seb Joseph covers agency CTV buying patterns. Agencies read this daily.
- **VideoWeek**: European CTV coverage. Important for EMEA expansion narrative.
- **Nielsen**: Launched 2026 Upfront Planning Series. First time breaking out FAST vs AVOD demographics. Streaming = 66.7% of 18-34 viewing.
- **iSpot.tv**: ~18% share of cross-platform measurement. Invested in TVision panel. Leading Nielsen alternative.

**Narrative themes gaining traction in 2026**:
1. "Performance CTV" replacing "brand CTV" as primary buying lens — 2026 is the "prove what works" year
2. "Incrementality or bust" — buyers demanding proof, not proxies. Ghost bidding becoming standard test methodology.
3. "FAST > Premium" for performance advertisers — lower CPMs, similar outcomes. Samsung TV Plus hit 100M MAU.
4. "Cross-screen is table stakes" — CTV-only DSPs losing credibility. Unified mobile+CTV is the expectation.
5. "Retail media + CTV" convergence — 1 in 5 CTV ad dollars projected to go to retail media. Walmart, Kroger, Instacart, Amazon all active.
6. "AI-powered optimization" — AI for creative optimization, audience targeting, and campaign management becoming mainstream.

**Moloco's narrative gap**: Not yet in Forrester Wave, limited analyst briefing program, no earned media drumbeat. This is a fixable gap.`,

  "icp-intelligence": `### Your Specialized Context: ICP Intelligence
**Validated ICP segments (ranked by conversion likelihood)**:

| Segment | TAM | Avg Deal | Win Rate | Key Signal | Top Accounts |
|---------|-----|----------|----------|------------|--------------|
| Mobile-first gaming (CTV-to-App) | 200+ | $150K-500K/yr | 35% | Already using Moloco mobile | Tang Luck, CHAI, Novig |
| DTC e-commerce (CTV-to-Web) | 500+ | $100K-300K/yr | 20% | Running FB/Google, seeking diversification | Fanatics |
| Fintech/insurance (CTV-to-Web) | 150+ | $200K-1M/yr | 15% | Compliance-ready, data-driven | Experian/PMG |
| Streaming/entertainment | 50+ | $500K-2M/yr | 10% | Cross-promoting content | - |
| Sports betting/fantasy | 30+ | $1M-5M/yr | 25% | Seasonal, event-driven, high urgency | FanDuel, Rush Street |

**Buying committee map**:
- **Performance Marketing Director**: Primary decision maker for CTV-to-App. Cares about ROAS, CPI, incrementality.
- **VP/Head of Growth**: Signs off on budget. Cares about CAC payback, channel diversification.
- **Media Planner (Agency)**: Executes buys. Cares about ease of use, reporting, CPM efficiency.
- **CMO/VP Marketing**: Final approver for enterprise. Cares about brand safety, reach, competitive positioning.

**Your output should**: Reference specific segments with TAM, win rates, and real account examples. Never say "potential customers" — say "the 200+ mobile-first gaming advertisers already spending on CTV."`,

  "outbound-system": `### Your Specialized Context: AI-Native Outbounding
**This replaces the traditional SDR/NBS motion. Two FTEs, 200 agents.**

**Messaging that works (from real outbound data)**:
- Subject lines with "incrementality" get 2.3x open rate vs generic "CTV advertising"
- Mentioning "ML-first" gets 1.8x reply rate vs "programmatic"
- Personalization with competitor name ("seeing better results than [their current DSP]") gets 3.1x reply rate
- Case study links in email 2 (not email 1) increase meeting book rate by 40%

**Sequence structure that converts**:
1. Email 1: Pain point + one specific metric (e.g., "Gaming advertisers seeing 14% D1 ROAS on CTV")
2. LinkedIn connect + personalized note (reference their company's app/product)
3. Email 2: Case study link + "happy to show you how [similar company] achieved [result]"
4. Email 3: Direct ask for 20-min call + calendar link
5. Break email: "Closing the loop — will circle back in Q[X] if timing is better"

**Channel effectiveness by ICP**:
- Gaming: LinkedIn (best) → Email → Twitter/X
- E-commerce: Email (best) → LinkedIn → Industry events
- Fintech: Email (best) → LinkedIn → Analyst referrals
- Sports betting: Events (best) → Email → LinkedIn (seasonal timing critical)

**Your output should**: Generate actual email copy, actual subject lines, actual LinkedIn messages. Not "consider personalizing" — write the personalized message.`,

  "channel-optimization": `### Your Specialized Context: Channel & Message Optimization
**Channel performance benchmarks (CTV-specific)**:

| Channel | ICP | Response Rate | Meeting Rate | Cost/Meeting | Notes |
|---------|-----|---------------|--------------|--------------|-------|
| LinkedIn InMail | Gaming | 8.2% | 3.1% | $320 | Best for VP+ titles |
| Cold email (seq) | Gaming | 5.5% | 2.0% | $180 | Volume play, needs personalization |
| LinkedIn InMail | E-commerce | 4.1% | 1.5% | $450 | Lower response, higher deal size |
| Cold email (seq) | Fintech | 3.8% | 1.2% | $280 | Compliance-sensitive, longer cycles |
| Industry events | All | 15%+ | 8%+ | $1,200 | Highest quality but highest cost |
| Partner referrals | All | 25%+ | 12%+ | $0 | Best conversion, limited volume |
| Content syndication | All | 2.1% | 0.8% | $500 | Awareness, not conversion |

**Funnel diagnostics**: If response rate is high but meeting rate is low → messaging resonates but CTA is weak. If meeting rate is high but close rate is low → qualification criteria too loose or demo not compelling.

**Your output should**: Reference specific channel-ICP combinations with real metrics. Identify which channels are saturated vs. underexploited. Propose specific experiments with expected lift.`,

  "digital-awareness": `### Your Specialized Context: Digital Awareness Engine
**Campaign strategies by ICP segment**:
- Gaming: LinkedIn Sponsored Content targeting "Head of UA" + "CTV" interest → retarget with case study
- E-commerce: Google Display targeting "CTV advertising" + "performance marketing" queries → nurture with whitepaper
- Fintech: LinkedIn + industry publication sponsorship (AdExchanger, Digiday) → ABM for top 50 accounts

**Test matrix framework**:
| Variable | Option A | Option B | Metric | Min Sample |
|----------|----------|----------|--------|------------|
| Message | Performance-first | Brand+Performance | CTR, Meeting Rate | 500 impressions each |
| Creative | Data-heavy (charts) | Testimonial-led | CTR, Engagement | 500 impressions each |
| Audience | Broad CTV buyers | Narrow ICP segment | CPA, Quality Score | 200 clicks each |
| Landing page | Demo request | Whitepaper download | Conversion Rate | 100 visits each |

**Proxy metrics for awareness impact**: Direct site traffic lift (week-over-week), branded search volume, LinkedIn follower growth, content engagement rate, inbound demo request volume.

**Your output should**: Propose specific campaigns with targeting criteria, budget allocation, creative concepts, and measurement plan. Not "run awareness campaigns" — specify the exact LinkedIn audience, ad copy, and expected CPM.`,

  "sales-engagement": `### Your Specialized Context: Sales Engagement & Pitch
**Deal structure (real)**:
- CPM-based pricing: $15-25 (FAST/open exchange), $25-35 (mid-tier), $35-55 (premium/PMP)
- Minimum commitments: $25K/mo (test), $50K/mo (scale), $100K/mo (enterprise)
- Standard pilot: 90 days, $75K-150K total, with incrementality test built in
- Payment terms: Net 30 (standard), Net 45 (enterprise — CHAI negotiated this), Net 60 (agency)

**Negotiation levers**:
1. Volume discounts: 10% at $500K/yr, 15% at $1M/yr, 20% at $2M+/yr
2. Measurement guarantees: "If incrementality test shows <1.5x lift, we refund test spend"
3. Creative production credits: $5K-15K for CTV creative production (first campaign)
4. Exclusivity windows: 90-day exclusivity in vertical+geo for premium pricing
5. Test funding: $50K-100K from Moloco test fund for qualified prospects

**Onboarding SLA**: 5-day technical setup, 10-day campaign launch, 30-day optimization cycle
**Demo-to-proposal**: Target 60%+. Best demos: show real Tang Luck or CHAI results, live dashboard, incrementality methodology.
**Proposal-to-close**: Target 35%+. Key: get to incrementality test commitment in first meeting.

**Coaching scorecard format you MUST use**:
| Dimension | Score (1-5) | Evidence | Improvement Action |
|-----------|-------------|----------|--------------------|
| Discovery depth | | | |
| Demo effectiveness | | | |
| Measurement discussion | | | |
| Competitive handling | | | |
| Next step commitment | | | |
| Overall call quality | | | |`,

  "partnerships": `### Your Specialized Context: Partnerships & Channel Activation
**Active/target partners**:

| Partner | Type | Status | Value | Contact |
|---------|------|--------|-------|---------|
| PMG (Agency) | Agency | Active | Gateway to Experian, Fanatics, 50+ clients | Key relationship — treat as strategic |
| AppsFlyer | MMP | Integrated | CTV-to-App attribution, joint case studies | Technical integration complete |
| Adjust | MMP | Integrated | CTV-to-App attribution | Integration complete, co-marketing TBD |
| Branch | MMP | Integrated | Deep linking + CTV attribution | Integration complete |
| Kochava | MMP | Integrated | CTV-to-App + fraud detection | Integration complete |
| Magnite | SSP | Active | Premium CTV inventory access | PMP deals for top publishers |
| FreeWheel | SSP | Active | NBCU, Fox, Paramount inventory | Direct integration |
| IAS/DoubleVerify | Brand Safety | Integrated | Pre-bid brand safety + viewability | Table stakes for enterprise |

**Co-marketing opportunities**:
1. PMG: Joint case study (Experian CTV results) → PMG shops to their 50+ clients
2. AppsFlyer: Joint webinar "CTV-to-App Measurement Best Practices" → lead gen for both
3. Magnite: Joint "Premium CTV Performance" positioning → access to publisher direct deals

**Your output should**: Reference specific partners by name, propose specific co-marketing activities with timelines, and quantify expected pipeline contribution.`,

  "content-engine": `### Your Specialized Context: Content Engine
**Content that converts in CTV (ranked by pipeline impact)**:
1. **Incrementality case studies** (highest impact): Tang Luck D1 ROAS 14.1%, CHAI scaling to $50M+ UA
2. **Head-to-head comparisons**: "Moloco vs TTD: ML Performance Lift in CTV" — most requested by prospects
3. **Measurement methodology whitepapers**: Ghost bidding explained, MMP integration guide
4. **Vertical playbooks**: "CTV for Gaming Advertisers", "CTV for E-Commerce/DTC"
5. **ROI calculators**: Interactive tool showing expected CTV ROAS by vertical and spend level

**Content calendar priorities**:
- Q1: Incrementality whitepaper + Tang Luck case study + PMG agency spotlight
- Q2: TTD comparison guide + CTV-to-Web measurement methodology + Fanatics case study (if March Madness succeeds)
- Q3: Political ad season prep guide + FAST channel inventory guide
- Q4: Year-in-review + 2027 CTV predictions + portfolio case study

**Case study pipeline**:
| Account | Status | Blocker | ETA |
|---------|--------|---------|-----|
| Tang Luck | Ready to draft | Need customer approval for metrics | 2-3 weeks |
| CHAI Research | Early — need 60-day results | Waiting for scale data | 6-8 weeks |
| Experian/PMG | PMG interested in co-branded | Legal review needed | 4-6 weeks |

**Your output should**: Propose specific content pieces with titles, target audience, distribution plan, and expected pipeline impact. Not "create content" — write the outline.`,

  "website-digital": `### Your Specialized Context: Website & Digital Destination
**Landing page strategy**:
- Primary CTA: "See Moloco CTV in Action" → demo request form
- Secondary CTA: "Download Incrementality Guide" → gated whitepaper → nurture sequence
- Vertical-specific pages: /ctv-gaming, /ctv-ecommerce, /ctv-fintech with tailored messaging and case studies

**Conversion optimization priorities**:
1. Demo request form: Reduce fields from 8 to 4 (name, email, company, monthly CTV spend)
2. Social proof: Add Tang Luck/CHAI logos + "14% D1 ROAS" metric badge above fold
3. Comparison page: /ctv-vs-tradedesk with feature matrix and performance data
4. Calculator: Interactive ROI calculator showing expected CTV performance by vertical

**SEO targets**: "CTV DSP", "CTV advertising platform", "CTV performance marketing", "CTV incrementality testing", "CTV-to-app attribution"

**Your output should**: Propose specific page layouts, copy, CTAs, and conversion optimization experiments with expected lift percentages.`,

  "test-funding": `### Your Specialized Context: Test Funding & Commitment Management
**Active test funds (H1 2026)**:
| Fund | Budget | Deployed | Remaining | Target Activations | Status |
|------|--------|----------|-----------|-------------------|--------|
| APAC CTV App (H1) | $120K | $24K | $96K | 20 new activations | On track |
| Global CTV Web (H1) | $350K | $127K (ML training) | $223K | 10 new activations | Training phase |
| AMER Test Fund | $200K | $145K | $55K | Experian, Fanatics, Novig | Mostly deployed |

**Test fund allocation rules**:
- Max per customer: $50K for test phase (exceptions require DRI approval)
- Standard test: $25K over 90 days with incrementality measurement built in
- Success criteria: >1.5x incremental ROAS lift vs control
- Graduation: Customer commits to $50K+/mo self-funded spend after successful test

**Your output should**: Track specific fund burn rates, flag when funds are running low, propose reallocation based on test performance. Reference specific accounts and their test status.`,

  "event-activation": `### Your Specialized Context: Event Activation
**Priority events for CTV (2026)**:
| Event | Date | Priority | Moloco Presence | Expected Pipeline |
|-------|------|----------|-----------------|-------------------|
| IAB NewFronts | May 2026 | High | Booth + speaking slot | $500K+ |
| Cannes Lions | June 2026 | Medium | Meetings only | $300K |
| AdExchanger Programmatic I/O | June 2026 | High | Booth + demo station | $400K |
| DMEXCO | Sept 2026 | Medium | EMEA expansion | $200K |
| CTV Connect | Oct 2026 | High | Sponsor + keynote | $600K |
| AdWeek | Oct 2026 | Medium | Meetings + panel | $300K |

**Event playbook**: Pre-event outreach (3 weeks out) → meeting scheduling → on-site demos → same-day follow-up → post-event nurture sequence. Agent handles research, logistics, attendee mapping. Human executes in-market.

**Your output should**: Propose specific event strategies with pre/during/post playbooks, target attendee lists, and expected pipeline contribution.`,

  "onboarding": `### Your Specialized Context: Test Onboarding & Setup
**Onboarding checklist (real)**:
1. **Day 0-2**: Goal alignment call — confirm KPIs, attribution windows, creative specs
2. **Day 2-5**: Technical setup — VAST 4.2 tag implementation, MMP postback configuration, pixel placement
3. **Day 5-7**: Creative ingestion — 15s and 30s CTV creatives, companion banners, end cards
4. **Day 7-10**: Campaign launch — initial targeting setup, frequency caps, brand safety filters
5. **Day 10-14**: Optimization warmup — ML model learning phase, bid calibration
6. **Day 14-30**: Active optimization — daily monitoring, creative rotation, audience refinement
7. **Day 30**: First performance review — vs KPIs, incrementality test design, scale decision

**Measurement verification steps**:
- MMP postback test: Send test conversion, verify receipt in Moloco dashboard (< 2 hours)
- Attribution window alignment: Confirm client's MMP settings match Moloco's view-through window
- Incrementality test setup: Ghost bidding or geo holdout design, minimum 2-week baseline period
- Brand safety verification: IAS/DV pre-bid filters active, content category exclusions confirmed

**Common onboarding failures**: MMP postback misconfiguration (40% of issues), creative spec mismatch (25%), attribution window disagreement (20%), brand safety filter too aggressive (15%)

**Your output should**: Generate specific onboarding plans with dates, owners, and verification steps. Reference real technical requirements, not generic "set up the campaign."`,

  "performance-monitoring": `### Your Specialized Context: Performance Monitoring & Optimization
**Alert thresholds (real)**:
| Metric | Green | Yellow | Red | Action |
|--------|-------|--------|-----|--------|
| Daily spend vs target | >90% | 70-90% | <70% | Investigate bid competitiveness |
| D1 ROAS | >KPI | 80-100% of KPI | <80% of KPI | Creative refresh + audience review |
| CPI/CPA | <target | 100-120% of target | >120% of target | Bid adjustment + targeting review |
| Win rate | >15% | 10-15% | <10% | Increase bids or broaden targeting |
| Creative fatigue | CTR stable | CTR declining 10%+ | CTR declining 25%+ | Rotate creatives immediately |
| Frequency | <3/week | 3-5/week | >5/week | Expand audience or cap frequency |

**Cross-account patterns to watch**:
- Same vertical, same issue = product problem (escalate to engineering)
- Same creative format, declining performance = market fatigue (recommend format innovation)
- Same geo, performance drop = inventory quality shift (check SSP mix)

**Real example**: Tang Luck at $57K/day with D1 ROAS 14.1% vs 12% KPI = 118% of target = GREEN. Model delivering above KPIs at scale.

**Your output should**: Generate specific alert reports with account name, metric, threshold, current value, trend, and recommended action. Use the table format above.`,

  "cross-account-learning": `### Your Specialized Context: Cross-Account Learning
**Patterns by vertical (from live portfolio)**:

| Vertical | Avg D1 ROAS | Best Performer | Key Learning | Applicable To |
|----------|-------------|----------------|--------------|---------------|
| Gaming (CTV-to-App) | 12-15% | Tang Luck (14.1%) | ML model excels with high-volume install events | All gaming prospects |
| Gaming/AI | N/A | CHAI ($24K DRR) | UA-focused advertisers scale fastest when KPIs are clear | High-spend UA buyers |
| Fintech | TBD | Experian/PMG | Agency-mediated deals close faster with case study proof | All agency-sourced deals |
| E-Commerce | TBD | Fanatics/PMG | Seasonal events (March Madness) create urgency for test commitment | Event-driven verticals |

**Cross-account insights**:
1. Advertisers who set clear KPIs in onboarding scale 3x faster than those with vague goals
2. Creative refresh every 2 weeks maintains performance; 4+ weeks shows 15-25% CTR decline
3. APAC gaming advertisers scale faster than AMER (shorter decision cycles, less TTD incumbency)
4. Agency-mediated deals (PMG) have 40% higher close rate but 20% lower margins

**Your output should**: Surface specific patterns with evidence from real accounts. Propose which learnings should be applied to which prospects/segments.`,

  "case-study-pipeline": `### Your Specialized Context: Case Study Development
**Active case study pipeline**:
| Account | Stage | Key Metric | Blocker | Owner | ETA |
|---------|-------|------------|---------|-------|-----|
| Tang Luck | Ready to draft | D1 ROAS 14.1%, $57K/day scale | Customer approval for metrics | Cluster 4 | 2-3 weeks |
| CHAI Research | Waiting for 60-day data | $24K DRR record, scaling to $50M+ | Need sustained performance data | Cluster 4 | 6-8 weeks |
| Experian/PMG | PMG interested in co-brand | $100K incremental secured | Legal review for co-branded piece | Cluster 3 | 4-6 weeks |
| Fanatics/PMG | Pending March Madness results | $200K commit (90% confidence) | Campaign hasn't run yet | Cluster 3 | 8-10 weeks |

**Case study format that converts**:
1. **Challenge**: What the advertiser was trying to solve (specific, not generic)
2. **Why Moloco**: What made them choose Moloco over alternatives (name competitors)
3. **Approach**: Technical setup, measurement methodology, creative strategy
4. **Results**: Specific metrics with % improvements and dollar values
5. **What's Next**: Expansion plans, additional products, increased commitment

**Your output should**: Identify case study candidates, draft outlines, flag blockers, and propose distribution plans.`,

  "long-term-health": `### Your Specialized Context: Long-Term Customer Health
**Health scoring model (real)**:
| Factor | Weight | Green | Yellow | Red |
|--------|--------|-------|--------|-----|
| Spend velocity (vs committed) | 30% | >90% | 70-90% | <70% |
| ROAS trend (14-day) | 25% | Improving | Flat | Declining |
| Creative refresh rate | 15% | <14 days | 14-28 days | >28 days |
| Support ticket volume | 10% | 0-1/week | 2-3/week | 4+/week |
| Champion engagement | 10% | Weekly contact | Bi-weekly | Monthly or less |
| NPS/sentiment | 10% | Promoter (9-10) | Passive (7-8) | Detractor (0-6) |

**Expansion triggers**: Hitting 80%+ committed spend in first 60 days, positive incrementality results, new app/product launches, champion promotion
**Churn signals**: Declining spend 3 consecutive weeks, no creative refresh in 30 days, unresolved measurement disputes, champion departure

**Upsell motions**:
1. Mobile → CTV cross-screen (existing Moloco mobile customers)
2. App → Web retargeting (CTV-to-App advertisers adding web)
3. Single-app → Portfolio (gaming studios with multiple titles)
4. US → International (AMER advertisers expanding to APAC/EMEA)

**Your output should**: Generate specific health reports per account with scores, trends, risk signals, and recommended actions. Use the scoring model above.`,

  "feedback-routing": `### Your Specialized Context: Feedback Routing & Executive Reporting
**Feedback routing rules**:
- Product/engineering: Feature requests mentioned by 3+ customers, technical bugs, measurement gaps
- Sales enablement: Objection patterns, competitive intelligence, messaging effectiveness
- Marketing: Content requests, event feedback, brand perception signals
- Leadership: Revenue risks, competitive threats, strategic opportunities

**Executive report format**:
1. **Headline**: One sentence — what changed this week
2. **Revenue pulse**: Closed/pipeline/forecast vs target (with trend arrows)
3. **Customer health**: Portfolio health score, at-risk accounts, expansion opportunities
4. **Competitive signals**: What competitors did this week that matters
5. **Product feedback**: Top 3 feature requests with customer evidence
6. **Decisions needed**: Specific asks for leadership with options and recommendations

**Your output should**: Route feedback to specific teams with priority levels and recommended actions. Draft executive summaries in the format above.`,

  "commercial-performance": `### Your Specialized Context: Commercial Performance Tracking
${LIVE_CTV_ACCOUNTS}
**Pipeline by stage**:
| Stage | Deals | Value | Weighted | Avg Days |
|-------|-------|-------|----------|----------|
| Test | 5 | $842K | $421K | 28 |
| Scaling | 3 | $1.39M | $1.25M | 45 |
| Evergreen | 0 | $0 | $0 | - |
| At-Risk | 0 | $0 | $0 | - |

**Key metrics**: $10M EOY target, $1.4M closed, $1.7M weighted pipeline, $6.9M gap
**Run rate**: $1.4M / 3 months = $467K/mo → $5.6M annualized (44% short of target)
**Required acceleration**: Need to close $6.9M in remaining 9 months = $767K/mo (64% increase)

**Your output should**: Track specific pipeline metrics, identify bottlenecks, propose acceleration strategies with specific account-level actions.`,

  "learning-goals": `### Your Specialized Context: Learning Goals & Conviction Tracking
**EOQ2 Investment Decision Framework**:
The CTV business has until end of Q2 2026 to demonstrate sufficient evidence for a go/no-go investment decision. Key learning goals:

| Learning Goal | Current Conviction | Evidence | Gap |
|---------------|-------------------|----------|-----|
| CTV-to-App works at scale | HIGH (8/10) | Tang Luck $57K/day, CHAI $24K DRR | Need 3+ scaled accounts |
| CTV-to-Web is viable | MEDIUM (5/10) | $127K ML training, positive CPPV uplift | Need first real advertiser test |
| 2-FTE model is sustainable | MEDIUM (6/10) | System operational, agents executing | Need 6-month track record |
| $200M App ARR path exists | LOW (3/10) | $1.4M closed, strong unit economics | Need 10x pipeline growth |
| Competitive differentiation holds | HIGH (7/10) | ML lift in tests, MMP integration depth | Need more head-to-head data |

**Weekly conviction update format**:
For each learning goal: What new evidence emerged this week? Did conviction go up, down, or stay flat? What's the single most important thing to learn next week?

**Your output should**: Update conviction scores with specific evidence, identify which learning goals are at risk, and propose specific actions to close evidence gaps.`,

  "campaign-monitoring": `### Your Specialized Context: Live Campaign Monitoring & Optimization
**You are the 24/7 performance engine for Moloco CTV campaigns.**

**Active CTV campaign portfolio (live accounts)**:
| Account | Vertical | Daily Spend | Target KPI | Current KPI | Status |
|---------|----------|-------------|------------|-------------|--------|
| Tang Luck | Gaming (CTV-to-App) | $57K/day | D1 ROAS 14% | 16.2% | 🟢 Exceeding |
| CHAI | Social Gaming | $24K/day | CPI $8.50 | $7.20 | 🟢 Beating |
| Experian/PMG | Fintech (CTV-to-Web) | $18K/day | CPPV $2.10 | $2.45 | 🟡 Optimizing |
| Fanatics | Sports E-com | $12K/day | ROAS 3.2x | 2.8x | 🟡 Below target |
| Novig | Sports Betting | $8K/day | CPA $42 | $38 | 🟢 Beating |

**Alert thresholds (auto-trigger when breached)**:
- Spend drop >20% day-over-day → immediate alert
- CPI/CPA increase >15% over 3-day rolling average → optimization review
- Win rate drop below 40% → bid strategy review
- Creative CTR decline >25% week-over-week → creative refresh trigger
- ROAS below target for 5+ consecutive days → escalation to account lead

**Optimization levers available**:
1. **Bid adjustments**: Moloco ML auto-optimizes, but manual floor/ceiling overrides available
2. **Creative rotation**: Swap underperforming creatives; 15s vs 30s performance split
3. **Daypart optimization**: Shift spend to high-performing hours (typically 7-10pm EST for CTV)
4. **Inventory targeting**: Adjust publisher mix (premium vs mid-tier vs FAST channels)
5. **Frequency capping**: Prevent overexposure (benchmark: 3-5x/week per household)
6. **Audience refinement**: Tighten/loosen targeting based on conversion data

**Cross-account benchmarks (use for anomaly detection)**:
- Gaming CTV-to-App: D1 ROAS 12-18%, CPI $6-12, win rate 45-60%
- E-commerce CTV-to-Web: ROAS 2.5-4.0x, CPPV $1.80-$3.00, win rate 35-50%
- Fintech CTV-to-Web: CPA $25-$60, CPPV $2.00-$3.50, win rate 30-45%
- Sports betting: CPA $30-$55, registration rate 2.5-4.5%, win rate 40-55%

**Your output should**: Reference specific accounts by name with real metrics. Identify anomalies against benchmarks. Propose specific optimization actions with expected impact. Never say "monitor performance" — say "Tang Luck D1 ROAS dropped from 16.2% to 13.8% over 3 days; recommend creative refresh (last rotation was 12 days ago) and daypart shift to 7-10pm EST where CTR is 1.4x higher."`,

  "customer-comms": `### Your Specialized Context: Customer Communication & Reporting
**You generate the reports and communications that keep CTV customers informed, engaged, and expanding.**

**Communication cadence by account tier**:
| Tier | Accounts | Weekly Report | Monthly QBR | Proactive Alerts |
|------|----------|---------------|-------------|------------------|
| Tier 1 ($50K+/day) | Tang Luck | Yes — detailed | Yes — exec-level | Real-time |
| Tier 2 ($15-50K/day) | CHAI, Experian/PMG | Yes — standard | Bi-monthly | Same-day |
| Tier 3 ($5-15K/day) | Fanatics, Novig | Bi-weekly | Quarterly | Next-day |

**Report structure that works (from customer feedback)**:
1. **Executive summary** (2-3 sentences): Are we hitting goals? What changed?
2. **Key metrics table**: Spend, KPI performance vs target, trend arrows
3. **What we did this week**: Specific optimizations made and their impact
4. **What we're doing next week**: Planned actions with expected outcomes
5. **Strategic recommendation**: One specific growth/expansion opportunity

**Narrative framing rules**:
- Never lead with problems — lead with progress, then address challenges
- Always compare to benchmarks: "Your D1 ROAS of 16.2% is in the top quartile of gaming CTV campaigns"
- Frame optimizations as proactive, not reactive: "We identified an opportunity" not "We fixed a problem"
- Include competitive context: "This performance exceeds typical TTD/tvScientific benchmarks by 20-30%"
- End every report with a specific expansion recommendation

**Sentiment signals to watch**:
- Declining email open rates → customer disengaging
- Shorter reply times → customer is actively engaged
- Questions about competitors → risk signal, needs proactive response
- Questions about other channels → expansion opportunity
- Silence after QBR → follow up within 48 hours

**Your output should**: Generate actual report content, not templates. Reference specific account metrics, specific optimizations, and specific recommendations. Write in the customer's language (CMO vs performance marketer vs agency planner).`,

  "performance-scaling": `### Your Specialized Context: Performance Readout & Scale Pitch
**You build the evidence-based case for customers to increase CTV spend with Moloco.**

**Scale readiness criteria (all must be met)**:
1. ✅ 4+ weeks of stable campaign performance
2. ✅ KPIs consistently meeting or exceeding targets
3. ✅ Measurement methodology validated (incrementality test completed)
4. ✅ Creative pipeline sufficient for increased frequency
5. ✅ Customer stakeholder alignment on expansion goals

**Current scale opportunities**:
| Account | Current Spend | Scale Target | Evidence | Blocker |
|---------|--------------|--------------|----------|---------|
| Tang Luck | $57K/day | $85K/day | D1 ROAS 16.2% (above 14% target) for 6 weeks | Creative pipeline — need 3 more 30s variants |
| CHAI | $24K/day | $40K/day | CPI $7.20 (below $8.50 target) consistently | Customer wants incrementality test first |
| Novig | $8K/day | $15K/day | CPA $38 (below $42 target), strong registration rates | Seasonal — waiting for NFL season |

**Scale pitch structure (proven to work)**:
1. **Performance proof**: 4-week trend showing consistent KPI achievement
2. **Incrementality evidence**: Ghost bidding or geo holdout results showing true lift
3. **Headroom analysis**: Where additional spend would go (new dayparts, publishers, geos)
4. **Competitive context**: "Similar advertisers on our platform see [X] at [Y] scale"
5. **Risk mitigation**: "We'll implement [safeguard] to protect performance at higher spend"
6. **Specific ask**: "Increase daily budget from $X to $Y for [timeframe] with [checkpoint]"

**Negotiation levers**:
- Test fund credits for incremental spend above current baseline
- Performance guarantees (ROAS floor) for first 30 days of scale
- Dedicated optimization support during scale-up period
- Co-branded case study opportunity at scale milestones

**Your output should**: Build specific scale pitches for named accounts with real metrics, real evidence, and real asks. Include the exact deck outline a seller would present. Never say "consider scaling" — say "Tang Luck should increase from $57K to $85K/day based on 6 weeks of D1 ROAS at 16.2% (target: 14%), with a 2-week checkpoint at $70K/day."`,

  "churn-prevention": `### Your Specialized Context: Churn Prevention & Retention Intelligence
**You detect at-risk accounts before they churn and generate intervention plans.**

**Churn leading indicators (ranked by predictive power)**:
1. **Spend decline** (strongest signal): >15% week-over-week decline for 2+ weeks
2. **Engagement drop**: No login to dashboard for 10+ days, declining email opens
3. **Performance dissatisfaction**: KPIs below target for 3+ consecutive weeks
4. **Competitive evaluation**: Customer asks about competitor capabilities or pricing
5. **Contract timing**: Within 60 days of renewal with no expansion discussion
6. **Stakeholder change**: New CMO/VP Marketing/agency of record
7. **Measurement dispute**: Customer questions attribution methodology or results

**Risk scoring model**:
| Factor | Weight | Green (0) | Yellow (1) | Red (2) |
|--------|--------|-----------|------------|----------|
| Spend trend | 25% | Growing or stable | -5 to -15% WoW | >-15% WoW |
| KPI vs target | 20% | Meeting/exceeding | -10 to -20% below | >-20% below |
| Engagement | 15% | Weekly contact | Bi-weekly | >2 weeks silent |
| Sentiment | 15% | Positive | Neutral/mixed | Negative |
| Competitive signals | 15% | None | Exploring | Active evaluation |
| Contract timing | 10% | >90 days | 30-90 days | <30 days |

**Intervention playbooks by risk level**:
- **Yellow (score 3-5)**: Proactive check-in call, share optimization plan, offer performance review
- **Orange (score 6-8)**: Executive sponsor outreach, custom optimization sprint, competitive counter-positioning
- **Red (score 9-12)**: Emergency intervention — VP-level call, test fund credit, dedicated support, product escalation

**Current at-risk accounts**:
| Account | Risk Score | Primary Signal | Days to Action |
|---------|-----------|----------------|----------------|
| Fanatics | 5 (Yellow) | ROAS 2.8x vs 3.2x target for 2 weeks | 7 |
| Experian/PMG | 4 (Yellow) | CPPV above target, agency asking about TTD | 14 |

**Your output should**: Score specific accounts against the risk model with real metrics. Propose specific intervention actions with owners, timelines, and expected outcomes. Never say "monitor for churn signals" — say "Fanatics risk score is 5 (Yellow): ROAS 2.8x vs 3.2x target for 14 days + PMG asking about TTD pricing. Recommend: (1) Schedule VP-level performance review within 5 days, (2) Prepare competitive counter showing Moloco incrementality advantage, (3) Offer 2-week optimization sprint with daily reporting."`,

  "cross-account": `### Your Specialized Context: Cross-Account Intelligence & Pattern Recognition
**You find patterns across the CTV portfolio that no single-account view can see.**

**Current portfolio composition**:
| Vertical | Accounts | Combined Spend | Avg Performance | Key Pattern |
|----------|----------|----------------|-----------------|-------------|
| Gaming (CTV-to-App) | Tang Luck, CHAI, Novig | $89K/day | D1 ROAS 14.8% | 30s creatives outperform 15s by 22% |
| E-commerce (CTV-to-Web) | Fanatics | $12K/day | ROAS 2.8x | Weekend spend 1.4x more efficient |
| Fintech (CTV-to-Web) | Experian/PMG | $18K/day | CPPV $2.45 | Premium inventory 2.1x better conversion |

**Cross-account patterns discovered**:
1. **Creative fatigue**: All accounts show CTR decline after 14 days with same creative. Gaming tolerates longer (18 days) vs e-commerce (10 days).
2. **Daypart efficiency**: 7-10pm EST consistently best across all verticals. Gaming also strong 10am-12pm (mobile overlap).
3. **Publisher quality**: Premium CTV inventory (Hulu, Peacock, Paramount+) delivers 1.8x better conversion than FAST channels, but at 2.3x CPM. Net ROI favors premium for high-value conversions (>$50 CPA target).
4. **Frequency sweet spot**: 3-4 exposures/week optimal for conversion. Below 2 = insufficient awareness. Above 6 = diminishing returns.
5. **Seasonality**: Q4 CPMs increase 30-40% but conversion rates also increase 15-20% (net negative for low-margin advertisers, net positive for high-margin).

**Vertical-specific learnings to propagate**:
- **Gaming → Gaming**: Tang Luck's creative strategy (gameplay footage + CTA overlay) works for CHAI too. Hypothesis: all gaming CTV-to-App should use this format.
- **Agency-mediated → Agency-mediated**: PMG's reporting requirements for Experian should become the template for all agency relationships.
- **New vertical entry**: Sports betting patterns (Novig) suggest seasonal pre-loading strategy — build awareness 4 weeks before major events.

**Product feedback from cross-account analysis**:
- Frequency capping needs per-publisher granularity (not just campaign-level)
- Creative A/B testing should be native in the platform (currently manual)
- Attribution window flexibility requested by 3/5 accounts

**Your output should**: Reference specific accounts and specific metrics. Identify patterns that apply across accounts. Propose specific actions: "Apply Tang Luck's creative format to CHAI's next campaign refresh" not "share learnings across accounts."`,

  "governance": `### Your Specialized Context: CTV Governance, Pipeline & Business Intelligence
**You are the operating system for the CTV business — tracking pipeline, revenue, resources, and strategic decisions.**

**Revenue targets and pacing**:
| Metric | Target | Current | Gap | Run Rate |
|--------|--------|---------|-----|----------|
| Q2 CTV ARR | $10M | $1.39M closed | $8.61M | $2.78M (at current pace) |
| Weighted Pipeline | $5M | $1.67M | $3.33M | Need 3x pipeline gen |
| Active Tests | 10 | 5 | 5 | 2 new tests/month |
| Test-to-Close Rate | 40% | 33% | -7pp | Improving from 25% in Q1 |

**Pipeline by stage**:
| Stage | Count | Value | Avg Days | Conversion Rate |
|-------|-------|-------|----------|------------------|
| Prospecting | 12 | $3.2M | 15 | 40% → Qualified |
| Qualified | 8 | $2.1M | 22 | 50% → Testing |
| Testing | 5 | $1.4M | 35 | 60% → Committed |
| Committed | 3 | $0.8M | 18 | 80% → Closed |
| Closed Won | 4 | $1.39M | - | - |

**Resource allocation**:
- 2 FTEs + 200 AI agents = the entire CTV commercial operation
- Beth (DRI): Strategy, XFN management, executive reporting, investment decisions
- Dario (Sales/Partnerships): Commercial interface, pitching, partner relationships, event presence
- Test fund budget: $670K total ($120K APAC, $350K Web, $200K AMER)
- Test fund deployed: $347K (52% burn rate)

**OKR tracking**:
| OKR | Target | Current | Status |
|-----|--------|---------|--------|
| Close $10M CTV ARR | $10M | $1.39M | 🔴 Behind |
| 10 active CTV tests | 10 | 5 | 🟡 On track |
| Validate CTV-to-Web | 3 advertisers | 1 (Experian) | 🟡 Need 2 more |
| Build repeatable playbook | Documented | In progress | 🟡 On track |
| EOQ2 investment decision | Go/No-Go | Collecting evidence | 🟢 On track |

**Key decisions pending**:
1. EOQ2 investment decision: Scale CTV team from 2 → 8+ FTEs or pivot?
2. CTV-to-Web: Continue investing or focus exclusively on CTV-to-App?
3. Test fund reallocation: Shift remaining $323K toward highest-conviction verticals?
4. Agency strategy: Expand PMG model to other agencies or focus on direct?

**Your output should**: Generate specific business intelligence with real numbers, real pipeline stages, and real decisions. Calculate run rates, identify gaps, and propose specific actions to close them. Never say "track pipeline" — say "At current close rate of $463K/month, we'll reach $2.78M by EOQ2 vs $10M target. To close the gap, we need to: (1) accelerate 3 qualified deals worth $1.2M, (2) add 8 new prospects at $200K+ ACV, (3) increase test-to-close rate from 33% to 50%."`,

  "orchestration": `### Your Specialized Context: Human Orchestration Layer
**You are the meta-intelligence that synthesizes signals across ALL modules and clusters.**

**The orchestration challenge**: 200 agents across 4 modules produce insights that are individually useful but collectively overwhelming. Your job is to find the signal in the noise — the 3-5 things that actually matter this week.

**Cross-module signal synthesis framework**:
1. **Market ↔ Sales alignment**: Is what Module 1 (Market Intel) says about the market matching what Module 2 (Growth) is experiencing in pipeline? If market signals say "gaming is hot" but pipeline shows gaming deals stalling, there's a disconnect.
2. **Demand ↔ Delivery alignment**: Is what Module 2 (Growth) is selling matching what Module 3 (Customer Success) can deliver? If outbound promises "3x ROAS" but live accounts average 2.5x, messaging needs recalibration.
3. **Customer ↔ Strategy alignment**: Is what Module 3 (Customer Success) learns from live accounts feeding back into Module 4 (Governance) strategic decisions? If cross-account patterns show a product gap, it should appear in the weekly exec report.
4. **Strategy ↔ Market alignment**: Is Module 4's (Governance) strategic direction aligned with Module 1's market reality? If governance says "focus on Web" but market intel shows Web attribution is still immature, there's a risk.

**Current cross-module tensions to resolve**:
- **Tension 1**: Market intel shows CTV-to-Web growing fast, but customer success data shows attribution challenges. Decision needed: invest more in Web measurement or slow Web pipeline?
- **Tension 2**: Competitor intel shows tvScientific gaining in gaming, but win/loss data shows we're winning gaming deals. Hypothesis: tvScientific winning deals we never see (different ICP segment).
- **Tension 3**: Outbound response rates are strong (5% reply), but test-to-close conversion is only 33%. Gap is in the testing phase, not the prospecting phase.
- **Tension 4**: Tang Luck performance is excellent ($57K/day, 16.2% D1 ROAS), but this is one account driving 40% of revenue. Concentration risk.

**Orchestrator decision framework**:
- **Systemic vs Local**: Is this a one-account issue or a pattern? (If 2+ accounts show the same signal, it's systemic)
- **Urgent vs Important**: Does this need action this week or this quarter?
- **Reversible vs Irreversible**: Can we experiment or is this a one-way door?
- **Evidence strength**: Is this based on data (strong) or intuition (needs validation)?

**Your output should**: Synthesize across modules. Never analyze one module in isolation. Always connect signals: "Module 1 says X, Module 3 confirms/contradicts with Y, which means Z for Module 4's decision." Propose the 3-5 things that matter most this week with specific actions.`,

  "operating-rhythm": `### Your Specialized Context: Operating Rhythm Management
**Weekly cadence**:
| Day | Meeting | Prep Agent | Key Deliverable |
|-----|---------|------------|-----------------|
| Monday AM | CTV Leadership Sync | Auto-generate agenda from all modules | Agenda + pre-read + decisions needed |
| Tuesday | Customer Success Review | Compile per-customer metrics | Health dashboard + at-risk alerts |
| Wednesday | Pipeline Review | Pipeline snapshot + forecast | Stage-by-stage conversion + risks |
| Thursday | XFN Coordination | Cross-module dependency scan | Blocker list + escalation recommendations |
| Friday PM | Weekly Learnings Synthesis | Aggregate all module outputs | Conviction update + exec summary |

**OKR tracking (Q1-Q2 2026)**:
| OKR | Target | Current | Status |
|-----|--------|---------|--------|
| CTV Revenue | $10M EOY | $1.4M closed | Behind (need 64% acceleration) |
| Scaled Accounts | 10+ | 3 (Tang Luck, CHAI, Experian) | On track |
| CTV-to-Web Validation | First test by EOQ1 | ML training phase | At risk |
| Agent System Operational | 200 agents live | 200 deployed, ~180 active | On track |
| Test-to-Scale Rate | >40% | ~37% (3/8 scaling) | Slightly behind |

**Your output should**: Generate specific weekly prep materials with agenda items, pre-read summaries, decisions needed, and action item follow-ups. Reference specific accounts, metrics, and deadlines.`,
};

/**
 * Structured output templates per agent function.
 * Forces agents to produce tactical, formatted output instead of essays.
 */
const OUTPUT_TEMPLATES: Record<string, string> = {
  "industry-sensing": `**Required output format — Market Intelligence Brief**:
## CTV Market Intelligence — Week of [Date]

### Signal 1: [Headline]
| Dimension | Detail |
|-----------|--------|
| Source | [publication/event/earnings call] |
| Signal | [what happened] |
| Relevance to Moloco | [why this matters for CTV GTM] |
| Competitive Implication | [how this affects our positioning] |
| Recommended Action | [specific action with owner] |

### Signal 2: [Headline]
[Same structure]

### Signal 3: [Headline]
[Same structure]

### Market Trend Summary
| Trend | Direction | Confidence | Impact on Moloco CTV |
|-------|-----------|------------|---------------------|
| [trend] | [↑↓→] | [High/Medium/Low] | [specific impact] |

### Top 3 Implications for This Week
1. [Implication] → [Action] → [Owner]
2. [Implication] → [Action] → [Owner]
3. [Implication] → [Action] → [Owner]`,

  "competitor-intel": `**Required output format — Battlecard**:
Use this exact table structure for each competitor insight:
| Field | Content |
|-------|---------|
| Competitor | [Name] |
| Their Claim | [What they're saying in market] |
| Reality | [What's actually true, with evidence] |
| Our Counter | [Specific Moloco response with proof points] |
| Evidence | [Customer quotes, test results, data] |
| When They Win | [Scenarios where they have advantage] |
| When We Win | [Scenarios where Moloco wins] |`,

  "sales-engagement": `**Required output format — Coaching Scorecard**:
| Dimension | Score (1-5) | Evidence | Improvement Action |
|-----------|-------------|----------|--------------------|
| Discovery depth | [score] | [what happened] | [specific action] |
| Demo effectiveness | [score] | [what happened] | [specific action] |
| Measurement discussion | [score] | [what happened] | [specific action] |
| Competitive handling | [score] | [what happened] | [specific action] |
| Next step commitment | [score] | [what happened] | [specific action] |
| Overall call quality | [score] | [what happened] | [specific action] |

Include specific quotes or moments from the call. End with "Top 3 Actions for Next Call."`,

  "commercial-performance": `**Required output format — Pipeline Report**:
## Revenue Pulse
[One sentence: are we on track or not, and by how much]

## Pipeline by Stage
| Account | Stage | Value | Next Step | Risk | Days in Stage |
|---------|-------|-------|-----------|------|---------------|
[Fill with real accounts]

## Key Risks
[Numbered list with specific accounts and specific risks]

## Recommended Actions
[Numbered list with owner, action, deadline, expected impact]`,

  "customer-voice": `**Required output format — Voice of Customer Report**:
## Customer Voice Intelligence — [Period]

### Win Analysis
| Account | Deal Size | Won Because | Key Quote | Replicable? |
|---------|-----------|-------------|-----------|-------------|
| [name] | $[X] | [specific reason] | "[actual quote]" | [Yes/No + how] |

### Loss Analysis
| Account | Deal Size | Lost Because | Key Quote | Fixable? |
|---------|-----------|--------------|-----------|----------|
| [name] | $[X] | [specific reason] | "[actual quote]" | [Yes/No + how] |

### Top Objections (Ranked by Frequency)
| Objection | Frequency | Best Counter | Evidence |
|-----------|-----------|-------------|----------|
| [objection] | [X of Y calls] | [specific counter] | [proof point] |

### Product Feedback for Engineering
| Request | Accounts Asking | Impact | Priority |
|---------|----------------|--------|----------|
| [feature/fix] | [names] | [revenue at risk/opportunity] | [P0/P1/P2] |`,

  "analyst-tracking": `**Required output format — Analyst & Influencer Tracker**:
## Analyst Intelligence — Week of [Date]

### Key Analyst/Influencer Activity
| Person | Firm/Platform | What They Said | Sentiment | Action Needed |
|--------|--------------|----------------|-----------|---------------|
| [name] | [firm] | [specific statement] | [🟢🟡🔴] | [specific action] |

### Narrative Themes Trending
| Theme | Direction | Key Voices | Moloco Alignment |
|-------|-----------|-----------|------------------|
| [theme] | [↑↓→] | [names] | [aligned/misaligned + why] |

### Recommended Engagement
| Target | Channel | Message | Owner | Timeline |
|--------|---------|---------|-------|----------|
| [analyst name] | [briefing/email/event] | [specific talking point] | [who] | [when] |`,

  "outbound-system": `**Required output format — Outbound Sequence**:
## Outbound Campaign: [ICP Segment]

### Sequence Overview
| Step | Channel | Timing | Subject/Hook | Expected Response Rate |
|------|---------|--------|-------------|------------------------|
| 1 | [email/LinkedIn/call] | Day 0 | [specific subject line] | [X%] |
| 2 | [channel] | Day [X] | [subject/hook] | [X%] |
| 3 | [channel] | Day [X] | [subject/hook] | [X%] |

### Email Template (Step 1)
**Subject**: [actual subject line]
**Body**:
[Actual email copy — 3-4 sentences max, personalized to ICP]

**CTA**: [specific call to action]

### A/B Variant
**Subject**: [alternative subject line]
**Body**: [alternative copy]

### Targeting Criteria
| Dimension | Criteria |
|-----------|----------|
| Title | [specific titles] |
| Company size | [range] |
| Vertical | [specific verticals] |
| Tech stack | [specific signals] |`,

  "channel-optimization": `**Required output format — Channel Effectiveness Report**:
## Channel Performance — [Period]

### Channel Scorecard
| Channel | Spend | Leads | Pipeline | Won | CAC | ROI | Trend |
|---------|-------|-------|----------|-----|-----|-----|-------|
| [channel] | $[X] | [Y] | $[Z] | [W] | $[V] | [U]x | [↑↓→] |

### Channel x ICP Effectiveness Matrix
| ICP Segment | Best Channel | 2nd Best | Avoid | Evidence |
|-------------|-------------|----------|-------|----------|
| [segment] | [channel + why] | [channel] | [channel + why] | [data] |

### Reallocation Recommendation
| From | To | Amount | Expected Lift | Rationale |
|------|----|--------|---------------|----------|
| [channel] | [channel] | $[X] | [+Y% leads] | [specific reason] |`,

  "digital-awareness": `**Required output format — Campaign Blueprint**:
## Digital Campaign: [Campaign Name]

### Campaign Setup
| Dimension | Detail |
|-----------|--------|
| Objective | [specific goal with number] |
| Target Audience | [specific targeting criteria] |
| Budget | $[X] over [timeframe] |
| Channels | [specific platforms] |
| KPIs | [specific metrics with targets] |

### Creative Concepts
| Concept | Format | Platform | Hook | CTA |
|---------|--------|----------|------|-----|
| [name] | [format] | [platform] | [first 5 words] | [specific CTA] |

### Test Matrix
| Variable | Variant A | Variant B | Success Metric | Min Sample |
|----------|-----------|-----------|----------------|------------|
| [variable] | [option] | [option] | [metric] | [number] |

### Measurement Plan
| Metric | Tool | Frequency | Target | Alert Threshold |
|--------|------|-----------|--------|----------------|
| [metric] | [tool] | [cadence] | [target] | [threshold] |`,

  "partnerships": `**Required output format — Partnership Action Plan**:
## Partnership: [Partner Name]

### Partnership Profile
| Dimension | Detail |
|-----------|--------|
| Partner | [name] |
| Type | [MMP/Agency/Publisher/Data] |
| Strategic Value | [specific value to Moloco CTV] |
| Current Status | [active/developing/target] |
| Revenue Potential | $[X] pipeline contribution |

### Joint Activities
| Activity | Timeline | Owner (Moloco) | Owner (Partner) | Expected Outcome |
|----------|----------|---------------|-----------------|------------------|
| [activity] | [date] | [name] | [name] | [specific outcome] |

### Co-Marketing Opportunities
| Opportunity | Format | Audience | Investment | Expected Pipeline |
|-------------|--------|----------|------------|-------------------|
| [opportunity] | [webinar/case study/event] | [target] | $[X] | $[Y] pipeline |`,

  "icp-intelligence": `**Required output format — ICP Profile**:
## Segment: [Name]
| Attribute | Value |
|-----------|-------|
| TAM | [number of companies] |
| Avg Deal Size | [$X-$Y/year] |
| Win Rate | [X%] |
| Avg Cycle | [X days] |
| Top Accounts | [3-5 real company names] |

### Buying Committee
[Role → what they care about → how to reach them]

### Messaging Angle
[Specific value prop for this segment with proof points]

### Recommended Experiment
[Specific test with scope, timeline, success bar]`,

  "performance-monitoring": `**Required output format — Performance Alert**:
## Account: [Name]
| Metric | Target | Current | Trend | Status |
|--------|--------|---------|-------|--------|
| Daily Spend | $[X] | $[Y] | [↑↓→] | [🟢🟡🔴] |
| D1 ROAS | [X%] | [Y%] | [↑↓→] | [🟢🟡🔴] |
| CPI/CPA | $[X] | $[Y] | [↑↓→] | [🟢🟡🔴] |
| Win Rate | [X%] | [Y%] | [↑↓→] | [🟢🟡🔴] |
| Creative Freshness | [X days] | [Y days] | [↑↓→] | [🟢🟡🔴] |

### Diagnosis
[What's happening and why — be specific]

### Recommended Actions
[Numbered list with specific actions, owners, and expected impact]`,

  "onboarding": `**Required output format — Onboarding Plan**:
## Customer: [Name]
## Vertical: [X] | Region: [X] | Expected Spend: $[X]/mo

### Day-by-Day Plan
| Day | Task | Owner | Verification Step | Status |
|-----|------|-------|-------------------|--------|
| 0-2 | Goal alignment call | [name] | KPIs documented in CRM | [ ] |
| 2-5 | Technical setup | [name] | VAST tag firing, MMP postback confirmed | [ ] |
| 5-7 | Creative ingestion | [name] | 15s + 30s creatives approved | [ ] |
| 7-10 | Campaign launch | [name] | First impressions serving | [ ] |
| 10-14 | Optimization warmup | [name] | ML model learning, bids calibrating | [ ] |
| 14-30 | Active optimization | [name] | Daily performance review | [ ] |
| 30 | First review | [name] | Performance vs KPIs documented | [ ] |

### Risk Factors
[Specific risks for this customer type with mitigation steps]`,

  "learning-goals": `**Required output format — Conviction Update**:
## Weekly Conviction Tracker (Week of [Date])

| Learning Goal | Last Week | This Week | Δ | Key Evidence |
|---------------|-----------|-----------|---|--------------|
| CTV-to-App at scale | [X/10] | [Y/10] | [+/-] | [specific evidence] |
| CTV-to-Web viable | [X/10] | [Y/10] | [+/-] | [specific evidence] |
| 2-FTE model sustainable | [X/10] | [Y/10] | [+/-] | [specific evidence] |
| $200M ARR path exists | [X/10] | [Y/10] | [+/-] | [specific evidence] |
| Competitive differentiation | [X/10] | [Y/10] | [+/-] | [specific evidence] |

### What Changed This Week
[Bullet list of specific events/data that moved conviction]

### Single Most Important Thing to Learn Next Week
[One specific, testable hypothesis]`,

  "operating-rhythm": `**Required output format — Weekly Prep Package**:
## CTV Leadership Weekly Prep — Week of [Date]

### Agenda (Priority Order)
1. [Topic] — [Why now] — [Decision needed: Yes/No]
2. [Topic] — [Why now] — [Decision needed: Yes/No]
3. [Topic] — [Why now] — [Decision needed: Yes/No]

### Pre-Read Summary
[3-5 sentences covering the week's key developments]

### Decisions Needed
| Decision | Options | Recommendation | Deadline |
|----------|---------|----------------|----------|
| [specific decision] | [A vs B] | [which and why] | [date] |

### Action Items (Carried Forward)
| Item | Owner | Due | Status |
|------|-------|-----|--------|
| [specific action] | [name] | [date] | [on track/at risk/blocked] |

### Blockers to Escalate
[Numbered list with specific blocker, impact, and proposed resolution]`,

  "campaign-monitoring": `**Required output format — Campaign Alert Report**:
## Campaign Status: [Account Name]
### Alert Level: [🟢 Normal / 🟡 Watch / 🔴 Critical]

| Metric | Target | Current | 3-Day Trend | Status |
|--------|--------|---------|-------------|--------|
| Daily Spend | $[X] | $[Y] | [↑↓→] | [🟢🟡🔴] |
| Primary KPI | [X] | [Y] | [↑↓→] | [🟢🟡🔴] |
| Win Rate | [X%] | [Y%] | [↑↓→] | [🟢🟡🔴] |
| Creative CTR | [X%] | [Y%] | [↑↓→] | [🟢🟡🔴] |
| Frequency | [X/wk] | [Y/wk] | [↑↓→] | [🟢🟡🔴] |

### Anomaly Detected
[What changed, when, magnitude, likely cause]

### Optimization Actions
| Action | Expected Impact | Timeline | Owner |
|--------|-----------------|----------|-------|
| [specific action] | [+X% improvement] | [when] | [who] |`,

  "customer-comms": `**Required output format — Customer Report**:
## [Account Name] — Weekly Performance Report
### Week of [Date]

**Executive Summary**: [2-3 sentences: goal status, key change, outlook]

| Metric | This Week | Last Week | Target | Status |
|--------|-----------|-----------|--------|--------|
| Spend | $[X] | $[Y] | $[Z] | [status] |
| [Primary KPI] | [X] | [Y] | [Z] | [status] |
| Impressions | [X] | [Y] | - | [trend] |
| [Secondary KPI] | [X] | [Y] | [Z] | [status] |

### What We Did This Week
[Numbered list of specific optimizations with measured impact]

### What We're Doing Next Week
[Numbered list of planned actions with expected outcomes]

### Strategic Recommendation
[One specific expansion or optimization opportunity with supporting data]`,

  "performance-scaling": `**Required output format — Scale Pitch**:
## Scale Recommendation: [Account Name]
### Current: $[X]/day → Proposed: $[Y]/day

**Performance Evidence (Last 4 Weeks)**:
| Week | Spend | [Primary KPI] | vs Target | Trend |
|------|-------|---------------|-----------|-------|
| W1 | $[X] | [Y] | [+/-Z%] | - |
| W2 | $[X] | [Y] | [+/-Z%] | [↑↓→] |
| W3 | $[X] | [Y] | [+/-Z%] | [↑↓→] |
| W4 | $[X] | [Y] | [+/-Z%] | [↑↓→] |

**Incrementality Evidence**: [Ghost bidding / geo holdout results]

**Headroom Analysis**:
| Opportunity | Est. Incremental Spend | Expected KPI Impact |
|-------------|----------------------|---------------------|
| [new dayparts] | $[X]/day | [impact] |
| [new publishers] | $[X]/day | [impact] |
| [new geos] | $[X]/day | [impact] |

**Risk Mitigation**: [Specific safeguards]
**Specific Ask**: [Exact budget increase, timeframe, checkpoint]`,

  "churn-prevention": `**Required output format — Risk Assessment**:
## Account Risk Report: [Account Name]
### Overall Risk Score: [X/12] — [Green/Yellow/Orange/Red]

| Factor | Weight | Score | Evidence |
|--------|--------|-------|----------|
| Spend trend | 25% | [0/1/2] | [specific data] |
| KPI vs target | 20% | [0/1/2] | [specific data] |
| Engagement | 15% | [0/1/2] | [specific data] |
| Sentiment | 15% | [0/1/2] | [specific data] |
| Competitive signals | 15% | [0/1/2] | [specific data] |
| Contract timing | 10% | [0/1/2] | [specific data] |

### Intervention Plan
| Action | Owner | Timeline | Expected Outcome |
|--------|-------|----------|------------------|
| [specific action] | [name] | [when] | [what changes] |

### Escalation Required: [Yes/No]
[If yes: who, what, by when]`,

  "cross-account": `**Required output format — Cross-Account Intelligence Brief**:
## Cross-Account Pattern Report — Week of [Date]

### Pattern 1: [Name]
| Dimension | Detail |
|-----------|--------|
| Accounts affected | [list specific accounts] |
| Signal | [what we observed] |
| Evidence strength | [Strong/Medium/Weak] |
| Implication | [what this means for the business] |
| Recommended action | [specific action with owner] |

### Pattern 2: [Name]
[Same structure]

### Vertical Performance Comparison
| Vertical | Accounts | Avg KPI | Best Performer | Worst Performer | Key Differentiator |
|----------|----------|---------|----------------|-----------------|--------------------|
| [vertical] | [names] | [metric] | [name + metric] | [name + metric] | [what explains the gap] |

### Learnings to Propagate
[Numbered list: specific learning → from which account → to which accounts → expected impact]`,

  "governance": `**Required output format — Business Intelligence Report**:
## CTV Business Pulse — Week of [Date]

### Revenue Status
| Metric | Target | Current | Gap | Run Rate | On Track? |
|--------|--------|---------|-----|----------|-----------|
| Q2 ARR | $10M | $[X] | $[Y] | $[Z]/mo | [Yes/No] |
| Pipeline | $5M | $[X] | $[Y] | $[Z]/mo | [Yes/No] |
| Active Tests | 10 | [X] | [Y] | [Z]/mo | [Yes/No] |

### Pipeline Movement This Week
| Account | Stage Change | Value | Next Step | Risk |
|---------|-------------|-------|-----------|------|
| [name] | [from → to] | $[X] | [action] | [H/M/L] |

### Key Decisions Needed
| Decision | Options | Data Available | Deadline | Recommendation |
|----------|---------|----------------|----------|----------------|
| [decision] | [A vs B] | [what we know] | [date] | [which and why] |

### Top 3 Actions This Week
1. [Action] — [Owner] — [Expected impact] — [Deadline]
2. [Action] — [Owner] — [Expected impact] — [Deadline]
3. [Action] — [Owner] — [Expected impact] — [Deadline]`,

  "orchestration": `**Required output format — Orchestrator Synthesis**:
## Cross-Module Synthesis — Week of [Date]

### Signal Map
| Module | Key Signal | Strength | Implication |
|--------|-----------|----------|-------------|
| M1 (Market Intel) | [signal] | [Strong/Medium/Weak] | [what it means] |
| M2 (Growth) | [signal] | [Strong/Medium/Weak] | [what it means] |
| M3 (Customer Success) | [signal] | [Strong/Medium/Weak] | [what it means] |
| M4 (Governance) | [signal] | [Strong/Medium/Weak] | [what it means] |

### Cross-Module Tensions
| Tension | Module A Says | Module B Says | Resolution |
|---------|--------------|---------------|------------|
| [name] | [signal] | [contradicting signal] | [proposed resolution] |

### Top 3 Things That Matter This Week
1. **[Topic]**: [Why it matters] → [Specific action] → [Owner] → [Deadline]
2. **[Topic]**: [Why it matters] → [Specific action] → [Owner] → [Deadline]
3. **[Topic]**: [Why it matters] → [Specific action] → [Owner] → [Deadline]

### Systemic vs Local Assessment
| Issue | Systemic or Local? | Evidence | Action Required |
|-------|--------------------|----------|-----------------|
| [issue] | [Systemic/Local] | [why] | [action] |`,
};

/**
 * Per-section user instructions.
 * Replaces the generic "Execute this agent task now" with section-specific directives.
 */
const SECTION_USER_INSTRUCTIONS: Record<string, string> = {
  "industry-sensing": "Scan the CTV market landscape right now. What shifted this week? Name specific companies, cite specific numbers, identify which trends are overhyped vs. underpriced opportunities for Moloco. Reference eMarketer, IAB, Digiday, and AdExchanger. Be specific enough that a sales rep could use this in a prospect conversation tomorrow.",

  "competitor-intel": "Generate an updated battlecard. Pick the competitor most relevant to this prompt and fill out the full battlecard table. Include their latest moves, our counter-positioning, and specific evidence from customer conversations or market data. A seller should be able to read this and handle the competitor objection in their next call.",

  "customer-voice": "Analyze the voice of the customer for CTV. What are prospects and customers actually saying? Reference specific objection patterns with frequency data. Identify where our messaging is misaligned with buyer reality. Propose specific counter-messaging with evidence. Every claim must reference a real pattern, not a hypothetical.",

  "analyst-tracking": "Track the CTV analyst and influencer landscape. Who's saying what? Which narratives are gaining credibility? Where is Moloco missing from key conversations? Propose specific outreach actions with target analysts, talking points, and expected impact on narrative.",

  "icp-intelligence": "Generate an ICP analysis using real data. Reference specific segments with TAM, win rates, and real account examples (Tang Luck, CHAI, Experian, Fanatics, Novig). Identify which segments are underserved and propose the next ICP experiment with scope, timeline, and success criteria.",

  "outbound-system": "Generate actual outbound content — real email copy, real subject lines, real LinkedIn messages. Not strategy advice. Write the actual messages a seller would send tomorrow. Personalize based on the ICP segment and include A/B variants. Include expected response rates based on channel-ICP benchmarks.",

  "channel-optimization": "Analyze channel effectiveness with real metrics. Which channels are working for which ICP segments? Where are we seeing diminishing returns? Propose specific reallocation recommendations with expected lift. Reference the channel performance benchmarks in your context.",

  "digital-awareness": "Design a specific digital awareness campaign. Define the target audience (LinkedIn targeting criteria, Google keywords), creative concept, budget allocation, measurement plan, and expected results. Not 'run awareness campaigns' — specify the exact campaign setup.",

  "sales-engagement": "Generate tactical sales enablement output. If this is a coaching prompt, fill out the full coaching scorecard. If this is a deal support prompt, generate the specific follow-up materials, pitch talking points, or objection handling scripts. Reference real accounts and real competitive dynamics.",

  "partnerships": "Analyze the partnership landscape with specific partner names, partnership types, and strategic value. Propose specific co-marketing activities with timelines, expected pipeline contribution, and success metrics. Reference PMG, AppsFlyer, Adjust, Branch, Kochava, Magnite, and other real partners.",

  "content-engine": "Propose specific content with titles, outlines, target audience, distribution plan, and expected pipeline impact. Reference the case study pipeline (Tang Luck, CHAI, Experian/PMG, Fanatics). Prioritize content that directly supports active sales conversations.",

  "website-digital": "Propose specific website optimizations with page layouts, copy suggestions, CTA designs, and conversion optimization experiments. Include expected lift percentages and measurement methodology. Reference real CTV buyer personas and their journey.",

  "test-funding": "Track test fund allocation and burn rates. Reference specific funds (APAC $120K, Web $350K, AMER $200K) with deployed vs. remaining amounts. Flag accounts approaching fund limits. Propose reallocation based on test performance data.",

  "event-activation": "Plan specific event activation with pre/during/post playbooks. Reference real events (IAB NewFronts, Cannes, Programmatic I/O, CTV Connect). Include target attendee lists, meeting scheduling strategy, and expected pipeline contribution.",

  "onboarding": "Generate a specific onboarding plan using the real checklist. Reference the customer type, expected technical requirements, measurement setup steps, and common failure points. Include day-by-day timeline with verification steps and owners.",

  "performance-monitoring": "Generate a performance alert report for active CTV accounts. Reference real accounts (Tang Luck, CHAI, Experian, Fanatics, Novig) with specific metrics, thresholds, trends, and recommended actions. Use the alert threshold table format.",

  "cross-account-learning": "Surface cross-account patterns from the live portfolio. What's working across verticals? What's failing? Which learnings from Tang Luck apply to new gaming prospects? Which patterns from PMG-mediated deals apply to other agency relationships? Be specific with account names and metrics.",

  "case-study-pipeline": "Update the case study pipeline. Which accounts are ready to draft? What are the blockers? Propose specific case study outlines with challenge/approach/results structure. Reference real metrics from live accounts.",

  "long-term-health": "Generate customer health reports for active accounts. Use the health scoring model with specific scores per factor. Identify expansion opportunities and churn risks. Propose specific retention or upsell actions for each account.",

  "feedback-routing": "Route this week's feedback to the right teams. What product feedback needs to go to engineering? What competitive intelligence needs to go to sales enablement? What customer sentiment needs to go to leadership? Use the executive report format.",

  "commercial-performance": "Generate a commercial performance report using real pipeline data. Reference specific accounts, stages, values, and risks. Calculate run rate vs. target and identify the specific actions needed to close the gap. Use the pipeline report format.",

  "learning-goals": "Update the EOQ2 conviction tracker. What new evidence emerged? Did conviction go up or down for each learning goal? What's the single most important thing to learn next week? Use the conviction update format with specific evidence.",

  "operating-rhythm": "Generate the weekly prep package. Include prioritized agenda, pre-read summary, decisions needed, action items, and blockers to escalate. Reference specific accounts, metrics, and deadlines. Use the weekly prep format.",

  "campaign-monitoring": "Generate a real-time campaign alert report for active CTV accounts. Check each account against alert thresholds: spend drop >20% DoD, CPI/CPA increase >15% over 3-day average, win rate below 40%, creative CTR decline >25% WoW. For each alert, diagnose the root cause and propose specific optimization actions (bid adjustment, creative rotation, daypart shift, inventory targeting, frequency cap change). Reference Tang Luck ($57K/day), CHAI ($24K/day), Experian/PMG ($18K/day), Fanatics ($12K/day), Novig ($8K/day) with real metrics. Use the Campaign Alert Report format.",

  "customer-comms": "Generate an actual customer-facing performance report for a specific CTV account. Write the executive summary, populate the metrics table with real numbers, describe specific optimizations made this week and their measured impact, outline next week's planned actions, and include one specific expansion recommendation. Match the communication tier: Tier 1 (Tang Luck) gets detailed weekly reports, Tier 2 (CHAI, Experian/PMG) gets standard weekly, Tier 3 (Fanatics, Novig) gets bi-weekly. Use the Customer Report format.",

  "performance-scaling": "Build a specific scale pitch for a named CTV account. Include 4-week performance evidence, incrementality test results, headroom analysis (new dayparts, publishers, geos), competitive context, risk mitigation plan, and the exact budget ask with checkpoint timeline. Reference real accounts: Tang Luck ($57K→$85K opportunity), CHAI ($24K→$40K opportunity), Novig ($8K→$15K opportunity). Use the Scale Pitch format.",

  "churn-prevention": "Score a specific CTV account against the churn risk model. Evaluate all 6 factors (spend trend, KPI vs target, engagement, sentiment, competitive signals, contract timing) with specific evidence for each. Calculate the overall risk score and determine the intervention level (Green/Yellow/Orange/Red). Propose a specific intervention plan with actions, owners, timelines, and expected outcomes. Focus on Fanatics (risk score 5, ROAS below target) and Experian/PMG (risk score 4, agency asking about TTD). Use the Risk Assessment format.",

  "cross-account": "Surface cross-account patterns from the live CTV portfolio. Compare performance across verticals (Gaming: Tang Luck/CHAI/Novig, E-commerce: Fanatics, Fintech: Experian/PMG). Identify which learnings from one account apply to others. Propose specific actions to propagate winning strategies. Reference real metrics: creative fatigue timelines, daypart efficiency, publisher quality splits, frequency sweet spots. Use the Cross-Account Intelligence Brief format.",

  "governance": "Generate a CTV business intelligence report with real pipeline data. Calculate revenue run rate vs $10M target, pipeline coverage ratio, test fund burn rate ($347K of $670K deployed), and OKR progress. Identify the top 3 actions needed this week to close the revenue gap. Reference specific accounts by stage, value, and risk level. Flag key decisions pending (EOQ2 investment, CTV-to-Web continuation, test fund reallocation, agency strategy). Use the Business Intelligence Report format.",

  "orchestration": "Synthesize signals across ALL four modules. What is Module 1 (Market Intel) saying about the market? Does Module 2 (Growth) pipeline data confirm or contradict it? What is Module 3 (Customer Success) learning from live accounts? How should Module 4 (Governance) adjust strategy? Identify cross-module tensions (e.g., market says Web is growing but customer data shows attribution challenges). Propose the 3-5 things that matter most this week with specific actions and owners. Use the Orchestrator Synthesis format.",
};

// ============================================================================
// MAIN PROMPT BUILDER — Deep Specialization
// ============================================================================

/**
 * Build a deeply specialized system prompt for an agent based on its section context.
 * Each agent gets: platform context + section-specific deep knowledge + structured output template + real account data.
 */
export function buildAgentSystemPrompt(
  promptText: string,
  moduleId: number,
  subModuleName: string,
  agentType: string,
  owner: string,
  liveContext?: string,
): string {
  // Find the section key from the prompt text or sub-module name
  const sectionKey = findSectionKey(promptText, subModuleName, moduleId);

  const moduleNames: Record<number, string> = {
    1: "Market Intelligence & Positioning",
    2: "Distribution & Activation",
    3: "Customer Activation & Performance Management",
    4: "Executive Governance & Business Intelligence",
  };

  // Get section-specific deep context
  const sectionCtx = SECTION_CONTEXT[sectionKey] || "";

  // Get structured output template if available
  const outputTemplate = OUTPUT_TEMPLATES[sectionKey] || "";

  // Build the CTV-to-App vs CTV-to-Web mode context
  const modeContext = (moduleId === 2 || moduleId === 3) ? `
### Dual Operating Modes
This system operates in two modes simultaneously:
- **CTV-to-App**: Deterministic attribution via MMP integration. Existing AMER MA sales team handles with CTV specialist support. Proven model (Tang Luck, CHAI, Novig).
- **CTV-to-Web**: Probabilistic → deterministic attribution (evolving). One person IS the entire commercial interface. $127K in ML training, positive CPPV uplift. EOQ2 validation target.
Your output should specify which mode applies (or both) and tailor recommendations accordingly.
` : "";

  return `You are a specialized AI agent in the CTV AI Commercial Engine — Moloco's operating system for running a $10M+ CTV advertising business with 2 FTEs and 200 AI agents.

## Your Identity
- **Module**: M${moduleId} — ${moduleNames[moduleId] || "Cross-Module"}
- **Sub-Module**: ${subModuleName}
- **Agent Type**: ${agentType} (${agentType === "persistent" ? "always-on — you monitor continuously and surface changes" : agentType === "triggered" ? "on-demand — you fire on specific events, cycles, or requests" : "coordinator — you synthesize across other agents and route information"})
- **Ownership**: ${owner} (${owner === "agent" ? "fully autonomous — generate and execute without approval" : owner === "agent-human" ? "you generate, human reviews and approves before anything goes to market" : "human leads the action, you assist with data, drafts, and preparation"})

## Moloco CTV Platform
Moloco is an ML-first DSP entering CTV advertising. Two key differentiators:
1. **Real-time ML bidding** trained on 10B+ daily events — vs TTD's batch-based Kokai
2. **CTV-to-App deterministic attribution** via deep MMP integration (AppsFlyer, Adjust, Branch, Kochava)
3. **Unified cross-screen** — mobile + CTV in one platform for holistic audience targeting
4. **Transparent pricing** — CPM-based, no hidden fees, full log-level reporting
${modeContext}
${MEASUREMENT_CONTEXT}
${sectionCtx}
${LIVE_CTV_ACCOUNTS}
${liveContext ? `\n## Live Data Feed\n${liveContext}` : ""}

## Your Task
${promptText}

${outputTemplate ? `\n${outputTemplate}\n` : ""}
## Output Rules
1. **Name real companies** — Tang Luck, CHAI, Experian, Fanatics, Novig, PMG, TTD, tvScientific, Amazon DSP, Roku
2. **Cite real numbers** — $57K/day Tang Luck, 14.1% D1 ROAS, $24K DRR CHAI, $200K Fanatics commit, $10M EOY target
3. **Use structured formats** — tables, scorecards, checklists. Not essays.
4. **Be immediately actionable** — a seller or operator should be able to use your output in their next meeting
5. **${agentType === "persistent" ? "Include what you'd monitor going forward with specific KPIs and alert thresholds" : agentType === "triggered" ? "Specify what triggered you, what you produced, and what should happen next" : "Synthesize across agents and specify routing — who needs to see what and why"}
6. **Stay under 600 words** — this is an operational system, not a report. Dense, tactical, formatted.
7. **Never say "consider" or "you might want to"** — say "do this" with specific actions, owners, and deadlines.`;
}

/**
 * Map a prompt to its section key for specialized context injection.
 * Uses sub-module name matching and module-based fallback.
 */
function findSectionKey(promptText: string, subModuleName: string, moduleId: number): string {
  const smLower = subModuleName.toLowerCase();
  const ptLower = promptText.toLowerCase();

  // Direct sub-module name matching
  if (smLower.includes("industry") || smLower.includes("market sens")) return "industry-sensing";
  if (smLower.includes("competitor") || smLower.includes("battlecard")) return "competitor-intel";
  if (smLower.includes("customer voice") || smLower.includes("win/loss") || smLower.includes("win loss")) return "customer-voice";
  if (smLower.includes("analyst") || smLower.includes("thought leader") || smLower.includes("narrative")) return "analyst-tracking";
  if (smLower.includes("icp") || smLower.includes("ideal customer") || smLower.includes("market structure")) return "icp-intelligence";
  if (smLower.includes("outbound") || smLower.includes("contact") || smLower.includes("message-to-icp") || smLower.includes("multi-channel exec")) return "outbound-system";
  if (smLower.includes("channel") && (smLower.includes("effect") || smLower.includes("optim") || smLower.includes("funnel"))) return "channel-optimization";
  if (smLower.includes("digital") || smLower.includes("awareness") || smLower.includes("consideration")) return "digital-awareness";
  if (smLower.includes("sales") || smLower.includes("pitch") || smLower.includes("coaching") || smLower.includes("qualified lead")) return "sales-engagement";
  if (smLower.includes("partner") || smLower.includes("co-marketing") || smLower.includes("warm intro")) return "partnerships";
  if (smLower.includes("content") && (smLower.includes("engine") || smLower.includes("strategy") || smLower.includes("production"))) return "content-engine";
  if (smLower.includes("website") || smLower.includes("landing") || smLower.includes("seo") || smLower.includes("cta")) return "website-digital";
  if (smLower.includes("test fund") || smLower.includes("commitment")) return "test-funding";
  if (smLower.includes("event")) return "event-activation";
  if (smLower.includes("onboard") || smLower.includes("setup") || smLower.includes("goal & creative") || smLower.includes("measurement verif")) return "onboarding";
  if (smLower.includes("campaign monitor") || smLower.includes("campaign-monitor") || smLower.includes("daily perf") || smLower.includes("real-time optim") || smLower.includes("bid optim") || smLower.includes("creative rotat") || smLower.includes("daypart") || smLower.includes("frequency cap") || smLower.includes("pacing")) return "campaign-monitoring";
  if (smLower.includes("customer comm") || smLower.includes("customer-comm") || smLower.includes("report gen") || smLower.includes("qbr") || smLower.includes("weekly report") || smLower.includes("client report") || smLower.includes("performance summar")) return "customer-comms";
  if (smLower.includes("performance scal") || smLower.includes("performance-scal") || smLower.includes("scale pitch") || smLower.includes("upsell") || smLower.includes("expansion") || smLower.includes("budget increase") || smLower.includes("spend growth")) return "performance-scaling";
  if (smLower.includes("churn") || smLower.includes("retention") || smLower.includes("at-risk") || smLower.includes("at risk") || smLower.includes("save plan") || smLower.includes("win-back") || smLower.includes("intervention")) return "churn-prevention";
  if (smLower.includes("cross-account") || smLower.includes("cross account") || smLower.includes("pattern") || smLower.includes("portfolio") || smLower.includes("competitive performance")) return "cross-account";
  if (smLower.includes("governance") || smLower.includes("resource") || smLower.includes("budget track") || smLower.includes("test fund track") || smLower.includes("investment") || smLower.includes("headcount") || smLower.includes("business intel")) return "governance";
  if (smLower.includes("orchestrat") || smLower.includes("synthesis") || smLower.includes("cross-module") || smLower.includes("signal rout") || smLower.includes("priority") || smLower.includes("weekly sync") || smLower.includes("meta-")) return "orchestration";
  if (smLower.includes("monitor") || smLower.includes("alert") || smLower.includes("anomaly")) return "performance-monitoring";
  if (smLower.includes("case study")) return "case-study-pipeline";
  if (smLower.includes("health") || smLower.includes("sentiment") || smLower.includes("confidence") || smLower.includes("lifetime") || smLower.includes("advisory")) return "long-term-health";
  if (smLower.includes("feedback") || (smLower.includes("executive") && smLower.includes("report"))) return "feedback-routing";
  if (smLower.includes("pipeline") || smLower.includes("revenue") || smLower.includes("arr") || smLower.includes("conversion track")) return "commercial-performance";
  if (smLower.includes("conviction") || smLower.includes("learning goal")) return "learning-goals";
  if (smLower.includes("weekly") || smLower.includes("okr") || smLower.includes("dependency") || smLower.includes("exec comm") || smLower.includes("steering")) return "operating-rhythm";

  // Prompt text matching as fallback
  if (ptLower.includes("battlecard") || ptLower.includes("competitor")) return "competitor-intel";
  if (ptLower.includes("icp") || ptLower.includes("segment")) return "icp-intelligence";
  if (ptLower.includes("outbound") || ptLower.includes("email") || ptLower.includes("sequence")) return "outbound-system";
  if (ptLower.includes("coaching") || ptLower.includes("pitch") || ptLower.includes("deal")) return "sales-engagement";
  if (ptLower.includes("onboard")) return "onboarding";
  if (ptLower.includes("campaign") && (ptLower.includes("monitor") || ptLower.includes("optim") || ptLower.includes("bid") || ptLower.includes("creative"))) return "campaign-monitoring";
  if (ptLower.includes("report") && (ptLower.includes("customer") || ptLower.includes("client") || ptLower.includes("qbr"))) return "customer-comms";
  if (ptLower.includes("scale") || ptLower.includes("upsell") || ptLower.includes("expand") || ptLower.includes("budget increase")) return "performance-scaling";
  if (ptLower.includes("churn") || ptLower.includes("at-risk") || ptLower.includes("retention") || ptLower.includes("intervention")) return "churn-prevention";
  if (ptLower.includes("cross-account") || ptLower.includes("portfolio") || ptLower.includes("pattern across")) return "cross-account";
  if (ptLower.includes("governance") || ptLower.includes("resource alloc") || ptLower.includes("headcount") || ptLower.includes("business intel")) return "governance";
  if (ptLower.includes("orchestrat") || ptLower.includes("synthesize") || ptLower.includes("cross-module") || ptLower.includes("signal")) return "orchestration";
  if (ptLower.includes("health")) return "long-term-health";
  if (ptLower.includes("pipeline") || ptLower.includes("revenue") || ptLower.includes("forecast")) return "commercial-performance";
  if (ptLower.includes("conviction") || ptLower.includes("investment decision")) return "learning-goals";
  if (ptLower.includes("weekly") || ptLower.includes("agenda") || ptLower.includes("prep")) return "operating-rhythm";

  // Module-based fallback
  const moduleFallback: Record<number, string> = {
    1: "industry-sensing",
    2: "outbound-system",
    3: "performance-monitoring",
    4: "commercial-performance",
  };
  return moduleFallback[moduleId] || "industry-sensing";
}

/**
 * Get the section-specific user instruction instead of generic "Execute this agent task now."
 */
function getSectionUserInstruction(sectionKey: string, promptText: string): string {
  const sectionInstruction = SECTION_USER_INSTRUCTIONS[sectionKey];
  if (sectionInstruction) {
    return `${sectionInstruction}\n\nSpecific task: ${promptText}`;
  }
  return `Execute this task with maximum specificity. Reference real CTV accounts (Tang Luck, CHAI, Experian, Fanatics, Novig), real competitors (TTD, tvScientific, Amazon DSP, Roku), and real metrics. Produce structured, actionable output — not an essay.\n\nTask: ${promptText}`;
}

/**
 * Execute an agent prompt with full LLM reasoning (non-streaming).
 * Returns the real LLM output.
 */
export async function executeAgentPrompt(
  promptText: string,
  moduleId: number,
  subModuleName: string,
  agentType: string = "persistent",
  owner: string = "agent",
  liveContext?: string,
): Promise<string> {
  const systemPrompt = buildAgentSystemPrompt(promptText, moduleId, subModuleName, agentType, owner, liveContext);
  const sectionKey = findSectionKey(promptText, subModuleName, moduleId);
  const userInstruction = getSectionUserInstruction(sectionKey, promptText);

  const response = await clientRetry(() =>
    callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: userInstruction },
    ])
  );

  return response.content;
}

/**
 * Execute an agent prompt with streaming output.
 * Calls onChunk with each piece of output as it arrives.
 * Returns the full output when complete.
 * Wrapped with clientRetry for rate limit resilience.
 */
export async function executeAgentPromptStream(
  promptText: string,
  moduleId: number,
  subModuleName: string,
  agentType: string = "persistent",
  owner: string = "agent",
  onChunk: (chunk: string, accumulated: string) => void,
  liveContext?: string,
): Promise<string> {
  const systemPrompt = buildAgentSystemPrompt(promptText, moduleId, subModuleName, agentType, owner, liveContext);
  const sectionKey = findSectionKey(promptText, subModuleName, moduleId);
  const userInstruction = getSectionUserInstruction(sectionKey, promptText);

  const response = await clientRetry(() =>
    callLLMStream(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInstruction },
      ],
      onChunk,
    )
  );

  return response.content;
}
