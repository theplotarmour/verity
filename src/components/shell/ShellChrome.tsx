"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MembershipOption } from "@/server/platform/auth";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/icons";
import { VerityLockup } from "@/components/brand/VerityMark";
import { signOut } from "@/server/actions/platform";

export type NavItem = { href: string; label: string; icon?: IconName };
export type NavArea = { group: string; items: NavItem[] };

/**
 * The Verity application shell.
 *
 * Geometry, palette and rhythm follow the approved identity boards; see
 * `globals.css` for how the board's translucent chrome was resolved against
 * Bible V4 §1.B into solid surfaces.
 *
 * Responsive by RESTRUCTURING, not shrinking. On desktop navigation is a
 * persistent rail, because operators move between areas constantly and a hidden
 * menu costs a click every time. On mobile it becomes a sheet, because a
 * permanent rail would eat a third of a small screen for navigation needed
 * occasionally. The rail also collapses to symbols on demand — the board ships
 * that control, and on a 1024px laptop it returns real width to the content.
 *
 * WHAT IS DELIBERATELY ABSENT
 * The board's ⌘K global search is not here. Platform search is recorded as
 * DEFERRED in `platform-readiness-audit.md` §14 — there is no search API behind
 * it. Drawing the box anyway would be a control that lies about what the
 * platform can do, which §18's data-reality rule forbids as squarely as a fake
 * metric. It returns when there is something for it to query.
 */
export function ShellChrome({
  areas,
  memberships,
  active,
  userLabel,
  userInitials,
  children,
}: {
  areas: NavArea[];
  memberships: MembershipOption[];
  active: MembershipOption;
  userLabel: string;
  userInitials: string;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setCollapsed(localStorage.getItem("verity-rail") === "collapsed");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem("verity-rail", collapsed ? "collapsed" : "expanded");
  }, [collapsed, mounted]);

  // Escape closes the mobile sheet — a sheet you can only leave by finding its
  // close button is a trap for keyboard users.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  function navList(showLabels: boolean) {
    return (
      <nav aria-label="Platform" className="flex flex-col gap-5">
        {areas.map((area) => (
          <div key={area.group}>
            {showLabels && (
              <p className="m-0 mb-1.5 px-[9px] text-[10px] font-medium uppercase tracking-[0.09em] text-text-tertiary">
                {area.group}
              </p>
            )}
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {area.items.map((item) => {
                const current = isCurrent(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setNavOpen(false)}
                      aria-current={current ? "page" : undefined}
                      title={showLabels ? undefined : item.label}
                      className={
                        "flex items-center gap-[11px] rounded-md px-[9px] no-underline transition-colors " +
                        "h-11 sm:h-[33px] text-[13px] " +
                        (showLabels ? "" : "justify-center ") +
                        (current
                          ? "bg-accent-subtle text-accent-ink font-medium"
                          : "text-text-secondary hover:bg-control hover:text-text")
                      }
                    >
                      {item.icon && <Icon name={item.icon} />}
                      {showLabels && (
                        <span className="truncate tracking-[-0.005em]">{item.label}</span>
                      )}
                      {/* The collapsed rail shows only a glyph. Sighted users
                          get the tooltip; everyone else needs the name. */}
                      {!showLabels && <span className="sr-only">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    );
  }

  const showLabels = !collapsed;

  return (
    <div
      className="min-h-dvh lg:grid"
      style={{ gridTemplateColumns: mounted && collapsed ? "64px 1fr" : "228px 1fr" }}
    >
      {/* ------------------------------- rail ------------------------------ */}
      <aside className="hidden lg:flex flex-col gap-6 border-r border-line bg-chrome px-3 pb-4 pt-[22px]">
        <Link
          href="/"
          aria-label="Verity"
          className="flex h-[26px] items-center px-2 no-underline"
        >
          <VerityLockup collapsed={!showLabels} />
        </Link>

        {showLabels && (
          <OrganizationSwitcher memberships={memberships} active={active} instanceId="rail" />
        )}

        {navList(showLabels)}

        <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={showLabels}
            className={
              "flex h-[31px] items-center gap-[11px] rounded-md border-0 bg-transparent px-[9px] " +
              "text-[13px] text-text-tertiary hover:bg-control hover:text-text cursor-pointer transition-colors " +
              (showLabels ? "" : "justify-center")
            }
          >
            <Icon name={showLabels ? "collapse" : "expand"} size={16} />
            {showLabels && <span>Collapse</span>}
            <span className="sr-only">
              {showLabels ? "Collapse navigation to icons" : "Expand navigation"}
            </span>
          </button>

          <form action={signOut}>
            <button
              type="submit"
              className={
                "flex h-[31px] w-full items-center gap-[11px] rounded-md border-0 bg-transparent px-[9px] " +
                "text-[13px] text-text-tertiary hover:bg-control hover:text-text cursor-pointer transition-colors " +
                (showLabels ? "" : "justify-center")
              }
            >
              <Icon name="signOut" size={16} />
              {showLabels ? <span>Sign out</span> : <span className="sr-only">Sign out</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* ------------------------------ main ------------------------------- */}
      <div className="flex min-w-0 flex-col">
        {/* Desktop header */}
        <header className="hidden lg:flex h-14 flex-none items-center gap-3.5 border-b border-line bg-chrome px-[22px]">
          <div className="flex items-center gap-2 text-[12px] text-text-secondary">
            <Icon name="building" size={13} />
            <span className="truncate">{active.organizationName ?? active.tenantName}</span>
          </div>

          <div className="ml-auto flex items-center gap-0.5">
            <ThemeToggle />

            <Link
              href="/audit"
              title="Recent activity"
              className="relative grid size-[29px] place-items-center rounded-sm text-text-secondary no-underline transition-colors hover:bg-control hover:text-text"
            >
              <Icon name="bell" size={15.5} />
              <span className="sr-only">Recent activity</span>
            </Link>

            <div className="mx-2 h-5 w-px bg-line" aria-hidden="true" />

            <div className="flex items-center gap-2.5">
              <span
                className="grid size-[26px] place-items-center rounded-full border border-accent-line bg-accent-subtle text-[10px] font-medium text-accent-ink"
                aria-hidden="true"
              >
                {userInitials}
              </span>
              <span className="flex flex-col leading-[1.25]">
                <span className="whitespace-nowrap text-[11.5px] font-medium">{userLabel}</span>
                <span className="whitespace-nowrap text-[10.5px] text-text-tertiary">
                  {active.roleName ?? "No role assigned"}
                </span>
              </span>
            </div>
          </div>
        </header>

        {/* Mobile bar */}
        <div className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-chrome px-4">
          <Link href="/" aria-label="Verity" className="no-underline">
            <VerityLockup />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              aria-expanded={navOpen}
              aria-controls="mobile-nav"
              onClick={() => setNavOpen((v) => !v)}
              size="md"
            >
              {navOpen ? "Close" : "Menu"}
            </Button>
          </div>
        </div>

        {navOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex flex-col">
            {/* Bible V4 §1.B permits translucency only for a temporary
                contextual layer. A scrim behind a sheet is exactly that. */}
            <button
              className="verity-scrim absolute inset-0 border-0"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
            />
            <div
              id="mobile-nav"
              className="verity-overlay relative mt-14 flex max-h-[calc(100dvh-3.5rem)] flex-col gap-6 overflow-y-auto border-t border-line p-4"
            >
              <OrganizationSwitcher
                memberships={memberships}
                active={active}
                instanceId="sheet"
              />
              {navList(true)}
              <div className="border-t border-line pt-4">
                <p className="m-0 mb-2 text-[13px] text-text-tertiary">
                  {userLabel} · {active.roleName ?? "No role assigned"}
                </p>
                <form action={signOut}>
                  <Button type="submit" variant="secondary" className="w-full">
                    Sign out
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        <main id="main" className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-9">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
