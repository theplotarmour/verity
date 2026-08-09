"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Select } from "@/components/ui/primitives";
import { useRouter } from "next/navigation";
import {
  createSpecField,
  addSpecFieldOption,
  removeSpecFieldOption,
} from "@/server/actions/specFields";
import { fetchResolvedFields } from "@/server/actions/spec";
import type { SpecFieldShape } from "./SpecFieldInput";
import { ContributionEditor } from "./ContributionEditor";
import { SpecCombobox } from "./SpecCombobox";
import { COLUMN_TYPES } from "@/lib/spec/columns";
import { buildLinkTargets } from "@/lib/spec/link-targets";

type Group = { id: string; name: string; nameTemplate: string | null; codeTemplate: string | null };

/** Enough of a group to place it in the tree and know what its rows are. */
export type LinkableGroup = {
  id: string;
  name: string;
  parentId: string | null;
};

const control =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

/**
 * Adding a column, and editing the choices on one that offers a list.
 *
 * The columns themselves are shown and edited by ColumnStrip, which renders
 * them as the grid header they produce. This is the part that has no place in
 * a header row: a form for a column that does not exist yet, and the option
 * list behind one that does.
 */
export function SpecFieldEditor({
  group,
  fields,
  allGroups,
}: {
  group: Group;
  fields: SpecFieldShape[];
  allGroups: LinkableGroup[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  // One plain-language choice, not the stored kind/valueType pair.
  const [typeId, setTypeId] = useState("TEXT");
  const [unitSuffix, setUnitSuffix] = useState("");
  // One choice, not the stored refTarget/targetGroupId pair.
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null);
  const linkTargets = useMemo(() => buildLinkTargets(allGroups), [allGroups]);
  const linkTarget = linkTargets.find((t) => t.id === linkTargetId) ?? null;
  const [dependsOnFieldId, setDependsOnFieldId] = useState("");

  /**
   * Which column of the target this picks from, empty for the record itself.
   *
   * The target's columns have to come from the server: they belong to another
   * category, and Configure is only ever handed this one's.
   */
  const [targetFieldId, setTargetFieldId] = useState("");
  const [targetColumns, setTargetColumns] = useState<SpecFieldShape[]>([]);
  useEffect(() => {
    setTargetFieldId("");
    setTargetColumns([]);
    if (!linkTarget?.targetGroupId || !linkTarget.hasColumns) return;
    let live = true;
    fetchResolvedFields(linkTarget.targetGroupId)
      .then((cols) => {
        if (live) setTargetColumns(cols as SpecFieldShape[]);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [linkTarget?.targetGroupId, linkTarget?.hasColumns]);

  const [optionFor, setOptionFor] = useState<string | null>(null);
  const [bomFor, setBomFor] = useState<string | null>(null);
  const [optionLabel, setOptionLabel] = useState("");
  const [optionCode, setOptionCode] = useState("");

  const optionFields = fields.filter((f) => f.kind === "OPTION");

  function add() {
    if (!name.trim()) return;
    const choice = COLUMN_TYPES.find((t) => t.id === typeId)!;
    // A link with nowhere to point renders an empty picker and reads as broken,
    // so it is caught here rather than discovered in the Add form.
    if (choice.kind === "REFERENCE" && !linkTarget) {
      setError("Choose what this column links to.");
      return;
    }
    setError(null);
    start(async () => {
      const result = await createSpecField({
        groupId: group.id,
        name,
        kind: choice.kind,
        valueType: choice.valueType as never,
        unitSuffix: choice.id === "MEASUREMENT" ? unitSuffix || null : null,
        refTarget: (linkTarget && choice.kind === "REFERENCE"
          ? linkTarget.refTarget
          : null) as never,
        targetGroupId:
          linkTarget && choice.kind === "REFERENCE" ? linkTarget.targetGroupId : null,
        targetFieldId:
          linkTarget && choice.kind === "REFERENCE" ? targetFieldId || null : null,
        dependsOnFieldId: dependsOnFieldId || null,
      });
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setName("");
      setUnitSuffix("");
      setLinkTargetId(null);
      router.refresh();
    });
  }

  function addOption(fieldId: string) {
    if (!optionLabel.trim()) return;
    start(async () => {
      await addSpecFieldOption(fieldId, {
        value: optionLabel.trim(),
        label: optionLabel.trim(),
        shortCode: optionCode.trim() || null,
      });
      setOptionLabel("");
      setOptionCode("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 overflow-auto p-4">
      {/* Only the columns that offer a list appear here — the rest have nothing
          to configure beyond what the strip above already shows. */}
      {optionFields.length > 0 && <section>
        <h3 className="mb-2 text-sm font-semibold">Choices</h3>
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {optionFields.map((f) => (
            <li key={f.id} className="px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 font-medium">{f.name}</span>
                <button
                  onClick={() => setOptionFor(optionFor === f.id ? null : f.id)}
                  className="shrink-0 text-xs text-neutral-500 hover:underline"
                >
                  {f.options.length} option{f.options.length === 1 ? "" : "s"}
                </button>
              </div>

              {optionFor === f.id && (
                <div className="mt-2 space-y-2 rounded-md bg-neutral-50 p-2 dark:bg-neutral-900">
                  <ul className="text-xs text-neutral-600 dark:text-neutral-400">
                    {f.options.map((o) => (
                      <li key={o.id} className="py-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {o.label}
                            {o.shortCode && <code className="ml-2">{o.shortCode}</code>}
                          </span>
                          <span className="flex items-center gap-2">
                            {/* Choosing this value can bring components with it —
                                entered once here rather than per category. */}
                            <button
                              onClick={() => setBomFor((id) => (id === o.id ? null : o.id))}
                              className="text-[11px] text-neutral-500 hover:underline"
                            >
                              BOM
                            </button>
                            <button
                              onClick={() =>
                                start(async () => {
                                  const r = await removeSpecFieldOption(o.id);
                                  if (r && "error" in r) setError(r.error);
                                  else router.refresh();
                                })
                              }
                              className="text-[11px] text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </span>
                        </div>
                        {bomFor === o.id && (
                          <div className="mt-1">
                            <ContributionEditor
                              owner={{ kind: "OPTION", id: o.id }}
                              ownerLabel={o.label}
                            />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input
                      value={optionLabel}
                      onChange={(e) => setOptionLabel(e.target.value)}
                      placeholder="Double Back"
                      className={control}
                    />
                    <input
                      value={optionCode}
                      onChange={(e) => setOptionCode(e.target.value)}
                      placeholder="DB"
                      className={`${control} w-24`}
                    />
                    <button
                      onClick={() => addOption(f.id)}
                      disabled={pending}
                      className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
                    >
                      Add option
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>}

      <section className="space-y-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Add a column</h3>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Column name"
            className={control}
          />
          {/* One question, in plain language. kind and valueType are derived
              from the choice on save. */}
          <div className="w-48">
            <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              {COLUMN_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          {typeId === "MEASUREMENT" && (
            <input
              value={unitSuffix}
              onChange={(e) => setUnitSuffix(e.target.value)}
              placeholder="Unit e.g. GSM"
              className={`${control} w-36`}
            />
          )}

          {typeId === "REFERENCE" && (
            <>
              {/* One question instead of two: every category, subcategory and
                  record sheet is just a place to point at. Searchable, because
                  the list grows with the tree the owner builds. */}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Links to</span>
                <div className="w-64">
                  <SpecCombobox
                    options={linkTargets}
                    value={linkTargetId}
                    onChange={(id) => setLinkTargetId(id)}
                    placeholder="Search categories…"
                  />
                </div>
              </label>

              {/* Which of the target's columns to offer. Picking one turns the
                  dropdown from "choose a vehicle" into "choose a brand", which
                  is how three columns on a Seat Cover can all point at the one
                  Car subcategory and each ask a different question. */}
              {linkTarget?.hasColumns && targetColumns.length > 0 && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-neutral-500">
                    Show column
                  </span>
                  <div className="w-56">
                    <Select
                      value={targetFieldId}
                      onChange={(e) => setTargetFieldId(e.target.value)}
                    >
                      <option value="">The whole record</option>
                      {targetColumns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-neutral-500">Narrow by</span>
                <div className="w-56">
                  <Select
                    value={dependsOnFieldId}
                    onChange={(e) => setDependsOnFieldId(e.target.value)}
                  >
                    <option value="">Nothing — show every record</option>
                    {fields
                      .filter((f) => f.kind === "REFERENCE")
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          The answer to {f.name}
                        </option>
                      ))}
                  </Select>
                </div>
              </label>
            </>
          )}

          <button
            onClick={add}
            disabled={pending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            Add column
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </section>
    </div>
  );
}
