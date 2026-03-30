import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AgentProvider } from "./contexts/AgentContext";
import CommandPalette from "./components/CommandPalette";
import HelpButton from "./components/HelpButton";
import { lazy, Suspense, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Primary pages — the 3-tab structure
import OrgChart from "./pages/OrgChart";
const Toolkit = lazy(() => import("./pages/Toolkit"));
const BuyerSim = lazy(() => import("./pages/BuyerSim"));

// Legacy pages (still accessible via direct URL for deep links)
const NeuralCommand = lazy(() => import("./pages/NeuralCommand"));
const AgentSwarm = lazy(() => import("./pages/AgentSwarm"));
const ApprovalQueue = lazy(() => import("./pages/ApprovalQueue"));
const DataPulse = lazy(() => import("./pages/DataPulse"));
const WarRoom = lazy(() => import("./pages/WarRoom"));
const ModulePage = lazy(() => import("./pages/ModulePage"));
const ClusterPage = lazy(() => import("./pages/ClusterPage"));
const AgentRegistry = lazy(() => import("./pages/AgentRegistry"));
const ModelOverview = lazy(() => import("./pages/ModelOverview"));
const WeeklyPrep = lazy(() => import("./pages/WeeklyPrep"));
const ConvictionDashboard = lazy(() => import("./pages/ConvictionDashboard"));
const LearningLoops = lazy(() => import("./pages/LearningLoops"));
const DataExplorer = lazy(() => import("./pages/DataExplorer"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 bg-background">
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="relative">
          <div className="w-8 h-8 border-2 border-primary/20 rounded-full" />
          <div className="absolute inset-0 w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <span className="text-xs font-medium text-foreground/30">Loading module...</span>
      </motion.div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Switch>
          {/* ── 3-Tab Structure ── */}
          <Route path="/" component={OrgChart} />
          <Route path="/toolkit" component={Toolkit} />
          <Route path="/simulation" component={BuyerSim} />

          {/* ── Legacy deep-link routes (still accessible) ── */}
          <Route path="/module/:id" component={ModulePage} />
          <Route path="/cluster/:id" component={ClusterPage} />
          <Route path="/dashboard" component={NeuralCommand} />
          <Route path="/swarm" component={AgentSwarm} />
          <Route path="/approvals" component={ApprovalQueue} />
          <Route path="/data-pulse" component={DataPulse} />
          <Route path="/war-room" component={WarRoom} />
          <Route path="/model" component={ModelOverview} />
          <Route path="/agents" component={AgentRegistry} />
          <Route path="/weekly-prep" component={WeeklyPrep} />
          <Route path="/conviction" component={ConvictionDashboard} />
          <Route path="/learning-loops" component={LearningLoops} />
          <Route path="/data-explorer" component={DataExplorer} />

          {/* Aliases */}
          <Route path="/org-chart" component={OrgChart} />

          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </AnimatePresence>
    </Suspense>
  );
}

function App() {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AgentProvider>
          <TooltipProvider>
            <Toaster
              position="bottom-right"
              gap={8}
              visibleToasts={4}
              offset={16}
              toastOptions={{
                style: {
                  background: "oklch(1 0 0 / 0.92)",
                  backdropFilter: "blur(20px) saturate(1.5)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
                  border: "1px solid oklch(0 0 0 / 0.06)",
                  boxShadow: "0 4px 24px oklch(0 0 0 / 0.08), 0 1px 3px oklch(0 0 0 / 0.04)",
                  borderRadius: "16px",
                  fontSize: "13px",
                  fontWeight: "500",
                },
              }}
            />
            <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
            <HelpButton />
            <Router />
          </TooltipProvider>
        </AgentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
