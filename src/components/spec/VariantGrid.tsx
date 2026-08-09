"use client";

import type { VariantPreview } from "@/server/actions/itemsFromSpec";
import type { RefOption, SpecAnswer } from "@/lib/spec/types";
import type { SpecFieldShape } from "./SpecFieldInput";
import { SpecFieldInput } from "./SpecFieldInput";

type Props = {
  preview: VariantPreview | null;
  loading: boolean;
  /** Row keys the owner unticked, plus every row that already exists. */
  excluded: Set<string>;
  onToggle: (key: string) => void;
  onSetAll: (keys: string[]) => void;
  /** Human name of the field the cap message should point at. */
  narrowLabel?: string | null;
  /**
   * Columns left blank in the form above, offered per row.
   *
   * Ten variants that each need their own CAD file used to mean saving ten
   * items and then editing ten rows in the grid afterwards. Anything answered
   * once at the top is deliberately absent here — it already applies to every
   * row — and so is anything being varied, which is what generated the rows in
   * the first place.
   */
  perRowFields?: SpecFieldShape[];
  /** Row key -> field key -> answer. */
  overrides?: Record<string, Record<string, SpecAnswer>>;
  onOverride?: (rowKey: string, fieldKey: string, answer: SpecAnswer) => void;
  /** Opens the per-variant BOM tweak popup. Absent = no BOM column. */
  onTweakBom?: (rowKey: string) => void;
  /** How many components this row has had tweaked, for the button's badge. */
  bomTweakCount?: (rowKey: string) => number;
  /** Options per field, shared by every row's cell. */
  fieldOptions?: Record<string, RefOption[]>;
  /** Widen a field's options for what was typed in one of its cells. */
  onFieldSearch?: (field: SpecFieldShape, query: string) => void;
};

/**
 * Every combination the current selection describes, one row per SKU.
 *
 * Rows that already exist are shown and unticked rather than hidden: knowing
 * that thirty-eight of forty are new is the reassurance that makes the owner
 * press save.
 */
export function VariantGrid({
  preview,
  loading,
  excluded,
  onToggle,
  onSetAll,
  narrowLabel,
  perRowFields = [],
  overrides = {},
  onOverride,
  onTweakBom,
  bomTweakCount,
  fieldOptions = {},
  onFieldSearch,
}: Props) {
  if (loading) {
    return <p className="text-sm text-text-secondary">Building combinations…</p>;
  }
  if (!preview) return null;

  if (preview.capped) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-text-primary">
        <p className="font-bold">{preview.total.toLocaleString()} combinations is too many to add at once.</p>
        <p className="mt-1 text-text-secondary">
          {narrowLabel
            ? `Narrow ${narrowLabel} and add the rest in a second pass.`
            : "Tick fewer values and add the rest in a second pass."}
        </p>
      </div>
    );
  }

  const rows = preview.rows;
  if (rows.length === 0) {
    return <p className="text-sm text-text-secondary">Tick at least one value on a multi field.</p>;
  }

  // Only offered when there is something to fill: a table of empty columns on a
  // category whose spec is fully answered is noise.
  const perRow = onOverride ? perRowFields : [];

  const selectable = rows.filter((r) => !r.existingName);
  const selectedCount = selectable.filter((r) => !excluded.has(r.key)).length;
  const existingCount = rows.length - selectable.length;
  const allOn = selectedCount === selectable.length && selectable.length > 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-bold text-text-primary">
          {rows.length} combination{rows.length === 1 ? "" : "s"}
        </span>
        <span className="text-text-secondary">
          {selectedCount} will be created
          {existingCount > 0 && ` · ${existingCount} already exist`}
        </span>
        {selectable.length > 0 && (
          <button
            type="button"
            onClick={() => onSetAll(allOn ? selectable.map((r) => r.key) : [])}
            className="ml-auto font-bold text-[var(--brand)]"
          >
            {allOn ? "Untick all" : "Tick all"}
          </button>
        )}
      </div>

      {perRow.length > 0 && (
        <p className="mb-2 text-xs text-text-tertiary">
          {perRow.length === 1 ? "This column was" : "These columns were"} left blank above, so
          {perRow.length === 1 ? " it can" : " they can"} differ per row — fill them in here rather
          than editing every item afterwards.
        </p>
      )}

      <div className="max-h-80 overflow-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          {perRow.length > 0 && (
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-text-tertiary">
                <th className="w-8" />
                <th className="py-2 pr-3 font-medium">Item</th>
                {perRow.map((f) => (
                  <th key={f.id} className="w-44 py-2 pr-3 font-medium">
                    {f.name}
                  </th>
                ))}
                <th className="w-40" />
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row) => {
              const exists = Boolean(row.existingName);
              const on = !exists && !excluded.has(row.key);
              return (
                <tr
                  key={row.key}
                  onClick={() => !exists && onToggle(row.key)}
                  className={`border-b border-border/50 last:border-0 ${
                    exists ? "opacity-50" : "cursor-pointer hover:bg-surface-secondary/40"
                  }`}
                >
                  <td className="w-8 py-1.5 pl-3">
                    <span
                      aria-hidden
                      className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold ${
                        on ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-border"
                      }`}
                    >
                      {on ? "✓" : ""}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-text-primary">
                    {row.name}
                    {perRow.length === 0 && (
                      <span className="ml-2 font-mono text-xs text-text-tertiary">{row.code}</span>
                    )}
                  </td>

                  {/* Clicks inside a cell must not toggle the row: reaching for
                      a dropdown and unticking the row instead is the kind of
                      thing that loses forty answers in one gesture. */}
                  {perRow.map((field) => (
                    <td
                      key={field.id}
                      className="py-1 pr-3 align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {exists ? (
                        <span className="text-xs text-text-tertiary">—</span>
                      ) : (
                        <SpecFieldInput
                          field={field}
                          hideLabel
                          options={fieldOptions[field.key] ?? []}
                          value={overrides[row.key]?.[field.key] ?? {}}
                          onChange={(next) => onOverride?.(row.key, field.key, next)}
                          onSearch={onFieldSearch ? (q) => onFieldSearch(field, q) : undefined}
                        />
                      )}
                    </td>
                  ))}

                  <td className="w-40 py-1.5 pr-3 text-right text-xs text-text-tertiary">
                    {exists ? (
                      "already exists"
                    ) : onTweakBom ? (
                      // One row's recipe at a time: a full grid for forty
                      // variants at once would bury the page.
                      <button
                        type="button"
                        onClick={() => onTweakBom(row.key)}
                        className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-[var(--brand)]/50 hover:text-[var(--brand)]"
                      >
                        BOM
                        {bomTweakCount && bomTweakCount(row.key) > 0 && (
                          <span className="ml-1 font-bold text-[var(--brand)]">
                            ({bomTweakCount(row.key)})
                          </span>
                        )}
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
