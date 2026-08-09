"use client";

import { useEffect, useState } from "react";
import { ChecklistBuilder } from "./ChecklistBuilder";
import { TemplateAppliesTo } from "./TemplateAppliesTo";
import { getQCTemplates } from "@/server/actions/qc-templates";

/**
 * Checklist templates — standalone.
 *
 * A checklist belongs to a department or a product category, not to a single
 * item, and any department can have one: Cutting checks the pattern, Stitching
 * checks the seam, QC checks the finish. So this tab deliberately does not read
 * the selected blueprint and does not offer BOM editing — a group's recipe lives
 * in the item's own Details expander.
 */
export function TemplatesStudioTab() {
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getQCTemplates()
      .then((rows) => {
        const list = rows.map((r) => ({ id: r.id, name: r.name }));
        setTemplates(list);
        setSelected((s) => s ?? list[0]?.id ?? null);
      })
      .catch(() => setTemplates([]));
  }, []);

  const active = templates.find((t) => t.id === selected) ?? null;

  return (
    <div className="h-full overflow-auto bg-surface-secondary/20">
      {templates.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border/60 px-4 pt-4">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                t.id === selected
                  ? "bg-brand-soft text-[var(--brand)]"
                  : "text-text-secondary hover:bg-surface-secondary/60 hover:text-text-primary"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {active && (
        <section className="px-4 pt-4">
          <TemplateAppliesTo templateId={active.id} templateName={active.name} />
        </section>
      )}

      <section className="p-4">
        <ChecklistBuilder />
      </section>
    </div>
  );
}
