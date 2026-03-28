import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AgentProvider } from "./contexts/AgentContext";
import { lazy, Suspense } from "react";

// Neural command center pages
import NeuralCommand from "./pages/NeuralCommand";
const AgentSwarm = lazy(() => import("./pages/AgentSwarm"));
const ApprovalQueue = lazy(() => import("./pages/ApprovalQueue"));
const DataPulse = lazy(() => import("./pages/DataPulse"));
const WarRoom = lazy(() => import("./pages/WarRoom"));
const BuyerSim = lazy(() => import("./pages/BuyerSim"));

// Legacy pages (still accessible)
const ModulePage = lazy(() => import("./pages/ModulePage"));
const ClusterPage = lazy(() => import("./pages/ClusterPage"));
const AgentRegistry = lazy(() => import("./pages/AgentRegistry"));
const ModelOverview = lazy(() => import("./pages/ModelOverview"));
const WeeklyPrep = lazy(() => import("./pages/WeeklyPrep"));
const ConvictionDashboard = lazy(() => import("./pages/ConvictionDashboard"));
const LearningLoops = lazy(() => import("./pages/LearningLoops"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-neon border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-muted-foreground">Loading module...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Neural command center */}
        <Route path="/" component={NeuralCommand} />
        <Route path="/swarm" component={AgentSwarm} />
        <Route path="/approvals" component={ApprovalQueue} />
        <Route path="/data-pulse" component={DataPulse} />
        <Route path="/war-room" component={WarRoom} />
        <Route path="/simulation" component={BuyerSim} />

        {/* Legacy module views */}
        <Route path="/model" component={ModelOverview} />
        <Route path="/module/:id" component={ModulePage} />
        <Route path="/cluster/:id" component={ClusterPage} />
        <Route path="/agents" component={AgentRegistry} />
        <Route path="/weekly-prep" component={WeeklyPrep} />
        <Route path="/conviction" component={ConvictionDashboard} />
        <Route path="/learning-loops" component={LearningLoops} />

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AgentProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AgentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
