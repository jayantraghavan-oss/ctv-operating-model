import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { mysqlTable, varchar, text, timestamp, mysqlEnum, int, bigint } from "drizzle-orm/mysql-core";
import { desc } from 'drizzle-orm';

const agentRuns = mysqlTable("agent_runs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  promptId: int("prompt_id").notNull(),
  promptText: text("prompt_text").notNull(),
  moduleId: int("module_id").notNull(),
  subModuleName: varchar("sub_module_name", { length: 255 }).notNull(),
  agentType: varchar("agent_type", { length: 50 }),
  owner: varchar("owner", { length: 50 }),
  status: mysqlEnum("status", ["running", "completed", "failed"]).notNull(),
  output: text("output"),
  durationMs: int("duration_ms"),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  completedAt: bigint("completed_at", { mode: "number" }),
  userId: varchar("user_id", { length: 255 }),
  scenarioName: varchar("scenario_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

async function test() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: {},
    connectionLimit: 1,
  });
  const db = drizzle(pool);
  const rows = await db.select().from(agentRuns).orderBy(desc(agentRuns.startedAt)).limit(5);
  console.log('Success:', rows);
  await pool.end();
}
test().catch(e => { console.error('Error:', e.message); console.error(e.stack); });
