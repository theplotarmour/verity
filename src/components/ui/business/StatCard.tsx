import type { ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import { Surface } from "@/components/ui/primitives";
import { BarStrip } from "@/components/ui/charts";

/**
 * The dashboard stat card — platform-wide, entity-agnostic.
 *
 * Icon, label, a big value, and an optional real delta or real weekly
 * breakdown. "Real" is load-bearing: `delta` and `weeks` are numbers the
 * caller actually queried, never a decoration — same rule `charts.tsx`
 * already states for `BarStrip`/`Donut` ("every value is real, no sample
 * data, no smoothing"), applied here too since `BarStrip` is what draws the
 * inline breakdown.
 *
 * Lives in `components/ui/business/` next to `ActivityLog` — the platform's
 * shared UI for business-domain screens, not a plywood-specific component.
 * Any future capability's own dashboard uses this same card.
 */
export function StatCard({
  icon,
  label,
  value,
  hint,
  delta,
  weeks,
  href,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
  /** Small supporting line under the value — "2 due today", "Nothing held". */
  hint?: ReactNode;
  /** A real percentage change vs. a real prior period. Omit rather than fake one. */
  delta?: { percent: number; direction: "up" | "down" };
  /** A real per-week (or per-day) breakdown for the inline `BarStrip`. */
  weeks?: number[];
  href?: string;
}) {
  const body = (
    <Surface className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-ink">
            <Icon name={icon} size={17} />
          </span>
          <span className="text-[13px] text-text-secondary">{label}</span>
        </div>
        {weeks && weeks.length > 0 && (
          <div className="w-16 shrink-0">
            <BarStrip values={weeks} label={label} height={28} />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="tabular m-0 text-[26px] font-normal leading-none tracking-[-0.01em] text-text">
          {value}
        </p>
        {delta && (
          <span
            className={
              "tabular flex shrink-0 items-center gap-0.5 text-[12px] font-medium " +
              (delta.direction === "up" ? "text-success" : "text-danger")
            }
          >
            <Icon name="chevronDown" size={12} className={delta.direction === "up" ? "rotate-180" : ""} />
            {delta.percent.toFixed(1)}%
          </span>
        )}
      </div>

      {hint && <p className="m-0 text-[12px] text-text-tertiary">{hint}</p>}
    </Surface>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block no-underline transition-opacity hover:opacity-90">
      {body}
    </Link>
  );
}
