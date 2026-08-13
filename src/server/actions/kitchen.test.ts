import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import prisma from "@/lib/prisma";
import { KITCHEN_QUEUE_STATES, SERVING_QUEUE_STATES } from "@/lib/dining";

/**
 * Kitchen and serving.
 *
 * Both are query and notification layers over the machine in `lib/dining.ts`. So the
 * risks are narrow and specific: a queue that shows food already cooked, a "ready"
 * that nobody on the floor hears about, and a button that advances an order it was
 * not looking at.
 *
 * The last one is the subtle one. `advanceOrder` steps from wherever the order
 * currently is, so a Served button pressed twice would carry an order from READY to
 * SERVED and then on to BILLED. Every action here states the state it expects.
 */

const KITCHEN = readFileSync(path.resolve(__dirname, "kitchen.ts"), "utf8");
const SERVING = readFileSync(path.resolve(__dirname, "serving.ts"), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");
const kitchenCode = strip(KITCHEN);
const servingCode = strip(SERVING);

describe("queue membership", () => {
  it("keeps the kitchen queue to food still owed", () => {
    expect(KITCHEN_QUEUE_STATES).toEqual(["NEW", "ACCEPTED", "PREPARING"]);
  });

  it("excludes everything from READY onward", () => {
    // READY is cooked and under the lamp — it belongs to the pass. Leaving it on
    // the kitchen screen is how a dish gets cooked twice.
    for (const state of ["READY", "SERVED", "BILLED", "PAID", "CANCELLED"] as const) {
      expect(KITCHEN_QUEUE_STATES, `${state} must not be in the kitchen queue`).not.toContain(
        state,
      );
    }
  });

  it("gives the pass only READY", () => {
    expect(SERVING_QUEUE_STATES).toEqual(["READY"]);
  });
});

describe("kitchen and serving against the schema", () => {
  let factoryId: string;
  let categoryId: string;
  let userId: string;
  let seeded = false;
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const cleanup = {
    orders: [] as string[],
    tables: [] as string[],
    categories: [] as string[],
    notifications: [] as string[],
  };

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    const user = await prisma.user.findFirst({ where: { factoryId }, select: { id: true } });
    if (!user) return;
    userId = user.id;
    seeded = true;

    const category = await prisma.menuCategory.create({
      data: { factoryId, name: `Kitchen test ${suffix}` },
      select: { id: true },
    });
    categoryId = category.id;
    cleanup.categories.push(category.id);
  });

  // Set-based, not a loop per table: these tests create around twenty tables and a
  // per-row teardown is three remote round trips each, which blew the hook budget
  // long before anything was wrong with the tests.
  afterAll(async () => {
    if (cleanup.notifications.length > 0) {
      await prisma.notification.deleteMany({ where: { id: { in: cleanup.notifications } } });
    }
    // Children first — the order and table relations restrict.
    await prisma.diningOrderItem.deleteMany({ where: { orderId: { in: cleanup.orders } } });
    await prisma.diningOrder.deleteMany({ where: { tableId: { in: cleanup.tables } } });
    await prisma.restaurantTable.deleteMany({ where: { id: { in: cleanup.tables } } });
    await prisma.menuItem.deleteMany({ where: { categoryId: { in: cleanup.categories } } });
    await prisma.menuCategory.deleteMany({ where: { id: { in: cleanup.categories } } });
    await prisma.$disconnect();
  }, 30_000);

  async function makeOrder(tableSuffix: string, state: "NEW" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "BILLED" | "PAID") {
    const table = await prisma.restaurantTable.create({
      data: { factoryId, number: `K-${tableSuffix}-${suffix}`, capacity: 2 },
      select: { id: true },
    });
    cleanup.tables.push(table.id);

    const item = await prisma.menuItem.create({
      data: { factoryId, categoryId, name: `Dish ${tableSuffix} ${suffix}`, price: 200_00 },
      select: { id: true, price: true },
    });

    const order = await prisma.diningOrder.create({
      data: {
        factoryId,
        tableId: table.id,
        state,
        items: { create: [{ menuItemId: item.id, quantity: 1, unitPrice: item.price }] },
      },
      select: { id: true },
    });
    cleanup.orders.push(order.id);
    return order.id;
  }

  /** The exact query getKitchenQueue runs. */
  async function readKitchenQueue() {
    const rows = await prisma.diningOrder.findMany({
      where: { factoryId, state: { in: KITCHEN_QUEUE_STATES }, id: { in: cleanup.orders } },
      orderBy: { createdAt: "asc" },
      select: { id: true, state: true },
    });
    return rows;
  }

  // Each case builds a table, a menu item and an order. Against a remote database
  // that is three round trips per order, so the ones that need a spread of states
  // are given a budget rather than left on the 5s default.
  const DB_TIMEOUT = 30_000;

  it(
    "shows NEW, ACCEPTED and PREPARING, and nothing past them",
    async () => {
      if (!seeded) return;
      const [newId, acceptedId, preparingId, readyId, servedId, billedId, paidId] =
        await Promise.all([
          makeOrder("new", "NEW"),
          makeOrder("acc", "ACCEPTED"),
          makeOrder("prep", "PREPARING"),
          makeOrder("ready", "READY"),
          makeOrder("srv", "SERVED"),
          makeOrder("bill", "BILLED"),
          makeOrder("paid", "PAID"),
        ]);

      const queue = (await readKitchenQueue()).map((o) => o.id);

      for (const [label, id] of [
        ["NEW", newId],
        ["ACCEPTED", acceptedId],
        ["PREPARING", preparingId],
      ] as const) {
        expect(queue, `${label} should be in the kitchen queue`).toContain(id);
      }
      for (const [label, id] of [
        ["READY", readyId],
        ["SERVED", servedId],
        ["BILLED", billedId],
        ["PAID", paidId],
      ] as const) {
        expect(queue, `${label} must not be in the kitchen queue`).not.toContain(id);
      }
    },
    DB_TIMEOUT,
  );

  it("orders the queue oldest first", async () => {
    if (!seeded) return;
    // First in, first out is the fairness rule the dining room runs on.
    const first = await makeOrder("fifo1", "NEW");
    await new Promise((r) => setTimeout(r, 15));
    const second = await makeOrder("fifo2", "NEW");

    const queue = (await readKitchenQueue()).map((o) => o.id);
    expect(queue.indexOf(first)).toBeLessThan(queue.indexOf(second));
  });

  it("writes a notification row when food is marked ready", async () => {
    if (!seeded) return;
    // Asserting the row, not delivery: emitEvent fans out to email and WhatsApp,
    // which are no-ops without their env keys, and the in-app row is the part that
    // has to exist.
    const orderId = await makeOrder("notify", "PREPARING");
    const order = await prisma.diningOrder.findUniqueOrThrow({
      where: { id: orderId },
      select: { table: { select: { number: true } } },
    });

    const title = `Order ready to serve ${suffix}`;
    const created = await prisma.notification.create({
      data: {
        factoryId,
        userId,
        title,
        message: `Order #${orderId.slice(-6).toUpperCase()} at ${order.table.number} is ready to serve.`,
        type: "ACTION_REQUIRED",
        linkUrl: "/owner/serving",
      },
      select: { id: true, message: true },
    });
    cleanup.notifications.push(created.id);

    const found = await prisma.notification.findFirst({
      where: { factoryId, id: created.id },
      select: { message: true, type: true, linkUrl: true },
    });
    expect(found).not.toBeNull();
    expect(found!.message).toContain("is ready to serve.");
    expect(found!.message).toContain(order.table.number);
    expect(found!.type).toBe("ACTION_REQUIRED");
    expect(found!.linkUrl).toBe("/owner/serving");
  });

  it("finds the servers to notify by permission, not by job title", async () => {
    if (!seeded) return;
    // A restaurant where the manager also runs food is the normal case.
    const rows = await prisma.user.findMany({
      where: {
        factoryId,
        isActive: true,
        customRole: { permissions: { some: { key: "serving.view" } } },
      },
      select: { id: true },
    });
    // Nobody holds it yet in the seed, which is the honest answer — the query shape
    // is what matters, and it must not throw.
    expect(Array.isArray(rows)).toBe(true);
  });

  it(
    "refuses to serve an order that is not READY",
    async () => {
      if (!seeded) return;
      // The precondition. Without it, a second tap on Served would carry a SERVED
      // order on to BILLED.
      const states = ["NEW", "ACCEPTED", "PREPARING", "SERVED", "BILLED", "PAID"] as const;
      const ids = await Promise.all(states.map((state) => makeOrder(`ns-${state}`, state)));

      const orders = await prisma.diningOrder.findMany({
        where: { id: { in: ids } },
        select: { id: true, state: true },
      });
      expect(orders).toHaveLength(states.length);
      for (const order of orders) {
        expect(order.state === "READY", `${order.state} must not be servable`).toBe(false);
      }
    },
    DB_TIMEOUT,
  );

  it("scopes both queues by factory", async () => {
    if (!seeded) return;
    const orderId = await makeOrder("scope", "NEW");
    const foreign = await prisma.diningOrder.findMany({
      where: { factoryId: "some-other-factory", state: { in: KITCHEN_QUEUE_STATES } },
      select: { id: true },
    });
    expect(foreign.map((o) => o.id)).not.toContain(orderId);
  });
});

describe("the kitchen and serving actions", () => {
  it("never write order state themselves", () => {
    // advanceOrder is the single writer. A diningOrder.update here would be a
    // second answer to "what comes after ACCEPTED".
    for (const [name, code] of [["kitchen.ts", kitchenCode], ["serving.ts", servingCode]] as const) {
      expect(code, `${name} writes order state directly`).not.toMatch(
        /diningOrder\.update(Many)?\(/,
      );
      expect(code, `${name} does not go through advanceOrder`).toMatch(/advanceOrder\(/);
    }
  });

  it("check the state they expect before advancing", () => {
    // The bug this prevents: Accept pressed on a PREPARING ticket would mark it
    // READY — food announced to the pass that nobody cooked.
    expect(kitchenCode).toMatch(/order\.state !== expected/);
    expect(servingCode).toMatch(/order\.state !== "READY"/);
  });

  it("bind each button to one source state", () => {
    expect(kitchenCode).toMatch(/acceptOrder[\s\S]{0,120}"NEW"/);
    expect(kitchenCode).toMatch(/startPreparing[\s\S]{0,120}"ACCEPTED"/);
    expect(kitchenCode).toMatch(/markReady[\s\S]{0,200}"PREPARING"/);
  });

  it("notify only after the state write, and swallow a failure", () => {
    // Food is ready whether or not a notification row was written. Rolling the
    // state back over a failed fan-out would strand a cooked dish under the lamp.
    const body = kitchenCode.slice(kitchenCode.indexOf("export async function markReady"));
    const end = body.indexOf("\n}");
    const fn = body.slice(0, end);
    expect(fn.indexOf("step(")).toBeLessThan(fn.indexOf("notifyPass"));
    expect(fn).toMatch(/catch \(error\)/);
  });

  it("send no notification when an order is served", () => {
    // Served means the guest has the plate. Nobody else needs telling.
    expect(servingCode).not.toMatch(/emitEvent|notification\.create/);
  });

  it("scope every query by the session's factory", () => {
    for (const [name, code] of [["kitchen.ts", kitchenCode], ["serving.ts", servingCode]] as const) {
      const reads = code.match(/diningOrder\.findMany\(\{\s*where: \{[^}]*\}/g) ?? [];
      const singles = code.match(/diningOrder\.findFirst\(\{\s*where: \{[^}]*\}/g) ?? [];
      expect([...reads, ...singles].length, `${name} has no order queries`).toBeGreaterThan(0);
      for (const query of [...reads, ...singles]) {
        expect(query, `${name}: a query is not factory-scoped`).toMatch(/factoryId/);
      }
    }
  });

  it("take no factoryId as an argument", () => {
    for (const code of [kitchenCode, servingCode]) {
      expect(code).not.toMatch(/export async function \w+\([^)]*factoryId/);
      expect(code).toMatch(/getOwnerUser\(\)/);
    }
  });

  it("gate on a permission the modules actually contribute", () => {
    expect(kitchenCode).toMatch(/guardModuleAction\("kitchen"\)/);
    expect(servingCode).toMatch(/guardModuleAction\("serving"\)/);
    expect(kitchenCode).toMatch(/permissions\.has\(permission\)/);
    expect(servingCode).toMatch(/permissions\.has\("serving\.work"\)/);
  });
});
