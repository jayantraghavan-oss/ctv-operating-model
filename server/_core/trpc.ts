/**
 * Local stub for _core/trpc — the deployment platform injects the real implementation.
 * This file exists only for local TypeScript resolution.
 */
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

const t = initTRPC.create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure;
