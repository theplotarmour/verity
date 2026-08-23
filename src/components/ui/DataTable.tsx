"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, Input, StateBadge } from "./primitives";

/**
 * The platform data table.
 *
 * Authority: Bible V4 §1.A (high density on desktop, one primary thing at a
 * time on mobile), and §13 of the experience brief.
 *
 * Two decisions worth stating. Columns are supplied by the caller from platform
 * metadata, so a field the actor may not read never reaches this component —
 * Layer 3 strips it server-side and the table renders whatever survives. That is
 * why there is no "hidden field" concept here: rendering an unauthorised field
 * as an empty placeholder would leak its existence, which is what the brief
 * forbids.
 *
 * On narrow viewports the table becomes a stack of records rather than a
 * horizontally scrolling grid. A scrolling table on a phone hides the columns
 * that matter behind a gesture nobody discovers.
 *
 * Columns are declared as data, not as render callbacks. This is a client
 * component and its callers are Server Components, and a function cannot cross
 * that boundary — but the deeper reason is that a serialisable column spec keeps
 * cell rendering uniform. A per-call render function is where one table quietly
 * starts formatting dates differently from every other.
 */

export type ColumnVariant = "text" | "link" | "state";

export type Column = {
  key: string;
  header: string;
  /** Right-align numerics so magnitudes line up. */
  numeric?: boolean;
  sortable?: boolean;
  variant?: ColumnVariant;
  /** For `link`: an href with {field} placeholders, e.g. "/assets/{id}". */
  href?: string;
  /** For `state`: the row field holding the canonical StateCategory. */
  categoryKey?: string;
};

function fillTemplate(template: string, row: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, field: string) => String(row[field] ?? ""));
}

function Cell({ column, row }: { column: Column; row: Record<string, unknown> }) {
  const raw = row[column.key];
  const text = raw === null || raw === undefined || raw === "" ? "—" : String(raw);

  if (column.variant === "link" && column.href) {
    return (
      <Link href={fillTemplate(column.href, row)} className="text-accent-ink no-underline hover:underline">
        {text}
      </Link>
    );
  }
  if (column.variant === "state") {
    const category = String(row[column.categoryKey ?? "category"] ?? "Draft");
    return <StateBadge category={category} label={text} />;
  }
  return <>{text}</>;
}

export function DataTable({
  columns,
  rows,
  caption,
  rowKey = "id",
  emptyTitle = "Nothing here yet",
  emptyDescription,
  filterable = true,
}: {
  columns: Column[];
  rows: Array<Record<string, unknown>>;
  caption: string;
  /** Field holding a stable identity for each row. */
  rowKey?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  filterable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const visible = useMemo(() => {
    let out = rows;

    if (query.trim()) {
      const needle = query.toLowerCase();
      out = out.filter((row) =>
        columns.some((c) => String(row[c.key] ?? "").toLowerCase().includes(needle)),
      );
    }

    if (sort) {
      out = [...out].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av === bv) return 0;
        const result = typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""));
        return sort.dir === "asc" ? result : -result;
      });
    }
    return out;
  }, [rows, columns, query, sort]);

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {filterable && rows.length > 5 && (
        <div className="max-w-xs">
          <label htmlFor="table-filter" className="sr-only">
            Filter {caption}
          </label>
          <Input
            id="table-filter"
            type="search"
            placeholder="Filter…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="No matches"
          description={`Nothing in ${caption.toLowerCase()} matches “${query}”.`}
        />
      ) : (
        <>
          {/* Desktop: dense grid */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full border-collapse text-[14px]">
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {columns.map((c) => {
                    const sorted = sort?.key === c.key;
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        aria-sort={sorted ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                        className={
                          "text-left font-medium text-text-tertiary text-[13px] px-4 py-2.5 border-b border-line whitespace-nowrap " +
                          (c.numeric ? "text-right" : "")
                        }
                      >
                        {c.sortable === false ? (
                          c.header
                        ) : (
                          <button
                            type="button"
                            className="bg-transparent border-0 p-0 font-medium text-text-tertiary hover:text-text cursor-pointer text-[13px]"
                            onClick={() =>
                              setSort((s) =>
                                s?.key === c.key
                                  ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
                                  : { key: c.key, dir: "asc" },
                              )
                            }
                          >
                            {c.header}
                            <span aria-hidden="true" className="ml-1">
                              {sorted ? (sort!.dir === "asc" ? "↑" : "↓") : ""}
                            </span>
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={String(row[rowKey])} className="hover:bg-surface-sunken">
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={
                          "px-4 py-2.5 border-b border-line align-top " +
                          (c.numeric ? "text-right tabular" : "")
                        }
                      >
                        <Cell column={c} row={row} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: one record per block */}
          <ul className="md:hidden list-none m-0 p-0 flex flex-col gap-2">
            {visible.map((row) => (
              <li key={String(row[rowKey])} className="bg-surface rounded-lg p-4 flex flex-col gap-2">
                {columns.map((c) => (
                  <div key={c.key} className="flex items-baseline justify-between gap-4">
                    <span className="text-[13px] text-text-tertiary shrink-0">{c.header}</span>
                    <span className={"text-right min-w-0 " + (c.numeric ? "tabular" : "")}>
                      <Cell column={c} row={row} />
                    </span>
                  </div>
                ))}
              </li>
            ))}
          </ul>

          <p className="text-[13px] text-text-tertiary m-0" aria-live="polite">
            {visible.length} of {rows.length} {rows.length === 1 ? "record" : "records"}
          </p>
        </>
      )}
    </div>
  );
}
