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
import {
  getSpeedboatAuthUrl,
  exchangeCodeForToken,
  getAuthStatus,
  pullAllCtvAdvertiserData,
  pullAdvertiserData,
} from "../speedboatClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Parse JSON bodies for API routes
  app.use(express.json({ limit: "10mb" }));

  // =========================================================================
  // Speedboat OAuth Callback + API routes
  // =========================================================================

  // Start the OAuth flow — returns the auth URL for the browser
  app.get("/api/speedboat/auth", async (req, res) => {
    try {
      const origin = (req.query.origin as string) || `${req.protocol}://${req.get("host")}`;
      const authUrl = await getSpeedboatAuthUrl(origin);
      res.json({ authUrl });
    } catch (e: any) {
      console.error("[Speedboat] Auth URL generation failed:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // OAuth callback — exchanges code for token
  app.get("/api/speedboat/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code || !state) {
        res.status(400).send("Missing code or state parameter");
        return;
      }

      const success = await exchangeCodeForToken(code, state);

      if (success) {
        // Redirect back to the reporting page with a success indicator
        res.send(`
          <html>
            <head><title>Speedboat Connected</title></head>
            <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0a0a0a; color: #fff;">
              <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">&#10003;</div>
                <h2>Speedboat Connected</h2>
                <p style="color: #888;">Live campaign data is now flowing into the reporting dashboard.</p>
                <p style="color: #888;">You can close this tab and return to the app.</p>
                <script>setTimeout(() => { window.opener?.postMessage('speedboat-auth-success', '*'); }, 500);</script>
              </div>
            </body>
          </html>
        `);
      } else {
        res.status(401).send("Token exchange failed — please try again.");
      }
    } catch (e: any) {
      console.error("[Speedboat] Callback error:", e.message);
      res.status(500).send(`Auth error: ${e.message}`);
    }
  });

  // Check Speedboat auth status
  app.get("/api/speedboat/status", (_req, res) => {
    res.json(getAuthStatus());
  });

  // Pull data for a single advertiser
  app.get("/api/speedboat/advertiser/:name", async (req, res) => {
    try {
      const data = await pullAdvertiserData(req.params.name);
      if (data) {
        res.json(data);
      } else {
        res.status(404).json({ error: "No data found or not authenticated" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Pull data for all CTV advertisers
  app.get("/api/speedboat/all-ctv", async (_req, res) => {
    try {
      const data = await pullAllCtvAdvertiserData();
      res.json({ advertisers: data, count: data.length, timestamp: Date.now() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // =========================================================================
  // LLM Proxy — routes /api/llm to Forge API
  // =========================================================================
  const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
  const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY || "";

  // Retry helper for rate-limited Forge API calls
  const forgeCallWithRetry = async (payload: any, maxRetries = 3): Promise<Response> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const forgeRes = await fetch(`${FORGE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FORGE_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      if (forgeRes.status === 429 && attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
        console.log(`[LLM Proxy] Rate limited (429), retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return forgeRes;
    }
    throw new Error("Forge API retry exhausted");
  };

  const llmHandler = async (req: express.Request, res: express.Response) => {
    try {
      const payload = req.body;
      const isStream = payload.stream === true;

      const forgeRes = await forgeCallWithRetry(payload);

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
        server: {
          middlewareMode: true,
          hmr: { server },
        },
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
