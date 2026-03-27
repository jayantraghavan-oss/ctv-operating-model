/*
 * AgentContext — The "second brain" state engine
 * Manages: agent run history, sub-module statuses, cluster notes,
 * notifications, conviction scores, and learning loop events.
 * All state persisted to localStorage so Beth never loses context.
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type SubModuleStatus = "active" | "pending" | "blocked" | "complete" | "not-started";

export interface AgentRun {
  id: string;
  promptId: number;
  promptText: string;
  moduleId: number;
  subModuleName: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  output?: string;
}

export interface ClusterNote {
  id: string;
  clusterId: number;
  text: string;
  createdAt: string;
  author: string;
}

export interface Notification {
  id: string;
  type: "agent-complete" | "status-change" | "blocker" | "weekly-prep" | "conviction-update";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface LearningGoal {
  id: string;
  question: string;
  conviction: number; // 0-100
  evidence: string[];
  lastUpdated: string;
  status: "strong" | "moderate" | "weak" | "insufficient";
}

export interface ConvictionScore {
  overall: number;
  goals: LearningGoal[];
  lastUpdated: string;
  recommendation: "invest" | "extend" | "pivot" | "insufficient-data";
}

interface AgentState {
  subModuleStatuses: Record<string, SubModuleStatus>;
  agentRuns: AgentRun[];
  clusterNotes: ClusterNote[];
  notifications: Notification[];
  convictionScore: ConvictionScore;
}

interface AgentContextType extends AgentState {
  setSubModuleStatus: (key: string, status: SubModuleStatus) => void;
  runAgent: (promptId: number, promptText: string, moduleId: number, subModuleName: string) => void;
  addClusterNote: (clusterId: number, text: string) => void;
  deleteClusterNote: (noteId: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  updateConviction: (goalId: string, conviction: number, evidence: string) => void;
  getModuleHealth: (moduleId: number) => { active: number; total: number; percent: number };
  getClusterHealth: (clusterId: number) => { active: number; total: number; percent: number };
  unreadCount: number;
  recentRuns: AgentRun[];
}

// ── Default Learning Goals (from the doc's EOQ2 framework) ─────────────

const defaultLearningGoals: LearningGoal[] = [
  {
    id: "lg-1",
    question: "Can Moloco's ML engine deliver measurable CTV performance that wins against incumbent DSPs?",
    conviction: 62,
    evidence: ["Early test results showing 15-30% ROAS improvement vs. incumbent in 3 of 5 tests"],
    lastUpdated: new Date().toISOString(),
    status: "moderate",
  },
  {
    id: "lg-2",
    question: "Is there a repeatable ICP segment that converts reliably for CTV-to-App?",
    conviction: 55,
    evidence: ["Gaming vertical showing strongest signal", "DTC e-commerce showing mixed results"],
    lastUpdated: new Date().toISOString(),
    status: "moderate",
  },
  {
    id: "lg-3",
    question: "Can the AI-first operating model run with 2 FTEs at the quality level required?",
    conviction: 45,
    evidence: ["Agent coverage at 200 prompts", "Human bottleneck on content approval identified"],
    lastUpdated: new Date().toISOString(),
    status: "weak",
  },
  {
    id: "lg-4",
    question: "Does the CTV-to-Web product have a viable path to market?",
    conviction: 30,
    evidence: ["Product still in development", "Early interest from 2 retail media prospects"],
    lastUpdated: new Date().toISOString(),
    status: "insufficient",
  },
  {
    id: "lg-5",
    question: "Can we achieve $200M App ARR target with current pipeline velocity?",
    conviction: 40,
    evidence: ["Pipeline growing but conversion rates still stabilizing"],
    lastUpdated: new Date().toISOString(),
    status: "weak",
  },
  {
    id: "lg-6",
    question: "Are MMP/measurement partnerships strong enough to support scale?",
    conviction: 58,
    evidence: ["AppsFlyer integration live", "Branch partnership in progress"],
    lastUpdated: new Date().toISOString(),
    status: "moderate",
  },
  {
    id: "lg-7",
    question: "Is the competitive moat defensible as more DSPs enter CTV?",
    conviction: 50,
    evidence: ["ML differentiation holds in tests", "Speed to market is current advantage"],
    lastUpdated: new Date().toISOString(),
    status: "moderate",
  },
  {
    id: "lg-8",
    question: "Can the learning loops produce compounding insights that improve over time?",
    conviction: 35,
    evidence: ["Module 1→2 loop functioning", "Module 3→1 feedback loop not yet active"],
    lastUpdated: new Date().toISOString(),
    status: "weak",
  },
];

const defaultConviction: ConvictionScore = {
  overall: 47,
  goals: defaultLearningGoals,
  lastUpdated: new Date().toISOString(),
  recommendation: "extend",
};

// ── Simulated agent outputs ────────────────────────────────────────────

const simulatedOutputs = [
  "Scan complete. 3 new market signals detected: (1) Roku expanding self-serve CTV buying, (2) TTD launching new CTV measurement suite, (3) Retail media networks increasing CTV spend 40% YoY. Implications flagged for positioning review.",
  "Battlecard updated for tvScientific. Key change: they've added incrementality measurement as a core feature. Counter-positioning recommendation: emphasize Moloco's ML-driven optimization vs. their rules-based approach.",
  "Weekly win/loss synthesis: 4 wins, 2 losses this week. Top win driver: performance proof from existing tests. Top loss driver: lack of brand safety certification. Recommendation: accelerate brand safety partnership.",
  "ICP analysis complete. Gaming vertical continues to show highest conversion (12% MQL→SQL). New signal: streaming aggregators emerging as high-potential segment. Recommend adding to test matrix.",
  "Outbound cycle #7 complete. Email response rate: 4.2% (up from 3.1%). LinkedIn InMail: 8.7%. Top-performing message: ROI-focused with specific competitor comparison. Recommend doubling down on this angle.",
  "Campaign performance alert: Account XYZ showing 25% ROAS decline over 3 days. Root cause analysis: creative fatigue detected. Recommended action: rotate creative set and adjust frequency cap.",
  "Pipeline visibility update: 12 active opportunities, $4.2M weighted pipeline. 3 deals in negotiation stage. Test fund utilization: 67% committed, 42% deployed. $180K remaining.",
  "Cross-account pattern detected: Accounts using video completion rate as primary KPI consistently outperform those using CTR. Recommend updating onboarding guidance to steer toward VCR-based optimization.",
  "Executive weekly prep generated. Key items for XFN discussion: (1) Brand safety certification timeline, (2) Web product beta readiness, (3) Q2 pipeline gap of $1.8M vs target. Pre-read attached.",
  "Conviction tracker updated. Learning Goal #1 (ML performance) moved from 'moderate' to 'strong' based on latest test results. Overall conviction: 52% (up from 47%). Recommendation unchanged: extend.",
];

// ── Helper ─────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadState(): AgentState | null {
  try {
    const raw = localStorage.getItem("ctv-ops-state");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state: AgentState) {
  try {
    localStorage.setItem("ctv-ops-state", JSON.stringify(state));
  } catch { /* quota exceeded — silent */ }
}

// ── Module → sub-module key mapping helper ─────────────────────────────

import { modules } from "@/lib/data";

function getAllSubModuleKeysForModule(moduleId: number): string[] {
  const mod = modules.find((m) => m.id === moduleId);
  if (!mod) return [];
  const keys: string[] = [];
  for (const section of mod.sections) {
    for (const sub of section.subModules) {
      keys.push(`${section.key}::${sub.name}`);
    }
  }
  return keys;
}

function getAllSubModuleKeysForCluster(clusterId: number): string[] {
  // Cluster → Module mapping from the doc
  const clusterModuleMap: Record<number, number[]> = {
    1: [1],
    2: [2], // demand side of M2
    3: [2], // sales side of M2
    4: [3],
    5: [4],
  };
  const moduleIds = clusterModuleMap[clusterId] || [];
  return moduleIds.flatMap(getAllSubModuleKeysForModule);
}

// ── Context ────────────────────────────────────────────────────────────

const AgentContext = createContext<AgentContextType | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AgentState>(() => {
    const saved = loadState();
    return saved || {
      subModuleStatuses: {},
      agentRuns: [],
      clusterNotes: [],
      notifications: [
        {
          id: genId(),
          type: "weekly-prep",
          title: "Weekly Prep Ready",
          description: "XFN Leadership Weekly agenda auto-generated from all modules. Review before Monday standup.",
          timestamp: new Date().toISOString(),
          read: false,
          link: "/weekly-prep",
        },
        {
          id: genId(),
          type: "conviction-update",
          title: "Conviction Score Updated",
          description: "Overall conviction moved to 47%. Learning Goal #4 (CTV-to-Web) flagged as insufficient data.",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false,
          link: "/conviction",
        },
      ],
      convictionScore: defaultConviction,
    };
  });

  // Persist on every change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const setSubModuleStatus = useCallback((key: string, status: SubModuleStatus) => {
    setState((prev) => {
      const newNotif: Notification = {
        id: genId(),
        type: status === "blocked" ? "blocker" : "status-change",
        title: status === "blocked" ? "Blocker Detected" : "Status Updated",
        description: `${key.split("::")[1]} → ${status}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      return {
        ...prev,
        subModuleStatuses: { ...prev.subModuleStatuses, [key]: status },
        notifications: [newNotif, ...prev.notifications].slice(0, 50),
      };
    });
  }, []);

  const runAgent = useCallback((promptId: number, promptText: string, moduleId: number, subModuleName: string) => {
    const runId = genId();
    const run: AgentRun = {
      id: runId,
      promptId,
      promptText,
      moduleId,
      subModuleName,
      status: "running",
      startedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      agentRuns: [run, ...prev.agentRuns].slice(0, 100),
    }));

    // Simulate agent execution (1.5-4 seconds)
    const delay = 1500 + Math.random() * 2500;
    setTimeout(() => {
      const output = simulatedOutputs[Math.floor(Math.random() * simulatedOutputs.length)];
      setState((prev) => {
        const updatedRuns = prev.agentRuns.map((r) =>
          r.id === runId
            ? { ...r, status: "completed" as const, completedAt: new Date().toISOString(), output }
            : r
        );
        const notif: Notification = {
          id: genId(),
          type: "agent-complete",
          title: "Agent Run Complete",
          description: `Prompt #${promptId}: ${promptText.slice(0, 80)}...`,
          timestamp: new Date().toISOString(),
          read: false,
        };
        return {
          ...prev,
          agentRuns: updatedRuns,
          notifications: [notif, ...prev.notifications].slice(0, 50),
        };
      });
    }, delay);
  }, []);

  const addClusterNote = useCallback((clusterId: number, text: string) => {
    const note: ClusterNote = {
      id: genId(),
      clusterId,
      text,
      createdAt: new Date().toISOString(),
      author: "Beth Berger",
    };
    setState((prev) => ({
      ...prev,
      clusterNotes: [note, ...prev.clusterNotes].slice(0, 200),
    }));
  }, []);

  const deleteClusterNote = useCallback((noteId: string) => {
    setState((prev) => ({
      ...prev,
      clusterNotes: prev.clusterNotes.filter((n) => n.id !== noteId),
    }));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const clearNotifications = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const updateConviction = useCallback((goalId: string, conviction: number, evidence: string) => {
    setState((prev) => {
      const goals = prev.convictionScore.goals.map((g) => {
        if (g.id !== goalId) return g;
        const newConviction = Math.max(0, Math.min(100, conviction));
        return {
          ...g,
          conviction: newConviction,
          evidence: evidence ? [...g.evidence, evidence] : g.evidence,
          lastUpdated: new Date().toISOString(),
          status: (newConviction >= 70 ? "strong" : newConviction >= 50 ? "moderate" : newConviction >= 30 ? "weak" : "insufficient") as LearningGoal["status"],
        };
      });
      const overall = Math.round(goals.reduce((sum, g) => sum + g.conviction, 0) / goals.length);
      const rec = overall >= 70 ? "invest" : overall >= 50 ? "extend" : overall >= 30 ? "pivot" : "insufficient-data";
      return {
        ...prev,
        convictionScore: {
          overall,
          goals,
          lastUpdated: new Date().toISOString(),
          recommendation: rec as ConvictionScore["recommendation"],
        },
        notifications: [
          {
            id: genId(),
            type: "conviction-update" as const,
            title: "Conviction Updated",
            description: `Overall conviction: ${overall}%. Recommendation: ${rec}.`,
            timestamp: new Date().toISOString(),
            read: false,
            link: "/conviction",
          },
          ...prev.notifications,
        ].slice(0, 50),
      };
    });
  }, []);

  const getModuleHealth = useCallback((moduleId: number) => {
    const keys = getAllSubModuleKeysForModule(moduleId);
    const total = keys.length;
    const active = keys.filter((k) => {
      const s = state.subModuleStatuses[k];
      return s === "active" || s === "complete";
    }).length;
    return { active, total, percent: total > 0 ? Math.round((active / total) * 100) : 0 };
  }, [state.subModuleStatuses]);

  const getClusterHealth = useCallback((clusterId: number) => {
    const keys = getAllSubModuleKeysForCluster(clusterId);
    const total = keys.length;
    const active = keys.filter((k) => {
      const s = state.subModuleStatuses[k];
      return s === "active" || s === "complete";
    }).length;
    return { active, total, percent: total > 0 ? Math.round((active / total) * 100) : 0 };
  }, [state.subModuleStatuses]);

  const unreadCount = state.notifications.filter((n) => !n.read).length;
  const recentRuns = state.agentRuns.slice(0, 10);

  return (
    <AgentContext.Provider
      value={{
        ...state,
        setSubModuleStatus,
        runAgent,
        addClusterNote,
        deleteClusterNote,
        markNotificationRead,
        clearNotifications,
        updateConviction,
        getModuleHealth,
        getClusterHealth,
        unreadCount,
        recentRuns,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgent must be used within AgentProvider");
  return ctx;
}
