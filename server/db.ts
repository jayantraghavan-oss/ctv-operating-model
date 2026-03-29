/**
 * Database query helpers.
 * Uses drizzle-orm with mysql2 for type-safe database access.
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { agentRuns, workflowSessions } from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// Lazy singleton connection
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not set");
    const pool = mysql.createPool({
      uri: url,
      ssl: {},
      waitForConnections: true,
      connectionLimit: 5,
    });
    _db = drizzle(pool);
  }
  return _db;
}

// ── Agent Run Helpers ─────────────────────────────────────────────────

export interface SaveAgentRunInput {
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
  userId?: string;
  scenarioName?: string;
}

export async function saveAgentRun(input: SaveAgentRunInput) {
  const db = getDb();
  await db.insert(agentRuns).values({
    id: input.id,
    promptId: input.promptId,
    promptText: input.promptText,
    moduleId: input.moduleId,
    subModuleName: input.subModuleName,
    agentType: input.agentType || "persistent",
    owner: input.owner || "agent",
    status: input.status,
    output: input.output || null,
    durationMs: input.durationMs || null,
    startedAt: input.startedAt,
    completedAt: input.completedAt || null,
    userId: input.userId || null,
    scenarioName: input.scenarioName || null,
  });
  return { id: input.id };
}

export async function updateAgentRun(
  id: string,
  updates: {
    status?: "running" | "completed" | "failed";
    output?: string;
    durationMs?: number;
    completedAt?: number;
    humanEditedOutput?: string;
    humanPrompt?: string;
    approvalStatus?: "pending" | "approved" | "rejected";
  }
) {
  const db = getDb();
  await db
    .update(agentRuns)
    .set(updates)
    .where(eq(agentRuns.id, id));
  return { id };
}

export async function listAgentRuns(opts?: {
  limit?: number;
  offset?: number;
  moduleId?: number;
  promptId?: number;
  status?: "running" | "completed" | "failed";
}) {
  const db = getDb();
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  const conditions = [];
  if (opts?.moduleId) conditions.push(eq(agentRuns.moduleId, opts.moduleId));
  if (opts?.promptId) conditions.push(eq(agentRuns.promptId, opts.promptId));
  if (opts?.status) conditions.push(eq(agentRuns.status, opts.status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(agentRuns)
    .where(where)
    .orderBy(desc(agentRuns.startedAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function getAgentRun(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.id, id))
    .limit(1);
  return rows[0] || null;
}

// ── Workflow Session Helpers ─────────────────────────────────────────

export interface SaveWorkflowSessionInput {
  id: string;
  name: string;
  description?: string;
  queryType: "preset" | "custom";
  customQuery?: string;
  agentCount: number;
  completedCount: number;
  totalDurationMs?: number;
  compiledOutput: string;
  nodeDetails?: string; // JSON string
  userId?: string;
  startedAt: number;
  completedAt?: number;
}

export async function saveWorkflowSession(input: SaveWorkflowSessionInput) {
  const db = getDb();
  await db.insert(workflowSessions).values({
    id: input.id,
    name: input.name,
    description: input.description || null,
    queryType: input.queryType,
    customQuery: input.customQuery || null,
    agentCount: input.agentCount,
    completedCount: input.completedCount,
    totalDurationMs: input.totalDurationMs || null,
    compiledOutput: input.compiledOutput,
    nodeDetails: input.nodeDetails || null,
    userId: input.userId || null,
    startedAt: input.startedAt,
    completedAt: input.completedAt || null,
  });
  return { id: input.id };
}

export async function listWorkflowSessions(opts?: { limit?: number; offset?: number }) {
  const db = getDb();
  const limit = opts?.limit || 20;
  const offset = opts?.offset || 0;
  const rows = await db
    .select()
    .from(workflowSessions)
    .orderBy(desc(workflowSessions.startedAt))
    .limit(limit)
    .offset(offset);
  return rows;
}

export async function getWorkflowSession(id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(workflowSessions)
    .where(eq(workflowSessions.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function getWorkflowSessionStats() {
  const db = getDb();
  const [result] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      totalAgentsRun: sql<number>`SUM(agent_count)`,
      avgDurationMs: sql<number>`AVG(total_duration_ms)`,
      presetCount: sql<number>`SUM(CASE WHEN query_type = 'preset' THEN 1 ELSE 0 END)`,
      customCount: sql<number>`SUM(CASE WHEN query_type = 'custom' THEN 1 ELSE 0 END)`,
    })
    .from(workflowSessions);
  return result;
}

export async function getAgentRunStats() {
  const db = getDb();
  const [result] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
      failed: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
      running: sql<number>`SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END)`,
      avgDurationMs: sql<number>`AVG(duration_ms)`,
    })
    .from(agentRuns);
  return result;
}
