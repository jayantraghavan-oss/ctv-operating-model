/**
 * Database helpers for CTV Intelligence data.
 * Reads from: sfdc_opportunities, gong_calls, bq_revenue_snapshots, gong_analysis_cache, data_refresh_log
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  sfdcOpportunities,
  gongCalls,
  bqRevenueSnapshots,
  gongAnalysisCache,
  dataRefreshLog,
} from "../drizzle/schema";
import { eq, desc, and, sql, inArray, like } from "drizzle-orm";

// Reuse the same lazy singleton pattern
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

// ── SFDC Opportunity Helpers ─────────────────────────────────────────

export async function getSfdcPipelineSummary() {
  const db = getDb();

  // Stage distribution with counts and amounts
  const stageDistribution = await db
    .select({
      stageName: sfdcOpportunities.stageName,
      count: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(14,2))), 0)`,
      avgAmount: sql<number>`COALESCE(AVG(CAST(amount AS DECIMAL(14,2))), 0)`,
    })
    .from(sfdcOpportunities)
    .groupBy(sfdcOpportunities.stageName);

  // Open pipeline (exclude Closed Won and Closed Lost)
  const openPipeline = await db
    .select()
    .from(sfdcOpportunities)
    .where(
      and(
        sql`stage_name NOT IN ('Closed Won', 'Closed Lost')`,
      )
    )
    .orderBy(desc(sql`CAST(amount AS DECIMAL(14,2))`));

  // Top deals by amount
  const topDeals = openPipeline.slice(0, 15);

  // Owner distribution
  const ownerDistribution = await db
    .select({
      ownerName: sfdcOpportunities.ownerName,
      count: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(14,2))), 0)`,
    })
    .from(sfdcOpportunities)
    .where(sql`stage_name NOT IN ('Closed Won', 'Closed Lost')`)
    .groupBy(sfdcOpportunities.ownerName)
    .orderBy(desc(sql`COALESCE(SUM(CAST(amount AS DECIMAL(14,2))), 0)`));

  // CTV-to-App vs CTV2Web split
  const typeSplit = await db
    .select({
      oppType: sfdcOpportunities.oppType,
      count: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(14,2))), 0)`,
    })
    .from(sfdcOpportunities)
    .where(sql`stage_name NOT IN ('Closed Won', 'Closed Lost')`)
    .groupBy(sfdcOpportunities.oppType);

  // Closed Won summary
  const closedWon = await db
    .select()
    .from(sfdcOpportunities)
    .where(eq(sfdcOpportunities.stageName, "Closed Won"))
    .orderBy(desc(sql`CAST(amount AS DECIMAL(14,2))`));

  // Closed Lost summary
  const closedLost = await db
    .select()
    .from(sfdcOpportunities)
    .where(eq(sfdcOpportunities.stageName, "Closed Lost"))
    .orderBy(desc(sql`CAST(amount AS DECIMAL(14,2))`));

  // Calculate totals
  const openTotal = openPipeline.reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);
  const wonTotal = closedWon.reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);
  const lostTotal = closedLost.reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);

  return {
    summary: {
      openPipelineCount: openPipeline.length,
      openPipelineTotal: openTotal,
      closedWonCount: closedWon.length,
      closedWonTotal: wonTotal,
      closedLostCount: closedLost.length,
      closedLostTotal: lostTotal,
      winRate: closedWon.length + closedLost.length > 0
        ? Math.round((closedWon.length / (closedWon.length + closedLost.length)) * 100)
        : 0,
    },
    stageDistribution,
    topDeals,
    ownerDistribution,
    typeSplit,
    closedWon: closedWon.slice(0, 20),
    closedLost: closedLost.slice(0, 20),
    openPipeline,
  };
}

// ── Gong Call Helpers ─────────────────────────────────────────────────

export async function getGongCallsFromDb() {
  const db = getDb();

  const calls = await db
    .select()
    .from(gongCalls)
    .where(eq(gongCalls.isCtvRelevant, 1))
    .orderBy(desc(gongCalls.started));

  // Account coverage
  const accountCoverage = await db
    .select({
      accountName: gongCalls.accountName,
      callCount: sql<number>`COUNT(*)`,
      latestCall: sql<string>`MAX(started)`,
    })
    .from(gongCalls)
    .where(eq(gongCalls.isCtvRelevant, 1))
    .groupBy(gongCalls.accountName)
    .orderBy(desc(sql`COUNT(*)`));

  // Monthly volume
  const monthlyVolume = await db
    .select({
      month: sql<string>`DATE_FORMAT(STR_TO_DATE(started, '%Y-%m-%dT%H:%i:%s'), '%Y-%m')`,
      count: sql<number>`COUNT(*)`,
    })
    .from(gongCalls)
    .where(eq(gongCalls.isCtvRelevant, 1))
    .groupBy(sql`DATE_FORMAT(STR_TO_DATE(started, '%Y-%m-%dT%H:%i:%s'), '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(STR_TO_DATE(started, '%Y-%m-%dT%H:%i:%s'), '%Y-%m')`);

  return {
    totalCalls: calls.length,
    calls: calls.slice(0, 100),
    accountCoverage,
    monthlyVolume,
  };
}

// ── BQ Revenue Snapshot Helpers ──────────────────────────────────────

export async function getLatestBqSnapshot() {
  const db = getDb();
  const rows = await db
    .select()
    .from(bqRevenueSnapshots)
    .orderBy(desc(bqRevenueSnapshots.snapshotDate))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    snapshotDate: row.snapshotDate,
    summary: {
      total_gas: Number(row.totalGas),
      total_campaigns: row.totalCampaigns,
      total_advertisers: row.totalAdvertisers,
      avg_daily_gas: Number(row.avgDailyGas),
      trailing_7d_daily: Number(row.trailing7dAvg),
    },
    monthly: JSON.parse(row.monthlyData || "[]"),
    top_advertisers: JSON.parse(row.topAdvertisers || "[]"),
    exchanges: JSON.parse(row.exchangeBreakdown || "[]"),
    daily_recent: JSON.parse(row.dailyTrend || "[]"),
    fetchedAt: row.fetchedAt,
  };
}

// ── Analysis Cache Helpers ───────────────────────────────────────────

export async function getCachedAnalysis(analysisType: string, inputHash: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(gongAnalysisCache)
    .where(
      and(
        eq(gongAnalysisCache.analysisType, analysisType),
        eq(gongAnalysisCache.inputHash, inputHash),
      )
    )
    .orderBy(desc(gongAnalysisCache.createdAt))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];

  // Check expiry
  if (row.expiresAt && row.expiresAt < Date.now()) return null;

  return {
    ...row,
    result: JSON.parse(row.result),
  };
}

export async function saveCachedAnalysis(input: {
  id: string;
  analysisType: string;
  inputHash: string;
  callCount?: number;
  transcriptCount?: number;
  result: any;
  expiresAt?: number;
}) {
  const db = getDb();
  await db.insert(gongAnalysisCache).values({
    id: input.id,
    analysisType: input.analysisType,
    inputHash: input.inputHash,
    callCount: input.callCount || null,
    transcriptCount: input.transcriptCount || null,
    result: JSON.stringify(input.result),
    expiresAt: input.expiresAt || null,
  });
}

// ── Data Refresh Log Helpers ─────────────────────────────────────────

export async function getLastRefresh(source: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(dataRefreshLog)
    .where(eq(dataRefreshLog.source, source))
    .orderBy(desc(dataRefreshLog.startedAt))
    .limit(1);
  return rows[0] || null;
}

export async function getAllLastRefreshes() {
  const db = getDb();
  const sources = ["sfdc", "gong", "bq"];
  const result: Record<string, any> = {};
  for (const source of sources) {
    const rows = await db
      .select()
      .from(dataRefreshLog)
      .where(eq(dataRefreshLog.source, source))
      .orderBy(desc(dataRefreshLog.startedAt))
      .limit(1);
    result[source] = rows[0] || null;
  }
  return result;
}
