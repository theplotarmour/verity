"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDropdownPosition } from "@/components/ui/dropdown-position";
import { type VariantValue } from "./VariantDescInput";
import { searchFinishedGoods, countFinishedGoods, type ItemSearchResult } from "@/server/actions/itemSearch";
import { formatVariant } from "@/lib/variant-descriptor";

type Props = {
  value: VariantValue;
  onApply: (v: VariantValue) => void;
  /** The item behind the pick, when it came from the catalogue rather than the builder. */
  onPickItem?: (itemId: string | null) => void;
  className?: string;
  compact?: boolean;
};

const toValue = (r: ItemSearchResult): VariantValue => ({
  brand: r.brand,
  model: r.model,
  generation: r.generation,
  product: r.product,
  seatType: r.seatType,
  headrests: r.headrests,
  armrest: r.armrest,
  fabricName: r.fabricName,
  designName: r.designName,
  colorName: r.colorName,
});

/**
 * Find what to produce by typing its name.
 *
 * Item names already read "Seat Cover Maruti Swift 2005-2010 Double Back 5HDR
 * No Arm Premium SPC PRO SERIES Beige", so "swift beige" reaches it in one line
 * instead of an eight-step brand → model → generation → spec → fabric walk.
 *
 * There is no on-the-fly builder: every variant is created first in the Master
 * Data Studio, so this box only searches and selects what already exists. The
 * locked preview then reads the item's own image and spec answers straight from
 * the catalogue, so it stays correct for any product, not just seat covers.
 */
export function ItemSearchInput({
  value,
  onApply,
  onPickItem,
  className,
  compact = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  // Portalled and fixed, so results are not clipped by a scrolling ancestor and
  // flip above the input when it sits low on the screen.
  const { anchorRef, style } = useDropdownPosition<HTMLInputElement>(open, 320);
  // Set when the pick came from the catalogue. Locked details are a confirmation
  // step: the owner reads back what they are producing instead of scanning a row
  // of inputs that could be nudged by a stray keystroke.
  const [locked, setLocked] = useState(false);
  // The full catalogue row behind the current pick — carries the image and the
  // dynamic spec answers the preview renders. VariantValue alone can't, so it is
  // kept here alongside.
  const [pickedResult, setPickedResult] = useState<ItemSearchResult | null>(null);
  const [catalogueSize, setCatalogueSize] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // What the current pick reads as, so the box shows the chosen item rather
  // than going blank the moment focus leaves.
  const picked = useMemo(() => {
    if (!value.brand && !value.product) return "";
    return formatVariant({
      brand: value.brand,
      model: value.model,
      generation: value.generation,
      product: value.product,
      seatType: value.seatType || null,
      headrests: value.headrests,
      armrest: value.armrest,
      fabric: value.fabricName,
      design: value.designName,
    });
  }, [value]);

  useEffect(() => {
    countFinishedGoods().then(setCatalogueSize);
  }, []);

  // Debounced: typing "swift beige" is one search, not eleven.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      searchFinishedGoods(query)
        .then((rows) => {
          if (cancelled) return;
          setResults(rows);
          setHighlight(0);
        })
        .finally(() => !cancelled && setLoading(false));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(r: ItemSearchResult) {
    onApply(toValue(r));
    onPickItem?.(r.id);
    setPickedResult(r);
    setQuery("");
    setOpen(false);
    setLocked(true);
  }

  /** Hand the box back so a different item can be chosen. */
  function unlock() {
    setLocked(false);
    setPickedResult(null);
    onPickItem?.(null);
  }

  const empty = !loading && results.length === 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div ref={wrapRef} className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            ref={anchorRef}
            value={open ? query : picked}
            placeholder={
              catalogueSize === 0
                ? "No finished goods yet — add them in Master Data Studio"
                : "Search what to produce — try “swift beige”"
            }
            onFocus={() => {
              setOpen(true);
              setQuery("");
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter" && open && results[highlight]) {
                e.preventDefault();
                choose(results[highlight]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            className={cn(
              "w-full rounded-2xl border border-border bg-surface pl-9 pr-3 text-sm text-text-primary outline-none transition focus:border-[var(--brand)]/70",
              compact ? "h-10" : "h-12"
            )}
          />
        </div>

        {open && style && createPortal(
          <div
            style={style}
            className="z-[9999] overflow-auto rounded-2xl border border-border bg-surface shadow-lg"
          >
            {loading && <p className="px-3 py-2 text-xs text-text-tertiary">Searching…</p>}

            {empty && (
              <div className="px-3 py-3 text-xs text-text-secondary">
                <p className="font-bold text-text-primary">
                  {catalogueSize === 0
                    ? "No finished goods in the catalogue yet."
                    : `Nothing matches “${query.trim()}”.`}
                </p>
                <p className="mt-1">
                  Create this variant in the Master Data Studio first, then search for it
                  here.
                </p>
              </div>
            )}

            {results.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                  i === highlight ? "bg-brand-soft text-[var(--brand)]" : "text-text-primary"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
                  {r.itemCode}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>

      {/* Locked: what was chosen, read back rather than re-offered. Rows and the
          image come straight from the catalogue item, so this stays correct for
          any product without hardcoding seat-cover fields. */}
      {locked && (
        <div className="rounded-2xl border border-[var(--brand)]/30 bg-brand-soft/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
              Producing
            </p>
            <button
              type="button"
              onClick={unlock}
              className="text-[11px] font-bold text-[var(--brand)] hover:underline"
            >
              Change
            </button>
          </div>
          <div className="flex gap-3">
            {pickedResult?.imageUrl && (
              <img
                src={pickedResult.imageUrl}
                alt={pickedResult.name}
                className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              {pickedResult?.name && (
                <p className="mb-2 truncate text-sm font-bold text-text-primary">
                  {pickedResult.name}
                </p>
              )}
              {/* The item's own spec fields. With none configured, the composed
                  name above is the whole identity — no hardcoded seat-cover rows. */}
              <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                {(pickedResult?.specDetails ?? []).map((d) => (
                  <div key={d.label} className="flex gap-2">
                    <dt className="shrink-0 text-text-tertiary">{d.label}</dt>
                    <dd className="min-w-0 truncate font-semibold text-text-primary">
                      {d.value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
