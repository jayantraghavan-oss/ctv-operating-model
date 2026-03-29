import { mysqlTable, varchar, text, timestamp, mysqlEnum, int, bigint } from "drizzle-orm/mysql-core";

/**
 * User table — required by the template's auth infrastructure.
 * Stores OAuth user data.
 */
export const user = mysqlTable("user", {
  id: varchar("id", { length: 255 }).primaryKey(),
  openId: varchar("open_id", { length: 255 }).notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * Agent Runs table — persists every agent execution.
 * Stores prompt ID, input, output, timing, status, and metadata.
 */
export const agentRuns = mysqlTable("agent_runs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  promptId: int("prompt_id").notNull(),
  promptText: text("prompt_text").notNull(),
  moduleId: int("module_id").notNull(),
  subModuleName: varchar("sub_module_name", { length: 255 }).notNull(),
  agentType: varchar("agent_type", { length: 50 }).default("persistent"),
  owner: varchar("owner", { length: 50 }).default("agent"),
  status: mysqlEnum("status", ["running", "completed", "failed"]).notNull(),
  output: text("output"),
  durationMs: int("duration_ms"),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  completedAt: bigint("completed_at", { mode: "number" }),
  // Optional: link to user who triggered it
  userId: varchar("user_id", { length: 255 }),
  // Scenario context (if run as part of a demo scenario)
  scenarioName: varchar("scenario_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
