import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AgentProvider } from "./contexts/AgentContext";
import { lazy, Suspense } from "react";

// Eager-load core pages
import Home from "./pages/Home";
import ModulePage from "./pages/ModulePage";
import ClusterPage from "./pages/ClusterPage";
import AgentRegistry from "./pages/AgentRegistry";
import ModelOverview from "./pages/ModelOverview";

// Lazy-load new pages
const WeeklyPrep = lazy(() => import("./pages/WeeklyPrep"));
const ConvictionDashboard = lazy(() => import("./pages/ConvictionDashboard"));
const LearningLoops = lazy(() => import("./pages/LearningLoops"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[#0091FF] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/model"} component={ModelOverview} />
        <Route path={"/module/:id"} component={ModulePage} />
        <Route path={"/cluster/:id"} component={ClusterPage} />
        <Route path={"/agents"} component={AgentRegistry} />
        <Route path={"/weekly-prep"} component={WeeklyPrep} />
        <Route path={"/conviction"} component={ConvictionDashboard} />
        <Route path={"/learning-loops"} component={LearningLoops} />
        <Route path={"/404"} component={NotFound} />
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
