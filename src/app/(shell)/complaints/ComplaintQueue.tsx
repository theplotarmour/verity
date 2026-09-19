"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, ErrorState, Field, Panel, RowList, Row, Select, Textarea } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const STATUSES = ["New", "Assigned", "InProgress", "AwaitingCustomer", "Resolved", "Closed"] as const;

type ComplaintRow = { id: string; category: string; severity: string; status: string; createdAt: string };

function severityTone(severity: string): "neutral" | "accent" {
  return severity === "Critical" || severity === "High" ? "accent" : "neutral";
}

function ComplaintRowActions({ complaint }: { complaint: ComplaintRow }) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [resolving, setResolving] = useState(false);
  const [pending, startTransition] = useTransition();

  const closed = complaint.status === "Closed";

  function setStatus(status: string) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand("verity.complaint.update_status", { complaintId: complaint.id, status }, "/complaints");
      if (result.ok) router.refresh();
      else setFailure(result);
    });
  }

  function resolve(form: FormData) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(
        "verity.complaint.resolve",
        { complaintId: complaint.id, resolution: String(form.get("resolution") ?? "") },
        "/complaints",
      );
      if (result.ok) {
        setResolving(false);
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!closed && !resolving && (
        <div className="flex items-center gap-2">
          <Select value={complaint.status} disabled={pending} onChange={(e) => setStatus(e.target.value)} className="w-40">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          {complaint.status !== "Resolved" && (
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => setResolving(true)}>
              Resolve
            </Button>
          )}
        </div>
      )}
      {resolving && (
        <form
          className="flex w-72 flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            resolve(new FormData(e.currentTarget));
          }}
        >
          <Field label="Resolution" htmlFor={`resolution-${complaint.id}`} required>
            <Textarea id={`resolution-${complaint.id}`} name="resolution" required rows={2} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setResolving(false)}>Cancel</Button>
          </div>
        </form>
      )}
      {failure && <ErrorState title="Could not update complaint" message={failure.message} issues={failure.issues} retryable={failure.retryable} />}
    </div>
  );
}

export function ComplaintQueue({ complaints }: { complaints: ComplaintRow[] }) {
  if (complaints.length === 0) {
    return <Panel title="Complaints"><p className="m-0 text-[13px] text-text-tertiary">No complaints filed yet.</p></Panel>;
  }
  return (
    <Panel title="Complaints" flush>
      <RowList>
        {complaints.map((c) => (
          <Row key={c.id} className="items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-text">{c.category}</span>
              <span className="text-text-tertiary text-[13px]">{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
              <Badge tone={severityTone(c.severity)}>{c.severity}</Badge>
            </div>
            <ComplaintRowActions complaint={c} />
          </Row>
        ))}
      </RowList>
    </Panel>
  );
}
