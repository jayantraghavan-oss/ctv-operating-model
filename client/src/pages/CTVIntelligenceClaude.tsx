/**
 * CTV Intelligence (Claude) — Embedded HTML dashboard
 * Fetches the Claude-generated CTV intelligence dashboard and renders it via srcdoc iframe.
 */
import Layout from "@/components/Layout";
import { useState, useEffect } from "react";

const DASHBOARD_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663459898851/Wr22fCMnjpJGgmtKZSL2hG/moloco_ctv_dashboard_142ed267.html";

export default function CTVIntelligenceClaude() {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(DASHBOARD_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load dashboard: ${res.status}`);
        return res.text();
      })
      .then((html) => {
        if (!cancelled) {
          setHtmlContent(html);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout>
      <div className="w-full h-[calc(100vh-3rem)] flex flex-col">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              CTV Intelligence (Claude)
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI-generated CTV commercial intelligence dashboard — powered by Claude
            </p>
          </div>
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md border border-border hover:border-foreground/20"
          >
            Open in new tab ↗
          </a>
        </div>
        <div className="flex-1 px-4 pb-4">
          {loading && (
            <div className="w-full h-full rounded-lg border border-border bg-white flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 border-2 border-primary/20 rounded-full" />
                  <div className="absolute inset-0 w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Loading dashboard...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="w-full h-full rounded-lg border border-red-200 bg-red-50 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium text-red-700">Failed to load dashboard</p>
                <p className="text-xs text-red-500 mt-1">{error}</p>
                <a
                  href={DASHBOARD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                >
                  Try opening directly ↗
                </a>
              </div>
            </div>
          )}
          {htmlContent && !loading && (
            <iframe
              srcDoc={htmlContent}
              title="CTV Intelligence (Claude)"
              className="w-full h-full rounded-lg border border-border bg-white"
              sandbox="allow-scripts"
              loading="eager"
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
