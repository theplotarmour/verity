"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/primitives";
import { ITEM_TYPE_LABELS, ITEM_TYPE_ORDER } from "@/lib/item-constants";
import type { BomModeValue, ResolvedBomMode } from "@/lib/master-data/bomMode";
import { updateGroupSettings, deleteItemGroup } from "@/server/actions/itemGroups";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/dialog-service";

/** The word each mode goes by on screen, so the two sentences cannot drift. */
const BOM_MODE_WORD: Record<BomModeValue, string> = {
  OFF: "None",
  RECIPE: "Recipe",
  INGREDIENTS: "Ingredients",
};

/**
 * Kind in plain language.
 *
 * The enum decides which pickers an item turns up in — BOM components,
 * production output, the inventory bucket — so the help text describes the
 * consequence rather than restating the label.
 */
const KIND_HINTS: Record<string, string> = {
  RAW_MATERIAL: "Bought in and consumed. Can go into a recipe.",
  SEMI_FINISHED: "Made here, then used in something else.",
  FINISHED_PRODUCT: "Sold as-is. Comes out of production.",
  CONSUMABLE: "Used up on the floor. Can go into a recipe.",
  PACKAGING: "Boxes, bags, wrap. Can go into a recipe.",
  SPARE_PART: "Bought and resold, or kept for repairs.",
  MACHINERY: "Equipment on the floor, not stock.",
  TOOL: "Dies, jigs, hand tools.",
  ASSET: "Owned and tracked, never sold.",
  SERVICE: "Work bought in, no stock held.",
};

export function CategorySettings({
  group,
}: {
  group: {
    id: string;
    name: string;
    itemType: string;
    isRoot: boolean;
    aliasHidden: boolean;
    /**
     * Built-in sheets — Supplier, Customer, Warehouse, Employee, Design — are
     * backed by their own tables and cannot be deleted, so they are not offered
     * the option rather than being refused after the fact.
     */
    isBuiltIn: boolean;
    /** Off for attribute categories that are never stocked or bought. */
    hasInventoryUnits?: boolean;
    /** Whether items here may appear on a customer order or invoice. */
    isSalable?: boolean;
    /** What this category itself states. Null means it follows its parent. */
    bomMode?: "OFF" | "RECIPE" | "INGREDIENTS" | null;
    /** What that resolves to, and where from — computed against the whole tree. */
    inheritedBomMode?: ResolvedBomMode;
    /**
     * The name of the ancestor the mode actually came from. Not the parent:
     * the mode can come from several levels up, and naming the immediate parent
     * would point the owner at a category that states nothing.
     */
    inheritedFromName?: string | null;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(group.name);
  const [itemType, setItemType] = useState(group.itemType);

  const control =
    "h-9 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]";

  // What the category actually behaves as. Falls back to its own stated value
  // when the caller did not resolve the tree, so a screen that has no group list
  // still shows something truthful rather than nothing.
  const effectiveBomMode = group.inheritedBomMode?.mode ?? group.bomMode ?? "OFF";
  const inheritedFrom = group.inheritedBomMode?.inheritedFromId
    ? group.inheritedFromName
    : null;

  function save(patch: Parameters<typeof updateGroupSettings>[1]) {
    start(async () => {
      const result = await updateGroupSettings(group.id, patch);
      if ("error" in result) toast.error(result.error ?? "Could not save that change");
      else router.refresh();
    });
  }

  return (
    <section className="space-y-4 border-b border-border p-4">
      <h3 className="text-sm font-bold text-text-primary">Category settings</h3>

      <div className="flex flex-wrap items-start gap-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-text-secondary">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() !== group.name && save({ name })}
            className={`${control} w-full max-w-56 sm:w-56`}
          />
        </label>

        {/* Subcategories take their root's Kind at write time, so offering the
            control here would show something that silently does nothing. */}
        {group.isRoot && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Kind</span>
            <div className="w-full max-w-56 sm:w-56">
              <Select
                value={itemType}
                disabled={group.isBuiltIn || pending}
                onChange={(e) => {
                  setItemType(e.target.value);
                  save({ itemType: e.target.value as never });
                }}
              >
                {ITEM_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {ITEM_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <span className="mt-1 block max-w-56 text-[11px] text-text-tertiary">
              {group.isBuiltIn
                ? "System category — production, stock and order booking key off this kind, so it is locked. You can still rename it."
                : KIND_HINTS[itemType]}
            </span>
          </label>
        )}
      </div>

      <p className="max-w-prose text-[11px] text-text-tertiary">
        Kind decides where these items appear elsewhere — which ones a recipe can
        use, and which come out of production. Subcategories follow their category.
      </p>

      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input
          type="checkbox"
          checked={group.aliasHidden}
          onChange={(e) => save({ aliasHidden: e.target.checked })}
          disabled={pending}
        />
        Hide the short-name column on this sheet
      </label>

      {/* Whether this category's items are physical stock. Off for Vehicles,
          Brands, Designs and Colours: they are attributes, so the SKU form drops
          Identity & Units and the BOM component picker skips them. */}
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={group.hasInventoryUnits !== false}
          disabled={pending}
          onChange={(e) => save({ hasInventoryUnits: e.target.checked })}
          className="mt-0.5 rounded accent-[var(--brand)]"
        />
        <span>
          <span className="block text-xs font-medium text-text-secondary">Track inventory &amp; units</span>
          <span className="block text-[11px] text-text-tertiary">
            Off for attributes like vehicles or designs — they are referenced by items, never stocked.
          </span>
        </span>
      </label>

      {/* isSalable has existed on the schema since the baseline and was set by
          the seed, but no screen ever showed it and nothing could change it —
          a stored fact about the factory that the factory could not read. */}
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={group.isSalable === true}
          disabled={pending}
          onChange={(e) => save({ isSalable: e.target.checked })}
          className="mt-0.5 rounded accent-[var(--brand)]"
        />
        <span>
          <span className="block text-xs font-medium text-text-secondary">Can be sold</span>
          <span className="block text-[11px] text-text-tertiary">
            {group.isSalable
              ? "Items here can be put on a customer order or an invoice."
              : "Items here are used internally — they will not be offered when booking an order."}
          </span>
        </span>
      </label>

      {/* What this category's items do about materials. Three genuinely
          different jobs, so a checkbox could not say it: a seat cover is
          assembled from things, a fabric is chosen by things and hands its
          own materials over, a thread is only ever consumed. This was
          previously inferred from three other flags, which meant a factory
          that disagreed had no way to say so. */}
      <div>
        <span className="block text-xs font-medium text-text-secondary">Bill of materials</span>
        <span className="mb-1.5 block text-[11px] text-text-tertiary">
          What items in this category do about their materials.
        </span>
        <div className="flex flex-wrap gap-1.5">
          {/* Inherit is offered first, and only on a child: a root has nothing
              to follow, so the button would be a setting that does nothing.
              It is a real stored state (null), not the absence of a choice —
              which is why a stated None still reads as None and not as this. */}
          {!group.isRoot && (
            <button
              type="button"
              title="Follow whatever the parent category says."
              disabled={pending}
              onClick={() => save({ bomMode: null })}
              className={`min-h-11 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                group.bomMode == null
                  ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                  : "border-border bg-surface text-text-secondary hover:border-[var(--brand)]/50"
              }`}
            >
              Inherit
            </button>
          )}
          {([
            ["OFF", "None", "Bought and consumed — no recipe of its own."],
            ["RECIPE", "Recipe", "Assembled from other items. Each SKU can override the quantities."],
            ["INGREDIENTS", "Ingredients", "Other items pick this one and inherit the materials it names."],
          ] as const).map(([mode, label, hint]) => {
            const on = group.bomMode === mode;
            return (
              <button
                key={mode}
                type="button"
                title={hint}
                disabled={pending}
                onClick={() => save({ bomMode: mode })}
                className={`min-h-11 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  on
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-border bg-surface text-text-secondary hover:border-[var(--brand)]/50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span className="mt-1.5 block text-[11px] text-text-tertiary">
          {group.bomMode == null && effectiveBomMode !== null && (
            <span className="mb-0.5 block text-text-secondary">
              {inheritedFrom
                ? `Following ${inheritedFrom} — currently ${BOM_MODE_WORD[effectiveBomMode]}.`
                : `Nothing above states a mode, so this reads as ${BOM_MODE_WORD.OFF}.`}
            </span>
          )}
          {effectiveBomMode === "RECIPE"
            ? "Items get a Bill of materials editor, and the Add form's BOM button writes per-item overrides."
            : effectiveBomMode === "INGREDIENTS"
              ? "Items get a Contributes editor, and the Add form's BOM button writes contributions."
              : "Items get no BOM editor, and the Add form hides its BOM button."}
        </span>
      </div>

      {/* A category the owner created should be one he can remove. Creating a
          root was already possible from the tab strip; deleting one was not
          possible anywhere, which left every mistake permanent. */}
      {!group.isBuiltIn && (
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            const ok = await confirmDialog({
              title: `Delete "${group.name}"?`,
              description:
                "The category and its columns go. Anything filed inside it — subcategories or records — has to be moved or deleted first, and you will be told which.",
              variant: "danger",
              confirmLabel: "Delete category",
            });
            if (!ok) return;
            start(async () => {
              const result = await deleteItemGroup(group.id);
              if (result && "error" in result && result.error) {
                // The action names what is in the way rather than just refusing.
                toast.error(result.error);
                return;
              }
              toast.success(`"${group.name}" deleted`);
              router.push("/owner/master-data");
              router.refresh();
            });
          }}
          className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
        >
          Delete this category
        </button>
      )}
    </section>
  );
}
