"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  PanelLeftClose,
  PanelLeftOpen,
  LifeBuoy,
  Hammer,
  FolderKanban,
  MapPin,
  CalendarDays,
  HardHat,
  ReceiptText,
  LayoutGrid,
  X,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Settings, Shield, Plus , Package, ShoppingCart, Wrench, FlaskConical, Database, Building2 } from "lucide-react";
import { SystemRole } from "@prisma/client";
import { can, Permission, type PermissionMatrix } from "@/lib/permissions";
import type { ModuleKey } from "@/platform/modules/registry";
import { InstallPromptBanner } from "./InstallPromptBanner";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission: Permission;
  /**
   * The module that must be entitled for this destination to appear. Omitted
   * means "always" — only for things every tenant has, like the dashboard.
   *
   * This is an affordance, not a control: `guardModulePage` on the page itself
   * is what actually stops an un-entitled tenant who types the URL.
   */
  requiredModule?: ModuleKey;
  /**
   * Registry permission key (`@/platform/modules/registry`) required to see
   * this item. Preferred over `permission`, which is the deprecated 15-value
   * union with no service-side entries — that union is why every service
   * destination was gated on CREATE_ORDER, so anyone who could book an order
   * could also see Billing.
   *
   * Production items still use `permission` until they are migrated
   * deliberately; this field is the migration path, not a second system.
   */
  requires?: string;
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
    title: "Service Operations",
    items: [
      { label: "Helpdesk", href: "/owner/helpdesk", icon: <LifeBuoy className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requires: "ticket.view", requiredModule: "helpdesk" },
      { label: "Work Orders", href: "/owner/service-work-orders", icon: <Hammer className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requires: "service_wo.view", requiredModule: "helpdesk" },
      { label: "Projects", href: "/owner/projects", icon: <FolderKanban className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requires: "project.view", requiredModule: "projects" },
      { label: "Sites", href: "/owner/sites", icon: <MapPin className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requires: "site.view", requiredModule: "sites" },
      { label: "Scheduling", href: "/owner/scheduling", icon: <CalendarDays className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requires: "schedule.view", requiredModule: "scheduling" },
    ]
  },
  {
    title: "Production",
    items: [
      { label: "Order Taking", href: "/owner/order-taking", icon: <ClipboardList className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requiredModule: "sales" },
      { label: "Production", href: "/owner/production", icon: <Wrench className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requiredModule: "manufacturing" },
      { label: "Floor", href: "/owner/floor", icon: <FlaskConical className="h-4.5 w-4.5" />, permission: "QC_QUEUE", requiredModule: "manufacturing" },
      { label: "Logistics", href: "/owner/logistics", icon: <Truck className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requiredModule: "sales" },
    ]
  },
  {
    title: "Shared Operations",
    items: [
      { label: "Inventory", href: "/owner/inventory", icon: <Package className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requiredModule: "inventory" },
      { label: "Purchase", href: "/owner/purchase", icon: <ShoppingCart className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requiredModule: "procurement" },
      { label: "Assets", href: "/owner/assets", icon: <HardHat className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requires: "asset.view", requiredModule: "assets" },
      { label: "Quality", href: "/owner/qc-floor", icon: <CircleCheckBig className="h-4.5 w-4.5" />, permission: "QC_QUEUE", requiredModule: "quality" },
    ]
  },
  {
    title: "Finance",
    items: [
      { label: "Billing", href: "/owner/billing", icon: <ReceiptText className="h-4.5 w-4.5" />, permission: "CREATE_ORDER", requires: "invoice.view", requiredModule: "billing" },
      { label: "Reports", href: "/owner/reports", icon: <BarChart3 className="h-4.5 w-4.5" />, permission: "VIEW_REPORTS" },
    ]
  },
];

// Config-style destinations pinned to the top bar (next to the theme switch)
// instead of the sidebar.
const topbarItems: NavItem[] = [
  { label: "Master Data", href: "/owner/master-data", icon: <Database className="h-4 w-4" />, permission: "ACCESS_MASTER_DATA" },
  // Customers are counterparties, not master data. They sit here beside Team
  // and Departments — the other things a factory keeps but does not make.
  { label: "Customers", href: "/owner/customers", icon: <Building2 className="h-4 w-4" />, permission: "CREATE_ORDER" },
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
  enabledModules,
  grantedPermissions,
  children,
}: {
  factoryName: string;
  factoryLogo?: string | null;
  userName: string;
  themeColor?: string;
  userRole?: SystemRole;
  permissionMatrix?: PermissionMatrix;
  /**
   * Modules the tenant is entitled to, resolved server-side. Undefined means
   * "unknown", and every item shows — the pre-module behaviour, so a caller
   * that has not been updated degrades to the old nav rather than an empty one.
   */
  enabledModules?: ModuleKey[];
  /** Registry permission keys this user actually holds, resolved server-side. */
  grantedPermissions?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  // Collapsing is the owner's call, remembered between visits. Below xl the
  // sidebar is icon-only anyway; this is about reclaiming the 260px on a wide
  // screen when the sheet in the middle is what matters.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(window.localStorage.getItem("verity.sidebarCollapsed") === "1");
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((was) => {
      const next = !was;
      window.localStorage.setItem("verity.sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // The mobile Operations sheet. Closed on navigation, below.
  const [opsOpen, setOpsOpen] = useState(false);
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

  // A sheet left open across a route change would cover the page the user just
  // asked for. Links inside it close it too; this catches back/forward.
  useEffect(() => {
    setOpsOpen(false);
  }, [pathname]);

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

  // A nav item survives three filters: the tenant's entitlements, the role's
  // permissions, and the store-manager carve-out. Entitlement is checked first
  // because it is the only one that can empty a whole group.
  const moduleAllows = useMemo(() => {
    const enabled = enabledModules ? new Set<ModuleKey>(enabledModules) : null;
    return (item: NavItem) =>
      !item.requiredModule || enabled === null || enabled.has(item.requiredModule);
  }, [enabledModules]);

  /**
   * Permission gate for items carrying a registry key.
   *
   * Transitional rule: the tenant administrators (owner, co-owner, manager) are
   * allowed through without holding the key. Those keys were added to
   * DEFAULT_GRANTS after some tenants were provisioned, so their existing Role
   * rows do not have them — requiring the key outright would silently remove
   * the nav from the very people who administer it. Supervisors and workers get
   * the exact check, which is the point: a store manager who can book an order
   * no longer sees Billing.
   *
   * Remove this carve-out once existing roles have been backfilled.
   */
  const grantAllows = useMemo(() => {
    const held = grantedPermissions ? new Set(grantedPermissions) : null;
    const isAdmin = userRole === "OWNER" || userRole === "CO_OWNER" || userRole === "MANAGER";
    return (item: NavItem) => {
      if (!item.requires) return true;
      if (held === null || isAdmin) return true;
      return held.has(item.requires);
    };
  }, [grantedPermissions, userRole]);

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => moduleAllows(item) && grantAllows(item)),
    [moduleAllows, grantAllows],
  );

  const activeItem = useMemo(
    () => visibleNavItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
    [pathname, visibleNavItems],
  );

  // Everything this tenant and role can actually reach, before the mobile bar
  // decides which four get a permanent slot.
  const reachable = useMemo(() => {
    const storeManagerAllowed = ["/owner/order-taking", "/owner/dashboard", "/owner/inventory"];
    return visibleNavItems.filter(
      (item) =>
        can(userRole, item.permission, permissionMatrix) &&
        (userRole === "STORE_MANAGER"
          ? storeManagerAllowed.includes(item.href)
          : item.href !== "/owner/order-taking"),
    );
  }, [visibleNavItems, userRole, permissionMatrix]);

  /**
   * The mobile bar has four slots, and a phone tab bar with eleven items is
   * not a tab bar. Dashboard and Settings bookend; Quality takes the third
   * slot when the tenant has it, otherwise the first operational destination
   * does. Everything else lives behind Operations, which opens a sheet.
   */
  const mobileNav = useMemo(() => {
    const dashboard = reachable.find((i) => i.href === "/owner/dashboard");
    const settings = reachable.find((i) => i.href === "/owner/settings");
    const rest = reachable.filter(
      (i) => i.href !== "/owner/dashboard" && i.href !== "/owner/settings",
    );
    const third =
      rest.find((i) => i.requiredModule === "quality") ?? rest.find((i) => i.href !== undefined);

    return {
      dashboard,
      settings,
      third,
      // The sheet carries every operational destination, including the one
      // promoted to the bar — a person who has learned "it's under Operations"
      // should never find a gap where it used to be.
      sheet: rest,
    };
  }, [reachable]);
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
      <InstallPromptBanner accentColor={themeColor || "#007AFF"} />
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
        <aside className={cn(
          "w-[80px] shrink-0 border-r border-border bg-[rgba(255,255,255,0.84)] dark:bg-[rgba(10,10,10,0.84)] backdrop-blur-xl flex flex-col min-w-0 transition-[width] duration-200",
          !collapsed && "xl:w-[260px]"
        )}>
          <div className={cn(
            "flex h-16 items-center gap-3 border-b border-border px-5 shrink-0",
            collapsed ? "justify-center" : "justify-center xl:justify-start"
          )}>
            <Link href="/owner/dashboard" className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white overflow-hidden">
                {factoryLogo ? (
                  <img src={factoryLogo} alt="Factory Logo" className="h-full w-full object-cover" />
                ) : (
                  <Factory className="h-4 w-4" />
                )}
              </div>
              <div className={cn("min-w-0", collapsed ? "hidden" : "hidden xl:block")}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-tertiary truncate">
                  Verity
                </p>
                <p className="text-xs font-semibold text-text-primary truncate">{factoryName}</p>
              </div>
            </Link>
          </div>

          {/* Only offered where it changes anything: under xl the sidebar is
              already icon-only, so a toggle there would appear to do nothing. */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden xl:flex items-center gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold text-text-tertiary transition hover:bg-surface-2/80 hover:text-text-primary",
              collapsed ? "justify-center" : "justify-start"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>

          <div className="flex-1 overflow-y-auto px-3 xl:px-4 py-4 space-y-4">
            {navGroups.map((group) => {
              // Store managers only take orders: their sidebar is Order Taking +
              // Dashboard. Everyone else uses Production; Order Taking is the
              // store-manager surface, so it's hidden for other roles.
              const storeManagerAllowed = ["/owner/order-taking", "/owner/dashboard", "/owner/inventory"];
              const visible = group.items.filter(item =>
                moduleAllows(item) &&
                grantAllows(item) &&
                can(userRole, item.permission, permissionMatrix) &&
                (userRole === "STORE_MANAGER" ? storeManagerAllowed.includes(item.href) : item.href !== "/owner/order-taking"));
              if (visible.length === 0) return null;
              return (
                <SidebarGroup key={group.title} title={group.title} collapsed={collapsed}>
                  {visible.map((item) => (
                    <SidebarLink key={item.href} item={item} collapsed={collapsed} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
                  ))}
                </SidebarGroup>
              );
            })}
          </div>

          <div className="border-t border-border p-3 xl:p-4 shrink-0 mt-auto">
            <div className={cn("text-center mb-4", collapsed ? "hidden" : "hidden xl:block")}>
              <p className="text-[10px] font-semibold text-text-tertiary tracking-[0.05em]">Powered by</p>
              <p className="text-xs font-bold tracking-widest text-[var(--brand)] mt-0.5">Verity</p>
            </div>
            <div className="rounded-[16px] border border-border bg-surface-2 p-3 xl:p-4 min-w-0">
              <p className={cn("text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary truncate", collapsed ? "hidden" : "hidden xl:block")}>Session</p>
              <p className="mt-1 text-xs font-semibold text-text-primary truncate text-center xl:text-left">{userName}</p>
              <div className="mt-3 flex items-center justify-center xl:justify-between gap-2">
                <Badge className={cn("bg-success-soft text-success", collapsed ? "hidden" : "hidden xl:inline-flex")}>LIVE</Badge>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-8 w-8 xl:w-auto items-center justify-center gap-2 rounded-lg border border-[var(--brand)]/30 bg-transparent xl:px-2.5 text-xs font-semibold text-[var(--brand)] transition-all hover:bg-[var(--brand)]/5 hover:border-[var(--brand)]/50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className={cn(collapsed ? "hidden" : "hidden xl:inline")}>Logout</span>
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
                {can(userRole, "ACCESS_MASTER_DATA", permissionMatrix) && (
                  <Link
                    href="/owner/master-data?add=1"
                    className="mr-1 hidden h-8.5 items-center gap-1.5 rounded-full bg-[var(--brand)] px-3 text-[11px] font-bold text-white shadow-sm transition hover:opacity-90 lg:flex"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Master Data
                  </Link>
                )}
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

                {/* CSS entrance, for the same reason as the mobile sheet:
                    visibility should not depend on an animation completing. */}
                {notifOpen ? (
                    <div
                      className="verity-fade-in absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
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
                    </div>
                ) : null}
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

        {/* Mobile Content.
            The scroll lives here, never on the document. A scrollable <body>
            inside an installed PWA hands the gesture to the browser, which
            answers with pull-to-refresh — the page reloads mid-list and the
            app stops feeling like an app. `overscroll-contain` stops the
            rubber-band at the ends of this box rather than passing it up. */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 min-w-0">
          {/* Clears the fixed tab bar plus the home indicator, so the last row
              of a list is reachable rather than sitting under the chrome. */}
          <div className="flex w-full min-w-0 flex-col space-y-4 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)]">
            {children}
          </div>
        </main>

        {/* Floating action. Production-only: it deep-links to the production
            board, which a service tenant does not have. */}
        {can(userRole, "CREATE_ORDER", permissionMatrix) &&
          (!enabledModules || enabledModules.includes("manufacturing")) && (
            <Link
              href="/owner/production?new=true"
              aria-label="New production order"
              className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-[0_8px_24px_-6px_var(--brand)] transition active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </Link>
          )}

        {/* Bottom tab bar. Fixed, not absolute: on iOS the URL bar collapsing
            changes the container height mid-scroll, and an absolutely
            positioned bar visibly slides with it. */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border bg-background/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
          <div className="flex h-16 items-stretch justify-around px-1">
            {mobileNav.dashboard ? (
              <MobileTab item={mobileNav.dashboard} pathname={pathname} />
            ) : null}

            {mobileNav.sheet.length > 0 ? (
              <button
                type="button"
                onClick={() => setOpsOpen(true)}
                aria-label="Operations"
                aria-expanded={opsOpen}
                className={cn(
                  "flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 transition-colors",
                  opsOpen ? "text-[var(--brand)]" : "text-text-secondary",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    opsOpen && "bg-[var(--brand-soft)]",
                  )}
                >
                  <LayoutGrid className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[10px] font-semibold tracking-tight">Operations</span>
              </button>
            ) : null}

            {mobileNav.third ? (
              <MobileTab item={mobileNav.third} pathname={pathname} />
            ) : null}

            {mobileNav.settings ? (
              <MobileTab item={mobileNav.settings} pathname={pathname} />
            ) : null}
          </div>
        </nav>

        {/* Operations sheet. The entrance is a CSS keyframe with `fill: both`
            rather than a JS animation, because this element's *position* is
            what the animation controls — if it never ran, the sheet would sit
            open and off screen. CSS cannot land in that state. */}
        {opsOpen ? (
            <div className="fixed inset-0 z-50 md:hidden">
              <button
                type="button"
                aria-label="Close operations menu"
                onClick={() => setOpsOpen(false)}
                className="verity-fade-in absolute inset-0 bg-black/50 backdrop-blur-sm"
              />
              <div
                className="verity-sheet-up absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-border bg-surface pb-[max(1.25rem,env(safe-area-inset-bottom))]"
              >
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-[28px] bg-surface px-5 pb-3 pt-3">
                  <span className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-border" />
                  <p className="mt-2 font-display text-[15px] font-semibold tracking-[-0.02em]">
                    Operations
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpsOpen(false)}
                    aria-label="Close"
                    className="mt-2 flex h-11 w-11 items-center justify-center rounded-full border border-border text-text-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 px-4 pt-1">
                  {mobileNav.sheet.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpsOpen(false)}
                        className={cn(
                          "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-colors",
                          active
                            ? "border-[var(--brand)]/40 bg-[var(--brand-soft)] text-[var(--brand)]"
                            : "border-border bg-surface-2/60 text-text-secondary active:bg-surface-2",
                        )}
                      >
                        <span className="flex h-9 w-9 items-center justify-center">
                          {item.icon}
                        </span>
                        <span className="text-[11px] font-semibold leading-tight text-text-primary">
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>

                <div className="mt-4 border-t border-border px-4 pt-3">
                  {topbarItems
                    .filter((item) => can(userRole, item.permission, permissionMatrix))
                    .map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpsOpen(false)}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-2.5 text-sm text-text-secondary active:bg-surface-2"
                      >
                        <span className="flex h-5 w-5 items-center justify-center">
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    ))}
                </div>
              </div>
            </div>
        ) : null}
      </div>
    </>
  );
}

/**
 * One tab in the mobile bar. The whole control is at least 44×44 — the label
 * is small, but the target it sits in is not.
 */
function MobileTab({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 transition-colors",
        active ? "text-[var(--brand)]" : "text-text-secondary",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
          active && "bg-[var(--brand-soft)]",
        )}
      >
        {item.icon}
      </span>
      <span className="max-w-full truncate px-1 text-[10px] font-semibold tracking-tight">
        {item.label}
      </span>
    </Link>
  );
}

function SidebarGroup({
  title,
  children,
  collapsed = false,
}: {
  title: string;
  children: React.ReactNode;
  collapsed?: boolean;
}) {
  return (
    <div>
      <p className={cn(
        "px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-text-tertiary",
        collapsed ? "hidden" : "hidden xl:block"
      )}>
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
  collapsed = false,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      // The label is the only thing that goes; the icon keeps its hit area, and
      // the title attribute carries the name for a collapsed rail.
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        collapsed ? "justify-center" : "justify-center xl:justify-start",
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
      <span className={cn(collapsed ? "hidden" : "hidden xl:inline")}>{item.label}</span>
    </Link>
  );
}

function ChevronRight() {
  return <Sparkles className="h-4 w-4 text-text-tertiary" />;
}
