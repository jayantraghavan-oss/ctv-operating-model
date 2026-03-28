import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";

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
});

export type AppRouter = typeof appRouter;
