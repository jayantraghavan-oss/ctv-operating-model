/*
 * Layout — Persistent sidebar + content area
 * Design: Clean, minimal, Moloco-branded operational tool
 */
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Radar,
  Megaphone,
  Users,
  BarChart3,
  Bot,
  ChevronRight,
  Network,
  BookOpen,
} from "lucide-react";
import { modules, clusters } from "@/lib/data";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/model", label: "Operating Model", icon: BookOpen },
  { href: "/agents", label: "Agent Registry", icon: Bot },
];

const moduleIcons = [Radar, Megaphone, Users, BarChart3];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [expandedSection, setExpandedSection] = useState<string | null>("modules");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col bg-white shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#0091FF] flex items-center justify-center">
              <Network className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-foreground">CTV Ops</span>
              <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">v1.0</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {/* Primary nav */}
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-[#0091FF]/8 text-[#0091FF] font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Modules section */}
          <div className="mt-5">
            <button
              onClick={() => setExpandedSection(expandedSection === "modules" ? null : "modules")}
              className="flex items-center justify-between w-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Work Modules</span>
              <ChevronRight
                className={`w-3 h-3 transition-transform ${expandedSection === "modules" ? "rotate-90" : ""}`}
              />
            </button>
            {expandedSection === "modules" && (
              <div className="mt-1 space-y-0.5">
                {modules.map((mod, i) => {
                  const Icon = moduleIcons[i] || Radar;
                  const active = location === `/module/${mod.id}`;
                  return (
                    <Link key={mod.id} href={`/module/${mod.id}`}>
                      <div
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                          active
                            ? "bg-[#0091FF]/8 text-[#0091FF] font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{mod.shortName}</span>
                        <span className="ml-auto text-[10px] font-mono opacity-50">M{mod.id}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Clusters section */}
          <div className="mt-4">
            <button
              onClick={() => setExpandedSection(expandedSection === "clusters" ? null : "clusters")}
              className="flex items-center justify-between w-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Orchestrator Clusters</span>
              <ChevronRight
                className={`w-3 h-3 transition-transform ${expandedSection === "clusters" ? "rotate-90" : ""}`}
              />
            </button>
            {expandedSection === "clusters" && (
              <div className="mt-1 space-y-0.5">
                {clusters.map((cluster) => {
                  const active = location === `/cluster/${cluster.id}`;
                  return (
                    <Link key={cluster.id} href={`/cluster/${cluster.id}`}>
                      <div
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                          active
                            ? "bg-[#0091FF]/8 text-[#0091FF] font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold">{cluster.id}</span>
                        </div>
                        <span className="truncate">{cluster.shortName}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3">
          <div className="text-[11px] text-muted-foreground">
            <div className="font-medium text-foreground">Beth Berger</div>
            <div>Head of CTV Programs</div>
            <div className="mt-1 font-mono text-[10px] opacity-50">2 FTEs · AI-First</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
