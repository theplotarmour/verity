"use client";

import { useEffect, useState, useTransition } from "react";
import { SpecCombobox } from "./SpecCombobox";
import { listComponentItems } from "@/server/actions/bomTemplates";
import { BomTemplateEditor } from "./BomTemplateEditor";
import {
  listItemBom,
  getItemRecipeTarget,
  setItemBomLine,
  removeItemBomLine,
  clearItemBomOverride,
  rebuildItemBlueprint,
  type ItemBomRow,
} from "@/server/actions/itemBom";
import { toast } from "@/components/ui/toast";

const sourceStyle: Record<ItemBomRow["source"], string> = {
  group: "text-text-tertiary",
  contribution: "text-[var(--brand)]",
  override: "text-amber-600",
};

/**
 * One item's bill of materials, composed from its category recipe, whatever its
 * answers contribute, and its own overrides.
 *
 * Every line says where it came from, because the moment a quantity looks wrong
 * the only question that matters is which layer put it there.
 */
export function ItemBomEditor({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<ItemBomRow[] | null>(null);
  const [components, setComponents] = useState<{ id: string; name: string; defaultUOM: string }[]>([]);
  const [addId, setAddId] = useState<string | null>(null);
  const [addQty, setAddQty] = useState("1");
  const [draft, setDraft] = useState<Record<string, string>>({});
  // The category recipe every item here inherits. Reachable from the lines that
  // say "from <category> recipe", which is where an owner looks when they want
  // to change it for the whole category rather than this one item.
  const [group, setGroup] = useState<{ id: string; name: string } | null>(null);
  const [showRecipe, setShowRecipe] = useState(false);

  const reload = () => listItemBom(itemId).then(setRows);

  useEffect(() => {
    reload();
    getItemRecipeTarget(itemId).then(setGroup);
    listComponentItems().then(setComponents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  function commitQuantity(row: ItemBomRow) {
    const raw = draft[row.componentItemId];
    if (raw === undefined) return;
    const quantity = Number(raw);
    setDraft((d) => {
      const next = { ...d };
      delete next[row.componentItemId];
      return next;
    });
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity === row.quantity) return;

    start(async () => {
      const result = await setItemBomLine({
        itemId,
        componentItemId: row.componentItemId,
        quantity,
        wastePercent: row.wastePercent,
      });
      if ("error" in result && result.error) toast.error(result.error);
      await reload();
    });
  }

  if (rows === null) {
    return <p className="px-3 py-2 text-xs text-text-tertiary">Loading bill of materials…</p>;
  }

  return (
    <div className="rounded-xl border border-border bg-surface-secondary/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          Bill of materials
        </h4>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await rebuildItemBlueprint(itemId);
              if ("error" in result && result.error) toast.error(result.error);
              else toast.success(`Blueprint rebuilt for ${itemName}`);
            })
          }
          title="Push this BOM into the blueprint that production plans against"
          className="text-[11px] font-bold text-[var(--brand)] disabled:opacity-50"
        >
          Rebuild blueprint
        </button>
      </div>

      {rows.length === 0 && (
        <p className="mb-2 text-xs text-text-tertiary">
          No components yet. Add them here, or set up the recipe on the category so every item in it
          inherits the same lines.
        </p>
      )}

      {rows.length > 0 && (
        <table className="mb-2 w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-text-tertiary">
              <th className="py-1 font-medium">Component</th>
              <th className="w-24 py-1 font-medium">Qty</th>
              <th className="w-16 py-1 font-medium">Unit</th>
              <th className="py-1 font-medium">From</th>
              <th className="w-28 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.componentItemId} className="border-t border-border/50">
                <td className="py-1 pr-2 text-text-primary">{row.componentName}</td>
                <td className="py-1 pr-2">
                  <input
                    inputMode="decimal"
                    value={draft[row.componentItemId] ?? String(row.quantity)}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [row.componentItemId]: e.target.value }))
                    }
                    onBlur={() => commitQuantity(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[var(--brand)]"
                  />
                </td>
                <td className="py-1 pr-2 text-xs text-text-tertiary">{row.uom}</td>
                <td className={`py-1 pr-2 text-xs ${sourceStyle[row.source]}`}>{row.sourceLabel}</td>
                <td className="py-1 text-right">
                  {row.source === "override" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await clearItemBomOverride(itemId, row.componentItemId);
                          await reload();
                        })
                      }
                      title="Go back to what this item inherits"
                      className="mr-2 text-[11px] text-text-tertiary hover:underline"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await removeItemBomLine(itemId, row.componentItemId);
                        await reload();
                      })
                    }
                    className="text-[11px] text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {group && (
        <div className="mb-2 border-b border-border/60 pb-2">
          <button
            type="button"
            onClick={() => setShowRecipe((v) => !v)}
            className="text-[11px] font-bold text-text-tertiary transition hover:text-text-primary"
          >
            {showRecipe ? "Hide" : "Edit"} the {group.name} recipe — shared by every {group.name}
            {showRecipe ? " ▲" : " ▼"}
          </button>
          {showRecipe && (
            <div className="mt-2">
              <BomTemplateEditor groupId={group.id} groupName={group.name} />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-[11px] font-medium text-text-secondary">
            Add component to this item only
          </label>
          <SpecCombobox
            options={components.map((c) => ({
              id: c.id,
              label: c.name,
              sublabel: c.defaultUOM,
              searchText: c.name.toLowerCase(),
            }))}
            value={addId}
            onChange={setAddId}
            placeholder="Search raw materials, sub-assemblies, consumables"
          />
        </div>
        <div className="w-24">
          <label className="mb-1 block text-[11px] font-medium text-text-secondary">Qty</label>
          <input
            inputMode="decimal"
            value={addQty}
            onChange={(e) => setAddQty(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--brand)]"
          />
        </div>
        <button
          type="button"
          disabled={pending || !addId}
          onClick={() =>
            start(async () => {
              const result = await setItemBomLine({
                itemId,
                componentItemId: addId!,
                quantity: Number(addQty) || 1,
              });
              if ("error" in result && result.error) toast.error(result.error);
              else {
                setAddId(null);
                setAddQty("1");
                await reload();
              }
            })
          }
          className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
