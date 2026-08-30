import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
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
  businessSettings,
  createBrand,
  createCustomer,
  createProduct,
  createPurchaseOrder,
  createSalesOrder,
  createSupplier,
  dispatchOrder,
  raiseSalesInvoice,
  receiveGoods,
  registerGstRegistration,
  registerPlywoodCapability,
  reserveForOrder,
  setBusinessProfile,
  submitPurchaseOrder,
} from "@/server/capabilities/plywood";

/**
 * Plywood business identity — slice 2.
 *
 * Plan: taskplans/45_plywood_workflow_program.md §D-03, §4.4.
 * Closes: PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-09 and P0-10.
 *
 * The specification's §4 asks that the accountant never types the business's
 * own GSTIN onto an invoice again. That is only possible if the business has
 * one, recorded once, in a place invoices read — and if what an invoice
 * recorded stays recorded when the business later renames itself.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "plywood-business-identity.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

/* ------------------------------------------------------------------------ *
 * Logistics is gone — provable without a database.
 * ------------------------------------------------------------------------ */

describe("the Logistics module is absent (P0-10, §D-01)", () => {
  const ROOT = process.cwd();

  function files(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) files(full, acc);
      else if (/\.tsx?$/.test(full)) acc.push(full);
    }
    return acc;
  }

  it("has no shipment or transporter model left in the schema", () => {
    const schema = readFileSync(resolve(ROOT, "prisma/schema.prisma"), "utf8");
    expect(schema).not.toMatch(/model PlywoodShipment/);
    expect(schema).not.toMatch(/model PlywoodTransporter/);
    // And no dangling back-relation, which is how a "removed" model survives.
    expect(schema).not.toMatch(/PlywoodShipment\[\]/);
    expect(schema).not.toMatch(/PlywoodTransporter\[\]/);
  });

  it("has no logistics route, capability module or command", () => {
    const sources = files(resolve(ROOT, "src"))
      .filter((file) => !file.includes(`${"src"}/test/`))
      .map((file) => ({ file, body: readFileSync(file, "utf8") }));

    const offenders = sources.filter(({ body }) =>
      /createShipment|assignCarrier|dispatchShipment|confirmDelivery|trackMaterial|plywood_shipment/.test(body),
    );
    expect(offenders.map((o) => o.file)).toEqual([]);
  });

  it("keeps the Overview free of delivery and in-transit metrics", () => {
    const overview = readFileSync(resolve(ROOT, "src/app/(shell)/overview/page.tsx"), "utf8");
    expect(overview).not.toMatch(/In transit/);
    expect(overview).not.toMatch(/Pending deliveries/);
    // Replaced by the specification's own card (§7).
    expect(overview).toMatch(/Awaiting goods issue/);
  });
});

/* ------------------------------------------------------------------------ *
 * Navigation reads as a business, not as a platform.
 * ------------------------------------------------------------------------ */

describe("navigation speaks the business's language (§8)", () => {
  const index = readFileSync(
    resolve(process.cwd(), "src/server/capabilities/plywood/index.ts"),
    "utf8",
  );

  it("groups by Trade, Inventory and Money rather than by Capabilities", () => {
    expect(index).toMatch(/group: "Trade"/);
    expect(index).toMatch(/group: "Inventory"/);
    expect(index).toMatch(/group: "Money"/);
    // A client reading "Capabilities" is the foundation leaking into the
    // product. Nothing plywood contributes may sit under it.
    expect(index).not.toMatch(/group: "Capabilities"/);
  });

  it("no longer offers a Logistics destination", () => {
    expect(index).not.toMatch(/href: "\/logistics"/);
  });

  it("draws the group headings instead of only announcing them", () => {
    const chrome = readFileSync(
      resolve(process.cwd(), "src/components/shell/ShellChrome.tsx"),
      "utf8",
    );
    // A sighted user was being given strictly less structure than a
    // screen-reader user, which is a strange way round.
    expect(chrome).toMatch(/area\.items\.length > 1/);
    expect(chrome).toMatch(/uppercase tracking/);
  });
});

/* ------------------------------------------------------------------------ *
 * The identity itself.
 * ------------------------------------------------------------------------ */

describeDb("plywood business identity (slice 2)", () => {
  const tenantId = randomUUID();
  let organizationId: string;
  let owner: ActorContext;
  let godownId: string;
  let brandId: string;
  let supplierId: string;

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
        data: { id: tenantId, name: "Identity Test Plywood", timeZone: "Asia/Kolkata" },
      });
      await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      await activateCapability(tx, tenantId, ASSET_CAPABILITY);
      await activateCapability(tx, tenantId, EVIDENCE_CAPABILITY);
      await activateCapability(tx, tenantId, PLYWOOD_CAPABILITY);

      // Rates still come from configuration until slice 6 replaces them with
      // effective-dated HSN rules. The STATE CODE deliberately does not.
      await setConfig(tx, tenantId, CONFIG_CGST_RATE_BP, 900, "Tenant");
      await setConfig(tx, tenantId, CONFIG_SGST_RATE_BP, 900, "Tenant");
      await setConfig(tx, tenantId, CONFIG_IGST_RATE_BP, 1800, "Tenant");

      organizationId = (await tx.organization.create({ data: { tenantId, name: "HQ" } })).id;
      godownId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Okhla" } })
      ).id;

      const ownerRole = await tx.role.create({ data: { tenantId, name: "Owner" }, select: { id: true } });
      const everything = [
        ENTITY_BRAND, ENTITY_PRODUCT, ENTITY_GODOWN_RACK, ENTITY_STOCK_LEDGER,
        ENTITY_STOCK_BALANCE, ENTITY_SUPPLIER, ENTITY_SUPPLIER_PRICE, ENTITY_CUSTOMER,
        ENTITY_CUSTOMER_PRICE, ENTITY_PURCHASE_ORDER, ENTITY_SALES_ORDER, ENTITY_RESERVATION,
        ENTITY_INVOICE, ENTITY_PAYMENT, ENTITY_LEDGER_ENTRY,
        ENTITY_BUSINESS_PROFILE, ENTITY_GST_REGISTRATION,
      ];
      await tx.permission.createMany({
        data: everything.flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId, roleId: ownerRole.id, verb, entity, scope: "Tenant" as const,
          })),
        ),
      });

      const identity = await provisionIdentity(tx, {
        organizationId, authUserId: randomUUID(), displayName: "Proprietor",
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

    brandId = (await executeCommand(owner, createBrand, { name: `Century ${randomUUID().slice(0, 6)}` })).id;
    supplierId = (
      await executeCommand(owner, createSupplier, {
        displayName: `Mill ${randomUUID().slice(0, 6)}`,
        stateCode: "07",
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

  it("starts with an onboarding checklist rather than an empty screen", async () => {
    const settings = await executeQuery(owner, businessSettings, {});

    // The specification's §3: do not drop a new client into an empty Overview.
    // "Not ready" with no reason is the least useful thing a setup screen can
    // say, so the outstanding steps are named.
    expect(settings.outstanding).toEqual(["Business details", "Tax details"]);
    expect(settings.legalName).toBeNull();
    expect(settings.gstin).toBeNull();
    // Sensible defaults for India, stated rather than assumed downstream.
    expect(settings.financialYearStartMonth).toBe(4);
    expect(settings.currencyCode).toBe("INR");
  });

  it("records the business's legal identity once", async () => {
    await executeCommand(owner, setBusinessProfile, {
      legalName: "Naksh Plywood Private Limited",
      tradeName: "Naksh Plywood",
      pan: "AAACN1234K",
      registeredAddress: "12 Timber Market, Kirti Nagar, Delhi",
    });

    const settings = await executeQuery(owner, businessSettings, {});
    expect(settings.legalName).toBe("Naksh Plywood Private Limited");
    expect(settings.tradeName).toBe("Naksh Plywood");
    expect(settings.outstanding).toEqual(["Tax details"]);
  });

  it("refuses a PAN that is not shaped like one", async () => {
    await expect(
      executeCommand(owner, setBusinessProfile, {
        legalName: "Naksh Plywood Private Limited",
        pan: "9810012345",
      }),
    ).rejects.toThrow(/E_VALIDATION/);
  });

  it("takes the registered state from the GSTIN instead of asking for it", async () => {
    const registration = await executeCommand(owner, registerGstRegistration, {
      gstin: "07AAACN1234K1Z5",
      invoiceSeriesPrefix: "NK/",
    });

    // A state code asked for separately is a field that can disagree with the
    // number it came from — and that disagreement decides CGST+SGST against
    // IGST on every invoice the business ever raises.
    expect(registration.stateCode).toBe("07");

    const settings = await executeQuery(owner, businessSettings, {});
    expect(settings.gstin).toBe("07AAACN1234K1Z5");
    expect(settings.invoiceSeriesPrefix).toBe("NK/");
    expect(settings.outstanding).toEqual([]);
  });

  it("refuses a malformed GSTIN", async () => {
    await expect(
      executeCommand(owner, registerGstRegistration, {
        gstin: "07AAACN1234K",
        invoiceSeriesPrefix: "X/",
      }),
    ).rejects.toThrow(/E_VALIDATION/);
  });

  it("refuses a second active registration, because one is a product decision", async () => {
    await expect(
      executeCommand(owner, registerGstRegistration, {
        gstin: "09AAACN1234K1Z3",
        invoiceSeriesPrefix: "UP/",
      }),
    ).rejects.toThrow(/already has an active GST registration/);
  });

  it("snapshots the seller's identity onto an invoice, and does not restate it later", async () => {
    // A board, bought, sold, issued and invoiced.
    const product = await executeCommand(owner, createProduct, {
      brandId,
      name: `Board ${randomUUID().slice(0, 8)}`,
      hsnCode: "44121000",
      thicknessTenthMm: 180,
      widthMm: 2440,
      heightMm: 1220,
      grade: "BWR",
    });
    const po = await executeCommand(owner, createPurchaseOrder, {
      supplierId, locationId: godownId,
      lines: [{ productId: product.id, qtyOrdered: 20, unitCostPaise: 100_000 }],
    });
    await executeCommand(owner, submitPurchaseOrder, { orderId: po.id });
    await executeCommand(owner, receiveGoods, {
      orderId: po.id,
      lines: [{ productId: product.id, qtyReceived: 20 }],
    });

    const customer = await executeCommand(owner, createCustomer, {
      displayName: "Gupta Timber",
      stateCode: "07",
      creditLimitPaise: 10_000_000,
    });
    const so = await executeCommand(owner, createSalesOrder, {
      customerId: customer.id, locationId: godownId,
      lines: [{ productId: product.id, qtyOrdered: 10, unitPricePaise: 150_000 }],
    });
    await executeCommand(owner, reserveForOrder, { orderId: so.id });
    await executeCommand(owner, dispatchOrder, { orderId: so.id });
    const invoice = await executeCommand(owner, raiseSalesInvoice, { salesOrderId: so.id });

    const stored = await withTenant(tenantId, (tx) =>
      tx.plywoodInvoice.findUniqueOrThrow({ where: { id: invoice.id } }),
    );
    expect(stored.sellerGstinSnapshot).toBe("07AAACN1234K1Z5");
    expect(stored.sellerLegalNameSnapshot).toBe("Naksh Plywood Private Limited");
    // Both parties in Delhi: CGST + SGST, no IGST.
    expect(stored.igstPaise).toBe(0);
    expect(stored.cgstPaise).toBeGreaterThan(0);

    // The business renames itself. The invoice it already gave a customer and
    // reported to the portal must not change (P0-09).
    await executeCommand(owner, setBusinessProfile, {
      legalName: "Naksh Boards and Plywood Private Limited",
    });
    const after = await withTenant(tenantId, (tx) =>
      tx.plywoodInvoice.findUniqueOrThrow({ where: { id: invoice.id } }),
    );
    expect(after.sellerLegalNameSnapshot).toBe("Naksh Plywood Private Limited");
  });

  it("refuses to invoice a customer whose state is unknown, rather than assuming it is local", async () => {
    const product = await executeCommand(owner, createProduct, {
      brandId,
      name: `Board ${randomUUID().slice(0, 8)}`,
      hsnCode: "44121000",
      thicknessTenthMm: 120,
      widthMm: 2440,
      heightMm: 1220,
      grade: "MR",
    });
    const po = await executeCommand(owner, createPurchaseOrder, {
      supplierId, locationId: godownId,
      lines: [{ productId: product.id, qtyOrdered: 20, unitCostPaise: 100_000 }],
    });
    await executeCommand(owner, submitPurchaseOrder, { orderId: po.id });
    await executeCommand(owner, receiveGoods, {
      orderId: po.id,
      lines: [{ productId: product.id, qtyReceived: 20 }],
    });

    // No state code: an out-of-town dealer someone entered in a hurry.
    const customer = await executeCommand(owner, createCustomer, {
      displayName: "Unknown State Traders",
      creditLimitPaise: 10_000_000,
    });
    const so = await executeCommand(owner, createSalesOrder, {
      customerId: customer.id, locationId: godownId,
      lines: [{ productId: product.id, qtyOrdered: 5, unitPricePaise: 150_000 }],
    });
    await executeCommand(owner, reserveForOrder, { orderId: so.id });
    await executeCommand(owner, dispatchOrder, { orderId: so.id });

    // THE DEFECT (rule freeze §4.4): the old code fell back to the business's
    // own state, which silently taxes an interstate supply as if it were
    // local — the wrong tax, the wrong return, and it looks right on screen.
    await expect(
      executeCommand(owner, raiseSalesInvoice, { salesOrderId: so.id }),
    ).rejects.toThrow(/no state code/);
  });
});
