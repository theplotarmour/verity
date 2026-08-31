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
import { runCommand } from "@/server/actions/platform";
import type { ActionFailure } from "@/server/platform/action-error";

type PurchaseOrder = {
  id: string;
  reference: string | null;
  supplierName: string;
  state: string;
  totalCostPaise: number;
  orderedUnits: number;
  receivedUnits: number;
  outstandingUnits: number;
  raisedAt: Date | string;
  summary: string;
  lines: Array<{
    productId: string;
    name: string;
    qtyOrdered: number;
    qtyReceived: number;
    qtyOutstanding: number;
  }>;
};

type Supplier = {
  id: string;
  displayName: string;
  gstin: string | null;
  stateCode: string | null;
  openOrders: number;
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

/** State keys are the capability's; these are what a buyer calls them. */
const STATE_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "With supplier",
  receiving: "Part delivered",
  completed: "Complete",
  cancelled: "Cancelled",
};

/** The behavioural category each state declares (ADR-009), for the badge. */
const STATE_CATEGORY: Record<string, string> = {
  draft: "Draft",
  submitted: "Pending",
  receiving: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

/**
 * The buying desk.
 *
 * Open orders lead, because the half-delivered order is the one this screen
 * exists for — a completed order is history and a draft is a note to self.
 * Suppliers sit underneath as a reference list rather than above as a directory:
 * nobody opens this screen to look at a supplier, they open it to chase goods.
 */
export function PurchaseDesk({
  orders,
  suppliers,
  godowns,
  boards,
}: {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  godowns: Array<{ id: string; name: string }>;
  boards: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [newOrder, setNewOrder] = useState(false);
  const [newSupplier, setNewSupplier] = useState(false);
  const [receiving, setReceiving] = useState<string | null>(null);
  const [pricing, setPricing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
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
      const result = await runCommand(key, input, "/purchases");
      if (result.ok) {
        after?.();
        router.refresh();
      } else {
        setFailure(result);
      }
    });
  }

  // The order the receive form is for, resolved once rather than passed as an
  // id the form would have to look up.
  const receivingOrder = orders.find((order) => order.id === receiving) ?? null;

  const canOrder = suppliers.length > 0 && godowns.length > 0 && boards.length > 0;

  const priceHint = joinPrereqs([
    suppliers.length === 0 && "a supplier",
    boards.length === 0 && <>a board in <Link href="/catalogue" className="text-accent-ink hover:underline">Catalogue</Link></>,
  ]);
  const orderHint = joinPrereqs([
    suppliers.length === 0 && "a supplier",
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
        <Button onClick={() => setNewSupplier((open) => !open)}>
          {newSupplier ? "Cancel" : "New supplier"}
        </Button>
        <Button
          disabled={suppliers.length === 0 || boards.length === 0}
          onClick={() => setPricing((open) => !open)}
        >
          {pricing ? "Cancel" : "Agree a price"}
        </Button>
        <Button
          variant="primary"
          disabled={!canOrder}
          onClick={() => setNewOrder((open) => !open)}
        >
          {newOrder ? "Cancel" : "New order"}
        </Button>
      </div>

      {/* Each disabled action names its own missing prerequisite — three
          different reasons can gate "New order" and a shared "not ready" line
          would tell the buyer nothing they could act on. */}
      {priceHint && <PrereqHint className="mb-1.5">Agree a price needs {priceHint}.</PrereqHint>}
      {orderHint && <PrereqHint className="mb-4">New order needs {orderHint}.</PrereqHint>}

      {newSupplier && (
        <div className="mb-6">
          <Panel title="New supplier">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.plywood.create_supplier",
                  {
                    displayName: String(formData.get("name") ?? ""),
                    ...(formData.get("gstin") ? { gstin: String(formData.get("gstin")) } : {}),
                    ...(formData.get("state")
                      ? { stateCode: String(formData.get("state")) }
                      : {}),
                    ...(formData.get("phone") ? { phone: String(formData.get("phone")) } : {}),
                  },
                  () => setNewSupplier(false),
                )
              }
            >
              <div className="min-w-[240px] flex-1">
                <Field label="Supplier" htmlFor="supplier-name" required>
                  <Input id="supplier-name" name="name" required autoFocus />
                </Field>
              </div>
              <div className="w-[200px]">
                <Field label="GSTIN" htmlFor="supplier-gstin" hint="15 characters">
                  <Input id="supplier-gstin" name="gstin" />
                </Field>
              </div>
              <div className="w-[120px]">
                <Field
                  label="State code"
                  htmlFor="supplier-state"
                  hint="Two digits"
                >
                  <Input id="supplier-state" name="state" inputMode="numeric" pattern="[0-9]{2}" />
                </Field>
              </div>
              <div className="w-[160px]">
                <Field label="Phone" htmlFor="supplier-phone">
                  <Input id="supplier-phone" name="phone" />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Create
              </Button>
            </form>
          </Panel>
        </div>
      )}

      {pricing && (
        <div className="mb-6">
          <Panel title="Agreed price with a supplier">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.plywood.set_supplier_price",
                  {
                    supplierId: String(formData.get("supplierId") ?? ""),
                    productId: String(formData.get("productId") ?? ""),
                    negotiatedCostPaise: Math.round(Number(formData.get("cost") ?? 0) * 100),
                  },
                  () => setPricing(false),
                )
              }
            >
              <div className="min-w-[200px]">
                <Field label="Supplier" htmlFor="price-supplier" required>
                  <Select id="price-supplier" name="supplierId" required defaultValue="">
                    <option value="" disabled>
                      Choose a supplier
                    </option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.displayName}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="min-w-[260px] flex-1">
                <Field label="Board" htmlFor="price-board" required>
                  <Select id="price-board" name="productId" required defaultValue="">
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
                <Field label="Agreed cost (₹)" htmlFor="price-cost" required>
                  <Input id="price-cost" name="cost" type="number" step="0.01" min="0" required />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Save
              </Button>
              <p className="m-0 w-full text-[12px] text-text-tertiary">
                Used when an order leaves the cost blank. One current price per supplier per board;
                what it used to be lives in the orders that were placed at it.
              </p>
            </form>
          </Panel>
        </div>
      )}

      {newOrder && canOrder && (
        <div className="mb-6">
          <Panel title="New purchase order">
            <form
              className="flex flex-wrap items-end gap-3"
              action={(formData) =>
                run(
                  "verity.plywood.create_purchase_order",
                  {
                    supplierId: String(formData.get("supplierId") ?? ""),
                    locationId: String(formData.get("locationId") ?? ""),
                    ...(formData.get("reference")
                      ? { reference: String(formData.get("reference")) }
                      : {}),
                    lines: [
                      {
                        productId: String(formData.get("productId") ?? ""),
                        qtyOrdered: Number(formData.get("qty") ?? 0),
                        // Blank means "use the negotiated price". Sending zero
                        // instead would book a free delivery and poison the
                        // weighted average.
                        ...(String(formData.get("cost") ?? "") === ""
                          ? {}
                          : { unitCostPaise: Math.round(Number(formData.get("cost")) * 100) }),
                      },
                    ],
                  },
                  () => setNewOrder(false),
                )
              }
            >
              <div className="min-w-[200px]">
                <Field label="Supplier" htmlFor="order-supplier" required>
                  <Select id="order-supplier" name="supplierId" required defaultValue="">
                    <option value="" disabled>
                      Choose a supplier
                    </option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.displayName}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="min-w-[180px]">
                <Field label="Deliver to" htmlFor="order-godown" required>
                  <Select id="order-godown" name="locationId" required defaultValue="">
                    <option value="" disabled>
                      Choose a godown
                    </option>
                    {godowns.map((godown) => (
                      <option key={godown.id} value={godown.id}>
                        {godown.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="min-w-[240px] flex-1">
                <Field label="Board" htmlFor="order-board" required>
                  <Select id="order-board" name="productId" required defaultValue="">
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
              <div className="w-[120px]">
                <Field label="Quantity" htmlFor="order-qty" required>
                  <Input id="order-qty" name="qty" type="number" min="1" required />
                </Field>
              </div>
              <div className="w-[150px]">
                <Field
                  label="Cost per unit (₹)"
                  htmlFor="order-cost"
                  hint="Blank uses agreed price"
                >
                  <Input id="order-cost" name="cost" type="number" step="0.01" min="0" />
                </Field>
              </div>
              <div className="w-[150px]">
                <Field label="Reference" htmlFor="order-reference">
                  <Input id="order-reference" name="reference" />
                </Field>
              </div>
              <Button type="submit" variant="primary" disabled={pending}>
                Create
              </Button>
            </form>
          </Panel>
        </div>
      )}

      <div className="mb-4">
        <Panel title="Open orders" flush={orders.length === 0}>
          {orders.length === 0 ? (
            <EmptyState
              compact
              title="Nothing on order"
              description={
                canOrder
                  ? "Place an order and it appears here until every line is delivered."
                  : "Add a supplier, a godown and a board first."
              }
            />
          ) : (
            <table className="w-full border-collapse">
              <caption className="sr-only">Open purchase orders</caption>
              <thead>
                <tr>
                  {["Order", "Board", "Status", "Ordered", "Still owed", "Order value", ""].map((heading, index) => (
                    <th
                      key={heading || index}
                      className={
                        "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                        (index <= 2 ? "text-left" : "text-right")
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
                        href={`/purchases/${order.id}`}
                        className="text-text no-underline hover:underline"
                      >
                        {order.reference ?? `Order ${order.id.slice(0, 8)}`}
                      </Link>
                      <span className="mt-0.5 block text-[12px] text-text-tertiary">
                        {order.supplierName} · {day(order.raisedAt)}
                      </span>
                    </td>
                    {/* U2-2: what the order is FOR. Without this the desk could
                        not tell a warehouse user which order they were looking
                        at, and neither could the receive form. */}
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
                    {/* U2-3: a bare number beside a rupee figure reads as money.
                        These are sheets, and the column says so. */}
                    <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                      {order.outstandingUnits === 0 ? "—" : sheets(order.outstandingUnits)}
                    </td>
                    <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                      {rupees(order.totalCostPaise)}
                    </td>
                    <td className="border-b border-line px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {order.state === "draft" && (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run("verity.plywood.submit_purchase_order", { orderId: order.id })
                            }
                          >
                            Send to supplier
                          </Button>
                        )}
                        {(order.state === "submitted" || order.state === "receiving") && (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              openPanel(() => setReceiving(receiving === order.id ? null : order.id))
                            }
                          >
                            {receiving === order.id ? "Close" : "Receive…"}
                          </Button>
                        )}
                        {order.state !== "completed" && (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              openPanel(() => setCancelling(cancelling === order.id ? null : order.id))
                            }
                          >
                            {cancelling === order.id ? "Keep order" : "Cancel order…"}
                          </Button>
                        )}
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
                  "verity.plywood.cancel_purchase_order",
                  { orderId: cancelling, reason: String(formData.get("reason") ?? "") },
                  () => setCancelling(null),
                )
              }
            >
              <div className="min-w-[320px] flex-1">
                <Field
                  label={`Why is ${cancellingOrder?.reference ?? "this order"} being cancelled?`}
                  htmlFor="cancel-po"
                  required
                >
                  <Input
                    id="cancel-po"
                    name="reason"
                    required
                    autoFocus
                    minLength={3}
                    placeholder="Supplier cannot supply before the season"
                  />
                </Field>
              </div>
              <Button type="submit" variant="danger" disabled={pending}>
                Cancel order
              </Button>
              <p className="m-0 w-full text-[12px] text-text-tertiary">
                Anything already received stays received. Cancelling closes what is still owed; it
                does not unwind stock that came through the door.
              </p>
            </form>
          )}

          {receivingOrder && (
            <ReceiveForm
              order={receivingOrder}
              pending={pending}
              onClose={() => setReceiving(null)}
              onSubmit={(input) =>
                run("verity.plywood.receive_goods", input, () => setReceiving(null))
              }
            />
          )}
        </Panel>
      </div>

      {suppliers.length > 0 && (
        <Panel title="Suppliers">
          <table className="w-full border-collapse">
            <caption className="sr-only">Suppliers</caption>
            <thead>
              <tr>
                {["Supplier", "GSTIN", "GST state", "Open orders"].map((heading, index) => (
                  <th
                    key={heading}
                    className={
                      "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                      (index === 0 ? "text-left" : "text-right")
                    }
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                    {supplier.displayName}
                  </td>
                  <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                    {supplier.gstin ?? "—"}
                  </td>
                  <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                    {supplier.stateCode ?? "—"}
                  </td>
                  <td className="tabular border-b border-line px-3 py-2 text-right text-[14px]">
                    {supplier.openOrders === 0 ? "—" : supplier.openOrders}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}

/**
 * Receiving a delivery, against one named order.
 *
 * Audit finding U0-4. This form used to offer a dropdown of EVERY board in the
 * catalogue and a bare quantity, with nothing naming the order it belonged to.
 * A warehouse user had to remember which board a given order was for, and with
 * two orders both reading "Part delivered" there was nothing to check against.
 * The dropdown also listed services, which cannot be received into a godown.
 *
 * It now shows the order's own lines and nothing else — each with what was
 * ordered, what has already arrived, and what is still owed — pre-filled with
 * the outstanding quantity, which is what arrives in the ordinary case.
 */
function ReceiveForm({
  order,
  pending,
  onSubmit,
  onClose,
}: {
  order: PurchaseOrder;
  pending: boolean;
  onSubmit: (input: unknown) => void;
  onClose: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.lines.map((line) => [line.productId, String(line.qtyOutstanding)])),
  );

  const lines = order.lines
    .map((line) => ({
      productId: line.productId,
      qtyReceived: Number.parseInt(quantities[line.productId] ?? "0", 10),
    }))
    // A line receiving nothing is omitted rather than sent as zero: the command
    // requires a positive quantity, and "none of this arrived" is expressed by
    // its absence.
    .filter((line) => Number.isFinite(line.qtyReceived) && line.qtyReceived > 0);

  return (
    <div className="mt-4 rounded-lg bg-glass-2 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="m-0 text-[13px] font-medium text-text">
          Receive against {order.reference ?? `order ${order.id.slice(0, 8)}`}
          <span className="font-normal text-text-tertiary"> · {order.supplierName}</span>
        </h3>
        <Button size="sm" onClick={onClose} disabled={pending}>
          Close
        </Button>
      </div>

      {order.lines.length === 0 ? (
        <p className="m-0 text-[13px] text-text-secondary">
          Everything on this order has already been received.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {order.lines.map((line) => (
              <div key={line.productId} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[240px] flex-1">
                  <Field
                    label={line.name}
                    htmlFor={`receive-${order.id}-${line.productId}`}
                    hint={`${line.qtyOrdered} ordered · ${line.qtyReceived} received · ${line.qtyOutstanding} still owed`}
                  >
                    <Input
                      id={`receive-${order.id}-${line.productId}`}
                      type="number"
                      min={0}
                      max={line.qtyOutstanding}
                      value={quantities[line.productId] ?? ""}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [line.productId]: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button
              variant="primary"
              disabled={pending || lines.length === 0}
              onClick={() => onSubmit({ orderId: order.id, lines })}
            >
              {pending ? "Recording…" : "Record receipt"}
            </Button>
            <p className="m-0 text-[12px] text-text-tertiary">
              Costed at what the order agreed. Receiving moves the stock into the godown in the same
              step, and more than was ordered is refused rather than accepted.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

