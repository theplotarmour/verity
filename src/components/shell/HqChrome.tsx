"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VerityLockup } from "@/components/brand/VerityMark";
import { Icon, type IconName } from "@/components/ui/icons";
import { ThemeToggle } from "./ThemeToggle";
import { signOut } from "@/server/actions/platform";

/**
 * The HQ shell.
 *
 * Same material system, same scroll ownership and same geometry as the tenant
 * shell — this is one product, and an operator console that looked like a
 * different application would teach two interfaces where one exists.
 *
 * What differs is stated rather than styled: a persistent PLATFORM badge beside
 * the lockup. D18 requires tenant-scoped and global administration to be
 * distinguishable in the UI, and "you are operating above every client" is not
 * something to leave to the reader's memory of which URL they clicked.
 *
 * Navigation is a fixed list rather than a contribution-driven one, deliberately.
 * Capabilities contribute to tenant workspaces; HQ administers the platform
 * itself, and a capability that could add itself to the operator console would
 * be a capability that could grant itself operator surface area.
 */
const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/hq", label: "Overview", icon: "overview" },
  { href: "/hq/clients", label: "Clients", icon: "building" },
  { href: "/hq/audit", label: "Platform audit", icon: "audit" },
  { href: "/hq/settings", label: "Settings", icon: "configuration" },
];

export function HqChrome({
  operatorLabel,
  operatorInitials,
  children,
}: {
  operatorLabel: string;
  operatorInitials: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isCurrent = (href: string) =>
    href === "/hq" ? pathname === "/hq" : pathname.startsWith(href);

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden lg:grid"
      style={{ gridTemplateColumns: "234px 1fr" }}
    >
      <aside className="glass-shell hidden min-h-0 flex-col border-r border-line px-4 pb-5 pt-7 lg:flex">
        <div className="mb-8 shrink-0 px-2">
          <Link href="/hq" aria-label="Verity HQ" className="block no-underline">
            <VerityLockup size={30} />
          </Link>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-accent-subtle px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] text-accent-ink uppercase">
            Platform
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <nav aria-label="HQ" className="flex flex-col gap-1">
            {NAV.map((item) => {
              const current = isCurrent(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={
                    "flex h-[52px] items-center gap-3.5 rounded-lg px-3.5 text-[15px] no-underline " +
                    "transition-[background-color,color] duration-200 " +
                    (current
                      ? "bg-accent-subtle font-medium text-text shadow-[inset_0_1px_0_var(--color-accent-line)]"
                      : "text-text-secondary hover:bg-glass-2 hover:text-text")
                  }
                >
                  <Icon
                    name={item.icon}
                    size={21}
                    className={current ? "text-accent" : "text-text-tertiary"}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <form action={signOut} className="shrink-0 pt-4">
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-2 py-2 text-left transition-colors hover:bg-glass-2"
          >
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-subtle text-[13px] font-medium text-accent-ink"
              aria-hidden="true"
            >
              {operatorInitials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-text">
                {operatorLabel}
              </span>
              <span className="block truncate text-[13px] text-text-tertiary">Operator</span>
            </span>
            <Icon name="chevronRight" size={18} className="shrink-0 text-text-tertiary" />
            <span className="sr-only">Sign out</span>
          </button>
        </form>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="glass-shell z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 lg:hidden">
          <Link href="/hq" aria-label="Verity HQ" className="no-underline">
            <VerityLockup size={22} />
          </Link>
          <ThemeToggle />
        </div>

        <div className="hidden h-[84px] shrink-0 items-center justify-between gap-4 px-8 lg:flex">
          <p className="text-[13px] text-text-secondary">
            Verity HQ — platform administration across every client
          </p>
          <div className="flex shrink-0 items-center gap-2.5">
            <ThemeToggle />
            <span
              className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-subtle text-[13px] font-medium text-accent-ink ring-1 ring-[var(--color-accent-line)]"
              aria-hidden="true"
            >
              {operatorInitials}
            </span>
          </div>
        </div>

        <main id="main" className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 pb-10 pt-6 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
