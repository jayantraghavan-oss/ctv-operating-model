/**
 * NeuralShell — The operating system chrome for Meridian.
 * Dark sidebar, status bar, live indicators.
 */
import { Link, useLocation } from "wouter";
import { useAgent } from "@/contexts/AgentContext";
import {
  Brain,
  Zap,
  Shield,
  Radio,
  Crosshair,
  MessageSquare,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Radar,
  Megaphone,
  Users,
  Target,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { modules } from "@/lib/data";

const moduleIcons = [Radar, Megaphone, Users, BarChart3];

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  badge?: string;
}

const commandNav: NavItem[] = [
  { path: "/", label: "Neural Command", icon: <Brain className="w-4 h-4" />, badge: "LIVE" },
  { path: "/swarm", label: "Agent Swarm", icon: <Zap className="w-4 h-4" /> },
  { path: "/approvals", label: "Approval Queue", icon: <Shield className="w-4 h-4" /> },
];

const intelligenceNav: NavItem[] = [
  { path: "/data-pulse", label: "Data Pulse", icon: <Radio className="w-4 h-4" /> },
  { path: "/war-room", label: "War Room", icon: <Crosshair className="w-4 h-4" /> },
  { path: "/simulation", label: "Buyer Sim", icon: <MessageSquare className="w-4 h-4" /> },
];

const legacyNav: NavItem[] = [
  { path: "/model", label: "Operating Model", icon: <BookOpen className="w-4 h-4" /> },
  { path: "/agents", label: "Agent Registry", icon: <Target className="w-4 h-4" /> },
];

export default function NeuralShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { recentRuns } = useAgent();

  const activeRuns = recentRuns.filter((r) => r.status === "running").length;

  function NavLink({ item }: { item: NavItem }) {
    const active = location === item.path;
    return (
      <Link href={item.path}>
        <div
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
            active
              ? "bg-accent text-neon font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          } ${collapsed ? "justify-center" : ""}`}
        >
          <span className={active ? "text-neon" : ""}>{item.icon}</span>
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && item.badge && (
            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-neon/15 text-neon animate-pulse-neon">
              {item.badge}
            </span>
          )}
        </div>
      </Link>
    );
  }

  function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
    return (
      <div className="mb-4">
        {!collapsed && (
          <div className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
            {label}
          </div>
        )}
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-sidebar shrink-0 transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-neon/15 flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4 text-neon" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold tracking-tight text-foreground">MERIDIAN</div>
              <div className="text-[10px] font-mono text-neon">
                {activeRuns > 0 ? "ACTIVE" : "NOMINAL"}
              </div>
            </div>
          )}
        </div>

        {/* System stats */}
        {!collapsed && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-[10px] font-mono">
            <div className="text-center">
              <div className="text-foreground font-semibold">67</div>
              <div className="text-muted-foreground">AGENTS</div>
            </div>
            <div className="text-center">
              <div className="text-foreground font-semibold">{recentRuns.length}</div>
              <div className="text-muted-foreground">RUNS</div>
            </div>
            <div className="text-center">
              <div className="text-foreground font-semibold">{activeRuns}</div>
              <div className="text-muted-foreground">QUEUE</div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <NavGroup label="Command" items={commandNav} />
          <NavGroup label="Intelligence" items={intelligenceNav} />

          {/* Module links */}
          {!collapsed && (
            <div className="mb-4">
              <div className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                Modules
              </div>
              <div className="space-y-0.5">
                {modules.map((mod, i) => {
                  const Icon = moduleIcons[i];
                  const active = location === `/module/${mod.id}`;
                  return (
                    <Link key={mod.id} href={`/module/${mod.id}`}>
                      <div
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                          active
                            ? "bg-accent text-neon font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="truncate">{mod.shortName}</span>
                        <span className="ml-auto text-[10px] font-mono text-muted-foreground/50">
                          M{mod.id}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <NavGroup label="Reference" items={legacyNav} />
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-3 py-3">
          {!collapsed && (
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-7 h-7 rounded-full bg-neon/15 flex items-center justify-center text-[10px] font-bold text-neon shrink-0">
                BB
              </div>
              <div>
                <div className="text-xs font-medium text-foreground">Beth Berger</div>
                <div className="text-[10px] text-muted-foreground">DRI · 2 FTEs · AI-First</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="text-foreground">MERIDIAN</span>
            <span>›</span>
            <span className="text-foreground/70">
              {location === "/"
                ? "Neural Command"
                : location
                    .slice(1)
                    .split(/[-/]/)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  activeRuns > 0 ? "bg-neon animate-pulse-neon" : "bg-emerald-signal"
                }`}
              />
              <span className={activeRuns > 0 ? "text-neon" : "text-emerald-signal"}>
                {activeRuns > 0 ? "ACTIVE" : "NOMINAL"}
              </span>
            </div>
            <span className="text-muted-foreground">
              {new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 lg:p-8 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
