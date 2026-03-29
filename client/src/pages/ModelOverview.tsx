/*
 * ModelOverview — The strategic narrative behind the operating model.
 * Captures: thesis, first principles, architecture rationale, learning loops,
 * two-FTE design, CTV-to-App vs CTV-to-Web modes, EOQ2 decision framework.
 * This is the "why" page — the investor-grade context.
 */
import NeuralShell from "@/components/NeuralShell";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Target,
  Layers,
  Brain,
  Zap,
  RefreshCcw,
  Users2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  GitBranch,
  Clock,
} from "lucide-react";

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};

export default function ModelOverview() {
  return (
    <NeuralShell>
      <div className="p-6 lg:p-8 max-w-[1000px]">
        {/* Breadcrumb */}
        <Link href="/">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-4">
            <ArrowLeft className="w-3 h-3" />
            Dashboard
          </div>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Operating Model
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed max-w-2xl">
            The strategic architecture for running Moloco's CTV commercial operation
            at scale with 2 FTEs and 200 AI assistants. This is the system design document
            that underpins every module, coordination group, and assistant.
          </p>
        </div>

        {/* Core Thesis */}
        <motion.div {...fade} className="mb-6">
          <Section
            icon={<Target className="w-4 h-4 text-[#0091FF]" />}
            title="Core Thesis"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Moloco CTV is building an AI-first commercial operation that treats AI assistants
              as the primary workforce and humans as coordinators. The model is designed
              to run the full go-to-market motion — from market intelligence through
              customer success to executive governance — with only 2 dedicated FTEs,
              augmented by 200 purpose-built AI assistants.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              This is not "AI-assisted" — it is "AI-first." The agents do the work.
              The humans provide judgment, relationship management, strategic synthesis,
              and the connective tissue that makes the system greater than the sum of its parts.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
              <MetricCard label="Target" value="$200M" sub="App ARR + Web validation" />
              <MetricCard label="Decision Point" value="EOQ2" sub="Go/no-go investment" />
              <MetricCard label="Operating Model" value="2 FTEs" sub="+ 200 AI assistants" />
            </div>
          </Section>
        </motion.div>

        {/* First Principles */}
        <motion.div {...fade} transition={{ delay: 0.05 }} className="mb-6">
          <Section
            icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
            title="First Principles"
          >
            <div className="space-y-4">
              <Principle
                number={1}
                title="AI Assistants as Discrete Modules"
                description="Each AI assistant is a specific, actionable, system-level instruction. Assistants are organized into always-on (continuous monitoring), on-demand (event-driven), and coordinator (cross-module synthesis) types. They report to human coordinators, not to each other."
              />
              <Principle
                number={2}
                title="Human Coordinators, Not Operators"
                description="Humans don't do the repetitive work — they provide judgment, build relationships, synthesize across modules, and make the strategic calls that agents can't. The human role is to connect dots, not to push buttons."
              />
              <Principle
                number={3}
                title="Learning Loops, Not Linear Processes"
                description="Every module feeds insights back into the system. Win/loss data from Module 2 refines positioning in Module 1. Customer performance patterns from Module 3 inform ICP targeting in Module 2. The system learns and adapts continuously."
              />
              <Principle
                number={4}
                title="Two Modes of Operation"
                description="CTV-to-App and CTV-to-Web require fundamentally different go-to-market approaches. For App, the CTV team is a dotted-line resource to the existing AMER MA sales team. For Web, the CTV team IS the entire commercial interface. The same system architecture serves both, but the human roles shift."
              />
              <Principle
                number={5}
                title="Ownership Clarity at Every Level"
                description="Every sub-module has a clear ownership type: Agent (fully automated), Agent + Human (agent generates, human approves/steers), or Human-led (human primary, agent assists). No ambiguity about who does what."
              />
              <Principle
                number={6}
                title="Evidence-Based Decisions"
                description="All outputs must include specific evidence with references, not just synthesis. The system is designed to produce the data and analysis that leadership needs for the EOQ2 investment decision."
              />
            </div>
          </Section>
        </motion.div>

        {/* Architecture */}
        <motion.div {...fade} transition={{ delay: 0.1 }} className="mb-6">
          <Section
            icon={<Layers className="w-4 h-4 text-violet-500" />}
            title="System Architecture"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              The operating model is organized into 4 work modules, each mapped to a
              human coordination group. A 5th group (DRI) sits on top, providing
              executive governance and cross-functional synthesis.
            </p>
            <div className="space-y-3">
              <ArchRow
                module="Module 1"
                name="Market Intelligence & Positioning"
                cluster="Cluster 1: Market Intel & Positioning"
                prompts={40}
                description="The intelligence backbone. Continuously understands the outside world, maps it against Moloco's capabilities, and produces messaging that wins."
              />
              <ArchRow
                module="Module 2"
                name="Distribution & Activation"
                cluster="Cluster 2: Growth & Demand + Cluster 3: Sales & Partnerships"
                prompts={60}
                description="Turns positioning into pipeline. ICP intelligence, AI-native outbounding, digital awareness, sales engagement, and partnerships."
              />
              <ArchRow
                module="Module 3"
                name="Customer Activation & Performance"
                cluster="Cluster 4: Customer Success"
                prompts={60}
                description="Full customer lifecycle from test commitment through long-term health. More human involvement by nature — customers need to feel a human cares."
              />
              <ArchRow
                module="Module 4"
                name="Executive Governance & BI"
                cluster="Cluster 5: DRI / XFN Management"
                prompts={20}
                description="Synthesis, visibility, and accountability. Makes the system legible to leadership and enables go/no-go investment decisions."
              />
              <div className="border border-rose-200 rounded-lg p-4 bg-rose-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-medium text-rose-800">Coordination Layer</span>
                  <span className="text-xs font-mono text-rose-500 ml-auto">20 prompts</span>
                </div>
                <p className="text-xs text-rose-600/80 leading-relaxed">
                  The connective tissue. Cross-module synthesis, contradiction detection, strategic prioritization,
                  and continuous refinement of the operating model itself.
                </p>
              </div>
            </div>
          </Section>
        </motion.div>

        {/* Two Modes */}
        <motion.div {...fade} transition={{ delay: 0.15 }} className="mb-6">
          <Section
            icon={<GitBranch className="w-4 h-4 text-emerald-500" />}
            title="Two Modes of Operation"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              The operating model serves two distinct go-to-market motions simultaneously.
              The system architecture is shared, but the human roles and commercial interfaces differ.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-blue-200 rounded-lg p-5 bg-blue-50/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-semibold">
                    CTV-to-App
                  </span>
                </div>
                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <p>
                    <span className="font-medium text-foreground">Existing market.</span> Moloco already has
                    an AMER MA sales team selling mobile app install products. CTV-to-App is an extension
                    of that existing motion.
                  </p>
                  <p>
                    The CTV commercial person is a <span className="font-medium text-foreground">dotted-line resource</span> to
                    the existing sales team — supporting them, upleveling their CTV selling capabilities,
                    managing the CTV-specific complexity the generalist sellers can't handle alone.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Target:</span> $200M App ARR.
                    The measurement and attribution infrastructure already exists via MMPs.
                  </p>
                </div>
              </div>
              <div className="border border-emerald-200 rounded-lg p-5 bg-emerald-50/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold">
                    CTV-to-Web
                  </span>
                </div>
                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <p>
                    <span className="font-medium text-foreground">New market.</span> There is no existing
                    Moloco team for Web. The CTV commercial person IS the entire commercial human interface.
                  </p>
                  <p>
                    They run the <span className="font-medium text-foreground">full pitch, close, and follow-up motion</span> because
                    there is no existing team to lean on. This requires a fundamentally different level of
                    autonomy and ownership.
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Target:</span> Product validation.
                    Web measurement is less mature — incrementality and attribution are harder to prove,
                    making the sales conversation more complex.
                  </p>
                </div>
              </div>
            </div>
          </Section>
        </motion.div>

        {/* Learning Loops */}
        <motion.div {...fade} transition={{ delay: 0.2 }} className="mb-6">
          <Section
            icon={<RefreshCcw className="w-4 h-4 text-[#0091FF]" />}
            title="Learning Loops"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              The operating model is designed as a learning system, not a linear process.
              Every module feeds insights back into the system, creating compounding intelligence over time.
            </p>
            <div className="space-y-3">
              <LoopCard
                from="Module 2 (Sales)"
                to="Module 1 (Positioning)"
                description="Win/loss data and objection patterns from sales conversations feed back into positioning refinement and competitive intelligence."
              />
              <LoopCard
                from="Module 3 (Customer Success)"
                to="Module 2 (ICP Targeting)"
                description="Customer performance patterns and vertical insights inform which ICPs to target and which messaging resonates."
              />
              <LoopCard
                from="Module 3 (Cross-Account)"
                to="Module 1 (Product Gaps)"
                description="When the same performance pattern appears across multiple customers, it's a product issue — not a campaign issue. Evidence goes to engineering."
              />
              <LoopCard
                from="Module 1 (Market Shifts)"
                to="Module 2 (Outbound)"
                description="Changes in buyer priorities, competitor moves, and industry narratives immediately update outbound messaging and ICP hypotheses."
              />
              <LoopCard
                from="Module 4 (Governance)"
                to="All Modules"
                description="The DRI synthesizes upward from all clusters, identifies systemic vs local issues, and redirects resources based on strategic priorities."
              />
            </div>
          </Section>
        </motion.div>

        {/* Cluster Design */}
        <motion.div {...fade} transition={{ delay: 0.25 }} className="mb-6">
          <Section
            icon={<Users2 className="w-4 h-4 text-slate-500" />}
            title="Why 5 Clusters, 2 FTEs"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              The 5 clusters represent coherent sets of activities that benefit from a single
              human orchestrator. The design principle: activities cluster together when the
              human value comes from seeing the connections between them.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                <span className="font-medium text-foreground">Clusters 1-2</span> (Market Intel + Growth & Demand)
                are managed by <span className="font-medium text-foreground">FTE #1</span> — the person who connects
                market intelligence to demand generation, ensuring positioning flows into pipeline.
              </p>
              <p>
                <span className="font-medium text-foreground">Clusters 3-4</span> (Sales & Partnerships + Customer Success)
                are managed by <span className="font-medium text-foreground">FTE #2</span> — the person who IS the
                commercial face of Moloco CTV, running both the sales motion and customer delivery.
              </p>
              <p>
                <span className="font-medium text-foreground">Cluster 5</span> (DRI / XFN Management)
                is the <span className="font-medium text-foreground">Head of CTV Programs</span> — providing
                executive synthesis, XFN coordination, and accountability for the entire operation.
              </p>
            </div>
          </Section>
        </motion.div>

        {/* EOQ2 Decision Framework */}
        <motion.div {...fade} transition={{ delay: 0.3 }} className="mb-6">
          <Section
            icon={<Clock className="w-4 h-4 text-red-500" />}
            title="EOQ2 Decision Framework"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              The entire operating model is designed to produce the evidence needed for a
              go/no-go investment decision at the end of Q2. Every module, every agent,
              every learning loop contributes to building conviction.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  What We Need to Know
                </h3>
                <EvidenceItem text="Can we win CTV-to-App deals at scale against incumbents?" />
                <EvidenceItem text="Is CTV-to-Web a viable product with real buyer demand?" />
                <EvidenceItem text="Does the AI-first operating model actually work at 2 FTEs?" />
                <EvidenceItem text="What's the real competitive landscape and where do we win?" />
                <EvidenceItem text="What's the path to $200M App ARR?" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  How We'll Know It
                </h3>
                <EvidenceItem text="Pipeline velocity and conversion rates by ICP segment" />
                <EvidenceItem text="Win/loss patterns with specific competitive evidence" />
                <EvidenceItem text="Customer performance data across verticals and use cases" />
                <EvidenceItem text="Strength of conviction tracker from weekly learning cycles" />
                <EvidenceItem text="Test fund ROI and customer expansion signals" />
              </div>
            </div>
          </Section>
        </motion.div>

        {/* XFN Dependencies */}
        <motion.div {...fade} transition={{ delay: 0.35 }} className="mb-8">
          <Section
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            title="Key XFN Dependencies"
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              The operating model doesn't exist in isolation. It depends on close
              coordination with several cross-functional teams.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DepCard team="GDS / Data Science" role="Measurement credibility, performance debugging, incrementality validation. Dotted line from Product & Engineering org." />
              <DepCard team="AMER MA Sales Team" role="CTV-to-App motion depends on existing sellers. CTV team supports and uplevels, doesn't replace." />
              <DepCard team="Product & Engineering" role="Product gaps identified through customer patterns and competitive intelligence feed into roadmap." />
              <DepCard team="Creative Studio / Ad-Ops" role="Campaign execution support, creative optimization, and operational delivery." />
              <DepCard team="PSO (Professional Services)" role="Deep technical implementation support for complex measurement setups." />
              <DepCard team="Marketing / Brand" role="Content production, event presence, and digital awareness campaign execution." />
            </div>
          </Section>
        </motion.div>

        {/* CTA */}
        <div className="flex items-center gap-4 pb-8">
          <Link href="/">
            <span className="text-sm text-[#0091FF] hover:underline cursor-pointer flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </span>
          </Link>
          <Link href="/agents">
            <span className="text-sm text-[#0091FF] hover:underline cursor-pointer flex items-center gap-1.5">
              View All 200 Assistants
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </NeuralShell>
  );
}

// --- Sub-components ---

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border border-border rounded-md p-4 text-center bg-muted/20">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-semibold text-foreground tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function Principle({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-[#0091FF]/10 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-[#0091FF]">{number}</span>
      </div>
      <div>
        <div className="text-sm font-medium text-foreground mb-0.5">{title}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{description}</div>
      </div>
    </div>
  );
}

function ArchRow({
  module,
  name,
  cluster,
  prompts,
  description,
}: {
  module: string;
  name: string;
  cluster: string;
  prompts: number;
  description: string;
}) {
  return (
    <div className="border border-border rounded-lg p-4 hover:border-[#0091FF]/20 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#0091FF] bg-[#0091FF]/8 px-1.5 py-0.5 rounded">
            {module}
          </span>
          <span className="text-sm font-medium text-foreground">{name}</span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{prompts} prompts</span>
      </div>
      <div className="text-[11px] text-muted-foreground mb-1.5">→ {cluster}</div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function LoopCard({
  from,
  to,
  description,
}: {
  from: string;
  to: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
      <RefreshCcw className="w-3.5 h-3.5 text-[#0091FF] mt-0.5 shrink-0" />
      <div>
        <div className="text-xs text-foreground mb-0.5">
          <span className="font-medium">{from}</span>
          <span className="text-muted-foreground mx-1.5">→</span>
          <span className="font-medium">{to}</span>
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed">{description}</div>
      </div>
    </div>
  );
}

function EvidenceItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
      <span className="text-xs text-muted-foreground leading-relaxed">{text}</span>
    </div>
  );
}

function DepCard({ team, role }: { team: string; role: string }) {
  return (
    <div className="border border-border rounded-md p-3">
      <div className="text-xs font-medium text-foreground mb-1">{team}</div>
      <div className="text-[11px] text-muted-foreground leading-relaxed">{role}</div>
    </div>
  );
}
