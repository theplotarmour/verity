"use client";

import { ChevronRight } from "lucide-react";

type Group = { id: string; name: string; parentId: string | null };

/**
 * The subcategory tree, for a phone.
 *
 * The desktop rail is a 224px indented tree, which on a 390px screen leaves a
 * sliver for the sheet itself. Here it becomes a breadcrumb plus one scrolling
 * row of the current level — the shape every phone file browser already uses,
 * so drilling in needs no explanation.
 */
export function MobileGroupRail({
  groups,
  active,
  go,
  adding,
}: {
  groups: Group[];
  active: Group;
  go: (groupId: string) => void;
  /**
   * The add-a-subcategory control, when this sheet takes them and the owner is
   * in Configure. Passed in rather than rebuilt so mobile and desktop cannot
   * drift into two different ways of creating the same thing.
   */
  adding?: React.ReactNode;
}) {
  // Root-first ancestry, capped so a cycle terminates rather than hanging.
  const trail: Group[] = [];
  let cursor: Group | undefined = active;
  let guard = groups.length + 1;
  while (cursor && guard-- > 0) {
    trail.unshift(cursor);
    cursor = cursor.parentId ? groups.find((g) => g.id === cursor!.parentId) : undefined;
  }

  const children = groups.filter((g) => g.parentId === active.id);

  return (
    <div className="border-b border-border bg-surface/70 md:hidden">
      <div className="flex items-center gap-0.5 overflow-x-auto px-3 py-2 text-xs">
        {trail.map((g, i) => (
          <span key={g.id} className="flex shrink-0 items-center gap-0.5">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-text-tertiary" />}
            <button
              onClick={() => go(g.id)}
              className={`whitespace-nowrap rounded-lg px-2 py-1 font-bold transition ${
                g.id === active.id
                  ? "text-text-primary"
                  : "text-text-secondary hover:bg-surface-secondary/60"
              }`}
            >
              {i === 0 ? `All ${g.name}` : g.name}
            </button>
          </span>
        ))}
      </div>

      {children.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
          {children.map((g) => (
            <button
              key={g.id}
              onClick={() => go(g.id)}
              className="shrink-0 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-secondary/60 hover:text-text-primary"
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {adding && <div className="px-3 pb-2">{adding}</div>}
    </div>
  );
}
