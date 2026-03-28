/*
 * AgentContext — The "second brain" state engine
 * REAL LLM execution with STREAMING — every agent fires a live cognitive call.
 * Manages: agent run history, sub-module statuses, cluster notes,
 * notifications, conviction scores, and learning loop events.
 * All state persisted to localStorage so the user never loses context.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { executeAgentPromptStream, executeAgentPrompt } from "@/lib/llm";
import { toast } from "sonner";

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
  durationMs?: number;
  agentType?: string;
  owner?: string;
  streamingOutput?: string; // Progressive output during streaming
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
  conviction: number;
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
  runAgent: (promptId: number, promptText: string, moduleId: number, subModuleName: string, agentType?: string, owner?: string) => void;
  addClusterNote: (clusterId: number, text: string) => void;
  deleteClusterNote: (noteId: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  updateConviction: (goalId: string, conviction: number, evidence: string) => void;
  getModuleHealth: (moduleId: number) => { active: number; total: number; percent: number };
  getClusterHealth: (clusterId: number) => { active: number; total: number; percent: number };
  getStreamingOutput: (runId: string) => string | undefined;
  resetAgentRuns: () => void;
  unreadCount: number;
  recentRuns: AgentRun[];
  isExecuting: boolean;
  executionQueue: number;
}

// ── Default Learning Goals ─────────────────────────────────────────────────

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

// ── Helper ─────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadState(): AgentState | null {
  try {
    const raw = localStorage.getItem("ctv-ops-state-v2");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state: AgentState) {
  try {
    localStorage.setItem("ctv-ops-state-v2", JSON.stringify(state));
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
  const clusterModuleMap: Record<number, number[]> = {
    1: [1],
    2: [2],
    3: [2],
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
          title: "System Online",
          description: "CTV AI Commercial Engine initialized. All 200 agents ready for execution. Click any agent to fire a real LLM call.",
          timestamp: new Date().toISOString(),
          read: false,
        },
      ],
      convictionScore: defaultConviction,
    };
  });

  const [executionQueue, setExecutionQueue] = useState(0);
  // Streaming outputs stored separately to avoid excessive re-renders of the full state
  const streamingOutputs = useRef<Record<string, string>>({});
  const [streamingTick, setStreamingTick] = useState(0);

  // Persist on every change (debounced to avoid excessive writes)
  useEffect(() => {
    const timer = setTimeout(() => saveState(state), 300);
    return () => clearTimeout(timer);
  }, [state]);

  const getStreamingOutput = useCallback((runId: string) => {
    return streamingOutputs.current[runId];
  }, [streamingTick]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /**
   * Run an agent with REAL LLM execution + STREAMING.
   * Fires the Forge API, streams the output back progressively, updates state.
   * Shows toast notifications for start/complete/fail.
   */
  const runAgent = useCallback((
    promptId: number,
    promptText: string,
    moduleId: number,
    subModuleName: string,
    agentType: string = "persistent",
    owner: string = "agent",
  ) => {
    const runId = genId();
    const startTime = Date.now();
    const run: AgentRun = {
      id: runId,
      promptId,
      promptText,
      moduleId,
      subModuleName,
      status: "running",
      startedAt: new Date().toISOString(),
      agentType,
      owner,
    };

    setState((prev) => ({
      ...prev,
      agentRuns: [run, ...prev.agentRuns].slice(0, 200),
    }));
    setExecutionQueue((q) => q + 1);

    // Toast: agent started
    toast(`Agent #${promptId} started`, {
      description: subModuleName,
      duration: 2000,
    });

    // Initialize streaming output
    streamingOutputs.current[runId] = "";

    // Throttle streaming UI updates to every 100ms
    let lastTick = 0;
    const throttledTick = () => {
      const now = Date.now();
      if (now - lastTick > 100) {
        lastTick = now;
        setStreamingTick((t) => t + 1);
      }
    };

    // Fire real LLM call with streaming
    executeAgentPromptStream(
      promptText,
      moduleId,
      subModuleName,
      agentType,
      owner,
      (_chunk, accumulated) => {
        streamingOutputs.current[runId] = accumulated;
        throttledTick();
      },
    )
      .then((output) => {
        const durationMs = Date.now() - startTime;
        // Clean up streaming output
        delete streamingOutputs.current[runId];
        setStreamingTick((t) => t + 1);

        setState((prev) => {
          const updatedRuns = prev.agentRuns.map((r) =>
            r.id === runId
              ? { ...r, status: "completed" as const, completedAt: new Date().toISOString(), output, durationMs }
              : r
          );
          const notif: Notification = {
            id: genId(),
            type: "agent-complete",
            title: `Agent #${promptId} Complete`,
            description: `${subModuleName} — ${(durationMs / 1000).toFixed(1)}s — ${output.slice(0, 100)}...`,
            timestamp: new Date().toISOString(),
            read: false,
          };
          return {
            ...prev,
            agentRuns: updatedRuns,
            notifications: [notif, ...prev.notifications].slice(0, 50),
          };
        });
        setExecutionQueue((q) => Math.max(0, q - 1));

        // Toast: agent complete
        toast.success(`Agent #${promptId} complete`, {
          description: `${subModuleName} — ${(durationMs / 1000).toFixed(1)}s`,
          duration: 3000,
        });
      })
      .catch((err) => {
        const durationMs = Date.now() - startTime;
        // Clean up streaming output
        delete streamingOutputs.current[runId];
        setStreamingTick((t) => t + 1);

        // Fallback: try non-streaming
        executeAgentPrompt(promptText, moduleId, subModuleName, agentType, owner)
          .then((output) => {
            const totalDuration = Date.now() - startTime;
            setState((prev) => {
              const updatedRuns = prev.agentRuns.map((r) =>
                r.id === runId
                  ? { ...r, status: "completed" as const, completedAt: new Date().toISOString(), output, durationMs: totalDuration }
                  : r
              );
              return { ...prev, agentRuns: updatedRuns };
            });
            setExecutionQueue((q) => Math.max(0, q - 1));
            toast.success(`Agent #${promptId} complete (fallback)`, {
              description: subModuleName,
              duration: 3000,
            });
          })
          .catch((fallbackErr) => {
            setState((prev) => {
              const updatedRuns = prev.agentRuns.map((r) =>
                r.id === runId
                  ? { ...r, status: "failed" as const, completedAt: new Date().toISOString(), output: `Error: ${fallbackErr.message || err.message || "Unknown error"}`, durationMs }
                  : r
              );
              return { ...prev, agentRuns: updatedRuns };
            });
            setExecutionQueue((q) => Math.max(0, q - 1));

            // Toast: agent failed
            toast.error(`Agent #${promptId} failed`, {
              description: err.message || "Unknown error",
              duration: 4000,
            });
          });
      });
  }, []);

  const addClusterNote = useCallback((clusterId: number, text: string) => {
    const note: ClusterNote = {
      id: genId(),
      clusterId,
      text,
      createdAt: new Date().toISOString(),
      author: "Operator",
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

  const resetAgentRuns = useCallback(() => {
    setState((prev) => ({
      ...prev,
      agentRuns: [],
    }));
    streamingOutputs.current = {};
    setStreamingTick((t) => t + 1);
    setExecutionQueue(0);
    toast.success("Agent history cleared", {
      description: "All run history has been reset.",
      duration: 2000,
    });
  }, []);

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
  const recentRuns = state.agentRuns.slice(0, 20);
  const isExecuting = executionQueue > 0;

  return (
    <AgentContext.Provider
      value={{
        ...state,
        setSubModuleStatus,
        runAgent,
        resetAgentRuns,
        addClusterNote,
        deleteClusterNote,
        markNotificationRead,
        clearNotifications,
        updateConviction,
        getModuleHealth,
        getClusterHealth,
        getStreamingOutput,
        unreadCount,
        recentRuns,
        isExecuting,
        executionQueue,
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
