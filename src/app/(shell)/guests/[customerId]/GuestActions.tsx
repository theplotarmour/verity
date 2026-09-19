"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, Input, Panel, Select, Textarea, EmptyState, Badge, RowList, Row } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;

export function GuestActions({
  customerId,
  balance,
  locations,
  complaints,
}: {
  customerId: string;
  balance: number;
  locations: Array<{ id: string; name: string }>;
  complaints: Array<{ id: string; category: string; severity: string; status: string; createdAt: string }>;
}) {
  const router = useRouter();
  const [redeemFailure, setRedeemFailure] = useState<ActionFailure | null>(null);
  const [complaintFailure, setComplaintFailure] = useState<ActionFailure | null>(null);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [pending, startTransition] = useTransition();

  function redeem(form: FormData) {
    setRedeemFailure(null);
    startTransition(async () => {
      const points = Number(form.get("points"));
      const result = await runCommand("verity.loyalty.redeem_points", { customerId, points }, `/guests/${customerId}`);
      if (result.ok) router.refresh();
      else setRedeemFailure(result);
    });
  }

  function fileComplaint(form: FormData) {
    setComplaintFailure(null);
    startTransition(async () => {
      const result = await runCommand(
        "verity.complaint.file_complaint",
        {
          customerId,
          locationId: String(form.get("locationId") ?? ""),
          category: String(form.get("category") ?? ""),
          severity: String(form.get("severity") ?? "Medium"),
          description: String(form.get("description") ?? ""),
        },
        `/guests/${customerId}`,
      );
      if (result.ok) {
        setShowComplaintForm(false);
        router.refresh();
      } else {
        setComplaintFailure(result);
      }
    });
  }

  return (
    <>
      <Panel title="Loyalty" className="mb-6">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            redeem(new FormData(e.currentTarget));
          }}
        >
          <Field label="Redeem points" htmlFor="points" hint={`${balance} available`}>
            <Input id="points" name="points" type="number" min={1} max={balance} required />
          </Field>
          <Button type="submit" disabled={pending || balance === 0}>
            {pending ? "Working…" : "Redeem"}
          </Button>
        </form>
        {redeemFailure && (
          <div className="mt-3">
            <ErrorState title="Could not redeem points" message={redeemFailure.message} issues={redeemFailure.issues} retryable={redeemFailure.retryable} />
          </div>
        )}
      </Panel>

      <Panel
        title="Complaints"
        className="mb-6"
        action={
          !showComplaintForm && locations.length > 0 ? (
            <Button size="sm" onClick={() => setShowComplaintForm(true)}>
              File complaint
            </Button>
          ) : undefined
        }
      >
        {showComplaintForm && (
          <form
            className="mb-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              fileComplaint(new FormData(e.currentTarget));
            }}
          >
            <Field label="Outlet" htmlFor="locationId" required>
              <Select id="locationId" name="locationId" required defaultValue={locations[0]?.id}>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Category" htmlFor="category" required>
              <Input id="category" name="category" required placeholder="e.g. Food quality" />
            </Field>
            <Field label="Severity" htmlFor="severity">
              <Select id="severity" name="severity" defaultValue="Medium">
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="description" required>
                <Textarea id="description" name="description" required rows={3} />
              </Field>
            </div>
            {complaintFailure && (
              <div className="sm:col-span-2">
                <ErrorState title="Could not file complaint" message={complaintFailure.message} issues={complaintFailure.issues} retryable={complaintFailure.retryable} />
              </div>
            )}
            <div className="flex items-center gap-2 sm:col-span-2">
              <Button type="submit" disabled={pending}>{pending ? "Saving…" : "File complaint"}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowComplaintForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {complaints.length === 0 ? (
          <EmptyState title="No complaints" description="This guest has no service issues on file." />
        ) : (
          <RowList>
            {complaints.map((c) => (
              <Row key={c.id}>
                <span className="text-text">{c.category}</span>
                <span className="text-text-tertiary text-[13px]">{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                <Badge tone={c.status === "Resolved" || c.status === "Closed" ? "neutral" : "accent"}>{c.status}</Badge>
              </Row>
            ))}
          </RowList>
        )}
      </Panel>
    </>
  );
}
