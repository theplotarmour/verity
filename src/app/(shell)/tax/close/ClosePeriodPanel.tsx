"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Panel, StatRow, Stat } from "@/components/ui/primitives";
import { runCommand } from "@/server/actions/platform";

type Checklist = {
  periodKey: string;
  state: string;
  salesInvoices: number;
  purchaseInvoices: number;
  blockers: Array<{ kind: string; detail: string; count: number }>;
  ready: boolean;
};

type Tax = {
  outputTaxPaise: number;
  inputTaxPaise: number;
  netPayablePaise: number;
};

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/**
 * The checklist names counts, not statuses.
 *
 * "3 GST mismatches" is something a person can go and do. "Not ready" is not,
 * and it is the reason month-end close screens get ignored.
 */
export function ClosePeriodPanel({ checklist, tax }: { checklist: Checklist; tax: Tax }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);

  function run(key: string, input: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      const result = await runCommand(key, input);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <StatRow>
        <Stat label="Output GST" value={rupees(tax.outputTaxPaise)} hint="Charged on sales" />
        <Stat label="Input GST" value={rupees(tax.inputTaxPaise)} hint="Claimable on purchases" />
        <Stat label="Net payable" value={rupees(tax.netPayablePaise)} hint="Output less input" />
      </StatRow>

      {error && (
        <p role="alert" className="m-0 text-[14px] text-semantic-danger">
          {error}
        </p>
      )}

      <Panel title={`${checklist.periodKey} — ${checklist.state === "closed" ? "Closed" : "Open"}`}>
        <p className="mt-0 text-[14px] text-text-secondary">
          {checklist.salesInvoices} sales invoice(s), {checklist.purchaseInvoices} purchase
          invoice(s) in this period.
        </p>

        {checklist.blockers.length === 0 ? (
          <p className="m-0 text-[15px] text-success">Nothing outstanding.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {checklist.blockers.map((blocker) => (
              <li key={blocker.kind} className="flex items-baseline gap-3 text-[15px]">
                <span className="tabular font-medium">{blocker.count}</span>
                <span className="text-text-secondary">{blocker.detail}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {checklist.state === "closed" ? (
            reopening ? (
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  run("verity.plywood.reopen_period", {
                    periodKey: checklist.periodKey,
                    reason: String(data.get("reason") ?? "").trim(),
                  });
                }}
              >
                <Field
                  htmlFor="reason"
                  label="Reason for reopening"
                  hint="Recorded against the period and in the audit trail. Reopening a reported month without a stated reason is the audit finding."
                >
                  <Input id="reason" name="reason" required minLength={3} />
                </Field>
                <Button type="submit" disabled={pending}>
                  Reopen {checklist.periodKey}
                </Button>
              </form>
            ) : (
              <Button variant="secondary" disabled={pending} onClick={() => setReopening(true)}>
                Reopen period
              </Button>
            )
          ) : (
            <>
              <Button
                disabled={pending}
                onClick={() =>
                  run("verity.plywood.close_period", { periodKey: checklist.periodKey })
                }
              >
                Close {checklist.periodKey}
              </Button>
              {checklist.blockers.length > 0 && (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    run("verity.plywood.close_period", {
                      periodKey: checklist.periodKey,
                      force: true,
                    })
                  }
                >
                  Close anyway, accepting {checklist.blockers.length} item(s)
                </Button>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
