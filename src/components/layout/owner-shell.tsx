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
  Users,
  CircleCheckBig,
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
import { VerityLogo } from "@/components/ui/VerityLogo";
import { InstallPromptBanner } from "./InstallPromptBanner";
import { NavMenu } from "./NavMenu";
import { BRAND_ACCENT } from "@/lib/brand";

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
   * Every role now holds its entitled grants — scripts/backfill-role-grants.ts
   * topped up the roles that predated these keys, so the transitional carve-out
   * that let administrators through without the key is gone. Everyone is
   * checked the same way.
   *
   * `undefined` still means "unknown" rather than "denied": a caller that has
   * not been updated to pass the prop degrades to the old nav rather than an
   * empty one. Undefined is not the same as an empty array.
   */
  const grantAllows = useMemo(() => {
    const held = grantedPermissions ? new Set(grantedPermissions) : null;
    return (item: NavItem) => {
      if (!item.requires) return true;
      if (held === null) return true;
      return held.has(item.requires);
    };
  }, [grantedPermissions]);

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
      {/*
        Desktop: a floating header over the canvas, not a sidebar.

        The nav groups that were sidebar sections are dropdowns now. That trades
        some wayfinding for the width it gives back — so the trigger stays lit
        while any page inside its group is open, which is what keeps "where am
        I" answerable without opening a menu. The backdrop gradients come from
        `verity-canvas` on <body>; the old per-shell gradient div is gone with
        the sidebar.
      */}
      <div className="hidden md:flex h-screen w-full flex-col overflow-hidden text-text-primary">
          <header className="verity-glass z-40 mx-4 mt-3 flex shrink-0 items-center gap-3 rounded-full px-3 py-2">
            {/* Identity, then the nav groups that used to be sidebar sections. */}
            <Link href="/owner/dashboard" className="flex min-w-0 shrink-0 items-center gap-2.5 pl-1 pr-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface-2">
                {factoryLogo ? (
                  <img src={factoryLogo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <VerityLogo size={19} />
                )}
              </span>
              <span className="hidden min-w-0 lg:block">
                <span className="block truncate text-[12px] font-semibold leading-tight text-text-primary">
                  {factoryName}
                </span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
                  Verity
                </span>
              </span>
            </Link>

            <nav className="flex min-w-0 flex-1 items-center gap-0.5">
              {navGroups.map((group) => {
                // Same filtering the sidebar applied — module entitlement,
                // registry grant, legacy permission, and the store-manager
                // carve-out. Moving the nav must not move who can see what.
                const storeManagerAllowed = ["/owner/order-taking", "/owner/dashboard", "/owner/inventory"];
                const visible = group.items.filter((item) =>
                  moduleAllows(item) &&
                  grantAllows(item) &&
                  can(userRole, item.permission, permissionMatrix) &&
                  (userRole === "STORE_MANAGER"
                    ? storeManagerAllowed.includes(item.href)
                    : item.href !== "/owner/order-taking"));
                if (visible.length === 0) return null;
                return (
                  <NavMenu
                    key={group.title}
                    title={group.title}
                    pathname={pathname}
                    items={visible.map((item) => ({
                      href: item.href,
                      label: item.label,
                      icon: item.icon,
                    }))}
                  />
                );
              })}
            </nav>

            <div className="min-w-0 flex items-center gap-4">
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

          {/* Content. min-h-0 so a Workspace child can own its own scrolling
              rather than growing the page. */}
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 min-w-0 scrollbar-none">
            <div className="flex w-full min-w-0 flex-1 flex-col">{children}</div>
          </main>
      </div>

      {/* ==================================================
          MOBILE NATIVE SHELL (under md)
          ================================================== */}
      <div className="flex md:hidden h-[100dvh] w-full flex-col overflow-hidden bg-background text-text-primary relative">
        {/* Mobile Header */}
        <header className="h-14 border-b border-border bg-[rgba(255,255,255,0.85)] dark:bg-[rgba(10,10,10,0.85)] backdrop-blur-lg flex items-center justify-between px-4 shrink-0 z-40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2">
              {factoryLogo ? (
                <img src={factoryLogo} alt="" className="h-full w-full object-cover" />
              ) : (
                <VerityLogo size={18} />
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
          {/* Clearance for the dock: its 4rem height, the safe-area inset it
              floats above, and the 0.5rem gap between the two. */}
          <div className="flex w-full min-w-0 flex-col space-y-4 pb-[calc(4rem+max(0.5rem,env(safe-area-inset-bottom))+1rem)]">
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
              // Sits above the dock, using the same max() the dock does — with
              // the bare env() it would tuck under the pill on a notched phone.
              className="fixed bottom-[calc(4rem+max(0.5rem,env(safe-area-inset-bottom))+0.75rem)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-[0_8px_24px_-6px_var(--brand)] transition active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </Link>
          )}

        {/* The dock. Fixed, not absolute: on iOS the URL bar collapsing changes
            the container height mid-scroll, and an absolutely positioned bar
            visibly slides with it.

            Floating rather than edge-to-edge, but the safe-area inset is still
            *outside* the pill — the gap belongs between the dock and the home
            indicator, not inside the dock where it would push the icons off
            centre. Tap targets stay 44px; the pill is chrome around them, not
            a reason to shrink them. */}
        <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
          <div className="verity-glass flex h-16 items-stretch justify-around rounded-[22px] px-1">
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
