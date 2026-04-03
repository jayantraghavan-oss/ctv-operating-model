/**
 * CTV Intelligence — Embedded strategic dashboard.
 * Fetches the Moloco CTV Strategic Dashboard HTML from CDN,
 * creates a blob URL with correct text/html MIME type, and renders in an iframe.
 * This workaround is needed because the CDN serves with application/octet-stream.
 */
import Layout from "@/components/Layout";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

const DASHBOARD_CDN_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663459898851/Wr22fCMnjpJGgmtKZSL2hG/moloco_ctv_dashboard_0c8cfa39.html";

export default function CTVIntelligence() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(DASHBOARD_CDN_URL);
      if (!resp.ok) throw new Error(`Failed to load dashboard (${resp.status})`);
      const html = await resp.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    return () => {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  return (
    <Layout>
      <div className="relative w-full" style={{ height: "calc(100vh - 6.5rem)" }}>
        {/* Loading state */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10"
          >
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading CTV Intelligence Dashboard...</span>
          </motion.div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background z-10">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={loadDashboard}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Dashboard iframe */}
        {blobUrl && (
          <iframe
            ref={iframeRef}
            src={blobUrl}
            title="CTV Strategic Intelligence Dashboard"
            className="w-full h-full border-0 rounded-lg"
            loading="eager"
          />
        )}
      </div>
    </Layout>
  );
}
