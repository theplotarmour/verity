"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getTemplateAssignments,
  setTemplateForItemGroup,
} from "@/server/actions/qc-templates";
import { toast } from "@/components/ui/toast";

type Row = { id: string; name: string; assigned: boolean; takenBy: string | null };
type GroupRow = Row & { parentName: string | null };

/**
 * Where a checklist is used: product categories, departments, or both.
 *
 * Both links point *at* the template rather than from it, so one checklist can
 * cover every seat-cover subcategory and the QC department at once. A category
 * can only have one default, though, so ticking here can take it off another
 * checklist — which is said out loud rather than discovered later.
 */
export function TemplateAppliesTo({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const [pending, start] = useTransition();
  const [groups, setGroups] = useState<GroupRow[] | null>(null);

  const reload = () =>
    getTemplateAssignments(templateId).then((a) => {
      setGroups(a.groups);
    });

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  if (groups === null) return null;

  const tick = (row: Row, save: (assigned: boolean) => Promise<unknown>) => (
    <button
      key={row.id}
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          // Toggle this one category on this one checklist; its other
          // departments' checklists are untouched.
          const result = (await save(!row.assigned)) as { error?: string };
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          await reload();
        })
      }
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
        row.assigned
          ? "bg-brand-soft text-[var(--brand)]"
          : "text-text-secondary hover:bg-surface-secondary/60"
      } disabled:opacity-50`}
    >
      <span
        aria-hidden
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
          row.assigned ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-border"
        }`}
      >
        {row.assigned ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1 truncate">{row.name}</span>
      {!row.assigned && row.takenBy && (
        <span className="shrink-0 text-[10px] text-amber-600">on another checklist</span>
      )}
    </button>
  );

  return (
    <section className="rounded-xl border border-border bg-surface p-3">
      <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-text-secondary">
        Where {templateName} applies
      </h4>
      <p className="mb-3 text-[11px] text-text-tertiary">
        Items in a ticked category get this checklist when their blueprint is built. Existing items
        keep the one they were built with — use Rebuild blueprint on the item to pick this up.
      </p>

      {/* Departments are no longer ticked here: a checklist belongs to exactly
          one department, chosen in the builder header. This grid answers only
          "which products does it cover". */}
      <div>
        <p className="mb-1 text-[11px] font-bold text-text-secondary">Categories</p>
        {groups.length === 0 ? (
          <p className="text-[11px] text-text-tertiary">
            No categories yet. Add one in Master Data first.
          </p>
        ) : (
          <div className="max-h-48 overflow-auto rounded-lg border border-border">
            {groups.map((g) =>
              tick(g, (assigned) => setTemplateForItemGroup(g.id, templateId, assigned))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
