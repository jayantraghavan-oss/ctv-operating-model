/**
 * NeuralShell — CTV AI Commercial Engine chrome.
 * Mobile-first: bottom nav on mobile, frosted sidebar on desktop.
 * Moloco branding with cloud+M logo throughout.
 */
import { Link, useLocation } from "wouter";
import { useAgent } from "@/contexts/AgentContext";
import { useIsMobile } from "@/hooks/useMobile";
import { useAuth } from "@/hooks/useAuth";
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
  Menu,
  X,
  Bell,
  Activity,
  LogIn,
  Network,
  RotateCcw,
} from "lucide-react";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { modules, getTotalStats } from "@/lib/data";
import { getLoginUrl } from "@/const";

const MOLOCO_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663459898851/Wr22fCMnjpJGgmtKZSL2hG/moloco-logo-blue_486481be.png";

const moduleIcons = [Radar, Megaphone, Users, BarChart3];

interface NavItem {
  path: string;
  label: string;
  shortLabel?: string;
  icon: typeof Brain;
}

const commandNav: NavItem[] = [
  { path: "/", label: "Dashboard", shortLabel: "Home", icon: Brain },
  { path: "/swarm", label: "AI Assistants", shortLabel: "Assistants", icon: Zap },
  { path: "/approvals", label: "Approvals", shortLabel: "Approve", icon: Shield },
];

const intelligenceNav: NavItem[] = [
  { path: "/data-pulse", label: "Insights", shortLabel: "Insights", icon: Radio },
  { path: "/war-room", label: "Competitive Sims", shortLabel: "Compete", icon: Crosshair },
  { path: "/simulation", label: "Buyer Roleplay", shortLabel: "Roleplay", icon: MessageSquare },
];

const legacyNav: NavItem[] = [
  { path: "/org-chart", label: "Org Map", icon: Network },
  { path: "/model", label: "Operating Model", icon: BookOpen },
  { path: "/agents", label: "Assistant Registry", icon: Target },
];

// Bottom nav items for mobile — most important screens
const bottomNav: NavItem[] = [
  { path: "/", label: "Home", icon: Brain },
  { path: "/swarm", label: "Assistants", icon: Zap },
  { path: "/simulation", label: "Roleplay", icon: MessageSquare },
  { path: "/data-pulse", label: "Insights", icon: Radio },
  { path: "/war-room", label: "Compete", icon: Crosshair },
];

export default function NeuralShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { recentRuns, unreadCount, notifications, markNotificationRead, clearNotifications } = useAgent();
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { user, isAuthenticated } = useAuth();

  const activeRuns = recentRuns.filter((r) => r.status === "running").length;

  // Get user initials for avatar
  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const userName = user?.name || "Guest";

  // Close mobile menu and notifications on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowNotifs(false);
  }, [location]);

  // Close notifications on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowNotifs(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function NavLink({ item, compact }: { item: NavItem; compact?: boolean }) {
    const active = location === item.path;
    const Icon = item.icon;
    return (
      <Link href={item.path}>
        <motion.div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] transition-all duration-200 ${
            active
              ? "bg-primary/10 text-primary font-semibold"
              : "text-foreground/50 hover:text-foreground hover:bg-black/[0.03]"
          } ${compact ? "justify-center px-2.5" : ""}`}
          whileHover={{ x: compact ? 0 : 2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-primary" : "text-foreground/35"}`} />
          {!compact && <span className="truncate">{item.label}</span>}
          {!compact && active && (
            <motion.div
              layoutId="nav-active-dot"
              className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </motion.div>
      </Link>
    );
  }

  function NavGroup({ label, items, compact }: { label: string; items: NavItem[]; compact?: boolean }) {
    return (
      <div className="mb-4">
        {!compact && (
          <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/25">
            {label}
          </div>
        )}
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavLink key={item.path} item={item} compact={compact} />
          ))}
        </div>
      </div>
    );
  }

  // ── Mobile Layout ──
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Mobile Top Bar */}
        <header
          className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] shrink-0"
          style={{
            background: "oklch(0.985 0.002 250 / 0.85)",
            backdropFilter: "blur(20px) saturate(1.5)",
            WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <img src={MOLOCO_LOGO} alt="Moloco" className="w-8 h-8 object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold tracking-tight text-foreground">CTV AI Engine</span>
                <div className={`w-2 h-2 rounded-full shrink-0 ${activeRuns > 0 ? "bg-primary animate-pulse" : "bg-emerald-signal"}`} />
              </div>
              <div className="text-[11px] font-medium text-foreground/35">
                {activeRuns > 0 ? `${activeRuns} running` : "Ready"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Refresh */}
            <button
              onClick={() => window.location.reload()}
              className="p-2.5 rounded-xl hover:bg-black/[0.03] transition-colors active:bg-black/[0.06]"
              title="Refresh"
            >
              <RotateCcw className="w-4 h-4 text-foreground/40" />
            </button>
            {/* Notifications */}
            <div className="relative" ref={isMobile ? notifRef : undefined}>
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2.5 rounded-xl hover:bg-black/[0.03] transition-colors active:bg-black/[0.06]"
              >
                <Bell className="w-4.5 h-4.5 text-foreground/40" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-signal text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotifs && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="fixed left-3 right-3 top-16 max-h-[70vh] bg-white border border-black/[0.08] rounded-2xl shadow-xl z-50 overflow-hidden"
                    style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                      <span className="text-[14px] font-bold text-foreground">Notifications</span>
                      <button onClick={clearNotifications} className="text-[12px] text-primary hover:underline font-medium py-1 px-2">Mark all read</button>
                    </div>
                    <div className="overflow-y-auto max-h-[60vh]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-10 h-10 text-foreground/15 mx-auto mb-3" />
                          <div className="text-[14px] text-foreground/40">No notifications yet</div>
                          <div className="text-[12px] text-foreground/25 mt-1">Run an AI assistant to see updates here</div>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markNotificationRead(n.id)}
                            className={`px-4 py-3.5 border-b border-black/[0.04] cursor-pointer active:bg-black/[0.04] transition-colors ${
                              !n.read ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                              <div className={!n.read ? "" : "ml-[18px]"}>
                                <div className="text-[13px] font-semibold text-foreground">{n.title}</div>
                                <div className="text-[12px] text-foreground/50 mt-0.5 line-clamp-2">{n.description}</div>
                                <div className="text-[11px] text-foreground/25 mt-1 font-mono">
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
            </div>
            {/* Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl hover:bg-black/[0.03] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-foreground/50" /> : <Menu className="w-5 h-5 text-foreground/50" />}
            </button>
          </div>
        </header>

        {/* Mobile Slide-Over Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/20"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-background border-l border-black/[0.06] overflow-y-auto"
                style={{
                  backdropFilter: "blur(40px) saturate(2)",
                  WebkitBackdropFilter: "blur(40px) saturate(2)",
                }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[15px] font-bold text-foreground">Navigation</span>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-black/[0.04]">
                      <X className="w-5 h-5 text-foreground/40" />
                    </button>
                  </div>
                  <NavGroup label="Home" items={commandNav} />
                  <NavGroup label="Tools" items={intelligenceNav} />
                  {/* Module links */}
                  <div className="mb-4">
                    <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/25">
                      Modules
                    </div>
                    <div className="space-y-0.5">
                      {modules.map((mod, i) => {
                        const Icon = moduleIcons[i];
                        const active = location === `/module/${mod.id}`;
                        return (
                          <Link key={mod.id} href={`/module/${mod.id}`}>
                            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] transition-all ${
                              active ? "bg-primary/10 text-primary font-semibold" : "text-foreground/50"
                            }`}>
                              <Icon className={`w-[18px] h-[18px] ${active ? "text-primary" : "text-foreground/35"}`} />
                              <span className="truncate">{mod.shortName}</span>
                              <span className="ml-auto text-[10px] text-foreground/20 font-medium">M{mod.id}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                  <NavGroup label="Reference" items={legacyNav} />
                  {/* User */}
                  <div className="mt-6 pt-4 border-t border-black/[0.06]">
                    {isAuthenticated ? (
                      <div className="flex items-center gap-2.5 px-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-violet-signal/20 flex items-center justify-center text-[11px] font-bold text-primary">
                          {userInitials}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-foreground">{userName}</div>
                          <div className="text-[11px] text-foreground/35">Operator</div>
                        </div>
                      </div>
                    ) : (
                      <a href={getLoginUrl()} className="flex items-center gap-2.5 px-2 text-primary hover:underline">
                        <LogIn className="w-4 h-4" />
                        <span className="text-[13px] font-medium">Sign In</span>
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 pb-24 max-w-[1440px] mx-auto">{children}</div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/[0.06] px-2 pb-[env(safe-area-inset-bottom)]"
          style={{
            background: "oklch(0.985 0.002 250 / 0.9)",
            backdropFilter: "blur(24px) saturate(1.8)",
            WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          }}
        >
          <div className="flex items-center justify-around py-1.5">
            {bottomNav.map((item) => {
              const active = location === item.path;
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path}>
                  <motion.div
                    className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl"
                    whileTap={{ scale: 0.9 }}
                  >
                    <div className={`relative p-1.5 rounded-xl transition-colors ${active ? "bg-primary/10" : ""}`}>
                      <Icon className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-foreground/30"}`} />
                      {active && (
                        <motion.div
                          layoutId="bottom-nav-indicator"
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold transition-colors ${active ? "text-primary" : "text-foreground/30"}`}>
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  // ── Desktop Layout ──
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <motion.aside
        className="flex flex-col shrink-0 border-r border-black/[0.06] overflow-hidden"
        animate={{ width: collapsed ? 68 : 248 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          background: "oklch(1 0 0 / 0.55)",
          backdropFilter: "blur(40px) saturate(1.8)",
          WebkitBackdropFilter: "blur(40px) saturate(1.8)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5">
          <motion.div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <img src={MOLOCO_LOGO} alt="Moloco" className="w-9 h-9 object-contain" />
          </motion.div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-[14px] font-bold tracking-tight text-foreground">CTV AI Engine</div>
              <div className="text-[10px] font-semibold text-primary/60 uppercase tracking-wider">Moloco</div>
            </motion.div>
          )}
        </div>

        {/* System pulse */}
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mx-4 mb-4 px-3 py-2.5 rounded-2xl bg-black/[0.03]"
          >
            <div className="text-center">
              <div className="text-[15px] font-bold text-foreground">{getTotalStats().totalPrompts}</div>
              <div className="text-[9px] font-bold text-foreground/25 uppercase tracking-wider">Assistants</div>
            </div>
            <div className="w-px h-6 bg-black/[0.06]" />
            <div className="text-center">
              <div className="text-[15px] font-bold text-foreground">{recentRuns.length}</div>
              <div className="text-[9px] font-bold text-foreground/25 uppercase tracking-wider">Runs</div>
            </div>
            <div className="w-px h-6 bg-black/[0.06]" />
            <div className="text-center">
              <div className={`text-[15px] font-bold ${activeRuns > 0 ? "text-primary" : "text-foreground"}`}>{activeRuns}</div>
              <div className="text-[9px] font-bold text-foreground/25 uppercase tracking-wider">Live</div>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-1 px-3">
          <NavGroup label="Home" items={commandNav} compact={collapsed} />
          <NavGroup label="Tools" items={intelligenceNav} compact={collapsed} />

          {/* Module links */}
          {!collapsed && (
            <div className="mb-4">
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/25">
                Modules
              </div>
              <div className="space-y-0.5">
                {modules.map((mod, i) => {
                  const Icon = moduleIcons[i];
                  const active = location === `/module/${mod.id}`;
                  return (
                    <Link key={mod.id} href={`/module/${mod.id}`}>
                      <motion.div
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] transition-all duration-200 ${
                          active
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground/50 hover:text-foreground hover:bg-black/[0.03]"
                        }`}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      >
                        <Icon className={`w-[18px] h-[18px] ${active ? "text-primary" : "text-foreground/35"}`} />
                        <span className="truncate">{mod.shortName}</span>
                        <span className="ml-auto text-[10px] font-medium text-foreground/20">M{mod.id}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <NavGroup label="Reference" items={legacyNav} compact={collapsed} />
        </nav>

        {/* Footer — dynamic user */}
        <div className="px-3 py-4 border-t border-black/[0.06]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 mb-3 px-2">
              {isAuthenticated ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-violet-signal/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                    {userInitials}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-foreground">{userName}</div>
                    <div className="text-[11px] text-foreground/35">Operator</div>
                  </div>
                </>
              ) : (
                <a href={getLoginUrl()} className="flex items-center gap-2 text-primary hover:underline">
                  <LogIn className="w-4 h-4" />
                  <span className="text-[13px] font-medium">Sign In</span>
                </a>
              )}
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-1.5 rounded-xl text-foreground/25 hover:text-foreground/50 hover:bg-black/[0.03] transition-all"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {/* Top bar */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-8 py-3 border-b border-black/[0.06]"
          style={{
            background: "oklch(0.985 0.002 250 / 0.85)",
            backdropFilter: "blur(20px) saturate(1.5)",
            WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          }}
        >
          <div className="flex items-center gap-2 text-[13px] text-foreground/35">
            <img src={MOLOCO_LOGO} alt="Moloco" className="w-5 h-5 object-contain" />
            <span className="font-bold text-foreground">CTV AI Engine</span>
            <span className="text-foreground/15">/</span>
            <span className="font-medium">
              {location === "/"
                ? "Dashboard"
                : location
                    .slice(1)
                    .split(/[-/]/)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[13px]">
            {/* Refresh */}
            <button
              onClick={() => window.location.reload()}
              className="p-1.5 rounded-lg hover:bg-black/[0.03] transition-colors group"
              title="Refresh"
            >
              <RotateCcw className="w-4 h-4 text-foreground/35 group-hover:text-foreground/60 transition-colors" />
            </button>
            {/* Notifications */}
            <div className="relative" ref={!isMobile ? notifRef : undefined}>
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-1.5 rounded-lg hover:bg-black/[0.03] transition-colors"
              >
                <Bell className="w-4 h-4 text-foreground/35" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-signal text-[9px] font-bold text-white flex items-center justify-center"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </button>
              <AnimatePresence>
                {showNotifs && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute right-0 top-10 w-80 max-h-96 bg-white border border-black/[0.08] rounded-2xl shadow-xl z-50 overflow-hidden"
                    style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
                      <span className="text-[13px] font-bold text-foreground">Notifications</span>
                      <button onClick={clearNotifications} className="text-[11px] text-primary hover:underline font-medium">Mark all read</button>
                    </div>
                    <div className="overflow-y-auto max-h-72">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <Bell className="w-8 h-8 text-foreground/15 mx-auto mb-2" />
                          <div className="text-[13px] text-foreground/40">No notifications yet</div>
                          <div className="text-[11px] text-foreground/25 mt-1">Run an AI assistant to see updates here</div>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => markNotificationRead(n.id)}
                            className={`px-4 py-3 border-b border-black/[0.04] cursor-pointer hover:bg-black/[0.02] transition-colors ${
                              !n.read ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                              <div className={!n.read ? "" : "ml-[18px]"}>
                                <div className="text-[12px] font-semibold text-foreground">{n.title}</div>
                                <div className="text-[11px] text-foreground/50 mt-0.5 line-clamp-2">{n.description}</div>
                                <div className="text-[10px] text-foreground/25 mt-1 font-mono">
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
            </div>
            {/* Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-colors ${activeRuns > 0 ? "bg-primary animate-pulse-neon" : "bg-emerald-signal"}`} />
              <span className={`font-semibold ${activeRuns > 0 ? "text-primary" : "text-emerald-signal"}`}>
                {activeRuns > 0 ? "Working..." : "Ready"}
              </span>
            </div>
            <span className="text-foreground/20 font-medium">
              {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 lg:p-8 xl:p-10 max-w-[1440px]">{children}</div>
      </main>

      {/* Click-away for notifications */}
      {showNotifs && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
      )}
    </div>
  );
}
