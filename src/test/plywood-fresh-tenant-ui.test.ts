import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { invalidateCapabilityCache } from "@/server/platform/capability";
import {
  clearCommands,
  clearHooks,
  executeCommand,
  getCommand,
  type ActorContext,
} from "@/server/platform/command";
import { clearQueries, executeQuery, getQuery } from "@/server/platform/query";
import { clearScopeResolvers } from "@/server/platform/authorization";
import { clearTransitionGuards } from "@/server/platform/state";
import { clearContributions } from "@/server/platform/contribution";
import { provisionIdentity } from "@/server/platform/identity";
import { installAdministration } from "@/server/platform/administration";
import { installCapabilities } from "@/server/capabilities/registry";

/**
 * THE FRESH-TENANT WORKFLOW, AS THE INTERFACE ISSUES IT.
 *
 * Every other plywood test imports a command object and calls it. This one does
 * not: it resolves commands and queries BY STRING KEY through `getCommand` and
 * `getQuery`, exactly as `runCommand` does, and sends the payload shapes the
 * forms actually build — rupees converted to paise at the edge, optional fields
 * omitted rather than sent empty, quantities as numbers.
 *
 * That difference is the point. A capability can be complete and still
 * unreachable: a command key renamed, a form sending a string where the schema
 * wants an integer, a field the screen never offers. This walks the whole chain
 * the way a person would and would fail on any of those.
 *
 * ZERO SQL for the business steps. Capability activation and tax configuration
 * go through the HQ commands, not through `activateCapability` or `setConfig`
 * directly, because that is what the Capability registry and Configuration
 * screens now call.
 *
 * Two things are unavoidably not commands: creating the tenant row itself and
 * provisioning the first identity. Those are how a client is created in HQ from
 * ANOTHER tenant, and this fixture has no operator to do it from — so they are
 * set up directly and are the only direct writes in the file.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "plywood-fresh-tenant-ui.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

describeDb("plywood: a fresh tenant, set up and traded through the interface", () => {
  const tenantId = randomUUID();

  let actor: ActorContext;
  let godownId: string;
  let productId: string;
  let supplierId: string;
  let customerId: string;
  let purchaseOrderId: string;
  let salesOrderId: string;
  let invoiceId: string;

  /** What `runCommand(key, input)` does, minus the Next.js revalidation. */
  async function ui<T = unknown>(key: string, input: unknown): Promise<T> {
    const definition = getCommand(key);
    if (!definition) throw new Error(`No screen could call an unregistered command: ${key}`);
    return (await executeCommand(actor, definition, input)) as T;
  }

  /** What `runQuery(key, input)` does. */
  async function read<T = unknown>(key: string, input: unknown = {}): Promise<T> {
    const definition = getQuery(key);
    if (!definition) throw new Error(`No screen could call an unregistered query: ${key}`);
    return (await executeQuery(actor, definition, input)) as T;
  }

  /** Rupees to paise, exactly as every form does it before sending. */
  const paise = (rupees: number) => Math.round(rupees * 100);

  beforeAll(async () => {
    await assertRlsEnforceable();
    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();
    installCapabilities();
    installAdministration();

    await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({
        data: { id: tenantId, name: "Fresh Plywood Traders", timeZone: "Asia/Kolkata" },
      });
      const organization = await tx.organization.create({
        data: { tenantId, name: "Central HQ" },
      });

      // Every plywood and platform entity, so this fixture tests reachability
      // rather than authorization. The per-stage suites hold the refusals.
      const role = await tx.role.create({ data: { tenantId, name: "Owner" }, select: { id: true } });
      const registered = await tx.entityDefinition.findMany({ select: { key: true } });
      const entities = [
        ...registered.map((row) => row.key),
        // The HQ entities. Platform administration is not a capability, so it
        // registers no entity definitions — the Capability registry and the
        // Configuration screen both act on `verity.platform.tenant`.
        "verity.platform.tenant",
        "verity.platform.organization",
        "verity.platform.membership",
        "verity.platform.role",
      ];
      await tx.permission.createMany({
        data: [...new Set(entities)].flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId,
            roleId: role.id,
            verb,
            entity,
            scope: "Tenant" as const,
          })),
        ),
        skipDuplicates: true,
      });

      const identity = await provisionIdentity(tx, {
        organizationId: organization.id,
        authUserId: randomUUID(),
        displayName: "Proprietor",
      });
      await tx.tenantMembership.update({
        where: { id: identity.membershipId },
        data: { roleId: role.id },
      });

      actor = {
        tenantId,
        userId: identity.userId,
        membershipId: identity.membershipId,
        organizationId: organization.id,
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

  /* --------------------------- 1. capability registry ----------------------- */

  it("1 — activates Plywood and its dependencies from the Capability registry", async () => {
    // The screen refuses to offer the button while a dependency is missing, and
    // the database refuses the command. Both orders are exercised: the refusal
    // first, then the correct sequence.
    await expect(
      ui("verity.platform.set_capability_state", {
        capabilityId: "verity.capability.plywood",
        enabled: true,
      }),
    ).rejects.toThrow(/missing active dependencies/);

    for (const capabilityId of [
      "verity.capability.location",
      "verity.capability.asset",
      "verity.capability.evidence",
      "verity.capability.trading",
      "verity.capability.plywood",
    ]) {
      await ui("verity.platform.set_capability_state", { capabilityId, enabled: true });
    }
    invalidateCapabilityCache();

    const active = await withTenant(tenantId, (tx) =>
      tx.tenantActivation.findMany({ where: { status: "Active" }, select: { capabilityId: true } }),
    );
    expect(active.map((row) => row.capabilityId)).toContain("verity.capability.plywood");
  });

  /* ---------------------------- 2. configuration ---------------------------- */

  it("2 — sets the tax state and rates from Configuration", async () => {
    // Strings, because that is what a text box sends. The capability coerces
    // rather than trusting JavaScript to fold a string through its arithmetic.
    await ui("verity.platform.set_configuration", {
      key: "verity.trading.tax.state_code",
      value: "07",
    });
    await ui("verity.platform.set_configuration", {
      key: "verity.trading.tax.cgst_rate_bp",
      value: "900",
    });
    await ui("verity.platform.set_configuration", {
      key: "verity.trading.tax.sgst_rate_bp",
      value: "900",
    });
    await ui("verity.platform.set_configuration", {
      key: "verity.trading.tax.igst_rate_bp",
      value: "1800",
    });

    const set = await withTenant(tenantId, (tx) =>
      tx.configParameter.count({ where: { scope: "Tenant" } }),
    );
    expect(set).toBe(4);
  });

  /* ------------------------- 3. godowns and catalogue ----------------------- */

  it("3 — lays out a godown and a catalogue", async () => {
    godownId = await withTenant(tenantId, async (tx) => {
      // A Location is created on the Locations screen, which belongs to the
      // Location capability rather than to plywood. Created directly here so
      // this test stays about the plywood workflow.
      const location = await tx.location.create({
        data: { tenantId, organizationId: actor.organizationId!, name: "Godown A — Okhla" },
      });
      return location.id;
    });

    await ui("verity.trading.define_godown_rack", { locationId: godownId, rackLabel: "A-01" });

    const brand = await ui<{ id: string }>("verity.trading.create_brand", { name: "Century Ply" });
    const product = await ui<{ id: string }>("verity.plywood.create_product", {
      brandId: brand.id,
      name: "Sainik 710 BWR",
      hsnCode: "44121000",
      grade: "BWR",
      // The Catalogue form sends tenths, converted from the millimetres typed.
      thicknessTenthMm: Math.round(18 * 10),
      widthTenth: 24400,
      heightTenth: 12200,
      reorderLevelUnits: 50,
    });
    productId = product.id;

    const catalogue = await read<Array<{ products: Array<{ id: string }> }>>(
      "verity.plywood.list_catalogue",
      {},
    );
    expect(catalogue[0]!.products.map((p) => p.id)).toContain(productId);
  });

  /* -------------------------- 4. partners and prices ------------------------ */

  it("4 — adds a supplier and a customer with their agreed prices", async () => {
    const supplier = await ui<{ id: string }>("verity.trading.create_supplier", {
      displayName: "Century Distributors",
      gstin: "07AABCU9603R1ZM",
      stateCode: "07",
    });
    supplierId = supplier.id;

    const customer = await ui<{ id: string }>("verity.trading.create_customer", {
      displayName: "Sharma Timber Mart",
      gstin: "07AAACS1429B1ZL",
      stateCode: "07",
      creditLimitPaise: paise(500_000),
    });
    customerId = customer.id;

    await ui("verity.trading.set_supplier_price", {
      supplierId,
      productId,
      negotiatedCostPaise: paise(920),
    });
    await ui("verity.trading.set_customer_price", {
      customerId,
      productId,
      customPricePaise: paise(1280),
    });

    // Raising a limit is its own control, held separately from ordinary edits.
    await ui("verity.trading.set_credit_limit", {
      customerId,
      creditLimitPaise: paise(800_000),
    });

    const customers = await read<Array<{ id: string; creditLimitPaise: number }>>(
      "verity.trading.list_customers",
      {},
    );
    expect(customers.find((row) => row.id === customerId)!.creditLimitPaise).toBe(paise(800_000));
  });

  /* ------------------------------- 5. purchase ------------------------------ */

  it("5 — orders and receives, with the cost left blank so the agreed price applies", async () => {
    const order = await ui<{ id: string; totalCostPaise: number }>(
      "verity.trading.create_purchase_order",
      {
        supplierId,
        locationId: godownId,
        reference: "PO-4471",
        // No unitCostPaise: the form omits the field when the box is blank,
        // rather than sending zero, which would book a free delivery.
        lines: [{ productId, qtyOrdered: 200 }],
      },
    );
    purchaseOrderId = order.id;
    expect(order.totalCostPaise).toBe(200 * paise(920));

    await ui("verity.trading.submit_purchase_order", { orderId: purchaseOrderId });
    const received = await ui<{ state: string }>("verity.trading.receive_goods", {
      orderId: purchaseOrderId,
      lines: [{ productId, qtyReceived: 200 }],
    });
    expect(received.state).toBe("completed");
  });

  /* ------------------------------ 6. corrections ---------------------------- */

  it("6 — records a stock count, damage and a return from the Stock screen", async () => {
    await ui("verity.trading.adjust_stock", {
      productId,
      locationId: godownId,
      qtyUnits: 3,
      direction: "out",
      reason: "Physical count on 28 August found three short",
    });
    await ui("verity.trading.record_damaged_stock", {
      productId,
      locationId: godownId,
      qtyUnits: 2,
      reason: "Water damage in the corner stack",
    });
    await ui("verity.trading.record_returned_stock", {
      productId,
      locationId: godownId,
      qtyUnits: 5,
      reason: "Customer returned five sheets, unopened",
    });

    const onHand = await read<Array<{ qtyUnits: number }>>("verity.trading.stock_on_hand", {
      productId,
    });
    expect(onHand[0]!.qtyUnits).toBe(200 - 3 - 2 + 5);
  });

  /* --------------------------------- 7. sale -------------------------------- */

  it("7 — takes an order, holds the stock and dispatches it", async () => {
    const order = await ui<{ id: string; state: string }>("verity.trading.create_sales_order", {
      customerId,
      locationId: godownId,
      reference: "SO-8891",
      // Price omitted too — the customer's agreed price applies.
      lines: [{ productId, qtyOrdered: 60 }],
    });
    salesOrderId = order.id;
    expect(order.state).toBe("approved");

    await ui("verity.trading.reserve_for_order", { orderId: salesOrderId });

    const availability = await read<Array<{ productId: string; availableUnits: number }>>(
      "verity.trading.stock_availability",
      { locationId: godownId },
    );
    expect(availability.find((row) => row.productId === productId)!.availableUnits).toBe(140);

    await ui("verity.trading.dispatch_order", { orderId: salesOrderId });
  });

  /* ------------------------------- 8. logistics ----------------------------- */

  // Step 8 was "raises a shipment, assigns a carrier and confirms delivery".
  // Removed with the Logistics module in slice 2 (taskplans/45 §D-01): material
  // leaves a godown through a Goods Issue and through nothing else. The Goods
  // Issue document that replaces dispatch arrives in slice 4, and this journey
  // gains a step for it then.

  /* ------------------------- 9. invoice, bill, payment ---------------------- */

  it("9 — invoices the sale, records the supplier bill and takes the money", async () => {
    const invoice = await ui<{ id: string; invoiceNumber: string; totalPaise: number }>(
      "verity.trading.raise_sales_invoice",
      { salesOrderId },
    );
    invoiceId = invoice.id;
    expect(invoice.invoiceNumber).toMatch(/^SALES\/\d{4}-\d{2}\/0001$/);

    // Configuration was typed as strings; the tax still lands on integers.
    const taxable = 60 * paise(1280);
    expect(invoice.totalPaise).toBe(taxable + Math.round(taxable * 0.09) * 2);

    // Payables, from the Finance screen. The amount is the supplier's figure.
    await ui("verity.trading.raise_purchase_invoice", {
      purchaseOrderId,
      supplierInvoiceTotalPaise: 200 * paise(920),
    });

    const half = Math.floor(invoice.totalPaise / 2);
    await ui("verity.trading.record_payment", {
      invoiceId,
      amountPaise: half,
      method: "bank",
      reference: "UTR-77120",
    });
    const settled = await ui<{ outstandingPaise: number }>("verity.trading.record_payment", {
      invoiceId,
      amountPaise: invoice.totalPaise - half,
      method: "upi",
    });
    expect(settled.outstandingPaise).toBe(0);
  });

  /* --------------------------- 10. the screens agree ------------------------ */

  it("10 — every reporting screen answers, and the ledger balances", async () => {
    const invoiceView = await read<{ lines: Array<{ hsnCode: string }>; interState: boolean }>(
      "verity.trading.invoice_detail",
      { invoiceId },
    );
    // The printable invoice has what a GST invoice legally needs.
    expect(invoiceView.lines[0]!.hsnCode).toBe("44121000");
    expect(invoiceView.interState).toBe(false);

    const ledger = await read<{ balancePaise: number }>("verity.trading.party_ledger", {
      customerId,
    });
    expect(ledger.balancePaise).toBe(0);

    const payable = await read<{ balancePaise: number }>("verity.trading.party_ledger", {
      supplierId,
    });
    // Negative: this business owes the supplier. Debit and credit are named from
    // one point of view throughout, so the sign is the answer.
    expect(payable.balancePaise).toBe(-200 * paise(920));

    const console_ = await read<{
      receivablesPaise: number;
      payablesPaise: number;
      lowStockBoards: number;
    }>("verity.trading.owner_console", {});
    expect(console_.receivablesPaise).toBe(0);
    expect(console_.payablesPaise).toBe(200 * paise(920));

    const margin = await read<{ marginPaise: number; costingMethod: string }>(
      "verity.trading.margin_report",
      { sinceDays: 1 },
    );
    expect(margin.costingMethod).toBe("Weighted average cost");
    expect(margin.marginPaise).toBe(60 * (paise(1280) - paise(920)));
  });

  it("11 — cancels an order and a purchase, releasing what they held", async () => {
    // The two cancellation controls, which had no screen until now.
    const spare = await ui<{ id: string }>("verity.trading.create_sales_order", {
      customerId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 5 }],
    });
    await ui("verity.trading.reserve_for_order", { orderId: spare.id });
    await ui("verity.trading.cancel_sales_order", {
      orderId: spare.id,
      reason: "Customer changed their mind",
    });

    const availability = await read<Array<{ productId: string; reservedUnits: number }>>(
      "verity.trading.stock_availability",
      { locationId: godownId },
    );
    expect(availability.find((row) => row.productId === productId)!.reservedUnits).toBe(0);

    const spareOrder = await ui<{ id: string }>("verity.trading.create_purchase_order", {
      supplierId,
      locationId: godownId,
      lines: [{ productId, qtyOrdered: 10 }],
    });
    await ui("verity.trading.cancel_purchase_order", {
      orderId: spareOrder.id,
      reason: "Supplier cannot supply before the season",
    });
  });

  it("12 — every plywood command is reachable from a screen", async () => {
    // The audit that produced this file, kept as a test so the gap cannot
    // reopen. A command with no screen is a capability nobody can use, and the
    // only honest alternative is to say in writing that it is internal.
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");

    function files(dir: string, acc: string[] = []): string[] {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) files(full, acc);
        else if (/\.tsx?$/.test(full)) acc.push(full);
      }
      return acc;
    }

    // ADR-018: most of this capability's commands moved to the generic
    // `trading/` engine plywood now depends on — scan both directories, and
    // match either capability's key prefix, rather than assuming everything
    // still lives under `verity.plywood.*`.
    const capability = [
      ...files(join(process.cwd(), "src/server/capabilities/plywood")),
      ...files(join(process.cwd(), "src/server/capabilities/trading")),
    ]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const commandKeys = [
      ...new Set(
        [
          ...capability.matchAll(
            /CommandDefinition<[\s\S]*?key: "(verity\.(?:plywood|trading)\.[a-z_]+)"/g,
          ),
        ].map((match) => match[1]!),
      ),
    ];
    // Was "> 30" when the capability still carried five logistics commands.
    // Slice 2 removed them; the floor moves with the module rather than the
    // assertion being deleted, so the check still catches a capability that
    // quietly loses its commands.
    expect(commandKeys.length).toBeGreaterThanOrEqual(30);

    const ui_ = files(join(process.cwd(), "src/app"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const unreachable = commandKeys.filter((key) => !ui_.includes(`"${key}"`));
    expect(unreachable).toEqual([]);
  });
});
