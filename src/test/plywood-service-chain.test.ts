import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import {
  activateCapability,
  invalidateCapabilityCache,
  setConfig,
} from "@/server/platform/capability";
import {
  clearCommands,
  clearHooks,
  executeCommand,
  type ActorContext,
} from "@/server/platform/command";
import { clearQueries, executeQuery } from "@/server/platform/query";
import { clearScopeResolvers } from "@/server/platform/authorization";
import { clearTransitionGuards } from "@/server/platform/state";
import { clearContributions } from "@/server/platform/contribution";
import { provisionIdentity } from "@/server/platform/identity";
import { ASSET_CAPABILITY } from "@/server/capabilities/asset";
import { EVIDENCE_CAPABILITY } from "@/server/capabilities/evidence";
import { LOCATION_CAPABILITY } from "@/server/capabilities/location";
import {
  CONFIG_CGST_RATE_BP,
  CONFIG_IGST_RATE_BP,
  CONFIG_SGST_RATE_BP,
  CONFIG_TENANT_STATE_CODE,
  PLYWOOD_CAPABILITY,
  createBrand,
  createCustomer,
  createProduct,
  createPurchaseOrder,
  createSalesOrder,
  createSupplier,
  defineGodownRack,
  dispatchOrder,
  marginReport,
  ownerConsole,
  partyLedger,
  raiseSalesInvoice,
  receiveGoods,
  recordPayment,
  registerPlywoodCapability,
  reserveForOrder,
  stockAvailability,
  stockOnHand,
  submitPurchaseOrder,
  transferStock,
} from "@/server/capabilities/plywood";

/**
 * PLYWOOD STAGE 8 — the service chain, end to end.
 *
 * A FIXTURE, never seed data. It builds a plywood business, trades through it
 * once, and destroys it. No demo trading business exists in the application, and
 * the last assertion in this file is that nothing survived.
 *
 * The chain is the assertion. Each command passing on its own proves the command
 * works; only the chain proves the business can be run — that stock bought on
 * Monday can be sold on Tuesday, dispatched on Wednesday, invoiced, paid, and
 * still add up on Friday.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "plywood-service-chain.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

describeDb("plywood: the whole chain, from purchase to payment", () => {
  const tenantId = randomUUID();

  let organizationId: string;
  let owner: ActorContext;
  let okhlaId: string;
  let noidaId: string;
  let rackId: string;
  let productId: string;
  let supplierId: string;
  let customerId: string;
  let vehicleAssetId: string;

  // Carried between steps, because each step's output is the next step's input —
  // which is the point of a chain test.
  let purchaseOrderId: string;
  let salesOrderId: string;
  let invoiceId: string;
  let invoiceTotalPaise: number;

  const COST_PER_SHEET = 92_000; // ₹920
  const PRICE_PER_SHEET = 128_000; // ₹1,280
  const BOUGHT = 200;
  const SOLD = 60;

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
        data: { id: tenantId, name: "Chain Test Plywood", timeZone: "Asia/Kolkata" },
      });
      await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      await activateCapability(tx, tenantId, ASSET_CAPABILITY);
      await activateCapability(tx, tenantId, EVIDENCE_CAPABILITY);
      await activateCapability(tx, tenantId, PLYWOOD_CAPABILITY);

      await setConfig(tx, tenantId, CONFIG_TENANT_STATE_CODE, "07", "Tenant");
      await setConfig(tx, tenantId, CONFIG_CGST_RATE_BP, 900, "Tenant");
      await setConfig(tx, tenantId, CONFIG_SGST_RATE_BP, 900, "Tenant");
      await setConfig(tx, tenantId, CONFIG_IGST_RATE_BP, 1800, "Tenant");

      organizationId = (await tx.organization.create({ data: { tenantId, name: "Central HQ" } })).id;
      okhlaId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Godown A — Okhla" } })
      ).id;
      noidaId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Godown B — Noida" } })
      ).id;
      vehicleAssetId = (
        await tx.asset.create({
          data: { tenantId, name: "Tata 407", reference: "DL-1AB-4471", locationId: okhlaId },
        })
      ).id;

      // One role with everything: this fixture proves the chain runs, not who
      // may run each step. The per-stage suites hold the authorization refusals.
      const role = await tx.role.create({ data: { tenantId, name: "Owner" }, select: { id: true } });
      const entities = await tx.entityDefinition.findMany({
        where: { capability: PLYWOOD_CAPABILITY },
        select: { key: true },
      });
      await tx.permission.createMany({
        data: entities.flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId,
            roleId: role.id,
            verb,
            entity: entity.key,
            scope: "Tenant" as const,
          })),
        ),
      });

      const identity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Proprietor",
      });
      await tx.tenantMembership.update({
        where: { id: identity.membershipId },
        data: { roleId: role.id },
      });
      owner = {
        tenantId,
        userId: identity.userId,
        membershipId: identity.membershipId,
        organizationId,
        roleId: role.id,
      };
    });

    invalidateCapabilityCache();
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

  /* ------------------------------- 1. set up -------------------------------- */

  it("1 — opens with a catalogue, two godowns and the people it trades with", async () => {
    const brand = await executeCommand(owner, createBrand, { name: "Century Ply" });
    productId = (
      await executeCommand(owner, createProduct, {
        brandId: brand.id,
        name: "Sainik 710 BWR",
        hsnCode: "44121000",
        thicknessTenthMm: 180,
        widthMm: 2440,
        heightMm: 1220,
        grade: "BWR",
        reorderLevelUnits: 50,
      })
    ).id;
    rackId = (
      await executeCommand(owner, defineGodownRack, { locationId: okhlaId, rackLabel: "A-01" })
    ).id;

    supplierId = (
      await executeCommand(owner, createSupplier, {
        displayName: "Century Distributors",
        gstin: "07AABCU9603R1ZM",
        stateCode: "07",
      })
    ).id;
    customerId = (
      await executeCommand(owner, createCustomer, {
        displayName: "Sharma Timber Mart",
        gstin: "07AAACS1429B1ZL",
        stateCode: "07",
        creditLimitPaise: 50_000_000,
      })
    ).id;

    expect(productId).toBeTruthy();
    expect(rackId).toBeTruthy();
  });

  /* ------------------------------ 2. purchase ------------------------------- */

  it("2 — orders 200 sheets and receives them into the godown", async () => {
    purchaseOrderId = (
      await executeCommand(owner, createPurchaseOrder, {
        supplierId,
        locationId: okhlaId,
        reference: "PO-4471",
        lines: [{ productId, qtyOrdered: BOUGHT, unitCostPaise: COST_PER_SHEET }],
      })
    ).id;
    await executeCommand(owner, submitPurchaseOrder, { orderId: purchaseOrderId });

    const received = await executeCommand(owner, receiveGoods, {
      orderId: purchaseOrderId,
      rackId,
      lines: [{ productId, qtyReceived: BOUGHT }],
    });
    expect(received.state).toBe("completed");

    // The receipt IS the stock movement. There is no separate goods-received
    // entry that could be forgotten.
    const [balance] = await executeQuery(owner, stockOnHand, { productId });
    expect(balance!.qtyUnits).toBe(BOUGHT);
    expect(balance!.avgUnitCostPaise).toBe(COST_PER_SHEET);
    expect(balance!.valuePaise).toBe(BOUGHT * COST_PER_SHEET);
  });

  /* -------------------------------- 3. move --------------------------------- */

  it("3 — moves 40 sheets to the second godown without creating or destroying value", async () => {
    const before = (await executeQuery(owner, stockOnHand, { productId })).reduce(
      (sum, row) => sum + row.valuePaise,
      0,
    );

    await executeCommand(owner, transferStock, {
      productId,
      fromLocationId: okhlaId,
      toLocationId: noidaId,
      qtyUnits: 40,
    });

    const after = await executeQuery(owner, stockOnHand, { productId });
    expect(after.reduce((sum, row) => sum + row.valuePaise, 0)).toBe(before);
    expect(after.find((row) => row.locationId === noidaId)!.avgUnitCostPaise).toBe(COST_PER_SHEET);
  });

  /* --------------------------------- 4. sell -------------------------------- */

  it("4 — takes an order inside the credit limit and holds the stock for it", async () => {
    const order = await executeCommand(owner, createSalesOrder, {
      customerId,
      locationId: okhlaId,
      reference: "SO-8891",
      lines: [{ productId, qtyOrdered: SOLD, unitPricePaise: PRICE_PER_SHEET }],
    });
    salesOrderId = order.id;
    expect(order.state).toBe("approved");

    await executeCommand(owner, reserveForOrder, { orderId: salesOrderId });

    const availability = await executeQuery(owner, stockAvailability, {
      locationId: okhlaId,
    });
    const row = availability.find((candidate) => candidate.productId === productId)!;
    expect(row.onHandUnits).toBe(160);
    expect(row.reservedUnits).toBe(SOLD);
    expect(row.availableUnits).toBe(100);
  });

  /* ------------------------------ 5. dispatch ------------------------------- */

  it("5 — dispatches, which moves the stock and releases the hold together", async () => {
    await executeCommand(owner, dispatchOrder, { orderId: salesOrderId });

    const okhla = (await executeQuery(owner, stockOnHand, { productId })).find(
      (row) => row.locationId === okhlaId,
    )!;
    expect(okhla.qtyUnits).toBe(100);

    // A hold that outlives its goods blocks the next sale.
    const availability = await executeQuery(owner, stockAvailability, {
      locationId: okhlaId,
    });
    expect(availability.find((row) => row.productId === productId)!.reservedUnits).toBe(0);
  });

  /* ---------------------- 6. transport: REMOVED (slice 2) ------------------- */
  //
  // The Logistics module is gone (taskplans/45 §D-01). Material leaves a godown
  // through a Goods Issue and through nothing else, so there is no shipment to
  // create, no carrier to assign and nothing to track. The chain now runs
  // reservation -> dispatch -> invoice, and the Goods Issue document that
  // replaces `dispatchOrder` arrives in slice 4.

  /* ------------------------------- 7. invoice ------------------------------- */

  it("7 — raises a gapless, correctly taxed invoice", async () => {
    const invoice = await executeCommand(owner, raiseSalesInvoice, { salesOrderId });
    invoiceId = invoice.id;
    invoiceTotalPaise = invoice.totalPaise;

    // Both in Delhi, so CGST + SGST at 9% each on ₹76,800.
    const taxable = SOLD * PRICE_PER_SHEET;
    expect(invoice.interState).toBe(false);
    expect(invoice.totalPaise).toBe(taxable + Math.round(taxable * 0.09) * 2);
    expect(invoice.invoiceNumber).toMatch(/^SALES\/\d{4}-\d{2}\/0001$/);
  });

  /* --------------------------------- 8. paid -------------------------------- */

  it("8 — takes the money, and the ledger balances to zero", async () => {
    const half = Math.floor(invoiceTotalPaise / 2);
    await executeCommand(owner, recordPayment, {
      invoiceId,
      amountPaise: half,
      method: "bank",
      reference: "UTR-77120",
    });
    const settled = await executeCommand(owner, recordPayment, {
      invoiceId,
      amountPaise: invoiceTotalPaise - half,
      method: "upi",
    });
    expect(settled.outstandingPaise).toBe(0);

    // The whole point of P3: the balance is the sum of its entries, and after a
    // full settlement that sum is zero. No cached figure was consulted.
    const ledger = await executeQuery(owner, partyLedger, { customerId });
    expect(ledger.balancePaise).toBe(0);
    expect(ledger.entries).toHaveLength(3);
  });

  /* ------------------------------ 9. it adds up ----------------------------- */

  it("9 — reports a margin that agrees with what was actually bought and sold", async () => {
    const margin = await executeQuery(owner, marginReport, { sinceDays: 1 });

    expect(margin.costingMethod).toBe("Weighted average cost");
    // Revenue excludes tax: tax collected is not income.
    expect(margin.revenuePaise).toBe(SOLD * PRICE_PER_SHEET);
    // Cost is what the ledger recorded as consumed at the moment of the sale.
    expect(margin.costOfGoodsSoldPaise).toBe(SOLD * COST_PER_SHEET);
    expect(margin.marginPaise).toBe(SOLD * (PRICE_PER_SHEET - COST_PER_SHEET));

    const console_ = await executeQuery(owner, ownerConsole, {});
    expect(console_.todaysSalesPaise).toBe(invoiceTotalPaise);
    expect(console_.receivablesPaise).toBe(0);
    expect(console_.awaitingGoodsIssue).toBe(0);
    // 140 sheets left across two godowns, at the price they were bought for.
    expect(console_.stockValuePaise).toBe((BOUGHT - SOLD) * COST_PER_SHEET);
  });

  it("10 — the stock balance still equals a replay of every movement", async () => {
    // The invariant that makes it safe to store a derived figure at all, checked
    // once more after a full trading cycle rather than only after a single move.
    const drift = await withTenant(tenantId, (tx) =>
      tx.$queryRaw<unknown[]>`
        SELECT b.product_id
          FROM stock_balance b
          LEFT JOIN stock_ledger_entry e
            ON e.product_id = b.product_id AND e.location_id = b.location_id
         GROUP BY b.product_id, b.location_id, b.qty_units
        HAVING b.qty_units <> COALESCE(SUM(e.qty_delta_units), 0)`,
    );
    expect(drift).toEqual([]);
  });

  it("11 — leaves nothing behind when the business is torn down", async () => {
    // The rule this fixture exists to honour: no fake business operation exists
    // in the actual application. Deleting the tenant must take everything with
    // it, and this asserts the cascade rather than assuming it.
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantId}::uuid`;
      const survivors = await admin.$queryRaw<{ table_name: string; rows: bigint }[]>`
        SELECT 'plywood_product' AS table_name, count(*)::bigint AS rows FROM plywood_product WHERE tenant_id = ${tenantId}::uuid
        UNION ALL SELECT 'stock_ledger_entry', count(*)::bigint FROM stock_ledger_entry WHERE tenant_id = ${tenantId}::uuid
        UNION ALL SELECT 'stock_balance', count(*)::bigint FROM stock_balance WHERE tenant_id = ${tenantId}::uuid
        UNION ALL SELECT 'plywood_sales_order', count(*)::bigint FROM plywood_sales_order WHERE tenant_id = ${tenantId}::uuid
        UNION ALL SELECT 'plywood_invoice', count(*)::bigint FROM plywood_invoice WHERE tenant_id = ${tenantId}::uuid
        UNION ALL SELECT 'plywood_ledger_entry', count(*)::bigint FROM plywood_ledger_entry WHERE tenant_id = ${tenantId}::uuid`;
      expect(survivors.map((row) => ({ ...row, rows: Number(row.rows) }))).toEqual(
        survivors.map((row) => ({ ...row, rows: 0 })),
      );
    } finally {
      await admin.$disconnect();
    }
  });
});
