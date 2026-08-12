"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";

import { Button, Input } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { updateItem, type ItemInput } from "@/server/actions/items";

/**
 * Editing an item's core metadata from its detail page.
 *
 * The page was read-only apart from Delete, so a typo in a name or a missing HSN
 * code meant deleting the item and recreating it — which loses its BOM, its spec
 * answers and any stock history pointing at it.
 *
 * **The whole current item is carried through, not just the edited fields.**
 * `updateItem` takes a complete `ItemInput` and writes every optional field as
 * `input.x?.trim() || null`, so anything omitted is *cleared*: sending only a new
 * name would blank the description, empty the search keywords, drop the secondary
 * UOM and — because `categoryId: input.categoryId || null` — move the item out of
 * its own category. A partial payload against a full-overwrite action is a data
 * loss bug that looks like a successful save.
 */

export interface ItemMetadata {
  id: string;
  name: string;
  sku: string | null;
  itemCode: string | null;
  defaultUOM: string | null;
  secondaryUOM: string | null;
  brand: string | null;
  hsnCode: string | null;
  taxRate: number | null;
  /** Carried through untouched. */
  description: string | null;
  imageUrl: string | null;
  aliasName: string | null;
  searchKeywords: string[];
  categoryId: string | null;
  subcategoryId: string | null;
  status: string | null;
  minStockLevel: number | null;
  conversionFactor: number | null;
}

const FIELD =
  "h-11 w-full rounded-[12px] border border-border bg-background px-3 text-sm text-text-primary outline-none focus:border-[var(--brand)]/60";

export function ItemMetadataForm({ item }: { item: ItemMetadata }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [form, setForm] = useState({
    name: item.name,
    sku: item.sku ?? "",
    defaultUOM: item.defaultUOM ?? "",
    brand: item.brand ?? "",
    hsnCode: item.hsnCode ?? "",
    taxRate: item.taxRate === null || item.taxRate === undefined ? "" : String(item.taxRate),
  });

  function submit() {
    if (!form.name.trim()) {
      toast.error("An item needs a name.");
      return;
    }
    if (!form.defaultUOM.trim()) {
      // Not optional in ItemInput, and an item with no unit cannot be counted.
      toast.error("An item needs a unit of measure.");
      return;
    }

    const taxRate = form.taxRate.trim() === "" ? undefined : Number(form.taxRate);
    if (taxRate !== undefined && (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)) {
      toast.error("Tax rate must be a percentage between 0 and 100.");
      return;
    }

    const payload: ItemInput = {
      id: item.id,

      // Edited here.
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      defaultUOM: form.defaultUOM.trim(),
      brand: form.brand.trim() || undefined,
      hsnCode: form.hsnCode.trim() || undefined,
      taxRate,

      // Carried through unchanged. Omitting any of these would clear it — see
      // the note at the top of this file.
      itemCode: item.itemCode ?? undefined,
      secondaryUOM: item.secondaryUOM ?? undefined,
      conversionFactor: item.conversionFactor,
      categoryId: item.categoryId,
      subcategoryId: item.subcategoryId,
      description: item.description ?? undefined,
      imageUrl: item.imageUrl ?? undefined,
      aliasName: item.aliasName ?? undefined,
      searchKeywords: item.searchKeywords,
      status: item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      minStockLevel: item.minStockLevel ?? undefined,
    };

    start(async () => {
      const result = await updateItem(payload);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Item updated");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Edit details
      </Button>
    );
  }

  return (
    <div className="verity-glass rounded-[18px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <h3 className="font-display text-[14px] font-semibold text-text-primary">Edit details</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="flex h-11 w-11 items-center justify-center rounded-[10px] text-text-tertiary transition hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" required>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
            autoFocus
          />
        </Field>

        <Field label="SKU" hint="Leave blank to keep the item code as the SKU.">
          <Input
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.currentTarget.value })}
          />
        </Field>

        <Field label="Unit of measure" required>
          <Input
            value={form.defaultUOM}
            onChange={(e) => setForm({ ...form, defaultUOM: e.currentTarget.value })}
            placeholder="PCS"
          />
        </Field>

        <Field label="Brand">
          <Input
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.currentTarget.value })}
          />
        </Field>

        <Field label="HSN code" hint="Used on the invoice and the GST return.">
          <Input
            value={form.hsnCode}
            onChange={(e) => setForm({ ...form, hsnCode: e.currentTarget.value })}
            inputMode="numeric"
          />
        </Field>

        <Field label="Tax rate %">
          <Input
            value={form.taxRate}
            onChange={(e) => setForm({ ...form, taxRate: e.currentTarget.value })}
            inputMode="decimal"
            placeholder="18"
          />
        </Field>
      </div>

      <p className="mt-3 text-[11px] text-text-tertiary">
        The item code, category, spec answers and BOM are unchanged by this form. The category is
        set in the studio, because moving an item between categories changes what it is.
      </p>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending || !form.name.trim()}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-text-secondary">
        {label}
        {required ? <span className="ml-0.5 text-[var(--brand)]">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] text-text-tertiary">{hint}</span> : null}
    </label>
  );
}
