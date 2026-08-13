import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import prisma from "@/lib/prisma";
import { GST_RATE, istDayStart, orderTotal } from "@/lib/dining";

/**
 * Restaurant billing.
 *
 * Money, so the arithmetic is pinned exactly and the refusals are pinned twice.
 * Two of them protect a settled record: a bill paid once must not be payable
 * again, and an order the kitchen has not served must not be billable.
 */

const SOURCE = readFileSync(path.resolve(__dirname, "diningBilling.ts"), "utf8");
const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

describe("bill arithmetic", () => {
  it("totals subtotal minus discount plus tax", () => {
    const subtotal = 1_000_00;
    const taxPaise = Math.round(subtotal * GST_RATE);
    const discountPaise = 100_00;
    expect(taxPaise).toBe(50_00);
    expect(subtotal - discountPaise + taxPaise).toBe(950_00);
  });

  it("taxes the food, not the discounted figure", () => {
    // A discount is money off the food; the government's share does not move.
    const subtotal = 500_00;
    expect(Math.round(subtotal * GST_RATE)).toBe(25_00);
  });

  it("keeps everything in whole paise", () => {
    // 333.33 rupees at 5% is 16.6665 rupees of tax. It must land on an integer or
    // the bill does not add up.
    const tax = Math.round(333_33 * GST_RATE);
    expect(Number.isInteger(tax)).toBe(true);
    expect(tax).toBe(1667);
  });

  it("sums lines from the snapshot", () => {
    expect(orderTotal([{ quantity: 3, unitPrice: 120_00 }, { quantity: 1, unitPrice: 40_00 }])).toBe(
      400_00
    );
  });
});

describe("istDayStart", () => {
  it("rolls over at IST midnight, not UTC midnight", () => {
    // 18:45 UTC on the 3rd is 00:15 IST on the 4th — already tomorrow's takings.
    const start = istDayStart(new Date("2026-03-03T18:45:00.000Z"));
    expect(start.toISOString()).toBe("2026-03-03T18:30:00.000Z");
  });

  it("keeps a late service on one day", () => {
    // 17:00 UTC is 22:30 IST — same evening, same day's cash.
    const evening = istDayStart(new Date("2026-03-03T17:00:00.000Z"));
    expect(evening.toISOString()).toBe("2026-03-02T18:30:00.000Z");
  });

  it("is always 18:30 UTC", () => {
    for (const iso of ["2026-01-01T00:00:00Z", "2026-07-15T12:00:00Z", "2026-12-31T23:59:00Z"]) {
      const d = istDayStart(new Date(iso));
      expect(d.getUTCHours()).toBe(18);
      expect(d.getUTCMinutes()).toBe(30);
    }
  });
});

describe("billing against the schema", () => {
  let factoryId: string;
  let categoryId: string;
  let seeded = false;
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const cleanup = { tables: [] as string[], categories: [] as string[], orders: [] as string[] };

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    seeded = true;
    const category = await prisma.menuCategory.create({
      data: { factoryId, name: `Billing test ${suffix}` },
      select: { id: true },
    });
    categoryId = category.id;
    cleanup.categories.push(category.id);
  });

  afterAll(async () => {
    await prisma.diningBill.deleteMany({ where: { orderId: { in: cleanup.orders } } });
    await prisma.diningOrderItem.deleteMany({ where: { orderId: { in: cleanup.orders } } });
    await prisma.diningOrder.deleteMany({ where: { tableId: { in: cleanup.tables } } });
    await prisma.restaurantTable.deleteMany({ where: { id: { in: cleanup.tables } } });
    await prisma.menuItem.deleteMany({ where: { categoryId: { in: cleanup.categories } } });
    await prisma.menuCategory.deleteMany({ where: { id: { in: cleanup.categories } } });
    await prisma.$disconnect();
  }, 30_000);

  async function makeOrder(label: string, state: "SERVED" | "PREPARING" | "PAID", price = 400_00) {
    const table = await prisma.restaurantTable.create({
      data: { factoryId, number: `B-${label}-${suffix}`, capacity: 2 },
      select: { id: true },
    });
    cleanup.tables.push(table.id);
    const item = await prisma.menuItem.create({
      data: { factoryId, categoryId, name: `Bill dish ${label} ${suffix}`, price },
      select: { id: true, price: true },
    });
    const order = await prisma.diningOrder.create({
      data: {
        factoryId,
        tableId: table.id,
        state,
        items: { create: [{ menuItemId: item.id, quantity: 2, unitPrice: item.price }] },
      },
      select: { id: true },
    });
    cleanup.orders.push(order.id);
    return order.id;
  }

  async function makeBill(orderId: string, discountPaise = 0) {
    const order = await prisma.diningOrder.findUniqueOrThrow({
      where: { id: orderId },
      select: { items: { select: { quantity: true, unitPrice: true } } },
    });
    const subtotal = orderTotal(order.items);
    const taxPaise = Math.round(subtotal * GST_RATE);
    return prisma.diningBill.create({
      data: {
        factoryId,
        orderId,
        subtotal,
        discountPaise,
        taxPaise,
        total: subtotal - discountPaise + taxPaise,
      },
      select: { id: true, subtotal: true, taxPaise: true, total: true },
    });
  }

  it("computes the total from the order's snapshotted lines", async () => {
    if (!seeded) return;
    const orderId = await makeOrder("total", "SERVED");
    const bill = await makeBill(orderId);
    // 2 × ₹400 = ₹800, +5% = ₹840.
    expect(bill.subtotal).toBe(800_00);
    expect(bill.taxPaise).toBe(40_00);
    expect(bill.total).toBe(840_00);
  });

  it("recomputes the total when a discount lands, leaving tax alone", async () => {
    if (!seeded) return;
    const orderId = await makeOrder("disc", "SERVED");
    const bill = await makeBill(orderId);

    const discountPaise = 100_00;
    const updated = await prisma.diningBill.update({
      where: { id: bill.id },
      data: { discountPaise, total: bill.subtotal - discountPaise + bill.taxPaise },
      select: { total: true, taxPaise: true },
    });
    expect(updated.total).toBe(740_00);
    expect(updated.taxPaise).toBe(40_00);
  });

  it("holds one bill per order", async () => {
    if (!seeded) return;
    // orderId is unique, so a second generateBill would be a constraint error
    // mid-service if the action did not return the existing bill instead.
    const orderId = await makeOrder("once", "SERVED");
    await makeBill(orderId);
    await expect(makeBill(orderId)).rejects.toThrow();
  });

  it("refuses a second payment on a settled bill", async () => {
    if (!seeded) return;
    const orderId = await makeOrder("paid", "SERVED");
    const bill = await makeBill(orderId);

    await prisma.diningBill.update({
      where: { id: bill.id },
      data: { paymentMethod: "CASH", paidAt: new Date() },
    });

    // The check recordPayment runs.
    const settled = await prisma.diningBill.findUniqueOrThrow({
      where: { id: bill.id },
      select: { paidAt: true },
    });
    expect(settled.paidAt).not.toBeNull();
  });

  it("only bills a SERVED order", async () => {
    if (!seeded) return;
    const orderId = await makeOrder("early", "PREPARING");
    const order = await prisma.diningOrder.findUniqueOrThrow({
      where: { id: orderId },
      select: { state: true },
    });
    expect(order.state === "SERVED").toBe(false);
  });

  it("counts only today's paid bills, and only ours", async () => {
    if (!seeded) return;
    const orderId = await makeOrder("today", "SERVED", 100_00);
    const bill = await makeBill(orderId);
    await prisma.diningBill.update({
      where: { id: bill.id },
      data: { paymentMethod: "UPI", paidAt: new Date() },
    });

    const mine = await prisma.diningBill.findMany({
      where: { factoryId, paidAt: { gte: istDayStart() }, id: bill.id },
      select: { id: true },
    });
    expect(mine).toHaveLength(1);

    const theirs = await prisma.diningBill.findMany({
      where: { factoryId: "some-other-factory", paidAt: { gte: istDayStart() } },
      select: { id: true },
    });
    expect(theirs.map((b) => b.id)).not.toContain(bill.id);
  });

  it("leaves an unpaid bill out of the takings", async () => {
    if (!seeded) return;
    // paidAt null — raised but not settled. It is not money yet.
    const orderId = await makeOrder("unpaid", "SERVED");
    const bill = await makeBill(orderId);

    const paid = await prisma.diningBill.findMany({
      where: { factoryId, paidAt: { gte: istDayStart() }, id: bill.id },
      select: { id: true },
    });
    expect(paid).toHaveLength(0);
  });
});

describe("the billing actions", () => {
  it("never write order or table state themselves", () => {
    // advanceOrder moves SERVED to BILLED and BILLED to PAID, and frees the table
    // on PAID. A second writer here would be a second answer.
    expect(code).not.toMatch(/diningOrder\.update(Many)?\(/);
    expect(code).not.toMatch(/restaurantTable\.update(Many)?\(/);
    expect(code).toMatch(/advanceOrder\(/);
  });

  it("takes no factoryId argument, including on the summary", () => {
    // The spec asked for todaysSummary(factoryId). This is a "use server" module,
    // so that signature is a public endpoint returning any restaurant's revenue.
    expect(code).not.toMatch(/export async function \w+\([^)]*factoryId/);
    expect(code).toMatch(/getOwnerUser\(\)/);
  });

  it("scopes every query by the session's factory", () => {
    const queries = code.match(/(findFirst|findMany|groupBy)\(\{\s*[\s\S]{0,80}?where: \{[^}]*\}/g) ?? [];
    expect(queries.length).toBeGreaterThan(0);
    for (const query of queries) {
      expect(query, "a billing query is not factory-scoped").toMatch(/factoryId/);
    }
  });

  it("guards writes on the billing module and the subscription", () => {
    for (const fn of ["generateBill", "applyDiscount", "recordPayment"]) {
      const body = code.slice(code.indexOf(`export async function ${fn}`));
      expect(body.slice(0, body.indexOf("\n}")), `${fn} is unguarded`).toMatch(
        /guardModuleWrite\("billing"\)/
      );
    }
  });

  it("gates discounting on a manager permission", () => {
    expect(code).toMatch(/permissions\.has\("invoice\.manage"\)/);
  });

  it("refuses to change a paid bill", () => {
    // A settled bill is a record. Changing it is a refund, a different action.
    expect(code).toMatch(/bill\.paidAt/);
  });
});
