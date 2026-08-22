"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The two-pane workspace: a list on the left, the selected thing on the right.
 *
 * This shape fits the operational screens — tickets, sites, outlets, work
 * orders, projects, assets — because the job is *comparing and moving through*
 * a queue, and a full-page navigation per item loses your place in it.
 *
 * **It is deliberately one pane on a phone.** Two panes on a 375px screen is
 * two unusable columns. Below `lg` this collapses to exactly what the app does
 * today: the list, and the detail as its own view with a back affordance. That
 * is not a fallback grafted on afterwards — it is why `selectedId` drives which
 * pane is visible rather than both being rendered and one hidden. Rendering
 * both and hiding one would ship two copies of every detail query to a phone.
 */
export function Workspace({
  list,
  detail,
  empty,
  selectedId,
  backHref,
  listWidth = "md",
  className,
}: {
  /** The queue. Always present on desktop; on mobile, shown when nothing is selected. */
  list: ReactNode;
  /** The selected record. Null when nothing is selected. */
  detail?: ReactNode;
  /** Shown in the detail pane on desktop when nothing is selected. */
  empty?: ReactNode;
  selectedId?: string | null;
  /** Where the mobile back button goes. Defaults to router.back(). */
  backHref?: string;
  listWidth?: "sm" | "md" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const hasSelection = !!selectedId && !!detail;

  const widths = {
    sm: "lg:w-[280px]",
    md: "lg:w-[360px]",
    lg: "lg:w-[440px]",
  } as const;

  return (
    <div className={cn("flex h-full min-h-0 w-full gap-4", className)}>
      {/*
        The list. Hidden on mobile once something is selected — see the note
        above on why this is a real hide rather than a CSS one.
      */}
      <aside
        className={cn(
          "min-h-0 shrink-0 flex-col lg:flex",
          widths[listWidth],
          hasSelection ? "hidden lg:flex" : "flex w-full",
        )}
      >
        <div className="verity-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px]">
          {/* The list scrolls inside itself; the page never does. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{list}</div>
        </div>
      </aside>

      {/* The detail pane: a floating card over the canvas. */}
      <section
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col",
          hasSelection ? "flex" : "hidden lg:flex",
        )}
      >
        {hasSelection ? (
          <div className="verity-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px]">
            {/* Back is mobile-only: on desktop the list never went away. */}
            <button
              type="button"
              onClick={() => (backHref ? router.push(backHref) : router.back())}
              className="flex min-h-11 shrink-0 items-center gap-2 border-b border-border/60 px-4 text-sm font-semibold text-text-secondary transition hover:text-text-primary lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{detail}</div>
          </div>
        ) : (
          <div className="verity-glass hidden min-h-0 flex-1 items-center justify-center rounded-[20px] lg:flex">
            {empty ?? (
              <p className="max-w-[32ch] px-6 text-center text-[13px] text-text-tertiary">
                Select something on the left to see it here.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * A row in a workspace list. Selection is a left scarlet rail plus a raised
 * surface — never colour alone, which disappears for anyone who cannot
 * distinguish it and in bright sunlight.
 */
export function WorkspaceRow({
  active,
  onClick,
  href,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  href?: string;
  children: ReactNode;
}) {
  const className = cn(
    "relative block w-full min-h-11 border-b border-border/40 px-4 py-3 text-left transition-colors",
    "before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:transition-colors",
    active
      ? "bg-[var(--brand-soft)] before:bg-[var(--brand)]"
      : "before:bg-transparent hover:bg-surface-2/60",
  );

  if (href) {
    return (
      <a href={href} className={className} aria-current={active ? "true" : undefined}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} aria-current={active ? "true" : undefined}>
      {children}
    </button>
  );
}
