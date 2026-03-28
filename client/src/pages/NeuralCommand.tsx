/*
 * NeuralCommand — CTV AI Commercial Engine Command Center
 * The living second brain. Not a dashboard — an operating system.
 * Features: Conviction tracker, system pulse, smart recommendations,
 * cluster deployment, live output stream with STREAMING markdown,
 * module architecture, autopilot.
 * Apple-level UX with magical micro-interactions.
 */
import NeuralShell from "@/components/NeuralShell";
import { useAgent } from "@/contexts/AgentContext";
import { modules, clusters, getTotalStats, getModuleStats, prompts } from "@/lib/data";
import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import {
  Brain, Play, Zap, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Sparkles, Activity, MessageSquare, ToggleLeft, ToggleRight,
  TrendingUp, Target, Shield, ArrowUpRight, Pause, RotateCcw,
  ChevronDown, ChevronUp, Eye, Layers, Radio, Maximize2, Minimize2,
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";

const stats = getTotalStats();
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };
const stagger = { staggerChildren: 0.05 };

const clusterModuleMap: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 4 };

export default function NeuralCommand() {
  const {
    recentRuns, runAgent, convictionScore, isExecuting, executionQueue,
    notifications, unreadCount, getModuleHealth, getClusterHealth,
    getStreamingOutput,
  } = useAgent();
  const [autopilot, setAutopilot] = useState(false);
  const [deployingCluster, setDeployingCluster] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("conviction");
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [systemPulse, setSystemPulse] = useState(0);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [analyzingGoal, setAnalyzingGoal] = useState<string | null>(null);

  const activeRuns = recentRuns.filter((r) => r.status === "running").length;
  const completedRuns = recentRuns.filter((r) => r.status === "completed").length;
  const failedRuns = recentRuns.filter((r) => r.status === "failed").length;
  const totalOutputWords = useMemo(() =>
    recentRuns.filter(r => r.output).reduce((sum, r) => sum + (r.output?.split(/\s+/).length || 0), 0),
    [recentRuns]
  );

  // System pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemPulse(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const deployCluster = useCallback((clusterId: number) => {
    setDeployingCluster(clusterId);
    const moduleId = clusterModuleMap[clusterId] || 1;
    const modulePrompts = prompts.filter((p) => p.moduleId === moduleId);
    // Deploy first 3 agents from the cluster for a richer experience
    modulePrompts.slice(0, 3).forEach((prompt, i) => {
      setTimeout(() => {
        runAgent(prompt.id, prompt.text, moduleId, `C${clusterId}::${prompt.sectionKey}`, prompt.agentType, "agent");
      }, i * 800);
    });
    setTimeout(() => setDeployingCluster(null), 3000);
  }, [runAgent]);

  useEffect(() => {
    if (!autopilot) return;
    let clusterIndex = 0;
    const interval = setInterval(() => {
      if (clusterIndex < clusters.length) {
        deployCluster(clusters[clusterIndex].id);
        clusterIndex++;
      } else {
        setAutopilot(false);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [autopilot, deployCluster]);

  const deployAll = useCallback(() => {
    clusters.forEach((c, i) => {
      setTimeout(() => deployCluster(c.id), i * 2000);
    });
  }, [deployCluster]);

  // Deep-dive analysis for individual conviction goals
  const analyzeGoal = useCallback((goalId: string, question: string, conviction: number, status: string, evidence: string[]) => {
    setAnalyzingGoal(goalId);
    setExpandedGoal(goalId);
    const deepDivePrompt = `You are a senior CTV strategy analyst at Moloco. Perform a deep-dive analysis on this specific investment conviction question:

**Question:** ${question}
**Current Conviction:** ${conviction}%
**Status:** ${status}
**Existing Evidence:** ${evidence.join("; ")}

Provide a comprehensive deep-dive including:

1. **Current State Assessment** — What do we actually know vs. what are we assuming? Be specific about data gaps.
2. **Key Facts & Data Points** — What concrete evidence supports or undermines this conviction? Reference specific market data, competitive intel, and customer signals.
3. **Risk Factors** — What could cause this conviction to drop? What are the bear-case scenarios?
4. **Upside Catalysts** — What events or evidence would significantly increase conviction?
5. **Recommended Actions** — 3-5 specific, time-bound actions the team should take in the next 2-4 weeks to gather more evidence.
6. **Evidence Collection Plan** — What specific data do we need to collect, from whom, and by when?
7. **EOQ2 Decision Impact** — How does this goal's trajectory affect the overall investment decision?

Be specific, data-driven, and actionable. Reference CTV market dynamics, Moloco's competitive position, and real industry trends.`;

    runAgent(
      900 + parseInt(goalId.replace("lg-", "")),
      deepDivePrompt,
      4,
      `Conviction::${question.slice(0, 50)}`,
      "triggered",
      "agent",
    );
    setTimeout(() => setAnalyzingGoal(null), 2000);
  }, [runAgent]);

  // Smart recommendations based on current state
  const smartRecs = useMemo(() => {
    const recs: Array<{ priority: "critical" | "high" | "medium"; text: string; action: string; onClick?: () => void; link?: string }> = [];

    if (recentRuns.length === 0) {
      recs.push({ priority: "critical", text: "System is cold — no agents have been executed yet. Deploy the swarm to start generating intelligence.", action: "Go Live", onClick: deployAll });
    }
    if (failedRuns > 0) {
      recs.push({ priority: "critical", text: `${failedRuns} agent${failedRuns > 1 ? "s" : ""} failed. Check the output stream for error details and re-deploy.`, action: "View Errors", link: "/swarm" });
    }
    if (convictionScore.overall < 50) {
      recs.push({ priority: "high", text: `Conviction score is ${convictionScore.overall}% — below investment threshold. Run more agents to gather evidence.`, action: "Deploy All", onClick: deployAll });
    }
    const weakGoals = convictionScore.goals.filter(g => g.status === "weak" || g.status === "insufficient");
    if (weakGoals.length > 0) {
      recs.push({ priority: "high", text: `${weakGoals.length} learning goal${weakGoals.length > 1 ? "s" : ""} need${weakGoals.length === 1 ? "s" : ""} more evidence: "${weakGoals[0].question.slice(0, 60)}..."`, action: "View Goals", link: "/conviction" });
    }
    if (completedRuns > 0 && completedRuns < 10) {
      recs.push({ priority: "medium", text: "Run the Buyer Simulation to stress-test your positioning with real CTV buyer personas.", action: "Open Sim", link: "/simulation" });
    }
    clusters.forEach(c => {
      const health = getClusterHealth(c.id);
      if (health.percent < 20) {
        recs.push({ priority: "medium", text: `C${c.id}: ${c.shortName} is underactivated (${health.percent}%). Deploy to start generating outputs.`, action: `Deploy C${c.id}`, onClick: () => deployCluster(c.id) });
      }
    });
    if (recs.length === 0) {
      recs.push({ priority: "medium", text: "System is healthy. Continue monitoring agent outputs and refining conviction scores.", action: "View Data", link: "/data-pulse" });
    }
    return recs.slice(0, 4);
  }, [recentRuns, failedRuns, completedRuns, convictionScore, deployAll, deployCluster, getClusterHealth]);

  return (
    <NeuralShell>
      <motion.div
        className="space-y-6 md:space-y-8"
        initial="hidden"
        animate="visible"
        variants={{ visible: stagger, hidden: {} }}
      >
        {/* ── Header with System Status ── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          transition={spring}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-foreground">
                  Command Center
                </h1>
                {/* Live pulse indicator */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-signal/8">
                  <div className={`w-2 h-2 rounded-full ${activeRuns > 0 ? "bg-primary animate-pulse" : "bg-emerald-signal"}`} />
                  <span className="text-[11px] font-semibold text-emerald-signal">
                    {activeRuns > 0 ? `${activeRuns} Running` : "Online"}
                  </span>
                </div>
              </div>
              <p className="text-[14px] text-foreground/40 leading-relaxed">
                {stats.modules} modules · {stats.totalPrompts} agents · {completedRuns > 0 ? `${completedRuns} completed · ${totalOutputWords.toLocaleString()} words generated` : "Ready for deployment"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <motion.button
                onClick={() => setAutopilot(!autopilot)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold transition-all duration-300 ${
                  autopilot
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "glass text-foreground/50 hover:text-foreground"
                }`}
                whileTap={{ scale: 0.96 }}
              >
                {autopilot ? <Pause className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                {autopilot ? "Autopilot ON" : "Autopilot"}
              </motion.button>
              <motion.button
                onClick={deployAll}
                disabled={isExecuting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white text-[13px] font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
              >
                <Zap className="w-3.5 h-3.5" />
                {isExecuting ? `Executing (${executionQueue})...` : "Go Live"}
              </motion.button>
              <Link href="/simulation">
                <motion.div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl glass text-violet-signal text-[13px] font-semibold hover:bg-violet-signal/8 transition-all cursor-pointer"
                  whileTap={{ scale: 0.96 }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Buyer Sim
                </motion.div>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ── Conviction Score — The North Star ── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          transition={spring}
        >
          <div className="glass rounded-3xl overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === "conviction" ? null : "conviction")}
              className="w-full px-5 md:px-6 py-4 flex items-center justify-between hover:bg-black/[0.01] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/15 to-violet-signal/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-semibold text-foreground">Investment Conviction</div>
                  <div className="text-[12px] text-foreground/35 mt-0.5">
                    {convictionScore.overall}% · Recommendation: <span className="font-semibold capitalize">{convictionScore.recommendation.replace("-", " ")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Mini conviction bar */}
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-32 h-2 rounded-full bg-black/[0.04] overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        convictionScore.overall >= 70 ? "bg-emerald-signal" :
                        convictionScore.overall >= 50 ? "bg-amber-signal" :
                        "bg-rose-signal"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${convictionScore.overall}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <span className={`text-[14px] font-bold ${
                    convictionScore.overall >= 70 ? "text-emerald-signal" :
                    convictionScore.overall >= 50 ? "text-amber-signal" :
                    "text-rose-signal"
                  }`}>{convictionScore.overall}%</span>
                </div>
                {expandedSection === "conviction" ? <ChevronUp className="w-4 h-4 text-foreground/25" /> : <ChevronDown className="w-4 h-4 text-foreground/25" />}
              </div>
            </button>
            <AnimatePresence>
              {expandedSection === "conviction" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 md:px-6 pb-5 border-t border-black/[0.04]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {convictionScore.goals.slice(0, 8).map((goal) => {
                        const isExpanded = expandedGoal === goal.id;
                        const isAnalyzing = analyzingGoal === goal.id;
                        const goalRun = recentRuns.find(r => r.subModuleName?.startsWith(`Conviction::${goal.question.slice(0, 50)}`));
                        const streamingOut = goalRun?.status === "running" ? getStreamingOutput(goalRun.id) : undefined;
                        const finalOutput = goalRun?.output;
                        const displayOutput = streamingOut || finalOutput;
                        return (
                        <motion.div
                          key={goal.id}
                          className={`rounded-2xl transition-all cursor-pointer ${
                            isExpanded ? "bg-black/[0.03] ring-1 ring-primary/20" : "bg-black/[0.015] hover:bg-black/[0.025]"
                          }`}
                          whileHover={{ scale: 1.005 }}
                          layout
                        >
                          <div
                            className="p-3.5"
                            onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="text-[13px] text-foreground/70 leading-snug flex-1">{goal.question}</p>
                              <span className={`text-[13px] font-bold shrink-0 ${
                                goal.conviction >= 70 ? "text-emerald-signal" :
                                goal.conviction >= 50 ? "text-amber-signal" :
                                goal.conviction >= 30 ? "text-rose-signal" :
                                "text-foreground/25"
                              }`}>{goal.conviction}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-black/[0.04] overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${
                                  goal.conviction >= 70 ? "bg-emerald-signal" :
                                  goal.conviction >= 50 ? "bg-amber-signal" :
                                  goal.conviction >= 30 ? "bg-rose-signal" :
                                  "bg-foreground/15"
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${goal.conviction}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                  goal.status === "strong" ? "bg-emerald-signal/10 text-emerald-signal" :
                                  goal.status === "moderate" ? "bg-amber-signal/10 text-amber-signal" :
                                  goal.status === "weak" ? "bg-rose-signal/10 text-rose-signal" :
                                  "bg-foreground/5 text-foreground/30"
                                }`}>{goal.status}</span>
                                <span className="text-[10px] text-foreground/25">{goal.evidence.length} evidence point{goal.evidence.length !== 1 ? "s" : ""}</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  analyzeGoal(goal.id, goal.question, goal.conviction, goal.status, goal.evidence);
                                }}
                                disabled={isAnalyzing || goalRun?.status === "running"}
                                className="text-[10px] font-semibold text-primary hover:text-primary/70 disabled:opacity-50 flex items-center gap-1 transition-colors"
                              >
                                {goalRun?.status === "running" ? (
                                  <><Activity className="w-3 h-3 animate-pulse" /> Analyzing...</>
                                ) : displayOutput ? (
                                  <><RotateCcw className="w-3 h-3" /> Re-analyze</>
                                ) : (
                                  <><Zap className="w-3 h-3" /> Deep Dive</>
                                )}
                              </button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3.5 pb-3.5 border-t border-black/[0.04] pt-3">
                                  {displayOutput ? (
                                    <div className="text-[12px] text-foreground/70 leading-relaxed max-h-[300px] overflow-y-auto prose prose-sm prose-headings:text-foreground prose-headings:text-[13px] prose-p:text-[12px] prose-li:text-[12px]">
                                      <Streamdown>{displayOutput}</Streamdown>
                                    </div>
                                  ) : goalRun?.status === "running" ? (
                                    <div className="flex items-center gap-2 text-[12px] text-foreground/40 py-4">
                                      <Activity className="w-3.5 h-3.5 animate-pulse text-primary" />
                                      <span>Analyzing conviction data...</span>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4">
                                      <p className="text-[12px] text-foreground/30 mb-2">Click "Deep Dive" to analyze this conviction goal with AI</p>
                                      <button
                                        onClick={() => analyzeGoal(goal.id, goal.question, goal.conviction, goal.status, goal.evidence)}
                                        className="text-[11px] font-semibold text-primary hover:text-primary/70 flex items-center gap-1 mx-auto transition-colors"
                                      >
                                        <Zap className="w-3.5 h-3.5" /> Run Deep Dive Analysis
                                      </button>
                                    </div>
                                  )}
                                  {goalRun?.durationMs && (
                                    <div className="mt-2 pt-2 border-t border-black/[0.04] flex items-center gap-2 text-[10px] text-foreground/25">
                                      <Clock className="w-3 h-3" />
                                      <span>{(goalRun.durationMs / 1000).toFixed(1)}s</span>
                                      <span>·</span>
                                      <span>{goalRun.output?.split(/\s+/).length || 0} words</span>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-[12px] text-foreground/30">
                        EOQ2 investment decision threshold: 70%. Current: {convictionScore.overall}%.
                      </p>
                      <Link href="/conviction">
                        <span className="text-[12px] font-semibold text-primary hover:text-primary/70 cursor-pointer transition-colors flex items-center gap-1">
                          Full Dashboard <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── KPI Strip ── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          transition={spring}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3"
        >
          <GlassKpi label="Agents" value={String(stats.totalPrompts)} icon={<Brain className="w-4 h-4" />} accent="primary" />
          <GlassKpi label="Clusters" value="5" icon={<Layers className="w-4 h-4" />} accent="violet-signal" />
          <GlassKpi label="Executed" value={String(recentRuns.length)} icon={<Zap className="w-4 h-4" />} accent="amber-signal" />
          <GlassKpi label="Completed" value={completedRuns > 0 ? String(completedRuns) : "—"} icon={<CheckCircle2 className="w-4 h-4" />} accent="emerald-signal" />
          <GlassKpi label="Active" value={String(activeRuns)} icon={<Activity className="w-4 h-4" />} accent="primary" />
          <GlassKpi label="Errors" value={failedRuns > 0 ? String(failedRuns) : "—"} icon={<AlertTriangle className="w-4 h-4" />} accent="rose-signal" />
        </motion.div>

        {/* ── Smart Recommendations ── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          transition={spring}
        >
          <div className="glass rounded-3xl overflow-hidden">
            <div className="px-5 md:px-6 py-4 flex items-center gap-2.5 border-b border-black/[0.04]">
              <div className="w-8 h-8 rounded-xl bg-amber-signal/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-signal" />
              </div>
              <div>
                <span className="text-[15px] font-semibold text-foreground">Recommendations</span>
                <span className="text-[12px] text-foreground/30 ml-2">AI-generated based on system state</span>
              </div>
            </div>
            <div className="divide-y divide-black/[0.04]">
              {smartRecs.map((rec, i) => (
                <motion.div
                  key={i}
                  className="px-5 md:px-6 py-4 flex items-center gap-4 hover:bg-black/[0.015] transition-colors group"
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    rec.priority === "critical" ? "bg-rose-signal animate-pulse" :
                    rec.priority === "high" ? "bg-amber-signal" :
                    "bg-foreground/15"
                  }`} />
                  <span className="text-[13px] md:text-[14px] text-foreground/65 flex-1 leading-relaxed">{rec.text}</span>
                  {rec.link ? (
                    <Link href={rec.link}>
                      <span className="text-[12px] md:text-[13px] font-semibold text-primary hover:text-primary/70 cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1 opacity-70 group-hover:opacity-100">
                        {rec.action} <ChevronRight className="w-3 h-3" />
                      </span>
                    </Link>
                  ) : (
                    <button
                      onClick={rec.onClick}
                      className="text-[12px] md:text-[13px] font-semibold text-primary hover:text-primary/70 whitespace-nowrap transition-colors flex items-center gap-1 opacity-70 group-hover:opacity-100"
                    >
                      {rec.action} <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Two-column: Cluster Control + Live Output ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Cluster Control */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            transition={spring}
            className="lg:col-span-3"
          >
            <div className="glass rounded-3xl overflow-hidden">
              <div className="px-5 md:px-6 py-4 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[15px] font-semibold">Cluster Control</span>
                </div>
                <span className="text-[12px] text-foreground/30 font-medium">{stats.totalPrompts} agents · 5 clusters</span>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {clusters.map((cluster) => {
                  const health = getClusterHealth(cluster.id);
                  const clusterRuns = recentRuns.filter((r) => r.subModuleName.startsWith(`C${cluster.id}::`));
                  const isDeploying = deployingCluster === cluster.id;
                  const clusterCompleted = clusterRuns.filter(r => r.status === "completed").length;
                  const clusterRunning = clusterRuns.filter(r => r.status === "running").length;
                  return (
                    <motion.div
                      key={cluster.id}
                      className="px-5 md:px-6 py-4 hover:bg-black/[0.01] transition-colors"
                      whileHover={{ x: 2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-[14px] font-bold shrink-0 transition-all duration-500 ${
                          clusterRunning > 0 ? "bg-primary/12 text-primary shadow-sm shadow-primary/10" :
                          clusterCompleted > 0 ? "bg-emerald-signal/10 text-emerald-signal" :
                          isDeploying ? "bg-amber-signal/10 text-amber-signal animate-pulse" :
                          "bg-black/[0.04] text-foreground/25"
                        }`}>
                          C{cluster.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-foreground truncate">{cluster.name}</span>
                            {clusterRunning > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary animate-pulse">
                                {clusterRunning} LIVE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[12px] text-foreground/35">{cluster.primaryModuleCoverage}</span>
                            {clusterCompleted > 0 && (
                              <span className="text-[11px] text-emerald-signal font-medium">{clusterCompleted} done</span>
                            )}
                          </div>
                          {/* Mini progress bar */}
                          {(clusterRuns.length > 0 || health.percent > 0) && (
                            <div className="w-full h-1 rounded-full bg-black/[0.04] mt-2 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-primary/40"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(health.percent, (clusterCompleted / Math.max(clusterRuns.length, 1)) * 100)}%` }}
                                transition={{ duration: 0.6 }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <motion.button
                            onClick={() => deployCluster(cluster.id)}
                            disabled={isDeploying}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 ${
                              isDeploying
                                ? "bg-amber-signal/10 text-amber-signal"
                                : clusterCompleted > 0
                                ? "bg-emerald-signal/8 text-emerald-signal hover:bg-emerald-signal/12"
                                : "bg-black/[0.04] text-foreground/40 hover:text-primary hover:bg-primary/8"
                            }`}
                            whileTap={{ scale: 0.95 }}
                          >
                            {isDeploying ? <RotateCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                            {isDeploying ? "Deploying..." : clusterCompleted > 0 ? "Re-deploy" : "Deploy"}
                          </motion.button>
                          <Link href={`/cluster/${cluster.id}`}>
                            <motion.div
                              className="p-2 rounded-xl text-foreground/20 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                              whileTap={{ scale: 0.9 }}
                            >
                              <Eye className="w-4 h-4" />
                            </motion.div>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Live Output with Streaming + Quick Actions */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
            transition={spring}
            className="lg:col-span-2 space-y-5"
          >
            {/* Live Output Stream — NOW WITH STREAMING MARKDOWN */}
            <div className="glass rounded-3xl overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.04] flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${activeRuns > 0 ? "bg-emerald-signal animate-pulse" : "bg-foreground/15"}`} />
                <span className="text-[13px] font-semibold text-foreground/50 uppercase tracking-wide">Live Output</span>
                <span className="ml-auto text-[12px] font-medium text-foreground/25">{recentRuns.length} runs</span>
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {recentRuns.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-black/[0.03] flex items-center justify-center mx-auto mb-3">
                      <Radio className="w-6 h-6 text-foreground/15" />
                    </div>
                    <p className="text-[14px] font-medium text-foreground/35">No agent outputs yet</p>
                    <p className="text-[12px] text-foreground/20 mt-1 mb-3">Hit "Go Live" to deploy the swarm</p>
                    <motion.button
                      onClick={deployAll}
                      className="text-[12px] font-semibold text-primary hover:text-primary/70 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      Deploy All Clusters →
                    </motion.button>
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.04]">
                    <AnimatePresence>
                      {recentRuns.slice(0, 12).map((run) => {
                        const streamingContent = run.status === "running" ? getStreamingOutput(run.id) : null;
                        const isExpanded = expandedRun === run.id;
                        const displayContent = run.output || streamingContent || "";
                        
                        return (
                          <motion.div
                            key={run.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={spring}
                            className="hover:bg-black/[0.01] transition-colors"
                          >
                            {/* Run header — clickable to expand */}
                            <button
                              onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                              className="w-full px-5 py-3.5 text-left"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${
                                  run.status === "completed" ? "bg-emerald-signal" :
                                  run.status === "running" ? "bg-primary animate-pulse" :
                                  "bg-rose-signal"
                                }`} />
                                <span className="text-[11px] font-semibold text-foreground/35 truncate flex-1">{run.subModuleName}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {run.durationMs && (
                                    <span className="text-[10px] text-foreground/20 font-mono">{(run.durationMs / 1000).toFixed(1)}s</span>
                                  )}
                                  {displayContent && (
                                    isExpanded
                                      ? <Minimize2 className="w-3 h-3 text-foreground/20" />
                                      : <Maximize2 className="w-3 h-3 text-foreground/20" />
                                  )}
                                </div>
                              </div>

                              {/* Streaming indicator with live content */}
                              {run.status === "running" && streamingContent && !isExpanded && (
                                <div className="pl-4 mt-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    <span className="text-[11px] text-primary/60 font-medium">Streaming...</span>
                                    <span className="text-[10px] text-foreground/20 font-mono">{streamingContent.length} chars</span>
                                  </div>
                                  <p className="text-[12px] text-foreground/40 line-clamp-2 leading-relaxed">{streamingContent.slice(-150)}</p>
                                </div>
                              )}

                              {/* Running but no content yet */}
                              {run.status === "running" && !streamingContent && (
                                <div className="flex items-center gap-2 pl-4 mt-1">
                                  <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                  <span className="text-[11px] text-primary/60 font-medium">Thinking...</span>
                                </div>
                              )}

                              {/* Collapsed preview for completed runs */}
                              {run.output && !isExpanded && (
                                <p className="text-[12px] text-foreground/50 line-clamp-2 leading-relaxed pl-4">{run.output.slice(0, 200)}</p>
                              )}
                            </button>

                            {/* Expanded: full markdown output */}
                            <AnimatePresence>
                              {isExpanded && displayContent && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-5 pb-4 pt-0">
                                    <div className="rounded-xl bg-black/[0.02] p-4 max-h-64 overflow-y-auto text-[13px] text-foreground/70 leading-relaxed prose prose-sm prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground/80 prose-a:text-primary max-w-none">
                                      <Streamdown>{displayContent}</Streamdown>
                                    </div>
                                    {run.status === "running" && (
                                      <div className="flex items-center gap-2 mt-2">
                                        <div className="w-2 h-2 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <span className="text-[10px] text-primary/50 font-medium">Still generating...</span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Notifications */}
            <div className="glass rounded-3xl overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground/50 uppercase tracking-wide">Activity</span>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-signal/10 text-rose-signal">{unreadCount} new</span>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-black/[0.04]">
                {notifications.slice(0, 6).map((notif) => (
                  <div key={notif.id} className={`px-5 py-3 ${notif.read ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-foreground/60">{notif.title}</span>
                      <span className="text-[10px] text-foreground/20 font-mono">
                        {new Date(notif.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground/35 mt-0.5 line-clamp-1">{notif.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Module Architecture Table ── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          transition={spring}
        >
          <div className="glass rounded-3xl overflow-hidden">
            <div className="px-5 md:px-6 py-4 border-b border-black/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[15px] font-semibold">Module Architecture</span>
              </div>
              <Link href="/model">
                <span className="text-[12px] font-semibold text-primary hover:text-primary/70 cursor-pointer transition-colors flex items-center gap-1">
                  Full Model <ArrowUpRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            {/* Mobile: Cards. Desktop: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-black/[0.04]">
                    <th className="text-left px-6 py-3 text-[11px] font-bold text-foreground/30 uppercase tracking-wider">Module</th>
                    <th className="text-center px-3 py-3 text-[11px] font-bold text-foreground/30 uppercase tracking-wider">Sections</th>
                    <th className="text-center px-3 py-3 text-[11px] font-bold text-foreground/30 uppercase tracking-wider">Sub-modules</th>
                    <th className="text-center px-3 py-3 text-[11px] font-bold text-foreground/30 uppercase tracking-wider">Agents</th>
                    <th className="text-center px-3 py-3 text-[11px] font-bold text-foreground/30 uppercase tracking-wider">Cluster</th>
                    <th className="text-center px-3 py-3 text-[11px] font-bold text-foreground/30 uppercase tracking-wider">Health</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {modules.map((mod) => {
                    const s = getModuleStats(mod.id);
                    const health = getModuleHealth(mod.id);
                    return (
                      <tr key={mod.id} className="hover:bg-black/[0.01] transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground">{mod.shortName}</div>
                          <div className="text-[12px] text-foreground/30 mt-0.5">M{mod.id}</div>
                        </td>
                        <td className="text-center px-3 py-4 font-mono text-[13px] text-foreground/45">{s.sections}</td>
                        <td className="text-center px-3 py-4 font-mono text-[13px] text-foreground/45">{s.subModules}</td>
                        <td className="text-center px-3 py-4">
                          <span className="font-mono text-[13px] font-bold text-primary">{s.prompts}</span>
                        </td>
                        <td className="text-center px-3 py-4">
                          <span className="text-[12px] font-semibold px-2.5 py-1 rounded-lg bg-primary/8 text-primary">
                            C{mod.clusterId}{mod.clusterIds && mod.clusterIds.length > 1 ? `+C${mod.clusterIds[1]}` : ""}
                          </span>
                        </td>
                        <td className="text-center px-3 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-black/[0.04] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  health.percent >= 70 ? "bg-emerald-signal" :
                                  health.percent >= 30 ? "bg-amber-signal" :
                                  "bg-foreground/10"
                                }`}
                                style={{ width: `${health.percent}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-foreground/30">{health.percent}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <Link href={`/module/${mod.id}`}>
                            <span className="text-[12px] font-semibold text-primary hover:text-primary/70 cursor-pointer transition-colors">
                              Open →
                            </span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile: Card layout */}
            <div className="md:hidden divide-y divide-black/[0.04]">
              {modules.map((mod) => {
                const s = getModuleStats(mod.id);
                const health = getModuleHealth(mod.id);
                return (
                  <Link key={mod.id} href={`/module/${mod.id}`}>
                    <div className="px-5 py-4 hover:bg-black/[0.01] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-[14px] font-semibold text-foreground">{mod.shortName}</span>
                          <span className="text-[12px] text-foreground/25 ml-2">M{mod.id}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-foreground/20" />
                      </div>
                      <div className="flex items-center gap-4 text-[12px] text-foreground/40">
                        <span>{s.sections} sections</span>
                        <span>{s.subModules} sub-modules</span>
                        <span className="font-semibold text-primary">{s.prompts} agents</span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-black/[0.04] mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${health.percent >= 70 ? "bg-emerald-signal" : health.percent >= 30 ? "bg-amber-signal" : "bg-foreground/10"}`}
                          style={{ width: `${health.percent}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center text-[12px] text-foreground/20 font-medium pb-6">
          CTV AI Engine · 2 FTEs · {stats.totalPrompts} Agents · Moloco
        </div>
      </motion.div>
    </NeuralShell>
  );
}

function GlassKpi({ label, value, icon, accent }: { label: string; value: string; icon: ReactNode; accent: string }) {
  return (
    <motion.div
      className="glass rounded-2xl p-3.5 md:p-4 hover:shadow-apple transition-all duration-300"
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-xl bg-${accent}/8 flex items-center justify-center`}>
          <span className={`text-${accent}`}>{icon}</span>
        </div>
        <span className="text-[11px] font-bold text-foreground/30 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[22px] md:text-[24px] font-bold tracking-tight text-foreground">{value}</div>
    </motion.div>
  );
}
