"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, StateBadge, Surface } from "./primitives";
import { Icon } from "./icons";

/**
 * The platform data table.
 *
 * Authority: Bible V4 §1.A (high density on desktop, one primary thing at a
 * time on mobile), and the board's table treatment.
 *
 * COMPOSITION
 * The board's table is not a grid of equal cells. It has a clear reading order:
 * a quiet toolbar, tracked-out column labels that recede, a first column that
 * carries the record's identity in full-strength ink, and supporting columns in
 * secondary ink. Separators run between rows and nowhere else — no vertical
 * rules, no border under the last row, no zebra striping. Density is high but
 * rows breathe at ~46px.
 *
 * That hierarchy is what makes an operational table scannable: the eye goes down
 * the first column looking for a record, then across. A table where every cell
 * has identical weight forces it to read every cell.
 *
 * TWO ARCHITECTURAL NOTES
 * Columns are supplied by the caller from platform metadata, so a field the
 * actor may not read never reaches this component — Layer 3 strips it
 * server-side. There is deliberately no "hidden field" concept: rendering an
 * unauthorised field as an empty placeholder would leak its existence.
 *
 * Columns are declared as data, not as render callbacks. This is a client
 * component and its callers are Server Components, so a function cannot cross
 * that boundary — but the deeper reason is that a serialisable column spec keeps
 * cell rendering uniform. A per-call render function is where one table quietly
 * starts formatting dates differently from every other.
 */

/**
 * Rows rendered before the reader has to ask for more.
 *
 * Not a nicety. On a phone each row becomes a stacked block, so an unpaged audit
 * table of 100 rows rendered a 13,000px page — technically responsive and
 * genuinely unusable. Paging here fixes every long table at once rather than
 * each page working around it.
 */
const PAGE = 25;

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
  /** Secondary line rendered beneath the value, from another row field. */
  subKey?: string;
};

function fillTemplate(template: string, row: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, field: string) => String(row[field] ?? ""));
}

function Cell({
  column,
  row,
  lead,
}: {
  column: Column;
  row: Record<string, unknown>;
  lead: boolean;
}) {
  const raw = row[column.key];
  const value = raw === null || raw === undefined || raw === "" ? "—" : String(raw);
  const sub = column.subKey ? row[column.subKey] : undefined;

  const body =
    column.variant === "link" && column.href ? (
      <Link
        href={fillTemplate(column.href, row)}
        className="text-text no-underline hover:text-accent-ink hover:underline"
      >
        {value}
      </Link>
    ) : column.variant === "state" ? (
      <StateBadge category={String(row[column.categoryKey ?? "category"] ?? "Draft")} label={value} />
    ) : (
      // The identity column keeps full-strength ink; everything else steps back
      // so the first column reads as the row's subject rather than as data.
      <span className={lead ? "text-text" : "text-text-secondary"}>{value}</span>
    );

  if (sub) {
    return (
      <span className="flex flex-col gap-0.5">
        {body}
        <span className="text-[12px] text-text-tertiary">{String(sub)}</span>
      </span>
    );
  }
  return body;
}

export function DataTable({
  columns,
  rows,
  caption,
  rowKey = "id",
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  filterable = true,
  toolbar,
}: {
  columns: Column[];
  rows: Array<Record<string, unknown>>;
  caption: string;
  /** Field holding a stable identity for each row. */
  rowKey?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  filterable?: boolean;
  /** Extra controls in the toolbar, right-aligned beside the filter. */
  toolbar?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [limit, setLimit] = useState(PAGE);

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
        const result =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av ?? "").localeCompare(String(bv ?? ""));
        return sort.dir === "asc" ? result : -result;
      });
    }
    return out;
  }, [rows, columns, query, sort]);

  const shown = visible.slice(0, limit);
  const hidden = visible.length - shown.length;

  if (rows.length === 0) {
    return (
      <Surface>
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </Surface>
    );
  }

  const showToolbar = (filterable && rows.length > 5) || Boolean(toolbar);

  return (
    <Surface className="overflow-hidden">
      {showToolbar && (
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
          {filterable && rows.length > 5 && (
            <div className="relative flex min-w-0 flex-1 items-center">
              <Icon
                name="search"
                size={14}
                className="pointer-events-none absolute left-2.5 text-text-tertiary"
              />
              <label htmlFor={`filter-${rowKey}`} className="sr-only">
                Filter {caption}
              </label>
              {/* Deliberately borderless. This filters rows already on screen;
                  dressing it as a bordered input makes it look like the global
                  search the platform does not have yet. */}
              <input
                id={`filter-${rowKey}`}
                type="search"
                placeholder="Filter…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 w-full max-w-xs rounded-md border-0 bg-transparent pl-8 pr-2 text-[13px] text-text placeholder:text-text-tertiary focus:outline-none focus:ring-0"
              />
            </div>
          )}
          {toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
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
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-[14px]">
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr className="border-b border-line">
                  {columns.map((c) => {
                    const sorted = sort?.key === c.key;
                    const label = (
                      <>
                        {c.header}
                        <span aria-hidden="true" className="ml-1 text-text-tertiary">
                          {sorted ? (sort!.dir === "asc" ? "↑" : "↓") : ""}
                        </span>
                      </>
                    );
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        aria-sort={
                          sorted ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined
                        }
                        className={
                          "whitespace-nowrap px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.07em] text-text-tertiary " +
                          (c.numeric ? "text-right" : "text-left")
                        }
                      >
                        {c.sortable === false ? (
                          label
                        ) : (
                          <button
                            type="button"
                            className="cursor-pointer border-0 bg-transparent p-0 text-[11px] font-medium uppercase tracking-[0.07em] text-text-tertiary transition-colors hover:text-text"
                            onClick={() =>
                              setSort((s) =>
                                s?.key === c.key
                                  ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
                                  : { key: c.key, dir: "asc" },
                              )
                            }
                          >
                            {label}
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((row) => (
                  <tr key={String(row[rowKey])} className="transition-colors hover:bg-surface-sunken">
                    {columns.map((c, i) => (
                      <td
                        key={c.key}
                        className={
                          "px-5 py-3 align-middle " + (c.numeric ? "tabular text-right" : "")
                        }
                      >
                        <Cell column={c} row={row} lead={i === 0} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: one record per block. The first column becomes the block's
              heading rather than another label/value pair — repeating "Location:
              Demo Depot Site" wastes the one line that matters most. */}
          <ul className="m-0 list-none divide-y divide-line p-0 md:hidden">
            {shown.map((row) => {
              const [lead, ...rest] = columns;
              return (
                <li key={String(row[rowKey])} className="flex flex-col gap-2 px-4 py-3.5">
                  <div className="text-[14px]">
                    <Cell column={lead!} row={row} lead />
                  </div>
                  <div className="flex flex-col gap-1">
                    {rest.map((c) => (
                      <div key={c.key} className="flex items-baseline justify-between gap-4">
                        <span className="shrink-0 text-[12px] text-text-tertiary">{c.header}</span>
                        <span className={"min-w-0 text-right text-[13px] " + (c.numeric ? "tabular" : "")}>
                          <Cell column={c} row={row} lead={false} />
                        </span>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-2.5">
            <p className="m-0 text-[12px] text-text-tertiary" aria-live="polite">
              {visible.length === rows.length
                ? `Showing ${shown.length} of ${rows.length} ${rows.length === 1 ? "record" : "records"}`
                : `Showing ${shown.length} of ${visible.length} matched · ${rows.length} total`}
            </p>
            {hidden > 0 && (
              <button
                type="button"
                onClick={() => setLimit((n) => n + PAGE)}
                className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-medium text-accent-ink hover:underline"
              >
                Show {Math.min(hidden, PAGE)} more
              </button>
            )}
          </div>
        </>
      )}
    </Surface>
  );
}
