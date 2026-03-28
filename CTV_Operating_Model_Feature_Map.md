# CTV Operating Model → App Feature Map

**Mapping the source document to every feature in the CTV AI Engine**
*Jay Shin · Program Design & Tools · March 2026*

---

## Purpose

This document provides a 1:1 cross-reference between the original **AI-First CTV Commercial Operating Model** document (Mar 9, 2026) and the features implemented in the **CTV AI Engine** web application. Every module, sub-module, cluster, agent prompt, and design principle from the source is mapped to its corresponding app surface — page, component, interaction, or data element — so stakeholders can trace any piece of the operating model to exactly where it lives in the product.

---

## Executive Summary

The source document defines a **4-module, 5-cluster, 200-agent** operating model for running a CTV commercial business with 2 FTEs. The CTV AI Engine app implements this model across **7 primary pages** and **6 supporting views**, with every module, sub-module, cluster, and agent prompt represented in the data layer and surfaced through interactive UI. The table below summarizes coverage at the module level.

| Source Document Element | Count | App Coverage | Primary App Surface |
|---|---|---|---|
| Work Modules | 4 | 4/4 (100%) | Dashboard, Module Pages, Sidebar Nav |
| Orchestrator Clusters | 5 | 5/5 (100%) | Dashboard, Cluster Pages |
| Agent Prompts | 200 | 200/200 (100%) | AI Assistants, Module Pages, Command Palette |
| Sub-Modules | 80+ | All represented | Module Pages, Assistant Registry |
| Sections | 25+ | All represented | Module Pages |
| Orchestration Layer | 20 prompts | 20/20 (100%) | Dashboard, AI Assistants |
| Two-Mode Design (App/Web) | Cluster 3 | Implemented | Cluster Page for C3 |
| Conviction / Learning Goals | 8 goals | 8/8 (100%) | Dashboard (Conviction Tracker) |
| Weekly Prep Rhythm | Defined | Implemented | Weekly Prep page |

---

## 1. Modules → App Pages

The source document defines four work modules plus an orchestration layer. Each maps to dedicated app surfaces.

### Module 1: Market Intelligence & Positioning Engine

| Source Section | Source Sub-Modules | App Surface | How It Appears |
|---|---|---|---|
| Industry Landscape Monitoring | Industry Landscape Monitoring, Competitor Intelligence | **AI Assistants** (prompts #1–10), **Module Page /module/1** | Each sub-module's prompts appear as runnable agent cards. Agents #1–5 scan industry sources; #6–10 detect contradictions and threats. |
| Competitor Intelligence | Competitor Intelligence, Counter-Positioning | **AI Assistants** (#11–20), **Competitive Sims** (/war-room) | Battlecard agents (#11, #14, #15) run as always-on cards. Counter-positioning (#16–20) feeds the Competitive Sims page scenarios. |
| Customer Voice / Win-Loss Intelligence | Win-Loss Intelligence, Perception Analysis | **AI Assistants** (#21–30), **Insights** (/data-pulse, Gong Intelligence tab) | Win-loss agents extract from Gong transcripts. Insights page shows aggregated Gong call signals (e.g., "12 calls reference ROAS improvement"). |
| Analyst & Thought Leader Tracking | Analyst Tracking, Narrative Influence, Partner Ecosystem, Message Generation, Industry Events, Positioning Intelligence | **AI Assistants** (#31–40), **Module Page /module/1** | Analyst tracking agents (#31–35) are always-on. Narrative Influence (#36–40) shows AI + Review ownership badges. Partner Ecosystem, Message Generation, Events, and Positioning Intelligence appear as sub-module entries on the Module Page (no assigned prompts yet — shown as expandable sections). |

### Module 2: Distribution & Activation

| Source Section | Source Sub-Modules | App Surface | How It Appears |
|---|---|---|---|
| ICP Intelligence | Market Structure Mapping, ICP Hypothesis Generation, ICP Validation & Refinement, Org Mapping | **AI Assistants** (#41–50), **Module Page /module/2** | ICP agents generate segment hypotheses (#41–43), validate (#47–50). Org Mapping appears as a sub-module entry without assigned prompts. |
| AI-Native Outbounding | Contact Acquisition, Message-to-ICP Mapping, Multi-Channel Execution, Channel Effectiveness, Message Effectiveness, Outbound Learning, Experimentation Engine | **AI Assistants** (#51–60), **Module Page /module/2** | Outbound agents personalize (#53), optimize timing (#56), detect fatigue (#58). Message Effectiveness, Learning Report, and Experimentation Engine appear as sub-module entries. |
| Channel & Message Optimization | Channel Effectiveness Mapping, Funnel Optimization | **AI Assistants** (#61–70) | Channel agents map effectiveness by ICP (#61–65), track funnel drop-offs (#66–70). |
| Digital Awareness & Consideration | Digital Channel Execution, Channel-Message-ICP Testing, Awareness Measurement, Consideration Nurture, Effectiveness Analysis | **AI Assistants** (#71–80), **Module Page /module/2** | Digital agents propose channel strategy (#71–73), design test matrices (#74–76), nurture sequences (#77–80). Awareness Measurement and Effectiveness Analysis appear as sub-module entries. |
| Pitch & Sales Engagement | Qualified Lead Handoff, Sales Conversation, Conversation Intelligence, Insight Routing, Sales Coaching, Follow-Up Package | **AI Assistants** (#81–90), **Buyer Roleplay** (/simulation) | Lead handoff (#81–82), conversation intelligence (#83–85), insight routing (#86–87), coaching (#88–90). The **Buyer Roleplay** page is the interactive manifestation of Sales Conversation — users practice pitches against AI buyer personas. |
| Partnership & Channel Activation | Partner Identification, Co-Marketing, Warm Introductions, Relationship Management | **AI Assistants** (#91–100), **Module Page /module/2** | Partner agents identify and map (#91–92). Co-marketing (#93–96) and warm intro (#97–100) agents are human-led with agent support. |
| Content Engine | Content Strategy, Case Study Development, Content Personalization, Performance Tracking | **Module Page /module/2** | Appears as sub-module entries. No dedicated prompts assigned yet — these are structural placeholders in the data model. |
| Website & Digital Destination | Landing Pages, CTA Optimization, Visitor Intelligence, SEO | **Module Page /module/2** | Sub-module entries without assigned prompts. |
| Test Funding & Commitment | Test Fund Tracker, Deal Closing | **Module Page /module/2**, **Dashboard** (Test Fund KPI) | Test Fund Tracker appears in Module Page. Dashboard shows test fund status in the commercial performance section. |
| Event Activation | Event Research, In-Market Execution | **Module Page /module/2** | Sub-module entries. Placeholder — noted in source as "to be fleshed out." |

### Module 3: Customer Activation & Performance Management

| Source Section | Source Sub-Modules | App Surface | How It Appears |
|---|---|---|---|
| Test Onboarding & Setup | Goal & Creative Ingestion, Measurement Verification, Business Metrics Mapping, Customer Education, Campaign Activation, Measurement Baseline | **AI Assistants** (#101–110), **Module Page /module/3** | Onboarding agents (#101–110) handle intake, measurement checks, education materials, and activation. Human-led sub-modules shown with ownership badges. |
| Live Campaign Monitoring | Performance Monitoring, Weekly Customer Touchpoint, Sentiment Capture | **AI Assistants** (#111–120), **Module Page /module/3** | 24/7 monitoring agents (#111–115) flag anomalies. Weekly touchpoint agents (#116–120) prepare reporting. Sentiment Capture appears as sub-module entry. |
| Customer Communication & Reporting | Weekly Report Generation, Sentiment Tracking, Executive Communication | **AI Assistants** (#121–130) | Report generation (#121–123), sentiment tracking (#124–127), executive summaries (#128–130). |
| Performance Readout & Scale Pitch | Four-Week Report, Metrics Alignment, Scale Pitch, Budget Expansion | **AI Assistants** (#131–140) | Performance readout (#131–133), scale pitch (#136–138), budget expansion support (#139–140). |
| Churn Prevention & Early Warning | Leading Indicators, Intervention Trigger, Churn Pattern Analysis | **AI Assistants** (#141–150) | Monitoring agents (#141–143), intervention triggers (#144–146), churn pattern analysis (#147–150). |
| Cross-Account Intelligence | Pattern Recognition, Competitive Performance DB, Learnings Synthesis | **AI Assistants** (#151–160) | Cross-account pattern agents (#151–153), competitive performance database (#154–156), learnings synthesis (#157–160). |
| Case Study Development Pipeline | Trigger & Draft, Interview & Approval, Distribution | **Module Page /module/3** | Sub-module entries without assigned prompts. Human-led interview process noted. |
| Long-Term Customer Health | Monthly Health Check, Sentiment Capture, Confidence Drivers, Advisory Board, Product Hypothesis, LTV Tracking | **Module Page /module/3** | Sub-module entries. Advisory Board and Product Hypothesis are human-led. |
| Feedback Routing & Executive Reporting | Product/Eng Feedback Loop, Executive Weekly Report | **Module Page /module/3** | Sub-module entries feeding into Module 4's operating rhythm. |

### Module 4: Executive Governance & Business Intelligence

| Source Section | Source Sub-Modules | App Surface | How It Appears |
|---|---|---|---|
| Commercial Performance | Global Pipeline, Conversion Tracking, Revenue/ARR Pacing, Test Fund Burn | **AI Assistants** (#161–167), **Dashboard** (KPI cards), **Conviction Dashboard** (/conviction) | Pipeline visibility (#161–163), ARR pacing (#164–166), test fund burn (#167). Dashboard shows live KPIs. Conviction Dashboard provides the investment decision view. |
| Learning Goals Synthesis | Strength of Conviction Tracker | **Dashboard** (Investment Conviction section), **Conviction Dashboard**, **AI Assistants** (#169) | The Dashboard's Investment Conviction tracker at 47% with 8 learning goals maps directly to this sub-module. Each learning goal shows evidence count and strength rating. |
| Operating Rhythm Management | XFN Weekly Prep, Customer Success Weekly Prep, OKR Tracking, Dependency Surfacing, Exec Communications, MA Steering | **AI Assistants** (#168, #170–180), **Weekly Prep** (/weekly-prep), **Module Page /module/4** | Weekly Prep page is the direct implementation of XFN Leadership Weekly Preparation. OKR tracking (#170, #175), dependency surfacing (#171–172), exec communications (#176–178), MA steering (#179–180). |

### Orchestration Layer (Module 0)

| Source Element | Prompt Range | App Surface | How It Appears |
|---|---|---|---|
| Cross-module orchestration prompts | #181–200 | **AI Assistants**, **Dashboard** (Orchestration section), **Module Pages** | 20 coordinator-type agents that synthesize across modules. Shown with rose-colored "Coordinator" badges. Includes meta-agents like "Continuously refine the operating model itself" (#200). |

---

## 2. Clusters → App Surfaces

The source document defines 5 human orchestrator clusters. Each is represented in the app's data model and surfaced through dedicated views.

| Cluster | Source Role | App Surface | Key Features |
|---|---|---|---|
| **C1: Market Intelligence & Positioning** | Synthesizes market signals, sets positioning | **Dashboard** (Cluster control card), **Cluster Page /cluster/1** | Shows cluster rationale, human role description, linked Module 1 agents. Run C1 button on Dashboard. |
| **C2: Growth & Demand Generation** | Connects ICP → outbound → digital → content learning loops | **Dashboard** (Cluster control card), **Cluster Page /cluster/2** | Covers Module 2 demand-side sub-modules. Run C2 button on Dashboard. |
| **C3: Commercial Sales & Partnerships** | Human commercial interface, pitch/close/follow-up | **Dashboard** (Cluster control card), **Cluster Page /cluster/3** | **Two-mode design implemented**: CTV-to-App (dotted-line to AMER MA) and CTV-to-Web (full commercial interface). Mode badges visible on cluster card. |
| **C4: Customer Success & Commercial Delivery** | Customer lifecycle, performance, product learning | **Dashboard** (Cluster control card), **Cluster Page /cluster/4** | Covers all Module 3 sub-modules. Links to GDS/Data Science partnership noted. |
| **C5: DRI / XFN Management** | Strategic synthesis, accountability, investment decisions | **Dashboard** (Cluster control card), **Cluster Page /cluster/5** | Covers Module 4. EOQ2 go/no-go decision framework. |

---

## 3. Design Principles → App Implementation

The source document articulates several design principles for the operating model. Here is how each is realized in the app.

| Source Design Principle | App Implementation |
|---|---|
| **"Agents generate, recommend, surface — humans approve"** | Every agent card shows ownership badges: "AI-Driven," "AI + Review," or "Human-Led." AI + Review agents produce output that requires human approval before going to market. The **Approval Queue** (/approvals) is the dedicated surface for this workflow. |
| **"2 FTEs running 200 agents across 4 modules"** | Dashboard header shows "4 modules · 200 agents" with real-time run counts. Sidebar displays "200 ASSISTANTS" counter. The entire app is designed as a single-operator control surface. |
| **"Persistent agents monitor 24/7; triggered agents fire on events"** | Agent type badges distinguish "Always-On" (persistent, monitoring continuously) from "On-Demand" (triggered by events or cycles). Visible on every agent card in AI Assistants and Module Pages. Hover tooltips show original technical terms. |
| **"Two modes: CTV-to-App and CTV-to-Web"** | Cluster 3 (Sales & Partnerships) displays both mode badges. Cluster Page /cluster/3 explains the distinct operating models for each. |
| **"EOQ2 investment decision at 70% conviction threshold"** | Dashboard's Investment Conviction tracker shows current conviction (47%) against the 70% threshold. 8 learning goals with evidence counts and strength ratings (Strong/Moderate/Weak/Insufficient). "Deep Dive" buttons on each goal. |
| **"Learning loops between modules"** | Insight Routing agents (#86–87) send extracted insights to the right destinations. Cross-Account Intelligence agents (#151–160) look across all tests for patterns. The Orchestration Layer (#181–200) synthesizes across modules. |
| **"$200M App ARR target + Web product validation"** | Referenced in Dashboard subtitle and Conviction Dashboard. Learning goals include "$200M App ARR target with current pipeline velocity" as a trackable conviction question. |

---

## 4. Agent Architecture → App Data Model

The source document defines three agent types and three ownership models. The app's `data.ts` implements these as TypeScript enums with corresponding UI treatments.

### Agent Types

| Source Term | App Label | App Technical Tooltip | Badge Color | Count |
|---|---|---|---|---|
| Persistent | Always-On | "aka Persistent Agent" | Emerald | 97 |
| Triggered | On-Demand | "aka Triggered Agent" | Violet | 83 |
| Orchestrator | Coordinator | "aka Orchestrator Agent" | Rose | 20 |

### Ownership Models

| Source Term | App Label | App Technical Tooltip | Badge Color | Count (sub-modules) |
|---|---|---|---|---|
| Agent | AI-Driven | "aka Agent-Owned" | Blue | ~35 |
| Agent+Human | AI + Review | "aka Agent+Human" | Amber | ~30 |
| Human-led | Human-Led | (same) | Slate | ~15 |

---

## 5. Interactive Features Not in Source Document

The app adds several interactive capabilities that extend beyond the static operating model document. These are value-adds built on top of the source architecture.

| App Feature | Page | What It Does | Source Connection |
|---|---|---|---|
| **Real-time AI Execution** | AI Assistants, Module Pages, Dashboard | Click "Run" on any agent to generate live AI output via LLM streaming | Brings the 200 static prompts to life as executable agents |
| **Competitive Simulations** | Competitive Sims (/war-room) | 5 pre-built competitive scenarios with AI-generated battle analysis | Extends Module 1's Competitor Intelligence and Counter-Positioning sub-modules |
| **Buyer Roleplay** | Buyer Roleplay (/simulation) | 4 buyer personas with 11–30 turn AI-powered sales conversations | Extends Module 2's Pitch & Sales Engagement, specifically the Sales Conversation sub-module |
| **Investment Conviction Tracker** | Dashboard | 8 learning goals with evidence scoring and Deep Dive analysis | Implements Module 4's Learning Goals Synthesis with interactive drill-down |
| **Batch Execution** | Dashboard ("Run All"), AI Assistants ("Run Top 10") | Run multiple agents simultaneously | Operational efficiency layer on top of the agent architecture |
| **Approval Queue** | Approvals (/approvals) | Review and approve AI-generated outputs before they go to market | Implements the "humans approve" design principle as a dedicated workflow |
| **Insights Dashboard** | Insights (/data-pulse) | Gong Intelligence, Brand Pipeline, and System Health tabs with AI analysis | Aggregates Module 1 Customer Voice and Module 4 Commercial Performance into a unified intelligence view |
| **Command Palette** | Global (Cmd+K) | Quick navigation, module access, and agent execution from anywhere | Productivity layer — not in source but enables the "2 FTE" efficiency goal |
| **Welcome Modal & Onboarding** | Global (first visit) | 5-step guided introduction with glossary hints | UX layer to make the operating model accessible to non-technical stakeholders |
| **Contextual TipBanners** | Every major page | Dismissible tips explaining what each page does and how to use it | Bridges the gap between the source document's complexity and day-to-day usability |
| **Hover Glossary Tooltips** | Global | Dotted-underline labels show original technical terms on hover | Preserves source terminology for power users while using friendly labels |
| **Weekly Prep** | Weekly Prep (/weekly-prep) | Structured weekly preparation view | Implements Module 4's XFN Leadership Weekly Preparation |
| **Learning Loops** | Learning Loops (/learning-loops) | Cross-module learning synthesis | Implements the source's emphasis on compounding insights across modules |

---

## 6. Navigation Architecture → Source Mapping

The app's sidebar navigation directly maps to the source document's organizational structure.

```
HOME
  Dashboard          → Source: Executive overview + Module 4 Governance
  AI Assistants      → Source: All 200 agent prompts across 4 modules
  Approvals          → Source: "Humans approve" design principle

TOOLS
  Insights           → Source: Module 1 Customer Voice + Module 4 Commercial Performance
  Competitive Sims   → Source: Module 1 Competitor Intelligence + Counter-Positioning
  Buyer Roleplay     → Source: Module 2 Pitch & Sales Engagement

MODULES
  Market Intel (M1)  → Source: Module 1 — Market Intelligence & Positioning Engine
  Distribution (M2)  → Source: Module 2 — Distribution & Activation
  Customer Success (M3) → Source: Module 3 — Customer Activation & Performance Management
  Governance & BI (M4)  → Source: Module 4 — Executive Governance & Business Intelligence

REFERENCE
  Operating Model    → Source: Full model overview with architecture diagrams
  Assistant Registry → Source: Flat registry of all 200 agents with metadata
```

---

## 7. Coverage Gaps & Placeholders

A small number of sub-modules from the source document are represented in the data model but do not yet have assigned agent prompts. These appear as expandable sections on Module Pages but cannot be "run" as agents.

| Module | Sub-Module | Status | Notes |
|---|---|---|---|
| M1 | Partner Ecosystem Mapping | Structure only | No prompts assigned |
| M1 | Message Generation | Structure only | No prompts assigned |
| M1 | Industry Events & Spaces | Structure only | No prompts assigned |
| M1 | Positioning Intelligence | Structure only | Human-led synthesis role |
| M2 | Org Mapping & Buyer Navigation | Structure only | No prompts assigned |
| M2 | Message Effectiveness Analysis | Structure only | No prompts assigned |
| M2 | Outbound Learning Report | Structure only | No prompts assigned |
| M2 | Continuous Experimentation Engine | Structure only | No prompts assigned |
| M2 | Awareness Measurement | Structure only | No prompts assigned |
| M2 | Effectiveness Analysis & Learning Loop | Structure only | No prompts assigned |
| M2 | Personalized Follow-Up Package | Structure only | No prompts assigned |
| M2 | Content Strategy & Calendar | Structure only | No prompts assigned |
| M2 | Case Study Development | Structure only | No prompts assigned |
| M2 | Content Personalization | Structure only | No prompts assigned |
| M2 | Content Performance Tracking | Structure only | No prompts assigned |
| M2 | All Website & Digital sub-modules | Structure only | No prompts assigned |
| M2 | Test Fund Tracker / Deal Closing | Structure only | No prompts assigned |
| M2 | Event Activation sub-modules | Structure only | Source notes "placeholder" |
| M3 | Measurement Baseline Setup | Structure only | No prompts assigned |
| M3 | Customer Sentiment Capture | Structure only | No prompts assigned |
| M3 | All Case Study Pipeline sub-modules | Structure only | No prompts assigned |
| M3 | All Long-Term Health sub-modules | Structure only | No prompts assigned |
| M3 | All Feedback Routing sub-modules | Structure only | No prompts assigned |
| M4 | Stage-by-Stage Conversion Tracking | Structure only | No prompts assigned |
| M4 | Customer Success Weekly Prep | Structure only | No prompts assigned |

These represent ~30 sub-modules that have data model entries but no executable agent prompts. They are visible in the Module Pages as structural elements, maintaining fidelity to the source document's complete architecture. Adding prompts to these sub-modules is a natural expansion path.

---

*Document generated from CTV AI Engine v7fdb1d52 · Source: AI-First CTV Commercial Operating Model (Mar 9, 2026)*
