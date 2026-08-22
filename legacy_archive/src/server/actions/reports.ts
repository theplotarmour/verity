"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { getInventoryOverview } from "@/server/actions/inventory";

function dayKey(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 10);
}

// One aggregation call powering the whole Reports pack. All time-scoped reports
// respect [from, to]; inventory is a point-in-time snapshot.
export async function getReportsData(fromISO?: string, toISO?: string) {
  const user = await getOwnerUser();
  if (!user) return null;
  const factoryId = user.factoryId;

  const to = toISO ? new Date(toISO) : new Date();
  to.setHours(23, 59, 59, 999);
  const from = fromISO ? new Date(fromISO) : new Date(Date.now() - 30 * 864e5);
  from.setHours(0, 0, 0, 0);
  const range = { gte: from, lte: to };

  /*
   * Production, employee productivity and quality were all read off job cards
   * and their checkpoint submissions. Both went with the manufacturing module.
   * The orders, dispatch and inventory sections below are unaffected, so the
   * pack keeps its shape and the three production sections report zero.
   */
  const [users, orders, dispatches, overview] = await Promise.all([
    prisma.user.findMany({ where: { factoryId }, select: { id: true, name: true, role: true } }),
    prisma.salesOrder.findMany({
      where: { factoryId },
      include: { customer: true },
      orderBy: { orderDate: "desc" },
    }),
    prisma.dispatch.findMany({
      where: { factoryId },
      include: { salesOrder: { include: { customer: true } }, destinationWarehouse: true },
      orderBy: { dispatchedAt: "desc" },
    }),
    getInventoryOverview(),
  ]);

  const production = { daily: [], totalCards: 0, totalUnits: 0 };
  const employees: { name: string; completed: number; rework: number; minutes: number }[] = [];

  // ---- Orders ----
  const doneStatuses = ["DELIVERED", "DISPATCHED", "COMPLETED"];
  const pendingOrders = orders
    .filter((o) => !doneStatuses.includes(o.status))
    .map((o) => ({ soNumber: o.soNumber, customer: o.customer?.name ?? "—", status: o.status, date: o.orderDate }));
  const completedOrders = orders
    .filter((o) => doneStatuses.includes(o.status) && o.orderDate >= from && o.orderDate <= to)
    .map((o) => ({ soNumber: o.soNumber, customer: o.customer?.name ?? "—", status: o.status, date: o.orderDate }));

  // ---- Dispatch ----
  const dispatchRows = dispatches
    .filter((d) => d.dispatchedAt >= from && d.dispatchedAt <= to)
    .map((d) => ({
      soNumber: d.salesOrder?.soNumber ?? "—",
      destination: d.destinationType === "CUSTOMER" ? (d.customerName ?? d.salesOrder?.customer?.name ?? "Customer") : (d.destinationWarehouse?.name ?? d.destinationType),
      transporter: d.transporter ?? "—",
      status: d.status,
      dispatchedAt: d.dispatchedAt,
      deliveredAt: d.deliveredAt,
    }));

  const quality = {
    total: 0,
    pass: 0,
    fail: 0,
    passRate: null,
    rejectionReasons: [],
    reworkByStage: [],
  };

  // ---- Inventory snapshot ----
  const inventory = {
    summary: overview?.summary ?? null,
    valuation: overview?.valuation ?? [],
  };

  return {
    range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    production,
    employees,
    orders: { pending: pendingOrders, completed: completedOrders },
    dispatch: dispatchRows,
    quality,
    inventory,
  };
}
