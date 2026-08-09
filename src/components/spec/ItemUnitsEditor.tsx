"use client";

import { useEffect, useState, useTransition } from "react";
import { SpecCombobox } from "./SpecCombobox";
import { getItemUnits, setItemUnits, listUsedUnits, type ItemUnits } from "@/server/actions/itemUnits";
import { UOM_SUGGESTIONS } from "@/lib/item-constants";
import { toast } from "@/components/ui/toast";

/**
 * The two units an item lives in: what it is stocked in, and what it is bought in.
 *
 * Fabric arrives as rolls and is consumed by the metre. Recording only one of
 * those means either the storekeeper converts in their head on every receipt, or
 * the BOM is written in a unit nobody orders in.
 */
export function ItemUnitsEditor({ itemId }: { itemId: string }) {
  const [pending, start] = useTransition();
  const [units, setUnits] = useState<ItemUnits | null>(null);
  const [known, setKnown] = useState<string[]>([]);
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [factor, setFactor] = useState("");

  useEffect(() => {
    getItemUnits(itemId).then((u) => {
      if (!u) return;
      setUnits(u);
      setPrimary(u.primaryUOM);
      setSecondary(u.secondaryUOM ?? "");
      setFactor(u.factor ? String(u.factor) : "");
    });
    listUsedUnits().then(setKnown);
  }, [itemId]);

  if (!units) return null;

  const options = [...new Set([...known, ...UOM_SUGGESTIONS])].map((u) => ({
    id: u,
    label: u,
    sublabel: null,
    searchText: u.toLowerCase(),
  }));

  /**
   * A unit the owner typed rather than picked.
   *
   * It joins `known` as well as the field, because the picker renders its
   * selection by looking the id up in `options` — a unit held only in state
   * would leave the box looking empty the moment he entered it.
   */
  const takeNewUnit = (entered: string) => {
    const unit = entered.trim().toUpperCase();
    if (unit) setKnown((prev) => (prev.includes(unit) ? prev : [...prev, unit]));
    return unit;
  };

  const dirty =
    primary !== units.primaryUOM ||
    secondary !== (units.secondaryUOM ?? "") ||
    factor !== (units.factor ? String(units.factor) : "");

  return (
    <div className="rounded-xl border border-border bg-surface-secondary/30 p-3">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-secondary">Units</h4>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-32">
          <label className="mb-1 block text-[11px] font-medium text-text-secondary">
            Stocked in
          </label>
          <SpecCombobox
            options={options}
            value={primary || null}
            onChange={(v) => setPrimary(v ?? "")}
            onCreate={(entered) => setPrimary(takeNewUnit(entered))}
            placeholder="MTR"
          />
        </div>

        <div className="w-32">
          <label className="mb-1 block text-[11px] font-medium text-text-secondary">
            Bought in
            <span className="ml-1 text-text-tertiary">optional</span>
          </label>
          <SpecCombobox
            options={options}
            value={secondary || null}
            onChange={(v) => setSecondary(v ?? "")}
            onCreate={(entered) => setSecondary(takeNewUnit(entered))}
            placeholder="ROLL"
          />
        </div>

        {secondary && (
          <div className="flex items-end gap-1.5">
            <div className="w-20">
              <label className="mb-1 block text-[11px] font-medium text-text-secondary">
                Conversion
              </label>
              <input
                inputMode="decimal"
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--brand)]"
              />
            </div>
            <span className="pb-2.5 text-[11px] text-text-secondary">
              {primary || "units"} in one {secondary}
            </span>
          </div>
        )}

        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() =>
            start(async () => {
              const result = await setItemUnits({
                itemId,
                primaryUOM: primary,
                secondaryUOM: secondary || null,
                factor: factor ? Number(factor) : null,
              });
              if ("error" in result && result.error) {
                toast.error(result.error);
                return;
              }
              const next = await getItemUnits(itemId);
              if (next) setUnits(next);
              toast.success("Units saved");
            })
          }
          className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Save
        </button>
      </div>

      {secondary && factor && Number(factor) > 0 && (
        // Spelled out because it is the one part people get backwards, and a
        // wrong factor multiplies every receipt from here on.
        <p className="mt-2 text-[11px] text-text-tertiary">
          Receiving 3 {secondary} will add {3 * Number(factor)} {primary} to stock.
        </p>
      )}
    </div>
  );
}
