import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache } from "@/server/platform/capability";
import { clearCommands, clearHooks, executeCommand, ValidationError, type ActorContext } from "@/server/platform/command";
import { clearQueries, executeQuery } from "@/server/platform/query";
import { clearScopeResolvers } from "@/server/platform/authorization";
import { clearTransitionGuards } from "@/server/platform/state";
import { clearContributions } from "@/server/platform/contribution";
import { provisionIdentity } from "@/server/platform/identity";
import {
  ENTITY_INVENTORY_ITEM,
  ENTITY_INVENTORY_STOCK,
  INVENTORY_CAPABILITY,
  createItem,
  recordStockMovement,
  registerInventoryCapability,
  stockOnHand,
} from "@/server/capabilities/inventory";
import { LOCATION_CAPABILITY, registerLocationCapability } from "@/server/capabilities/location";
import {
  ENTITY_MANUFACTURING_ORDER,
  MANUFACTURING_CAPABILITY,
  cancelManufacturingOrder,
  completeManufacturingOrder,
  createManufacturingOrder,
  manufacturingOrderDetail,
  registerManufacturingCapability,
  startManufacturingOrder,
} from "@/server/capabilities/manufacturing";

/**
 * CAPABILITY: Manufacturing (Task 118 minimal slice) — the
 * Draft -> InProgress -> Completed | Cancelled lifecycle, and the real
 * (not theoretical) consumption/production it posts against the existing
 * inventory ledger.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-manufacturing.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

describeDb("capability: Manufacturing", () => {
  const tenantId = randomUUID();

  let organizationId: string;
  let locationId: string;
  let manager: ActorContext;
  let woodId: string;
  let screwsId: string;
  let tableId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();
    registerLocationCapability();
    registerInventoryCapability();
    registerManufacturingCapability();

    await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({
        data: { id: tenantId, name: "Manufacturing Test Shop", timeZone: "Asia/Kolkata" },
      });
      await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      await activateCapability(tx, tenantId, INVENTORY_CAPABILITY);
      await activateCapability(tx, tenantId, MANUFACTURING_CAPABILITY);

      organizationId = (await tx.organization.create({ data: { tenantId, name: "Shop Floor" } })).id;
      locationId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Workshop" } })
      ).id;

      const managerRole = await tx.role.create({ data: { tenantId, name: "Manager" }, select: { id: true } });

      const everything = [ENTITY_INVENTORY_ITEM, ENTITY_INVENTORY_STOCK, ENTITY_MANUFACTURING_ORDER];
      await tx.permission.createMany({
        data: everything.flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId,
            roleId: managerRole.id,
            verb,
            entity,
            scope: "Tenant" as const,
          })),
        ),
      });

      const managerIdentity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Shop Manager",
      });
      await tx.tenantMembership.update({
        where: { id: managerIdentity.membershipId },
        data: { roleId: managerRole.id },
      });

      manager = {
        tenantId,
        userId: managerIdentity.userId,
        membershipId: managerIdentity.membershipId,
        organizationId,
        roleId: managerRole.id,
      };
    });

    invalidateCapabilityCache();

    woodId = (await executeCommand(manager, createItem, { sku: "WOOD-PLANK", name: "Wood Plank", unitLabel: "pcs" })).id;
    screwsId = (await executeCommand(manager, createItem, { sku: "SCREWS", name: "Screws", unitLabel: "pcs" })).id;
    tableId = (await executeCommand(manager, createItem, { sku: "TABLE", name: "Table", unitLabel: "pcs" })).id;

    // Stock the components: 20 planks, 100 screws.
    await executeCommand(manager, recordStockMovement, {
      itemId: woodId,
      locationId,
      kind: "Receipt",
      qty: 20,
      reference: "test-receipt-1",
    });
    await executeCommand(manager, recordStockMovement, {
      itemId: screwsId,
      locationId,
      kind: "Receipt",
      qty: 100,
      reference: "test-receipt-1",
    });
  });

  afterAll(async () => {
    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantId}::uuid`;
      await admin.$executeRaw`DELETE FROM "user" WHERE id NOT IN (SELECT user_id FROM tenant_membership)`;
      await admin.$executeRaw`DELETE FROM party WHERE id NOT IN (SELECT party_id FROM "user")`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("rejects an order that would consume the same item it produces", async () => {
    await expect(
      executeCommand(manager, createManufacturingOrder, {
        locationId,
        outputItemId: woodId,
        outputQty: 1,
        lines: [{ componentItemId: woodId, qtyRequired: 1 }],
      }),
    ).rejects.toThrow(/cannot consume the same item it produces/);
  });

  it("runs the happy path: create -> start -> complete, real ledger movement", async () => {
    const woodBefore = await executeQuery(manager, stockOnHand, { itemId: woodId, locationId });
    const screwsBefore = await executeQuery(manager, stockOnHand, { itemId: screwsId, locationId });
    const tableBefore = await executeQuery(manager, stockOnHand, { itemId: tableId, locationId });

    const order = await executeCommand(manager, createManufacturingOrder, {
      locationId,
      outputItemId: tableId,
      outputQty: 2,
      reference: "MO-TEST-1",
      lines: [
        { componentItemId: woodId, qtyRequired: 8 },
        { componentItemId: screwsId, qtyRequired: 40 },
      ],
    });

    const detail = await executeQuery(manager, manufacturingOrderDetail, { orderId: order.id });
    expect(detail.state).toBe("draft");
    expect(detail.lines).toHaveLength(2);

    await executeCommand(manager, startManufacturingOrder, { orderId: order.id });

    const woodAfterStart = await executeQuery(manager, stockOnHand, { itemId: woodId, locationId });
    const screwsAfterStart = await executeQuery(manager, stockOnHand, { itemId: screwsId, locationId });
    expect((woodBefore[0]?.qty ?? 0) - (woodAfterStart[0]?.qty ?? 0)).toBe(8);
    expect((screwsBefore[0]?.qty ?? 0) - (screwsAfterStart[0]?.qty ?? 0)).toBe(40);

    await executeCommand(manager, completeManufacturingOrder, { orderId: order.id });

    const tableAfter = await executeQuery(manager, stockOnHand, { itemId: tableId, locationId });
    expect((tableAfter[0]?.qty ?? 0) - (tableBefore[0]?.qty ?? 0)).toBe(2);

    const finalDetail = await executeQuery(manager, manufacturingOrderDetail, { orderId: order.id });
    expect(finalDetail.state).toBe("completed");
  });

  it("refuses to start when a component is short, and leaves stock untouched", async () => {
    const order = await executeCommand(manager, createManufacturingOrder, {
      locationId,
      outputItemId: tableId,
      outputQty: 1,
      lines: [{ componentItemId: woodId, qtyRequired: 9_999 }],
    });

    const before = await executeQuery(manager, stockOnHand, { itemId: woodId, locationId });
    await expect(executeCommand(manager, startManufacturingOrder, { orderId: order.id })).rejects.toThrow(
      /not enough Wood Plank/,
    );
    const after = await executeQuery(manager, stockOnHand, { itemId: woodId, locationId });
    expect(after[0]?.qty ?? 0).toBe(before[0]?.qty ?? 0);

    const detail = await executeQuery(manager, manufacturingOrderDetail, { orderId: order.id });
    expect(detail.state).toBe("draft");
  });

  it("reverses consumption when an in-progress order is cancelled", async () => {
    const order = await executeCommand(manager, createManufacturingOrder, {
      locationId,
      outputItemId: tableId,
      outputQty: 1,
      lines: [{ componentItemId: woodId, qtyRequired: 3 }],
    });
    await executeCommand(manager, startManufacturingOrder, { orderId: order.id });

    const consumed = await executeQuery(manager, stockOnHand, { itemId: woodId, locationId });
    await executeCommand(manager, cancelManufacturingOrder, {
      orderId: order.id,
      reason: "Wrong spec, restarting with correct dimensions",
    });
    const restored = await executeQuery(manager, stockOnHand, { itemId: woodId, locationId });

    expect((restored[0]?.qty ?? 0) - (consumed[0]?.qty ?? 0)).toBe(3);

    const detail = await executeQuery(manager, manufacturingOrderDetail, { orderId: order.id });
    expect(detail.state).toBe("cancelled");
  });

  it("is read-only once completed (INV-002)", async () => {
    const order = await executeCommand(manager, createManufacturingOrder, {
      locationId,
      outputItemId: tableId,
      outputQty: 1,
      lines: [{ componentItemId: screwsId, qtyRequired: 2 }],
    });
    await executeCommand(manager, startManufacturingOrder, { orderId: order.id });
    await executeCommand(manager, completeManufacturingOrder, { orderId: order.id });

    await expect(
      executeCommand(manager, cancelManufacturingOrder, { orderId: order.id, reason: "too late" }),
    ).rejects.toThrow(ValidationError);
  });
});
