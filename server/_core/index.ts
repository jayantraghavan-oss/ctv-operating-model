/**
 * Production & Development server entry point.
 * 
 * Development: Express + Vite dev middleware (HMR) + LLM proxy + tRPC
 * Production:  Express + static files + LLM proxy + tRPC
 *
 * The deployment platform may override this file with its own _core/index.ts.
 * If it does, the client LLM module falls back to /api/trpc/llm.chat.
 */
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Parse JSON bodies for API routes
  app.use(express.json({ limit: "10mb" }));

  // =========================================================================
  // LLM Proxy — routes /api/llm to Forge API
  // =========================================================================
  const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
  const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY || "";

  const llmHandler = async (req: express.Request, res: express.Response) => {
    try {
      const payload = req.body;
      const isStream = payload.stream === true;

      const forgeRes = await fetch(`${FORGE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FORGE_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!forgeRes.ok) {
        const errText = await forgeRes.text().catch(() => "Unknown error");
        res.status(forgeRes.status).json({ error: errText });
        return;
      }

      if (isStream && forgeRes.body) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");

        const reader = (forgeRes.body as any).getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(value);
          }
        };
        pump().catch(() => res.end());
      } else {
        const data = await forgeRes.json();
        res.json(data);
      }
    } catch (e: any) {
      console.error("[LLM Proxy Error]", e.message);
      if (!res.headersSent) {
        res.status(500).json({ error: e.message || "Internal error" });
      }
    }
  };

  app.post("/api/llm/stream", llmHandler);
  app.post("/api/llm", llmHandler);

  // =========================================================================
  // tRPC routes (template compatibility — fallback for when /api/llm is unavailable)
  // =========================================================================
  try {
    const { appRouter } = await import("../routers.js");
    const trpcExpress = await import("@trpc/server/adapters/express");
    app.use(
      "/api/trpc",
      trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext: () => ({}),
      })
    );
    console.log("[Server] tRPC routes mounted at /api/trpc");
  } catch (e: any) {
    console.warn("[Server] tRPC setup skipped:", e.message);
  }

  // =========================================================================
  // Development: Vite dev middleware for HMR
  // Production: Static files + SPA fallback
  // =========================================================================
  if (isDev) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[Server] Vite dev middleware attached (HMR enabled)");
    } catch (e: any) {
      console.warn("[Server] Vite dev middleware failed:", e.message);
      // Fallback: serve from dist/public if available
      const staticPath = path.resolve(__dirname, "..", "dist", "public");
      app.use(express.static(staticPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(staticPath, "index.html"));
      });
    }
  } else {
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
