"use client";

import { Surface } from "./Surface";
import Link from "next/link";

export function Metric({
  label,
  value,
  detail,
  tone = "blue",
  sparklinePath,
  href,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "blue" | "green" | "amber" | "red";
  sparklinePath?: string;
  href?: string;
}) {
  const defaultPath = tone === "green"
    ? "M 5,22 L 20,20 L 35,25 L 50,12 L 65,18 L 80,5 L 95,8"
    : tone === "red"
      ? "M 5,8 L 20,12 L 35,6 L 50,22 L 65,15 L 80,26 L 95,20"
      : tone === "amber"
        ? "M 5,18 L 20,14 L 35,20 L 50,10 L 65,24 L 80,16 L 95,12"
        : "M 5,24 L 20,20 L 35,10 L 50,18 L 65,8 L 80,12 L 95,5";

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
