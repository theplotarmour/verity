"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";

type OwnerOption = { id: string; name: string };
type Row = { id: string; companyName: string; teamId: string; ownerId: string };

/**
 * Prospect-list bulk-action bar (Task 114 P1.5 item 2). Selection lives in
 * `DataTable`; this only renders the three actions the review actually
 * described that have a safe, existing command to run per lead:
 * reassign owner, add a task, export to CSV.
 *
 * Deliberately NOT included, per the review's own list:
 * - Bulk stage-move — every lead's set of legal transitions differs (the
 *   command runtime derives it from the lead's own current state), so a
 *   single target state picked for a mixed selection would silently fail
 *   for whichever rows can't legally reach it. Needs its own UX (probably
 *   "advance to the next stage each is eligible for", not one target
 *   picked up front) — flagged, not built blind.
 * - Bulk health update — health is derived (`deriveLeadHealth`), never
 *   stored, so there is nothing to write.
 */
export function BulkActionBar({
  selectedIds,
  rows,
  owners,
  clear,
}: {
  selectedIds: string[];
  rows: Row[];
  owners: OwnerOption[];
  clear: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"assign" | "task" | null>(null);
  const [newOwnerId, setNewOwnerId] = useState(owners[0]?.id ?? "");
  const [taskTitle, setTaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function exportCsv() {
    const selected = rows.filter((r) => selectedIds.includes(r.id));
    const header = "Company\n";
    const body = selected.map((r) => `"${r.companyName.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function runBulk(commandKey: string, buildInput: (row: Row) => Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
      const results = await Promise.all(selectedRows.map((row) => runCommand(commandKey, buildInput(row))));
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) setError(`${failed} of ${selectedIds.length} failed — the rest were applied.`);
      setMode(null);
      clear();
      router.refresh();
    });
  }

  if (mode === "assign") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)}>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          disabled={pending || !newOwnerId}
          onClick={() => runBulk("verity.outreach.reassign_owner", (row) => ({ leadId: row.id, newOwnerId }))}
        >
          {pending ? "Assigning…" : `Assign ${selectedIds.length}`}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setMode(null)}>
          Cancel
        </Button>
      </div>
    );
  }

  if (mode === "task") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-48">
          <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" />
        </div>
        <Button
          size="sm"
          disabled={pending || !taskTitle.trim()}
          onClick={() =>
            runBulk("verity.outreach.create_task", (row) => ({
              leadId: row.id,
              teamId: row.teamId,
              assignedToPartyId: row.ownerId,
              title: taskTitle.trim(),
              priority: "Medium",
            }))
          }
        >
          {pending ? "Adding…" : `Add to ${selectedIds.length}`}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setMode(null)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {owners.length > 0 && (
        <Button size="sm" variant="secondary" onClick={() => setMode("assign")}>
          Assign
        </Button>
      )}
      <Button size="sm" variant="secondary" onClick={() => setMode("task")}>
        Add task
      </Button>
      <Button size="sm" variant="secondary" onClick={exportCsv}>
        Export CSV
      </Button>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </div>
  );
}
