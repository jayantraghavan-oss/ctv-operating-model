# AI-First CTV Commercial Operating Model

**V0 | March 2026 | Moloco Ads**

---

## What this is

200 AI agents. 2 humans. 4 work modules. 5 orchestration clusters. One commercial org for Moloco's CTV business.

The agents do the cognitive volume — research, drafting, analysis, monitoring, competitive tracking, outbound, pipeline ops. The humans hold judgment: what goes to market, what gets pitched, where to invest. Agents generate. Humans approve. Nothing reaches a buyer without a human decision.

This is not automation bolted onto a traditional org. There is no 20-person team underneath. The agents ARE the team. The humans are orchestrators, not managers.

---

## Why it matters

CTV is a nascent product competing against TTD, Amazon, Roku. The window to establish position is narrow. A traditional GTM build takes 6+ months to staff, ramp, and produce. This model produces from day one — with the depth of a large team and the cost structure of a small one.

Target: **$200M App ARR + Web product validation. EOQ2 investment decision.**

---

## How it works

Three ownership modes. Every agent has one.

- **A (Agent)** — autonomous. Generates and delivers. No human in the loop.
- **A+H (Agent+Human)** — agent generates first. Human edits, re-prompts, or approves before release.
- **H (Human-led)** — human drives. Agent assists on request.

The A+H mode is where the system earns trust. The agent does 80% of the work. The human makes it right.

---

## Use-cases

| Use-Case | Agent Does | Human Does | Where in Tool |
|---|---|---|---|
| Competitive positioning | Monitors TTD/Amazon/Roku; generates battlecards | Approves positioning before enablement | Toolkit → Competitive Intel |
| Buyer research & ICP | Profiles accounts, scores ICP fit, maps buying committees | Validates prioritization | Org Chart → M1 agents |
| Campaign & content | Drafts outbound sequences, event briefs, case studies | Edits copy, approves messaging | Toolkit → Demand Gen |
| Deal strategy & pitch prep | Builds pitch decks, pricing scenarios, objection guides | Reviews strategy; practices via roleplay | Execute Workflow → Roleplay |
| Pipeline analytics | Tracks pipeline health, win/loss, conversion | Uses for forecast calls | Toolkit → Pipeline |
| Customer health | Monitors campaigns, flags at-risk, drafts QBRs | Approves interventions | Toolkit → Customer Success |
| Exec reporting | Aggregates cross-module insights, tracks OKRs | Presents to leadership; makes decisions | Toolkit → Governance |
| Seller training | Simulates buyer personas with contextual pushback | Practices pitch; reviews performance | Buyer Roleplay + Workflow Chat |

---

## What the tool does (V0)

This is a working prototype. Every agent prompt fires a real LLM call.

**Org Chart.** The full 200-agent architecture as a clickable tree. Click any node → real agent execution with streaming output. Execute Workflow → cascading multi-agent runs with narration.

**A+H Collaboration.** Agent generates → human gets inline edit, re-prompt, approve/reject. Revision history tracked. Persisted to DB.

**Buyer Roleplay.** After a workflow completes, a live chat opens. AI buyer persona adapted to the scenario challenges you in real-time. Briefed on your workflow outputs. Pushes back on vague claims.

**Toolkit.** All 200 agents organized by module and section. Searchable. Directly executable.

**Approval Queue.** Review all A+H outputs. Filter by pending/approved/rejected. Edit and re-prompt inline.

---

## What V0 does not do yet

| Area | Now | Next |
|---|---|---|
| Data grounding | Rich synthetic context | Live Gong, Salesforce, Sensor Tower via MCP |
| Knowledge loops | Outputs saved to DB | Agent outputs feed future runs |
| Scheduling | Manual trigger | Cron-based persistent agents |
| Roleplay scoring | Unscored | Post-session scorecards + coaching |
| Export | In-tool only | Push to GDocs, Slides, Slack |
| Multi-user | Single operator | Role-based access for 2 FTEs + leadership |

---

## Bigger picture

If 2 humans can orchestrate 200 agents to run a commercial motion for CTV, the same architecture applies to any product line Moloco launches. Modules → clusters → human orchestrators. The CTV org is the proving ground.

---

*V0 — GTM Program Design & Tools*
