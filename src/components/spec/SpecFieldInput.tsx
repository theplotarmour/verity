"use client";

import { useEffect, useState } from "react";
import { SpecCombobox } from "./SpecCombobox";
import { SpecSelect } from "./SpecSelect";
import { SpecFileInput } from "./SpecFileInput";
import { fetchFieldValueSuggestions } from "@/server/actions/spec";
import type { RefOption, SpecAnswer } from "@/lib/spec/types";

export type { SpecAnswer };

/** The client-safe shape of a resolved spec field, as returned by fetchResolvedFields. */
export type SpecFieldShape = {
  id: string;
  /** Which group defines this field — own columns differ from inherited ones. */
  groupId: string;
  key: string;
  name: string;
  kind: "VALUE" | "OPTION" | "REFERENCE";
  valueType: string | null;
  unitSuffix: string | null;
  refTarget: string | null;
  targetGroupId: string | null;
  /** REFERENCE only. Which column of the target this picks from, if any. */
  targetFieldId: string | null;
  isRequired: boolean;
  dependsOnFieldId: string | null;
  options: { id: string; label: string; shortCode: string | null }[];
};

type Props = {
  field: SpecFieldShape;
  /** REFERENCE only, loaded by the parent. */
  options?: RefOption[];
  value: SpecAnswer;
  onChange: (next: SpecAnswer) => void;
  onCreate?: (query: string) => void;
  /**
   * Ids ticked on this field. Present for OPTION and REFERENCE fields, which
   * can hold several values — ticking a second one is what turns a single item
   * into a set of variants, so it needs no separate mode switch.
   */
  selectedIds?: string[];
  onSelectIds?: (ids: string[]) => void;
  disabled?: boolean;
  disabledReason?: string;
  /** Focus this field on mount, so the form is keyboard-ready without a click. */
  autoFocus?: boolean;
  /** When the caller renders its own label (e.g. a "3 — varies" badge). */
  hideLabel?: boolean;
  /**
   * Fetch more options for what has been typed. Only reference fields have a
   * list large enough to need it; an option field's choices are all present.
   */
  onSearch?: (query: string) => void;
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function SpecFieldInput({
  field,
  options = [],
  value,
  onChange,
  onCreate,
  selectedIds,
  onSelectIds,
  disabled,
  disabledReason,
  autoFocus,
  hideLabel = false,
  onSearch,
}: Props) {
  // Past values for this field, so a plain input still behaves like a picker.
  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    if (field.kind !== "VALUE") return;
    let cancelled = false;
    fetchFieldValueSuggestions(field.id).then((v) => {
      if (!cancelled) setSuggestions(v);
    });
    return () => {
      cancelled = true;
    };
  }, [field.id, field.kind]);

  const label = hideLabel ? null : (
    <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
      {field.name}
      {field.isRequired && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );

  if (field.kind === "REFERENCE") {
    // Item references carry a real foreign key; attribute masters (vehicle,
    // design, colour) are stored as a plain id.
    const isItemRef = field.refTarget === "ITEM_GROUP";
    if (onSelectIds) {
      return (
        <div>
          {label}
          <SpecSelect
            multi
            options={options}
            selected={selectedIds ?? []}
            onChange={onSelectIds}
            onCreate={onCreate}
            placeholder={`Select ${field.name.toLowerCase()}`}
            disabled={disabled}
            disabledReason={disabledReason}
            autoFocus={autoFocus}
            onSearch={onSearch}
          />
        </div>
      );
    }
    return (
      <div>
        {label}
        <SpecCombobox
          options={options}
          onSearch={onSearch}
          value={value.optionId ?? value.valueItemId ?? value.valueRefId ?? null}
          onChange={(id) => {
            if (!id) return onChange(isItemRef ? { valueItemId: null } : { valueRefId: null });
            // A column-picking reference (Brand -> the Brand column) offers
            // options, not items or attribute ids, so the picked id must go in the
            // optionId slot. Filing it as valueItemId made the server try to load a
            // nonexistent item and drop it from the composed name. The option's own
            // kind says which slot it belongs in.
            const picked = options.find((o) => o.id === id);
            if (picked?.kind === "option") return onChange({ optionId: id });
            if (picked?.kind === "item") return onChange({ valueItemId: id });
            return onChange(isItemRef ? { valueItemId: id } : { valueRefId: id });
          }}
          onCreate={onCreate}
          placeholder={`Select ${field.name.toLowerCase()}`}
          disabled={disabled}
          disabledReason={disabledReason}
          autoFocus={autoFocus}
        />
      </div>
    );
  }

  if (field.kind === "OPTION") {
    const optionRows = field.options.map((o) => ({
      id: o.id,
      label: o.label,
      sublabel: o.shortCode,
      searchText: [o.label, o.shortCode].filter(Boolean).join(" ").toLowerCase(),
    }));
    if (onSelectIds) {
      return (
        <div>
          {label}
          <SpecSelect
            multi
            options={optionRows}
            selected={selectedIds ?? []}
            onChange={onSelectIds}
            onCreate={onCreate}
            placeholder={`Select ${field.name.toLowerCase()}`}
            disabled={disabled}
            disabledReason={disabledReason}
            autoFocus={autoFocus}
          />
        </div>
      );
    }
    // A combobox rather than a native select: on a factory floor, typing "dou"
    // to reach "Double Back" beats scrolling, and it keeps every dropdown in
    // Verity behaving the same way.
    return (
      <div>
        {label}
        <SpecCombobox
          options={field.options.map((o) => ({
            id: o.id,
            label: o.label,
            sublabel: o.shortCode,
            searchText: [o.label, o.shortCode].filter(Boolean).join(" ").toLowerCase(),
          }))}
          value={value.optionId ?? null}
          onChange={(id) => onChange({ optionId: id })}
          onCreate={onCreate}
          placeholder={`Select ${field.name.toLowerCase()}`}
          disabled={disabled}
          disabledReason={disabledReason}
          autoFocus={autoFocus}
        />
      </div>
    );
  }

  if (field.valueType === "IMAGE" || field.valueType === "FILE") {
    return (
      <div>
        {label}
        <SpecFileInput
          kind={field.valueType}
          fieldKey={field.key}
          value={value.valueText ?? null}
          onChange={(url) => onChange({ valueText: url })}
          disabled={disabled}
        />
      </div>
    );
  }

  if (field.valueType === "DATE") {
    return (
      <div>
        {label}
        <input
          type="date"
          disabled={disabled}
          value={value.valueText ?? ""}
          onChange={(e) => onChange({ valueText: e.target.value || null })}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:ring-1 focus:ring-[var(--brand)] disabled:bg-surface-secondary/40"
        />
      </div>
    );
  }

  if (field.valueType === "COLOR") {
    const hex = value.valueText ?? "";
    return (
      <div>
        {label}
        <div className="flex items-center gap-2">
          {/* The swatch and the hex stay in step, because a colour is easier to
              confirm by eye and easier to paste by code. */}
          <input
            type="color"
            disabled={disabled}
            value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000"}
            onChange={(e) => onChange({ valueText: e.target.value })}
            className="h-[42px] w-12 shrink-0 cursor-pointer rounded-xl border border-border bg-surface p-1"
          />
          <input
            disabled={disabled}
            value={hex}
            placeholder="#RRGGBB"
            onChange={(e) => onChange({ valueText: e.target.value || null })}
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]"
          />
        </div>
      </div>
    );
  }

  if (field.valueType === "TEXTAREA") {
    return (
      <div>
        {label}
        <textarea
          disabled={disabled}
          rows={3}
          value={value.valueText ?? ""}
          onChange={(e) => onChange({ valueText: e.target.value })}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:ring-1 focus:ring-[var(--brand)] disabled:bg-surface-secondary/40"
        />
      </div>
    );
  }

  if (field.valueType === "TOGGLE" || field.valueType === "CHECKBOX") {
    return (
      <div>
        {label}
        <input
          type="checkbox"
          checked={Boolean(value.valueBool)}
          disabled={disabled}
          onChange={(e) => onChange({ valueBool: e.target.checked })}
          className="h-5 w-5 rounded border-neutral-300"
        />
      </div>
    );
  }

  // Value fields are comboboxes too, in free-text mode: the list offers what the
  // factory has entered before for this field, and anything new is accepted as
  // typed. Same interaction everywhere, no "add" step.
  const numeric = field.valueType === "NUMBER" || field.valueType === "MEASUREMENT";
  const raw = numeric
    ? value.valueNumber === null || value.valueNumber === undefined
      ? ""
      : String(value.valueNumber)
    : value.valueText ?? "";

  return (
    <div>
      {label}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SpecCombobox
            freeText
            inputMode={numeric ? "decimal" : "text"}
            options={suggestions.map((sv) => ({
              id: sv,
              label: sv,
              sublabel: null,
              searchText: sv.toLowerCase(),
            }))}
            value={raw}
            onChange={(next) => {
              const text = next ?? "";
              if (!numeric) return onChange({ valueText: text });
              const n = Number(text);
              onChange({ valueNumber: text === "" || Number.isNaN(n) ? null : n });
            }}
            placeholder={field.unitSuffix ? `0 ${field.unitSuffix}` : field.name}
            disabled={disabled}
            disabledReason={disabledReason}
            autoFocus={autoFocus}
          />
        </div>
        {field.unitSuffix && (
          <span className="shrink-0 text-xs text-text-tertiary">{field.unitSuffix}</span>
        )}
      </div>
    </div>
  );
}
