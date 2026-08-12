"use server";

import { revalidatePath } from "next/cache";
import type { TableState } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleWrite } from "@/platform/modules/guard";
import {
  ACTIVE_ORDER_STATES,
  DINING_BLOCKERS,
  TABLE_TRANSITIONS,
  canTransitionTable,
  orderTotal,
  type DiningBlocker,
} from "@/lib/dining";

/**
 * The floor: tables and their state.
 *
 * A table's state is the floor staff's view of the room. The *order* is the source
 * of truth for what is actually happening — see `diningOrders.ts` — and where the
 * two disagree the order wins. This module exists so somebody can lay out the room
 * and move a table along by hand; it does not drive the order lifecycle.
 *
 * Every action derives `factoryId` from the session. Nothing here accepts a tenant
 * id, because every export in a `"use server"` module is a public POST endpoint.
 */

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { error: string; blocker?: DiningBlocker };

export type TableInput = { number: string; capacity: number };

/**
 * Every table, with its live order if it has one.
 *
 * One query. The obvious alternative — tables, then an order lookup per table — is
 * an N+1 across the floor plan, which is the screen refreshed most often in the
 * building.
 *
 * At most one active order per table is an invariant `createOrder` enforces, so
 * `take: 1` is a shape, not a guess.
 */
export async function listTables() {
  const user = await getOwnerUser();
  if (!user) return [];

  const tables = await prisma.restaurantTable.findMany({
    where: { factoryId: user.factoryId },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      capacity: true,
      state: true,
      orders: {
        where: { state: { in: ACTIVE_ORDER_STATES } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          state: true,
          notes: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              notes: true,
              menuItem: { select: { id: true, name: true, isVeg: true } },
            },
          },
        },
      },
    },
  });

  return tables.map(({ orders, ...table }) => {
    const activeOrder = orders[0] ?? null;
    return {
      ...table,
      activeOrder: activeOrder
        ? { ...activeOrder, total: orderTotal(activeOrder.items) }
        : null,
    };
  });
}

export async function createTable(input: TableInput): Promise<ActionResult<{ id: string }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("tables_orders");

  const number = input.number?.trim();
  if (!number) return { error: "A table needs a number" };
  const capacityError = validateCapacity(input.capacity);
  if (capacityError) return { error: capacityError };

  const clash = await prisma.restaurantTable.findFirst({
    where: { factoryId: user.factoryId, number: { equals: number, mode: "insensitive" } },
    select: { id: true },
  });
  // Checked rather than left to the unique index: a duplicate table number puts an
  // order on the wrong table, and staff should read "T01 already exists".
  if (clash) return { error: `Table ${number} already exists` };

  const table = await prisma.restaurantTable.create({
    data: { factoryId: user.factoryId, number, capacity: Math.round(input.capacity) },
    select: { id: true },
  });

  revalidatePath("/owner/tables");
  return { success: true, id: table.id };
}

/**
 * Rename or resize a table.
 *
 * Deliberately cannot set `state` — that is `setTableState`, which checks the
 * transition. A generic update that happened to accept a state field would be a
 * hole straight through the machine.
 */
export async function updateTable(tableId: string, input: TableInput): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("tables_orders");

  const number = input.number?.trim();
  if (!number) return { error: "A table needs a number" };
  const capacityError = validateCapacity(input.capacity);
  if (capacityError) return { error: capacityError };

  const clash = await prisma.restaurantTable.findFirst({
    where: {
      factoryId: user.factoryId,
      number: { equals: number, mode: "insensitive" },
      id: { not: tableId },
    },
    select: { id: true },
  });
  if (clash) return { error: `Table ${number} already exists` };

  const { count } = await prisma.restaurantTable.updateMany({
    where: { id: tableId, factoryId: user.factoryId },
    data: { number, capacity: Math.round(input.capacity) },
  });
  if (count === 0) return { error: "Table not found" };

  revalidatePath("/owner/tables");
  return { success: true };
}

/**
 * Delete a table, refusing while an order is live on it.
 *
 * `DiningOrder.table` has no `onDelete`, so Postgres refuses too — but it refuses
 * for *any* order including settled ones, as a foreign-key error naming a
 * constraint. This reports the live one, which is the case somebody can act on.
 */
export async function deleteTable(tableId: string): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("tables_orders");

  const table = await prisma.restaurantTable.findFirst({
    where: { id: tableId, factoryId: user.factoryId },
    select: {
      id: true,
      number: true,
      _count: { select: { orders: { where: { state: { in: ACTIVE_ORDER_STATES } } } } },
    },
  });
  if (!table) return { error: "Table not found" };

  if (table._count.orders > 0) {
    return {
      error: `Table ${table.number} has a live order. Settle or cancel it first.`,
      blocker: DINING_BLOCKERS.TABLE_HAS_ACTIVE_ORDER,
    };
  }

  // A settled order still references the table, and its history is the day's
  // takings. Refuse rather than cascade.
  const settled = await prisma.diningOrder.count({ where: { tableId: table.id } });
  if (settled > 0) {
    return {
      error:
        `Table ${table.number} has ${settled} past ${settled === 1 ? "order" : "orders"} ` +
        "against it, which the day's takings are built from. It cannot be deleted.",
      blocker: DINING_BLOCKERS.TABLE_HAS_ACTIVE_ORDER,
    };
  }

  await prisma.restaurantTable.delete({ where: { id: table.id } });

  revalidatePath("/owner/tables");
  return { success: true };
}

/**
 * Move a table along by hand, one legal step.
 *
 * Adjacency only, from `TABLE_TRANSITIONS`: AVAILABLE → OCCUPIED when guests sit
 * down, never AVAILABLE → SERVED. The error names what *is* allowed, because a
 * refusal that does not is a refusal staff retry at random.
 */
export async function setTableState(
  tableId: string,
  state: TableState
): Promise<ActionResult<{ state: TableState }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("tables_orders");

  const table = await prisma.restaurantTable.findFirst({
    where: { id: tableId, factoryId: user.factoryId },
    select: { id: true, number: true, state: true },
  });
  if (!table) return { error: "Table not found" };

  if (table.state === state) return { success: true, state };

  if (!canTransitionTable(table.state, state)) {
    const allowed = TABLE_TRANSITIONS[table.state] ?? [];
    return {
      error:
        `Table ${table.number} is ${table.state} and cannot go straight to ${state}. ` +
        (allowed.length > 0 ? `Next can be: ${allowed.join(", ")}.` : "It is at the end of the flow."),
      blocker: DINING_BLOCKERS.ILLEGAL_TABLE_TRANSITION,
    };
  }

  await prisma.restaurantTable.update({ where: { id: table.id }, data: { state } });

  revalidatePath("/owner/tables");
  return { success: true, state };
}

/** Covers, not a label. Zero seats is not a table and 500 is a typo. */
function validateCapacity(capacity: number): string | null {
  if (typeof capacity !== "number" || !Number.isFinite(capacity)) {
    return "Capacity must be a number";
  }
  if (!Number.isInteger(capacity)) return "Capacity must be a whole number of covers";
  if (capacity < 1) return "A table seats at least one";
  if (capacity > 100) return "That is a room, not a table — split it into several";
  return null;
}
