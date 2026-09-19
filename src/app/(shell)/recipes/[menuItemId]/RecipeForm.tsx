"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, Input, Panel, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Ingredient = { inventoryItemId: string; qty: number; unitLabel: string };

export function RecipeForm({
  menuItemId,
  recipeId,
  yieldQty,
  ingredients,
  inventoryItems,
}: {
  menuItemId: string;
  recipeId?: string;
  yieldQty: number;
  ingredients: Ingredient[];
  inventoryItems: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Ingredient[]>(
    ingredients.length > 0 ? ingredients : [{ inventoryItemId: inventoryItems[0]?.id ?? "", qty: 1, unitLabel: "g" }],
  );
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function updateRow(i: number, patch: Partial<Ingredient>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function save(yieldQtyValue: number) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(
        "verity.recipe.save_recipe",
        { menuItemId, yieldQty: yieldQtyValue, ingredients: rows.filter((r) => r.inventoryItemId) },
        `/recipes/${menuItemId}`,
      );
      if (result.ok) router.refresh(); else setFailure(result);
    });
  }

  if (inventoryItems.length === 0) {
    return <Panel title="Ingredients"><p className="m-0 text-[13px] text-text-tertiary">No inventory items registered yet — add stock items before defining a recipe.</p></Panel>;
  }

  return (
    <Panel title="Ingredients">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const yieldQtyValue = Number(new FormData(e.currentTarget).get("yieldQty") ?? 1);
          save(yieldQtyValue);
        }}
      >
        <Field label="Yield (servings per batch)" htmlFor="yieldQty">
          <Input id="yieldQty" name="yieldQty" type="number" min={1} defaultValue={yieldQty} />
        </Field>

        {rows.map((row, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_120px_100px_auto] sm:items-end">
            <Field label="Ingredient" htmlFor={`ing-${i}`}>
              <Select id={`ing-${i}`} value={row.inventoryItemId} onChange={(e) => updateRow(i, { inventoryItemId: e.target.value })}>
                {inventoryItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="Qty" htmlFor={`qty-${i}`}>
              <Input id={`qty-${i}`} type="number" step="0.01" min={0.01} value={row.qty} onChange={(e) => updateRow(i, { qty: Number(e.target.value) })} />
            </Field>
            <Field label="Unit" htmlFor={`unit-${i}`}>
              <Input id={`unit-${i}`} value={row.unitLabel} onChange={(e) => updateRow(i, { unitLabel: e.target.value })} placeholder="g, ml, pc" />
            </Field>
            <Button type="button" size="sm" variant="secondary" onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}>
              Remove
            </Button>
          </div>
        ))}

        <div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setRows((prev) => [...prev, { inventoryItemId: inventoryItems[0]?.id ?? "", qty: 1, unitLabel: "g" }])}
          >
            + Add ingredient
          </Button>
        </div>

        {failure && <ErrorState title="Could not save recipe" message={failure.message} issues={failure.issues} retryable={failure.retryable} />}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending || rows.length === 0}>{pending ? "Saving…" : "Save recipe"}</Button>
          {recipeId && (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setFailure(null);
                startTransition(async () => {
                  const result = await runCommand("verity.recipe.set_recipe_active", { recipeId, active: false }, `/recipes/${menuItemId}`);
                  if (result.ok) router.refresh(); else setFailure(result);
                });
              }}
            >
              Deactivate
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
