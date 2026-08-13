"use server";

import { revalidatePath } from "next/cache";
import type { OrderState } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleAction } from "@/platform/modules/guard";
import { resolveAccess } from "@/platform/rbac/permissions";
import { KITCHEN_QUEUE_STATES, orderLabel, type DiningBlocker } from "@/lib/dining";
import { advanceOrder } from "./diningOrders";

/**
 * The kitchen display.
 *
 * A query layer and three one-step buttons. It owns no state machine: every write
 * goes through `advanceOrder`, which is the only thing that moves an order. A
 * second ladder here would be a second answer to "what happens after ACCEPTED",
 * and the two would drift.
 *
 * What this module *does* add is a precondition. `advanceOrder` steps from wherever
 * the order currently is, so calling it from a button labelled "Accept" on an order
 * that is already PREPARING would quietly mark it READY — food announced to the
 * pass that nobody has cooked. Each action states the state it expects and refuses
 * otherwise, which also makes it safe against a double tap on a slow tablet.
 */

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { error: string; blocker?: DiningBlocker };

/**
 * Tickets the kitchen still owes food for, oldest first.
 *
 * First in, first out is not a display preference — it is the fairness rule a
 * dining room runs on, and a kitchen that works the newest ticket first produces a
 * table that waited forty minutes while two later ones ate.
 */
export async function getKitchenQueue() {
  const user = await getOwnerUser();
  if (!user) return [];
  // Read guard, not a write guard: a lapsed subscription should still be able to
  // finish the service it is in the middle of.
  await guardModuleAction("kitchen");

  const orders = await prisma.diningOrder.findMany({
    where: { factoryId: user.factoryId, state: { in: KITCHEN_QUEUE_STATES } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      state: true,
      notes: true,
      createdAt: true,
      token: true,
      customerLabel: true,
      table: { select: { id: true, number: true } },
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantity: true,
          notes: true,
          menuItem: { select: { id: true, name: true, isVeg: true } },
        },
      },
    },
  });

  const now = Date.now();
  return orders.map((order) => ({
    ...order,
    // Computed once against one clock. Per-card `Date.now()` in the browser would
    // drift between cards and jump on rerender.
    waitingMinutes: Math.max(0, Math.round((now - order.createdAt.getTime()) / 60000)),
  }));
}

export async function acceptOrder(orderId: string) {
  return step(orderId, "NEW", "kitchen.work");
}

export async function startPreparing(orderId: string) {
  return step(orderId, "ACCEPTED", "kitchen.work");
}

/**
 * Food is up.
 *
 * The one action here with a side effect beyond the order: the pass has to be told,
 * because nobody is watching the kitchen screen from the floor. Fired after the
 * state write and swallowed on failure — the same shape as the QC-score and
 * stage-hold triggers. Food being ready is true whether or not a notification row
 * was written, and rolling the state back because a fan-out failed would strand a
 * cooked dish under the lamp.
 */
export async function markReady(orderId: string) {
  const result = await step(orderId, "PREPARING", "kitchen.work");
  if (!("success" in result)) return result;

  try {
    await notifyPass(orderId);
  } catch (error) {
    console.error("Ready-to-serve notification failed", error);
  }

  return result;
}

/**
 * One guarded step of the order machine.
 *
 * `expected` is the whole point — see the note at the top of the file.
 */
async function step(
  orderId: string,
  expected: OrderState,
  permission: string
): Promise<ActionResult<{ state: OrderState }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleAction("kitchen");

  // Kitchen access, checked against the role's grants rather than a job title.
  const access = await resolveAccess(user.id);
  if (!access?.permissions.has(permission)) {
    return { error: "You do not have kitchen access" };
  }

  const order = await prisma.diningOrder.findFirst({
    where: { id: orderId, factoryId: user.factoryId },
    select: { id: true, state: true },
  });
  if (!order) return { error: "Order not found" };

  if (order.state !== expected) {
    return {
      error: `This order is ${order.state}, not ${expected}. Refresh the queue.`,
      blocker: "ORDER_LOCKED",
    };
  }

  // The single writer. Nothing in this file touches `state`.
  const advanced = await advanceOrder(order.id);
  if ("error" in advanced) return advanced;

  revalidatePath("/owner/kitchen");
  revalidatePath("/owner/serving");
  return { success: true, state: advanced.state };
}

/** Tell everyone who runs food that there is food to run. */
async function notifyPass(orderId: string) {
  const user = await getOwnerUser();
  if (!user) return;

  const order = await prisma.diningOrder.findFirst({
    where: { id: orderId, factoryId: user.factoryId },
    select: { id: true, token: true, customerLabel: true, table: { select: { number: true } } },
  });
  if (!order) return;

  // Whoever's role grants the pass, not whoever holds a particular job title — a
  // restaurant where the manager also runs food is the normal case, not an edge one.
  const servers = await prisma.user.findMany({
    where: {
      factoryId: user.factoryId,
      isActive: true,
      customRole: { permissions: { some: { key: "serving.view" } } },
    },
    select: { id: true },
  });
  if (servers.length === 0) return;

  const { emitEvent } = await import("@/lib/server/events");
  await emitEvent({
    factoryId: user.factoryId,
    event: "ORDER_READY",
    recipients: servers.map((s) => s.id),
    title: "Order ready to serve",
    message: `Order #${shortOrderNumber(order.id)} at ${orderLabel(order)} is ready to serve.`,
    linkUrl: "/owner/serving",
    type: "ACTION_REQUIRED",
    actorId: user.id,
  });
}

/**
 * A cuid is 25 characters and nobody reads one across a kitchen.
 *
 * The last six, uppercased — enough to tell two live tickets apart, which is all a
 * ticket number is for on a floor with a dozen tables.
 */
function shortOrderNumber(id: string): string {
  return id.slice(-6).toUpperCase();
}
