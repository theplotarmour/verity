"use client";

import { cn } from "@/lib/utils";
import { VerityLogo } from "./VerityLogo";

interface CircularMarqueeLoaderProps {
  className?: string;
  size?: number; // width/height in pixels
}

/**
 * The loading mark: the logo inside a rotating ring of wordmarks.
 *
 * The ring used to carry the previous product's tagline as one long string
 * wrapped round a full circle, which left the back half upside down and
 * unreadable. It now repeats the wordmark four times, spaced so each repeat
 * sits upright on its own quadrant as the ring turns.
 */
export function CircularMarqueeLoader({ className, size = 200 }: CircularMarqueeLoaderProps) {
  const word = "VERITY";
  // Four repeats at 25% intervals. Short enough that no single instance spans
  // far enough round the circle to invert within itself.
  const offsets = [0, 25, 50, 75];

  return (
    <div
      className={cn("relative flex select-none items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full animate-[spin_18s_linear_infinite]">
        <defs>
          <path
            id="verity-ring"
            d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
            fill="none"
          />
        </defs>

        {offsets.map((offset) => (
          <text
            key={offset}
            className="fill-[var(--brand)] font-mono text-[6.4px] font-bold uppercase tracking-[0.3em]"
            opacity={0.9}
          >
            <textPath href="#verity-ring" startOffset={`${offset}%`}>
              {word}
            </textPath>
          </text>
        ))}

        {/* Sweep arc — the part that actually reads as "working". The ring of
            words turns slowly; this moves at a spinner's pace. */}
        <g className="origin-center animate-[spin_1.1s_linear_infinite]">
          <circle
            cx="50"
            cy="50"
            r="30.5"
            fill="none"
            stroke="var(--brand)"
            strokeOpacity="0.9"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="34 158"
          />
        </g>

        <circle
          cx="50"
          cy="50"
          r="30.5"
          fill="none"
          stroke="var(--brand)"
          strokeOpacity="0.12"
          strokeWidth="1.6"
        />
      </svg>

      <div
        className="absolute flex items-center justify-center rounded-full border border-border bg-surface/90 backdrop-blur-sm dark:bg-neutral-900/80"
        style={{ width: size * 0.5, height: size * 0.5 }}
      >
        <VerityLogo size={size * 0.3} />
      </div>
    </div>
  );
}
