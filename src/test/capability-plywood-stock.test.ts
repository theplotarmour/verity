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
  ENTITY_STOCK_BALANCE,
  ENTITY_STOCK_LEDGER,
  PLYWOOD_CAPABILITY,
  adjustStock,
  blendAverageCost,
  createBrand,
  createProduct,
  issueStock,
  lowStock,
  productMovements,
  receiveStock,
  recordDamagedStock,
  recordReturnedStock,
  registerPlywoodCapability,
  setProductActive,
  stockOnHand,
  transferStock,
} from "@/server/capabilities/plywood";

/**
 * CAPABILITY: Plywood trading — stage 2, the stock ledger.
 *
 * Requirement source: plywood.md §1.1. Decision P1 (weighted average cost) is
 * recorded in implementation/plywood-decisions.md.
 *
 * The assertions that matter are the ones about money and truth: that an average
 * blends correctly, that a sale's cost is frozen at the moment it happened, that
 * a transfer neither creates nor destroys value, that stock cannot go negative,
 * that the ledger cannot be rewritten, and that the maintained balance still
 * equals a replay of the movements that produced it.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-plywood-stock.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

describe("plywood: weighted average cost (P1)", () => {
  // A pure function, so the arithmetic is provable without a database.
  it("blends an inward movement into the running average", () => {
    // 100 sheets at ₹1,000 plus 100 at ₹1,200 averages ₹1,100.
    expect(
      blendAverageCost({
        onHandUnits: 100,
        avgUnitCostPaise: 100_000,
        inwardUnits: 100,
        inwardUnitCostPaise: 120_000,
      }),
    ).toBe(110_000);
  });

  it("takes the incoming cost when the godown was empty", () => {
    expect(
      blendAverageCost({
        onHandUnits: 0,
        avgUnitCostPaise: 0,
        inwardUnits: 40,
        inwardUnitCostPaise: 87_500,
      }),
    ).toBe(87_500);
  });

  it("rounds to whole paise rather than carrying a fraction", () => {
    // 1 at 100 plus 2 at 101 is 100.666…, which must land on a paise.
    expect(
      blendAverageCost({
        onHandUnits: 1,
        avgUnitCostPaise: 100,
        inwardUnits: 2,
        inwardUnitCostPaise: 101,
      }),
    ).toBe(101);
  });
});

describeDb("capability: Plywood trading — stock", () => {
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();

  let organizationId: string;
  let owner: ActorContext;
  let clerk: ActorContext;
  let okhlaId: string;
  let noidaId: string;
  let brandId: string;

  /** A board nobody else touches, so each test's arithmetic stands alone. */
  async function freshBoard(reorderLevelUnits = 0): Promise<string> {
    const product = await executeCommand(owner, createProduct, {
      brandId,
      name: `Board ${randomUUID().slice(0, 8)}`,
      hsnCode: "44121000",
      thicknessTenthMm: 180,
      widthTenth: 24400,
      heightTenth: 12200,
      grade: "BWR",
      reorderLevelUnits,
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
        data: { id: tenantId, name: "Stock Test Traders", timeZone: "Asia/Kolkata" },
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

      organizationId = (await tx.organization.create({ data: { tenantId, name: "HQ" } })).id;
      okhlaId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Okhla" } })
      ).id;
      noidaId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Noida" } })
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
        data: [
          ENTITY_BRAND,
          ENTITY_PRODUCT,
          ENTITY_GODOWN_RACK,
          ENTITY_STOCK_LEDGER,
          ENTITY_STOCK_BALANCE,
        ].flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId,
            roleId: ownerRole.id,
            verb,
            entity,
            scope: "Tenant" as const,
          })),
        ),
      });

      // A clerk receives, issues and transfers. They do not adjust — an
      // adjustment is someone asserting the system is wrong, and that is the
      // owner's call. This is why adjustment rides ActionExecute rather than
      // Create.
      await tx.permission.createMany({
        data: [
          { tenantId, roleId: clerkRole.id, verb: "Read", entity: ENTITY_PRODUCT, scope: "Tenant" },
          { tenantId, roleId: clerkRole.id, verb: "Read", entity: ENTITY_STOCK_LEDGER, scope: "Tenant" },
          { tenantId, roleId: clerkRole.id, verb: "Create", entity: ENTITY_STOCK_LEDGER, scope: "Tenant" },
          { tenantId, roleId: clerkRole.id, verb: "Read", entity: ENTITY_STOCK_BALANCE, scope: "Tenant" },
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
        displayName: "Clerk",
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
      await tx.tenant.create({ data: { id: otherTenantId, name: "Rival Traders" } });
    });

    invalidateCapabilityCache();
    brandId = (await executeCommand(owner, createBrand, { name: "Century Ply" })).id;
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

  /* ------------------------------- receiving -------------------------------- */

  it("brings stock in at the price paid, and blends the second lot", async () => {
    const productId = await freshBoard();

    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 100,
      unitCostPaise: 100_000,
    });
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 100,
      unitCostPaise: 120_000,
    });

    const [balance] = await executeQuery(clerk, stockOnHand, { productId });
    expect(balance!.qtyUnits).toBe(200);
    expect(balance!.avgUnitCostPaise).toBe(110_000);
    expect(balance!.valuePaise).toBe(200 * 110_000);
  });

  /* -------------------------------- issuing --------------------------------- */

  it("consumes at the standing average and freezes that cost on the movement", async () => {
    const productId = await freshBoard();
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 10,
      unitCostPaise: 50_000,
    });

    const issued = await executeCommand(clerk, issueStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 4,
    });
    expect(issued.unitCostPaise).toBe(50_000);

    // A later, dearer purchase moves the average — and must NOT move what the
    // earlier sale cost. Margin on a past sale is a stored fact, not a figure
    // that later buying decisions rewrite.
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 6,
      unitCostPaise: 90_000,
    });

    const movements = await executeQuery(clerk, productMovements, { productId });
    const sale = movements.find((movement) => movement.kind === "sales_outward")!;
    expect(sale.unitCostPaise).toBe(50_000);
    expect(sale.qtyDeltaUnits).toBe(-4);
  });

  it("refuses to issue more than the godown holds", async () => {
    const productId = await freshBoard();
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 5,
      unitCostPaise: 10_000,
    });

    await expect(
      executeCommand(clerk, issueStock, { productId, locationId: okhlaId, qtyUnits: 6 }),
    ).rejects.toThrow(/only 5 in this godown/);

    // And the refusal left nothing behind.
    const [balance] = await executeQuery(clerk, stockOnHand, { productId });
    expect(balance!.qtyUnits).toBe(5);
  });

  it("does not let one godown's stock satisfy another godown's issue", async () => {
    const productId = await freshBoard();
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 20,
      unitCostPaise: 10_000,
    });

    await expect(
      executeCommand(clerk, issueStock, { productId, locationId: noidaId, qtyUnits: 1 }),
    ).rejects.toThrow(/only 0 in this godown/);
  });

  /* ------------------------------- transfers -------------------------------- */

  it("moves cost with the stock, creating and destroying no value", async () => {
    const productId = await freshBoard();
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 100,
      unitCostPaise: 75_000,
    });

    const before = (await executeQuery(clerk, stockOnHand, { productId })).reduce(
      (sum, row) => sum + row.valuePaise,
      0,
    );

    await executeCommand(clerk, transferStock, {
      productId,
      fromLocationId: okhlaId,
      toLocationId: noidaId,
      qtyUnits: 40,
    });

    const after = await executeQuery(clerk, stockOnHand, { productId });
    const okhla = after.find((row) => row.locationId === okhlaId)!;
    const noida = after.find((row) => row.locationId === noidaId)!;

    expect(okhla.qtyUnits).toBe(60);
    expect(noida.qtyUnits).toBe(40);
    // The receiving godown carries it at what the sending godown carried it at.
    expect(noida.avgUnitCostPaise).toBe(75_000);
    expect(after.reduce((sum, row) => sum + row.valuePaise, 0)).toBe(before);
  });

  it("refuses a transfer to the same godown", async () => {
    const productId = await freshBoard();
    await expect(
      executeCommand(clerk, transferStock, {
        productId,
        fromLocationId: okhlaId,
        toLocationId: okhlaId,
        qtyUnits: 1,
      }),
    ).rejects.toThrow(/two different godowns/);
  });

  /* ------------------------- adjustments and losses ------------------------- */

  it("records what the count was before an adjustment corrected it", async () => {
    const productId = await freshBoard();
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 50,
      unitCostPaise: 20_000,
    });

    await executeCommand(owner, adjustStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 3,
      direction: "out",
      reason: "Physical count on 28 August found three short",
    });

    const [balance] = await executeQuery(owner, stockOnHand, { productId });
    expect(balance!.qtyUnits).toBe(47);

    const change = await withTenant(tenantId, (tx) =>
      tx.activity.findFirst({
        where: { entityKey: ENTITY_STOCK_BALANCE, fieldChanged: "qtyUnits", newValue: "47" },
        orderBy: { occurredAt: "desc" },
      }),
    );
    expect(change?.oldValue).toBe("50");
  });

  it("refuses an adjustment with no reason worth reading", async () => {
    const productId = await freshBoard();
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 10,
      unitCostPaise: 1_000,
    });

    await expect(
      executeCommand(owner, adjustStock, {
        productId,
        locationId: okhlaId,
        qtyUnits: 1,
        direction: "out",
        reason: "x",
      }),
    ).rejects.toThrow();
  });

  it("refuses to let a warehouse clerk adjust stock", async () => {
    const productId = await freshBoard();
    await expect(
      executeCommand(clerk, adjustStock, {
        productId,
        locationId: okhlaId,
        qtyUnits: 1,
        direction: "in",
        reason: "Clerk's own correction",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("takes damaged sheets out and brings returned sheets back at cost, not at sale price", async () => {
    const productId = await freshBoard();
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 20,
      unitCostPaise: 60_000,
    });

    await executeCommand(owner, recordDamagedStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 2,
      reason: "Water damage in the corner stack",
    });
    await executeCommand(owner, recordReturnedStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 5,
      reason: "Customer returned five sheets, unopened",
    });

    const [balance] = await executeQuery(owner, stockOnHand, { productId });
    expect(balance!.qtyUnits).toBe(23);
    // A return is not a purchase. Re-entering at a sale price would book a
    // profit on stock coming back through the door.
    expect(balance!.avgUnitCostPaise).toBe(60_000);
  });

  /* --------------------------- the ledger's promises ------------------------ */

  it("refuses to rewrite a movement, whatever the caller intends", async () => {
    const productId = await freshBoard();
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 7,
      unitCostPaise: 30_000,
    });

    // Not through a command — through the client, which is where a later
    // refactor would reach for it. The trigger is what makes append-only a
    // property rather than a convention.
    await expect(
      withTenant(tenantId, (tx) =>
        tx.$executeRaw`UPDATE stock_ledger_entry SET qty_delta_units = 999 WHERE product_id = ${productId}::uuid`,
      ),
    ).rejects.toThrow(/append-only/);

    await expect(
      withTenant(tenantId, (tx) =>
        tx.$executeRaw`DELETE FROM stock_ledger_entry WHERE product_id = ${productId}::uuid`,
      ),
    ).rejects.toThrow(/append-only/);
  });

  it("keeps the maintained balance equal to a replay of the ledger", async () => {
    // The invariant that makes it safe to store a derived figure at all. If this
    // ever fails, the balance has drifted from the truth it summarises and every
    // valuation on it is wrong.
    const productId = await freshBoard();
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 30,
      unitCostPaise: 40_000,
    });
    await executeCommand(clerk, issueStock, { productId, locationId: okhlaId, qtyUnits: 11 });
    await executeCommand(clerk, transferStock, {
      productId,
      fromLocationId: okhlaId,
      toLocationId: noidaId,
      qtyUnits: 9,
    });
    await executeCommand(owner, adjustStock, {
      productId,
      locationId: noidaId,
      qtyUnits: 2,
      direction: "in",
      reason: "Two sheets found behind the rack",
    });

    const drift = await withTenant(tenantId, (tx) =>
      tx.$queryRaw<{ product_id: string; location_id: string; balance: number; replayed: bigint }[]>`
        SELECT b.product_id, b.location_id, b.qty_units AS balance,
               COALESCE(SUM(e.qty_delta_units), 0)::bigint AS replayed
          FROM stock_balance b
          LEFT JOIN stock_ledger_entry e
            ON e.product_id = b.product_id AND e.location_id = b.location_id
         GROUP BY b.product_id, b.location_id, b.qty_units
        HAVING b.qty_units <> COALESCE(SUM(e.qty_delta_units), 0)`,
    );
    expect(drift).toEqual([]);
  });

  /* ------------------------------- low stock -------------------------------- */

  it("counts a board's stock across every godown before calling it short", async () => {
    // Short in one godown and plentiful in another is a transfer, not a
    // purchase order — so the reorder test is against the total.
    const productId = await freshBoard(50);
    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: okhlaId,
      qtyUnits: 30,
      unitCostPaise: 10_000,
    });

    let short = await executeQuery(owner, lowStock, {});
    expect(short.map((row) => row.productId)).toContain(productId);

    await executeCommand(clerk, receiveStock, {
      productId,
      locationId: noidaId,
      qtyUnits: 25,
      unitCostPaise: 10_000,
    });

    short = await executeQuery(owner, lowStock, {});
    expect(short.map((row) => row.productId)).not.toContain(productId);
  });

  /* ------------------------------ the boundaries ---------------------------- */

  it("refuses to move a board that has been withdrawn from the catalogue", async () => {
    const productId = await freshBoard();
    await executeCommand(owner, setProductActive, { productId, active: false });

    await expect(
      executeCommand(clerk, receiveStock, {
        productId,
        locationId: okhlaId,
        qtyUnits: 1,
        unitCostPaise: 1_000,
      }),
    ).rejects.toThrow(/withdrawn from the catalogue/);
  });

  it("shows another tenant none of this one's stock (INV-001)", async () => {
    const seen = await withTenant(otherTenantId, async (tx) => ({
      entries: await tx.stockLedgerEntry.count(),
      balances: await tx.stockBalance.count(),
    }));
    expect(seen).toEqual({ entries: 0, balances: 0 });
  });
});
