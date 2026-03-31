/**
 * LiveDataStatus — Compact indicator showing live data connector health.
 * Shows in the NeuralShell header. Clicking opens a popover with per-source status.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Radio, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ConnectorStatus {
  gong: "connected" | "unavailable" | "error";
  salesforce: "connected" | "unavailable" | "error";
  sensorTower: "connected" | "unavailable" | "error";
  speedboat: "connected" | "unavailable" | "error";
  lastChecked: number;
}

const SOURCE_LABELS: Record<string, string> = {
  gong: "Gong",
  salesforce: "Salesforce",
  sensorTower: "Sensor Tower",
  speedboat: "Speedboat",
};

export default function LiveDataStatus() {
  const [status, setStatus] = useState<ConnectorStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/trpc/liveData.status?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: null } }))}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        setError(`Status check failed (${res.status})`);
        return;
      }
      const data = await res.json();
      const result = data?.[0]?.result?.data?.json;
      if (result) {
        setStatus(result);
      } else {
        setError("Invalid response format");
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Check on mount and every 5 minutes, but pause when tab is hidden
  useEffect(() => {
    checkStatus();
    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(checkStatus, 5 * 60 * 1000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        checkStatus(); // Refresh immediately when tab becomes visible
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkStatus]);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const connectedCount = status
    ? Object.entries(status)
        .filter(([k]) => k !== "lastChecked")
        .filter(([, v]) => v === "connected").length
    : 0;

  const totalSources = 4;
  const allConnected = connectedCount === totalSources;
  const someConnected = connectedCount > 0;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-foreground/5 transition-colors"
        aria-label="Live data status"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 text-foreground/40 animate-spin" />
        ) : (
          <Radio
            className={`w-3.5 h-3.5 ${
              allConnected
                ? "text-emerald-500"
                : someConnected
                ? "text-amber-500"
                : status
                ? "text-red-400"
                : "text-foreground/30"
            }`}
          />
        )}
        <span className="text-[11px] font-medium text-foreground/50 hidden sm:inline">
          {loading
            ? "Checking..."
            : error
            ? "Error"
            : status
            ? `${connectedCount}/${totalSources} Live`
            : "Data Sources"}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden"
          >
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <div className="text-xs font-semibold text-foreground">Live Data Sources</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  checkStatus();
                }}
                className="p-1 rounded hover:bg-foreground/5 transition-colors"
                aria-label="Refresh status"
              >
                <RefreshCw className={`w-3 h-3 text-foreground/40 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            {error && (
              <div className="px-3 py-2 bg-red-50 border-b border-red-100">
                <span className="text-[10px] text-red-600">{error}</span>
              </div>
            )}
            <div className="divide-y divide-border">
              {(["gong", "salesforce", "sensorTower", "speedboat"] as const).map((key) => {
                const s = status?.[key];
                return (
                  <div key={key} className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          s === "connected"
                            ? "bg-emerald-500"
                            : s === "unavailable"
                            ? "bg-foreground/20"
                            : s === "error"
                            ? "bg-red-400"
                            : "bg-foreground/10"
                        }`}
                      />
                      <span className="text-xs text-foreground/70">{SOURCE_LABELS[key]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {s === "connected" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-600 font-medium">Connected</span>
                        </>
                      ) : s === "error" ? (
                        <>
                          <XCircle className="w-3 h-3 text-red-400" />
                          <span className="text-[10px] text-red-500 font-medium">Error</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-foreground/40">
                          {s === "unavailable" ? "Unavailable" : "Unknown"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {status?.lastChecked && (
              <div className="px-3 py-1.5 border-t border-border">
                <span className="text-[10px] text-foreground/30">
                  Last checked: {new Date(status.lastChecked).toLocaleTimeString()}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
