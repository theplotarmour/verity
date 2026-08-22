"use client";

import { useState } from "react";
import { ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";

// Reference photos for the design being produced. Rendered wherever a worker,
// inspector, or viewer needs to confirm the correct look — passport, worker
// workspace, QC, order preview, blueprint preview. Thumbnails open a simple
// fullscreen viewer so the correct design is never in doubt.
export function DesignReference({
  images,
  designName,
  compact = false,
}: {
  images?: string[] | null;
  designName?: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const list = (images ?? []).filter(Boolean);
  if (list.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-tertiary flex items-center gap-1.5">
        <ImageIcon className="h-3.5 w-3.5" /> Design reference{designName ? ` — ${designName}` : ""}
      </p>
      <div className={compact ? "flex gap-2 overflow-x-auto pb-1" : "grid grid-cols-3 sm:grid-cols-4 gap-2"}>
        {list.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpen(i)}
            className={
              (compact ? "h-16 w-16 shrink-0 " : "aspect-square ") +
              "rounded-lg overflow-hidden border border-border bg-surface-2 hover:ring-2 hover:ring-[var(--brand)]/40 transition"
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="design reference" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 p-4" onClick={() => setOpen(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20" onClick={() => setOpen(null)}>
            <X className="h-5 w-5" />
          </button>
          {list.length > 1 && (
            <>
              <button
                className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + list.length) % list.length); }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % list.length); }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={list[open]} alt="design reference" className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
