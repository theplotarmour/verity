import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache, setConfig } from "@/server/platform/capability";
import { clearCommands, clearHooks, executeCommand, type ActorContext } from "@/server/platform/command";
import { clearQueries, executeQuery } from "@/server/platform/query";
import { clearScopeResolvers } from "@/server/platform/authorization";
import { clearTransitionGuards } from "@/server/platform/state";
import { clearContributions } from "@/server/platform/contribution";
import { provisionIdentity } from "@/server/platform/identity";
import {
  CONFIG_CGST_RATE,
  CONFIG_SGST_RATE,
  DINEIN_CAPABILITY,
  ENTITY_BILL,
  ENTITY_MENU_CATEGORY,
  ENTITY_MENU_ITEM,
  ENTITY_ORDER,
  ENTITY_ORDER_LINE,
  ENTITY_TABLE,
  ENTITY_ZONE,
  addOrderLines,
  advanceOrderLine,
  applyBillDiscount,
  createMenuCategory,
  createMenuItem,
  createOrder,
  defineTable,
  defineZone,
  generateBill,
  getBillDetail,
  kitchenQueue,
  moveTable,
  placeOrder,
  registerDineinCapability,
} from "@/server/capabilities/dinein";
import { LOCATION_CAPABILITY, registerLocationCapability } from "@/server/capabilities/location";
import {
  COUPON_CAPABILITY,
  ENTITY_COUPON,
  applyCoupon,
  createCoupon,
  registerCouponCapability,
} from "@/server/capabilities/coupon";

/** CAPABILITY: Coupon — a Percent code validates, applies, and enforces its own limits. */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-coupon.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

describeDb("capability: Coupon", () => {
  const tenantId = randomUUID();

  let organizationId: string;
  let locationId: string;
  let manager: ActorContext;
  let zoneId: string;
  let kebabItemId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();
    registerLocationCapability();
    registerDineinCapability();
    registerCouponCapability();

    await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({
        data: { id: tenantId, name: "Colonel Kebabz Coupon Test", timeZone: "Asia/Kolkata" },
      });
      await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      await activateCapability(tx, tenantId, DINEIN_CAPABILITY);
      await activateCapability(tx, tenantId, COUPON_CAPABILITY);

      organizationId = (await tx.organization.create({ data: { tenantId, name: "Outlet 1" } })).id;
      locationId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Outlet 1" } })
      ).id;

      await setConfig(tx, tenantId, CONFIG_CGST_RATE, 2.5, "Tenant");
      await setConfig(tx, tenantId, CONFIG_SGST_RATE, 2.5, "Tenant");

      const managerRole = await tx.role.create({ data: { tenantId, name: "Manager" }, select: { id: true } });
      const everything = [
        ENTITY_MENU_CATEGORY,
        ENTITY_MENU_ITEM,
        ENTITY_ZONE,
        ENTITY_TABLE,
        ENTITY_ORDER,
        ENTITY_ORDER_LINE,
        ENTITY_BILL,
        ENTITY_COUPON,
      ];
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
        displayName: "Manager",
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

    const category = await executeCommand(manager, createMenuCategory, { name: "Kebabs" });
    kebabItemId = (
      await executeCommand(manager, createMenuItem, {
        categoryId: category.id,
        name: "Chicken Seekh Kebab",
        priceMinor: 25_000,
      })
    ).id;
    zoneId = (await executeCommand(manager, defineZone, { locationId, name: "Ground Floor" })).id;
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

  it("applies a Percent coupon, enforces its usage limit, and rejects an unmet minimum order", async () => {
    await executeCommand(manager, createCoupon, {
      code: "WELCOME10",
      discountType: "Percent",
      value: 1_000, // 10%
      usageLimit: 1,
    });
    await executeCommand(manager, createCoupon, {
      code: "BIGORDER",
      discountType: "Flat",
      value: 10_000,
      minOrderValueMinor: 100_000,
    });

    const table = await executeCommand(manager, defineTable, { zoneId, label: "T-1", seats: 2 });
    await executeCommand(manager, moveTable, { tableId: table.id, to: "occupied" });
    const order = await executeCommand(manager, createOrder, { tableId: table.id, covers: 2 });
    await executeCommand(manager, addOrderLines, { orderId: order.id, lines: [{ itemId: kebabItemId, qty: 1 }] });
    await executeCommand(manager, placeOrder, { orderId: order.id });

    const queue = await executeQuery(manager, kitchenQueue, {});
    const ticket = queue.find((t) => t.orderId === order.id)!;
    await executeCommand(manager, advanceOrderLine, { lineId: ticket.lineId, to: "preparing" });
    await executeCommand(manager, advanceOrderLine, { lineId: ticket.lineId, to: "ready" });
    await executeCommand(manager, advanceOrderLine, { lineId: ticket.lineId, to: "served" });

    const bill = await executeCommand(manager, generateBill, { orderId: order.id });

    // BIGORDER needs a Rs 1000 minimum; this bill's subtotal (Rs 250) misses it.
    await expect(
      executeCommand(manager, applyCoupon, { billId: bill.id, code: "BIGORDER" }),
    ).rejects.toThrow(/must be at least/);

    // WELCOME10: 10% of the Rs 250 subtotal = Rs 25 = 2500 paise.
    const applied = await executeCommand(manager, applyCoupon, { billId: bill.id, code: "WELCOME10" });
    expect(applied.discountMinor).toBe(2_500);

    await executeCommand(manager, applyBillDiscount, {
      billId: bill.id,
      discountMinor: applied.discountMinor,
      reason: "coupon:WELCOME10",
    });
    const detail = await executeQuery(manager, getBillDetail, { billId: bill.id });
    expect(detail?.discountMinor).toBe(2_500);

    // Usage limit is 1 — a second attempt is refused.
    await expect(
      executeCommand(manager, applyCoupon, { billId: bill.id, code: "WELCOME10" }),
    ).rejects.toThrow(/usage limit reached/);
  });
});
