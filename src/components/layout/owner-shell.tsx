"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Truck,
  BarChart3,
  Bell,
  ClipboardList,
  Factory,
  Home,
  LogOut,
  Menu,
  Search,
  Sparkles,
  Users,
  CircleCheckBig,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Settings, Shield, Plus , Package, ShoppingCart, Wrench, FlaskConical, Database } from "lucide-react";
import { SystemRole } from "@prisma/client";
import { can, Permission, type PermissionMatrix } from "@/lib/permissions";
import { InstallPromptBanner } from "./InstallPromptBanner";
import { BRAND_ACCENT } from "@/lib/brand";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission: Permission;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/owner/dashboard", icon: <Home className="h-4.5 w-4.5" />, permission: "VIEW_DASHBOARD" },
    ]
  },
  {
    title: "Operations",
    items: [
      { label: "Inventory", href: "/owner/inventory", icon: <Package className="h-4.5 w-4.5" />, permission: "CREATE_ORDER" },
      { label: "Purchase", href: "/owner/purchase", icon: <ShoppingCart className="h-4.5 w-4.5" />, permission: "CREATE_ORDER" },
      { label: "Order Taking", href: "/owner/order-taking", icon: <ClipboardList className="h-4.5 w-4.5" />, permission: "CREATE_ORDER" },
      { label: "Production", href: "/owner/production", icon: <Wrench className="h-4.5 w-4.5" />, permission: "CREATE_ORDER" },
      { label: "Logistics", href: "/owner/logistics", icon: <Truck className="h-4.5 w-4.5" />, permission: "CREATE_ORDER" },
    ]
  },
  {
    title: "Quality",
    items: [
      { label: "Floor", href: "/owner/floor", icon: <FlaskConical className="h-4.5 w-4.5" />, permission: "QC_QUEUE" },
      { label: "Reports", href: "/owner/reports", icon: <CircleCheckBig className="h-4.5 w-4.5" />, permission: "VIEW_REPORTS" },
    ]
  },
];

// Config-style destinations pinned to the top bar (next to the theme switch)
// instead of the sidebar.
const topbarItems: NavItem[] = [
  { label: "Master Data", href: "/owner/settings/master-data", icon: <Database className="h-4 w-4" />, permission: "ACCESS_MASTER_DATA" },
  { label: "Team", href: "/owner/team", icon: <Users className="h-4 w-4" />, permission: "MANAGE_TEAM" },
  { label: "Departments", href: "/owner/departments", icon: <Factory className="h-4 w-4" />, permission: "MANAGE_TEAM" },
  { label: "Settings", href: "/owner/settings", icon: <Settings className="h-4 w-4" />, permission: "ACCESS_SETTINGS" },
];

// Flat list for active item detection (sidebar + topbar destinations)
const navItems: NavItem[] = [...navGroups.flatMap(g => g.items), ...topbarItems];

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
};

export function OwnerShell({
  factoryName,
  factoryLogo,
  userName,
  themeColor,
  userRole = "OWNER" as SystemRole,
  permissionMatrix,
  children,
}: {
  factoryName: string;
  factoryLogo?: string | null;
  userName: string;
  themeColor?: string;
  userRole?: SystemRole;
  permissionMatrix?: PermissionMatrix;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadNotifications() {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { notifications?: NotificationItem[] };
      setNotifications(payload.notifications ?? []);
    }

    void loadNotifications();
  }, []);

  useEffect(() => {
    function onClickAway(event: MouseEvent) {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const activeItem = useMemo(
    () => navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
    [pathname],
  );
  const globalSearchPath = pathname.startsWith("/owner/search") ? "/owner/search" : "/owner/search";
  const unreadCount = notifications.filter((item) => !item.read).length;
  const breadcrumb = [
    "Factory",
    activeItem?.label ?? "Overview",
  ].join(" > ");

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <>
      <InstallPromptBanner accentColor={themeColor || BRAND_ACCENT} />
      {themeColor && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --accent: ${themeColor};
            --accent-soft: ${themeColor}26;
            --brand: ${themeColor};
            --brand-soft: ${themeColor}26;
            --brand-strong: ${themeColor};
          }
          .dark {
            --accent: ${themeColor};
            --accent-soft: ${themeColor}33;
            --brand: ${themeColor};
            --brand-soft: ${themeColor}33;
            --brand-strong: ${themeColor};
          }
        ` }} />
      )}
      
      {/* ==================================================
          DESKTOP & TABLET SHELL (md and up)
          ================================================== */}
      <div className="hidden md:flex h-screen w-full overflow-hidden bg-background text-text-primary">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,87,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(0,182,122,0.06),transparent_24%)] dark:opacity-40" />
        
        {/* Sidebar */}
        <aside className="w-[80px] xl:w-[260px] shrink-0 border-r border-border bg-[rgba(255,255,255,0.84)] dark:bg-[rgba(10,10,10,0.84)] backdrop-blur-xl flex flex-col min-w-0">
          <div className="flex h-16 items-center justify-center xl:justify-start gap-3 border-b border-border px-5 shrink-0">
            <Link href="/owner/dashboard" className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white overflow-hidden">
                {factoryLogo ? (
                  <img src={factoryLogo} alt="Factory Logo" className="h-full w-full object-cover" />
                ) : (
                  <Factory className="h-4 w-4" />
                )}
              </div>
              <div className="hidden xl:block min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-tertiary truncate">
                  Verity
                </p>
                <p className="text-xs font-semibold text-text-primary truncate">{factoryName}</p>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 xl:px-4 py-4 space-y-4">
            {navGroups.map((group) => {
              // Store managers only take orders: their sidebar is Order Taking +
              // Dashboard. Everyone else uses Production; Order Taking is the
              // store-manager surface, so it's hidden for other roles.
              const storeManagerAllowed = ["/owner/order-taking", "/owner/dashboard", "/owner/inventory"];
              const visible = group.items.filter(item =>
                can(userRole, item.permission, permissionMatrix) &&
                (userRole === "STORE_MANAGER" ? storeManagerAllowed.includes(item.href) : item.href !== "/owner/order-taking"));
              if (visible.length === 0) return null;
              return (
                <SidebarGroup key={group.title} title={group.title}>
                  {visible.map((item) => (
                    <SidebarLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
                  ))}
                </SidebarGroup>
              );
            })}
          </div>

          <div className="border-t border-border p-3 xl:p-4 shrink-0 mt-auto">
            <div className="hidden xl:block text-center mb-4">
              <p className="text-[10px] font-semibold text-text-tertiary tracking-[0.05em]">Powered by</p>
              <p className="text-xs font-bold tracking-widest text-[var(--brand)] mt-0.5">Verity</p>
            </div>
            <div className="rounded-[16px] border border-border bg-surface-2 p-3 xl:p-4 min-w-0">
              <p className="hidden xl:block text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary truncate">Session</p>
              <p className="mt-1 text-xs font-semibold text-text-primary truncate text-center xl:text-left">{userName}</p>
              <div className="mt-3 flex items-center justify-center xl:justify-between gap-2">
                <Badge className="hidden xl:inline-flex bg-success-soft text-success">LIVE</Badge>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-8 w-8 xl:w-auto items-center justify-center gap-2 rounded-lg border border-[var(--brand)]/30 bg-transparent xl:px-2.5 text-xs font-semibold text-[var(--brand)] transition-all hover:bg-[var(--brand)]/5 hover:border-[var(--brand)]/50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <header className="h-16 shrink-0 border-b border-border bg-[rgba(247,250,252,0.88)] dark:bg-[rgba(10,10,10,0.88)] backdrop-blur-xl flex items-center justify-between px-6 z-40">
            <div className="min-w-0 flex-1 flex items-center gap-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-tertiary truncate">
                {breadcrumb}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const search = formData.get("search") as string;
                  if (search) {
                    router.push(`${globalSearchPath}?q=${encodeURIComponent(search)}`);
                  } else {
                    router.push("/owner/search");
                  }
                }}
                className="relative flex-1 max-w-xs min-w-0"
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
                <Input
                  name="search"
                  defaultValue={searchParams.get("q") ?? ""}
                  className="h-8.5 text-xs rounded-full border-border/60 bg-transparent pl-9 shadow-none w-full focus:border-[var(--brand)]/60 focus:shadow-[inset_0_0_10px_-4px_var(--brand)]/12"
                  placeholder="Search..."
                />
              </form>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 px-2.5 py-1 bg-transparent border border-border/60 rounded-full transition-colors hover:border-border">
                {factoryLogo ? (
                  <img src={factoryLogo} alt="Logo" className="h-4.5 w-4.5 rounded object-contain" />
                ) : (
                  <Factory className="h-3.5 w-3.5 text-text-tertiary" />
                )}
                <span className="text-[11px] font-semibold text-text-primary whitespace-nowrap">{factoryName}</span>
              </div>

              {/* Config destinations (moved off the sidebar): Master Data, Team,
                  Departments, Settings — permission-gated icon buttons. */}
              <div className="flex items-center gap-1 pr-1">
                {topbarItems
                  .filter((item) => can(userRole, item.permission, permissionMatrix))
                  .map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        aria-label={item.label}
                        className={cn(
                          "flex h-8.5 w-8.5 items-center justify-center rounded-full border transition-all duration-200",
                          active
                            ? "border-[var(--brand)]/60 bg-[var(--brand)]/10 text-[var(--brand)]"
                            : "border-border/60 bg-transparent text-text-secondary hover:border-[var(--brand)]/60 hover:text-[var(--brand)]"
                        )}
                      >
                        {item.icon}
                      </Link>
                    );
                  })}
              </div>

              <ThemeToggle />
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((value) => !value);
                    setProfileOpen(false);
                  }}
                  className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border border-border/60 bg-transparent text-text-secondary transition-all duration-200 hover:border-[var(--brand)]/60 hover:text-[var(--brand)] hover:shadow-[inset_0_0_10px_-3px_var(--brand)]/20"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" /> : null}
                </button>

                <AnimatePresence>
                  {notifOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
                    >
                      <div className="border-b border-border px-4 py-3">
                        <p className="text-xs font-semibold text-text-primary">Notifications</p>
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          {unreadCount ? `${unreadCount} unread` : "No unread activity"}
                        </p>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {notifications.length ? (
                          notifications.map((item) => (
                            <div key={item.id} className="border-b border-border/60 px-4 py-3 last:border-b-0">
                              <p className="text-xs font-semibold text-text-primary">{item.title}</p>
                              <p className="mt-0.5 text-xs text-text-secondary">{item.message}</p>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-xs text-text-secondary">No notifications.</div>
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6 min-w-0 flex flex-col scrollbar-none">
            <div className="w-full min-w-0 flex flex-col flex-1">{children}</div>
          </main>
        </div>
      </div>

      {/* ==================================================
          MOBILE NATIVE SHELL (under md)
          ================================================== */}
      <div className="flex md:hidden h-[100dvh] w-full flex-col overflow-hidden bg-background text-text-primary relative">
        {/* Mobile Header */}
        <header className="h-14 border-b border-border bg-[rgba(255,255,255,0.85)] dark:bg-[rgba(10,10,10,0.85)] backdrop-blur-lg flex items-center justify-between px-4 shrink-0 z-40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-[var(--brand)] text-white flex items-center justify-center overflow-hidden shrink-0">
              {factoryLogo ? (
                <img src={factoryLogo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Factory className="h-3.5 w-3.5" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-text-primary truncate">{factoryName}</h1>
              <p className="text-[10px] font-semibold text-text-tertiary flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Live OS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-2 border border-[var(--brand)]/30 rounded-xl bg-transparent text-[var(--brand)] hover:bg-[var(--brand)]/5 hover:border-[var(--brand)]/50 transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 min-w-0">
          <div className="w-full min-w-0 flex flex-col space-y-4">
            {children}
          </div>
        </main>

        {/* Floating Action Button (+ Order) */}
        {can(userRole, "CREATE_ORDER", permissionMatrix) && (
          <Link
            href="/owner/production?new=true"
            className="absolute bottom-20 right-4 h-12 w-12 rounded-full bg-[var(--brand)] text-white shadow-lg flex items-center justify-center transition active:scale-95 z-40 hover:opacity-90"
          >
            <Plus className="h-6 w-6" />
          </Link>
        )}

        {/* Mobile Bottom Tab Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 h-16 border-t border-border bg-[rgba(255,255,255,0.92)] dark:bg-[rgba(10,10,10,0.92)] backdrop-blur-xl flex justify-around items-center px-2 z-40">
          {[
            navItems.find(i => i.href === "/owner/dashboard"),
            navItems.find(i => i.href === (userRole === "STORE_MANAGER" ? "/owner/order-taking" : "/owner/production")),
            navItems.find(i => i.href === "/owner/inventory"),
            navItems.find(i => i.href === "/owner/floor"),
            navItems.find(i => i.href === "/owner/settings"),
          ].filter((item): item is NavItem => !!item && can(userRole, item.permission, permissionMatrix) &&
            (userRole !== "STORE_MANAGER" || ["/owner/order-taking", "/owner/dashboard", "/owner/inventory"].includes(item.href))).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors",
                  isActive ? "text-[var(--brand)]" : "text-text-secondary"
                )}
              >
                <div className={cn("p-1 rounded-xl", isActive && "bg-[var(--brand-soft)]")}>
                  {item.icon}
                </div>
                <span className="text-[9px] font-semibold mt-0.5 tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

      </div>
    </>
  );
}

function SidebarGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="hidden xl:block px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SidebarLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center xl:justify-start gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200",
        active
          ? "bg-[var(--brand)]/10 dark:bg-[var(--brand)]/15 text-[var(--brand)]"
          : "text-text-secondary hover:bg-surface-2/80 hover:text-text-primary dark:hover:bg-white/5",
      )}
    >
      <span className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-200",
        active
          ? "border-[var(--brand)]/30 bg-[var(--brand)]/15 text-[var(--brand)] shadow-[0_0_12px_-2px_var(--brand)]/30"
          : "border-border/60 bg-white/50 dark:bg-white/6 dark:border-white/10 text-text-secondary group-hover:text-text-primary"
      )}>
        {item.icon}
      </span>
      <span className="hidden xl:inline">{item.label}</span>
    </Link>
  );
}

function ChevronRight() {
  return <Sparkles className="h-4 w-4 text-text-tertiary" />;
}
