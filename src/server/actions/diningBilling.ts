"use server";

import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleWrite } from "@/platform/modules/guard";
import { resolveAccess } from "@/platform/rbac/permissions";
import { GST_RATE, istDayStart, orderTotal, type DiningBlocker } from "@/lib/dining";
import { advanceOrder } from "./diningOrders";

/**
 * The bill.
 *
 * Owns no state machine: `advanceOrder` moves SERVED → BILLED and BILLED → PAID,
 * and it already frees the table on PAID. Nothing here writes order or table state.
 *
 * Amounts are integer paise throughout. `total` is stored rather than derived on
 * read because it is what was charged — a bill that recomputes itself is a bill
 * that changes after it is settled.
 */

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { error: string; blocker?: DiningBlocker };

/**
 * Bill a served order.
 *
 * Tax is charged on the subtotal, before any discount — that is how a discount is
 * normally given in a restaurant (money off the food, not off the government's
 * share), and it keeps `applyDiscount` from having to re-derive tax.
 */
export async function generateBill(orderId: string): Promise<ActionResult<{ id: string }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("billing");

  const order = await prisma.diningOrder.findFirst({
    where: { id: orderId, factoryId: user.factoryId },
    select: {
      id: true,
      state: true,
      bill: { select: { id: true } },
      items: { select: { quantity: true, unitPrice: true } },
    },
  });
  if (!order) return { error: "Order not found" };

  // Idempotent: a second tap returns the bill already raised rather than a second
  // one. `orderId` is unique, so the alternative is a constraint error mid-service.
  if (order.bill) return { success: true, id: order.bill.id };

  if (order.state !== "SERVED") {
    return {
      error: `This order is ${order.state}. Only a SERVED order can be billed.`,
      blocker: "ORDER_LOCKED",
    };
  }

  const subtotal = orderTotal(order.items);
  const taxPaise = Math.round(subtotal * GST_RATE);

  const bill = await prisma.diningBill.create({
    data: {
      factoryId: user.factoryId,
      orderId: order.id,
      subtotal,
      taxPaise,
      total: subtotal + taxPaise,
    },
    select: { id: true },
  });

  const advanced = await advanceOrder(order.id);
  if ("error" in advanced) return advanced;

  revalidatePath("/owner/dashboard");
  return { success: true, id: bill.id };
}

/** Money off, manager only. */
export async function applyDiscount(
  billId: string,
  discountPaise: number
): Promise<ActionResult<{ total: number }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("billing");

  const access = await resolveAccess(user.id);
  // Discounting is giving away money, so it is gated on the permission that gates
  // the rest of billing rather than on being logged in.
  if (!access?.permissions.has("invoice.manage")) {
    return { error: "Only a manager can discount a bill" };
  }

  if (!Number.isInteger(discountPaise) || discountPaise < 0) {
    return { error: "Discount must be whole paise, and not negative" };
  }

  const bill = await prisma.diningBill.findFirst({
    where: { id: billId, factoryId: user.factoryId },
    select: { id: true, subtotal: true, taxPaise: true, paidAt: true },
  });
  if (!bill) return { error: "Bill not found" };
  // A settled bill is a record. Changing it is a refund, which is a different
  // conversation and a different action.
  if (bill.paidAt) return { error: "This bill is paid and cannot be changed" };

  if (discountPaise > bill.subtotal) {
    return { error: "Discount cannot be more than the food" };
  }

  const total = bill.subtotal - discountPaise + bill.taxPaise;
  await prisma.diningBill.update({ where: { id: bill.id }, data: { discountPaise, total } });

  revalidatePath("/owner/dashboard");
  return { success: true, total };
}

/** Settle. `advanceOrder` frees the table as part of moving to PAID. */
export async function recordPayment(
  billId: string,
  method: PaymentMethod
): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("billing");

  const bill = await prisma.diningBill.findFirst({
    where: { id: billId, factoryId: user.factoryId },
    select: { id: true, orderId: true, paidAt: true },
  });
  if (!bill) return { error: "Bill not found" };
  if (bill.paidAt) {
    return { error: "This bill is already paid", blocker: "ORDER_ALREADY_FINAL" };
  }

  await prisma.diningBill.update({
    where: { id: bill.id },
    data: { paymentMethod: method, paidAt: new Date() },
  });

  const advanced = await advanceOrder(bill.orderId);
  if ("error" in advanced) return advanced;

  revalidatePath("/owner/dashboard");
  return { success: true };
}

export async function getBill(billId: string) {
  const user = await getOwnerUser();
  if (!user) return null;

  return prisma.diningBill.findFirst({
    where: { id: billId, factoryId: user.factoryId },
    select: {
      id: true,
      subtotal: true,
      discountPaise: true,
      taxPaise: true,
      total: true,
      paymentMethod: true,
      paidAt: true,
      createdAt: true,
      order: {
        select: {
          id: true,
          state: true,
          notes: true,
          table: { select: { number: true } },
          items: {
            orderBy: { id: "asc" },
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              notes: true,
              menuItem: { select: { name: true, isVeg: true } },
            },
          },
        },
      },
    },
  });
}

/**
 * Today's takings.
 *
 * No `factoryId` parameter, despite the spec: this is a `"use server"` module, so
 * an exported function taking a tenant id is a public endpoint that reads any
 * restaurant's revenue. It comes from the session.
 *
 * One grouped query rather than four counts — the split is the report.
 */
export async function todaysSummary() {
  const user = await getOwnerUser();
  if (!user) return { total: 0, count: 0, average: 0, byMethod: {} as Record<string, number> };

  const rows = await prisma.diningBill.groupBy({
    by: ["paymentMethod"],
    where: { factoryId: user.factoryId, paidAt: { gte: istDayStart() } },
    _sum: { total: true },
    _count: { _all: true },
  });

  const byMethod: Record<string, number> = {};
  let total = 0;
  let count = 0;
  for (const row of rows) {
    const sum = row._sum.total ?? 0;
    total += sum;
    count += row._count._all;
    if (row.paymentMethod) byMethod[row.paymentMethod] = sum;
  }

  return { total, count, average: count > 0 ? Math.round(total / count) : 0, byMethod };
}
