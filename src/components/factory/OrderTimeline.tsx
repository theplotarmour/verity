"use client";

import { useState } from "react";
import {
  CheckCircle2, XCircle, PlusCircle, RefreshCw, ShieldAlert, FileText, Printer,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Surface } from "@/components/design/Surface";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { TimelineItem } from "@/server/actions/timeline";

const TYPE_STYLES: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  CREATED: { icon: PlusCircle, className: "bg-brand-soft text-brand dark:bg-brand/15" },
  APPROVED: { icon: CheckCircle2, className: "bg-success-soft text-success dark:bg-success/15" },
  REJECTED: { icon: XCircle, className: "bg-danger-soft text-danger dark:bg-danger/15" },
  STATUS_CHANGED: { icon: RefreshCw, className: "bg-surface-2 text-text-secondary" },
  AUDIT: { icon: FileText, className: "bg-surface-2 text-text-tertiary" },
};

// Per-order chronological audit feed (PRD module 4): every stage action, QC
// decision and override with actor, time, images and remarks.
export function OrderTimeline({ items, orderLabel }: { items: TimelineItem[]; orderLabel: string }) {
  const [expanded, setExpanded] = useState(true);

  if (items.length === 0) return null;

  return (
    <>
      {/* Print-only scoping: when printing, show just the timeline */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #order-timeline, #order-timeline * { visibility: visible; }
          #order-timeline { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div id="order-timeline">
      <Surface className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">Production Timeline</p>
            <h3 className="mt-0.5 text-sm font-bold text-text-primary">{orderLabel} · {items.length} events</h3>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="secondary" className="h-8 gap-1.5 text-xs" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print / PDF
            </Button>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary hover:text-text-primary"
              aria-label={expanded ? "Collapse timeline" : "Expand timeline"}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-0">
            {items.map((item, idx) => {
              const style = item.isOverride
                ? { icon: ShieldAlert, className: "bg-warning-soft text-warning dark:bg-warning/15" }
                : TYPE_STYLES[item.type] ?? TYPE_STYLES.STATUS_CHANGED;
              const Icon = style.icon;
              const isLast = idx === items.length - 1;
              return (
                <div key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />}
                  <div className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", style.className)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className={cn(
                    "min-w-0 flex-1 rounded-xl border p-3",
                    item.isOverride ? "border-warning/50 bg-warning-soft/50 dark:bg-warning/5" : "border-border/60 bg-surface"
                  )}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className={cn("text-sm font-semibold", item.isOverride ? "text-warning dark:text-warning" : "text-text-primary")}>
                        {item.title}
                      </p>
                      <span className="text-[10px] font-medium text-text-tertiary whitespace-nowrap">
                        {new Date(item.at).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs text-text-secondary">{item.description}</p>
                    )}
                    {item.actorName && (
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                        by {item.actorName}
                      </p>
                    )}
                    {item.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.images.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt="Stage evidence" className="h-12 w-12 rounded-lg border border-border object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Surface>
      </div>
    </>
  );
}
