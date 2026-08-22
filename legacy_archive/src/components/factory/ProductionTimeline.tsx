"use client";

import { cn } from "@/lib/utils";
import { Check, User, Search, Award, FileCheck, AlertTriangle } from "lucide-react";

interface TimelineEvent {
  title: string;
  description: string;
  time?: string | Date;
  status: "completed" | "active" | "pending" | "failed";
  icon: any;
}

interface ProductionTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function ProductionTimeline({ events, className }: ProductionTimelineProps) {
  return (
    <div className={cn("space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-border dark:before:bg-white/5", className)}>
      {events.map((event, idx) => {
        const Icon = event.icon;
        
        return (
          <div key={idx} className="flex gap-4 items-start relative snap-start">
            {/* Dot/Icon container */}
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-white transition-all duration-300 z-10",
                event.status === "completed" && "bg-success border-success shadow-[0_0_12px_rgba(48,209,88,0.25)]",
                event.status === "active" && "bg-[var(--brand)] border-[var(--brand)] shadow-[0_0_12px_rgba(0,122,255,0.3)]",
                event.status === "failed" && "bg-danger border-danger shadow-[0_0_12px_rgba(255,69,58,0.25)]",
                event.status === "pending" && "bg-surface border-border dark:bg-neutral-900 dark:border-white/10 text-text-tertiary"
              )}
            >
              {event.status === "completed" ? (
                <Check className="h-4.5 w-4.5 stroke-[3]" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </div>

            {/* Content box */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4
                  className={cn(
                    "text-sm font-semibold tracking-[-0.01em]",
                    event.status === "completed" && "text-text-primary",
                    event.status === "active" && "text-text-primary font-bold",
                    event.status === "failed" && "text-danger font-semibold",
                    event.status === "pending" && "text-text-tertiary"
                  )}
                >
                  {event.title}
                </h4>
                {event.time && (
                  <span className="text-[10px] font-mono text-text-tertiary shrink-0">
                    {typeof event.time === "string"
                      ? event.time
                      : new Date(event.time).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "text-xs mt-0.5",
                  event.status === "pending" ? "text-text-tertiary" : "text-text-secondary"
                )}
              >
                {event.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
