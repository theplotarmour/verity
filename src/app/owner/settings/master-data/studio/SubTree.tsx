"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameItemGroup, deleteItemGroup } from "@/server/actions/itemGroups";
import { confirmDialog } from "@/components/ui/dialog-service";
import { toast } from "@/components/ui/toast";

export type TreeGroup = {
  id: string;
  name: string;
  parentId: string | null;
};

/**
 * One category and everything filed beneath it, to any depth.
 *
 * ItemGroup.parentId has always been a self-reference, so the database could
 * hold a tree of any depth — the sidebar just never rendered past the first
 * level, which quietly capped the whole product at two levels of category.
 */
export function SubTree({
  group,
  groups,
  activeId,
  depth,
  go,
  editable,
}: {
  group: TreeGroup;
  groups: TreeGroup[];
  activeId: string;
  depth: number;
  go: (id: string) => void;
  /** Structure is edited in Configure mode only; Data mode reads. */
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(group.name);

  const children = groups.filter((g) => g.parentId === group.id);
  const active = activeId === group.id;

  function commitRename() {
    const next = draft.trim();
    setRenaming(false);
    if (!next || next === group.name) {
      setDraft(group.name);
      return;
    }
    start(async () => {
      await renameItemGroup(group.id, next);
      router.refresh();
    });
  }

  async function remove() {
    const ok = await confirmDialog({
      title: `Delete "${group.name}"?`,
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    start(async () => {
      const result = await deleteItemGroup(group.id);
      if (result && "error" in result && result.error) {
        // The action explains what is in the way — subcategories or items —
        // rather than just refusing.
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div
        className={`group flex items-center gap-1 rounded-xl pr-1 transition ${
          active ? "bg-brand-soft" : "hover:bg-surface-secondary/60"
        }`}
      >
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(group.name);
                setRenaming(false);
              }
            }}
            className="my-1 h-7 w-full rounded-lg border border-border bg-surface px-2 text-xs font-bold text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]"
          />
        ) : (
          <>
            <button
              onClick={() => go(group.id)}
              className={`block min-w-0 flex-1 truncate px-3 py-2 text-left text-xs font-bold transition ${
                active ? "text-[var(--brand)]" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {group.name}
            </button>
            {editable && (
              // Hidden until hover so a long tree stays readable, but always
              // present in the DOM so keyboard users can reach them.
              <span className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button
                  onClick={() => {
                    setDraft(group.name);
                    setRenaming(true);
                  }}
                  disabled={pending}
                  title={`Rename ${group.name}`}
                  aria-label={`Rename ${group.name}`}
                  className="rounded p-1 text-[10px] text-text-tertiary hover:text-text-primary"
                >
                  ✎
                </button>
                <button
                  onClick={remove}
                  disabled={pending}
                  title={`Delete ${group.name}`}
                  aria-label={`Delete ${group.name}`}
                  className="rounded p-1 text-[10px] text-text-tertiary hover:text-red-600"
                >
                  🗑
                </button>
              </span>
            )}
          </>
        )}
      </div>

      {/* Children are nested inside a bordered rail rather than indented by a
          computed padding, so each level draws one continuous line down its
          own descendants. A flat indent leaves the reader counting pixels to
          work out what belongs to what. */}
      {children.length > 0 && (
        <div className="ml-3 border-l border-border pl-2">
          {children.map((child) => (
            <SubTree
              key={child.id}
              group={child}
              groups={groups}
              activeId={activeId}
              depth={depth + 1}
              go={go}
              editable={editable}
            />
          ))}
        </div>
      )}
    </>
  );
}
