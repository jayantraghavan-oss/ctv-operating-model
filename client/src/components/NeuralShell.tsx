/**
 * NeuralShell — Apple-style operating system chrome for Meridian.
 * Frosted glass sidebar, soft shadows, polished typography.
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
  { path: "/", label: "Neural Command", icon: <Brain className="w-[18px] h-[18px]" />, badge: "LIVE" },
  { path: "/swarm", label: "Agent Swarm", icon: <Zap className="w-[18px] h-[18px]" /> },
  { path: "/approvals", label: "Approval Queue", icon: <Shield className="w-[18px] h-[18px]" /> },
];

const intelligenceNav: NavItem[] = [
  { path: "/data-pulse", label: "Data Pulse", icon: <Radio className="w-[18px] h-[18px]" /> },
  { path: "/war-room", label: "War Room", icon: <Crosshair className="w-[18px] h-[18px]" /> },
  { path: "/simulation", label: "Buyer Sim", icon: <MessageSquare className="w-[18px] h-[18px]" /> },
];

const legacyNav: NavItem[] = [
  { path: "/model", label: "Operating Model", icon: <BookOpen className="w-[18px] h-[18px]" /> },
  { path: "/agents", label: "Agent Registry", icon: <Target className="w-[18px] h-[18px]" /> },
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
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all duration-200 ${
            active
              ? "bg-primary/10 text-primary font-semibold shadow-sm"
              : "text-foreground/60 hover:text-foreground hover:bg-black/[0.03]"
          } ${collapsed ? "justify-center px-2" : ""}`}
        >
          <span className={`transition-colors ${active ? "text-primary" : "text-foreground/40"}`}>
            {item.icon}
          </span>
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && item.badge && (
            <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {item.badge}
            </span>
          )}
        </div>
      </Link>
    );
  }

  function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
    return (
      <div className="mb-5">
        {!collapsed && (
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/30">
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
      {/* Sidebar — frosted glass */}
      <aside
        className={`flex flex-col shrink-0 transition-all duration-300 ease-out border-r border-black/[0.06] ${
          collapsed ? "w-[68px]" : "w-[240px]"
        }`}
        style={{
          background: "oklch(1 0 0 / 0.55)",
          backdropFilter: "blur(40px) saturate(1.8)",
          WebkitBackdropFilter: "blur(40px) saturate(1.8)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 shadow-sm">
            <Brain className="w-[18px] h-[18px] text-primary" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-[15px] font-bold tracking-tight text-foreground">Meridian</div>
              <div className="text-[11px] font-medium text-primary/70">
                {activeRuns > 0 ? "Processing" : "Ready"}
              </div>
            </div>
          )}
        </div>

        {/* System stats */}
        {!collapsed && (
          <div className="flex items-center justify-between mx-4 mb-4 px-3 py-2.5 rounded-xl bg-black/[0.03]">
            <div className="text-center">
              <div className="text-[15px] font-bold text-foreground">67</div>
              <div className="text-[10px] font-medium text-foreground/35 uppercase tracking-wide">Agents</div>
            </div>
            <div className="w-px h-6 bg-black/[0.06]" />
            <div className="text-center">
              <div className="text-[15px] font-bold text-foreground">{recentRuns.length}</div>
              <div className="text-[10px] font-medium text-foreground/35 uppercase tracking-wide">Runs</div>
            </div>
            <div className="w-px h-6 bg-black/[0.06]" />
            <div className="text-center">
              <div className="text-[15px] font-bold text-foreground">{activeRuns}</div>
              <div className="text-[10px] font-medium text-foreground/35 uppercase tracking-wide">Active</div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-1 px-3">
          <NavGroup label="Command" items={commandNav} />
          <NavGroup label="Intelligence" items={intelligenceNav} />

          {/* Module links */}
          {!collapsed && (
            <div className="mb-5">
              <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/30">
                Modules
              </div>
              <div className="space-y-0.5">
                {modules.map((mod, i) => {
                  const Icon = moduleIcons[i];
                  const active = location === `/module/${mod.id}`;
                  return (
                    <Link key={mod.id} href={`/module/${mod.id}`}>
                      <div
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all duration-200 ${
                          active
                            ? "bg-primary/10 text-primary font-semibold shadow-sm"
                            : "text-foreground/60 hover:text-foreground hover:bg-black/[0.03]"
                        }`}
                      >
                        <Icon className={`w-[18px] h-[18px] ${active ? "text-primary" : "text-foreground/40"}`} />
                        <span className="truncate">{mod.shortName}</span>
                        <span className="ml-auto text-[10px] font-medium text-foreground/25">
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
        <div className="px-3 py-4 border-t border-black/[0.06]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-violet-signal/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                BB
              </div>
              <div>
                <div className="text-[13px] font-semibold text-foreground">Beth Berger</div>
                <div className="text-[11px] text-foreground/40">DRI · 2 FTEs · AI-First</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-1.5 rounded-lg text-foreground/30 hover:text-foreground/60 hover:bg-black/[0.03] transition-all"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {/* Top bar — frosted glass */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-8 py-3.5 border-b border-black/[0.06]"
          style={{
            background: "oklch(0.985 0.002 250 / 0.8)",
            backdropFilter: "blur(20px) saturate(1.5)",
            WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          }}
        >
          <div className="flex items-center gap-2 text-[13px] text-foreground/40">
            <span className="font-semibold text-foreground">Meridian</span>
            <span className="text-foreground/20">/</span>
            <span>
              {location === "/"
                ? "Neural Command"
                : location
                    .slice(1)
                    .split(/[-/]/)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
            </span>
          </div>
          <div className="flex items-center gap-5 text-[13px]">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  activeRuns > 0 ? "bg-primary animate-pulse-neon" : "bg-emerald-signal"
                }`}
              />
              <span className={`font-medium ${activeRuns > 0 ? "text-primary" : "text-emerald-signal"}`}>
                {activeRuns > 0 ? "Processing" : "Ready"}
              </span>
            </div>
            <span className="text-foreground/30 font-medium">
              {new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-8 lg:p-10 max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}
