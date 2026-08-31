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
  Select,
  StateBadge,
} from "@/components/ui/primitives";
import { day, sheets } from "@/components/ui/business/format";
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

function PrereqHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={`text-right text-[12px] text-text-tertiary ${className ?? ""}`}>{children}</p>;
}

const STATE_LABEL: Record<string, string> = {
  draft: "Draft",
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
  const [newCustomer, setNewCustomer] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [pricing, setPricing] = useState(false);
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
  const cancellingOrder = orders.find((order) => order.id === cancelling) ?? null;

  function openPanel(change: () => void) {
    setFailure(null);
    change();
  }

  function run(key: string, input: unknown, after?: () => void) {
    setFailure(null);
    startTransition(async () => {
      const result = await runCommand(key, input, "/sales");
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  const canOrder = customers.length > 0 && godowns.length > 0 && boards.length > 0;

  const priceHint = joinPrereqs([
    customers.length === 0 && "a customer",
    boards.length === 0 && <>a board in <Link href="/catalogue" className="text-accent-ink hover:underline">Catalogue</Link></>,
  ]);
  const orderHint = joinPrereqs([
    customers.length === 0 && "a customer",
    godowns.length === 0 && <>a godown in <Link href="/locations" className="text-accent-ink hover:underline">Locations</Link></>,
    boards.length === 0 && <>a board in <Link href="/catalogue" className="text-accent-ink hover:underline">Catalogue</Link></>,
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
        <Button onClick={() => setNewCustomer((open) => !open)}>
          {newCustomer ? "Cancel" : "New customer"}
        </Button>
        <Button
          disabled={customers.length === 0 || boards.length === 0}
          onClick={() => setPricing((open) => !open)}
        >
          {pricing ? "Cancel" : "Set a price"}
        </Button>
        <Button variant="primary" disabled={!canOrder} onClick={() => setNewOrder((o) => !o)}>
          {newOrder ? "Cancel" : "New order"}
        </Button>
      </div>

      {priceHint && <PrereqHint className="mb-1.5">Set a price needs {priceHint}.</PrereqHint>}
      {orderHint && <PrereqHint className="mb-4">New order needs {orderHint}.</PrereqHint>}

      {pricing && (
        <div className="mb-6">
          <Panel title="A customer's price for a board">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.plywood.set_customer_price",
                  {
                    customerId: String(formData.get("customerId") ?? ""),
                    productId: String(formData.get("productId") ?? ""),
                    customPricePaise: Math.round(Number(formData.get("price") ?? 0) * 100),
                  },
                  () => setPricing(false),
                )
              }
            >
              <div className="min-w-[200px]">
                <Field label="Customer" htmlFor="cprice-customer" required>
                  <Select id="cprice-customer" name="customerId" required defaultValue="">
                    <option value="" disabled>
                      Choose a customer
                    </option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.displayName}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="min-w-[260px] flex-1">
                <Field label="Board" htmlFor="cprice-board" required>
                  <Select id="cprice-board" name="productId" required defaultValue="">
                    <option value="" disabled>
                      Choose a board
                    </option>
                    {boards.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="w-[170px]">
                <Field label="Price (₹)" htmlFor="cprice-value" required>
                  <Input id="cprice-value" name="price" type="number" step="0.01" min="0" required />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Save
              </Button>
              <p className="m-0 w-full text-[12px] text-text-tertiary">
                Used when an order leaves the price blank. A price already on a placed order does
                not move — the line snapshotted it.
              </p>
            </form>
          </Panel>
        </div>
      )}

      {newCustomer && (
        <div className="mb-6">
          <Panel title="New customer">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.plywood.create_customer",
                  {
                    displayName: String(formData.get("name") ?? ""),
                    ...(formData.get("gstin") ? { gstin: String(formData.get("gstin")) } : {}),
                    ...(formData.get("state") ? { stateCode: String(formData.get("state")) } : {}),
                    ...(formData.get("phone") ? { phone: String(formData.get("phone")) } : {}),
                    creditLimitPaise: Math.round(Number(formData.get("limit") ?? 0) * 100),
                  },
                  () => setNewCustomer(false),
                )
              }
            >
              <div className="min-w-[220px] flex-1">
                <Field label="Customer" htmlFor="customer-name" required>
                  <Input id="customer-name" name="name" required autoFocus />
                </Field>
              </div>
              <div className="w-[200px]">
                <Field label="GSTIN" htmlFor="customer-gstin" hint="15 characters">
                  <Input id="customer-gstin" name="gstin" />
                </Field>
              </div>
              <div className="w-[120px]">
                <Field label="State code" htmlFor="customer-state" hint="Two digits">
                  <Input id="customer-state" name="state" inputMode="numeric" pattern="[0-9]{2}" />
                </Field>
              </div>
              <div className="w-[150px]">
                <Field label="Phone" htmlFor="customer-phone">
                  <Input id="customer-phone" name="phone" />
                </Field>
              </div>
              <div className="w-[170px]">
                <Field
                  label="Credit limit (₹)"
                  htmlFor="customer-limit"
                  hint="Zero means cash only"
                >
                  <Input
                    id="customer-limit"
                    name="limit"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={0}
                  />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Create
              </Button>
            </form>
          </Panel>
        </div>
      )}

      {newOrder && canOrder && (
        <div className="mb-6">
          <NewSalesOrderForm
            customers={customers.map((c) => ({ id: c.id, displayName: c.displayName }))}
            godowns={godowns}
            boards={boards}
            sellable={sellable}
            pending={pending}
            onCancel={() => setNewOrder(false)}
            onSubmit={(input) =>
              run("verity.plywood.create_sales_order", input, () => setNewOrder(false))
            }
          />
        </div>
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
            <table className="w-full border-collapse">
              <caption className="sr-only">Open sales orders</caption>
              <thead>
                <tr>
                  {["Order", "Board", "Status", "Ordered", "Order value", ""].map((heading, index) => (
                    <th
                      key={heading || index}
                      className={
                        "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                        (index <= 1 ? "text-left" : "text-right")
                      }
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                      {/* The order is the record; the desk is only a way in.
                          Every action worth taking has more context on the
                          order's own page than a table row can carry. */}
                      <Link
                        href={`/sales/${order.id}`}
                        className="text-text no-underline hover:underline"
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
                    <td className="tabular border-b border-line px-3 py-2 text-right text-[14px] text-text-secondary">
                      {sheets(order.orderedUnits)}
                    </td>
                    <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                      {rupees(order.totalPricePaise)}
                    </td>
                    <td className="border-b border-line px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {order.state === "pending_credit" && (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              setApproving(approving === order.id ? null : order.id)
                            }
                          >
                            {approving === order.id ? "Close" : "Approve credit"}
                          </Button>
                        )}
                        {order.state === "approved" && (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run("verity.plywood.reserve_for_order", { orderId: order.id })
                            }
                          >
                            Reserve stock
                          </Button>
                        )}
                        {order.state === "dispatching" && (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={pending}
                            onClick={() =>
                              run("verity.plywood.dispatch_order", { orderId: order.id })
                            }
                          >
                            Dispatch
                          </Button>
                        )}
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => openPanel(() => setCancelling(cancelling === order.id ? null : order.id))}
                        >
                          {cancelling === order.id ? "Keep order" : "Cancel order…"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {cancelling && (
            <form
              className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
              action={(formData) =>
                run(
                  "verity.plywood.cancel_sales_order",
                  { orderId: cancelling, reason: String(formData.get("reason") ?? "") },
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
                Any stock held for this order is released in the same step. Stock held for an order
                nobody will fulfil is stock that cannot be sold.
              </p>
            </form>
          )}

          {approving && (
            <form
              className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
              action={(formData) =>
                run(
                  "verity.plywood.approve_credit",
                  { orderId: approving, reason: String(formData.get("reason") ?? "") },
                  () => setApproving(null),
                )
              }
            >
              <div className="min-w-[320px] flex-1">
                <Field
                  label="Why is this being approved?"
                  htmlFor={`approve-${approving}`}
                  required
                >
                  <Input
                    id={`approve-${approving}`}
                    name="reason"
                    required
                    autoFocus
                    placeholder="Cheque cleared this morning"
                  />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Approve
              </Button>
              <p className="m-0 w-full text-[12px] text-text-tertiary">
                Recorded against the order. This is the decision someone asks about after a bad
                debt, so the reason is required rather than optional.
              </p>
            </form>
          )}
        </Panel>
      </div>

      {customers.length > 0 && (
        <Panel title="Customers">
          <table className="w-full border-collapse">
            <caption className="sr-only">Customers and credit headroom</caption>
            <thead>
              <tr>
                {["Customer", "GSTIN", "Limit", "Exposure", "Headroom", ""].map(
                  (heading, index) => (
                    <th
                      key={heading || index}
                      className={
                        "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                        (index === 0 ? "text-left" : "text-right")
                      }
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const headroom = customer.creditLimitPaise - customer.exposurePaise;
                return (
                  <tr key={customer.id}>
                    <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                      {customer.displayName}
                    </td>
                    <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                      {customer.gstin ?? "—"}
                    </td>
                    <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                      {customer.creditLimitPaise === 0 ? "Cash only" : rupees(customer.creditLimitPaise)}
                    </td>
                    <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                      {rupees(customer.exposurePaise)}
                    </td>
                    {/* Headroom, not the ceiling: what a representative needs
                        before promising anything is what is left. */}
                    <td
                      className={
                        "tabular border-b border-line px-3 py-2 text-right text-[14px] " +
                        (headroom < 0 ? "text-warning" : "")
                      }
                    >
                      {rupees(headroom)}
                    </td>
                    <td className="border-b border-line px-3 py-2 text-right">
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          setCreditFor(creditFor === customer.id ? null : customer.id)
                        }
                      >
                        {creditFor === customer.id ? "Close" : "Credit limit"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {creditFor && (
            <form
              className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-glass-2 p-3"
              action={(formData) =>
                run(
                  "verity.plywood.set_credit_limit",
                  {
                    customerId: creditFor,
                    creditLimitPaise: Math.round(Number(formData.get("limit") ?? 0) * 100),
                  },
                  () => setCreditFor(null),
                )
              }
            >
              <div className="w-[200px]">
                <Field
                  label="Credit limit (₹)"
                  htmlFor={`limit-${creditFor}`}
                  required
                  hint="Zero means cash only"
                >
                  <Input
                    id={`limit-${creditFor}`}
                    name="limit"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    defaultValue={(
                      (customers.find((c) => c.id === creditFor)?.creditLimitPaise ?? 0) / 100
                    ).toFixed(2)}
                  />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Save
              </Button>
              <p className="m-0 w-full text-[12px] text-text-tertiary">
                Who raised whose limit, and from what, is the first question after a bad debt — so
                the change is recorded against the customer.
              </p>
            </form>
          )}
        </Panel>
      )}
    </>
  );
}
