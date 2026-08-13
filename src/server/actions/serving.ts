"use server";

import { revalidatePath } from "next/cache";
import type { OrderState } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleAction } from "@/platform/modules/guard";
import { resolveAccess } from "@/platform/rbac/permissions";
import { SERVING_QUEUE_STATES, type DiningBlocker } from "@/lib/dining";
import { advanceOrder } from "./diningOrders";

/**
 * The pass.
 *
 * Cooked food waiting to be carried. Like the kitchen module this owns no state
 * machine — `advanceOrder` is the only writer — and like it, `markServed` states the
 * state it expects, because `advanceOrder` steps from wherever the order is and a
 * "Served" button pressed on a SERVED order would advance it to BILLED.
 */

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { error: string; blocker?: DiningBlocker };

/**
 * What is under the lamp, longest wait first.
 *
 * Ordered by `updatedAt`, not `createdAt`: the queue is about how long the food has
 * been sitting, and a dish plated two minutes ago goes out after one that has been
 * waiting eight, whatever time the tables ordered.
 */
export async function getReadyOrders() {
  const user = await getOwnerUser();
  if (!user) return [];
  await guardModuleAction("serving");

  const orders = await prisma.diningOrder.findMany({
    where: { factoryId: user.factoryId, state: { in: SERVING_QUEUE_STATES } },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      state: true,
      notes: true,
      updatedAt: true,
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
    // One clock for every card, so the numbers agree with each other.
    readyForMinutes: Math.max(0, Math.round((now - order.updatedAt.getTime()) / 60000)),
  }));
}

/**
 * Carried to the table.
 *
 * No notification: served means the guest has the food in front of them. Nobody
 * else needs telling, and a message about it would be noise in a room where
 * everyone can see the plate land.
 */
export async function markServed(
  orderId: string
): Promise<ActionResult<{ state: OrderState }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleAction("serving");

  const access = await resolveAccess(user.id);
  if (!access?.permissions.has("serving.work")) {
    return { error: "You do not have serving access" };
  }

  const order = await prisma.diningOrder.findFirst({
    where: { id: orderId, factoryId: user.factoryId },
    select: { id: true, state: true },
  });
  if (!order) return { error: "Order not found" };

  if (order.state !== "READY") {
    return {
      error: `This order is ${order.state}, not READY. Only food on the pass can be served.`,
      blocker: "ORDER_LOCKED",
    };
  }

  const advanced = await advanceOrder(order.id);
  if ("error" in advanced) return advanced;

  revalidatePath("/owner/serving");
  revalidatePath("/owner/kitchen");
  return { success: true, state: advanced.state };
}
