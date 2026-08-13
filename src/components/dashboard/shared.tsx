import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/primitives";

/**
 * Pieces shared by the four vertical dashboards.
 *
 * Kept deliberately small. The dashboards differ in what they *say*, not in how
 * a panel is drawn, and four copies of a card header is how they drift apart.
 */

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col rounded-[24px] p-4 xl:p-5 ${className}`}>
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 font-display text-[17px] font-semibold tracking-[-0.03em] text-text-primary">
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </Card>
  );
}

/**
 * An empty panel that says what to do, not just that there is nothing.
 *
 * "No data" on a dashboard a prospect is being shown reads as a broken product.
 * "Add your first site" reads as a product waiting for them.
 */
export function Nothing({ children, href, cta }: { children: ReactNode; href?: string; cta?: string }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 py-6 text-center">
      <p className="max-w-[38ch] text-[13px] text-text-secondary">{children}</p>
      {href && cta ? (
        <Link
          href={href}
          className="text-[12px] font-semibold text-[var(--brand)] underline-offset-4 hover:underline"
        >
          {cta} →
        </Link>
      ) : null}
    </div>
  );
}

const TONE_CLASS = {
  neutral: "text-text-primary",
  good: "text-success",
  warn: "text-[var(--warning)]",
  bad: "text-[var(--brand)]",
} as const;

export type Tone = keyof typeof TONE_CLASS;

export function StatRow({
  label,
  value,
  detail,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-surface-2 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{label}</p>
        {detail ? <p className="mt-0.5 truncate text-[11px] text-text-tertiary">{detail}</p> : null}
      </div>
      <p className={`shrink-0 font-mono text-xl font-semibold tracking-[-0.04em] ${TONE_CLASS[tone]}`}>
        {value}
      </p>
    </div>
  );

  return href ? (
    <Link href={href} className="block transition hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

/**
 * A horizontal bar, for rankings where the comparison matters more than the
 * absolute number — defect counts, outlet scores, store compliance.
 */
export function BarRow({
  label,
  value,
  max,
  suffix = "",
  tone = "bad",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  tone?: Tone;
}) {
  // A zero max would make every bar NaN% wide; show them empty instead.
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const fill =
    tone === "good"
      ? "bg-success"
      : tone === "warn"
        ? "bg-[var(--warning)]"
        : "bg-[var(--brand)]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[13px] font-medium text-text-primary">{label}</span>
        <span className="shrink-0 font-mono text-[13px] font-semibold text-text-secondary">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export type FunnelStage = { name: string; count: number };

/**
 * The production funnel: one bucket per stage, live count in each.
 *
 * Reads as a floor, left to right, and the shape is the information — a fat
 * bucket three stages in is a queue forming, which no single number on this page
 * says. Deliberately built from the same tokens as `StageIndicator` (the 1.5px
 * rail, the 9px uppercase label) so a card's strip and the dashboard's funnel are
 * recognisably the same object at two scales.
 *
 * Renders nothing when there are no stages. A factory that has not set up
 * departments has no funnel, and an empty rail would imply the floor is empty
 * rather than unconfigured.
 */
export function FunnelStrip({ stages }: { stages: FunnelStage[] }) {
  if (stages.length === 0) return null;

  const busiest = Math.max(...stages.map((s) => s.count));

  return (
    <div className="flex items-stretch gap-1.5">
      {stages.map((stage) => {
        const empty = stage.count === 0;
        // The bottleneck earns the brand colour; everything else stays quiet so
        // one glance finds the queue. A tie means neither is the bottleneck.
        const isBusiest = !empty && stage.count === busiest && busiest > 0;

        return (
          <div key={stage.name} className="flex min-w-0 flex-1 flex-col gap-1">
            <div
              className={
                "h-1.5 rounded-full transition-all duration-300 " +
                (empty
                  ? "bg-border dark:bg-white/5"
                  : isBusiest
                    ? "bg-[var(--brand)] shadow-[0_0_8px_rgba(0,122,255,0.3)]"
                    : "bg-success shadow-[0_0_8px_rgba(48,209,88,0.25)]")
              }
            />
            <p
              className={
                "font-mono text-lg font-semibold leading-none tracking-[-0.04em] " +
                (empty ? "text-text-tertiary" : isBusiest ? "text-[var(--brand)]" : "text-text-primary")
              }
            >
              {stage.count}
            </p>
            <span
              title={stage.name}
              className={
                "truncate text-[9px] font-semibold uppercase tracking-wide " +
                (empty ? "text-text-tertiary" : "text-text-secondary")
              }
            >
              {stage.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Formats a duration in hours the way an operations person reads it. */
export function hoursLabel(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}
