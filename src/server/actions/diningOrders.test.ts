import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import prisma from "@/lib/prisma";
import {
  ACTIVE_ORDER_STATES,
  DINING_BLOCKERS,
  ORDER_SEQUENCE,
  canTransitionTable,
  isOrderCancellable,
  isOrderEditable,
  nextOrderState,
  orderLabel,
  orderTotal,
} from "@/lib/dining";

/**
 * Tables & Orders.
 *
 * The state machine is the module. Three of the four behaviours pinned here are
 * refusals, which is the point: a bill printed for food the kitchen never
 * acknowledged, an order looping from PAID back to NEW, or a cancellation after the
 * pan is on are all unrecoverable from a floor tablet mid-service.
 *
 * The machine itself is pure and tested directly. The parts that need the database —
 * that an unavailable item is refused, that tenancy holds — run against the real
 * schema, because the risk there is the query, not the arithmetic.
 */

describe("the order sequence", () => {
  it("walks NEW to PAID in order", () => {
    expect(ORDER_SEQUENCE).toEqual([
      "NEW",
      "ACCEPTED",
      "PREPARING",
      "READY",
      "SERVED",
      "BILLED",
      "PAID",
    ]);

    let state = ORDER_SEQUENCE[0];
    const walked = [state];
    for (let i = 0; i < 10; i += 1) {
      const next = nextOrderState(state);
      if (!next) break;
      state = next;
      walked.push(state);
    }
    expect(walked).toEqual(ORDER_SEQUENCE);
  });

  it("stops at PAID rather than wrapping around", () => {
    // The bug an unchecked `index + 1` would produce: a paid table quietly
    // reopening as a new order.
    expect(nextOrderState("PAID")).toBeNull();
  });

  it("has no next state for CANCELLED, which is off the ladder", () => {
    expect(nextOrderState("CANCELLED")).toBeNull();
  });

  it("only lets the contents change before the kitchen has the ticket", () => {
    expect(isOrderEditable("NEW")).toBe(true);
    expect(isOrderEditable("ACCEPTED")).toBe(true);
    // From here the kitchen is cooking from a ticket that must stop moving.
    for (const state of ["PREPARING", "READY", "SERVED", "BILLED", "PAID", "CANCELLED"] as const) {
      expect(isOrderEditable(state), `${state} should be locked`).toBe(false);
    }
  });

  it("only allows a cancel before PREPARING", () => {
    expect(isOrderCancellable("NEW")).toBe(true);
    expect(isOrderCancellable("ACCEPTED")).toBe(true);
    for (const state of ["PREPARING", "READY", "SERVED", "BILLED", "PAID", "CANCELLED"] as const) {
      expect(isOrderCancellable(state), `${state} should not be cancellable`).toBe(false);
    }
  });

  it("counts everything but PAID and CANCELLED as live on the floor", () => {
    expect(ACTIVE_ORDER_STATES).toEqual(["NEW", "ACCEPTED", "PREPARING", "READY", "SERVED", "BILLED"]);
  });
});

describe("table transitions", () => {
  it("lets a free table be sat, and nothing else", () => {
    expect(canTransitionTable("AVAILABLE", "OCCUPIED")).toBe(true);
    // The example from the spec, and the reason adjacency is checked at all.
    expect(canTransitionTable("AVAILABLE", "SERVED")).toBe(false);
    expect(canTransitionTable("AVAILABLE", "BILLING")).toBe(false);
    expect(canTransitionTable("AVAILABLE", "PAID")).toBe(false);
  });

  it("lets an occupied table be freed without inventing an order", () => {
    // Guests do get up and leave before ordering.
    expect(canTransitionTable("OCCUPIED", "AVAILABLE")).toBe(true);
  });

  it("refuses to skip a step forward", () => {
    expect(canTransitionTable("OCCUPIED", "READY")).toBe(false);
    expect(canTransitionTable("ORDERED", "SERVED")).toBe(false);
  });

  it("refuses to walk backwards", () => {
    expect(canTransitionTable("SERVED", "PREPARING")).toBe(false);
    expect(canTransitionTable("BILLING", "OCCUPIED")).toBe(false);
  });

  it("comes full circle from PAID", () => {
    expect(canTransitionTable("PAID", "AVAILABLE")).toBe(true);
  });
});

describe("order totals", () => {
  it("reads the snapshot, not the live menu price", () => {
    expect(orderTotal([{ quantity: 2, unitPrice: 249_00 }, { quantity: 1, unitPrice: 80_00 }])).toBe(
      578_00
    );
  });

  it("is zero for an empty order rather than NaN", () => {
    expect(orderTotal([])).toBe(0);
  });
});

describe("order labelling", () => {
  it("calls a table order by its table", () => {
    expect(orderLabel({ table: { number: "T01" }, token: 5 })).toBe("T01");
  });

  it("calls a counter order by its token, with the name if there is one", () => {
    expect(orderLabel({ table: null, token: 12 })).toBe("#12");
    expect(orderLabel({ table: null, token: 12, customerLabel: "Aisha" })).toBe("#12 · Aisha");
  });

  it("never renders blank — falls back to a short id", () => {
    expect(orderLabel({ table: null, token: null, id: "cku8w2abcd1234" })).toBe("#1234");
    expect(orderLabel({})).toBe("—");
  });
});

describe("dining orders against the schema", () => {
  let factoryId: string;
  let categoryId: string;
  let seeded = false;
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const cleanup = { orders: [] as string[], tables: [] as string[], categories: [] as string[] };

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    seeded = true;

    const category = await prisma.menuCategory.create({
      data: { factoryId, name: `Dining test ${suffix}` },
      select: { id: true },
    });
    categoryId = category.id;
    cleanup.categories.push(category.id);
  });

  afterAll(async () => {
    for (const id of cleanup.orders) {
      await prisma.diningBill.deleteMany({ where: { orderId: id } });
      await prisma.diningOrderItem.deleteMany({ where: { orderId: id } });
      await prisma.diningOrder.delete({ where: { id } }).catch(() => undefined);
    }
    for (const id of cleanup.tables) {
      await prisma.diningOrder.deleteMany({ where: { tableId: id } });
      await prisma.restaurantTable.delete({ where: { id } }).catch(() => undefined);
    }
    for (const id of cleanup.categories) {
      await prisma.menuItem.deleteMany({ where: { categoryId: id } });
      await prisma.menuCategory.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  async function makeTable(number: string) {
    const table = await prisma.restaurantTable.create({
      data: { factoryId, number: `${number}-${suffix}`, capacity: 4 },
      select: { id: true },
    });
    cleanup.tables.push(table.id);
    return table.id;
  }

  async function makeMenuItem(name: string, available = true, price = 249_00) {
    return prisma.menuItem.create({
      data: { factoryId, categoryId, name: `${name} ${suffix}`, price, available },
      select: { id: true, name: true, price: true, available: true },
    });
  }

  /** The resolver `createOrder` runs before it writes anything. */
  async function resolve(ids: string[], tenant = factoryId) {
    const found = await prisma.menuItem.findMany({
      where: { id: { in: ids }, factoryId: tenant },
      select: { id: true, name: true, price: true, available: true },
    });
    const missing = ids.filter((id) => !found.some((f) => f.id === id));
    const unavailable = found.filter((f) => !f.available);
    if (missing.length > 0) return { blocker: "NOT_ON_MENU" as const, names: [] as string[] };
    if (unavailable.length > 0) {
      return { blocker: DINING_BLOCKERS.ITEM_UNAVAILABLE, names: unavailable.map((u) => u.name) };
    }
    return { blocker: null, names: [] as string[], found };
  }

  it("rejects an order containing an unavailable item, naming it", async () => {
    if (!seeded) return;
    const fish = await makeMenuItem("Fish Curry", false);
    const dal = await makeMenuItem("Dal Tadka", true);

    const result = await resolve([dal.id, fish.id]);
    expect(result.blocker).toBe(DINING_BLOCKERS.ITEM_UNAVAILABLE);
    // Named, so the floor can tell the guest which dish rather than "order failed".
    expect(result.names).toEqual([fish.name]);
  });

  it("accepts the same order once the item is switched back on", async () => {
    if (!seeded) return;
    const fish = await makeMenuItem("Back On", false);
    expect((await resolve([fish.id])).blocker).toBe(DINING_BLOCKERS.ITEM_UNAVAILABLE);

    await prisma.menuItem.update({ where: { id: fish.id }, data: { available: true } });
    expect((await resolve([fish.id])).blocker).toBeNull();
  });

  it("will not build an order from another tenant's menu", async () => {
    if (!seeded) return;
    // menuItemId arrives from the client.
    const item = await makeMenuItem("Scoped");
    const result = await resolve([item.id], "some-other-factory");
    expect(result.blocker).toBe("NOT_ON_MENU");
  });

  it("snapshots the price onto the line, so repricing the menu leaves the bill alone", async () => {
    if (!seeded) return;
    const tableId = await makeTable("T-price");
    const item = await makeMenuItem("Snapshot", true, 300_00);

    const order = await prisma.diningOrder.create({
      data: {
        factoryId,
        tableId,
        items: { create: [{ menuItemId: item.id, quantity: 2, unitPrice: item.price }] },
      },
      select: { id: true },
    });
    cleanup.orders.push(order.id);

    // The menu goes up tomorrow.
    await prisma.menuItem.update({ where: { id: item.id }, data: { price: 400_00 } });

    const lines = await prisma.diningOrderItem.findMany({
      where: { orderId: order.id },
      select: { quantity: true, unitPrice: true },
    });
    expect(orderTotal(lines)).toBe(600_00);
  });

  it("holds one live order per table", async () => {
    if (!seeded) return;
    const tableId = await makeTable("T-one");
    const item = await makeMenuItem("Single");

    const first = await prisma.diningOrder.create({
      data: {
        factoryId,
        tableId,
        items: { create: [{ menuItemId: item.id, quantity: 1, unitPrice: item.price }] },
      },
      select: { id: true },
    });
    cleanup.orders.push(first.id);

    // The check createOrder runs.
    const live = await prisma.diningOrder.findFirst({
      where: { tableId, factoryId, state: { in: ACTIVE_ORDER_STATES } },
      select: { id: true },
    });
    expect(live?.id).toBe(first.id);

    // Once settled, the table takes a new one.
    await prisma.diningOrder.update({ where: { id: first.id }, data: { state: "PAID" } });
    const stillLive = await prisma.diningOrder.findFirst({
      where: { tableId, factoryId, state: { in: ACTIVE_ORDER_STATES } },
      select: { id: true },
    });
    expect(stillLive).toBeNull();
  });

  it("blocks deleting a table with a live order, and reports it", async () => {
    if (!seeded) return;
    const tableId = await makeTable("T-del");
    const item = await makeMenuItem("Blocker");
    const order = await prisma.diningOrder.create({
      data: {
        factoryId,
        tableId,
        items: { create: [{ menuItemId: item.id, quantity: 1, unitPrice: item.price }] },
      },
      select: { id: true },
    });
    cleanup.orders.push(order.id);

    const table = await prisma.restaurantTable.findFirstOrThrow({
      where: { id: tableId, factoryId },
      select: { _count: { select: { orders: { where: { state: { in: ACTIVE_ORDER_STATES } } } } } },
    });
    expect(table._count.orders).toBe(1);

    // And the database refuses too, as the backstop.
    await expect(prisma.restaurantTable.delete({ where: { id: tableId } })).rejects.toThrow();
  });

  it("refuses two tables with the same number", async () => {
    if (!seeded) return;
    // A duplicate puts an order on the wrong table.
    const number = `T-dup-${suffix}`;
    const table = await prisma.restaurantTable.create({
      data: { factoryId, number, capacity: 2 },
      select: { id: true },
    });
    cleanup.tables.push(table.id);

    await expect(
      prisma.restaurantTable.create({ data: { factoryId, number, capacity: 2 } })
    ).rejects.toThrow();
  });

  it("will not move another tenant's table", async () => {
    if (!seeded) return;
    const tableId = await makeTable("T-tenant");
    const { count } = await prisma.restaurantTable.updateMany({
      where: { id: tableId, factoryId: "some-other-factory" },
      data: { state: "OCCUPIED" },
    });
    expect(count).toBe(0);

    const row = await prisma.restaurantTable.findUniqueOrThrow({
      where: { id: tableId },
      select: { state: true },
    });
    expect(row.state).toBe("AVAILABLE");
  });

  it("takes a table-less counter order, paid up front, and finds it by token not table", async () => {
    if (!seeded) return;
    const item = await makeMenuItem("Counter Combo", true, 150_00);

    // What checkoutCounterOrder writes: an order with no table, a token, and a
    // bill already settled.
    const order = await prisma.diningOrder.create({
      data: {
        factoryId,
        tableId: null,
        token: 7,
        customerLabel: "Aisha",
        state: "NEW",
        items: { create: [{ menuItemId: item.id, quantity: 2, unitPrice: item.price }] },
        bill: {
          create: {
            factoryId,
            subtotal: 300_00,
            taxPaise: 15_00,
            total: 315_00,
            paymentMethod: "UPI",
            paidAt: new Date(),
          },
        },
      },
      select: { id: true, tableId: true, token: true },
    });
    cleanup.orders.push(order.id);

    expect(order.tableId).toBeNull();
    expect(order.token).toBe(7);

    // The counter queue's filter: table-less, still active. Scoped to this order's
    // id as well, so a sibling test's counter ticket on the shared database cannot
    // race in — the point is that this row satisfies the predicate, not which row
    // the unfiltered query happens to return first.
    const inQueue = await prisma.diningOrder.findFirst({
      where: { id: order.id, factoryId, tableId: null, state: { in: ACTIVE_ORDER_STATES } },
      select: { id: true, token: true, customerLabel: true, table: { select: { number: true } } },
    });
    expect(inQueue).not.toBeNull();
    expect(inQueue!.table).toBeNull();
    expect(orderLabel(inQueue!)).toBe("#7 · Aisha");

    // And it is billed and paid, so it already counts toward the day's takings.
    const bill = await prisma.diningBill.findUniqueOrThrow({
      where: { orderId: order.id },
      select: { total: true, paidAt: true },
    });
    expect(bill.total).toBe(315_00);
    expect(bill.paidAt).not.toBeNull();
  });
});

describe("the actions", () => {
  const orders = readFileSync(path.resolve(__dirname, "diningOrders.ts"), "utf8");
  const tables = readFileSync(path.resolve(__dirname, "tables.ts"), "utf8");
  const strip = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");
  const orderCode = strip(orders);
  const tableCode = strip(tables);

  it("exposes no way to set order state directly", () => {
    // The rule: advanceOrder drives the machine. A setOrderState export would be a
    // hole straight through it.
    expect(orderCode).not.toMatch(/export async function setOrderState/);
    const writes = orderCode.match(/diningOrder\.update(?:Many)?\(/g) ?? [];
    // createOrder opens at NEW, advanceOrder steps, cancelOrder exits. Three.
    expect(writes.length).toBeLessThanOrEqual(3);
  });

  it("derives the next state rather than hardcoding a ladder", () => {
    expect(orderCode).toMatch(/nextOrderState\(order\.state\)/);
  });

  it("touches table state at exactly the two settlement steps", () => {
    expect(orderCode).toMatch(
      /next === "BILLED" \? "BILLING" : next === "PAID" \? "AVAILABLE" : null/
    );
  });

  it("updates order and table together or not at all", () => {
    // A billed order with a table still reading OCCUPIED is a table nobody bills.
    for (const fn of ["advanceOrder", "cancelOrder", "createOrder"]) {
      const body = orderCode.slice(orderCode.indexOf(`export async function ${fn}`));
      expect(body.slice(0, body.indexOf("\n}")), `${fn} is not transactional`).toMatch(
        /prisma\.\$transaction/
      );
    }
  });

  it("scopes every read and write by the session's factory, or by a parent that is", () => {
    // `DiningOrderItem` has no `factoryId` of its own — it hangs off the order — so
    // its tenancy comes through `orderId`, the same way the warehouse subtree walks
    // to `Warehouse.factoryId`. That is only sound while the parent was fetched
    // factory-scoped, which the next test pins.
    for (const [name, code] of [["diningOrders.ts", orderCode], ["tables.ts", tableCode]] as const) {
      const filters = code.match(/where: \{ id: \w+/g) ?? [];
      expect(filters.length, `${name} has no id filters to check`).toBeGreaterThan(0);
      for (const filter of filters) {
        const at = code.indexOf(filter);
        expect(
          code.slice(at, at + 100),
          `${name}: ${filter} is scoped neither by factory nor by a checked parent`
        ).toMatch(/factoryId|orderId: order\.id/);
      }
    }
  });

  it("gates every parent lookup on the factory", () => {
    // The load-bearing half of the rule above. Every order read that a child write
    // then trusts must itself have been filtered by the session's factory.
    const reads = orderCode.match(/diningOrder\.findFirst\(\{\s*where: \{[^}]*\}/g) ?? [];
    expect(reads.length).toBeGreaterThan(0);
    for (const read of reads) {
      expect(read, "an order is read without a factory filter").toMatch(
        /factoryId: user\.factoryId/
      );
    }
  });

  it("takes no factoryId as an argument", () => {
    for (const code of [orderCode, tableCode]) {
      expect(code).not.toMatch(/export async function \w+\([^)]*factoryId/);
      expect(code).toMatch(/getOwnerUser\(\)/);
    }
  });

  it("guards every write on the module and the subscription", () => {
    const all = [
      ["diningOrders.ts", orderCode, ["createOrder", "addItem", "removeItem", "advanceOrder", "cancelOrder"]],
      ["tables.ts", tableCode, ["createTable", "updateTable", "deleteTable", "setTableState"]],
    ] as const;
    for (const [name, code, fns] of all) {
      for (const fn of fns) {
        const body = code.slice(code.indexOf(`export async function ${fn}`));
        expect(
          body.slice(0, body.indexOf("\n}")),
          `${name}: ${fn} does not call guardModuleWrite("tables_orders")`
        ).toMatch(/guardModuleWrite\("tables_orders"\)/);
      }
    }
  });

  it("cannot set a table's state through the generic update", () => {
    // updateTable is for the layout. State goes through the transition check.
    const body = tableCode.slice(tableCode.indexOf("export async function updateTable"));
    expect(body.slice(0, body.indexOf("\n}"))).not.toMatch(/state/);
  });

  it("returns named blockers rather than messages to match on", () => {
    expect(orderCode).toMatch(/DINING_BLOCKERS\.ITEM_UNAVAILABLE/);
    expect(orderCode).toMatch(/DINING_BLOCKERS\.ORDER_ALREADY_FINAL/);
    expect(orderCode).toMatch(/DINING_BLOCKERS\.CANCEL_TOO_LATE/);
    expect(tableCode).toMatch(/DINING_BLOCKERS\.ILLEGAL_TABLE_TRANSITION/);
  });

  it("snapshots the unit price when a line is created", () => {
    expect(orderCode).toMatch(/unitPrice: byId\.get\(item\.menuItemId\)!\.price/);
  });
});
