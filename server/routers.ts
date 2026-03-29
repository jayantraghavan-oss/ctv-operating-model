import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";
import {
  saveAgentRun,
  updateAgentRun,
  listAgentRuns,
  getAgentRun,
  getAgentRunStats,
} from "./db";

export const appRouter = router({
  llm: router({
    /**
     * Non-streaming LLM chat completion.
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
        const response = await invokeLLM({
          messages: input.messages,
          temperature: input.temperature,
          max_tokens: input.max_tokens,
        });

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
});

export type AppRouter = typeof appRouter;
