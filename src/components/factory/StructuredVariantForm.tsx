"use client";

import { useEffect, useMemo, useState } from "react";
import { SpecFieldInput, type SpecFieldShape } from "@/components/spec/SpecFieldInput";
import { SpecCombobox } from "@/components/spec/SpecCombobox";
import { fetchResolvedFields, fetchReferenceOptions } from "@/server/actions/spec";
import { listProductCategories } from "@/server/actions/itemSearch";
import { listItemGroups } from "@/server/actions/itemGroups";
import { SYSTEM_LINK_TARGETS } from "@/lib/spec/link-targets";
import type { RefOption, SpecAnswer } from "@/lib/spec/types";

/**
 * Which panel a field belongs in — the name of whatever it points at.
 *
 * This used to match refTarget against hardcoded lists of vehicle and finish
 * targets, so a "Vehicle" heading appeared because the code said so. Now it
 * appears because the owner named a category Vehicle, and a factory selling
 * something else gets its own headings on the day it creates them.
 *
 * Fields that hold a value rather than a link have nothing to be grouped by, so
 * they share one panel at the end.
 */
const VALUE_PANEL = "Specs";

function panelOf(field: SpecFieldShape, groupNames: Map<string, string>): string {
  if (field.kind !== "REFERENCE") return VALUE_PANEL;
  if (field.targetGroupId) return groupNames.get(field.targetGroupId) ?? VALUE_PANEL;
  // A built-in list has no category behind it; its own label is the heading.
  const system = SYSTEM_LINK_TARGETS.find((s) => s.refTarget === field.refTarget);
  return system?.label ?? VALUE_PANEL;
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-2/30 p-3">
      <div className="mb-2 flex items-baseline gap-2">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
          {title}
        </h4>
        {hint && <span className="text-[10px] text-text-tertiary">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export type StructuredValue = {
  groupId: string | null;
  /** One tick per field is an answer; two or more is a variant axis. */
  picked: Record<string, string[]>;
  fields: SpecFieldShape[];
};

/**
 * A product picker, then one panel per thing that product's blueprint links to.
 *
 * Replaces a staged walk that asked eight questions in a fixed order and could
 * only ever describe a seat cover. Both the panels and their contents come from
 * the category's own spec fields, so a factory selling something else gets a
 * form that fits it without a line of code changing.
 */
export function StructuredVariantForm({
  value,
  onChange,
  disabled,
}: {
  value: StructuredValue;
  onChange: (next: StructuredValue) => void;
  disabled?: boolean;
}) {
  const [categories, setCategories] = useState<{ id: string; name: string; parentName: string | null }[]>([]);
  const [options, setOptions] = useState<Record<string, RefOption[]>>({});
  // Panel headings are the owner's own category names, so the whole tree is
  // needed — not just the product categories the picker above offers.
  const [groupNames, setGroupNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    listProductCategories().then(setCategories);
    listItemGroups().then((gs) => setGroupNames(new Map(gs.map((g) => [g.id, g.name]))));
  }, []);

  // Fields follow the category, so switching product reshapes every panel below.
  useEffect(() => {
    if (!value.groupId) {
      if (value.fields.length) onChange({ ...value, fields: [], picked: {} });
      return;
    }
    let cancelled = false;
    fetchResolvedFields(value.groupId).then((f) => {
      if (!cancelled) onChange({ ...value, fields: f as SpecFieldShape[], picked: {} });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.groupId]);

  useEffect(() => {
    let cancelled = false;
    for (const field of value.fields) {
      if (field.kind !== "REFERENCE") continue;
      const parent = value.fields.find((f) => f.id === field.dependsOnFieldId);
      const parentPicked = parent ? value.picked[parent.key] ?? [] : [];
      // A parent narrowed to one value filters its children; one still holding
      // several cannot, so the child stays unfiltered rather than empty.
      const parentValue = parentPicked.length === 1 ? parentPicked[0] : undefined;
      if (field.dependsOnFieldId && !parentValue) {
        setOptions((o) => ({ ...o, [field.key]: [] }));
        continue;
      }
      fetchReferenceOptions(field.id, parentValue).then((opts) => {
        if (!cancelled) setOptions((o) => ({ ...o, [field.key]: opts }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [value.fields, value.picked]);

  // One panel per thing the fields point at, in the order the blueprint lists
  // them, with the value fields last. No fixed set of headings.
  const panels = useMemo(() => {
    const out = new Map<string, SpecFieldShape[]>();
    for (const f of value.fields) {
      const key = panelOf(f, groupNames);
      const list = out.get(key);
      if (list) list.push(f);
      else out.set(key, [f]);
    }
    // Values sit below the links they qualify, wherever they were declared.
    const values = out.get(VALUE_PANEL);
    if (values) {
      out.delete(VALUE_PANEL);
      out.set(VALUE_PANEL, values);
    }
    return [...out.entries()];
  }, [value.fields, groupNames]);

  const variantCount = Object.values(value.picked)
    .filter((ids) => ids.length > 0)
    .reduce((n, ids) => n * ids.length, 1);

  const renderFields = (fields: SpecFieldShape[]) => {
    if (fields.length === 0) {
      return <p className="text-[11px] text-text-tertiary">Nothing to fill in here.</p>;
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => {
          const parent = value.fields.find((f) => f.id === field.dependsOnFieldId);
          const blocked =
            Boolean(field.dependsOnFieldId && parent && (value.picked[parent.key] ?? []).length === 0) ||
            disabled;
          const ids = value.picked[field.key] ?? [];
          const selectable = field.kind === "OPTION" || field.kind === "REFERENCE";

          return (
            <div key={field.id}>
              {selectable ? (
                <>
                  <label className="mb-1 block text-[11px] font-medium text-text-secondary">
                    {field.name}
                    {field.isRequired && <span className="ml-0.5 text-red-500">*</span>}
                    {ids.length > 1 && (
                      <span className="ml-1 font-bold text-[var(--brand)]">{ids.length} — varies</span>
                    )}
                  </label>
                  <SpecFieldInput
                    field={field}
                    options={options[field.key] ?? []}
                    value={{}}
                    selectedIds={ids}
                    onSelectIds={(next) =>
                      onChange({ ...value, picked: { ...value.picked, [field.key]: next } })
                    }
                    disabled={blocked}
                    disabledReason={parent ? `Choose ${parent.name} first` : undefined}
                    onChange={() => {}}
                    hideLabel
                  />
                </>
              ) : (
                <SpecFieldInput
                  field={field}
                  options={options[field.key] ?? []}
                  value={{ valueText: value.picked[field.key]?.[0] ?? null }}
                  disabled={blocked}
                  onChange={(next) => {
                    const raw =
                      next.valueText ??
                      (next.valueNumber !== null && next.valueNumber !== undefined
                        ? String(next.valueNumber)
                        : "");
                    onChange({
                      ...value,
                      picked: { ...value.picked, [field.key]: raw ? [raw] : [] },
                    });
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <Panel title="Product" hint="what kind of thing is being made">
        <div className="max-w-xs">
          <SpecCombobox
            options={categories.map((c) => ({
              id: c.id,
              label: c.name,
              sublabel: c.parentName,
              searchText: `${c.name} ${c.parentName ?? ""}`.toLowerCase(),
            }))}
            value={value.groupId}
            onChange={(id) => onChange({ ...value, groupId: id })}
            placeholder="Select a category"
            disabled={disabled}
          />
        </div>
      </Panel>

      {value.groupId &&
        panels.map(([title, fields]) => (
          <Panel
            key={title}
            title={title}
            hint={
              title === VALUE_PANEL
                ? "from this category's own fields"
                : variantCount > 1
                  ? `tick several to build ${variantCount} variants`
                  : "tick several to build variants"
            }
          >
            {renderFields(fields)}
          </Panel>
        ))}
    </div>
  );
}
