"use client";

import { useState } from "react";
import { GripVertical, Lock } from "lucide-react";

/**
 * One column in Configure mode, shaped like the grid header it produces.
 *
 * Deliberately dumb: the strip decides what a column *is* and what its actions
 * do, so this file never has to know the difference between an ItemMaster
 * scalar and a SpecField.
 */
export function ColumnCard({
  label,
  typeLabel,
  required = false,
  locked = false,
  inherited = false,
  ownerName = null,
  onRename,
  onOpenOwner,
  onOverride,
  children,
}: {
  label: string;
  typeLabel: string;
  required?: boolean;
  /** Built-in columns: renameable, never retyped or deleted. */
  locked?: boolean;
  inherited?: boolean;
  ownerName?: string | null;
  onRename?: (next: string) => void;
  onOpenOwner?: () => void;
  onOverride?: () => void;
  /** Type control, required toggle, delete — supplied by the strip. */
  children?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== label) onRename?.(next);
    else setDraft(label);
  }

  return (
    <div
      className={`flex w-52 shrink-0 flex-col gap-2 rounded-xl border p-3 ${
        inherited
          ? "border-dashed border-border bg-surface-secondary/30"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {!inherited && !locked && (
          <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-text-tertiary" />
        )}
        {locked && <Lock className="h-3 w-3 shrink-0 text-text-tertiary" />}
        {editing && onRename ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(label);
                setEditing(false);
              }
            }}
            className="w-full rounded-md border border-border bg-surface px-1.5 py-0.5 text-sm font-bold text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]"
          />
        ) : (
          <button
            type="button"
            title={onRename ? "Click to rename this column" : undefined}
            onClick={() => onRename && setEditing(true)}
            disabled={!onRename}
            className="min-w-0 truncate text-left text-sm font-bold text-text-primary disabled:cursor-default"
          >
            {label}
          </button>
        )}
        {required && (
          <span className="ml-auto shrink-0 text-[10px] font-bold text-danger" title="Required">
            *
          </span>
        )}
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
        {typeLabel}
      </p>

      {inherited ? (
        <div className="space-y-1.5">
          <p className="text-[10px] text-text-secondary">
            Set on <span className="font-semibold">{ownerName}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenOwner}
              className="text-[11px] font-semibold text-[var(--brand)] hover:underline"
            >
              Open {ownerName}
            </button>
            <button
              type="button"
              onClick={onOverride}
              className="text-[11px] text-text-secondary hover:underline"
            >
              Change here only
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
