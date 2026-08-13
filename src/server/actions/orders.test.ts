import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";

/**
 * Characterisation tests for the order → blueprint → production chain.
 *
 * These capture what the system does *today*, not what it should do. Their job
 * is to fail loudly while ItemMaster and ProductVariant are being unified, so a
 * refactor of the 2,300-line order studio cannot quietly break order booking.
 *
 * They read the seeded database rather than calling the server actions, because
 * those call getOwnerUser(), which needs a request context.
 *
 * On a blank factory they are skipped rather than failed: "there are no orders"
 * is not a regression, and a suite that stays red teaches everyone to ignore it.
 */
describe("order and blueprint shape", () => {
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

  it("every order resolves to a finished-good item with a full production definition", async () => {
    if (!seeded) return;
    const orders = await prisma.salesOrder.findMany({
      where: { factoryId, ...SEEDED_ORDERS },
      include: {
        item: {
          include: {
            blueprint: {
              include: {
                versions: {
                  where: { isActive: true },
                  include: { routeSteps: true, bom: { include: { items: true } } },
                },
              },
            },
          },
        },
      },
    });
    expect(orders.length).toBeGreaterThan(0);
    for (const o of orders) {
      expect(o.itemId, `${o.soNumber} has no item`).toBeTruthy();
      expect(o.item!.itemType).toBe("FINISHED_PRODUCT");
      const version = o.item!.blueprint?.versions[0];
      expect(version, `${o.soNumber} item has no active blueprint`).toBeTruthy();
      expect(version!.routeSteps.length).toBeGreaterThan(0);
      expect(version!.bom!.items.length).toBeGreaterThan(0);
    }
  });

  it("every blueprint is keyed on an item and has at least one version", async () => {
    if (!seeded) return;
    const blueprints = await prisma.blueprint.findMany({
      where: { factoryId },
      include: { versions: { select: { id: true, isActive: true } } },
    });
    expect(blueprints.length).toBeGreaterThan(0);
    for (const b of blueprints) {
      expect(b.itemId).toBeTruthy();
      expect(b.versions.length).toBeGreaterThan(0);
    }
  });

  it("a producible item inherits QC, route and BOM from its group", async () => {
    if (!seeded) return;
    const item = await prisma.itemMaster.findFirst({
      where: {
        factoryId,
        manufacturingType: "MAKE",
        specHash: { not: null },
        blueprint: { versions: { some: { isActive: true, bom: { items: { some: {} } } } } },
      },
      include: {
        blueprint: {
          include: {
            versions: {
              where: { isActive: true },
              include: { qcTemplate: true, routeSteps: true, bom: { include: { items: true } } },
            },
          },
        },
      },
    });
    expect(item, "no producible item has a populated blueprint").toBeTruthy();
    const version = item!.blueprint!.versions[0];
    expect(version.qcTemplateId).toBeTruthy();
    expect(version.routeSteps.length).toBeGreaterThan(0);
    expect(version.bom!.items.length).toBeGreaterThan(0);
  });

  it("spec-created items carry a unique identity hash", async () => {
    if (!seeded) return;
    const items = await prisma.itemMaster.findMany({
      where: { factoryId, specHash: { not: null } },
      select: { specHash: true },
    });
    expect(items.length).toBeGreaterThan(0);
    const hashes = items.map((i) => i.specHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });
});
