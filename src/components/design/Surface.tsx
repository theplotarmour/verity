"use client";

import { useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Surface({
  className,
  children,
  allowFullscreen = false,
}: {
  className?: string;
  children: ReactNode;
  allowFullscreen?: boolean;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-[24px] border border-border bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-[20px] transition-all duration-200 relative",
        isFullscreen 
          ? "fixed inset-0 z-50 p-6 flex flex-col w-screen h-screen rounded-none border-none overflow-hidden bg-background" 
          : className
      )}
    >
      {allowFullscreen && (
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="absolute top-4 right-4 z-50 p-1.5 rounded-lg bg-surface-secondary hover:bg-border text-text-secondary hover:text-text-primary transition cursor-pointer"
          title={isFullscreen ? "Exit Full Screen" : "View in Full Screen"}
        >
          {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
        </button>
      )}
      {children}
    </div>
  );
}

