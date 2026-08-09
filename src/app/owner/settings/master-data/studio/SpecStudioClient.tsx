"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Database, FileSpreadsheet, X } from "lucide-react";
import { SpecDataGrid } from "@/components/spec/SpecDataGrid";
import { SpecFieldEditor } from "@/components/spec/SpecFieldEditor";
import type { SpecFieldShape } from "@/components/spec/SpecFieldInput";
import type { SpecRow } from "@/server/queries/spec";
import { createItemGroup, updateGroupTemplates, createRootGroup } from "@/server/actions/itemGroups";
import { toast } from "@/components/ui/toast";
import { ColumnStrip } from "@/components/spec/ColumnStrip";
import { CategorySettings } from "@/components/spec/CategorySettings";
import { resolveColumnLabels } from "@/lib/spec/columns";
import { AddMasterDataClient } from "../add/AddMasterDataClient";
import { TemplatesStudioTab } from "@/components/spec/TemplatesStudioTab";
import { SubTree } from "./SubTree";
import { MobileGroupRail } from "./MobileGroupRail";

type Group = {
  id: string;
  name: string;
  parentId: string | null;
  itemType: string;
  isSheet: boolean;
  nameTemplate: string | null;
  codeTemplate: string | null;
  codeLabel: string | null;
  nameLabel: string | null;
  aliasLabel: string | null;
  aliasHidden: boolean;
  hasInventoryUnits?: boolean;
  bomMode?: "OFF" | "RECIPE" | "INGREDIENTS";
  isSystem?: boolean;
};

export function SpecStudioClient({
  groups,
  activeGroupId,
  mode,
  fields,
  rows,
  basePath = "/owner/master-data",
  initialAddOpen = false,
  activeTab = "groups",
}: {
  groups: Group[];
  activeGroupId: string;
  mode: "data" | "configure";
  fields: SpecFieldShape[];
  rows: SpecRow[];
  basePath?: string;
  initialAddOpen?: boolean;
  activeTab?: "groups" | "templates";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [newSub, setNewSub] = useState("");
  const [newRoot, setNewRoot] = useState<string | null>(null);
  const [showAddWizard, setShowAddWizard] = useState(initialAddOpen);

  const active = groups.find((g) => g.id === activeGroupId) ?? groups.find((g) => !g.parentId) ?? groups[0];
  const roots = groups.filter((g) => !g.parentId);

  // The root this group belongs to, so the subgroup rail stays visible while
  // drilled in.
  const rootOf = (g: Group): Group => {
    let cur = g;
    let guard = groups.length + 1;
    while (cur.parentId && guard-- > 0) {
      cur = groups.find((x) => x.id === cur.parentId) ?? cur;
    }
    return cur;
  };
  const activeRoot = rootOf(active);
  // No category is special any more. Suppliers, customers, warehouses and staff
  // used to be tabs here, which is why this file was full of branches stopping
  // item-shaped actions from firing at tables that are not ItemMaster. They have
  // their own screens now, so every tab is a category holding items and every
  // one behaves identically.
  const topLevel = groups.filter((g) => g.parentId === activeRoot.id);

  const go = (groupId: string, nextMode: string = mode) =>
    router.push(`${basePath}?group=${groupId}&mode=${nextMode}`);
  const goTemplates = () => router.push(`${basePath}?group=${active.id}&tab=templates`);

  function addRoot() {
    const name = (newRoot ?? "").trim();
    if (!name) return;
    start(async () => {
      const result = await createRootGroup({ name });
      if ("error" in result || !result.id) {
        toast.error(("error" in result && result.error) || "Could not create the category");
        return;
      }
      setNewRoot(null);
      // Straight into Configure: a brand-new category has no columns, and
      // setting them — along with its Kind — is the only useful next step.
      go(result.id, "configure");
      router.refresh();
    });
  }

  function addSubgroup() {
    if (!newSub.trim()) return;
    start(async () => {
      await createItemGroup({
        name: newSub,
        itemType: "RAW_MATERIAL", // overwritten server-side from the parent
        // Parented to whatever is selected, not always the root — otherwise
        // there is no way to build a third level at all.
        parentId: active.id,
      });
      setNewSub("");
      router.refresh();
    });
  }

  // Built once and rendered in both rails, so creating a subcategory works the
  // same way whichever one the owner is looking at. Configure only: structure
  // is edited there, Data mode reads.
  const canAddSubgroup = mode === "configure";
  const subgroupInput = (
    <div className="flex gap-1">
      <input
        value={newSub}
        onChange={(e) => setNewSub(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && addSubgroup()}
        placeholder={active.id === activeRoot.id ? "New subgroup" : `New under ${active.name}`}
        title={`Creates a subcategory inside ${active.name}`}
        className="h-9 w-full rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]"
      />
      <button
        onClick={addSubgroup}
        disabled={pending}
        className="h-9 shrink-0 rounded-xl border border-border bg-surface px-3 text-xs font-bold text-text-primary transition hover:bg-surface-secondary disabled:opacity-50"
      >
        +
      </button>
    </div>
  );

  return (
    // On a phone the studio flows with the page and the mobile shell scrolls it;
    // pinning it to the viewport there left a squeezed inner pane inside an
    // already-scrolling one.
    <div className="relative flex min-h-[70dvh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface text-text-primary md:h-[calc(100vh-96px)] md:min-h-[560px]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-secondary/40 px-4 py-3 dark:bg-neutral-800/20 md:px-6 md:py-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-text-primary">Master Data Studio</h3>
            {/* The strapline is orientation for a first visit, not something to
                cost three lines of a phone screen. */}
            <p className="hidden text-[10px] text-text-secondary sm:block">
              Configure blueprints, then create records through Add Master Data.
            </p>
          </div>
        </div>
        {/* Mode switch and Add live here, in the fixed header beside the studio
            badge. In the tab strip they scrolled away with the tabs. */}
        <div className="flex items-center gap-2 md:gap-3">
          {activeTab === "groups" && (
            <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
              {(["data", "configure"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => go(active.id, m)}
                  className={`h-8 px-3 text-xs font-bold transition ${
                    mode === m
                      ? "bg-[var(--brand)] text-white"
                      : "text-text-secondary hover:bg-surface-secondary/60 hover:text-text-primary"
                  }`}
                >
                  {m === "data" ? "Data" : "Configure"}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAddWizard(true)}
            className="h-8 shrink-0 rounded-lg bg-[var(--brand)] px-3 text-xs font-bold text-white shadow-sm transition hover:opacity-90 md:px-4"
          >
            {/* "+ Add" on a phone; the full label needs room the header
                does not have there. */}
            <span className="md:hidden">+ Add</span>
            <span className="hidden md:inline">+ Add Master Data</span>
          </button>
          {/* Decoration and a close button that duplicates the bottom nav —
              both are desktop-only affordances. */}
          <div className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[10px] font-bold text-text-tertiary lg:flex">
            <Database className="h-3.5 w-3.5 text-success" />
            Blueprint Studio
          </div>
          <button
            type="button"
            onClick={() => router.push("/owner/dashboard")}
            className="hidden rounded-full p-1.5 text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary md:block"
            aria-label="Close studio"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
      {/* Root tabs: these come from ItemGroup, so adding a group adds a tab. */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-border/40 bg-surface-secondary/10 px-4 py-2 md:px-6">
        {roots.map((g) => (
          <button
            key={g.id}
            onClick={() => go(g.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              g.id === activeRoot.id
                ? "bg-brand-soft text-[var(--brand)]"
                : "text-text-secondary hover:bg-surface-secondary/60 hover:text-text-primary"
            }`}
          >
            {g.name}
          </button>
        ))}
        {/* Roots are not special in the schema — a new one gets the subcategory
            tree, Configure mode and data grid for free. */}
        {newRoot === null ? (
          <button
            onClick={() => setNewRoot("")}
            title="Add a top-level category"
            className="whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-bold text-text-tertiary transition hover:bg-surface-secondary/60 hover:text-text-primary"
          >
            ＋
          </button>
        ) : (
          <span className="flex shrink-0 items-center gap-1">
            <input
              autoFocus
              value={newRoot}
              onChange={(e) => setNewRoot(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addRoot();
                if (e.key === "Escape") setNewRoot(null);
              }}
              placeholder="New category"
              className="h-8 w-36 rounded-lg border border-border bg-surface px-2 text-xs font-semibold text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]"
            />
            <button
              onClick={addRoot}
              disabled={pending || !newRoot.trim()}
              className="h-8 rounded-lg bg-[var(--brand)] px-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => setNewRoot(null)}
              className="h-8 px-1 text-xs text-text-tertiary hover:text-text-primary"
            >
              ✕
            </button>
          </span>
        )}

        <button
          onClick={goTemplates}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            activeTab === "templates"
              ? "bg-brand-soft text-[var(--brand)]"
              : "text-text-secondary hover:bg-surface-secondary/60 hover:text-text-primary"
          }`}
        >
          Checklists
        </button>
      </div>

      {/* The tree, for a phone: a breadcrumb and one scrolling row rather than
          a 224px column that would leave a sliver for the sheet itself. */}
      {activeTab === "groups" && (
        <MobileGroupRail
          groups={groups}
          active={active}
          go={(id) => go(id)}
          adding={canAddSubgroup ? subgroupInput : undefined}
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col bg-surface-secondary/20 md:flex-row">
        {activeTab === "groups" && <aside className="hidden w-56 shrink-0 overflow-auto border-r border-border bg-surface/70 p-3 md:block">
          <button
            onClick={() => go(activeRoot.id)}
            className={`mb-1 block w-full rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
              active.id === activeRoot.id
                ? "bg-brand-soft text-[var(--brand)]"
                : "text-text-secondary hover:bg-surface-secondary/60 hover:text-text-primary"
            }`}
          >
            All {activeRoot.name}
          </button>
          {topLevel.map((g) => (
            <SubTree
              key={g.id}
              group={g}
              groups={groups}
              activeId={active.id}
              depth={0}
              go={go}
              // Structure is edited in Configure mode; Data mode reads.
              editable={mode === "configure"}
            />
          ))}
          {canAddSubgroup && <div className="mt-3">{subgroupInput}</div>}
        </aside>}

        <main className="min-w-0 flex-1 bg-surface-secondary/20">
          {activeTab === "templates" ? (
            <TemplatesStudioTab />
          ) : mode === "data" ? (
            // Keyed for the same reason as Configure below: a search typed for
            // one sheet, or a drafts filter, should not carry over and quietly
            // hide rows on the next one.
            <SpecDataGrid
              showUnits={(active as any)?.hasInventoryUnits !== false}
              key={active.id}
              fields={fields}
              rows={rows}
              groupId={active.id}
              groupName={active.name}
              labels={resolveColumnLabels(active)}
              aliasHidden={active.aliasHidden}
            />
          ) : (
            // Keyed by category so switching tabs remounts the whole panel.
            // Several children below seed useState from their props — the name
            // and Kind here, the two naming templates, a column card's rename
            // draft — and React only runs an initialiser on mount. Without this
            // the heading followed the new category while the fields underneath
            // still held the old one's values, ready to save them over it.
            <div key={active.id} className="h-full overflow-auto bg-surface-secondary/20">
              <CategorySettings
                group={{
                  id: active.id,
                  name: active.name,
                  itemType: active.itemType,
                  isRoot: !active.parentId,
                  aliasHidden: active.aliasHidden,
                  hasInventoryUnits: (active as any).hasInventoryUnits !== false,
                  bomMode: (active as any).bomMode ?? "OFF",
                  // Seeded roots (Finished Good, Raw Material, ...) drive order
                  // booking, stock and production, so they are not deletable or
                  // retypeable — only renameable.
                  isBuiltIn: !!(active as any).isSystem,
                }}
              />
              <ColumnStrip
                group={active}
                groups={groups.map((g) => ({ id: g.id, name: g.name }))}
                fields={fields}
                onGo={(groupId) => go(groupId, "configure")}
              />
              <TemplateEditor group={active} fields={fields} />
              <SpecFieldEditor
                group={active}
                fields={fields}
                // The whole tree, so a link can point at any category,
                // subcategory or record sheet in it.
                allGroups={groups.map((g) => ({
                  id: g.id,
                  name: g.name,
                  parentId: g.parentId,
                }))}
              />
            </div>
          )}
        </main>
      </div>
      {showAddWizard && (
        <div
          // A real dialog: it traps the reader on the wizard rather than the
          // studio behind it, and gives assistive tech (and tests) something to
          // scope to.
          role="dialog"
          aria-modal="true"
          aria-label="Add Master Data"
          className="fixed inset-0 z-[99999] bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface-secondary/40 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-text-primary">Add Master Data</h2>
                <p className="text-[10px] text-text-secondary">
                  Create records through the blueprint configured in Master Data Studio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWizard(false)}
                className="rounded-full px-3 py-1.5 text-sm text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
              >
                Close
              </button>
            </div>
            <AddMasterDataClient
              groups={groups}
              embedded
              onCancel={() => setShowAddWizard(false)}
              onSaved={(savedGroupId) => {
                setShowAddWizard(false);
                router.push(`${basePath}?group=${savedGroupId}`);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
      <div className="flex shrink-0 items-center justify-between border-t border-border bg-surface-secondary/60 px-6 py-2 text-[10px] font-bold tracking-wide text-text-tertiary dark:bg-neutral-800/10">
        <span>{rows.length.toLocaleString()} Rows</span>
        <span>{active.name} Blueprint</span>
      </div>
    </div>
  );
}

/**
 * The label and code templates for a group. Tokens are shown inline so the owner
 * can see which ones exist without memorising them.
 */
function TemplateEditor({ group, fields }: { group: Group; fields: SpecFieldShape[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nameTemplate, setNameTemplate] = useState(group.nameTemplate ?? "");
  const [codeTemplate, setCodeTemplate] = useState(group.codeTemplate ?? "");
  // What is on the server right now. The button greys until an edit diverges
  // from this, and moves back once the save lands, so it never invites a
  // redundant write of the same templates.
  const [saved, setSaved] = useState({ name: group.nameTemplate ?? "", code: group.codeTemplate ?? "" });
  const dirty = nameTemplate !== saved.name || codeTemplate !== saved.code;

  const control =
    "w-full rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm text-text-primary outline-none focus:ring-1 focus:ring-[var(--brand)]";

  return (
    <section className="space-y-3 border-b border-border p-4">
      <h3 className="text-sm font-semibold text-text-primary">Naming</h3>
      <p className="text-xs text-text-secondary">
        Available tokens:{" "}
        <code>{"{group}"}</code>
        {fields.map((f) => (
          <code key={f.id} className="ml-1">{`{${f.key}}`}</code>
        ))}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Label template</label>
          <input
            value={nameTemplate}
            onChange={(e) => setNameTemplate(e.target.value)}
            placeholder="{group} {brand} {model}"
            className={control}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Code template</label>
          <input
            value={codeTemplate}
            onChange={(e) => setCodeTemplate(e.target.value)}
            placeholder="{group}-{brand}-{model}"
            className={control}
          />
        </div>
      </div>
      <button
        onClick={() =>
          start(async () => {
            await updateGroupTemplates(group.id, { nameTemplate, codeTemplate });
            setSaved({ name: nameTemplate, code: codeTemplate });
            toast.success("Naming templates saved");
            router.refresh();
          })
        }
        disabled={pending || !dirty}
        className="rounded-xl bg-[var(--brand)] px-4 py-1.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Saving…" : dirty ? "Save templates" : "Saved"}
      </button>
      <p className="text-xs text-text-secondary">
        Editing a template changes what future items are called; existing labels are stored,
        not recomputed, so they stay as they are.
      </p>
    </section>
  );
}
