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
 * Geometry, palette and composition follow the approved product mockups.
 *
 * WHAT THE MOCKUP'S SHELL IS
 * A 234px sidebar carrying the lockup, a NAMED navigation list, and the signed-
 * in person at the bottom. It is LEVEL 1 of the material system (ADR-011): the
 * quietest glass, separated from the content by an alpha hairline rather than a
 * fill, so it reads as part of the same environment rather than as a docked
 * panel. The top bar is level 2/4 — floating controls over the atmosphere, not
 * a toolbar with a background. Navigation items are icon plus label at a 63px pitch; the current
 * one sits on a pale accent bed with an accent glyph and near-black label.
 *
 * Labels are not optional. An icon-only rail makes an operator learn nine
 * glyphs before they can find anything, and every one of those glyphs is a
 * guess until they hover it.
 *
 * The content column opens with a top bar — search, operating context, and the
 * account controls — and the page's own title sits beneath it. That ordering is
 * the mockup's: the bar belongs to the application, the title belongs to the
 * page.
 *
 * Responsive by RESTRUCTURING, not shrinking. Below `lg` the sidebar becomes a
 * sheet, because a permanent 234px panel would eat two thirds of a phone.
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
  const pathname = usePathname();

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

  /**
   * The navigation list.
   *
   * Group headings are DRAWN, not merely announced to a screen reader.
   *
   * They were `sr-only` because nine items did not need three headings to be
   * scannable, and that was true of nine items. The plywood workflow brings
   * fifteen across five business areas — Trade, Inventory, Money, Insights,
   * Administration (taskplans/45 §8) — and an unlabelled list of fifteen is
   * exactly the failure the grouping existed to prevent. A sighted user was
   * being given strictly less structure than a screen-reader user, which is a
   * strange way round.
   *
   * A single-item group still gets no heading: a heading over one link is
   * noise, and "Overview" sits alone at the top.
   */
  function navList() {
    return (
      <nav aria-label="Platform" className="flex flex-col gap-1">
        {areas.map((area) => (
          <ul key={area.group} className="m-0 flex list-none flex-col gap-1 p-0">
            {area.items.length > 1 ? (
              <li
                aria-hidden="true"
                className="px-3.5 pt-4 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary"
              >
                {area.group}
              </li>
            ) : (
              <li className="sr-only" aria-hidden="true">
                {area.group}
              </li>
            )}
            {area.items.map((item) => {
              const current = isCurrent(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setNavOpen(false)}
                    aria-current={current ? "page" : undefined}
                    className={
                      // 52px per item put ~1200px of navigation into a 626px
                      // column on a 800px-tall window, so half the menu sat
                      // below the fold behind a SECOND scrollbar. Reaching it
                      // meant scrolling the sidebar, and once that hit its end
                      // the wheel did nothing at all while the pointer stayed
                      // over it — which reads as the page being stuck, and a
                      // reload does not help because the pointer has not moved.
                      // 42px and a tighter icon gap fit the whole menu without
                      // dropping below the 40px comfortable-target floor.
                      "flex h-[42px] items-center gap-3 rounded-lg px-3 text-[14px] no-underline " +
                      "transition-[background-color,color] duration-200 " +
                      (current
                        ? "bg-accent-subtle font-medium text-text shadow-[inset_0_1px_0_var(--color-accent-line)]"
                        : "text-text-secondary hover:bg-glass-2 hover:text-text")
                    }
                  >
                    {item.icon && (
                      <Icon
                        name={item.icon}
                        size={19}
                        className={current ? "text-accent" : "text-text-tertiary"}
                      />
                    )}
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </nav>
    );
  }

  /** The signed-in person, at the foot of the sidebar as the mockup places it. */
  function accountCard() {
    return (
      <form action={signOut} className="mt-auto pt-4">
        <button
          type="submit"
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-2 py-2 text-left transition-colors hover:bg-glass-2"
        >
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-subtle text-[13px] font-medium text-accent-ink"
            aria-hidden="true"
          >
            {userInitials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium text-text">{userLabel}</span>
            <span className="block truncate text-[13px] text-text-tertiary">
              {active.roleName ?? "No role assigned"}
            </span>
          </span>
          <Icon name="chevronRight" size={18} className="shrink-0 text-text-tertiary" />
          <span className="sr-only">Sign out</span>
        </button>
      </form>
    );
  }

  return (
    /**
     * SCROLL OWNERSHIP (ADR-012; work plan D11–D14).
     *
     * The shell is fixed and the CONTENT scrolls, rather than the document
     * scrolling as one long page. That is why the top bar, the sidebar and the
     * account card stay put: they are not sticky elements racing the viewport,
     * they simply never move because nothing under them is the scroller.
     *
     * `h-dvh` plus `overflow-hidden` here, `min-h-0` on every flex descendant
     * that must be allowed to shrink, and exactly one `overflow-y-auto` per
     * region. Omitting `min-h-0` is what makes a flex child refuse to scroll and
     * push the page taller instead — the failure this replaces.
     */
    <div
      className="flex h-dvh flex-col overflow-hidden lg:grid"
      style={{ gridTemplateColumns: "234px 1fr" }}
    >
      {/* ----------------------------- sidebar -----------------------------
          Header and account card are stable; the NAVIGATION REGION ALONE
          scrolls, and only when the list outgrows the viewport (D12). */}
      <aside className="glass-shell hidden min-h-0 flex-col border-r border-line px-4 pb-5 pt-7 lg:flex">
        <Link href="/" aria-label="Verity" className="mb-8 block shrink-0 px-2 no-underline">
          <VerityLockup size={30} className="text-text" />
        </Link>

        <div className="min-h-0 flex-1 overflow-y-auto">{navList()}</div>
        <div className="shrink-0">{accountCard()}</div>
      </aside>

      {/* ------------------------------ main ------------------------------- */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile bar. The mockups have no small-screen composition to copy, so
            this states the identity and offers the sheet, and nothing else. */}
        <div className="glass-shell z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 lg:hidden">
          <Link href="/" aria-label="Verity" className="no-underline">
            <VerityLockup size={22} className="text-text" />
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
          <div className="fixed inset-0 z-40 flex flex-col lg:hidden">
            {/* A scrim behind a temporary sheet. Under ADR-011 glass is a
                material system rather than an exception, but this surface's
                treatment is unchanged. */}
            <button
              className="verity-scrim absolute inset-0 border-0"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
            />
            <div
              id="mobile-nav"
              className="glass-overlay relative mt-14 flex max-h-[calc(100dvh-3.5rem)] flex-col gap-5 overflow-y-auto border-t border-line p-4"
            >
              <OrganizationSwitcher memberships={memberships} active={active} instanceId="sheet" />
              {navList()}
              {accountCard()}
            </div>
          </div>
        )}

        {/* -------------------------- top bar ---------------------------
            Persistent chrome, as the boards draw it. It needs no `sticky`:
            the main region below owns the scroll, so this never travels. */}
        <div className="hidden h-[84px] shrink-0 items-center gap-4 px-8 lg:flex">
          {/* Search is centred and dominant, as the mockup draws it. It is a
              real control over the records already loaded on the page, not a
              platform-wide index — platform search is DEFERRED and drawing a
              box that promises one would be a control that lies. */}
          <div className="relative mx-auto flex w-full max-w-[520px] items-center">
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute left-4 text-text-tertiary"
            />
            <label htmlFor="shell-search" className="sr-only">
              Search this page
            </label>
            <input
              id="shell-search"
              type="search"
              placeholder="Search this page"
              className="glass-control h-12 w-full rounded-xl pl-12 pr-4 text-[14px] text-text placeholder:text-text-tertiary transition-[border-color,box-shadow] duration-200 hover:border-line-strong focus:border-accent focus:shadow-[var(--shadow-highlight),0_0_0_3px_var(--color-accent-subtle)] focus:outline-none"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <OrganizationSwitcher memberships={memberships} active={active} instanceId="header" />
            <ThemeToggle />
            <Link
              href="/audit"
              title="Recent activity"
              className="glass-control grid size-11 place-items-center rounded-xl text-text-secondary no-underline transition-colors hover:text-text"
            >
              <Icon name="bell" size={19} />
              <span className="sr-only">Recent activity</span>
            </Link>
            <span
              className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-subtle text-[13px] font-medium text-accent-ink ring-1 ring-[var(--color-accent-line)]"
              aria-hidden="true"
            >
              {userInitials}
            </span>
          </div>
        </div>

        {/* The one scroller in the application. Pages compose inside it and do
            not create a second one unless a dense region owns its own (D13). */}
        <main
          id="main"
          // The page's real scroll container: html and body are 100dvh with
          // overflow hidden, so nothing scrolls the document. Marked so a modal
          // can freeze THIS while it is open — locking document.body, which is
          // what a dialog normally does, achieves nothing here.
          data-shell-scroll=""
          className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 pb-10 pt-6 sm:px-8 lg:px-8 lg:pt-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
