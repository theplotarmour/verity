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
  Stat,
  StatRow,
  StateBadge,
} from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/Combobox";
import { day, rupees, sheets } from "@/components/ui/business/format";
import { SALES_STATE, present } from "@/components/ui/business/states";
import { Related } from "@/components/ui/business/Related";
import { ActivityLog } from "@/components/ui/business/ActivityLog";
import { runCommand } from "@/server/actions/platform";
import { ReserveStockModal } from "../ReserveStockModal";
import type { ActionFailure } from "@/server/platform/action-error";

type Order = NonNullable<
  Awaited<ReturnType<typeof import("@/server/capabilities/plywood").salesOrderDetail.handler>>
>;

export function SalesOrderView({
  order,
}: {
  order: Order;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [reason, setReason] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [collectedBy, setCollectedBy] = useState("");
  const [pending, startTransition] = useTransition();

  const state = present(SALES_STATE, order.state);
  const title = order.reference ?? `Sales order ${order.id.slice(0, 8)}`;

  function run(
    key: string,
    input: unknown,
    after?: (data: unknown) => void,
  ) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, `/sales/${order.id}`);
      if (result.ok) {
        after?.(result.data);
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  return (
    <>
      <ReserveStockModal
        orderId={reserving ? order.id : null}
        pending={pending}
        onClose={() => setReserving(false)}
        onConfirm={(allocations) =>
          run(
            "verity.trading.reserve_for_order",
            { orderId: order.id, allocations },
            () => setReserving(false),
          )
        }
      />

      <PageHeader
        title={title}
        description={`${order.customerName} · from ${order.locationName} · taken ${day(order.createdAt)}`}
        actions={
          <>
            {order.state === "approved" && (
              <Button
                variant="primary"
                disabled={pending}
                onClick={() => setReserving(true)}
              >
                Reserve stock
              </Button>
            )}
            {order.state === "dispatching" && !issuing && (
              <Button variant="primary" disabled={pending} onClick={() => setIssuing(true)}>
                Issue goods
              </Button>
            )}
            {/* §49 — raise the invoice from the order it is for.
                Prefilled by construction: the command takes only the order id
                and reads the customer, their GSTIN, the place of supply, the
                lines and the snapshotted rate off it, so there is nothing to
                retype. §50's checks — tax identity, HSN, place of supply, rate
                in force, series, financial year — all run inside the command,
                which is why this is a button and not a form. A form here would
                be a second place those rules could drift. */}
            {order.qtyIssued > 0 && order.invoices.length === 0 && (
              <Button
                variant="primary"
                disabled={pending}
                onClick={() =>
                  run("verity.trading.raise_sales_invoice", { salesOrderId: order.id })
                }
              >
                Raise invoice
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
                  run("verity.trading.cancel_sales_order", {
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

        {/* The credit-approval block and its override form are gone with the
            gate itself: an order is no longer held for approval, it records
            whether the money is already in hand. The customer's exposure and
            headroom are still shown on their own page — the figure is there to
            look at, it simply no longer blocks anything. */}

        {issuing && (
          <Panel title="Issue goods">
            <div className="flex flex-col gap-4">
              <p className="m-0 text-[13px] text-text-secondary">
                Issuing releases the reservation and takes the stock out of the godown. On-hand
                falls, reserved falls, available is unchanged — the sheets were already spoken for.
              </p>
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
                      "verity.trading.dispatch_order",
                      {
                        orderId: order.id,
                        ...(collectedBy.trim() ? { collectedBy: collectedBy.trim() } : {}),
                      },
                      (data) => {
                        setIssuing(false);
                        setCollectedBy("");
                        // Straight to the invoice this raised, when it raised
                        // one. A refused invoice leaves the page where it is,
                        // with the reason on screen, rather than navigating to
                        // a document that does not exist.
                        const invoiceId = (
                          data as { invoicing?: { id?: string } | null } | null
                        )?.invoicing?.id;
                        if (invoiceId) router.push(`/finance/${invoiceId}`);
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
                  description={
                    order.qtyIssued > 0
                      ? "Nothing is receivable until an invoice is raised. Raise it from the button above."
                      : "Nothing is receivable until an invoice is raised, and nothing can be invoiced until goods have been issued."
                  }
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
