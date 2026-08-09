"use client";

import { cn } from "@/lib/utils";
import { VerityLogo } from "./VerityLogo";

interface CircularMarqueeLoaderProps {
  className?: string;
  size?: number; // width/height in pixels
}

export function CircularMarqueeLoader({ className, size = 200 }: CircularMarqueeLoaderProps) {
  // The old ring read "VISION FOR ENTERPRISE DIGITAL ADVANCEMENT" — the
  // previous product's name expanded. This is the current tagline.
  const text = "VERITY • OPERATE • AUTOMATE • EVOLVE • ";
  
  return (
    <div 
      className={cn("flex flex-col items-center justify-center relative select-none", className)}
      style={{ width: size, height: size }}
    >
      {/* SVG Container with Rotated Text Path */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full animate-[spin_24s_linear_infinite]"
      >
        <defs>
          {/* Path for text to follow (Perfect Circle, starting at top) */}
          <path
            id="textPath"
            d="M 50,50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
            fill="none"
          />
        </defs>
        
        {/* Rotating Circular Text */}
        <text className="fill-[var(--brand)] dark:fill-[var(--brand)] font-mono text-[6.2px] font-bold tracking-[0.25em] uppercase opacity-85">
          <textPath href="#textPath" startOffset="0%">
            {text}
          </textPath>
        </text>
      </svg>
      
      {/* Inner Central Brand Ring */}
      <div 
        className="absolute rounded-full border border-[var(--brand)]/15 bg-surface/85 dark:bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center shadow-[0_8px_30px_rgba(0,122,255,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-300"
        style={{ width: size * 0.56, height: size * 0.56 }}
      >
        {/* Pulse inner glow */}
        <div className="absolute inset-2 rounded-full bg-[var(--brand)]/5 animate-pulse" />
        
        {/* Center Symbol */}
        <div className="relative z-10 flex items-center justify-center">
          <VerityLogo size={size * 0.28} className="animate-pulse" />
        </div>
      </div>
    </div>
  );
}
