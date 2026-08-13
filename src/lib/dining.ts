import type { OrderState, TableState } from "@prisma/client";

/**
 * The dining state machines.
 *
 * Pure and framework-free: the actions enforce these, the floor UI greys out what
 * is illegal, and the tests assert the same transitions rather than a reimplemented
 * copy. It also cannot live in the action files — those are `"use server"`, where
 * only async functions may be exported.
 */

/**
 * Why a dining write was refused.
 *
 * Named, because the message is written for floor staff and will be reworded and
 * translated. A UI that branches on error text breaks the first time somebody
 * improves the wording.
 */
export const DINING_BLOCKERS = {
  TABLE_HAS_ACTIVE_ORDER: "TABLE_HAS_ACTIVE_ORDER",
  ILLEGAL_TABLE_TRANSITION: "ILLEGAL_TABLE_TRANSITION",
  ITEM_UNAVAILABLE: "ITEM_UNAVAILABLE",
  ORDER_ALREADY_FINAL: "ORDER_ALREADY_FINAL",
  ORDER_LOCKED: "ORDER_LOCKED",
  CANCEL_TOO_LATE: "CANCEL_TOO_LATE",
} as const;

export type DiningBlocker = (typeof DINING_BLOCKERS)[keyof typeof DINING_BLOCKERS];

/**
 * The order lifecycle, in order.
 *
 * `advanceOrder` walks this and nothing else writes `state`. A caller that wants to
 * skip a step is describing a bug: a bill printed for food the kitchen never
 * acknowledged is exactly the kind of thing a state machine exists to make
 * impossible.
 *
 * CANCELLED is deliberately outside the sequence — it is an exit, not a step.
 */
export const ORDER_SEQUENCE: OrderState[] = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "SERVED",
  "BILLED",
  "PAID",
];

/** Terminal states. Nothing advances out of these. */
export const ORDER_FINAL: OrderState[] = ["PAID", "CANCELLED"];

/** The next state, or null when there isn't one. */
export function nextOrderState(state: OrderState): OrderState | null {
  const index = ORDER_SEQUENCE.indexOf(state);
  // -1 covers CANCELLED, which is not on the ladder at all.
  if (index === -1 || index === ORDER_SEQUENCE.length - 1) return null;
  return ORDER_SEQUENCE[index + 1];
}

export function isOrderFinal(state: OrderState): boolean {
  return ORDER_FINAL.includes(state);
}

/**
 * States in which the order's contents may still change.
 *
 * Once the kitchen is cooking, the ticket it is cooking from has to stop moving.
 * An item added at PREPARING either never gets made or arrives after the table has
 * eaten, and neither is recoverable from the floor.
 */
export const ORDER_EDITABLE: OrderState[] = ["NEW", "ACCEPTED"];

export function isOrderEditable(state: OrderState): boolean {
  return ORDER_EDITABLE.includes(state);
}

/**
 * Cancellable up to the point the kitchen starts.
 *
 * At PREPARING food has been committed — ingredients are cut, the pan is on — so a
 * cancellation from that point is a waste decision somebody has to sign off, not a
 * button on a floor tablet.
 */
export function isOrderCancellable(state: OrderState): boolean {
  return state === "NEW" || state === "ACCEPTED";
}

/**
 * Legal manual table transitions.
 *
 * This is the floor's own view of the room, moved by staff — so it is adjacency
 * only: AVAILABLE → OCCUPIED when guests sit, never AVAILABLE → SERVED.
 *
 * OCCUPIED → AVAILABLE is here because guests do get up and leave before ordering,
 * and a table that cannot be freed without inventing an order is a table staff will
 * work around.
 */
export const TABLE_TRANSITIONS: Record<TableState, TableState[]> = {
  AVAILABLE: ["OCCUPIED"],
  OCCUPIED: ["ORDERED", "AVAILABLE"],
  ORDERED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["SERVED"],
  SERVED: ["BILLING"],
  BILLING: ["PAID"],
  PAID: ["AVAILABLE"],
};

export function canTransitionTable(from: TableState, to: TableState): boolean {
  return TABLE_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Table states that mean the table is not free. */
export function isTableBusy(state: TableState): boolean {
  return state !== "AVAILABLE";
}

/** An order still live on the floor — anything not settled or abandoned. */
export function isOrderActive(state: OrderState): boolean {
  return !isOrderFinal(state);
}

export const ACTIVE_ORDER_STATES: OrderState[] = ORDER_SEQUENCE.filter(
  (s) => !ORDER_FINAL.includes(s),
);

/**
 * Tickets the kitchen still owes food for.
 *
 * Stops at PREPARING. READY means the food is cooked and sitting under the lamp —
 * it belongs to the pass, and leaving it on the kitchen screen is how a dish gets
 * cooked twice.
 */
export const KITCHEN_QUEUE_STATES: OrderState[] = ["NEW", "ACCEPTED", "PREPARING"];

/** The pass: cooked, not yet carried. */
export const SERVING_QUEUE_STATES: OrderState[] = ["READY"];

/** Line total in paise, from the snapshotted unit price. */
export function lineTotal(item: { quantity: number; unitPrice: number }): number {
  return item.quantity * item.unitPrice;
}

/** Order total in paise. Reads the snapshot, never the live menu price. */
export function orderTotal(items: Array<{ quantity: number; unitPrice: number }>): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}
