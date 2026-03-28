/*
 * Layout — Mobile-first responsive sidebar + content area
 * Features: collapsible sidebar, hamburger menu, bottom nav on mobile,
 * notification bell with unread count, new agentic page links.
 */
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
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
  Menu,
  X,
  Bell,
  Calendar,
  Target,
  GitBranch,
} from "lucide-react";
import { modules, clusters } from "@/lib/data";
import { useAgent } from "@/contexts/AgentContext";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/model", label: "Operating Model", icon: BookOpen },
  { href: "/agents", label: "Assistant Registry", icon: Bot },
];

const agenticItems = [
  { href: "/weekly-prep", label: "Weekly Prep", icon: Calendar },
  { href: "/conviction", label: "Conviction Score", icon: Target },
  { href: "/learning-loops", label: "Learning Loops", icon: GitBranch },
];

const moduleIcons = [Radar, Megaphone, Users, BarChart3];

const mobileNavItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/agents", label: "Assistants", icon: Bot },
  { href: "/weekly-prep", label: "Prep", icon: Calendar },
  { href: "/conviction", label: "Score", icon: Target },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [expandedSection, setExpandedSection] = useState<string | null>("modules");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { unreadCount, notifications, markNotificationRead, clearNotifications } = useAgent();
  const [showNotifs, setShowNotifs] = useState(false);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
    setShowNotifs(false);
  }, [location]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setShowNotifs(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const SidebarContent = () => (
    <>
      {/* Primary nav */}
      <div className="space-y-0.5">
        {navItems.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-[#0091FF]/10 text-[#0091FF] font-medium"
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

      {/* Agentic tools section */}
      <div className="mt-5">
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#0091FF]/60">
          AI Tools
        </div>
        <div className="mt-1 space-y-0.5">
          {agenticItems.map((item) => {
            const active = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    active
                      ? "bg-[#0091FF]/10 text-[#0091FF] font-medium"
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
        <AnimatePresence>
          {expandedSection === "modules" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-0.5">
                {modules.map((mod, i) => {
                  const Icon = moduleIcons[i] || Radar;
                  const active = location === `/module/${mod.id}`;
                  return (
                    <Link key={mod.id} href={`/module/${mod.id}`}>
                      <div
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                          active
                            ? "bg-[#0091FF]/10 text-[#0091FF] font-medium"
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
            </motion.div>
          )}
        </AnimatePresence>
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
        <AnimatePresence>
          {expandedSection === "clusters" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-0.5">
                {clusters.map((cluster) => {
                  const active = location === `/cluster/${cluster.id}`;
                  return (
                    <Link key={cluster.id} href={`/cluster/${cluster.id}`}>
                      <div
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                          active
                            ? "bg-[#0091FF]/10 text-[#0091FF] font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold">{cluster.id}</span>
                        </div>
                        <span className="truncate text-xs">{cluster.shortName}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border flex-col bg-white shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0091FF] flex items-center justify-center">
              <Network className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-foreground">CTV Ops</span>
              <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">v2.0</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <SidebarContent />
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3">
          <div className="text-[11px] text-muted-foreground">
            <div className="font-medium text-foreground text-xs">CTV AI Engine</div>
            <div>Moloco Commercial</div>
            <div className="mt-1 font-mono text-[10px] opacity-50">2 FTEs · AI-First</div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-xl lg:hidden"
            >
              <div className="h-14 flex items-center justify-between px-5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#0091FF] flex items-center justify-center">
                    <Network className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm">CTV Ops</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-3">
                <SidebarContent />
              </nav>
              <div className="border-t border-border px-4 py-3">
                <div className="text-[11px] text-muted-foreground">
                  <div className="font-medium text-foreground text-xs">CTV AI Engine</div>
                  <div>Moloco Commercial · 2 FTEs · AI-First</div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden h-14 border-b border-border flex items-center justify-between px-4 bg-white shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#0091FF] flex items-center justify-center">
              <Network className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">CTV Ops</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="p-2 -mr-2 rounded-lg hover:bg-muted relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Desktop notification bar (subtle) */}
        <div className="hidden lg:flex h-10 border-b border-border items-center justify-between px-6 bg-white/80 backdrop-blur-sm shrink-0">
          <div className="text-[11px] text-muted-foreground font-mono">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-muted text-sm transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="text-xs text-muted-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Notification dropdown */}
        <AnimatePresence>
          {showNotifs && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-4 top-12 lg:top-[88px] w-80 max-h-96 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">Notifications</span>
                <button
                  onClick={clearNotifications}
                  className="text-[11px] text-[#0091FF] hover:underline"
                >
                  Mark all read
                </button>
              </div>
              <div className="overflow-y-auto max-h-72">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors ${
                        !n.read ? "bg-[#0091FF]/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <div className="w-2 h-2 rounded-full bg-[#0091FF] mt-1.5 shrink-0" />}
                        <div className={!n.read ? "" : "ml-4"}>
                          <div className="text-xs font-medium">{n.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.description}</div>
                          <div className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex items-center justify-around px-2 z-30">
          {mobileNavItems.map((item) => {
            const active = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  active ? "text-[#0091FF]" : "text-muted-foreground"
                }`}>
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Click-away for notifications */}
      {showNotifs && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
      )}
    </div>
  );
}
