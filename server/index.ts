import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Parse JSON bodies for API routes
  app.use(express.json({ limit: "10mb" }));

  // =========================================================================
  // LLM Proxy — routes /api/llm to Forge API
  // Uses BUILT_IN_FORGE_API_KEY (server-side key that works, unlike the
  // VITE_FRONTEND_FORGE_API_KEY which returns 401).
  //
  // The client sends { stream: true } in the body to request SSE streaming.
  // This matches the Vite dev middleware behavior so both dev and prod work.
  // =========================================================================
  const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
  const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY || "";

  // Handle both /api/llm and /api/llm/stream at the same handler
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
        res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

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
  // Static files + SPA fallback
  // =========================================================================
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
