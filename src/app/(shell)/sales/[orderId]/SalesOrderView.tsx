"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  DefinitionList,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Panel,
  Row,
  RowList,
  Select,
  Stat,
  StatRow,
  StateBadge,
} from "@/components/ui/primitives";
import { day, rupees, sheets } from "@/components/ui/business/format";
import { SALES_STATE, present } from "@/components/ui/business/states";
import { Related } from "@/components/ui/business/Related";
import { ActivityLog } from "@/components/ui/business/ActivityLog";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type Order = NonNullable<
  Awaited<ReturnType<typeof import("@/server/capabilities/plywood").salesOrderDetail.handler>>
>;

export function SalesOrderView({
  order,
  racks,
}: {
  order: Order;
  racks: Array<{ id: string; rackLabel: string }>;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [approving, setApproving] = useState(false);
  const [reason, setReason] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [rackId, setRackId] = useState("");
  const [collectedBy, setCollectedBy] = useState("");
  const [pending, startTransition] = useTransition();

  const state = present(SALES_STATE, order.state);
  const title = order.reference ?? `Sales order ${order.id.slice(0, 8)}`;

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, `/sales/${order.id}`);
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  return (
    <>
      <PageHeader
        title={title}
        description={`${order.customerName} · from ${order.locationName} · taken ${day(order.createdAt)}`}
        actions={
          <>
            {order.state === "pending_credit" && !approving && (
              <Button variant="primary" disabled={pending} onClick={() => setApproving(true)}>
                Review credit
              </Button>
            )}
            {order.state === "approved" && (
              <Button
                variant="primary"
                disabled={pending}
                onClick={() => run("verity.plywood.reserve_for_order", { orderId: order.id })}
              >
                Reserve stock
              </Button>
            )}
            {order.state === "dispatching" && !issuing && (
              <Button variant="primary" disabled={pending} onClick={() => setIssuing(true)}>
                Issue goods
              </Button>
            )}
            {order.state !== "completed" && order.state !== "cancelled" && (
              // §69 — cancelling after reservation releases the hold; it never
              // reverses stock that has already physically left. The command
              // enforces that, and the label should not promise otherwise.
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  run("verity.plywood.cancel_sales_order", {
                    orderId: order.id,
                    reason: "Cancelled from the order",
                  })
                }
              >
                Cancel order
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-5">
        {failure && (
          <ErrorState
            title="That was refused"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        )}

        <StatRow cols={4}>
          <Stat label="Ordered" value={order.qtyOrdered.toLocaleString("en-IN")} />
          <Stat
            label="Reserved"
            value={order.qtyReserved.toLocaleString("en-IN")}
            hint="Held, still in the godown"
          />
          <Stat
            label="Issued"
            value={order.qtyIssued.toLocaleString("en-IN")}
            hint="Physically gone"
          />
          <Stat label="Order value" value={rupees(order.totalPricePaise)} />
        </StatRow>

        <div className="flex items-center gap-3">
          <StateBadge category={state.category} label={state.label} />
        </div>

        {/* §41 — the block states the amount and names the customer, because
            "credit issue" tells an approver nothing they can act on. */}
        {order.state === "pending_credit" && (
          <div className="rounded-lg border border-warning/25 bg-warning-subtle px-5 py-4">
            <p className="m-0 text-[14px] text-text">
              {order.customerName} is {rupees(order.overLimitPaise)} above their credit headroom.
              Exposure {rupees(order.exposurePaise)} against a limit of{" "}
              {rupees(order.creditLimitPaise)}.
            </p>
            <p className="m-0 mt-1 text-[12px] text-text-tertiary">
              Nothing is reserved and no stock is committed until this is approved.
            </p>
          </div>
        )}

        {approving && (
          <Panel title="Approve beyond the credit limit">
            <div className="flex flex-col gap-4">
              <DefinitionList
                items={[
                  { term: "Credit limit", value: rupees(order.creditLimitPaise) },
                  { term: "Current exposure", value: rupees(order.exposurePaise) },
                  { term: "Over by", value: rupees(order.overLimitPaise) },
                  { term: "This order", value: rupees(order.totalPricePaise) },
                ]}
              />
              {/* §42 — the reason is recorded against the actor and the amount.
                  An override with no reason is an audit row that cannot be
                  explained a year later. */}
              <Field
                label="Reason"
                htmlFor="approve-reason"
                required
                hint="Recorded in the audit trail with your name and the amount"
              >
                <Input
                  id="approve-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Owner approved a temporary limit extension"
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  disabled={pending || reason.trim().length === 0}
                  onClick={() =>
                    run(
                      "verity.plywood.approve_credit",
                      { orderId: order.id, reason: reason.trim() },
                      () => {
                        setApproving(false);
                        setReason("");
                      },
                    )
                  }
                >
                  {pending ? "Approving…" : "Approve order"}
                </Button>
                <Button disabled={pending} onClick={() => setApproving(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Panel>
        )}

        {issuing && (
          <Panel title="Issue goods">
            <div className="flex flex-col gap-4">
              <p className="m-0 text-[13px] text-text-secondary">
                Issuing releases the reservation and takes the stock out of the godown. On-hand
                falls, reserved falls, available is unchanged — the sheets were already spoken for.
              </p>
              {racks.length > 0 && (
                <Field label="Rack" htmlFor="issue-rack" hint="Where it is being picked from">
                  <Select id="issue-rack" value={rackId} onChange={(e) => setRackId(e.target.value)}>
                    <option value="">Not recorded</option>
                    {racks.map((rack) => (
                      <option key={rack.id} value={rack.id}>
                        {rack.rackLabel}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Collected by" htmlFor="issue-collected" hint="Who took delivery">
                <Input
                  id="issue-collected"
                  value={collectedBy}
                  onChange={(event) => setCollectedBy(event.target.value)}
                />
              </Field>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  disabled={pending}
                  onClick={() =>
                    run(
                      "verity.plywood.dispatch_order",
                      {
                        orderId: order.id,
                        ...(rackId ? { rackId } : {}),
                        ...(collectedBy.trim() ? { collectedBy: collectedBy.trim() } : {}),
                      },
                      () => {
                        setIssuing(false);
                        setCollectedBy("");
                      },
                    )
                  }
                >
                  {pending ? "Issuing…" : "Issue everything outstanding"}
                </Button>
                <Button disabled={pending} onClick={() => setIssuing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Panel>
        )}

        <Panel flush title="Lines">
          <RowList>
            {order.lines.map((line) => (
              <Row key={line.productId}>
                <div className="min-w-0">
                  <Link
                    href={`/catalogue/${line.productId}`}
                    className="text-[14px] text-text no-underline hover:underline"
                  >
                    {line.name}
                  </Link>
                  <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                    HSN {line.hsnCode} · {rupees(line.unitPricePaise)} / sheet
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-8 text-right">
                  <div className="w-28">
                    <p className="tabular m-0 text-[14px] text-text">
                      {line.qtyOrdered} · {line.qtyReserved} · {line.qtyShipped}
                    </p>
                    <p className="m-0 text-[12px] text-text-tertiary">
                      Ordered · reserved · issued
                    </p>
                  </div>
                  <div className="w-24">
                    <p className="tabular m-0 text-[14px] text-text">{rupees(line.lineTotalPaise)}</p>
                    <p className="m-0 text-[12px] text-text-tertiary">Line total</p>
                  </div>
                </div>
              </Row>
            ))}
          </RowList>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel flush title="Goods issued">
            {order.issues.length === 0 ? (
              <div className="px-5 py-6">
                <EmptyState compact title="Nothing has left the godown" />
              </div>
            ) : (
              <RowList>
                {order.issues.map((issue) => (
                  <Row key={issue.id}>
                    <div className="min-w-0">
                      <span className="text-[14px] text-text">{issue.issueNumber}</span>
                      <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                        {day(issue.issuedAt)}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-[14px] text-text">
                      {sheets(issue.qtyUnits)}
                    </span>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>

          <Panel flush title="Finance">
            {order.invoices.length === 0 ? (
              <div className="px-5 py-6">
                {/* §39 — a sales order is not a receivable. */}
                <EmptyState
                  compact
                  title="Not yet invoiced"
                  description="Nothing is receivable until an invoice is raised. Raise it from Finance once goods have been issued."
                />
              </div>
            ) : (
              <RowList>
                {order.invoices.map((invoice) => (
                  <Row key={invoice.id}>
                    <div className="min-w-0">
                      <Link
                        href={`/finance/${invoice.id}`}
                        className="text-[14px] text-text no-underline hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                        {day(invoice.issuedAt)} · {rupees(invoice.paidPaise)} collected
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular m-0 text-[14px] text-text">{rupees(invoice.totalPaise)}</p>
                      <p className="m-0 text-[12px] text-text-tertiary">
                        {rupees(invoice.balancePaise)} outstanding
                      </p>
                    </div>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>
        </div>

        <ActivityLog entries={order.activity} />

        <Related
          links={[
            { href: `/customers/${order.customerId}`, label: "Customer", note: order.customerName },
            { href: `/godowns/${order.locationId}`, label: "Godown", note: order.locationName },
            { href: "/sales", label: "All sales" },
            { href: "/ledgers", label: "Customer ledger" },
          ]}
        />
      </div>
    </>
  );
}
