"use server";

import { revalidatePath } from "next/cache";
import type { OrderState } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleWrite } from "@/platform/modules/guard";
import {
  ACTIVE_ORDER_STATES,
  DINING_BLOCKERS,
  isOrderCancellable,
  isOrderEditable,
  nextOrderState,
  orderTotal,
  type DiningBlocker,
} from "@/lib/dining";

/**
 * Dining orders, and the one place order state moves.
 *
 * `advanceOrder` walks `ORDER_SEQUENCE` and is the only writer of `state` besides
 * `createOrder` (which opens at NEW) and `cancelOrder` (which exits to CANCELLED).
 * There is deliberately no `setOrderState`: a caller that wants to skip a step is
 * describing a bug, and a bill printed for food the kitchen never acknowledged is
 * exactly what a state machine is for.
 *
 * Table state is touched at two points only — OCCUPIED when an order opens, and
 * BILLING then AVAILABLE as it settles. Those writes go direct rather than through
 * `setTableState`, on purpose: the table strip is a floor convenience that staff
 * may not have kept up to date, and an order must never fail to settle because
 * nobody tapped the table through PREPARING.
 *
 * Every action derives `factoryId` from the session.
 */

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { error: string; blocker?: DiningBlocker };

export type OrderItemInput = { menuItemId: string; quantity: number; notes?: string | null };

const clean = (value: string | null | undefined) => value?.trim() || null;

/**
 * Open an order on a table.
 *
 * Refuses unavailable menu items by name. The alternative — accepting the line and
 * letting the kitchen discover it — moves the problem to the person least able to
 * fix it, mid-service, with the guest already told it is coming.
 *
 * Prices are snapshotted onto each line here. Reading through to `MenuItem.price`
 * at bill time would mean repricing the menu silently rewrites what a settled bill
 * charged.
 */
export async function createOrder(
  tableId: string,
  items: OrderItemInput[],
  notes?: string
): Promise<ActionResult<{ id: string }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("tables_orders");

  if (!Array.isArray(items) || items.length === 0) {
    return { error: "An order needs at least one item" };
  }
  for (const item of items) {
    const error = validateQuantity(item.quantity);
    if (error) return { error };
  }

  const table = await prisma.restaurantTable.findFirst({
    where: { id: tableId, factoryId: user.factoryId },
    select: { id: true, number: true },
  });
  if (!table) return { error: "Table not found" };

  // One live order per table. A second is how a table ends up with two bills.
  const live = await prisma.diningOrder.findFirst({
    where: { tableId: table.id, factoryId: user.factoryId, state: { in: ACTIVE_ORDER_STATES } },
    select: { id: true },
  });
  if (live) {
    return {
      error: `Table ${table.number} already has a live order. Add to that one instead.`,
      blocker: DINING_BLOCKERS.TABLE_HAS_ACTIVE_ORDER,
    };
  }

  const resolved = await resolveMenuItems(user.factoryId, items);
  if ("error" in resolved) return resolved;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.diningOrder.create({
      data: {
        factoryId: user.factoryId,
        tableId: table.id,
        notes: clean(notes),
        state: "NEW",
        items: { create: resolved.lines },
      },
      select: { id: true },
    });

    // The one table write on the way in. Guests are seated and ordering.
    await tx.restaurantTable.update({ where: { id: table.id }, data: { state: "OCCUPIED" } });

    return created;
  });

  revalidatePath("/owner/tables");
  return { success: true, id: order.id };
}

/** Add a line, while the ticket can still change. */
export async function addItem(
  orderId: string,
  item: OrderItemInput
): Promise<ActionResult<{ id: string }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("tables_orders");

  const quantityError = validateQuantity(item.quantity);
  if (quantityError) return { error: quantityError };

  const order = await prisma.diningOrder.findFirst({
    where: { id: orderId, factoryId: user.factoryId },
    select: { id: true, state: true },
  });
  if (!order) return { error: "Order not found" };

  const locked = lockedError(order.state);
  if (locked) return locked;

  const resolved = await resolveMenuItems(user.factoryId, [item]);
  if ("error" in resolved) return resolved;

  const line = await prisma.diningOrderItem.create({
    data: { orderId: order.id, ...resolved.lines[0] },
    select: { id: true },
  });

  revalidatePath("/owner/tables");
  return { success: true, id: line.id };
}

/** Remove a line, while the ticket can still change. */
export async function removeItem(orderId: string, itemId: string): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("tables_orders");

  const order = await prisma.diningOrder.findFirst({
    where: { id: orderId, factoryId: user.factoryId },
    select: { id: true, state: true, _count: { select: { items: true } } },
  });
  if (!order) return { error: "Order not found" };

  const locked = lockedError(order.state);
  if (locked) return locked;

  // An order with no lines is not an order. Cancelling is the way to void one, and
  // it says so — an empty order sitting at NEW holds the table for ever.
  if (order._count.items <= 1) {
    return { error: "That is the last item. Cancel the order instead." };
  }

  const { count } = await prisma.diningOrderItem.deleteMany({
    where: { id: itemId, orderId: order.id },
  });
  if (count === 0) return { error: "Item not on this order" };

  revalidatePath("/owner/tables");
  return { success: true };
}

/**
 * Move the order one step along.
 *
 * The whole lifecycle, in one function, walking `ORDER_SEQUENCE`. Table state moves
 * only at the two settlement steps, as specified: BILLED sends the table to
 * BILLING, PAID frees it.
 */
export async function advanceOrder(
  orderId: string
): Promise<ActionResult<{ state: OrderState; tableState?: string }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("tables_orders");

  const order = await prisma.diningOrder.findFirst({
    where: { id: orderId, factoryId: user.factoryId },
    select: { id: true, state: true, tableId: true },
  });
  if (!order) return { error: "Order not found" };

  const next = nextOrderState(order.state);
  if (!next) {
    // PAID is the end and CANCELLED is off the ladder entirely. Neither wraps
    // around to NEW, which is what an unchecked index would have done.
    return {
      error:
        order.state === "CANCELLED"
          ? "This order was cancelled. It cannot be advanced."
          : "This order is already paid. There is nothing after PAID.",
      blocker: DINING_BLOCKERS.ORDER_ALREADY_FINAL,
    };
  }

  const tableState = next === "BILLED" ? "BILLING" : next === "PAID" ? "AVAILABLE" : null;

  await prisma.$transaction(async (tx) => {
    await tx.diningOrder.update({ where: { id: order.id }, data: { state: next } });
    if (tableState) {
      // Scoped by factory as well as id: tableId came off a row we already
      // confirmed is ours, and a query that does not say so is one refactor from
      // not being true.
      await tx.restaurantTable.updateMany({
        where: { id: order.tableId, factoryId: user.factoryId },
        data: { state: tableState },
      });
    }
  });

  revalidatePath("/owner/tables");
  return { success: true, state: next, ...(tableState ? { tableState } : {}) };
}

/**
 * Cancel, up to the point the kitchen starts.
 *
 * At PREPARING food is committed — ingredients cut, pan on — so cancelling from
 * there is a waste decision somebody signs off, not a button on a floor tablet.
 */
export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("tables_orders");

  const order = await prisma.diningOrder.findFirst({
    where: { id: orderId, factoryId: user.factoryId },
    select: { id: true, state: true, tableId: true },
  });
  if (!order) return { error: "Order not found" };

  if (!isOrderCancellable(order.state)) {
    return {
      error: `This order is ${order.state}. Only a NEW or ACCEPTED order can be cancelled.`,
      blocker:
        order.state === "PAID" || order.state === "CANCELLED"
          ? DINING_BLOCKERS.ORDER_ALREADY_FINAL
          : DINING_BLOCKERS.CANCEL_TOO_LATE,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.diningOrder.update({ where: { id: order.id }, data: { state: "CANCELLED" } });
    await tx.restaurantTable.updateMany({
      where: { id: order.tableId, factoryId: user.factoryId },
      data: { state: "AVAILABLE" },
    });
  });

  revalidatePath("/owner/tables");
  return { success: true };
}

/** The full order, with the names and prices the bill is read from. */
export async function getOrder(orderId: string) {
  const user = await getOwnerUser();
  if (!user) return null;

  const order = await prisma.diningOrder.findFirst({
    where: { id: orderId, factoryId: user.factoryId },
    select: {
      id: true,
      state: true,
      notes: true,
      customerId: true,
      createdAt: true,
      updatedAt: true,
      table: { select: { id: true, number: true, state: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantity: true,
          notes: true,
          unitPrice: true,
          menuItem: {
            select: { id: true, name: true, isVeg: true, available: true, price: true },
          },
        },
      },
    },
  });
  if (!order) return null;

  return {
    ...order,
    // From the snapshots on the lines, never from the live menu price. A line whose
    // menu price has since moved is shown as billed, not as it would be billed now.
    total: orderTotal(order.items),
  };
}

/**
 * Resolve input lines to menu items, refusing anything unavailable or not ours.
 *
 * One query for the whole batch, scoped by factory — the ids arrive from the
 * client, so without that filter an order could be built from another restaurant's
 * menu.
 */
async function resolveMenuItems(
  factoryId: string,
  items: OrderItemInput[]
): Promise<
  | { lines: Array<{ menuItemId: string; quantity: number; notes: string | null; unitPrice: number }> }
  | { error: string; blocker?: DiningBlocker }
> {
  const ids = [...new Set(items.map((i) => i.menuItemId))];
  const found = await prisma.menuItem.findMany({
    where: { id: { in: ids }, factoryId },
    select: { id: true, name: true, price: true, available: true },
  });
  const byId = new Map(found.map((m) => [m.id, m]));

  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    return { error: `${missing.length === 1 ? "An item is" : "Some items are"} not on the menu` };
  }

  const unavailable = found.filter((m) => !m.available);
  if (unavailable.length > 0) {
    return {
      error: `${unavailable.map((m) => m.name).join(", ")} ${
        unavailable.length === 1 ? "is" : "are"
      } not available right now`,
      blocker: DINING_BLOCKERS.ITEM_UNAVAILABLE,
    };
  }

  return {
    lines: items.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: Math.round(item.quantity),
      notes: clean(item.notes),
      unitPrice: byId.get(item.menuItemId)!.price,
    })),
  };
}

/** The shared refusal for editing a ticket the kitchen already has. */
function lockedError(state: OrderState): { error: string; blocker: DiningBlocker } | null {
  if (isOrderEditable(state)) return null;
  return {
    error: `This order is ${state}. Items can only change while it is NEW or ACCEPTED.`,
    blocker: DINING_BLOCKERS.ORDER_LOCKED,
  };
}

function validateQuantity(quantity: number): string | null {
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
    return "Quantity must be a number";
  }
  if (!Number.isInteger(quantity)) return "Quantity must be a whole number";
  if (quantity < 1) return "Quantity must be at least one";
  return null;
}
