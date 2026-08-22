import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Timeline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative border-l-2 border-border ml-4 pl-6 space-y-8", className)}>
      {children}
    </div>
  );
}

export function TimelineItem({
  title,
  description,
  timestamp,
  icon,
  isLast = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  timestamp?: string;
  icon?: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="relative">
      <div className="absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 ring-4 ring-white">
        {icon || <div className="h-2 w-2 rounded-full bg-surface-2" />}
      </div>
      <div className="flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
          {timestamp && <span className="text-xs text-text-secondary">{timestamp}</span>}
        </div>
        {description && <div className="mt-1 text-sm text-text-secondary">{description}</div>}
      </div>
    </div>
  );
}
