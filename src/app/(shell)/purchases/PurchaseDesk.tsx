"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FormRow,
  Input,
  Panel,
  StateBadge,
} from "@/components/ui/primitives";
import { Combobox } from "@/components/ui/Combobox";
import { Modal, ModalCancel } from "@/components/ui/Modal";
import {
  NewPurchaseOrderForm,
  type AgreedCost,
} from "./NewPurchaseOrderForm";
import { day } from "@/components/ui/business/format";
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
  editable: {
    locationId: string;
    supplierId: string;
    lines: Array<{
      productId: string;
      qtyOrdered: number;
      unitCostPaise: number;
      listUnitCostPaise: number | null;
      discountBps: number;
    }>;
  };
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
  agreed,
}: {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  godowns: Array<{ id: string; name: string }>;
  boards: Array<{ id: string; label: string }>;
  agreed: AgreedCost[];
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [newOrder, setNewOrder] = useState(false);
  // Amending an order that has not been delivered against.
  const [amending, setAmending] = useState<PurchaseOrder | null>(null);
  const [receiving, setReceiving] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  // Controlled, so a refusal does not blank the reason someone just typed.
  const [cancelReason, setCancelReason] = useState("");
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

  const canOrder =
    suppliers.length > 0 && godowns.length > 0 && boards.length > 0;

  const orderHint = joinPrereqs([
    suppliers.length === 0 && "a supplier",
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
        {/* "New supplier" is NOT here any more (Task 71 item 3). A supplier is
            a party you keep, not a thing you make while placing an order, and
            the Suppliers page is where you go to look one up. */}
        {/* "Agree a price" is NOT here any more. A rate card is worked
            through in one sitting on /prices; one dialog per board on the
            buying desk is why those lists stayed empty. */}
        <Button
          variant="primary"
          disabled={!canOrder}
          onClick={() => openPanel(() => setNewOrder(true))}
        >
          New order
        </Button>
      </div>

      {/* Each disabled action names its own missing prerequisite — three
          different reasons can gate "New order" and a shared "not ready" line
          would tell the buyer nothing they could act on. */}
      {orderHint && (
        <PrereqHint className="mb-4">New order needs {orderHint}.</PrereqHint>
      )}

      <NewPurchaseOrderForm
        open={amending !== null}
        editing={
          amending
            ? {
                id: amending.id,
                reference: amending.reference,
                supplierId: amending.editable.supplierId,
                locationId: amending.editable.locationId,
                lines: amending.editable.lines,
              }
            : null
        }
        suppliers={suppliers}
        godowns={godowns}
        boards={boards}
        agreed={agreed}
        pending={pending}
        onCancel={() => setAmending(null)}
        onSubmit={(input) =>
          run("verity.plywood.edit_purchase_order", input, () =>
            setAmending(null),
          )
        }
      />

      {canOrder && (
        <NewPurchaseOrderForm
          open={newOrder}
          suppliers={suppliers}
          godowns={godowns}
          boards={boards}
          agreed={agreed}
          pending={pending}
          onCancel={() => setNewOrder(false)}
          onSubmit={(input) =>
            run("verity.plywood.create_purchase_order", input, () =>
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
              title="Nothing on order"
              description={
                canOrder
                  ? "Place an order and it appears here until every line is delivered."
                  : "Add a supplier, a godown and a board first."
              }
            />
          ) : (
            <div className="-mx-3 overflow-x-auto px-3">
              <table className="w-full min-w-[720px] border-collapse">
                <caption className="sr-only">
                  Open purchase orders. Quantities are units ordered.
                </caption>
                <thead>
                  <tr>
                    {[
                      "Order",
                      "Board",
                      "Status",
                      "Ordered",
                      "Still owed",
                      "Value",
                      "",
                    ].map((heading, index) => (
                      <th
                        key={heading || index}
                        className={
                          "whitespace-nowrap border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
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
                    <tr key={order.id} className="transition-colors hover:bg-accent-subtle/40">
                      <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                        {/* The order is the record; the desk is only a way in.
                          Every action worth taking has more context on the
                          order's own page than a table row can carry. */}
                        <Link
                          href={`/purchases/${order.id}`}
                          className="whitespace-nowrap text-text no-underline hover:underline"
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
                      <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px] text-text-secondary">
                        {order.orderedUnits.toLocaleString("en-IN")}
                      </td>
                      {/* U2-3: a bare number beside a rupee figure reads as
                        money. The unit is carried by the caption once rather
                        than repeated in every cell, where "300 sheets" wrapped
                        to two lines in a column this narrow. */}
                      <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px]">
                        {order.outstandingUnits === 0
                          ? "—"
                          : order.outstandingUnits.toLocaleString("en-IN")}
                      </td>
                      <td className="tabular whitespace-nowrap border-b border-line px-3 py-2 text-right text-[14px]">
                        {rupees(order.totalCostPaise)}
                      </td>
                      <td className="border-b border-line px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          {order.state === "draft" && (
                            <Button
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                run("verity.plywood.submit_purchase_order", {
                                  orderId: order.id,
                                })
                              }
                            >
                              Send to supplier
                            </Button>
                          )}
                          {(order.state === "submitted" ||
                            order.state === "receiving") && (
                            <Button
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                openPanel(() =>
                                  setReceiving(
                                    receiving === order.id ? null : order.id,
                                  ),
                                )
                              }
                            >
                              {receiving === order.id ? "Close" : "Receive…"}
                            </Button>
                          )}
                          {/* Amendable only while nothing has arrived — once
                              it has, the lines describe a real delivery. */}
                          {order.receivedUnits === 0 &&
                            order.state !== "completed" &&
                            order.state !== "cancelled" && (
                              <Button
                                size="sm"
                                disabled={pending}
                                onClick={() => openPanel(() => setAmending(order))}
                              >
                                Edit
                              </Button>
                            )}
                          {order.state !== "completed" && (
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
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </Panel>
      </div>

      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title={`Cancel ${cancellingOrder?.reference ?? "this order"}`}
        description="Anything already received stays received. Cancelling closes what is still owed; it does not unwind stock that came through the door."
        width="sm"
        footer={
          <>
            <ModalCancel onClose={() => setCancelling(null)} disabled={pending}>
              Keep order
            </ModalCancel>
            <Button
              variant="danger"
              disabled={pending || cancelReason.trim().length < 3}
              onClick={() =>
                run(
                  "verity.plywood.cancel_purchase_order",
                  { orderId: cancelling, reason: cancelReason.trim() },
                  () => {
                    setCancelling(null);
                    setCancelReason("");
                  },
                )
              }
            >
              Cancel order
            </Button>
          </>
        }
      >
        <Field label="Why is it being cancelled?" htmlFor="cancel-po" required>
          <Input
            id="cancel-po"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            minLength={3}
            placeholder="Supplier cannot supply before the season"
          />
        </Field>
      </Modal>

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
    Object.fromEntries(
      order.lines.map((line) => [line.productId, String(line.qtyOutstanding)]),
    ),
  );

  const lines = order.lines
    .map((line) => ({
      productId: line.productId,
      qtyReceived: Number.parseInt(quantities[line.productId] ?? "0", 10),
    }))
    // A line receiving nothing is omitted rather than sent as zero: the command
    // requires a positive quantity, and "none of this arrived" is expressed by
    // its absence.
    .filter(
      (line) => Number.isFinite(line.qtyReceived) && line.qtyReceived > 0,
    );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Receive against ${order.reference ?? `order ${order.id.slice(0, 8)}`}`}
      description={`${order.supplierName} · only this order's outstanding lines are listed`}
      footer={
        <>
          <span className="mr-auto text-[12px] text-text-tertiary">
            Costed at what the order agreed. The stock moves in and, once the
            order is fully received, the supplier&apos;s bill is raised for you.
          </span>
          <ModalCancel onClose={onClose} disabled={pending} />
          <Button
            variant="primary"
            disabled={pending || lines.length === 0}
            onClick={() => onSubmit({ orderId: order.id, lines })}
          >
            {pending ? "Recording…" : "Record receipt"}
          </Button>
        </>
      }
    >
      {order.lines.length === 0 ? (
        <p className="m-0 text-[13px] text-text-secondary">
          Everything on this order has already been received.
        </p>
      ) : (
        <FormRow columns="repeat(auto-fit, minmax(240px, 1fr))">
          {order.lines.map((line) => (
            <Field
              key={line.productId}
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
          ))}
        </FormRow>
      )}
    </Modal>
  );
}
