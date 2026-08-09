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

  const [jobCards, users, orders, dispatches, submissions, overview] = await Promise.all([
    prisma.jobCard.findMany({
      where: { factoryId },
      include: {
        stage: true,
        // Three joins deep to ProductVariant -> Product, on every row, for a
        // name nothing here reads. The item carries its own name.
        workOrder: {
          include: {
            productionPlan: {
              include: {
                blueprintVersion: {
                  include: {
                    blueprint: { include: { item: { select: { id: true, name: true, itemCode: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    }),
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
    prisma.checkpointSubmission.findMany({
      where: { factoryId, passFail: { not: null }, completedAt: range },
      include: { inspection: { include: { jobCard: { include: { stage: true } } } } },
    }),
    getInventoryOverview(),
  ]);

  const userName = new Map(users.map((u) => [u.id, u.name]));

  // ---- Production (completed job cards in range, by day) ----
  const completedInRange = jobCards.filter((j) => j.status === "COMPLETED" && j.completedAt && j.completedAt >= from && j.completedAt <= to);
  const prodByDay = new Map<string, { units: number; cards: number }>();
  for (const j of completedInRange) {
    const k = dayKey(j.completedAt);
    const cur = prodByDay.get(k) ?? { units: 0, cards: 0 };
    cur.units += j.completedQty; cur.cards += 1;
    prodByDay.set(k, cur);
  }
  const production = {
    daily: Array.from(prodByDay.entries()).sort((a, b) => a[0] < b[0] ? 1 : -1).map(([date, v]) => ({ date, cards: v.cards, units: v.units })),
    totalCards: completedInRange.length,
    totalUnits: completedInRange.reduce((s, j) => s + j.completedQty, 0),
  };

  // ---- Employee productivity ----
  const empMap = new Map<string, { name: string; completed: number; rework: number; minutes: number }>();
  for (const j of jobCards) {
    if (!j.assignedToId) continue;
    if (!empMap.has(j.assignedToId)) empMap.set(j.assignedToId, { name: userName.get(j.assignedToId) ?? "Unknown", completed: 0, rework: 0, minutes: 0 });
    const e = empMap.get(j.assignedToId)!;
    if (j.status === "COMPLETED" && j.completedAt && j.completedAt >= from && j.completedAt <= to) { e.completed += 1; e.minutes += j.timeSpentMins; }
    if (j.status === "REWORK_REQUIRED" || j.reworkReason) e.rework += 1;
  }
  const employees = Array.from(empMap.values()).sort((a, b) => b.completed - a.completed);

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

  // ---- Quality ----
  const pass = submissions.filter((s) => s.passFail === "PASS").length;
  const fail = submissions.filter((s) => s.passFail === "FAIL").length;
  const rejectionMap = new Map<string, number>();
  for (const s of submissions.filter((x) => x.passFail === "FAIL")) {
    const reason = (s.remarks?.trim() || "Unspecified").slice(0, 80);
    rejectionMap.set(reason, (rejectionMap.get(reason) ?? 0) + 1);
  }
  const reworkByStage = new Map<string, number>();
  for (const j of jobCards.filter((x) => x.status === "REWORK_REQUIRED" || x.reworkReason)) {
    const stage = j.stage?.name ?? "Unstaged";
    reworkByStage.set(stage, (reworkByStage.get(stage) ?? 0) + 1);
  }
  const quality = {
    total: submissions.length,
    pass,
    fail,
    passRate: submissions.length ? Math.round((pass / submissions.length) * 100) : null,
    rejectionReasons: Array.from(rejectionMap.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    reworkByStage: Array.from(reworkByStage.entries()).map(([stage, count]) => ({ stage, count })).sort((a, b) => b.count - a.count),
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
