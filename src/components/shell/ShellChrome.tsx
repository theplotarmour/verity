"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MembershipOption } from "@/server/platform/auth";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { Button } from "@/components/ui/primitives";
import { signOut } from "@/server/actions/platform";

export type NavArea = { group: string; items: Array<{ href: string; label: string }> };

/**
 * Shell chrome: navigation, organization context, account.
 *
 * Responsive by restructuring rather than by shrinking (§26). On desktop the
 * navigation is a persistent rail, because operators move between areas
 * constantly and a hidden menu costs a click every time. On mobile it collapses
 * into a sheet, because a permanent rail would consume a third of a small
 * screen for navigation the user needs occasionally.
 */
export function ShellChrome({
  areas,
  memberships,
  active,
  userLabel,
  children,
}: {
  areas: NavArea[];
  memberships: MembershipOption[];
  active: MembershipOption;
  userLabel: string;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  const nav = (
    <nav aria-label="Platform" className="flex flex-col gap-6">
      {areas.map((area) => (
        <div key={area.group}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary px-3 mb-1.5 mt-0">
            {area.group}
          </p>
          <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
            {area.items.map((item) => {
              const current = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setNavOpen(false)}
                    aria-current={current ? "page" : undefined}
                    className={
                      "flex items-center h-9 min-h-11 sm:min-h-9 px-3 rounded-md text-[14px] no-underline " +
                      (current
                        ? "bg-accent-subtle text-accent font-medium"
                        : "text-text-secondary hover:bg-surface-sunken hover:text-text")
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop rail */}
      <aside className="hidden lg:flex flex-col gap-6 p-4 border-r border-line bg-surface">
        <div className="px-3 pt-2">
          <p className="text-[13px] uppercase tracking-[0.14em] text-text-tertiary m-0">Verity</p>
        </div>
        <OrganizationSwitcher memberships={memberships} active={active} instanceId="rail" />
        {nav}
        <div className="mt-auto px-3 pb-2">
          <p className="text-[13px] text-text-tertiary m-0">{userLabel}</p>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="mt-1 -ml-3">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 h-14 bg-surface border-b border-line">
        <p className="text-[13px] uppercase tracking-[0.14em] text-text-tertiary m-0">Verity</p>
        <Button
          aria-expanded={navOpen}
          aria-controls="mobile-nav"
          onClick={() => setNavOpen((v) => !v)}
        >
          {navOpen ? "Close" : "Menu"}
        </Button>
      </div>

      {navOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col">
          {/* Bible V4 §1.B permits translucency only for a temporary contextual
              layer. A scrim over a sheet is exactly that case. */}
          <button
            className="verity-scrim absolute inset-0 border-0"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          />
          <div
            id="mobile-nav"
            className="relative mt-14 bg-surface border-t border-line p-4 flex flex-col gap-6 overflow-y-auto"
          >
            <OrganizationSwitcher memberships={memberships} active={active} instanceId="sheet" />
            {nav}
            <form action={signOut}>
              <Button type="submit" variant="secondary" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      )}

      <main id="main" className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
