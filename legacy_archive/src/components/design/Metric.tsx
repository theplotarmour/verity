"use client";

import type { ReactNode } from "react";
import { Surface } from "./Surface";
import Link from "next/link";

export function Metric({
  label,
  value,
  detail,
  tone = "blue",
  sparklinePath,
  href,
  hero = false,
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "blue" | "green" | "amber" | "red";
  sparklinePath?: string;
  href?: string;
  /** Filled brand-gradient card for the one or two numbers a dashboard leads
      with. Everything else stays the quiet bordered tile — filling every card
      this way is what turns emphasis into wallpaper. */
  hero?: boolean;
  /** Badge icon shown top-right on the hero variant only. */
  icon?: ReactNode;
}) {
  const defaultPath = tone === "green"
    ? "M 5,22 L 20,20 L 35,25 L 50,12 L 65,18 L 80,5 L 95,8"
    : tone === "red"
      ? "M 5,8 L 20,12 L 35,6 L 50,22 L 65,15 L 80,26 L 95,20"
      : tone === "amber"
        ? "M 5,18 L 20,14 L 35,20 L 50,10 L 65,24 L 80,16 L 95,12"
        : "M 5,24 L 20,20 L 35,10 L 50,18 L 65,8 L 80,12 L 95,5";

  if (hero) {
    const heroContent = (
      <div className="relative p-5 sm:p-6 flex flex-col justify-between gap-6 h-full overflow-hidden text-white">
        {/* Radial brand-deep glow in the corner — the same gradient family as
            the cursor glow, just static, so a hero card reads as this app's
            emphasis and not a borrowed palette. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-60 blur-2xl"
          style={{ background: "radial-gradient(circle, var(--accent-deep), transparent 70%)" }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.22em] text-white/80">
            {label}
          </p>
          {icon ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
              {icon}
            </span>
          ) : null}
        </div>
        <div className="relative">
          <p className="font-display font-mono text-[clamp(32px,3.4vw,40px)] font-bold tracking-[-0.05em] text-white">
            {value}
          </p>
          {detail ? <p className="mt-1.5 text-[11px] text-white/75 font-medium">{detail}</p> : null}
        </div>
      </div>
    );

    const heroClass =
      "bg-gradient-to-br from-[var(--accent)] to-[var(--accent-deep)] border-transparent shadow-[0_12px_40px_rgba(255,16,42,0.28)] h-full";

    if (href) {
      return (
        <Link href={href} className="block group h-full">
          <Surface className={`${heroClass} group-hover:brightness-110 transition-[filter]`}>
            {heroContent}
          </Surface>
        </Link>
      );
    }
    return <Surface className={heroClass}>{heroContent}</Surface>;
  }

  const content = (
    <div className="p-4 sm:p-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          {/* Wraps rather than truncates, and the tracking tightens: two cards
              to a phone row leaves ~170px, and "Today Production" clipped to
              "TODA…" names nothing. */}
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.22em] text-text-tertiary">
            {label}
          </p>
          <p className="mt-3 font-mono text-[clamp(28px,3vw,36px)] font-bold tracking-[-0.05em] text-text-primary">
            {value}
          </p>
          {detail ? <p className="mt-1.5 text-[11px] text-text-secondary font-medium">{detail}</p> : null}
        </div>

        {/* Sparkline Graph — decoration, and on a phone it costs more width
            than the reading it gives. */}
        <div className="hidden shrink-0 mb-1 sm:block">
          <svg className="w-16 h-8 text-[var(--brand)]/70 dark:text-[var(--brand)]" viewBox="0 0 100 30" fill="none">
            <path
              d={sparklinePath || defaultPath}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group h-full">
        <Surface className="bg-gradient-to-b from-accent-soft/30 to-transparent border border-border group-hover:border-[var(--brand)]/50 transition-colors h-full">
          {content}
        </Surface>
      </Link>
    );
  }

  return (
    <Surface className="bg-gradient-to-b from-accent-soft/30 to-transparent border border-border h-full">
      {content}
    </Surface>
  );
}
