/**
 * Database query helpers.
 * Uses drizzle-orm with mysql2 for type-safe database access.
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { agentRuns } from "../drizzle/schema";
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
