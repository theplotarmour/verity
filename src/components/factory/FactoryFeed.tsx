"use client";

import { useEffect, useState } from "react";
import { Check, ArrowRight, AlertTriangle, Play, Sparkles } from "lucide-react";

type FeedEvent = {
  id: string;
  type: "success" | "info" | "warning";
  text: string;
  meta: string;
};

export function FactoryFeed({ initialEvents = [] }: { initialEvents?: FeedEvent[] }) {
  const [events] = useState<FeedEvent[]>(initialEvents.length > 0 ? initialEvents : [
    { id: "1", type: "success", text: "Amit completed QC", meta: "Kia Seltos" },
    { id: "2", type: "info", text: "Batch moved to Stitching", meta: "Floor #2" },
    { id: "3", type: "success", text: "Passport generated V-U46SEG", meta: "Toyota Innova" },
    { id: "4", type: "warning", text: "Issue reported", meta: "Toyota Innova stitching" },
    { id: "5", type: "success", text: "Production started", meta: "Honda City" },
  ]);

  const items = events.length > 0 ? [...events, ...events, ...events] : [];

  return (
    <div className="flex-shrink-0 w-full bg-surface border border-border rounded-[20px] shadow-sm select-none overflow-hidden transition-all duration-300">
      {/* Desktop/Tablet Marquee Layout */}
      <div className="hidden sm:flex items-center h-[64px] px-5 py-3 relative">
        {/* Fixed Left Live Indicator */}
        <div className="flex items-center gap-2.5 w-[160px] shrink-0 border-r border-border pr-4 z-10 bg-surface">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">LIVE</span>
          <span className="text-xs font-bold text-text-primary whitespace-nowrap">Factory Feed</span>
        </div>

        {/* Marquee scroll view */}
        <div 
          className="flex-1 overflow-hidden relative h-full flex items-center pl-6 ticker-mask"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 4%, black 96%, transparent)"
          }}
        >
          <div className="ticker-scroll flex items-center gap-6 whitespace-nowrap">
            <style jsx>{`
              @keyframes ticker {
                0% { transform: translateX(0); }
                100% { transform: translateX(-33.3333%); }
              }
              .ticker-scroll {
                animation: ticker 40s linear infinite;
              }
              .ticker-scroll:hover {
                animation-play-state: paused;
              }
            `}</style>
            {items.map((item, idx) => (
              <div 
                key={`${item.id}-${idx}`}
                className="inline-flex items-center gap-2.5 bg-surface-secondary/40 dark:bg-neutral-800/20 px-3.5 py-1.5 rounded-full border border-border/60 text-xs text-text-primary h-[36px]"
              >
                {item.type === "success" && <Check className="h-3.5 w-3.5 text-success" />}
                {item.type === "info" && <ArrowRight className="h-3.5 w-3.5 text-accent" />}
                {item.type === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-[var(--warning)]" />}
                <span className="font-semibold">{item.text}</span>
                <span className="text-text-tertiary font-mono text-[10px]">· {item.meta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Vertical List Layout */}
      <div className="flex sm:hidden flex-col p-4 max-h-[140px] overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
            </span>
            <span className="text-xs font-bold text-text-primary">Factory Feed</span>
          </div>
        </div>
        <div className="space-y-1.5 overflow-hidden">
          {events.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-[11px] text-text-secondary truncate">
              {item.type === "success" && <Check className="h-3 w-3 text-success shrink-0" />}
              {item.type === "info" && <ArrowRight className="h-3 w-3 text-accent shrink-0" />}
              {item.type === "warning" && <AlertTriangle className="h-3 w-3 text-[var(--warning)] shrink-0" />}
              <span className="truncate font-medium">{item.text} <span className="text-text-tertiary">· {item.meta}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
