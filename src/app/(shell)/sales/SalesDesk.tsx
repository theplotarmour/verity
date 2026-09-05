"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Panel,
  StateBadge,
} from "@/components/ui/primitives";
import { day } from "@/components/ui/business/format";
import { NewCustomerModal } from "@/components/ui/business/NewCustomerModal";
import { NewSalesOrderForm, type SellableRow } from "./NewSalesOrderForm";
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type SalesOrder = {
  id: string;
  reference: string | null;
  customerId: string;
  customerName: string;
  state: string;
  totalPricePaise: number;
  orderedUnits: number;
  raisedAt: Date | string;
  summary: string;
  paymentTerms: string;
  taxExempt: boolean;
  taxExemptReason: string | null;
  amendable: boolean;
  editable: {
    locationId: string;
    customerId: string;
    lines: Array<{
      productId: string;
      qtyOrdered: number;
      unitPricePaise: number;
      listUnitPricePaise: number | null;
      discountBps: number;
    }>;
  };
};

type Customer = {
  id: string;
  displayName: string;
  gstin: string | null;
  phone: string | null;
  stateCode: string | null;
  creditLimitPaise: number;
  exposurePaise: number;
  active: boolean;
};

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/** Joins the missing prerequisites for one disabled action into "X, Y and Z". */
function joinPrereqs(parts: Array<ReactNode | false>): ReactNode | null {
  const present = parts.filter((p): p is ReactNode => p !== false);
  if (present.length === 0) return null;
  return present.map((part, i) => (
    <span key={i}>
      {i > 0 && (i === present.length - 1 ? " and " : ", ")}
      {part}
    </span>
  ));
}

function PrereqHint({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-right text-[12px] text-text-tertiary ${className ?? ""}`}
    >
      {children}
    </p>
  );
}

const STATE_LABEL: Record<string, string> = {
  draft: "Draft",
  // Retained so an order written before the credit gate was removed still
  // reads sensibly. Nothing produces this state any more.
  pending_credit: "Held for credit",
  approved: "Approved",
  dispatching: "Stock held",
  completed: "Dispatched",
  cancelled: "Cancelled",
};

/**
 * The categories the states declare (ADR-009). `pending_credit` is Blocked, not
 * Pending: the order is not waiting its turn, it is stopped until someone with
 * authority acts — and the badge should say so.
 */
const STATE_CATEGORY: Record<string, string> = {
  draft: "Draft",
  pending_credit: "Blocked",
  approved: "Pending",
  dispatching: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

/**
 * The selling desk.
 *
 * Orders lead; customers follow as a credit reference. The customer table shows
 * exposure against limit rather than a bare limit, because the number a
 * representative needs before promising anything is the headroom, not the
 * ceiling.
 */
export function SalesDesk({
  orders,
  customers,
  godowns,
  boards,
  sellable,
}: {
  orders: SalesOrder[];
  customers: Customer[];
  godowns: Array<{ id: string; name: string }>;
  boards: Array<{ id: string; label: string }>;
  sellable: SellableRow[];
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [newOrder, setNewOrder] = useState(false);
  const [amending, setAmending] = useState<SalesOrder | null>(null);
  const [newCustomer, setNewCustomer] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [creditFor, setCreditFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * Opens or closes a panel, clearing any standing failure first.
   *
   * Audit finding U1-5: a refusal banner stayed on screen while the user
   * cancelled, reopened a form and submitted again, so it described an action
   * two steps back and read as though the new one had failed too.
   */
  // The order the cancel panel is for, so the panel can name it rather than
  // appearing unattached below the table (U1-4).
  const cancellingOrder =
    orders.find((order) => order.id === cancelling) ?? null;

  function openPanel(change: () => void) {
    setFailure(null);
    change();
  }

  function run(
    key: string,
    input: unknown,
    after?: (data: unknown) => void,
  ) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/sales");
      if (result.ok) {
        after?.(result.data);
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  const canOrder =
    customers.length > 0 && godowns.length > 0 && boards.length > 0;

  const orderHint = joinPrereqs([
    customers.length === 0 && "a customer",
    godowns.length === 0 && (
      <>
        a godown in{" "}
        <Link href="/locations" className="text-accent-ink hover:underline">
          Locations
        </Link>
      </>
    ),
    boards.length === 0 && (
      <>
        a board in{" "}
        <Link href="/catalogue" className="text-accent-ink hover:underline">
          Catalogue
        </Link>
      </>
    ),
  ]);

  return (
    <>
      {failure && (
        <div className="mb-4">
          <ErrorState
            title="That was refused"
            message={failure.message}
            issues={failure.issues}
            retryable={failure.retryable}
          />
        </div>
      )}

      <div className="mb-1.5 flex flex-wrap justify-end gap-2">
        <Button onClick={() => openPanel(() => setNewCustomer(true))}>
          New customer
        </Button>
        {/* "Set a price" is NOT here any more. Agreeing prices is a rate card
            worked through in one sitting, which is what /prices is for; a
            one-at-a-time dialog on the selling desk was the reason those lists
            stayed empty. */}
        <Button
          variant="primary"
          disabled={!canOrder}
          onClick={() => openPanel(() => setNewOrder(true))}
        >
          New order
        </Button>
      </div>

      {orderHint && (
        <PrereqHint className="mb-4">New order needs {orderHint}.</PrereqHint>
      )}

      <NewCustomerModal
        open={newCustomer}
        pending={pending}
        onClose={() => setNewCustomer(false)}
        onSubmit={(input) =>
          run("verity.trading.create_customer", input, () =>
            setNewCustomer(false),
          )
        }
      />

      <NewSalesOrderForm
        open={amending !== null}
        editing={
          amending
            ? {
                id: amending.id,
                reference: amending.reference,
                customerId: amending.editable.customerId,
                locationId: amending.editable.locationId,
                paymentTerms: amending.paymentTerms,
                taxExempt: amending.taxExempt,
                taxExemptReason: amending.taxExemptReason,
                lines: amending.editable.lines,
              }
            : null
        }
        customers={customers.map((c) => ({
          id: c.id,
          displayName: c.displayName,
        }))}
        godowns={godowns}
        boards={boards}
        sellable={sellable}
        pending={pending}
        onCancel={() => setAmending(null)}
        onSubmit={(input) =>
          run("verity.trading.edit_sales_order", input, () => setAmending(null))
        }
      />

      {canOrder && (
        <NewSalesOrderForm
          open={newOrder}
          customers={customers.map((c) => ({
            id: c.id,
            displayName: c.displayName,
          }))}
          godowns={godowns}
          boards={boards}
          sellable={sellable}
          pending={pending}
          onCancel={() => setNewOrder(false)}
          onSubmit={(input) =>
            run("verity.trading.create_sales_order", input, () =>
              setNewOrder(false),
            )
          }
        />
      )}

      <div className="mb-4">
        <Panel title="Open orders" flush={orders.length === 0}>
          {orders.length === 0 ? (
            <EmptyState
              compact
              title="No open orders"
              description={
                canOrder
                  ? "Take an order and it stays here until it is dispatched."
                  : "Add a customer, a godown and a board first."
              }
            />
          ) : (
            <div className="-mx-3 overflow-x-auto px-3">
              <table className="w-full min-w-[720px] border-collapse">
                <caption className="sr-only">
                  Open sales orders. Quantities are units ordered.
                </caption>
                <thead>
                  <tr>
                    {["Order", "Board", "Status", "Ordered", "Value", ""].map(
                      (heading, index) => (
                        <th
                          key={heading || index}
                          className={
                            "whitespace-nowrap border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                            (index <= 1 ? "text-left" : "text-right")
                          }
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-accent-subtle/40">
                      <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                        {/* The order is the record; the desk is only a way in.
                          Every action worth taking has more context on the
                          order's own page than a table row can carry. */}
                        <Link
                          href={`/sales/${order.id}`}
                          className="whitespace-nowrap text-text no-underline hover:underline"
                        >
                          {order.reference ?? `Order ${order.id.slice(0, 8)}`}
                        </Link>
                        <span className="mt-0.5 block text-[12px] text-text-tertiary">
                          <Link
                            href={`/customers/${order.customerId}`}
                            className="text-text-tertiary no-underline hover:underline"
                          >
                            {order.customerName}
                          </Link>{" "}
                          · {day(order.raisedAt)}
                        </span>
                      </td>
                      {/* U2-2: what the order is for. */}
                      <td className="border-b border-line px-3 py-2 text-[14px] text-text-secondary">
                        {order.summary}
                      </td>
                      <td className="border-b border-line px-3 py-2">
                        <StateBadge
                          category={STATE_CATEGORY[order.state] ?? "Pending"}
                          label={STATE_LABEL[order.state] ?? order.state}
                        />
                      </td>
                      <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px] text-text-secondary">
                        {order.orderedUnits.toLocaleString("en-IN")}
                      </td>
                      <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px]">
                        {rupees(order.totalPricePaise)}
                      </td>
                      <td className="border-b border-line px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          {order.amendable && (
                            <Button
                              size="sm"
                              disabled={pending}
                              onClick={() => openPanel(() => setAmending(order))}
                            >
                              Edit
                            </Button>
                          )}
                          {order.state === "approved" && (
                            <Button
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                run("verity.trading.reserve_for_order", {
                                  orderId: order.id,
                                })
                              }
                            >
                              Hold stock for this
                            </Button>
                          )}
                          {order.state === "dispatching" && (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={pending}
                              onClick={() =>
                                run(
                                  "verity.trading.dispatch_order",
                                  { orderId: order.id },
                                  (data) => {
                                    // Requested: go straight to the invoice
                                    // this raised. The point of handing goods
                                    // over is the document that comes out of
                                    // it, and making someone find it again on
                                    // another screen is a step with no purpose.
                                    //
                                    // Only when one was actually raised: a
                                    // refused invoice — a customer with no
                                    // state code, a closed period — leaves the
                                    // desk where it is, with the refusal shown,
                                    // rather than navigating to nothing.
                                    const invoiceId = (
                                      data as {
                                        invoicing?: { id?: string } | null;
                                      } | null
                                    )?.invoicing?.id;
                                    if (invoiceId) {
                                      router.push(`/finance/${invoiceId}`);
                                    }
                                  },
                                )
                              }
                            >
                              Hand over &amp; invoice
                            </Button>
                          )}
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              openPanel(() =>
                                setCancelling(
                                  cancelling === order.id ? null : order.id,
                                ),
                              )
                            }
                          >
                            {cancelling === order.id
                              ? "Keep order"
                              : "Cancel order…"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cancelling && (
            <form
              className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
              action={(formData) =>
                run(
                  "verity.trading.cancel_sales_order",
                  {
                    orderId: cancelling,
                    reason: String(formData.get("reason") ?? ""),
                  },
                  () => setCancelling(null),
                )
              }
            >
              <div className="min-w-[320px] flex-1">
                <Field
                  label={`Why is ${cancellingOrder?.reference ?? "this order"} being cancelled?`}
                  htmlFor="cancel-so"
                  required
                >
                  <Input
                    id="cancel-so"
                    name="reason"
                    required
                    autoFocus
                    minLength={3}
                    placeholder="Customer changed their mind"
                  />
                </Field>
              </div>
              <Button type="submit" variant="danger" disabled={pending}>
                Cancel order
              </Button>
              <p className="m-0 w-full text-[12px] text-text-tertiary">
                Any stock held for this order is released in the same step.
                Stock held for an order nobody will fulfil is stock that cannot
                be sold.
              </p>
            </form>
          )}

        </Panel>
      </div>

      {/* The customers table is gone from this desk. It duplicated /customers,
          which is where anyone looking a customer up goes first, and a selling
          desk is for orders. Same reason the suppliers table left Purchases. */}
    </>
  );
}
