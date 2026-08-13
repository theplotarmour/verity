"use client";

import { Check, ArrowRight, AlertTriangle, Play, Sparkles, Award } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedEvent = {
  id: string;
  type: "success" | "info" | "warning" | "certified";
  text: string;
  meta: string;
  time: string;
};

export function FactoryActivityFeed({ events = [] }: { events?: FeedEvent[] }) {
  // If no dynamic events are passed, fallback to styled live logs
  const staticEvents: FeedEvent[] = [
    { id: "1", type: "success", text: "Amit completed QC Check", meta: "Kia Seltos #B023", time: "2 min ago" },
    { id: "2", type: "info", text: "Batch moved to Stitching", meta: "Toyota Innova #B024", time: "5 min ago" },
    { id: "3", type: "certified", text: "Quality Passport Generated V-U46SEG", meta: "Honda City #B021", time: "12 min ago" },
    { id: "4", type: "warning", text: "Rework requested: Side stitch alignment", meta: "Mahindra XUV700 #B022", time: "18 min ago" },
    { id: "5", type: "success", text: "Production started: Cutting pass complete", meta: "Tata Nexon #B025", time: "25 min ago" },
  ];

  const list = events.length > 0 ? events : staticEvents;

  return (
    <div className="flex flex-col bg-surface border border-border rounded-[24px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
          </span>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">Live Quality Feed</h3>
        </div>
        <span className="text-[10px] font-mono text-text-tertiary">Real-time signals</span>
      </div>

      <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
        {list.map((event) => (
          <div key={event.id} className="flex gap-3 items-start text-xs group">
            {/* Event Type Icon */}
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                event.type === "success" && "bg-success-soft text-success border-success/10",
                event.type === "info" && "bg-brand-soft text-[var(--brand)] border-[var(--brand)]/10",
                event.type === "warning" && "bg-danger-soft text-danger border-danger/10",
                event.type === "certified" && "bg-purple-500/10 text-purple-500 border-purple-500/10"
              )}
            >
              {event.type === "success" && <Check className="h-3.5 w-3.5" />}
              {event.type === "info" && <ArrowRight className="h-3.5 w-3.5" />}
              {event.type === "warning" && <AlertTriangle className="h-3.5 w-3.5" />}
              {event.type === "certified" && <Award className="h-3.5 w-3.5" />}
            </div>

            {/* Event detail */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-text-primary leading-tight truncate">{event.text}</p>
                <span className="text-[9px] font-mono text-text-tertiary shrink-0">{event.time}</span>
              </div>
              <p className="text-[10px] text-text-secondary mt-0.5 truncate">{event.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
