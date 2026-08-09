"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock } from "lucide-react";
import { Select } from "@/components/ui/primitives";
import { ColumnCard } from "./ColumnCard";
import type { SpecFieldShape } from "./SpecFieldInput";
import {
  BUILTIN_COLUMNS,
  classifyFields,
  columnTypeId,
  columnTypeLabel,
  COLUMN_TYPES,
  resolveColumnLabels,
} from "@/lib/spec/columns";
import { updateGroupSettings } from "@/server/actions/itemGroups";
import {
  changeSpecFieldType,
  deleteSpecField,
  listGroupColumns,
  overrideSpecField,
  reorderSpecFields,
  updateSpecField,
} from "@/server/actions/specFields";
import { confirmDialog } from "@/components/ui/dialog-service";
import { toast } from "@/components/ui/toast";

type StripGroup = {
  id: string;
  name: string;
  codeLabel: string | null;
  nameLabel: string | null;
  aliasLabel: string | null;
  aliasHidden: boolean;
};

/**
 * Server actions here return whatever suits them — void, `{ ok }`, `{ error }`,
 * or a retype's three counts. `run` cares about exactly one thing: whether an
 * error came back. Typing the parameter as `{ error?: string }` made that a weak
 * type, which TypeScript refuses to accept a counts object for.
 */
function errorOf(result: unknown): string | undefined {
  if (result && typeof result === "object" && "error" in result) {
    const { error } = result as { error?: unknown };
    if (typeof error === "string") return error;
  }
  return undefined;
}

/**
 * Configure mode, laid out as the grid it produces.
 *
 * Reading left to right here is reading the sheet's header row, which is the
 * whole point: no translation between a vertical settings list and a
 * horizontal table.
 */
export function ColumnStrip({
  group,
  groups,
  fields,
  onGo,
}: {
  group: StripGroup;
  groups: { id: string; name: string }[];
  fields: SpecFieldShape[];
  onGo: (groupId: string) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  // Schema editing is destructive — a retype or delete can empty every item's
  // answers — so the strip opens read-only and the owner unlocks deliberately.
  const [unlocked, setUnlocked] = useState(false);

  const labels = resolveColumnLabels(group);
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
  const columns = classifyFields(fields, group.id, groupNameById);
  const ownIds = columns.filter((c) => !c.inherited).map((c) => c.field.id);

  function run(action: () => Promise<unknown>, success?: string) {
    start(async () => {
      const error = errorOf(await action());
      if (error) toast.error(error);
      else {
        if (success) toast.success(success);
        router.refresh();
      }
    });
  }

  function drop(targetId: string) {
    if (!dragId || dragId === targetId) return setDragId(null);
    const next = ownIds.filter((id) => id !== dragId);
    const at = next.indexOf(targetId);
    if (at === -1) return setDragId(null);
    next.splice(at, 0, dragId);
    setDragId(null);
    run(() => reorderSpecFields(group.id, next));
  }

  async function retype(field: SpecFieldShape, toTypeId: string) {
    const dry = await changeSpecFieldType(field.id, toTypeId, false);
    if ("error" in dry) return toast.error(dry.error ?? "Could not change that column");

    if (dry.coerced + dry.cleared > 0) {
      const ok = await confirmDialog({
        title: `Change "${field.name}" to ${COLUMN_TYPES.find((t) => t.id === toTypeId)!.label}?`,
        description:
          `${dry.kept} answer(s) stay as they are. ` +
          `${dry.coerced} will be rewritten. ` +
          `${dry.cleared} will be emptied and cannot be recovered.`,
        variant: dry.cleared > 0 ? "danger" : "primary",
        confirmLabel: "Change type",
      });
      if (!ok) return;
    }
    run(() => changeSpecFieldType(field.id, toTypeId, true), `"${field.name}" changed`);
  }

  async function remove(field: SpecFieldShape) {
    const ok = await confirmDialog({
      title: `Delete the "${field.name}" column?`,
      description:
        "The column and every answer given for it are removed from this category's items. This cannot be undone.",
      variant: "danger",
      confirmLabel: "Delete column",
    });
    if (ok) run(() => deleteSpecField(field.id), `"${field.name}" deleted`);
  }

  const smallBtn = "text-[11px] text-text-secondary hover:underline disabled:opacity-50";

  return (
    <section className="space-y-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Columns on {group.name}</h3>
          <p className="text-[11px] text-text-secondary">
            {unlocked
              ? "Drag to reorder, click a heading to rename, edit types and references below."
              : "These are the columns on the sheet and the questions the Add form asks. Unlock to edit."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUnlocked((v) => !v)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
            unlocked
              ? "border-[var(--brand)] bg-brand-soft text-[var(--brand)]"
              : "border-border bg-surface text-text-secondary hover:bg-surface-secondary/40"
          }`}
        >
          {unlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {unlocked ? "Editing Unlocked" : "Edits Locked"}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {BUILTIN_COLUMNS.map((c) => {
          if (c.id === "alias" && group.aliasHidden) return null;
          return (
            <ColumnCard
              key={c.id}
              label={labels[c.id]}
              typeLabel={c.id === "alias" ? "Short name" : "Filled in automatically"}
              locked
              onRename={
                unlocked
                  ? (next) =>
                      // A computed key would widen to `string` and stop matching the
                      // patch type, so the three cases are spelled out.
                      run(() =>
                        updateGroupSettings(
                          group.id,
                          c.id === "code"
                            ? { codeLabel: next }
                            : c.id === "name"
                              ? { nameLabel: next }
                              : { aliasLabel: next }
                        )
                      )
                  : undefined
              }
            >
              <p className="text-[11px] text-text-tertiary">
                {c.id === "alias"
                  ? "A short name, used inside other items' names."
                  : "Built from the naming templates below."}
              </p>
            </ColumnCard>
          );
        })}

        {columns.map(({ field, inherited, ownerName }) => (
          <div
            key={field.id}
            draggable={!inherited && unlocked}
            onDragStart={() => unlocked && setDragId(field.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => unlocked && drop(field.id)}
          >
            <ColumnCard
              label={field.name}
              typeLabel={columnTypeLabel(field.kind, field.valueType)}
              required={field.isRequired}
              inherited={inherited}
              ownerName={ownerName}
              onRename={
                inherited || !unlocked
                  ? undefined
                  : (next) => run(() => updateSpecField(field.id, { name: next }))
              }
              onOpenOwner={() => onGo(field.groupId)}
              onOverride={() =>
                run(() => overrideSpecField(field.id, group.id), `"${field.name}" is now set here`)
              }
            >
              <Select
                value={columnTypeId(field.kind, field.valueType)}
                onChange={(e) => retype(field, e.target.value)}
                disabled={!unlocked || pending}
                className="h-8 text-xs"
              >
                {COLUMN_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pending || !unlocked}
                  className={smallBtn}
                  onClick={() =>
                    run(() => updateSpecField(field.id, { isRequired: !field.isRequired }))
                  }
                >
                  {field.isRequired ? "Make optional" : "Make required"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(field)}
                  disabled={pending || !unlocked}
                  className="text-[11px] text-danger hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
              {unlocked && !inherited ? (
                <SchemaEditor
                  field={field}
                  groups={groups}
                  siblings={fields}
                  pending={pending}
                  run={run}
                />
              ) : (
                // The token reference, read-only when locked.
                <code className="text-[10px] text-text-tertiary">{`{${field.key}}`}</code>
              )}
            </ColumnCard>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The inline schema editor shown under an own column when Configure is unlocked.
 *
 * Editing these in place is the whole point: changing a reference's target or a
 * column's token used to mean deleting and recreating the column, which threw
 * away every item's answer for it. Here the record keeps its values.
 */
function SchemaEditor({
  field,
  groups,
  siblings,
  pending,
  run,
}: {
  field: SpecFieldShape;
  groups: { id: string; name: string }[];
  siblings: SpecFieldShape[];
  pending: boolean;
  run: (action: () => Promise<unknown>, success?: string) => void;
}) {
  const [keyDraft, setKeyDraft] = useState(field.key);
  const [targetColumns, setTargetColumns] = useState<{ id: string; name: string }[]>([]);

  // Keep the token box in step with the server after a save refresh.
  useEffect(() => setKeyDraft(field.key), [field.key]);

  // Which columns the target sheet offers, for the Target Column picker.
  useEffect(() => {
    if (field.kind !== "REFERENCE" || !field.targetGroupId) {
      setTargetColumns([]);
      return;
    }
    let cancelled = false;
    listGroupColumns(field.targetGroupId).then((cols) => {
      if (!cancelled) setTargetColumns(cols);
    });
    return () => {
      cancelled = true;
    };
  }, [field.kind, field.targetGroupId]);

  const commitKey = () => {
    const next = keyDraft.trim();
    if (!next || next === field.key) return setKeyDraft(field.key);
    run(() => updateSpecField(field.id, { key: next }), "Token updated");
  };

  const rowLabel = "text-[10px] font-semibold uppercase tracking-wider text-text-tertiary";
  const isRef = field.kind === "REFERENCE";

  return (
    <div className="mt-1 space-y-2 border-t border-border pt-2">
      <div className="space-y-1">
        <label className={rowLabel}>Token</label>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-text-tertiary">{"{"}</span>
          <input
            value={keyDraft}
            disabled={pending}
            onChange={(e) => setKeyDraft(e.target.value)}
            onBlur={commitKey}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="h-7 w-full rounded-lg border border-border bg-surface px-2 font-mono text-[11px] text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]"
          />
          <span className="text-[11px] text-text-tertiary">{"}"}</span>
        </div>
      </div>

      {isRef && (
        <>
          <div className="space-y-1">
            <label className={rowLabel}>Target category</label>
            <Select
              value={field.targetGroupId ?? ""}
              disabled={pending}
              className="h-7 text-[11px]"
              onChange={(e) =>
                // Changing the sheet invalidates the picked column, so clear it.
                run(() =>
                  updateSpecField(field.id, {
                    targetGroupId: e.target.value || null,
                    targetFieldId: null,
                  })
                )
              }
            >
              <option value="">— None —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>

          {field.targetGroupId && (
            <div className="space-y-1">
              <label className={rowLabel}>Target column</label>
              <Select
                value={field.targetFieldId ?? ""}
                disabled={pending}
                className="h-7 text-[11px]"
                onChange={(e) =>
                  run(() => updateSpecField(field.id, { targetFieldId: e.target.value || null }))
                }
              >
                <option value="">Whole record</option>
                {targetColumns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </>
      )}

      <div className="space-y-1">
        <label className={rowLabel}>Depends on</label>
        <Select
          value={field.dependsOnFieldId ?? ""}
          disabled={pending}
          className="h-7 text-[11px]"
          onChange={(e) =>
            run(() => updateSpecField(field.id, { dependsOnFieldId: e.target.value || null }))
          }
        >
          <option value="">— None —</option>
          {siblings
            .filter((f) => f.id !== field.id)
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
        </Select>
      </div>
    </div>
  );
}
