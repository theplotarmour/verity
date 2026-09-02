import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
  ENTITY_BRAND,
  ENTITY_BUSINESS_PROFILE,
  ENTITY_CUSTOMER,
  ENTITY_CUSTOMER_PRICE,
  ENTITY_GODOWN_RACK,
  ENTITY_GST_REGISTRATION,
  ENTITY_INVOICE,
  ENTITY_LEDGER_ENTRY,
  ENTITY_PAYMENT,
  ENTITY_PRODUCT,
  ENTITY_PURCHASE_ORDER,
  ENTITY_RESERVATION,
  ENTITY_SALES_ORDER,
  ENTITY_STOCK_BALANCE,
  ENTITY_STOCK_LEDGER,
  ENTITY_SUPPLIER,
  ENTITY_SUPPLIER_PRICE,
  PLYWOOD_CAPABILITY,
  confirmPurchaseBill,
  createBrand,
  createCustomer,
  createProduct,
  createPurchaseOrder,
  createSalesOrder,
  createSupplier,
  dispatchOrder,
  listInvoices,
  partyBalances,
  receiveGoods,
  reserveForOrder,
  recordPartyPayment,
  registerPlywoodCapability,
  submitPurchaseOrder,
  unbilledMovements,
} from "@/server/capabilities/plywood";

/**
 * Task 71 — the money side happens by itself.
 *
 * The product owner's complaint, in their words: "when I create a purchase
 * request it shows the option to receive goods but the finance part is not done
 * automatically, I have to add it myself and even then it shows *nothing has
 * been received against this purchase order, so there is nothing to invoice*."
 *
 * That refusal was correct accounting and a broken workflow. These tests pin
 * the resolution: nobody raises a document, the documents raise themselves when
 * goods move, and recording money is a single party-level act.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message =
    "plywood-finance-automation.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

describeDb("plywood finance automation (Task 71)", () => {
  const tenantId = randomUUID();
  let organizationId: string;
  let owner: ActorContext;
  let godownId: string;
  let brandId: string;
  let supplierId: string;
  let customerId: string;

  async function freshBoard(): Promise<string> {
    const product = await executeCommand(owner, createProduct, {
      brandId,
      name: `Board ${randomUUID().slice(0, 8)}`,
      hsnCode: "44121000",
      thicknessTenthMm: 180,
      widthTenth: 24400,
      heightTenth: 12200,
      grade: "BWR",
    });
    return product.id;
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
        data: {
          id: tenantId,
          name: "Finance Automation Plywood",
          timeZone: "Asia/Kolkata",
        },
      });
      await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      await activateCapability(tx, tenantId, ASSET_CAPABILITY);
      await activateCapability(tx, tenantId, EVIDENCE_CAPABILITY);
      await activateCapability(tx, tenantId, PLYWOOD_CAPABILITY);

      await setConfig(tx, tenantId, CONFIG_TENANT_STATE_CODE, "07", "Tenant");
      await setConfig(tx, tenantId, CONFIG_CGST_RATE_BP, 900, "Tenant");
      await setConfig(tx, tenantId, CONFIG_SGST_RATE_BP, 900, "Tenant");
      await setConfig(tx, tenantId, CONFIG_IGST_RATE_BP, 1800, "Tenant");

      organizationId = (
        await tx.organization.create({ data: { tenantId, name: "HQ" } })
      ).id;
      godownId = (
        await tx.location.create({
          data: { tenantId, organizationId, name: "Okhla" },
        })
      ).id;

      const ownerRole = await tx.role.create({
        data: { tenantId, name: "Owner" },
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
        ENTITY_INVOICE,
        ENTITY_PAYMENT,
        ENTITY_LEDGER_ENTRY,
        ENTITY_BUSINESS_PROFILE,
        ENTITY_GST_REGISTRATION,
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

      const identity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Proprietor",
      });
      await tx.tenantMembership.update({
        where: { id: identity.membershipId },
        data: { roleId: ownerRole.id },
      });
      owner = {
        tenantId,
        userId: identity.userId,
        membershipId: identity.membershipId,
        organizationId,
        roleId: ownerRole.id,
      };
    });
    invalidateCapabilityCache();

    brandId = (
      await executeCommand(owner, createBrand, {
        name: `Century ${randomUUID().slice(0, 6)}`,
      })
    ).id;
    supplierId = (
      await executeCommand(owner, createSupplier, {
        displayName: `Mill ${randomUUID().slice(0, 6)}`,
        stateCode: "07",
      })
    ).id;
    customerId = (
      await executeCommand(owner, createCustomer, {
        displayName: `Contractor ${randomUUID().slice(0, 6)}`,
        stateCode: "07",
        creditLimitPaise: 100_000_000,
      })
    ).id;
  });

  afterAll(async () => {
    clearCommands();
    clearQueries();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantId}::uuid`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  /* ------------------- the payable raises itself (item 7) ------------------ */

  describe("receiving goods raises the supplier's bill", () => {
    it("bills the order when the last delivery lands, and owes the money", async () => {
      const productId = await freshBoard();
      const order = await executeCommand(owner, createPurchaseOrder, {
        supplierId,
        locationId: godownId,
        lines: [{ productId, qtyOrdered: 50, unitCostPaise: 100_000 }],
      });
      await executeCommand(owner, submitPurchaseOrder, { orderId: order.id });

      const received = await executeCommand(owner, receiveGoods, {
        orderId: order.id,
        lines: [{ productId, qtyReceived: 50 }],
      });

      expect(received.state).toBe("completed");
      expect(received.billingRefusal).toBeNull();
      // 50 × ₹1,000 = ₹50,000 plus 18% = ₹59,000.
      expect(received.billing).not.toBeNull();
      expect(received.billing!.totalPaise).toBe(5_900_000);

      const balances = await executeQuery(owner, partyBalances, {
        side: "supplier",
      });
      const row = balances.find((entry) => entry.partyId === supplierId);
      expect(row).toBeDefined();
      expect(row!.outstandingPaise).toBeGreaterThanOrEqual(5_900_000);
    });

    it("does not bill a part-delivered order, and shows the value as unbilled", async () => {
      const productId = await freshBoard();
      const order = await executeCommand(owner, createPurchaseOrder, {
        supplierId,
        locationId: godownId,
        lines: [{ productId, qtyOrdered: 100, unitCostPaise: 50_000 }],
      });
      await executeCommand(owner, submitPurchaseOrder, { orderId: order.id });

      const received = await executeCommand(owner, receiveGoods, {
        orderId: order.id,
        lines: [{ productId, qtyReceived: 40 }],
      });

      // An order carries one invoice and an invoice is immutable, so a bill
      // raised on the first of several deliveries could never grow to cover the
      // rest. Until the order completes the delivered value is owed with no
      // document, and it says so rather than disappearing.
      expect(received.state).toBe("receiving");
      expect(received.billing).toBeNull();

      const balances = await executeQuery(owner, partyBalances, {
        side: "supplier",
      });
      const row = balances.find((entry) => entry.partyId === supplierId)!;
      expect(row.uninvoicedPaise).toBeGreaterThanOrEqual(40 * 50_000);

      // And it is NOT reported as a failed automatic raise: a part-received
      // order having no bill is the design, not a fault to be repaired.
      const unbilled = await executeQuery(owner, unbilledMovements, {});
      expect(unbilled.purchases.some((row) => row.id === order.id)).toBe(false);
    });

    it("marks the raised bill provisional until the supplier's document arrives", async () => {
      const productId = await freshBoard();
      const order = await executeCommand(owner, createPurchaseOrder, {
        supplierId,
        locationId: godownId,
        lines: [{ productId, qtyOrdered: 10, unitCostPaise: 200_000 }],
      });
      await executeCommand(owner, submitPurchaseOrder, { orderId: order.id });
      const received = await executeCommand(owner, receiveGoods, {
        orderId: order.id,
        lines: [{ productId, qtyReceived: 10 }],
      });

      const invoices = await executeQuery(owner, listInvoices, {});
      const bill = invoices.find(
        (row) => row.invoiceNumber === received.billing!.invoiceNumber,
      )!;
      expect(bill.provisional).toBe(true);

      // Their paper says ₹100 more than we computed. The difference is
      // REPORTED, not posted: a supplier who has billed the wrong amount is a
      // conversation, and the correction is a note.
      const confirmed = await executeCommand(owner, confirmPurchaseBill, {
        invoiceId: bill.id,
        supplierInvoiceNumber: "MILL/2026/887",
        supplierInvoiceDate: new Date().toISOString(),
        taxablePaise: 2_010_000,
        cgstPaise: 180_900,
        sgstPaise: 180_900,
        totalPaise: 2_371_800,
      });
      expect(confirmed.differencePaise).toBe(2_371_800 - bill.totalPaise);

      const after = await executeQuery(owner, listInvoices, {});
      expect(after.find((row) => row.id === bill.id)!.provisional).toBe(false);
    });

    it("refuses a second confirmation rather than overwriting the first", async () => {
      const invoices = await executeQuery(owner, listInvoices, {});
      const confirmed = invoices.find(
        (row) => row.direction === "purchase" && !row.provisional,
      )!;
      await expect(
        executeCommand(owner, confirmPurchaseBill, {
          invoiceId: confirmed.id,
          supplierInvoiceNumber: "MILL/2026/999",
          supplierInvoiceDate: new Date().toISOString(),
          taxablePaise: 100,
          totalPaise: 100,
        }),
      ).rejects.toThrow(/already confirmed/);
    });
  });

  /* ----------------- the sales invoice raises itself (item 10) ------------- */

  describe("dispatching goods raises the customer's invoice", () => {
    it("invoices the order when the last line leaves the yard", async () => {
      const productId = await freshBoard();
      const purchase = await executeCommand(owner, createPurchaseOrder, {
        supplierId,
        locationId: godownId,
        lines: [{ productId, qtyOrdered: 30, unitCostPaise: 100_000 }],
      });
      await executeCommand(owner, submitPurchaseOrder, { orderId: purchase.id });
      await executeCommand(owner, receiveGoods, {
        orderId: purchase.id,
        lines: [{ productId, qtyReceived: 30 }],
      });

      const sale = await executeCommand(owner, createSalesOrder, {
        customerId,
        locationId: godownId,
        lines: [{ productId, qtyOrdered: 30, unitPricePaise: 150_000 }],
      });
      // Stock must be held before it can be issued; that guard predates this
      // task and is not what is under test here.
      await executeCommand(owner, reserveForOrder, { orderId: sale.id });
      const issued = await executeCommand(owner, dispatchOrder, {
        orderId: sale.id,
      });

      expect(issued.state).toBe("completed");
      expect(issued.invoicingRefusal).toBeNull();
      // 30 × ₹1,500 = ₹45,000 plus 18% = ₹53,100.
      expect(issued.invoicing!.totalPaise).toBe(5_310_000);
    });
  });

  /* ------------------- money is recorded per party (item 11) --------------- */

  describe("recording a payment against a party", () => {
    it("settles the oldest open invoices first and keeps the surplus on account", async () => {
      const balancesBefore = await executeQuery(owner, partyBalances, {
        side: "customer",
      });
      const owed = balancesBefore.find(
        (row) => row.partyId === customerId,
      )!.outstandingPaise;
      expect(owed).toBeGreaterThan(0);

      // Deliberately MORE than is owed. An advance is ordinary, and refusing it
      // makes the record wrong rather than the transaction impossible.
      const payment = await executeCommand(owner, recordPartyPayment, {
        party: { customerId },
        direction: "in",
        amountPaise: owed + 500_000,
        method: "bank",
        reference: "UTR-7781",
      });

      expect(payment.allocatedPaise).toBe(owed);
      expect(payment.unallocatedPaise).toBe(500_000);
      expect(payment.settled.length).toBeGreaterThan(0);

      const after = await executeQuery(owner, partyBalances, {
        side: "customer",
      });
      const row = after.find((entry) => entry.partyId === customerId)!;
      expect(row.outstandingPaise).toBe(0);
      expect(row.onAccountPaise).toBe(500_000);
    });

    it("allocates one payment across several supplier bills", async () => {
      const balances = await executeQuery(owner, partyBalances, {
        side: "supplier",
      });
      const owed = balances.find(
        (row) => row.partyId === supplierId,
      )!.outstandingPaise;

      const payment = await executeCommand(owner, recordPartyPayment, {
        party: { supplierId },
        direction: "out",
        amountPaise: owed,
        method: "cheque",
        reference: "CHQ-4410",
      });

      // The point of the allocation table: one cheque, several documents, and
      // nobody had to enter it once per bill.
      expect(payment.settled.length).toBeGreaterThan(1);
      expect(payment.unallocatedPaise).toBe(0);

      const after = await executeQuery(owner, partyBalances, {
        side: "supplier",
      });
      const row = after.find((entry) => entry.partyId === supplierId);
      expect(row?.outstandingPaise ?? 0).toBe(0);
    });

    it("treats a refund as a movement on the account, settling nothing", async () => {
      // Money OUT to a customer. It settles no document — there is nothing of
      // theirs to settle — and deriving the direction from the party would have
      // made this unrecordable.
      const refund = await executeCommand(owner, recordPartyPayment, {
        party: { customerId },
        direction: "out",
        amountPaise: 100_000,
        method: "upi",
      });
      expect(refund.settled).toHaveLength(0);
      expect(refund.unallocatedPaise).toBe(100_000);
    });
  });

  /* ------------------------- discounts (item 9) --------------------------- */

  describe("line discounts", () => {
    it("stores the net cost, so every downstream reader is already correct", async () => {
      const productId = await freshBoard();
      const order = await executeCommand(owner, createPurchaseOrder, {
        supplierId,
        locationId: godownId,
        lines: [
          { productId, qtyOrdered: 10, unitCostPaise: 100_000, discountBps: 1250 },
        ],
      });

      await withTenant(tenantId, async (tx) => {
        const line = await tx.plywoodPurchaseOrderLine.findFirstOrThrow({
          where: { purchaseOrderId: order.id },
        });
        // 12.5% off ₹1,000 is ₹875. The NET is what unitCostPaise holds, so
        // the stock movement, the weighted average and the payable all read a
        // discounted figure without knowing discounts exist.
        expect(line.unitCostPaise).toBe(87_500);
        expect(line.listUnitCostPaise).toBe(100_000);
        expect(line.discountBps).toBe(1250);

        const stored = await tx.plywoodPurchaseOrder.findUniqueOrThrow({
          where: { id: order.id },
        });
        expect(stored.totalCostPaise).toBe(10 * 87_500);
      });
    });

    it("refuses a discount of 100 per cent, which is a free supply", async () => {
      const productId = await freshBoard();
      await expect(
        executeCommand(owner, createPurchaseOrder, {
          supplierId,
          locationId: godownId,
          lines: [
            {
              productId,
              qtyOrdered: 1,
              unitCostPaise: 100_000,
              discountBps: 10_000,
            },
          ],
        }),
      ).rejects.toThrow();
    });
  });
});
