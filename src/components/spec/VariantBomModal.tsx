"use client";

import { useEffect, useMemo, useState } from "react";
import { previewInheritedBom } from "@/server/actions/itemsFromSpec";
import { listComponentItems } from "@/server/actions/bomTemplates";
import { SpecCombobox } from "./SpecCombobox";
import type { SpecAnswer } from "@/lib/spec/types";

export type BomTweak = { componentItemId: string; quantity: number; removed?: boolean };

type InheritedLine = { itemId: string; name: string; quantity: number; uom: string; source: string };

/**
 * One variant's recipe, edited before the variant exists.
 *
 * The wizard can mint forty SKUs in a run, so the inherited components are shown
 * one row at a time here rather than as forty grids on the page. Nothing is
 * written now — the edits are handed back and saved against the item the moment
 * the batch creates it, because both an override and a contribution are keyed on
 * an id that does not exist yet.
 *
 * `contributes` flips what the added rows mean. On a produced SKU they override
 * its recipe; on an attribute — a Design, a Fabric shade — they are what the
 * attribute brings to every item that picks it. The button is the same either
 * way, so ingredients can be set up on the spot rather than by opening forty
 * items afterwards.
 */
export function VariantBomModal({
  groupId,
  answers,
  title,
  tweaks,
  contributes = false,
  onChange,
  onClose,
}: {
  groupId: string;
  answers: Record<string, SpecAnswer>;
  title: string;
  tweaks: BomTweak[];
  contributes?: boolean;
  onChange: (next: BomTweak[]) => void;
  onClose: () => void;
}) {
  const [lines, setLines] = useState<InheritedLine[] | null>(null);
  const [components, setComponents] = useState<{ id: string; name: string; defaultUOM: string }[]>([]);
  const [addId, setAddId] = useState("");
  const [addQty, setAddQty] = useState("1");

  // Keyed on what the answers say, not on the object's identity: the parent
  // rebuilds that object on every render, so depending on it refetched the
  // preview each time a quantity was typed in this very modal.
  const answersKey = JSON.stringify(answers);

  useEffect(() => {
    let cancelled = false;
    previewInheritedBom(groupId, answers)
      .then((rows) => !cancelled && setLines(rows))
      .catch(() => !cancelled && setLines([]));
    listComponentItems()
      .then((c) => !cancelled && setComponents(c))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [groupId, answersKey]);

  const tweakFor = (componentItemId: string) => tweaks.find((t) => t.componentItemId === componentItemId);

  const setTweak = (componentItemId: string, patch: Partial<BomTweak>) => {
    const existing = tweakFor(componentItemId);
    const next = existing
      ? tweaks.map((t) => (t.componentItemId === componentItemId ? { ...t, ...patch } : t))
      : [...tweaks, { componentItemId, quantity: patch.quantity ?? 1, removed: patch.removed ?? false }];
    onChange(next);
  };

  const clearTweak = (componentItemId: string) =>
    onChange(tweaks.filter((t) => t.componentItemId !== componentItemId));

  const idFor = (line: InheritedLine) => line.itemId;

  const added = tweaks.filter(
    (t) => !t.removed && !(lines ?? []).some((l) => idFor(l) === t.componentItemId)
  );

  // The picker is the app's standard searchable list, not a native select: this
  // factory has hundreds of raw materials and scrolling to "Suede Grey 1.2mm"
  // through an unsearchable dropdown is the slowest step in the wizard.
  const componentOptions = useMemo(
    () =>
      components.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.defaultUOM || null,
        searchText: `${c.name} ${c.defaultUOM ?? ""}`.toLowerCase(),
      })),
    [components]
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full max-w-lg overflow-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold text-text-primary">
          {contributes ? "What this brings to its items" : "Recipe for this variant"}
        </h2>
        <p className="mb-3 truncate text-xs text-text-secondary">{title}</p>

        {/* The inherited list and the add-a-component row are two independent
            fetches, so the row must not wait on the list. It used to: the whole
            body sat behind `lines === null`, and on a category whose inherited
            recipe is slow to resolve the modal showed nothing but "Working out
            what it inherits…" — with no way to add anything at all. */}
        {lines === null ? (
          <p className="py-6 text-center text-xs text-text-tertiary">Working out what it inherits…</p>
        ) : (
          <>
            {lines.length === 0 && added.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-text-tertiary">
                {contributes
                  ? "Nothing yet. Add what one of these consumes — every item that picks it inherits the line."
                  : "Nothing inherited yet. Set contributions on the fabric or design, or add a component below."}
              </p>
            )}

            <div className="space-y-1.5">
              {lines.map((line) => {
                const id = idFor(line);
                const t = id ? tweakFor(id) : undefined;
                const removed = !!t?.removed;
                return (
                  <div
                    key={line.itemId}
                    className={`flex items-center gap-2 rounded-xl border border-border p-2 ${removed ? "opacity-50" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs font-semibold text-text-primary ${removed ? "line-through" : ""}`}>
                        {line.name}
                      </p>
                      <p className="text-[11px] text-text-tertiary">from {line.source}</p>
                    </div>
                    <input
                      type="number"
                      step="any"
                      disabled={!id || removed}
                      value={t?.quantity ?? line.quantity}
                      onChange={(e) => id && setTweak(id, { quantity: Number(e.target.value) || 0 })}
                      className="h-8 w-20 rounded-lg border border-border bg-surface px-2 text-xs text-text-primary disabled:opacity-50"
                    />
                    <span className="w-10 text-[11px] text-text-tertiary">{line.uom}</span>
                    {id && (
                      <button
                        type="button"
                        onClick={() => (removed ? clearTweak(id) : setTweak(id, { removed: true }))}
                        className={`text-[11px] font-semibold ${removed ? "text-text-secondary" : "text-danger"} hover:underline`}
                      >
                        {removed ? "Undo" : "Remove"}
                      </button>
                    )}
                  </div>
                );
              })}

              {added.map((t) => {
                const c = components.find((x) => x.id === t.componentItemId);
                return (
                  <div key={t.componentItemId} className="flex items-center gap-2 rounded-xl border border-[var(--brand)]/40 bg-brand-soft/30 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-text-primary">{c?.name ?? t.componentItemId}</p>
                      <p className="text-[11px] text-text-tertiary">
                        {contributes ? "inherited by items using this" : "added for this variant"}
                      </p>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={t.quantity}
                      onChange={(e) => setTweak(t.componentItemId, { quantity: Number(e.target.value) || 0 })}
                      className="h-8 w-20 rounded-lg border border-border bg-surface px-2 text-xs text-text-primary"
                    />
                    <span className="w-10 text-[11px] text-text-tertiary">{c?.defaultUOM ?? ""}</span>
                    <button
                      type="button"
                      onClick={() => clearTweak(t.componentItemId)}
                      className="text-[11px] font-semibold text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-4 flex items-end gap-2 border-t border-border pt-3">
              <div className="min-w-0 flex-1">
                <span className="mb-1 block text-[11px] font-medium text-text-secondary">Add a component</span>
                <SpecCombobox
                  options={componentOptions}
                  value={addId || null}
                  onChange={(id) => setAddId(id ?? "")}
                  placeholder="Search raw materials…"
                />
              </div>
              <input
                type="number"
                step="any"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                aria-label="Quantity"
                className="h-[38px] w-20 rounded-lg border border-border bg-surface px-2 text-xs text-text-primary"
              />
              {/* One roll of tape and one metre of tape are different orders.
                  The number alone never said which, and the unit is already
                  known the moment a component is chosen. */}
              <span className="h-[38px] shrink-0 self-end pb-2.5 text-xs text-text-secondary">
                {addId ? components.find((c) => c.id === addId)?.defaultUOM ?? "" : ""}
              </span>
              <button
                type="button"
                disabled={!addId}
                onClick={() => {
                  setTweak(addId, { quantity: Number(addQty) || 1, removed: false });
                  setAddId("");
                  setAddQty("1");
                }}
                className="h-[38px] rounded-lg bg-[var(--brand)] px-3 text-xs font-bold text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="h-9 rounded-xl bg-[var(--brand)] px-4 text-xs font-bold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
