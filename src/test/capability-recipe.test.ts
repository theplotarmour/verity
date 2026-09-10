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
  ENTITY_PAYMENT,
  ENTITY_TABLE,
  ENTITY_ZONE,
  addOrderLines,
  advanceOrderLine,
  createMenuCategory,
  createMenuItem,
  createOrder,
  defineTable,
  defineZone,
  generateBill,
  kitchenQueue,
  moveTable,
  placeOrder,
  recordPayment,
  registerDineinCapability,
  settleBill,
} from "@/server/capabilities/dinein";
import {
  ENTITY_INVENTORY_ITEM,
  ENTITY_INVENTORY_STOCK,
  INVENTORY_CAPABILITY,
  createItem,
  recordStockMovement,
  recordWastage,
  registerInventoryCapability,
  stockOnHand,
} from "@/server/capabilities/inventory";
import { LOCATION_CAPABILITY, registerLocationCapability } from "@/server/capabilities/location";
import {
  ENTITY_RECIPE,
  RECIPE_CAPABILITY,
  getRecipeCost,
  registerRecipeCapability,
  saveRecipe,
} from "@/server/capabilities/recipe";

/**
 * CAPABILITY: Recipe — the ORDER COMPLETED -> Inventory Consumption chain
 * (PRD §128, via clients/colonel-kebabz/phase-plan.md's 2026-09-10 decision).
 *
 * Asserts the chain end to end: a recipe defines ingredient quantities, a
 * costed receipt sets InventoryItem.avgUnitCostPaise, and settling a bill
 * posts theoretical consumption against the same ledger the receipt used —
 * one ingredient ledger, not two.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-recipe.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

describeDb("capability: Recipe", () => {
  const tenantId = randomUUID();

  let organizationId: string;
  let locationId: string;
  let manager: ActorContext;
  let zoneId: string;
  let tableId: string;
  let kebabItemId: string;
  let chickenIngredientId: string;
  let spiceIngredientId: string;

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
    registerInventoryCapability();
    registerRecipeCapability();

    await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({
        data: { id: tenantId, name: "Colonel Kebabz Test Kitchen", timeZone: "Asia/Kolkata" },
      });
      await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      await activateCapability(tx, tenantId, DINEIN_CAPABILITY);
      await activateCapability(tx, tenantId, INVENTORY_CAPABILITY);
      await activateCapability(tx, tenantId, RECIPE_CAPABILITY);

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
        ENTITY_PAYMENT,
        ENTITY_INVENTORY_ITEM,
        ENTITY_INVENTORY_STOCK,
        ENTITY_RECIPE,
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
        displayName: "Chef Manager",
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

    // Ingredients, costed by a Receipt movement — the same ledger a GRN would
    // post into (decision 2026-09-10: inventory owns quantity AND cost).
    chickenIngredientId = (
      await executeCommand(manager, createItem, { sku: "CHK-MINCE", name: "Chicken Mince", unitLabel: "g" })
    ).id;
    spiceIngredientId = (
      await executeCommand(manager, createItem, { sku: "SPICE-MIX", name: "Spice Mix", unitLabel: "g" })
    ).id;
    // 10kg chicken mince at Rs 280/kg = 28 paise/g; 2kg spice mix at Rs 400/kg
    // = 40 paise/g. Costed receipts, same ledger a real GRN would post into.
    await executeCommand(manager, recordStockMovement, {
      itemId: chickenIngredientId,
      locationId,
      kind: "Receipt",
      qty: 10_000,
      reference: "test-grn-1",
      unitCostPaise: 28,
    });
    await executeCommand(manager, recordStockMovement, {
      itemId: spiceIngredientId,
      locationId,
      kind: "Receipt",
      qty: 2_000,
      reference: "test-grn-1",
      unitCostPaise: 40,
    });

    const category = await executeCommand(manager, createMenuCategory, { name: "Kebabs" });
    kebabItemId = (
      await executeCommand(manager, createMenuItem, {
        categoryId: category.id,
        name: "Chicken Seekh Kebab",
        priceMinor: 25_000,
      })
    ).id;

    await executeCommand(manager, saveRecipe, {
      menuItemId: kebabItemId,
      yieldQty: 1,
      ingredients: [
        { inventoryItemId: chickenIngredientId, qty: 180, unitLabel: "g" },
        { inventoryItemId: spiceIngredientId, qty: 8, unitLabel: "g" },
      ],
    });

    zoneId = (await executeCommand(manager, defineZone, { locationId, name: "Ground Floor" })).id;
    tableId = (await executeCommand(manager, defineTable, { zoneId, label: "T-1", seats: 2 })).id;
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

  it("costs a recipe from ingredient receipts", async () => {
    const cost = await executeQuery(manager, getRecipeCost, { menuItemId: kebabItemId });
    expect(cost).not.toBeNull();
    expect(cost!.ingredients).toHaveLength(2);
    const chicken = cost!.ingredients.find((i) => i.inventoryItemId === chickenIngredientId);
    const spice = cost!.ingredients.find((i) => i.inventoryItemId === spiceIngredientId);
    expect(chicken?.qty).toBe(180);
    expect(chicken?.unitCostPaise).toBe(28);
    expect(chicken?.lineCostPaise).toBe(5_040); // 180g x 28 paise/g
    expect(spice?.qty).toBe(8);
    expect(spice?.unitCostPaise).toBe(40);
    expect(spice?.lineCostPaise).toBe(320); // 8g x 40 paise/g
    // 5040 + 320 = 5360 paise per portion, against a Rs 250 selling price.
    expect(cost!.totalCostPaise).toBe(5_360);
    expect(cost!.foodCostPercent).toBe(21.44);
  });

  it("posts theoretical consumption when a bill settles", async () => {
    await executeCommand(manager, moveTable, { tableId, to: "occupied" });
    const order = await executeCommand(manager, createOrder, { tableId, covers: 2 });
    await executeCommand(manager, addOrderLines, {
      orderId: order.id,
      lines: [{ itemId: kebabItemId, qty: 3 }],
    });
    await executeCommand(manager, placeOrder, { orderId: order.id });

    const queue = await executeQuery(manager, kitchenQueue, {});
    const ticket = queue.find((t) => t.orderId === order.id)!;
    await executeCommand(manager, advanceOrderLine, { lineId: ticket.lineId, to: "preparing" });
    await executeCommand(manager, advanceOrderLine, { lineId: ticket.lineId, to: "ready" });
    await executeCommand(manager, advanceOrderLine, { lineId: ticket.lineId, to: "served" });

    const bill = await executeCommand(manager, generateBill, { orderId: order.id });
    await executeCommand(manager, recordPayment, {
      billId: bill.id,
      method: "cash",
      amountMinor: bill.totalMinor,
    });

    const before = await executeQuery(manager, stockOnHand, { itemId: chickenIngredientId, locationId });
    await executeCommand(manager, settleBill, { billId: bill.id });
    const after = await executeQuery(manager, stockOnHand, { itemId: chickenIngredientId, locationId });

    // 3 portions x 180g = 540g consumed.
    expect((before[0]?.qty ?? 0) - (after[0]?.qty ?? 0)).toBe(540);

    await executeCommand(manager, moveTable, { tableId, to: "available" });
  });

  it("records wastage with a reason and a value snapshot", async () => {
    const before = await executeQuery(manager, stockOnHand, { itemId: spiceIngredientId, locationId });

    const wastage = await executeCommand(manager, recordWastage, {
      itemId: spiceIngredientId,
      locationId,
      qty: 50,
      reason: "Spoilage",
      notes: "Left open overnight",
    });
    // 50g at 40 paise/g (set by the costed receipt in beforeAll).
    expect(wastage.valuePaise).toBe(2_000);

    const after = await executeQuery(manager, stockOnHand, { itemId: spiceIngredientId, locationId });
    expect((before[0]?.qty ?? 0) - (after[0]?.qty ?? 0)).toBe(50);
  });
});
