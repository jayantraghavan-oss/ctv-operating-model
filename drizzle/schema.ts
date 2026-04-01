import { mysqlTable, varchar, text, timestamp, mysqlEnum, int, bigint, decimal, json, boolean, index } from "drizzle-orm/mysql-core";

/**
 * User table — required by the template's auth infrastructure.
 * Stores OAuth user data.
 */
export const user = mysqlTable("user", {
  id: varchar("id", { length: 255 }).primaryKey(),
  openId: varchar("open_id", { length: 255 }).notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  role: mysqlEnum("role", ["admin", "user"]).default("admin").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/**
 * Agent Runs table — persists every agent execution.
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
  humanEditedOutput: text("human_edited_output"),
  humanPrompt: text("human_prompt"),
  approvalStatus: mysqlEnum("approval_status", ["pending", "approved", "rejected"]).default("pending"),
  userId: varchar("user_id", { length: 255 }),
  scenarioName: varchar("scenario_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Agent Output Feedback
 */
export const agentFeedback = mysqlTable("agent_feedback", {
  id: varchar("id", { length: 64 }).primaryKey(),
  runId: varchar("run_id", { length: 64 }).notNull(),
  promptId: int("prompt_id").notNull(),
  moduleId: int("module_id").notNull(),
  rating: mysqlEnum("rating", ["up", "down"]).notNull(),
  comment: text("comment"),
  hadLiveContext: int("had_live_context").default(0),
  liveDataSources: text("live_data_sources"),
  userId: varchar("user_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Workflow Sessions table
 */
export const workflowSessions = mysqlTable("workflow_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  queryType: mysqlEnum("query_type", ["preset", "custom"]).notNull(),
  customQuery: text("custom_query"),
  agentCount: int("agent_count").notNull(),
  completedCount: int("completed_count").notNull(),
  totalDurationMs: int("total_duration_ms"),
  compiledOutput: text("compiled_output").notNull(),
  nodeDetails: text("node_details"),
  userId: varchar("user_id", { length: 255 }),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  completedAt: bigint("completed_at", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// CTV Intelligence Data Tables
// ============================================================

/**
 * SFDC CTV Opportunities — pipeline, closed won, closed lost.
 * Sourced from Salesforce SOQL queries. Refreshed periodically.
 */
export const sfdcOpportunities = mysqlTable("sfdc_opportunities", {
  id: varchar("id", { length: 64 }).primaryKey(), // internal UUID
  sfdcId: varchar("sfdc_id", { length: 32 }), // Salesforce record ID
  name: varchar("name", { length: 500 }).notNull(),
  accountName: varchar("account_name", { length: 500 }),
  stageName: varchar("stage_name", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).default("0"),
  closeDate: varchar("close_date", { length: 20 }), // YYYY-MM-DD
  probability: int("probability").default(0),
  ownerName: varchar("owner_name", { length: 255 }),
  recordType: varchar("record_type", { length: 100 }),
  nextStep: text("next_step"),
  oppType: varchar("opp_type", { length: 100 }), // CTV-to-App, CTV2Web, etc.
  createdDate: varchar("created_date", { length: 20 }), // YYYY-MM-DD
  lastModifiedDate: varchar("last_modified_date", { length: 20 }),
  lossReason: text("loss_reason"),
  // Metadata
  dataSource: varchar("data_source", { length: 50 }).default("sfdc_scrape"),
  fetchedAt: bigint("fetched_at", { mode: "number" }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_sfdc_stage").on(table.stageName),
  index("idx_sfdc_account").on(table.accountName),
  index("idx_sfdc_close_date").on(table.closeDate),
]);

/**
 * Gong CTV Calls — call metadata and transcript excerpts.
 * Sourced from Gong REST API. Refreshed periodically.
 */
export const gongCalls = mysqlTable("gong_calls", {
  id: varchar("id", { length: 64 }).primaryKey(), // internal UUID
  gongCallId: varchar("gong_call_id", { length: 32 }).notNull(), // Gong's call ID
  title: varchar("title", { length: 500 }),
  started: varchar("started", { length: 30 }), // ISO timestamp
  duration: int("duration"), // seconds
  direction: varchar("direction", { length: 20 }), // Inbound/Outbound
  primaryUserId: varchar("primary_user_id", { length: 32 }),
  primaryUserName: varchar("primary_user_name", { length: 255 }),
  accountName: varchar("account_name", { length: 500 }),
  // Parties
  parties: text("parties"), // JSON array of { name, email, affiliation }
  // Transcript excerpt (first 2000 chars)
  transcriptExcerpt: text("transcript_excerpt"),
  // CTV relevance
  isCtvRelevant: int("is_ctv_relevant").default(0), // 1 = matched CTV keywords
  ctvKeywordsFound: text("ctv_keywords_found"), // JSON array of matched keywords
  // Gong deep link
  url: text("url"),
  // Metadata
  fetchedAt: bigint("fetched_at", { mode: "number" }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_gong_call_id").on(table.gongCallId),
  index("idx_gong_account").on(table.accountName),
  index("idx_gong_started").on(table.started),
  index("idx_gong_ctv").on(table.isCtvRelevant),
]);

/**
 * BQ Revenue Snapshots — daily/periodic snapshots of CTV revenue metrics.
 * Sourced from BigQuery. Each row is a point-in-time snapshot.
 */
export const bqRevenueSnapshots = mysqlTable("bq_revenue_snapshots", {
  id: varchar("id", { length: 64 }).primaryKey(),
  snapshotDate: varchar("snapshot_date", { length: 20 }).notNull(), // YYYY-MM-DD
  // Summary metrics
  totalGas: decimal("total_gas", { precision: 14, scale: 2 }),
  totalCampaigns: int("total_campaigns"),
  totalAdvertisers: int("total_advertisers"),
  avgDailyGas: decimal("avg_daily_gas", { precision: 14, scale: 2 }),
  trailing7dAvg: decimal("trailing_7d_avg", { precision: 14, scale: 2 }),
  trailing30dAvg: decimal("trailing_30d_avg", { precision: 14, scale: 2 }),
  // Raw data blobs (JSON)
  monthlyData: text("monthly_data"), // JSON array of { month, gas, campaigns, advertisers }
  topAdvertisers: text("top_advertisers"), // JSON array of { name, gas, campaigns, pct }
  exchangeBreakdown: text("exchange_breakdown"), // JSON array of { exchange, gas, pct }
  dailyTrend: text("daily_trend"), // JSON array of { date, gas }
  // Metadata
  fetchedAt: bigint("fetched_at", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_bq_snapshot_date").on(table.snapshotDate),
]);

/**
 * Gong Analysis Cache — stores LLM analysis results to avoid re-running.
 * Each row is a cached analysis result.
 */
export const gongAnalysisCache = mysqlTable("gong_analysis_cache", {
  id: varchar("id", { length: 64 }).primaryKey(),
  analysisType: varchar("analysis_type", { length: 50 }).notNull(), // 'voice_analysis', 'synthesis'
  inputHash: varchar("input_hash", { length: 64 }).notNull(), // hash of input data for cache key
  callCount: int("call_count"), // number of calls analyzed
  transcriptCount: int("transcript_count"),
  // Full analysis result (JSON)
  result: text("result").notNull(), // JSON blob of the full analysis
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }), // Unix timestamp when cache expires
}, (table) => [
  index("idx_analysis_type").on(table.analysisType),
  index("idx_input_hash").on(table.inputHash),
]);

/**
 * Data Refresh Log — tracks when each data source was last refreshed.
 */
export const dataRefreshLog = mysqlTable("data_refresh_log", {
  id: varchar("id", { length: 64 }).primaryKey(),
  source: varchar("source", { length: 50 }).notNull(), // 'sfdc', 'gong', 'bq'
  status: mysqlEnum("refresh_status", ["running", "completed", "failed"]).notNull(),
  recordCount: int("record_count"),
  durationMs: int("duration_ms"),
  errorMessage: text("error_message"),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  completedAt: bigint("completed_at", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_refresh_source").on(table.source),
]);
