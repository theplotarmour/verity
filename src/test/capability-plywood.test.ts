import { TRADING_CAPABILITY } from "@/server/capabilities/trading";
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
  ENTITY_GODOWN_RACK,
  ENTITY_PRODUCT,
  PLYWOOD_CAPABILITY,
  createBrand,
  createProduct,
  defineGodownRack,
  editProduct,
  listCatalogue,
  listGodownRacks,
  registerPlywoodCapability,
  setBrandActive,
  setGodownRackActive,
  setProductActive,
} from "@/server/capabilities/plywood";

/**
 * CAPABILITY: Plywood trading — stage 1, the catalogue and the floor.
 *
 * Requirement source: plywood.md §1.1 (product master) and §1.7 (multiple
 * godowns with rack-level tracking). Build sequence:
 * implementation/plywood-gap-analysis.md §6.
 *
 * What this asserts is the part of the domain that later stages will reference
 * and must be able to trust: that a board's identity is exact, that a wrong HSN
 * cannot be saved, that a size cannot be quietly restated after the fact, and
 * that none of it is visible from another tenant.
 *
 * Nothing here exercises stock, costing, invoicing or tax. Those are gated on
 * decisions P1..P6 and are deliberately absent rather than stubbed.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-plywood.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

// Each command is a transaction against a pooled remote database. That is
// latency, not slow code, and the default five-second timeout measures the
// network rather than the capability.
vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

describeDb("capability: Plywood trading — catalogue and godowns", () => {
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();

  let organizationId: string;
  let owner: ActorContext;
  let clerk: ActorContext;
  let godownAId: string;
  let godownBId: string;
  let centuryId: string;

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
        data: { id: tenantId, name: "Test Plywood Distributors", timeZone: "Asia/Kolkata" },
      });
      // Plywood declares Location, Asset and Evidence: a godown IS a Location,
      // a delivery vehicle IS an Asset, an LR scan IS Evidence. The database
      // refuses the activation without all three, which is the dependency graph
      // doing its job rather than a test detail.
      await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      await activateCapability(tx, tenantId, ASSET_CAPABILITY);
      await activateCapability(tx, tenantId, EVIDENCE_CAPABILITY);
      await activateCapability(tx, tenantId, TRADING_CAPABILITY);
      await activateCapability(tx, tenantId, PLYWOOD_CAPABILITY);

      organizationId = (
        await tx.organization.create({ data: { tenantId, name: "Central HQ" } })
      ).id;

      // Godowns are Locations. The capability adds racks inside them and nothing
      // else — this is the reuse the gap analysis claimed, exercised rather than
      // asserted on paper.
      godownAId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Godown A — Okhla" } })
      ).id;
      godownBId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Godown B — Noida" } })
      ).id;

      const ownerRole = await tx.role.create({
        data: { tenantId, name: "Owner" },
        select: { id: true },
      });
      const clerkRole = await tx.role.create({
        data: { tenantId, name: "Warehouse Clerk" },
        select: { id: true },
      });

      await tx.permission.createMany({
        data: [ENTITY_BRAND, ENTITY_PRODUCT, ENTITY_GODOWN_RACK].flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId,
            roleId: ownerRole.id,
            verb,
            entity,
            scope: "Tenant" as const,
          })),
        ),
      });

      // A warehouse clerk reads the catalogue and lays out racks. They do not
      // price or define products — which is what makes the refusal below a real
      // boundary rather than a decorative one.
      await tx.permission.createMany({
        data: [
          { tenantId, roleId: clerkRole.id, verb: "Read", entity: ENTITY_BRAND, scope: "Tenant" },
          { tenantId, roleId: clerkRole.id, verb: "Read", entity: ENTITY_PRODUCT, scope: "Tenant" },
          { tenantId, roleId: clerkRole.id, verb: "Read", entity: ENTITY_GODOWN_RACK, scope: "Tenant" },
          { tenantId, roleId: clerkRole.id, verb: "Create", entity: ENTITY_GODOWN_RACK, scope: "Tenant" },
          { tenantId, roleId: clerkRole.id, verb: "Edit", entity: ENTITY_GODOWN_RACK, scope: "Tenant" },
        ],
      });

      const ownerIdentity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Proprietor",
      });
      const clerkIdentity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Godown clerk",
      });
      await tx.tenantMembership.update({
        where: { id: ownerIdentity.membershipId },
        data: { roleId: ownerRole.id },
      });
      await tx.tenantMembership.update({
        where: { id: clerkIdentity.membershipId },
        data: { roleId: clerkRole.id },
      });

      owner = {
        tenantId,
        userId: ownerIdentity.userId,
        membershipId: ownerIdentity.membershipId,
        organizationId,
        roleId: ownerRole.id,
      };
      clerk = {
        tenantId,
        userId: clerkIdentity.userId,
        membershipId: clerkIdentity.membershipId,
        organizationId,
        roleId: clerkRole.id,
      };
    });

    await withTenant(otherTenantId, async (tx) => {
      await tx.tenant.create({ data: { id: otherTenantId, name: "A Rival Trader" } });
    });

    invalidateCapabilityCache();

    // The catalogue is built through commands. A fixture that seeds by direct
    // insert would prove the pipeline works for data the pipeline never touched.
    centuryId = (await executeCommand(owner, createBrand, { name: "Century Ply" })).id;
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

  /* ------------------------------- the catalogue ---------------------------- */

  it("defines a board by brand, grade and exact size", async () => {
    const product = await executeCommand(owner, createProduct, {
      brandId: centuryId,
      name: "Sainik MR 710",
      hsnCode: "44121000",
      thicknessTenthMm: 180,
      widthTenth: 24400,
      heightTenth: 12200,
      grade: "MR",
      sheetWeightGrams: 28_000,
      reorderLevelUnits: 40,
    });

    const catalogue = await executeQuery(owner, listCatalogue, { brandId: centuryId });
    const listed = catalogue[0]!.products.find((p) => p.id === product.id)!;

    // 18.0 mm as 180 tenths, and a 2440 x 1220 mm sheet as tenths of a
    // millimetre. Exact integers, because a board's size is an exact fact.
    expect(listed.thicknessTenthMm).toBe(180);
    expect(listed.sizeUnit).toBe("MM");
    expect(listed.widthTenth).toBe(24400);
    expect(listed.heightTenth).toBe(12200);
    expect(listed.hsnCode).toBe("44121000");
    expect(listed.unitLabel).toBe("sheets");
  });

  it("refuses an HSN code that is not 4, 6 or 8 digits", async () => {
    // Required on a GST tax invoice. A malformed one is not caught until a
    // filing is rejected, which is far too late to be a validation problem.
    await expect(
      executeCommand(owner, createProduct, {
        brandId: centuryId,
        name: "Bad HSN board",
        hsnCode: "441",
        thicknessTenthMm: 120,
      widthTenth: 24400,
        heightTenth: 12200,
        grade: "MR",
      }),
    ).rejects.toThrow(/HSN|E_VALIDATION/);

    await expect(
      executeCommand(owner, createProduct, {
        brandId: centuryId,
        name: "Also bad HSN board",
        hsnCode: "4412100X",
        thicknessTenthMm: 120,
      widthTenth: 24400,
        heightTenth: 12200,
        grade: "MR",
      }),
    ).rejects.toThrow(/HSN|E_VALIDATION/);
  });

  it("refuses a board with an impossible dimension", async () => {
    await expect(
      executeCommand(owner, createProduct, {
        brandId: centuryId,
        name: "Zero-thickness board",
        hsnCode: "4412",
        thicknessTenthMm: 0,
      widthTenth: 24400,
        heightTenth: 12200,
        grade: "MR",
      }),
    ).rejects.toThrow();
  });

  it("refuses a second brand with the same name", async () => {
    await expect(executeCommand(owner, createBrand, { name: "Century Ply" })).rejects.toThrow(
      /already exists/,
    );
  });

  it("refuses to add a product to a deactivated brand", async () => {
    const retired = (await executeCommand(owner, createBrand, { name: "Discontinued Boards" })).id;
    await executeCommand(owner, setBrandActive, { brandId: retired, active: false });

    await expect(
      executeCommand(owner, createProduct, {
        brandId: retired,
        name: "Orphan board",
        hsnCode: "4412",
        thicknessTenthMm: 120,
      widthTenth: 24400,
        heightTenth: 12200,
        grade: "MR",
      }),
    ).rejects.toThrow(/deactivated brand/);
  });

  it("records what an HSN code was before it was corrected", async () => {
    const product = await executeCommand(owner, createProduct, {
      brandId: centuryId,
      name: "Club Prime BWR",
      hsnCode: "4412",
      thicknessTenthMm: 190,
      widthTenth: 24400,
      heightTenth: 12200,
      grade: "BWR",
    });

    await executeCommand(owner, editProduct, { productId: product.id, hsnCode: "441231" });

    // A tax fact that changed is asked about after a filing, and "it changed"
    // is not an answer. The activity row has to carry the old value.
    const change = await withTenant(tenantId, (tx) =>
      tx.activity.findFirst({
        where: { entityKey: ENTITY_PRODUCT, entityId: product.id, fieldChanged: "hsnCode" },
        orderBy: { occurredAt: "desc" },
      }),
    );
    expect(change).not.toBeNull();
    expect(change!.oldValue).toBe("4412");
    expect(change!.newValue).toBe("441231");
  });

  it("cannot restate a board's dimensions through the edit command", async () => {
    // An 18 mm board and a 12 mm board are two products, not one product with a
    // corrected field. Editing the size in place would silently restate every
    // movement and invoice line that ever referenced it, which is the same
    // reasoning that makes the ledgers append-only.
    const product = await executeCommand(owner, createProduct, {
      brandId: centuryId,
      name: "Fixed-size board",
      hsnCode: "4412",
      thicknessTenthMm: 250,
      widthTenth: 24400,
      heightTenth: 12200,
      grade: "BWR",
    });

    await executeCommand(owner, editProduct, {
      productId: product.id,
      name: "Fixed-size board, renamed",
      // Not part of the command's input. Passed here on purpose: the assertion
      // is that offering it changes nothing, so a caller cannot smuggle a
      // dimension edit through a command that does not accept one.
      ...({ thicknessTenthMm: 60, widthTenth: 999 } as Record<string, number>),
    } as Parameters<typeof editProduct.handler>[1]);

    const after = await withTenant(tenantId, (tx) =>
      tx.tradingProduct.findUniqueOrThrow({
        where: { id: product.id },
        include: { plywoodDetail: true },
      }),
    );
    expect(after.name).toBe("Fixed-size board, renamed");
    expect(after.plywoodDetail?.thicknessTenthMm).toBe(250);
    expect(after.plywoodDetail?.widthTenth).toBe(24400);
  });

  it("hides a deactivated product from the catalogue but keeps it retrievable", async () => {
    const product = await executeCommand(owner, createProduct, {
      brandId: centuryId,
      name: "Withdrawn line",
      hsnCode: "4412",
      thicknessTenthMm: 90,
      widthTenth: 24400,
      heightTenth: 12200,
      grade: "MR",
    });
    await executeCommand(owner, setProductActive, { productId: product.id, active: false });

    const active = await executeQuery(owner, listCatalogue, { brandId: centuryId });
    expect(active[0]!.products.map((p) => p.id)).not.toContain(product.id);

    // Deactivated, never deleted: past movements and invoices still reference it.
    const all = await executeQuery(owner, listCatalogue, {
      brandId: centuryId,
      includeInactive: true,
    });
    expect(all[0]!.products.map((p) => p.id)).toContain(product.id);
  });

  /* --------------------------------- godowns -------------------------------- */

  it("lays out racks inside a godown that is an ordinary Location", async () => {
    await executeCommand(clerk, defineGodownRack, { locationId: godownAId, rackLabel: "A-01" });
    await executeCommand(clerk, defineGodownRack, { locationId: godownAId, rackLabel: "A-02" });
    await executeCommand(clerk, defineGodownRack, { locationId: godownBId, rackLabel: "B-01" });

    const layout = await executeQuery(clerk, listGodownRacks, {});
    const godownA = layout.find((g) => g.locationId === godownAId)!;

    expect(godownA.locationName).toBe("Godown A — Okhla");
    expect(godownA.racks.map((r) => r.rackLabel)).toEqual(["A-01", "A-02"]);
    expect(layout.find((g) => g.locationId === godownBId)!.racks).toHaveLength(1);
  });

  it("refuses a duplicate rack label within one godown, and allows it across two", async () => {
    await expect(
      executeCommand(clerk, defineGodownRack, { locationId: godownAId, rackLabel: "A-01" }),
    ).rejects.toThrow(/already exists/);

    // "A-01" in the Noida godown is a different physical rack. Uniqueness is
    // per godown, not per tenant.
    const elsewhere = await executeCommand(clerk, defineGodownRack, {
      locationId: godownBId,
      rackLabel: "A-01",
    });
    expect(elsewhere.id).toBeTruthy();
  });

  it("refuses a rack in a godown that does not belong to this tenant", async () => {
    await expect(
      executeCommand(clerk, defineGodownRack, {
        locationId: randomUUID(),
        rackLabel: "GHOST-01",
      }),
    ).rejects.toThrow(/godown not found/);
  });

  it("retires a rack without deleting where stock once sat", async () => {
    const rack = await executeCommand(clerk, defineGodownRack, {
      locationId: godownBId,
      rackLabel: "B-99",
    });
    await executeCommand(clerk, setGodownRackActive, { rackId: rack.id, active: false });

    const active = await executeQuery(clerk, listGodownRacks, { locationId: godownBId });
    expect(active[0]!.racks.map((r) => r.id)).not.toContain(rack.id);

    const all = await executeQuery(clerk, listGodownRacks, {
      locationId: godownBId,
      includeInactive: true,
    });
    expect(all[0]!.racks.map((r) => r.id)).toContain(rack.id);
  });

  /* ------------------------------ the boundaries ---------------------------- */

  it("refuses to let a warehouse clerk define a product", async () => {
    await expect(
      executeCommand(clerk, createProduct, {
        brandId: centuryId,
        name: "Clerk's own board",
        hsnCode: "4412",
        thicknessTenthMm: 120,
      widthTenth: 24400,
        heightTenth: 12200,
        grade: "MR",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("shows another tenant nothing of this one's catalogue or godowns (INV-001)", async () => {
    const seen = await withTenant(otherTenantId, async (tx) => ({
      brands: await tx.tradingBrand.count(),
      products: await tx.tradingProduct.count(),
      racks: await tx.godownRack.count(),
    }));
    expect(seen).toEqual({ brands: 0, products: 0, racks: 0 });
  });

  it("writes nothing when no tenant scope is set (fail closed)", async () => {
    // Not "returns an empty list under a different tenant" — the harder case is
    // no scope at all, where the policy must refuse rather than default to
    // something. INV-001 fails closed or it does not hold.
    await expect(
      prisma.tradingBrand.create({ data: { tenantId, name: "Unscoped write" } }),
    ).rejects.toThrow();

    expect(await prisma.tradingBrand.count()).toBe(0);
  });
});
