"use client";

import { useState, useTransition } from "react";
import { Button, ErrorState, Field, Input, Panel, Select, Textarea, DefinitionList } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

function formatRupees(minor: number): string {
  return (minor / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export function CashReconciliationForm({ locations }: { locations: Array<{ id: string; name: string }> }) {
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [result, setResult] = useState<{ expectedCashMinor: number; varianceMinor: number } | null>(null);
  const [needsNote, setNeedsNote] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(form: FormData) {
    setFailure(null);
    startTransition(async () => {
      const varianceNote = String(form.get("varianceNote") ?? "") || undefined;
      const outcome = await runCommand<{ id: string; expectedCashMinor: number; varianceMinor: number }>(
        "verity.finance.record_cash_reconciliation",
        {
          locationId: String(form.get("locationId") ?? ""),
          date: String(form.get("date") ?? ""),
          openingCashMinor: Number(form.get("openingCash")) * 100,
          cashWithdrawnMinor: Number(form.get("cashWithdrawn") || 0) * 100,
          actualCashMinor: Number(form.get("actualCash")) * 100,
          varianceNote,
        },
      );
      if (outcome.ok) {
        setResult(outcome.data);
        setNeedsNote(false);
      } else if (outcome.message.includes("variance requires an explanation")) {
        setNeedsNote(true);
        setFailure(null);
      } else {
        setFailure(outcome);
      }
    });
  }

  return (
    <Panel title="Reconcile today's till">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(new FormData(e.currentTarget));
        }}
      >
        <Field label="Outlet" htmlFor="locationId" required>
          <Select id="locationId" name="locationId" required defaultValue={locations[0]?.id}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </Field>
        <Field label="Date" htmlFor="date" required>
          <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label="Opening cash (₹)" htmlFor="openingCash" required>
          <Input id="openingCash" name="openingCash" type="number" min={0} required />
        </Field>
        <Field label="Cash withdrawn (₹)" htmlFor="cashWithdrawn" hint="Optional">
          <Input id="cashWithdrawn" name="cashWithdrawn" type="number" min={0} />
        </Field>
        <Field label="Actual cash counted (₹)" htmlFor="actualCash" required>
          <Input id="actualCash" name="actualCash" type="number" min={0} required />
        </Field>
        {needsNote && (
          <div className="sm:col-span-2">
            <Field label="Variance explanation" htmlFor="varianceNote" required hint="Actual and expected cash don't match — say why">
              <Textarea id="varianceNote" name="varianceNote" rows={2} required />
            </Field>
          </div>
        )}
        {failure && <div className="sm:col-span-2"><ErrorState title="Could not reconcile" message={failure.message} issues={failure.issues} retryable={failure.retryable} /></div>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Reconcile"}</Button>
        </div>
      </form>
      {result && (
        <div className="mt-6 border-t border-line pt-4">
          <DefinitionList
            items={[
              { term: "Expected cash", value: formatRupees(result.expectedCashMinor) },
              { term: "Variance", value: formatRupees(result.varianceMinor) },
            ]}
          />
        </div>
      )}
    </Panel>
  );
}
