"use client";

import { useEffect, useState, useTransition } from "react";
import { Select } from "@/components/ui/primitives";
import { useRouter } from "next/navigation";
import {
  listBomTemplateLines,
  listComponentItems,
  listItemReferenceFields,
  addBomTemplateLine,
  removeBomTemplateLine,
  listAvailableQuantityFields,
  type BomTemplateRow,
  type QuantityFieldOption,
} from "@/server/actions/bomTemplates";

const control =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

/**
 * The recipe for everything in this group.
 *
 * A line is either a fixed component (every seat cover uses one thread cone) or
 * the item answered in a reference field (whichever fabric was chosen). That
 * second kind is what makes filling the spec produce the bill of materials.
 */
export function BomTemplateEditor({ groupId, groupName }: { groupId: string; groupName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lines, setLines] = useState<BomTemplateRow[]>([]);
  const [items, setItems] = useState<{ id: string; name: string; defaultUOM: string }[]>([]);
  const [fields, setFields] = useState<{ id: string; name: string }[]>([]);
  const [quantityFields, setQuantityFields] = useState<QuantityFieldOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState<"item" | "field">("item");
  const [itemId, setItemId] = useState("");
  const [sourceFieldId, setSourceFieldId] = useState("");
  const [qtySource, setQtySource] = useState<"fixed" | "dynamic">("fixed");
  const [quantity, setQuantity] = useState("1");
  const [selectedQtyFieldKey, setSelectedQtyFieldKey] = useState("");
  const [waste, setWaste] = useState("0");

  const reload = () => listBomTemplateLines(groupId).then(setLines);

  useEffect(() => {
    reload();
    listComponentItems().then(setItems);
    listItemReferenceFields(groupId).then(setFields);
    listAvailableQuantityFields(groupId).then(setQuantityFields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  function add() {
    setError(null);
    start(async () => {
      let quantityFromFieldId: string | null = null;
      let quantityViaFieldId: string | null = null;

      if (qtySource === "dynamic" && selectedQtyFieldKey) {
        const [fieldId, viaFieldId] = selectedQtyFieldKey.split(":");
        quantityFromFieldId = fieldId;
        quantityViaFieldId = viaFieldId || null;
      }

      const result = await addBomTemplateLine({
        groupId,
        itemId: source === "item" ? itemId : null,
        sourceFieldId: source === "field" ? sourceFieldId : null,
        quantity: qtySource === "fixed" ? (Number(quantity) || 1) : 1,
        quantityFromFieldId,
        quantityViaFieldId,
        wastePercent: Number(waste) || 0,
      });
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setItemId("");
      setSourceFieldId("");
      setQuantity("1");
      setWaste("0");
      setQtySource("fixed");
      setSelectedQtyFieldKey("");
      await reload();
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 border-b border-neutral-200 p-4 dark:border-neutral-800">
      <div>
        <h3 className="text-sm font-semibold">Bill of materials for {groupName}</h3>
        <p className="text-xs text-neutral-500">
          Applies to every item in this group. Filling the spec fills these lines in.
        </p>
      </div>

      <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
        {lines.map((l) => (
          <li key={l.id} className="flex items-center justify-between px-3 py-2">
            <span>
              {l.itemName ? (
                <span className="font-medium">{l.itemName}</span>
              ) : (
                <span className="font-medium text-blue-700 dark:text-blue-400">
                  ↳ whichever {l.sourceFieldName} is chosen
                </span>
              )}
              {l.quantityFromFieldName ? (
                <span className="ml-3 text-neutral-600 dark:text-neutral-400">
                  qty from {l.quantityFromFieldName}
                  {l.quantityViaFieldName ? ` (via ${l.quantityViaFieldName})` : ""}
                </span>
              ) : (
                <span className="ml-3 text-neutral-600 dark:text-neutral-400">
                  qty {l.quantity}
                </span>
              )}
              {l.wastePercent > 0 && (
                <span className="ml-3 text-neutral-500">{l.wastePercent}% waste</span>
              )}
            </span>
            <button
              onClick={() => start(async () => { await removeBomTemplateLine(l.id); await reload(); router.refresh(); })}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
        {lines.length === 0 && (
          <li className="px-3 py-4 text-sm text-neutral-500">
            No BOM lines yet. Items in this group will show an empty bill of materials.
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
        <Select value={source} onChange={(e) => setSource(e.target.value as never)} className={control}>
          <option value="item">Fixed component</option>
          <option value="field">From a field</option>
        </Select>

        {source === "item" ? (
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)} className={control}>
            <option value="">Choose component…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.defaultUOM})
              </option>
            ))}
          </Select>
        ) : (
          <Select
            value={sourceFieldId}
            onChange={(e) => setSourceFieldId(e.target.value)}
            className={control}
          >
            <option value="">Choose field…</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
            {fields.length === 0 && <option disabled>No item-reference fields on this group</option>}
          </Select>
        )}

        <div>
          <label className="mb-1 block text-xs text-neutral-600">Quantity Type</label>
          <Select
            value={qtySource}
            onChange={(e) => setQtySource(e.target.value as any)}
            className={control}
          >
            <option value="fixed">Fixed quantity</option>
            <option value="dynamic">From a field</option>
          </Select>
        </div>

        {qtySource === "fixed" ? (
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Quantity</label>
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`${control} w-24`}
            />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs text-neutral-600">Quantity Field</label>
            <Select
              value={selectedQtyFieldKey}
              onChange={(e) => setSelectedQtyFieldKey(e.target.value)}
              className={control}
            >
              <option value="">Choose numeric field…</option>
              {quantityFields.map((f) => {
                const key = f.viaFieldId ? `${f.id}:${f.viaFieldId}` : f.id;
                return (
                  <option key={key} value={key}>
                    {f.name}
                  </option>
                );
              })}
              {quantityFields.length === 0 && (
                <option disabled>No numeric fields found</option>
              )}
            </Select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-neutral-600">Waste %</label>
          <input
            type="number"
            step="any"
            value={waste}
            onChange={(e) => setWaste(e.target.value)}
            className={`${control} w-20`}
          />
        </div>

        <button
          onClick={add}
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          Add line
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
