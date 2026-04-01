# CC CTV Reporting vs. Reporting: Deep Comparison and Super View Design

**Author:** Manus AI for Jay (GTM Design/Tooling)
**Date:** March 31, 2026

---

## Executive Summary

The CTV Operating Model currently has two reporting dashboards that answer the same four strategic questions but take fundamentally different approaches. The **Reporting** page is an LLM-generated intelligence report with deep narrative context, while the **CC CTV Reporting** page is a data-forward operational dashboard with live BQ integration. Neither is strictly better; each has strengths the other lacks. The super view should merge the best of both into a single page that serves as the definitive CTV command center.

---

## Side-by-Side Comparison

| Dimension | **Reporting** (Intelligence Report) | **CC CTV Reporting** (Ops Dashboard) |
|---|---|---|
| **Design language** | Apple-glass: white bg, soft shadows, glassy panels, `rounded-2xl`, muted foreground | Dark ops: slate-900 bg, neon accents, purple/violet identity, compact cards |
| **Navigation** | Scroll-spy with pill nav (smooth scroll to sections) | Tab-based with animated transitions (one section visible at a time) |
| **Data source** | Server-generated via `reporting.insights` tRPC endpoint (LLM-enriched synthetic data from Slack/Gong/SFDC connectors) | Static fallback data + live BQ overlay via `reporting.bqRevenue` endpoint |
| **Data maturity** | Explicit amber "Data Maturity" badges per section explaining caveats | "Honesty boxes" with red-tinted warnings per section |
| **Q1 Revenue** | Closed Won + Weighted Pipeline + Gap to Target + Confidence rating; AreaChart with target/closed/pipeline overlays; Pipeline by Stage and Region tables; Early Signals cards | Daily GAS trailing 7d + Active Campaigns + Win Rate + Pipeline + Exchanges; LineChart for daily GAS trend; BarChart for campaign ramp; PieChart for concentration; Pipeline funnel bars; Risk signal cards |
| **Q2 Customer Voice** | Sentiment breakdown (positive/neutral/negative counts); stacked AreaChart for weekly sentiment trend; expandable Top Themes with implications; expandable Objections with best responses; Competitor Mentions with threat levels; Notable Quotes; Experimental Insights | Sentiment trend by month (positive/mixed/friction); horizontal theme bars with % of calls; verbatim quote cards with theme/sentiment/meta/status |
| **Q3 Win/Loss** | Win Rate + Avg Cycle + Test-to-Scale KPIs; expandable Winning Behaviors and Losing Patterns; Test-to-Scale Drivers; Rep Leaderboard table; Coaching Opportunities; Activity Trend BarChart | Won vs Lost KPIs (18 vs 13); behavior comparison table with progress bars and delta/signal columns; Win Rate by Behavior horizontal BarChart; Top Loss Reasons bars |
| **Q4 Market** | Win/Loss vs Competitors table; Competitive Signals with urgency; TAM Estimates with penetration bars; Advantages vs Vulnerabilities side-by-side | Competitive table with head-to-head, their edge, our counter; Win Rate by Competitor chart; TAM penetration bars with takeaway; Live Competitive Signals feed |
| **Synthesis** | Dedicated "What Should We Do About It?" section with Key Risks, Key Opportunities, Open Questions in 3-column layout; Data Sources status footer | No cross-question synthesis section |
| **Interactivity** | Expandable accordions for themes, objections, behaviors, patterns (AnimatePresence); scroll-spy section tracking | Tab switching with animated transitions; static cards within each tab |
| **Live data** | Fetches from `reporting.insights` (server-side LLM generation with live connector enrichment); shows Data Sources footer with connector status | Fetches from `reporting.bqRevenue` (Python BQ bridge); shows "BQ Live" badge when connected; replaces static Q1 data with real numbers |
| **Mobile** | Single-column responsive; scroll-based navigation works well on mobile | Tab nav scrollable; dark theme works on mobile but dense KPI cards can be tight |

---

## What Each Dashboard Does Better

### Reporting (Intelligence Report) Strengths

The Reporting page excels at **narrative intelligence**. Its LLM-generated content provides contextual explanations that raw numbers cannot: confidence rationales, implication text for each theme, best-response playbooks for objections, and coaching suggestions tied to specific rep behaviors. The expandable accordion pattern is excellent for progressive disclosure, allowing a VP to scan headlines and a manager to drill into evidence. The cross-question synthesis section ("What Should We Do About It?") is the single most valuable panel in either dashboard because it forces the system to connect dots across revenue, voice, patterns, and market into actionable recommendations.

The design language (Apple-glass, white background) is also more aligned with Jay's stated preference for "minimalist, Apple-like UX."

### CC CTV Reporting (Ops Dashboard) Strengths

The CC CTV Reporting page excels at **operational precision**. It has live BQ data flowing into Q1, with real daily GAS, campaign counts, exchange breakdowns, and concentration risk derived from `fact_dsp_core`. The data provenance is explicit: every chart has a `SourceTag` showing whether data comes from BQ (verified), Gong (verbatim), SearchLight (estimated), or mixed sources. The pipeline funnel with stage-to-stage conversion rates and the concentration donut with named advertisers are operationally actionable in a way the Reporting page's weighted pipeline number is not.

The Q3 behavior comparison table (won vs lost with progress bars, deltas, and signal strength) is a superior visualization to the Reporting page's expandable list. The Q4 competitive table adds "their edge" and "our counter" columns, which is more useful for sales enablement than the Reporting page's generic "key differentiator" column.

---

## Key Gaps in Each

| Gap | **Reporting** | **CC CTV Reporting** |
|---|---|---|
| Live BQ revenue data | No BQ integration; uses LLM-generated synthetic numbers | Has live BQ with fallback |
| Cross-question synthesis | Has it (Risks/Opportunities/Open Questions) | Missing entirely |
| Data provenance tags | No per-chart source attribution | Excellent SourceTag system |
| Expandable drill-downs | Strong accordion pattern | No drill-downs; flat cards |
| Objection playbooks | Has objection + best response pairs | Missing |
| Rep leaderboard | Has it with closed/pipeline/win%/cycle/strength | Missing |
| Coaching opportunities | Has it with priority and suggested actions | Missing |
| Concentration risk | No advertiser-level concentration | Has BQ-verified concentration donut |
| Exchange breadth | Not tracked | Has exchange count and names from BQ |
| Pipeline conversion rates | Stage counts but no conversion math | Has stage-to-stage conversion % with bottleneck callout |
| Competitive counter-strategies | Generic differentiator column | "Their edge" + "Our counter" columns |
| Activity trend | Has weekly calls/meetings BarChart | Missing |

---

## Super View Design Rationale

The unified super view should be a **single page that replaces both dashboards**. The design principles:

1. **Apple-glass design language** (white/light background, glassy panels) as the base aesthetic, per Jay's stated preference, but with the CC CTV Reporting's data provenance system (SourceTags) integrated throughout.

2. **Tab-based navigation** (from CC CTV) for the 4 strategic questions, plus a 5th "Synthesis" tab that pulls the cross-question analysis from Reporting. Main tab shows only the executive summary and top-level KPIs.

3. **Live data first, LLM enrichment second.** Q1 uses BQ data as the primary source with LLM-generated narrative as context. Q2 uses Gong API data with LLM sentiment analysis. Q3 and Q4 use SFDC pipeline data with LLM pattern recognition.

4. **Progressive disclosure everywhere.** Every card, theme, behavior, and signal should be expandable to reveal evidence, implications, and recommended actions. The CC CTV Reporting's flat cards lose too much depth.

5. **Operational + Strategic in one view.** Each tab starts with operational KPIs (the CC CTV Reporting's data-forward cards) and then layers in strategic context (the Reporting page's narrative intelligence) below.

6. **Concentration and provenance are first-class citizens.** The concentration donut, exchange breadth, and pipeline conversion rates from CC CTV Reporting are promoted to Q1. Every chart gets a SourceTag.

7. **Synthesis tab is mandatory.** The "What Should We Do About It?" section is the most valuable part of the Reporting page and must survive into the super view.

---

## Super View: Tab Structure

| Tab | Primary Content | Data Sources |
|---|---|---|
| **Overview** (default) | Executive summary, 4-question status pills, top 3 risks, top 3 opportunities, data source health | All sources |
| **Q1: Revenue & Pipeline** | BQ daily GAS + trailing 7d, campaign ramp, concentration donut, pipeline funnel with conversion rates, pipeline by region, early signals | BQ (primary), SFDC (pipeline), LLM (signals) |
| **Q2: Customer Voice** | Gong sentiment KPIs, theme bars with expandable implications, objection playbooks, competitor mentions, verbatim quotes | Gong API (primary), LLM (analysis) |
| **Q3: Win/Loss Patterns** | Behavior comparison table, win rate by behavior, rep leaderboard, coaching opportunities, activity trend, test-to-scale drivers | Gong + SFDC (primary), LLM (patterns) |
| **Q4: Market Position** | Competitive table with edge/counter, win rate by competitor, TAM penetration, advantages vs vulnerabilities, live competitive signals | Gong + SFDC + BQ (primary), LLM (positioning) |
| **Synthesis** | Key Risks, Key Opportunities, Open Questions, Recommended Actions, Next 30-Day Priorities | Cross-source LLM synthesis |

---

## Implementation Priority

The super view should be built as a new page (`/super-view` or `/ctv-intelligence`) that imports the best components from both existing pages and adds the missing pieces. The existing Reporting and CC CTV Reporting pages should remain available as legacy views during the transition.

The build order:

1. **Overview tab** with executive summary and data source health (using LiveDataStatus component)
2. **Q1 tab** merging BQ live data + SFDC pipeline + LLM signals
3. **Q2 tab** with Gong API integration + LLM sentiment analysis
4. **Q3 tab** merging behavior table + rep leaderboard + coaching
5. **Q4 tab** merging competitive table + TAM + signals
6. **Synthesis tab** with cross-question LLM analysis
