"use client";

import { useEffect, useState, useTransition } from "react";
import { SpecCombobox } from "./SpecCombobox";
import { listComponentItems, listAllItemReferenceFields } from "@/server/actions/bomTemplates";
import {
  listContributions,
  addContribution,
  removeContribution,
  countItemsUsingOwner,
  type ContributionOwner,
  type ContributionRow,
} from "@/server/actions/bomContributions";
import { toast } from "@/components/ui/toast";

/**
 * Components an owner attaches to a *value* rather than to a category.
 *
 * "ERGO FIT Vertex needs 1.5 m of piping" is entered once here, and applies to
 * every finished good that answers that design — which is why it lives on the
 * value and not as a line repeated in each category's recipe.
 */
export function ContributionEditor({
  owner,
  ownerLabel,
}: {
  owner: ContributionOwner;
  ownerLabel: string;
}) {
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<ContributionRow[] | null>(null);
  const [components, setComponents] = useState<{ id: string; name: string; defaultUOM: string }[]>([]);
  const [usedBy, setUsedBy] = useState<number | null>(null);
  const [componentId, setComponentId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  // A contribution can name a fixed component, or the field whose answer
  // supplies it — "whatever fabric this item was given", filled per item.
  const [source, setSource] = useState<"item" | "field">("item");
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [refFields, setRefFields] = useState<
    { id: string; name: string; key: string; groupName: string }[]
  >([]);
  // Quantity from the answered design rather than a fixed number, so changing a
  // design's consumption moves every BOM that uses it.
  const [fromConsumption, setFromConsumption] = useState(false);

  const reload = () => listContributions(owner).then(setRows);

  useEffect(() => {
    reload();
    listComponentItems().then(setComponents);
    listAllItemReferenceFields().then(setRefFields);
    countItemsUsingOwner(owner).then(setUsedBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner.kind, owner.id]);

  if (rows === null) return <p className="text-[11px] text-text-tertiary">Loading…</p>;

  return (
    <div className="rounded-md border border-border bg-surface p-2">
      <p className="mb-2 text-[11px] text-text-tertiary">
        Components that come with <span className="font-bold text-text-secondary">{ownerLabel}</span>
        {usedBy !== null && usedBy > 0 && (
          <> — changing these affects {usedBy} item{usedBy === 1 ? "" : "s"} already using it</>
        )}
        .
      </p>

      {rows.length > 0 && (
        <ul className="mb-2 space-y-0.5 text-xs">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <span className="text-text-primary">
                {r.componentName ?? `whatever answers ${r.sourceFieldName ?? "a field"}`} ×{" "}
                {r.quantityFrom === "design.fabricConsumption"
                  ? "design consumption"
                  : r.quantity}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await removeContribution(r.id);
                    await reload();
                  })
                }
                className="text-[11px] text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {(["item", "field"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`rounded-lg px-2 py-1 font-bold transition ${
                source === s
                  ? "bg-brand-soft text-[var(--brand)]"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              {s === "item" ? "A fixed component" : "Whatever answers a field"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            {source === "item" ? (
              <SpecCombobox
                options={components.map((c) => ({
                  id: c.id,
                  label: c.name,
                  sublabel: c.defaultUOM,
                  searchText: c.name.toLowerCase(),
                }))}
                value={componentId}
                onChange={setComponentId}
                placeholder="Component this brings"
              />
            ) : (
              <SpecCombobox
                options={refFields.map((f) => ({
                  id: f.id,
                  label: f.name,
                  sublabel: f.groupName,
                  searchText: `${f.name} ${f.key} ${f.groupName}`.toLowerCase(),
                }))}
                value={fieldId}
                onChange={setFieldId}
                placeholder="Field whose answer supplies it"
              />
            )}
          </div>
          <input
            inputMode="decimal"
            value={quantity}
            disabled={fromConsumption}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--brand)] disabled:bg-surface-secondary/40 disabled:text-text-tertiary"
          />
          <button
            type="button"
            disabled={pending || (source === "item" ? !componentId : !fieldId)}
            onClick={() =>
              start(async () => {
                const result = await addContribution({
                  owner,
                  componentItemId: source === "item" ? componentId : null,
                  sourceFieldId: source === "field" ? fieldId : null,
                  quantity: Number(quantity) || 1,
                  quantityFrom: fromConsumption ? "design.fabricConsumption" : null,
                });
                if ("error" in result && result.error) toast.error(result.error);
                else {
                  setComponentId(null);
                  setFieldId(null);
                  setQuantity("1");
                  setFromConsumption(false);
                  await reload();
                }
              })
            }
            className="rounded-xl bg-[var(--brand)] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Attach
          </button>
        </div>

        <label className="flex items-center gap-2 text-[11px] text-text-secondary">
          <input
            type="checkbox"
            checked={fromConsumption}
            onChange={(e) => setFromConsumption(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border"
          />
          Take the quantity from the design&rsquo;s fabric consumption instead
        </label>
      </div>
    </div>
  );
}
