"use client";

import { cn } from "@/lib/utils";

interface VerityLogoProps {
  className?: string;
  size?: number; // width in pixels
  colorClass?: string; // e.g. "text-text-primary dark:text-white"
  /** Accent segment colour. Defaults to the brand indigo via CSS var. */
  accent?: string;
}

/**
 * The Verity mark: a V whose rising stroke overshoots into a checkmark.
 * The letterform and the verification symbol are the same gesture — the
 * product name and what the product does, drawn once.
 */
export function VerityLogo({
  className,
  size = 48,
  colorClass = "text-text-primary",
  accent = "var(--accent)",
}: VerityLogoProps) {
  return (
    <svg
      viewBox="0 0 100 70"
      width={size}
      height={size * 0.7}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Verity"
      className={cn("select-none transition-all duration-300", colorClass, className)}
    >
      {/* Descending stroke of the V */}
      <path
        d="M 16,16 L 43,54"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ascending stroke — overshoots the cap height to read as a check */}
      <path
        d="M 43,54 L 84,10"
        stroke={accent}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
