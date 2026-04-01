import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";
import {
  saveAgentRun,
  updateAgentRun,
  listAgentRuns,
  getAgentRun,
  getAgentRunStats,
  saveWorkflowSession,
  listWorkflowSessions,
  getWorkflowSession,
  getWorkflowSessionStats,
  saveFeedback,
  listFeedback,
  getFeedbackStats,
} from "./db";
import {
  checkConnectorStatus,
  getLastStatus,
  getGongContext,
  getSalesforceContext,
  getSensorTowerContext,
  getSpeedboatContext,
  enrichContext,
  formatContextForPrompt,
  clearCache,
  deepHealthCheck,
} from "./liveData";
import { buildInsightsReport } from "./reporting";
import { fetchBQData, getBQStatus, clearBQCache } from "./bqBridge";

/**
 * Retry helper with exponential backoff for rate-limited LLM calls.
 * Retries up to 3 times with 1s, 2s, 4s delays.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRateLimit =
        err?.message?.includes("Rate") ||
        err?.message?.includes("rate") ||
        err?.message?.includes("429") ||
        err?.message?.includes("Too Many") ||
        err?.message?.includes("exceeded") ||
        err?.status === 429;
      if (!isRateLimit || attempt === maxRetries) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      console.log(`[LLM] Rate limited, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error("Retry exhausted");
}

export const appRouter = router({
  llm: router({
    /**
     * Non-streaming LLM chat completion with retry logic for rate limits.
     * The client sends messages + params, we proxy through the server-side Forge API key.
     */
    chat: publicProcedure
      .input(
        z.object({
          messages: z.array(
            z.object({
              role: z.enum(["system", "user", "assistant"]),
              content: z.string(),
            })
          ),
          temperature: z.number().optional().default(0.7),
          max_tokens: z.number().optional().default(2000),
        })
      )
      .mutation(async ({ input }) => {
        const response = await retryWithBackoff(() =>
          invokeLLM({
            messages: input.messages,
            temperature: input.temperature,
            max_tokens: input.max_tokens,
          })
        );

        const choice = (response as any).choices?.[0];
        return {
          choices: [
            {
              message: {
                role: "assistant" as const,
                content: choice?.message?.content || "No response generated.",
              },
              finish_reason: choice?.finish_reason || "stop",
            },
          ],
        };
      }),
  }),

  agentRuns: router({
    /**
     * Save a new agent run (called when agent starts executing).
     */
    save: publicProcedure
      .input(
        z.object({
          id: z.string(),
          promptId: z.number(),
          promptText: z.string(),
          moduleId: z.number(),
          subModuleName: z.string(),
          agentType: z.string().optional(),
          owner: z.string().optional(),
          status: z.enum(["running", "completed", "failed"]),
          output: z.string().optional(),
          durationMs: z.number().optional(),
          startedAt: z.number(),
          completedAt: z.number().optional(),
          scenarioName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return saveAgentRun(input);
      }),

    /**
     * Update an existing agent run (called when agent completes or fails).
     */
    update: publicProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.enum(["running", "completed", "failed"]).optional(),
          output: z.string().optional(),
          durationMs: z.number().optional(),
          completedAt: z.number().optional(),
          humanEditedOutput: z.string().optional(),
          humanPrompt: z.string().optional(),
          approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return updateAgentRun(id, updates);
      }),

    /**
     * List agent runs with optional filters.
     */
    list: publicProcedure
      .input(
        z.object({
          limit: z.number().optional(),
          offset: z.number().optional(),
          moduleId: z.number().optional(),
          promptId: z.number().optional(),
          status: z.enum(["running", "completed", "failed"]).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return listAgentRuns(input || undefined);
      }),

    /**
     * Get a single agent run by ID.
     */
    get: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getAgentRun(input.id);
      }),

    /**
     * Get aggregate stats about all agent runs.
     */
    stats: publicProcedure.query(async () => {
      return getAgentRunStats();
    }),
  }),

  liveData: router({
    /**
     * Check health/connectivity of all live data sources.
     */
    status: publicProcedure.query(async () => {
      const status = await checkConnectorStatus();
      return status;
    }),

    /**
     * Get cached status without re-checking (fast).
     */
    cachedStatus: publicProcedure.query(async () => {
      return getLastStatus();
    }),

    /**
     * Pull Gong call intelligence.
     */
    gong: publicProcedure
      .input(
        z.object({
          accountName: z.string().optional(),
          days: z.number().optional().default(30),
        }).optional()
      )
      .query(async ({ input }) => {
        return getGongContext(input?.accountName, input?.days);
      }),

    /**
     * Pull Salesforce pipeline and account data.
     */
    salesforce: publicProcedure
      .input(
        z.object({
          accountName: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getSalesforceContext(input?.accountName);
      }),

    /**
     * Pull Sensor Tower app intelligence.
     */
    sensorTower: publicProcedure
      .input(
        z.object({
          appIds: z.array(z.string()).optional(),
          category: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getSensorTowerContext(input?.appIds, input?.category);
      }),

    /**
     * Pull Speedboat advertiser performance.
     */
    speedboat: publicProcedure
      .input(
        z.object({
          advertiserName: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return getSpeedboatContext(input?.advertiserName);
      }),

    /**
     * Enrich context for a specific module — aggregates all relevant sources.
     * Returns formatted context string ready for agent prompt injection.
     */
    enrichContext: publicProcedure
      .input(
        z.object({
          moduleId: z.number(),
          subModuleName: z.string().optional(),
          accountName: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const context = await enrichContext(input.moduleId, input.subModuleName, input.accountName);
        const formatted = formatContextForPrompt(context);
        return {
          ...context,
          formatted,
        };
      }),

    /**
     * Deep health check — actually calls each API, returns latency + sample data.
     */
    deepHealth: publicProcedure.query(async () => {
      return deepHealthCheck();
    }),

    /**
     * Clear all cached data (force refresh).
     */
    clearCache: publicProcedure.mutation(async () => {
      clearCache();
      return { cleared: true };
    }),
  }),

  workflowSessions: router({
    /**
     * Save a completed workflow session.
     */
    save: publicProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
          queryType: z.enum(["preset", "custom"]),
          customQuery: z.string().optional(),
          agentCount: z.number(),
          completedCount: z.number(),
          totalDurationMs: z.number().optional(),
          compiledOutput: z.string(),
          nodeDetails: z.string().optional(),
          startedAt: z.number(),
          completedAt: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return saveWorkflowSession(input);
      }),

    /**
     * List workflow sessions (most recent first).
     */
    list: publicProcedure
      .input(
        z.object({
          limit: z.number().optional(),
          offset: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return listWorkflowSessions(input || undefined);
      }),

    /**
     * Get a single workflow session by ID.
     */
    get: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getWorkflowSession(input.id);
      }),

    /**
     * Get aggregate stats about workflow sessions.
     */
    stats: publicProcedure.query(async () => {
      return getWorkflowSessionStats();
    }),
  }),

  feedback: router({
    /**
     * Submit feedback (thumbs up/down + optional comment) on an agent output.
     */
    submit: publicProcedure
      .input(
        z.object({
          id: z.string(),
          runId: z.string(),
          promptId: z.number(),
          moduleId: z.number(),
          rating: z.enum(["up", "down"]),
          comment: z.string().optional(),
          hadLiveContext: z.boolean().optional(),
          liveDataSources: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return saveFeedback(input);
      }),

    /**
     * List feedback entries with optional filters.
     */
    list: publicProcedure
      .input(
        z.object({
          runId: z.string().optional(),
          moduleId: z.number().optional(),
          limit: z.number().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        return listFeedback(input || undefined);
      }),

    /**
     * Get aggregate feedback stats — includes live vs synthetic comparison.
     */
    stats: publicProcedure.query(async () => {
      return getFeedbackStats();
    }),
  }),

  reporting: router({
    /**
     * Build the full insights report — aggregates all live data sources
     * into revenue tracking, voice of customer, rep pulse, GTM funnel, campaign health.
     */
    insights: publicProcedure.query(async () => {
      return buildInsightsReport();
    }),

    /**
     * Live BigQuery CTV revenue data.
     * Returns monthly breakdown, daily recent, top advertisers, exchanges, concentration.
     * Falls back to null if BQ is unavailable (e.g., no Google ADC in production).
     */
    bqRevenue: publicProcedure
      .query(async () => {
        const data = await fetchBQData(false);
        if (!data) {
          return {
            available: false,
            data: null,
            message: "BigQuery not available — using fallback data",
          };
        }
        return {
          available: true,
          data,
          message: `BQ data fetched at ${data.fetched_at}`,
        };
      }),

    /**
     * BQ connection status for the live data panel.
     */
    bqStatus: publicProcedure.query(async () => {
      return getBQStatus();
    }),

    /**
     * Clear BQ cache (force next request to re-fetch).
     */
    clearBQCache: publicProcedure.mutation(async () => {
      clearBQCache();
      return { cleared: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
