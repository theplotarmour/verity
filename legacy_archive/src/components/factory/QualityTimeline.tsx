"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function QualityTimeline({
  items,
  className,
}: {
  items: Array<{ title: ReactNode; description?: ReactNode; meta?: ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <div key={index} className="flex gap-4 rounded-[18px] border border-border bg-white p-4">
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--brand)]" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="text-sm font-medium text-text-primary">{item.title}</div>
              {item.meta ? <div className="text-xs text-text-tertiary">{item.meta}</div> : null}
            </div>
            {item.description ? <div className="mt-1 text-sm text-text-secondary">{item.description}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

