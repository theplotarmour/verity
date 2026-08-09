"use client";

import { cn } from "@/lib/utils";

interface VerityLogoProps {
  className?: string;
  size?: number; // width in pixels
  colorClass?: string; // e.g. "text-text-primary dark:text-white"
}

export function VerityLogo({ className, size = 48, colorClass = "text-text-primary" }: VerityLogoProps) {
  // Height is dynamically 70% of size to maintain original aspect ratio
  return (
    <svg
      viewBox="0 0 100 70"
      width={size}
      height={size * 0.7}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none transition-all duration-300", colorClass, className)}
    >
      {/* Left White Segment (Left leg to mid up-slope) */}
      <path
        d="M 14,56 L 32,20 L 48,52 L 57.1,33.8"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeMiterlimit="4"
      />
      
      {/* Red Accent Block */}
      <path
        d="M 57.1,33.8 L 62,24"
        stroke="#E11D48" /* matches brand red */
        strokeWidth="9"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      
      {/* Grey/Silver Segment */}
      <path
        d="M 62,24 L 74,48"
        stroke="#9CA3AF" /* matches silver/grey */
        strokeWidth="9"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      
      {/* Right White Segment (Valley to right leg) */}
      <path
        d="M 74,48 L 88,20"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
