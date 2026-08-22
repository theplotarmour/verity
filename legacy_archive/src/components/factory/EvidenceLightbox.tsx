"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize2, User, Clock } from "lucide-react";

export type EvidenceItem = {
  id?: string;
  publicUrl: string;
  checkpointName?: string | null;
  label?: string | null;
  createdAt?: string | Date | null;
  uploadedByName?: string | null;
};

// Fullscreen viewer for passport evidence — production, QC, packing, dispatch,
// any attachment. Zoom, pan, browse next/prev, download the original, and see
// when each photo was taken and by whom.
export function EvidenceLightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: EvidenceItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => setMounted(true), []);
  // Reset zoom whenever the shown image changes.
  useEffect(() => { setScale(1); setOffset({ x: 0, y: 0 }); }, [index]);

  const item = items[index];
  const go = (delta: number) => onIndexChange((index + delta + items.length) % items.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(s + 0.5, 6));
      else if (e.key === "-") setScale((s) => Math.max(s - 0.5, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length]);

  const download = async () => {
    try {
      const res = await fetch(item.publicUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (item.checkpointName || item.label || "evidence").replace(/[^a-zA-Z0-9._-]/g, "_") + (item.publicUrl.match(/\.\w+($|\?)/)?.[0]?.replace(/\?$/, "") || ".jpg");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.publicUrl, "_blank");
    }
  };

  if (!mounted || !item) return null;

  const meta = [
    item.checkpointName || item.label,
    item.createdAt ? new Date(item.createdAt).toLocaleString() : null,
    item.uploadedByName,
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100001] flex flex-col bg-black/95" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 p-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 flex flex-col gap-0.5">
          {(item.checkpointName || item.label) && (
            <span className="text-sm font-semibold truncate">{item.checkpointName || item.label}</span>
          )}
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/60">
            {item.createdAt && (
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(item.createdAt).toLocaleString()}</span>
            )}
            {item.uploadedByName && (
              <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {item.uploadedByName}</span>
            )}
            <span>{index + 1} / {items.length}</span>
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <IconBtn title="Zoom out" onClick={() => setScale((s) => Math.max(s - 0.5, 1))}><ZoomOut className="h-4.5 w-4.5" /></IconBtn>
          <IconBtn title="Reset zoom" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}><Maximize2 className="h-4.5 w-4.5" /></IconBtn>
          <IconBtn title="Zoom in" onClick={() => setScale((s) => Math.min(s + 0.5, 6))}><ZoomIn className="h-4.5 w-4.5" /></IconBtn>
          <IconBtn title="Download original" onClick={download}><Download className="h-4.5 w-4.5" /></IconBtn>
          <IconBtn title="Close" onClick={onClose}><X className="h-5 w-5" /></IconBtn>
        </div>
      </div>

      {/* Stage */}
      <div
        className="relative flex-1 overflow-hidden flex items-center justify-center select-none"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => { e.preventDefault(); setScale((s) => Math.min(6, Math.max(1, s - Math.sign(e.deltaY) * 0.3))); }}
        onMouseDown={(e) => { if (scale > 1) drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }; }}
        onMouseMove={(e) => { if (drag.current) setOffset({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) }); }}
        onMouseUp={() => (drag.current = null)}
        onMouseLeave={() => (drag.current = null)}
        style={{ cursor: scale > 1 ? "grab" : "default" }}
      >
        {items.length > 1 && (
          <IconBtn title="Previous" onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 z-10"><ChevronLeft className="h-6 w-6" /></IconBtn>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.publicUrl}
          alt={item.checkpointName || "evidence"}
          draggable={false}
          className="max-h-full max-w-full object-contain transition-transform duration-75"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        />
        {items.length > 1 && (
          <IconBtn title="Next" onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10"><ChevronRight className="h-6 w-6" /></IconBtn>
        )}
      </div>

      {/* Filmstrip */}
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3" onClick={(e) => e.stopPropagation()}>
          {items.map((it, i) => (
            <button
              key={it.id ?? i}
              onClick={() => onIndexChange(i)}
              className={"h-14 w-14 shrink-0 rounded-lg overflow-hidden border-2 transition " + (i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.publicUrl} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

function IconBtn({ children, onClick, title, className = "" }: { children: React.ReactNode; onClick: () => void; title: string; className?: string }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={"p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition " + className}>
      {children}
    </button>
  );
}
