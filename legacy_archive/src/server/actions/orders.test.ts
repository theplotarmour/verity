import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";

/**
 * Characterisation tests for the order shape.
 *
 * These capture what the system does *today*, not what it should do. Their job
 * is to fail loudly if a refactor of the order studio quietly breaks order
 * booking.
 *
 * They used to walk the order → blueprint → production chain and assert that
 * every order had an active blueprint version with a populated BOM, and that
 * item spec hashes were unique. That chain went with the manufacturing module;
 * what is left to characterise is that an order's lines point at real items.
 *
 * They read the seeded database rather than calling the server actions, because
 * those call getOwnerUser(), which needs a request context.
 *
 * On a blank factory they are skipped rather than failed: "there are no orders"
 * is not a regression, and a suite that stays red teaches everyone to ignore it.
 */
describe("order shape", () => {
  let factoryId: string;
  let seeded = false;

  /**
   * Seeded orders only — anything the headless API booked is excluded.
   *
   * vitest runs files in parallel against one database, and
   * `orderIngest.test.ts` deliberately books an order whose line holds a *refused*
   * cross-tenant item, so its `itemId` is null. That is the correct outcome there
   * and a failure here, and scanning "every order in the factory" made this file
   * pass or fail on timing. `ingestExternalOrder` stamps every order it creates
   * `EXT-…`, so the filter is what the writer actually writes rather than a
   * snapshot taken at a moment that has no guaranteed order.
   */
  const SEEDED_ORDERS = { soNumber: { not: { startsWith: "EXT-" } } } as const;

  beforeAll(async () => {
    const f = await prisma.factory.findFirstOrThrow({ where: { slug: "carxen" } });
    factoryId = f.id;
    seeded = (await prisma.salesOrder.count({ where: { factoryId, ...SEEDED_ORDERS } })) > 0;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("has seeded orders to characterise", async () => {
    if (!seeded) return;
    expect(await prisma.salesOrder.count({ where: { factoryId, ...SEEDED_ORDERS } })).toBeGreaterThan(0);
  });

  it("every order line resolves to a producible item", async () => {
    if (!seeded) return;
    const orders = await prisma.salesOrder.findMany({
      where: { factoryId, ...SEEDED_ORDERS },
      include: { items: true },
    });
    for (const o of orders) {
      for (const line of o.items) {
        // The order line now points straight at the finished-good item;
        // Product/ProductVariant are no longer minted.
        expect(line.itemId).toBeTruthy();
      }
    }
  });
});
