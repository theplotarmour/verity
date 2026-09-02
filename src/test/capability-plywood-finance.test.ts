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
  ENTITY_CUSTOMER,
  ENTITY_INVOICE,
  ENTITY_LEDGER_ENTRY,
  ENTITY_PAYMENT,
  ENTITY_SALES_ORDER,
  PLYWOOD_CAPABILITY,
  computeInvoiceTax,
  createCustomer,
  financialYearOf,
  invoiceDetail,
  listInvoices,
  outstandingReceivables,
  partyLedger,
  raiseSalesInvoice,
  recordPayment,
  registerPlywoodCapability,
} from "@/server/capabilities/plywood";

/**
 * CAPABILITY: Plywood trading — stage 6, finance.
 *
 * Requirement source: plywood.md §1.4 and §1.5. Decisions P2, P3 and P4.
 *
 * These are the assertions the business is judged by. A gap in an invoice series
 * is explained to a tax officer; the wrong tax pair is corrected in a filing; a
 * balance that disagrees with its own ledger is the moment an accountant stops
 * trusting the system.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-plywood-finance.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

describe("plywood: tax and financial year (P4)", () => {
  it("charges CGST and SGST inside one state, and never IGST as well", () => {
    const tax = computeInvoiceTax({
      taxablePaise: 1_000_000,
      supplyStateCode: "07",
      placeOfSupplyStateCode: "07",
      cgstRateBp: 900,
      sgstRateBp: 900,
      igstRateBp: 1800,
    });
    expect(tax.interState).toBe(false);
    expect(tax.cgstPaise).toBe(90_000);
    expect(tax.sgstPaise).toBe(90_000);
    expect(tax.igstPaise).toBe(0);
    expect(tax.totalPaise).toBe(1_180_000);
  });

  it("charges IGST across a state border, and never the pair as well", () => {
    const tax = computeInvoiceTax({
      taxablePaise: 1_000_000,
      supplyStateCode: "07",
      placeOfSupplyStateCode: "09",
      cgstRateBp: 900,
      sgstRateBp: 900,
      igstRateBp: 1800,
    });
    expect(tax.interState).toBe(true);
    expect(tax.cgstPaise).toBe(0);
    expect(tax.sgstPaise).toBe(0);
    expect(tax.igstPaise).toBe(180_000);
    expect(tax.totalPaise).toBe(1_180_000);
  });

  it("foots exactly, with no invoice-level rounding", () => {
    // Unlike a restaurant bill, a tax invoice must equal the sum of its parts —
    // the CHECK constraint on the column enforces the same thing.
    const tax = computeInvoiceTax({
      taxablePaise: 333_333,
      supplyStateCode: "07",
      placeOfSupplyStateCode: "07",
      cgstRateBp: 900,
      sgstRateBp: 900,
      igstRateBp: 1800,
    });
    expect(tax.totalPaise).toBe(333_333 + tax.cgstPaise + tax.sgstPaise);
  });

  it("runs the financial year April to March, not January to December", () => {
    expect(financialYearOf(new Date("2026-04-01T00:00:00Z"))).toBe("2026-27");
    expect(financialYearOf(new Date("2027-03-31T00:00:00Z"))).toBe("2026-27");
    // One day later is a new year and a new series.
    expect(financialYearOf(new Date("2027-04-01T00:00:00Z"))).toBe("2027-28");
  });
});

describeDb("capability: Plywood trading — finance", () => {
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();

  let organizationId: string;
  let finance: ActorContext;
  let godownId: string;
  let productId: string;

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
        data: { id: tenantId, name: "Finance Test Traders", timeZone: "Asia/Kolkata" },
      });
      await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      await activateCapability(tx, tenantId, ASSET_CAPABILITY);
      await activateCapability(tx, tenantId, EVIDENCE_CAPABILITY);
      await activateCapability(tx, tenantId, PLYWOOD_CAPABILITY);

      // The rates and the business's own state are configuration; the
      // arithmetic that uses them is code. 9% + 9% intra-state, 18% inter.
      await setConfig(tx, tenantId, CONFIG_TENANT_STATE_CODE, "07", "Tenant");
      await setConfig(tx, tenantId, CONFIG_CGST_RATE_BP, 900, "Tenant");
      await setConfig(tx, tenantId, CONFIG_SGST_RATE_BP, 900, "Tenant");
      await setConfig(tx, tenantId, CONFIG_IGST_RATE_BP, 1800, "Tenant");

      organizationId = (await tx.organization.create({ data: { tenantId, name: "HQ" } })).id;
      godownId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Okhla" } })
      ).id;

      const brand = await tx.plywoodBrand.create({ data: { tenantId, name: "Century Ply" } });
      productId = (
        await tx.plywoodProduct.create({
          data: {
            tenantId,
            brandId: brand.id,
            name: "Sainik 710",
            hsnCode: "44121000",
            thicknessTenthMm: 180,
      widthTenth: 24400,
            heightTenth: 12200,
            grade: "BWR",
          },
        })
      ).id;

      const role = await tx.role.create({ data: { tenantId, name: "Finance" }, select: { id: true } });
      await tx.permission.createMany({
        data: [
          ENTITY_INVOICE,
          ENTITY_PAYMENT,
          ENTITY_LEDGER_ENTRY,
          ENTITY_CUSTOMER,
          ENTITY_SALES_ORDER,
        ].flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId,
            roleId: role.id,
            verb,
            entity,
            scope: "Tenant" as const,
          })),
        ),
      });

      const identity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Accountant",
      });
      await tx.tenantMembership.update({
        where: { id: identity.membershipId },
        data: { roleId: role.id },
      });
      finance = {
        tenantId,
        userId: identity.userId,
        membershipId: identity.membershipId,
        organizationId,
        roleId: role.id,
      };
    });

    await withTenant(otherTenantId, async (tx) => {
      await tx.tenant.create({ data: { id: otherTenantId, name: "Rival Traders" } });
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
      await admin.$executeRaw`DELETE FROM tenant WHERE id IN (${tenantId}::uuid, ${otherTenantId}::uuid)`;
      await admin.$executeRaw`DELETE FROM "user" WHERE id NOT IN (SELECT user_id FROM tenant_membership)`;
      await admin.$executeRaw`DELETE FROM party WHERE id NOT IN (SELECT party_id FROM "user")`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  /** An approved order for `qty` sheets at `unitPricePaise`, ready to invoice. */
  /**
   * An order that has been approved AND issued.
   *
   * Slice 4 bound the invoice to the quantity that actually left the yard
   * (audit P0-03), so a fixture that only approves an order can no longer be
   * invoiced — correctly. `qtyShipped` is set here directly rather than by
   * running the issue command, because these tests are about invoicing and
   * numbering, and the issue path has its own coverage in
   * `plywood-sales-chain.test.ts`.
   */
  async function approvedOrder(
    customerId: string,
    qtyOrdered = 10,
    unitPricePaise = 100_000,
  ): Promise<string> {
    return withTenant(tenantId, async (tx) => {
      const order = await tx.plywoodSalesOrder.create({
        data: {
          tenantId,
          customerId,
          locationId: godownId,
          state: "approved",
          totalPricePaise: qtyOrdered * unitPricePaise,
        },
      });
      await tx.plywoodSalesOrderLine.create({
        data: {
          tenantId,
          salesOrderId: order.id,
          productId,
          productNameSnapshot: "Sainik 710",
          hsnCodeSnapshot: "44121000",
          qtyOrdered,
          qtyShipped: qtyOrdered,
          unitPricePaise,
        },
      });
      return order.id;
    });
  }

  async function customerInState(stateCode: string): Promise<string> {
    const customer = await executeCommand(finance, createCustomer, {
      displayName: `Dealer ${randomUUID().slice(0, 8)}`,
      stateCode,
      creditLimitPaise: 1_000_000_000,
    });
    return customer.id;
  }

  /* ------------------------------- numbering -------------------------------- */

  it("numbers invoices sequentially and gaplessly within a series (P2)", async () => {
    const customerId = await customerInState("07");
    const numbers: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const orderId = await approvedOrder(customerId, 1, 10_000);
      const invoice = await executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId });
      numbers.push(invoice.invoiceNumber);
    }

    const year = financialYearOf(new Date());
    expect(numbers).toEqual([
      `SALES/${year}/0001`,
      `SALES/${year}/0002`,
      `SALES/${year}/0003`,
    ]);
  });

  it("does not burn a number on a failed invoice", async () => {
    // The whole reason a counter row was chosen over a PostgreSQL sequence. A
    // sequence is non-transactional: the rolled-back attempt below would consume
    // 0004 and leave a gap the client explains to a tax officer.
    const customerId = await customerInState("07");
    const orderId = await approvedOrder(customerId, 1, 10_000);
    await executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId });

    await expect(
      executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId }),
    ).rejects.toThrow(/already been invoiced/);

    const next = await approvedOrder(customerId, 1, 10_000);
    const after = await executeCommand(finance, raiseSalesInvoice, { salesOrderId: next });

    const year = financialYearOf(new Date());
    expect(after.invoiceNumber).toBe(`SALES/${year}/0005`);

    // And the whole series really is gapless.
    const issued = await withTenant(tenantId, (tx) =>
      tx.plywoodInvoice.findMany({
        where: { financialYear: year },
        orderBy: { sequenceNumber: "asc" },
        select: { sequenceNumber: true },
      }),
    );
    expect(issued.map((row) => row.sequenceNumber)).toEqual(
      issued.map((_, index) => index + 1),
    );
  });

  /* --------------------------------- tax ------------------------------------ */

  it("taxes a Delhi customer with CGST and SGST", async () => {
    const customerId = await customerInState("07");
    const orderId = await approvedOrder(customerId, 10, 100_000);
    const invoice = await executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId });

    expect(invoice.interState).toBe(false);
    const detail = await executeQuery(finance, invoiceDetail, { invoiceId: invoice.id });
    expect(detail!.taxablePaise).toBe(1_000_000);
    expect(detail!.cgstPaise).toBe(90_000);
    expect(detail!.sgstPaise).toBe(90_000);
    expect(detail!.igstPaise).toBe(0);
    expect(detail!.totalPaise).toBe(1_180_000);
    // Legally required on the invoice, snapshotted onto the line.
    expect(detail!.lines[0]!.hsnCode).toBe("44121000");
  });

  it("taxes a customer across the border with IGST", async () => {
    const customerId = await customerInState("09");
    const orderId = await approvedOrder(customerId, 10, 100_000);
    const invoice = await executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId });

    expect(invoice.interState).toBe(true);
    const detail = await executeQuery(finance, invoiceDetail, { invoiceId: invoice.id });
    expect(detail!.igstPaise).toBe(180_000);
    expect(detail!.cgstPaise).toBe(0);
    expect(detail!.sgstPaise).toBe(0);
  });

  it("keeps a filed invoice's tax when the customer later moves state", async () => {
    const customerId = await customerInState("07");
    const orderId = await approvedOrder(customerId, 5, 100_000);
    const invoice = await executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId });

    await withTenant(tenantId, (tx) =>
      tx.plywoodCustomer.update({ where: { id: customerId }, data: { stateCode: "27" } }),
    );

    // Snapshotted, so a customer relocating cannot retrospectively change how an
    // old invoice was taxed — which would restate a filing that is already made.
    const detail = await executeQuery(finance, invoiceDetail, { invoiceId: invoice.id });
    expect(detail!.cgstPaise).toBe(45_000);
    expect(detail!.igstPaise).toBe(0);
  });

  /* ------------------------------- payments --------------------------------- */

  it("takes a part payment, then the rest, and never more than is owed", async () => {
    const customerId = await customerInState("07");
    const orderId = await approvedOrder(customerId, 10, 100_000);
    const invoice = await executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId });

    const first = await executeCommand(finance, recordPayment, {
      invoiceId: invoice.id,
      amountPaise: 500_000,
      method: "bank",
      reference: "UTR-99001",
    });
    expect(first.outstandingPaise).toBe(680_000);

    // An overpayment is a real event with its own treatment — an advance, or a
    // refund. Quietly absorbing it would leave money the ledger cannot explain.
    await expect(
      executeCommand(finance, recordPayment, {
        invoiceId: invoice.id,
        amountPaise: 700_000,
        method: "cash",
      }),
    ).rejects.toThrow(/outstanding on this invoice/);

    const second = await executeCommand(finance, recordPayment, {
      invoiceId: invoice.id,
      amountPaise: 680_000,
      method: "upi",
    });
    expect(second.outstandingPaise).toBe(0);
  });

  /* -------------------------------- ledger ---------------------------------- */

  it("derives a balance from the ledger and nowhere else (P3)", async () => {
    const customerId = await customerInState("07");
    const orderId = await approvedOrder(customerId, 4, 100_000);
    const invoice = await executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId });
    await executeCommand(finance, recordPayment, {
      invoiceId: invoice.id,
      amountPaise: 200_000,
      method: "cash",
    });

    const ledger = await executeQuery(finance, partyLedger, { customerId });
    // 4 × ₹1,000 = ₹4,000 plus 18% is ₹4,720; less ₹2,000 received.
    expect(ledger.balancePaise).toBe(472_000 - 200_000);
    expect(ledger.entries).toHaveLength(2);
    expect(ledger.entries[0]!.entryType).toBe("debit");
    expect(ledger.entries[1]!.entryType).toBe("credit");
    // The running balance is computed for display and never stored.
    expect(ledger.entries[1]!.runningBalancePaise).toBe(ledger.balancePaise);
  });

  it("has no cached balance column anywhere to disagree with the ledger", async () => {
    // P3, asserted structurally. A cached balance is an optimisation; adding one
    // before there is a measurement is how the drift gets in.
    const columns = await withTenant(tenantId, (tx) =>
      tx.$queryRaw<{ table_name: string; column_name: string }[]>`
        SELECT table_name, column_name
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name LIKE 'plywood%'
           AND (column_name LIKE '%outstanding%' OR column_name LIKE '%running_balance%'
                OR column_name LIKE '%balance_paise%')`,
    );
    expect(columns).toEqual([]);
  });

  it("refuses to rewrite a ledger entry, loudly", async () => {
    const customerId = await customerInState("07");
    const orderId = await approvedOrder(customerId, 1, 100_000);
    await executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId });

    await expect(
      withTenant(tenantId, (tx) =>
        tx.$executeRaw`UPDATE plywood_ledger_entry SET amount_paise = 1 WHERE customer_id = ${customerId}::uuid`,
      ),
    ).rejects.toThrow(/append-only/);
  });

  it("refuses to delete an invoice, because it is a legal document", async () => {
    const customerId = await customerInState("07");
    const orderId = await approvedOrder(customerId, 1, 100_000);
    const invoice = await executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId });

    await expect(
      withTenant(tenantId, (tx) =>
        tx.$executeRaw`DELETE FROM plywood_invoice WHERE id = ${invoice.id}::uuid`,
      ),
    ).rejects.toThrow(/append-only/);
  });

  /* ------------------------------ receivables ------------------------------- */

  it("reports what is owed, by whom, and how long it has been owed", async () => {
    const customerId = await customerInState("07");
    const orderId = await approvedOrder(customerId, 3, 100_000);
    const invoice = await executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId });
    await executeCommand(finance, recordPayment, {
      invoiceId: invoice.id,
      amountPaise: 100_000,
      method: "cash",
    });

    const owed = await executeQuery(finance, outstandingReceivables, {});
    const row = owed.find((candidate) => candidate.customerId === customerId)!;
    expect(row.invoicedPaise).toBe(354_000);
    expect(row.receivedPaise).toBe(100_000);
    expect(row.outstandingPaise).toBe(254_000);
    // The age of the oldest unpaid invoice is what a collections call is about.
    expect(row.oldestUnpaidAt).not.toBeNull();
  });

  it("lists unpaid invoices only when asked", async () => {
    const customerId = await customerInState("07");
    const orderId = await approvedOrder(customerId, 2, 100_000);
    const invoice = await executeCommand(finance, raiseSalesInvoice, { salesOrderId: orderId });
    const detail = await executeQuery(finance, invoiceDetail, { invoiceId: invoice.id });
    await executeCommand(finance, recordPayment, {
      invoiceId: invoice.id,
      amountPaise: detail!.totalPaise,
      method: "bank",
    });

    const unpaid = await executeQuery(finance, listInvoices, { unpaidOnly: true });
    expect(unpaid.map((row) => row.id)).not.toContain(invoice.id);

    const all = await executeQuery(finance, listInvoices, {});
    expect(all.map((row) => row.id)).toContain(invoice.id);
  });

  it("shows another tenant no invoices, payments or ledger entries (INV-001)", async () => {
    const seen = await withTenant(otherTenantId, async (tx) => ({
      invoices: await tx.plywoodInvoice.count(),
      payments: await tx.plywoodPayment.count(),
      ledger: await tx.plywoodLedgerEntry.count(),
    }));
    expect(seen).toEqual({ invoices: 0, payments: 0, ledger: 0 });
  });
});
