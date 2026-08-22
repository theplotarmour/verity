"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/primitives";
import { WorkspaceRow } from "@/components/layout/Workspace";

export interface QueueItem {
  id: string;
  href: string;
  /** The reference — ticket number, site code, invoice number. */
  code: string;
  title: string;
  /** One line of context: the site, the client, the assignee. */
  meta?: string | null;
  /** Short status word, shown as a pill. */
  status?: string | null;
  /** Marks a row as needing attention — a breached SLA, an overdue invoice. */
  urgent?: boolean;
}

/**
 * The left pane of a two-pane workspace: the queue you are working through.
 *
 * Deliberately not the index table. That table is a good overview — sortable,
 * wide, every column visible — and this is a different job: keeping your place
 * while you open one record after another. Compressing the table into 360px
 * would produce a worse version of both.
 *
 * Filtering is local because the whole queue is already loaded for the pane; a
 * round trip to narrow a list you are holding would be slower and would lose
 * the detail pane on every keystroke.
 */
export function QueuePane({
  items,
  activeId,
  label = "Queue",
}: {
  items: QueueItem[];
  activeId?: string | null;
  label?: string;
}) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.code, item.title, item.meta].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/60 p-3">
        <div className="flex items-baseline justify-between gap-2 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
            {label}
          </span>
          <span className="font-mono text-[11px] text-text-tertiary">{shown.length}</span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Filter…"
            aria-label={`Filter ${label.toLowerCase()}`}
            className="pl-9"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="p-4 text-[12px] text-text-tertiary">
          {items.length === 0 ? "Nothing here yet." : "Nothing matches that."}
        </p>
      ) : (
        shown.map((item) => (
          <WorkspaceRow key={item.id} href={item.href} active={item.id === activeId}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="font-mono text-[10px] font-semibold text-text-tertiary">
                  {item.code}
                </span>
                <span className="block truncate text-[13px] font-semibold text-text-primary">
                  {item.title}
                </span>
                {item.meta ? (
                  <span className="block truncate text-[11px] text-text-tertiary">{item.meta}</span>
                ) : null}
              </div>
              {item.status ? (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    item.urgent
                      ? "border-[var(--brand)]/30 bg-[var(--brand)]/10 text-[var(--brand)]"
                      : "border-border text-text-tertiary"
                  }`}
                >
                  {item.status}
                </span>
              ) : null}
            </div>
          </WorkspaceRow>
        ))
      )}
    </div>
  );
}
