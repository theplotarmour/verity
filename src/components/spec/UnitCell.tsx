"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setItemUnits } from "@/server/actions/itemUnits";
import { toast } from "@/components/ui/toast";

type Units = { primary: string; secondary: string | null; factor: number | null };

/**
 * One of an item's three unit cells, edited in the sheet.
 *
 * The three are saved together because they are one fact, not three: a purchase
 * unit without a factor would make every goods receipt add the wrong quantity,
 * so the server refuses that pair. Sending all three on every edit lets it
 * enforce that rather than seeing a half-change and guessing.
 */
export function UnitCell({
  itemId,
  units,
  which,
}: {
  itemId: string;
  units: Units;
  which: "primary" | "secondary" | "factor";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);

  const shown =
    which === "primary"
      ? units.primary
      : which === "secondary"
        ? units.secondary ?? ""
        : units.factor === null
          ? ""
          : String(units.factor);

  const [draft, setDraft] = useState(shown);

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next === shown.trim()) return;

    const payload = {
      itemId,
      primaryUOM: which === "primary" ? next.toUpperCase() : units.primary,
      secondaryUOM:
        which === "secondary" ? next.toUpperCase() || null : units.secondary,
      factor: which === "factor" ? (next === "" ? null : Number(next)) : units.factor,
    };
    if (which === "factor" && next !== "" && !Number.isFinite(Number(next))) {
      toast.error("The conversion has to be a number.");
      setDraft(shown);
      return;
    }

    start(async () => {
      const result = (await setItemUnits(payload)) as { error?: string };
      if (result?.error) {
        toast.error(result.error);
        setDraft(shown);
        return;
      }
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onDoubleClick={() => {
          setDraft(shown);
          setEditing(true);
        }}
        onClick={() => {
          setDraft(shown);
          setEditing(true);
        }}
        disabled={pending}
        title="Click to edit"
        className="w-full rounded px-1 py-0.5 text-left hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-800"
      >
        {shown || <span className="text-neutral-400">—</span>}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      inputMode={which === "factor" ? "decimal" : "text"}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(shown);
          setEditing(false);
        }
      }}
      className="w-20 rounded border border-[var(--brand)] bg-surface px-1 py-0.5 text-sm outline-none"
    />
  );
}
