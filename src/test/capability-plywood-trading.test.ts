import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache } from "@/server/platform/capability";
import {
  clearCommands,
  clearHooks,
  executeCommand,
  type ActorContext,
} from "@/server/platform/command";
import { clearQueries, executeQuery } from "@/server/platform/query";
import { ForbiddenError, clearScopeResolvers } from "@/server/platform/authorization";
import { clearTransitionGuards } from "@/server/platform/state";
import { clearContributions } from "@/server/platform/contribution";
import { provisionIdentity } from "@/server/platform/identity";
import { ASSET_CAPABILITY } from "@/server/capabilities/asset";
import { EVIDENCE_CAPABILITY } from "@/server/capabilities/evidence";
import { LOCATION_CAPABILITY } from "@/server/capabilities/location";
import {
  ENTITY_BRAND,
  ENTITY_CUSTOMER,
  ENTITY_CUSTOMER_PRICE,
  ENTITY_GODOWN_RACK,
  ENTITY_PRODUCT,
  ENTITY_PURCHASE_ORDER,
  ENTITY_RESERVATION,
  ENTITY_SALES_ORDER,
  ENTITY_STOCK_BALANCE,
  ENTITY_STOCK_LEDGER,
  ENTITY_SUPPLIER,
  ENTITY_SUPPLIER_PRICE,
  PLYWOOD_CAPABILITY,
  approveCredit,
  cancelSalesOrder,
  createBrand,
  createCustomer,
  createProduct,
  createPurchaseOrder,
  createSalesOrder,
  createSupplier,
  dispatchOrder,
  purchaseOrderDetail,
  receiveGoods,
  registerPlywoodCapability,
  reserveForOrder,
  salesOrderDetail,
  setCreditLimit,
  setCustomerPrice,
  setSupplierPrice,
  stockAvailability,
  stockOnHand,
  submitPurchaseOrder,
} from "@/server/capabilities/plywood";

/**
 * CAPABILITY: Plywood trading — stages 3 and 4, partners and orders.
 *
 * Requirement source: plywood.md §1.2 and §1.3. P5 is resolved in
 * implementation/plywood-decisions.md.
 *
 * The assertions that matter are the refusals: an over-receipt, a partial hold,
 * a sale that would breach a credit limit, and a dispatch of stock that was
 * never held. Each is a way a trading business loses money quietly, and each is
 * refused by a precondition rather than by a warning on a screen.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-plywood-trading.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

describeDb("capability: Plywood trading — purchase and sale", () => {
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();

  let organizationId: string;
  let owner: ActorContext;
  let rep: ActorContext;
  let godownId: string;
  let brandId: string;
  let supplierId: string;

  async function freshBoard(): Promise<string> {
    const product = await executeCommand(owner, createProduct, {
      brandId,
      name: `Board ${randomUUID().slice(0, 8)}`,
      hsnCode: "44121000",
      thicknessTenthMm: 180,
      widthMm: 2440,
      heightMm: 1220,
      grade: "BWR",
    });
    return product.id;
  }

  /** A board with stock already in the godown, at a known cost. */
  async function boardInStock(qtyUnits: number, unitCostPaise = 100_000): Promise<string> {
    const productId = await freshBoard();
    const order = await executeCommand(owner, createPurchaseOrder, {
      supplierId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: qtyUnits, unitCostPaise }],
    });
    await executeCommand(owner, submitPurchaseOrder, { orderId: order.id });
    await executeCommand(owner, receiveGoods, {
      orderId: order.id,
      lines: [{ productId, qtyReceived: qtyUnits }],
    });
    return productId;
  }

  async function freshCustomer(creditLimitPaise: number): Promise<string> {
    const customer = await executeCommand(owner, createCustomer, {
      displayName: `Dealer ${randomUUID().slice(0, 8)}`,
      stateCode: "07",
      creditLimitPaise,
    });
    return customer.id;
  }

  beforeAll(async () => {
    await assertRlsEnforceable();
    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();
    registerPlywoodCapability();

    await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({
        data: { id: tenantId, name: "Trading Test Distributors", timeZone: "Asia/Kolkata" },
      });
      // Plywood declares Location, Asset and Evidence: a godown IS a Location,
      // a delivery vehicle IS an Asset, an LR scan IS Evidence. The database
      // refuses the activation without all three, which is the dependency graph
      // doing its job rather than a test detail.
      await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      await activateCapability(tx, tenantId, ASSET_CAPABILITY);
      await activateCapability(tx, tenantId, EVIDENCE_CAPABILITY);
      await activateCapability(tx, tenantId, PLYWOOD_CAPABILITY);

      organizationId = (await tx.organization.create({ data: { tenantId, name: "HQ" } })).id;
      godownId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Okhla" } })
      ).id;

      const ownerRole = await tx.role.create({
        data: { tenantId, name: "Owner" },
        select: { id: true },
      });
      const repRole = await tx.role.create({
        data: { tenantId, name: "Sales Representative" },
        select: { id: true },
      });

      const everything = [
        ENTITY_BRAND,
        ENTITY_PRODUCT,
        ENTITY_GODOWN_RACK,
        ENTITY_STOCK_LEDGER,
        ENTITY_STOCK_BALANCE,
        ENTITY_SUPPLIER,
        ENTITY_SUPPLIER_PRICE,
        ENTITY_CUSTOMER,
        ENTITY_CUSTOMER_PRICE,
        ENTITY_PURCHASE_ORDER,
        ENTITY_SALES_ORDER,
        ENTITY_RESERVATION,
      ];
      await tx.permission.createMany({
        data: everything.flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId,
            roleId: ownerRole.id,
            verb,
            entity,
            scope: "Tenant" as const,
          })),
        ),
      });

      // A sales representative takes orders. They do NOT set credit limits —
      // which is why granting credit rides ActionExecute on the customer rather
      // than the ordinary Edit a representative needs for a phone number.
      await tx.permission.createMany({
        data: [
          { tenantId, roleId: repRole.id, verb: "Read", entity: ENTITY_PRODUCT, scope: "Tenant" },
          { tenantId, roleId: repRole.id, verb: "Read", entity: ENTITY_CUSTOMER, scope: "Tenant" },
          { tenantId, roleId: repRole.id, verb: "Edit", entity: ENTITY_CUSTOMER, scope: "Tenant" },
          { tenantId, roleId: repRole.id, verb: "Read", entity: ENTITY_SALES_ORDER, scope: "Tenant" },
          { tenantId, roleId: repRole.id, verb: "Create", entity: ENTITY_SALES_ORDER, scope: "Tenant" },
          { tenantId, roleId: repRole.id, verb: "Read", entity: ENTITY_STOCK_BALANCE, scope: "Tenant" },
        ],
      });

      const ownerIdentity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Proprietor",
      });
      const repIdentity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Sales rep",
      });
      await tx.tenantMembership.update({
        where: { id: ownerIdentity.membershipId },
        data: { roleId: ownerRole.id },
      });
      await tx.tenantMembership.update({
        where: { id: repIdentity.membershipId },
        data: { roleId: repRole.id },
      });

      owner = {
        tenantId,
        userId: ownerIdentity.userId,
        membershipId: ownerIdentity.membershipId,
        organizationId,
        roleId: ownerRole.id,
      };
      rep = {
        tenantId,
        userId: repIdentity.userId,
        membershipId: repIdentity.membershipId,
        organizationId,
        roleId: repRole.id,
      };
    });

    await withTenant(otherTenantId, async (tx) => {
      await tx.tenant.create({ data: { id: otherTenantId, name: "Rival Traders" } });
    });

    invalidateCapabilityCache();
    brandId = (await executeCommand(owner, createBrand, { name: "Century Ply" })).id;
    supplierId = (
      await executeCommand(owner, createSupplier, {
        displayName: "Century Distributors",
        gstin: "07AABCU9603R1ZM",
        stateCode: "07",
      })
    ).id;
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
      await admin.$executeRaw`DELETE FROM tenant WHERE id IN (${tenantId}::uuid, ${otherTenantId}::uuid)`;
      await admin.$executeRaw`DELETE FROM "user" WHERE id NOT IN (SELECT user_id FROM tenant_membership)`;
      await admin.$executeRaw`DELETE FROM party WHERE id NOT IN (SELECT party_id FROM "user")`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  /* -------------------------------- purchase -------------------------------- */

  it("prices a purchase order from the negotiated supplier price", async () => {
    const productId = await freshBoard();
    await executeCommand(owner, setSupplierPrice, {
      supplierId,
      productId,
      negotiatedCostPaise: 82_500,
    });

    const order = await executeCommand(owner, createPurchaseOrder, {
      supplierId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 20 }],
    });

    expect(order.totalCostPaise).toBe(20 * 82_500);
    const detail = await executeQuery(owner, purchaseOrderDetail, { orderId: order.id });
    expect(detail!.lines[0]!.unitCostPaise).toBe(82_500);
    // Snapshotted, so a later catalogue edit cannot rewrite a placed order.
    expect(detail!.lines[0]!.hsnCode).toBe("44121000");
  });

  it("refuses an order for a board with no agreed price and none given", async () => {
    const productId = await freshBoard();
    await expect(
      executeCommand(owner, createPurchaseOrder, {
        supplierId,
        locationId: godownId,
        lines: [{ productId, qtyOrdered: 5 }],
      }),
    ).rejects.toThrow(/no agreed price/);
  });

  it("receives part of an order, then the rest, and closes only when nothing is owed", async () => {
    const productId = await freshBoard();
    const order = await executeCommand(owner, createPurchaseOrder, {
      supplierId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 100, unitCostPaise: 60_000 }],
    });
    await executeCommand(owner, submitPurchaseOrder, { orderId: order.id });

    const first = await executeCommand(owner, receiveGoods, {
      orderId: order.id,
      lines: [{ productId, qtyReceived: 40 }],
    });
    expect(first.state).toBe("receiving");

    let detail = await executeQuery(owner, purchaseOrderDetail, { orderId: order.id });
    expect(detail!.lines[0]!.qtyOutstanding).toBe(60);

    // The receipt IS the stock movement: goods received and stock on hand are
    // one fact written in one transaction.
    const [balance] = await executeQuery(owner, stockOnHand, { productId });
    expect(balance!.qtyUnits).toBe(40);

    const second = await executeCommand(owner, receiveGoods, {
      orderId: order.id,
      lines: [{ productId, qtyReceived: 60 }],
    });
    expect(second.state).toBe("completed");

    detail = await executeQuery(owner, purchaseOrderDetail, { orderId: order.id });
    expect(detail!.lines[0]!.qtyOutstanding).toBe(0);
  });

  it("refuses to receive more than was ordered", async () => {
    const productId = await freshBoard();
    const order = await executeCommand(owner, createPurchaseOrder, {
      supplierId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 10, unitCostPaise: 10_000 }],
    });
    await executeCommand(owner, submitPurchaseOrder, { orderId: order.id });

    // Refused, not clamped. Silently accepting would make "what is still owed"
    // negative and every outstanding report inherit the nonsense.
    await expect(
      executeCommand(owner, receiveGoods, {
        orderId: order.id,
        lines: [{ productId, qtyReceived: 11 }],
      }),
    ).rejects.toThrow(/has 10 outstanding/);
  });

  it("refuses to receive against an order that was never submitted", async () => {
    const productId = await freshBoard();
    const order = await executeCommand(owner, createPurchaseOrder, {
      supplierId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 5, unitCostPaise: 10_000 }],
    });
    await expect(
      executeCommand(owner, receiveGoods, {
        orderId: order.id,
        lines: [{ productId, qtyReceived: 5 }],
      }),
    ).rejects.toThrow(/submit the order/);
  });

  /* ---------------------------------- sale ---------------------------------- */

  it("approves an order inside the credit limit and holds it outside", async () => {
    const productId = await boardInStock(100);
    const customerId = await freshCustomer(500_000);
    await executeCommand(owner, setCustomerPrice, {
      customerId,
      productId,
      customPricePaise: 120_000,
    });

    const withinLimit = await executeCommand(rep, createSalesOrder, {
      customerId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 4 }],
    });
    expect(withinLimit.state).toBe("approved");

    // The next order tips the same customer over. The check is against total
    // exposure, not this order alone — otherwise the limit is per order and
    // means nothing.
    const overLimit = await executeCommand(rep, createSalesOrder, {
      customerId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 1 }],
    });
    expect(overLimit.state).toBe("pending_credit");
  });

  it("records why a credit limit was overridden", async () => {
    const productId = await boardInStock(50);
    const customerId = await freshCustomer(0);
    const order = await executeCommand(rep, createSalesOrder, {
      customerId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 1, unitPricePaise: 150_000 }],
    });
    expect(order.state).toBe("pending_credit");

    await executeCommand(owner, approveCredit, {
      orderId: order.id,
      reason: "Cheque cleared this morning, confirmed with the bank",
    });

    const detail = await executeQuery(owner, salesOrderDetail, { orderId: order.id });
    expect(detail!.state).toBe("approved");

    const change = await withTenant(tenantId, (tx) =>
      tx.activity.findFirst({
        where: { entityId: order.id, fieldChanged: "creditOverrideReason" },
      }),
    );
    expect(change?.newValue).toContain("Cheque cleared");
  });

  it("refuses to let a sales representative grant credit", async () => {
    const customerId = await freshCustomer(0);
    await expect(
      executeCommand(rep, setCreditLimit, { customerId, creditLimitPaise: 10_000_000 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  /* ------------------------------- reservations ------------------------------ */

  it("holds stock for an order and takes it out of what is available", async () => {
    const productId = await boardInStock(60);
    const customerId = await freshCustomer(100_000_000);
    const order = await executeCommand(rep, createSalesOrder, {
      customerId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 25, unitPricePaise: 130_000 }],
    });

    await executeCommand(owner, reserveForOrder, { orderId: order.id });

    const availability = await executeQuery(owner, stockAvailability, { locationId: godownId });
    const row = availability.find((candidate) => candidate.productId === productId)!;
    expect(row.onHandUnits).toBe(60);
    expect(row.reservedUnits).toBe(25);
    expect(row.availableUnits).toBe(35);
  });

  it("refuses a hold it cannot honour in full", async () => {
    const productId = await boardInStock(10);
    const customerId = await freshCustomer(100_000_000);
    const order = await executeCommand(rep, createSalesOrder, {
      customerId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 11, unitPricePaise: 100_000 }],
    });

    // A partial hold on a multi-line order is a promise the business would only
    // discover it could not keep at dispatch.
    await expect(
      executeCommand(owner, reserveForOrder, { orderId: order.id }),
    ).rejects.toThrow(/has 10 available/);
  });

  it("does not let two orders hold the same sheets", async () => {
    const productId = await boardInStock(30);
    const customerId = await freshCustomer(100_000_000);

    const first = await executeCommand(rep, createSalesOrder, {
      customerId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 20, unitPricePaise: 100_000 }],
    });
    await executeCommand(owner, reserveForOrder, { orderId: first.id });

    // The customer's limit is deliberately enormous, so this second order is
    // approved on creation. Credit and availability are separate refusals: an
    // order can be perfectly good on credit and still have no stock behind it.
    const second = await executeCommand(rep, createSalesOrder, {
      customerId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 20, unitPricePaise: 100_000 }],
    });
    expect(second.state).toBe("approved");

    await expect(
      executeCommand(owner, reserveForOrder, { orderId: second.id }),
    ).rejects.toThrow(/has 10 available/);
  });

  it("releases the hold when an order is cancelled", async () => {
    const productId = await boardInStock(40);
    const customerId = await freshCustomer(100_000_000);
    const order = await executeCommand(rep, createSalesOrder, {
      customerId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 15, unitPricePaise: 100_000 }],
    });
    await executeCommand(owner, reserveForOrder, { orderId: order.id });

    await executeCommand(owner, cancelSalesOrder, {
      orderId: order.id,
      reason: "Customer changed their mind",
    });

    // Stock held for an order nobody will fulfil is stock that cannot be sold.
    const availability = await executeQuery(owner, stockAvailability, { locationId: godownId });
    const row = availability.find((candidate) => candidate.productId === productId)!;
    expect(row.reservedUnits).toBe(0);
    expect(row.availableUnits).toBe(40);

    // Released, not deleted: why a board could not be sold last Tuesday still
    // has an answer.
    const detail = await executeQuery(owner, salesOrderDetail, { orderId: order.id });
    expect(detail!.holds).toHaveLength(1);
    expect(detail!.holds[0]!.releasedAt).not.toBeNull();
  });

  /* -------------------------------- dispatch -------------------------------- */

  it("moves the stock, releases the hold and closes the order in one step", async () => {
    const productId = await boardInStock(80, 90_000);
    const customerId = await freshCustomer(100_000_000);
    const order = await executeCommand(rep, createSalesOrder, {
      customerId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 30, unitPricePaise: 140_000 }],
    });
    await executeCommand(owner, reserveForOrder, { orderId: order.id });
    await executeCommand(owner, dispatchOrder, { orderId: order.id });

    const detail = await executeQuery(owner, salesOrderDetail, { orderId: order.id });
    expect(detail!.state).toBe("completed");
    expect(detail!.lines[0]!.qtyShipped).toBe(30);

    const [balance] = await executeQuery(owner, stockOnHand, { productId });
    expect(balance!.qtyUnits).toBe(50);

    // The hold went with the goods. A reservation that outlives the stock it was
    // holding is a phantom that blocks the next sale.
    const availability = await executeQuery(owner, stockAvailability, { locationId: godownId });
    const row = availability.find((candidate) => candidate.productId === productId)!;
    expect(row.reservedUnits).toBe(0);
    expect(row.availableUnits).toBe(50);
  });

  it("refuses to dispatch an order whose stock was never held", async () => {
    const productId = await boardInStock(20);
    const customerId = await freshCustomer(100_000_000);
    const order = await executeCommand(rep, createSalesOrder, {
      customerId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 5, unitPricePaise: 100_000 }],
    });

    await expect(
      executeCommand(owner, dispatchOrder, { orderId: order.id }),
    ).rejects.toThrow(/hold stock for this order/);
  });

  /* ------------------------------ the boundaries ---------------------------- */

  it("refuses a malformed GSTIN before it can reach a filing", async () => {
    await expect(
      executeCommand(owner, createSupplier, {
        displayName: "Bad GSTIN supplier",
        gstin: "NOT-A-GSTIN",
      }),
    ).rejects.toThrow();
  });

  it("shows another tenant none of this one's partners or orders (INV-001)", async () => {
    const seen = await withTenant(otherTenantId, async (tx) => ({
      suppliers: await tx.plywoodSupplier.count(),
      customers: await tx.plywoodCustomer.count(),
      purchases: await tx.plywoodPurchaseOrder.count(),
      sales: await tx.plywoodSalesOrder.count(),
      holds: await tx.plywoodStockReservation.count(),
    }));
    expect(seen).toEqual({ suppliers: 0, customers: 0, purchases: 0, sales: 0, holds: 0 });
  });
});
