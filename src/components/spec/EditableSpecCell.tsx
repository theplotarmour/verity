"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SpecFieldInput, type SpecFieldShape } from "./SpecFieldInput";
import { fetchReferenceOptions } from "@/server/actions/spec";
import { updateItemAnswer } from "@/server/actions/itemsFromSpec";
import { toast } from "@/components/ui/toast";
import type { RefOption, SpecAnswer } from "@/lib/spec/types";

/**
 * One cell of the data sheet, read until clicked.
 *
 * Editing an answer re-derives the item's name and code, because both are
 * functions of the spec — so the row renames itself as you change it, and a
 * change that would collide with another item is refused with its name.
 */
export function EditableSpecCell({
  itemId,
  field,
  answer,
  display,
}: {
  itemId: string;
  field: SpecFieldShape;
  answer: SpecAnswer;
  display: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState<RefOption[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!editing || field.kind !== "REFERENCE") return;
    let cancelled = false;
    fetchReferenceOptions(field.id).then((o) => {
      if (!cancelled) setOptions(o);
    });
    return () => {
      cancelled = true;
    };
  }, [editing, field.id, field.kind]);

  function save(next: SpecAnswer) {
    start(async () => {
      const result = await updateItemAnswer(itemId, field.id, next);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Click to edit"
        className="w-full rounded px-1 py-0.5 text-left hover:bg-surface-secondary/60"
      >
        <CellPreview field={field} answer={answer} display={display} />
      </button>
    );
  }

  return (
    <div className="min-w-[10rem]">
      <SpecFieldInput
        field={field}
        options={options}
        value={answer}
        autoFocus
        onChange={save}
      />
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={pending}
        className="mt-1 text-[10px] text-text-tertiary hover:underline"
      >
        {pending ? "Saving…" : "Cancel"}
      </button>
    </div>
  );
}

/**
 * What a cell shows before it is clicked.
 *
 * A URL, a hex code and a paragraph are all strings in the database, but a
 * column of raw https:// links tells the owner nothing — the point of these
 * types is that the grid shows the thing itself.
 */
function CellPreview({
  field,
  answer,
  display,
}: {
  field: SpecFieldShape;
  answer: SpecAnswer;
  display: string;
}) {
  const text = answer.valueText ?? "";
  if (!text && !display) return <span className="text-text-tertiary">—</span>;

  if (field.valueType === "IMAGE" && text) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={text} alt="" className="h-8 w-8 rounded border border-border object-cover" />;
  }

  if (field.valueType === "FILE" && text) {
    return <span className="text-[var(--brand)] underline">{text.split("/").pop()}</span>;
  }

  if (field.valueType === "COLOR" && text) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          style={{ background: text }}
          className="h-3.5 w-3.5 shrink-0 rounded-full border border-border"
        />
        <span className="font-mono text-xs">{text}</span>
      </span>
    );
  }

  if (field.valueType === "TEXTAREA" && text) {
    // One line in the grid; the full text is there when the cell is opened.
    return <span className="block max-w-[18rem] truncate">{text}</span>;
  }

  return <>{display || text}</>;
}
