"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ErrorState, Panel, RowList, Row, Select } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const STATUSES = ["Present", "Late", "Absent", "OnLeave"] as const;

export function AttendanceBoard({ today, employees }: { today: string; employees: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  function mark(employeeId: string, status: string) {
    setFailure(null);
    startTransition(async () => {
      const now = new Date().toISOString();
      const result = await runCommand(
        "verity.attendance.record_attendance",
        { employeeId, date: today, status, checkInAt: status === "Present" || status === "Late" ? now : undefined },
        "/attendance",
      );
      if (result.ok) router.refresh();
      else setFailure(result);
    });
  }

  if (employees.length === 0) {
    return <Panel title="Team"><p className="m-0 text-[13px] text-text-tertiary">No active employees registered.</p></Panel>;
  }

  return (
    <Panel title="Team" flush>
      <RowList>
        {employees.map((e) => (
          <Row key={e.id} className="items-center justify-between">
            <span className="text-text">{e.name}</span>
            <Select
              defaultValue=""
              disabled={pending}
              onChange={(ev) => mark(e.id, ev.target.value)}
              className="w-36"
            >
              <option value="" disabled>Mark…</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Row>
        ))}
      </RowList>
      {failure && (
        <div className="p-4">
          <ErrorState title="Could not record attendance" message={failure.message} issues={failure.issues} retryable={failure.retryable} />
        </div>
      )}
    </Panel>
  );
}
