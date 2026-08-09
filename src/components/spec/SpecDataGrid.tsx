"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SpecFieldShape } from "./SpecFieldInput";
import type { SpecAnswer } from "@/lib/spec/types";
import { exportGroupCsv, templateGroupCsv, importGroupCsv } from "@/server/actions/specCsv";
import { promoteDraftItem } from "@/server/actions/itemDrafts";
import { deleteItem } from "@/server/actions/items";
import { EditableSpecCell } from "./EditableSpecCell";
import { UnitCell } from "./UnitCell";
import { ItemBomEditor } from "./ItemBomEditor";
import { ItemUnitsEditor } from "./ItemUnitsEditor";
import { confirmDialog } from "@/components/ui/dialog-service";
import { toast } from "@/components/ui/toast";

export type SpecRow = {
  id: string;
  name: string;
  units?: { primary: string; secondary: string | null; factor: number | null };
  itemCode: string | null;
  aliasName: string | null;
  status: string;
  /** Display strings keyed by field key, pre-resolved on the server. */
  cells: Record<string, string>;
  /** Raw answers behind those strings, so a cell can be edited in place. */
  answers?: Record<string, SpecAnswer>;
  /** BUY items have no recipe, so they get no BOM expander. */
  producible?: boolean;
};

/**
 * Data mode: the sheet's columns *are* the group's spec fields, so configuring
 * the group reshapes this grid without any code change.
 */
export function SpecDataGrid({
  fields,
  rows,
  groupId,
  groupName,
  editable = true,
  labels,
  aliasHidden = false,
  showUnits = false,
}: {
  fields: SpecFieldShape[];
  rows: SpecRow[];
  groupId: string;
  groupName: string;
  /**
   * False for record sheets (supplier, customer, design, colour…). Their rows
   * are not ItemMaster, so every item-shaped action here — delete, import,
   * cell edit, the item detail link — would be pointed at the wrong table.
   * They stay a searchable, exportable table; creation goes through the wizard.
   */
  editable?: boolean;
  /** Per-group headers for the built-in columns, resolved by the caller. */
  labels: { code: string; name: string; alias: string };
  aliasHidden?: boolean;
  /** Only categories that actually stock things have units worth a column. */
  showUnits?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [onlyDrafts, setOnlyDrafts] = useState(false);
  const [openBom, setOpenBom] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function saveFile(csv: string, filename: string) {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const slug = groupName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  async function removeRow(row: SpecRow) {
    const ok = await confirmDialog({
      title: `Delete ${row.name}?`,
      description:
        "This removes the item and its specification. An item used by a BOM, an order or stock history cannot be deleted — you will be told which.",
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    start(async () => {
      const result = await deleteItem(row.id);
      if ((result as { error?: string }).error) toast.error((result as { error: string }).error);
      else {
        toast.success(`${row.name} deleted`);
        router.refresh();
      }
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const csv = await file.text();
    e.target.value = ""; // allow re-selecting the same file

    // Always dry-run first: the owner sees every problem before a single row
    // is written.
    const dry = await importGroupCsv(groupId, csv, false);
    const preview = dry.issues
      .slice(0, 12)
      .map((i) => `Row ${i.row} · ${i.column}: ${i.message}`)
      .join("\n");
    const more = dry.issues.length > 12 ? `\n…and ${dry.issues.length - 12} more` : "";
    const ok = window.confirm(
      `${dry.created} row(s) will be created.\n` +
        `${dry.issues.length} issue(s).\n\n${preview}${more}\n\nProceed?`
    );
    if (!ok) return;

    start(async () => {
      const result = await importGroupCsv(groupId, csv, true);
      setNotice(`Imported ${result.created} row(s), ${result.issues.length} skipped.`);
      router.refresh();
    });
  }

  const draftCount = useMemo(() => rows.filter((r) => r.status === "DRAFT").length, [rows]);

  // Code, Name and Actions are always there; Alias can be turned off per group.
  const columnCount = (aliasHidden ? 3 : 4) + fields.length;

  const filtered = useMemo(() => {
    const base = onlyDrafts ? rows.filter((r) => r.status === "DRAFT") : rows;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) =>
      [r.name, r.aliasName, r.itemCode, ...Object.values(r.cells)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query, onlyDrafts]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-neutral-200 p-2 dark:border-neutral-800">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, alias, code or any field…"
          className="w-full min-w-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-80"
        />
        <span className="text-xs text-neutral-500">
          {filtered.length} of {rows.length}
        </span>
        {draftCount > 0 && (
          <button
            onClick={() => setOnlyDrafts((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs ${
              onlyDrafts ? "bg-amber-100 text-amber-800" : "text-neutral-500"
            }`}
          >
            Drafts only ({draftCount})
          </button>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs">
          <button
            onClick={() => exportGroupCsv(groupId).then((csv) => saveFile(csv, `${slug}.csv`))}
            className="hover:underline"
          >
            Export
          </button>
          {editable && (
            <button
              onClick={() =>
                templateGroupCsv(groupId).then((csv) => saveFile(csv, `${slug}-template.csv`))
              }
              className="hover:underline"
            >
              Template
            </button>
          )}
          {editable && <label className="cursor-pointer hover:underline">
            {pending ? "Importing…" : "Import"}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          </label>}
        </div>
      </div>

      {notice && (
        <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs dark:border-neutral-800 dark:bg-neutral-900">
          {notice}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-max min-w-full text-sm">
          <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="border-b px-3 py-2 text-left font-medium">{labels.code}</th>
              <th className="border-b px-3 py-2 text-left font-medium">{labels.name}</th>
              {!aliasHidden && (
                <th className="border-b px-3 py-2 text-left font-medium">{labels.alias}</th>
              )}
              {/* Units were set once in the Add form and then invisible: the
                  sheet showed a fabric's numbers without saying whether they
                  were metres or rolls. */}
              {showUnits && (
                <>
                  <th className="whitespace-nowrap border-b px-3 py-2 text-left font-medium">Stock unit</th>
                  <th className="whitespace-nowrap border-b px-3 py-2 text-left font-medium">Purchase unit</th>
                  <th className="whitespace-nowrap border-b px-3 py-2 text-left font-medium">Factor</th>
                </>
              )}
              {fields.map((f) => (
                <th
                  key={f.id}
                  className="whitespace-nowrap border-b px-3 py-2 text-left font-medium"
                >
                  {f.name}
                </th>
              ))}
              <th className="border-b px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.flatMap((r) => [
              <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                <td className="border-b px-3 py-1.5 font-mono text-xs">{r.itemCode}</td>
                <td className="whitespace-nowrap border-b px-3 py-1.5">
                  {/* Record rows are not items, so they have no item page. */}
                  {editable ? (
                    <Link
                      href={`/owner/settings/master-data/item/${r.id}`}
                      className="hover:underline"
                    >
                      {r.name}
                    </Link>
                  ) : (
                    r.name
                  )}
                  {r.status === "DRAFT" && (
                    <>
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        DRAFT
                      </span>
                      <button
                        onClick={() =>
                          start(async () => {
                            await promoteDraftItem(r.id);
                            router.refresh();
                          })
                        }
                        className="ml-2 text-[10px] text-neutral-500 hover:underline"
                      >
                        Promote
                      </button>
                    </>
                  )}
                </td>
                {!aliasHidden && (
                  <td className="border-b px-3 py-1.5 text-neutral-500">{r.aliasName}</td>
                )}
                {showUnits && (
                  <>
                    {(["primary", "secondary", "factor"] as const).map((which) => (
                      <td key={which} className="whitespace-nowrap border-b px-2 py-1.5 text-xs">
                        {editable && r.units ? (
                          <UnitCell itemId={r.id} units={r.units} which={which} />
                        ) : which === "primary" ? (
                          r.units?.primary ?? ""
                        ) : which === "secondary" ? (
                          r.units?.secondary ?? ""
                        ) : (
                          r.units?.factor ?? ""
                        )}
                      </td>
                    ))}
                  </>
                )}
                {fields.map((f) => (
                  <td key={f.id} className="whitespace-nowrap border-b px-3 py-1.5">
                    {/* Domain record sheets are read-only here. */}
                    {editable ? (
                      <EditableSpecCell
                        itemId={r.id}
                        field={f}
                        answer={r.answers?.[f.key] ?? {}}
                        display={r.cells[f.key] ?? ""}
                      />
                    ) : (
                      r.cells[f.key] ?? ""
                    )}
                  </td>
                ))}
                <td className="whitespace-nowrap border-b px-3 py-1.5 text-right">
                  {editable && r.producible !== false && (
                    <button
                      type="button"
                      onClick={() => setOpenBom((id) => (id === r.id ? null : r.id))}
                      className="mr-3 text-xs text-neutral-500 hover:underline"
                    >
                      Details {openBom === r.id ? "▲" : "▼"}
                    </button>
                  )}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => removeRow(r)}
                      disabled={pending}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>,
              openBom === r.id && (
                <tr key={`${r.id}-bom`}>
                  <td colSpan={columnCount} className="border-b px-3 py-3">
                    <div className="space-y-3">
                      <ItemUnitsEditor itemId={r.id} />
                      <ItemBomEditor itemId={r.id} itemName={r.name} />
                    </div>
                  </td>
                </tr>
              ),
            ])}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-3 py-8 text-center text-neutral-500"
                >
                  Nothing here yet. Use &ldquo;Add Master Data&rdquo; to create the first record.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
