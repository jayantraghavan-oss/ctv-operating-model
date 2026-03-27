import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ModulePage from "./pages/ModulePage";
import ClusterPage from "./pages/ClusterPage";
import AgentRegistry from "./pages/AgentRegistry";
import ModelOverview from "./pages/ModelOverview";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/model"} component={ModelOverview} />
      <Route path={"/module/:id"} component={ModulePage} />
      <Route path={"/cluster/:id"} component={ClusterPage} />
      <Route path={"/agents"} component={AgentRegistry} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
