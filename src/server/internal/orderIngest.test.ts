import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { ingestExternalOrder } from "./orderIngest";

/**
 * Headless order intake, against the real database.
 *
 * The spec's checklist asks that a POST "safely inject new orders into the Sales
 * Order tables". Safely is the operative word, and it is what these check: that
 * the order lands in the authenticated tenant and nowhere else, that it lands in
 * DRAFT rather than straight onto the floor, and that a name from an external
 * channel cannot reach across into another workspace's master data.
 *
 * Skipped rather than failed on a blank database — "there is no seeded factory"
 * is not a regression, and a suite that stays red teaches everyone to ignore it.
 */
describe("ingestExternalOrder", () => {
  let factoryId: string;
  let seeded = false;
  /**
   * An item in a *different* tenant, created here rather than looked up.
   *
   * Looking one up made the cross-tenant test silently vacuous: the only other
   * seeded factory has no items, so the test returned early and passed without
   * exercising the guard at all. A test that cannot fail is worse than none.
   */
  let foreignItemId: string | null = null;
  const created: string[] = [];

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    seeded = true;

    const other = await prisma.factory.findFirst({ where: { id: { not: factoryId } } });
    if (other) {
      const sku = `TEST-FOREIGN-${Date.now().toString(36).toUpperCase()}`;
      const item = await prisma.product.create({
        data: {
          factoryId: other.id,
          itemType: "FINISHED_PRODUCT",
          name: `Foreign Tenant Item ${sku}`,
          sku,
          itemCode: sku,
          defaultUOM: "PCS",
        },
      });
      foreignItemId = item.id;
    }
  });

  afterAll(async () => {
    // Leave the seeded data as it was found.
    if (created.length > 0) {
      await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: { in: created } } });
      await prisma.salesOrder.deleteMany({ where: { id: { in: created } } });
    }
    if (foreignItemId) {
      await prisma.product.delete({ where: { id: foreignItemId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  async function ingest(overrides: Parameters<typeof ingestExternalOrder>[1]) {
    const result = await ingestExternalOrder(factoryId, overrides);
    created.push(result.salesOrderId);
    return result;
  }

  it("books an order into the sales order table", async () => {
    if (!seeded) return;

    const result = await ingest({
      externalId: "shopify-1001",
      customer: { name: "Ingest Test Customer", phone: "9999900001" },
      lines: [{ quantity: 2 }],
    });

    const order = await prisma.salesOrder.findUnique({
      where: { id: result.salesOrderId },
      include: { items: true },
    });

    expect(order).not.toBeNull();
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0].quantity).toBe(2);
  });

  it("lands the order in the authenticated tenant", async () => {
    if (!seeded) return;

    const result = await ingest({
      customer: { name: "Ingest Test Customer" },
      lines: [{ quantity: 1 }],
    });

    const order = await prisma.salesOrder.findUniqueOrThrow({
      where: { id: result.salesOrderId },
      select: { factoryId: true },
    });
    expect(order.factoryId).toBe(factoryId);
  });

  it("arrives as DRAFT so a person releases it to the floor", async () => {
    if (!seeded) return;

    // An external storefront may propose work. It may not start it.
    const result = await ingest({
      customer: { name: "Ingest Test Customer" },
      lines: [{ quantity: 1 }],
    });
    expect(result.status).toBe("DRAFT");
  });

  it("refuses an itemId belonging to another tenant, and says so", async () => {
    if (!seeded) return;
    // Asserted, not skipped: if setup could not build the foreign item, this
    // test proves nothing and should say so rather than pass.
    expect(foreignItemId, "no foreign item was created — this test would be vacuous").toBeTruthy();

    const result = await ingest({
      customer: { name: "Ingest Test Customer" },
      lines: [{ quantity: 1, itemId: foreignItemId }],
    });

    const items = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: result.salesOrderId },
      select: { itemId: true },
    });
    // The foreign id must not have been written through.
    expect(items.every((i) => i.itemId !== foreignItemId)).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/not in this workspace/i);
  });

  it("warns rather than silently dropping a spec value it cannot match", async () => {
    if (!seeded) return;

    // An order booked without its fabric, with nobody told, is worse than one
    // booked with a warning attached.
    const result = await ingest({
      customer: { name: "Ingest Test Customer" },
      spec: { material: "Fabric That Does Not Exist Here" },
      lines: [{ quantity: 1 }],
    });

    expect(result.warnings.join(" ")).toMatch(/Fabric That Does Not Exist Here/);
  });

  it("reuses an existing customer rather than creating a duplicate per order", async () => {
    if (!seeded) return;

    const name = "Ingest Test Customer";
    await ingest({ customer: { name }, lines: [{ quantity: 1 }] });

    const matches = await prisma.customer.count({
      where: { factoryId, name: { equals: name, mode: "insensitive" } },
    });
    expect(matches).toBe(1);
  });

  it("gives every order a distinct number", async () => {
    if (!seeded) return;

    const [a, b] = await Promise.all([
      ingest({ customer: { name: "Ingest Test Customer" }, lines: [{ quantity: 1 }] }),
      ingest({ customer: { name: "Ingest Test Customer" }, lines: [{ quantity: 1 }] }),
    ]);
    expect(a.soNumber).not.toBe(b.soNumber);
  });
});
