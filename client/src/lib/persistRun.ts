/**
 * Fire-and-forget persistence of agent runs to the database via tRPC.
 * Called from AgentContext when agents start, complete, or fail.
 * Uses the tRPC batch protocol directly (no tRPC React client needed).
 */

interface SaveRunPayload {
  id: string;
  promptId: number;
  promptText: string;
  moduleId: number;
  subModuleName: string;
  agentType?: string;
  owner?: string;
  status: "running" | "completed" | "failed";
  output?: string;
  durationMs?: number;
  startedAt: number;
  completedAt?: number;
  scenarioName?: string;
}

interface UpdateRunPayload {
  id: string;
  status?: "running" | "completed" | "failed";
  output?: string;
  durationMs?: number;
  completedAt?: number;
}

/**
 * Persist a new agent run to the database.
 * Fire-and-forget — errors are logged but don't block the UI.
 */
export function persistNewRun(payload: SaveRunPayload): void {
  fetch("/api/trpc/agentRuns.save?batch=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      "0": { json: payload },
    }),
  }).catch((err) => {
    console.warn("[persistRun] Failed to save run:", err.message);
  });
}

/**
 * Update an existing agent run in the database (completion/failure).
 * Fire-and-forget — errors are logged but don't block the UI.
 */
export function persistRunUpdate(payload: UpdateRunPayload): void {
  fetch("/api/trpc/agentRuns.update?batch=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      "0": { json: payload },
    }),
  }).catch((err) => {
    console.warn("[persistRun] Failed to update run:", err.message);
  });
}

/**
 * Fetch persisted agent runs from the database.
 */
export async function fetchPersistedRuns(opts?: {
  limit?: number;
  moduleId?: number;
  promptId?: number;
  status?: "running" | "completed" | "failed";
}): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (opts) {
      params.set("input", JSON.stringify({ "0": { json: opts } }));
    }
    const url = `/api/trpc/agentRuns.list?batch=1${opts ? `&${params.toString()}` : ""}`;
    const res = await fetch(url, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.[0]?.result?.data?.json || [];
  } catch {
    return [];
  }
}

/**
 * Fetch aggregate stats about all agent runs.
 */
export async function fetchRunStats(): Promise<{
  total: number;
  completed: number;
  failed: number;
  running: number;
  avgDurationMs: number;
} | null> {
  try {
    const res = await fetch("/api/trpc/agentRuns.stats?batch=1", {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0]?.result?.data?.json || null;
  } catch {
    return null;
  }
}
