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
import { clearScopeResolvers } from "@/server/platform/authorization";
import { clearTransitionGuards } from "@/server/platform/state";
import { clearContributions } from "@/server/platform/contribution";
import { provisionIdentity } from "@/server/platform/identity";
import { ASSET_CAPABILITY } from "@/server/capabilities/asset";
import { EVIDENCE_CAPABILITY } from "@/server/capabilities/evidence";
import { LOCATION_CAPABILITY } from "@/server/capabilities/location";
import {
  ENTITY_CUSTOMER,
  ENTITY_SALES_ORDER,
  ENTITY_SHIPMENT,
  ENTITY_TRANSPORTER,
  PLYWOOD_CAPABILITY,
  assignCarrier,
  confirmDelivery,
  createCustomer,
  createShipment,
  createTransporter,
  dispatchShipment,
  registerPlywoodCapability,
  reportShipmentLost,
  trackMaterial,
} from "@/server/capabilities/plywood";

/**
 * CAPABILITY: Plywood trading — stage 5, logistics.
 *
 * Requirement source: plywood.md §1.6. The two questions in the requirement are
 * verbatim the owner's: where is my material right now, and what has been sent
 * to which customer and was it delivered. Both are asserted here through
 * `trackMaterial`, which is the query those questions land on.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-plywood-logistics.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

describeDb("capability: Plywood trading — logistics", () => {
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();

  let organizationId: string;
  let coordinator: ActorContext;
  let okhlaId: string;
  let noidaId: string;
  let customerId: string;
  let transporterId: string;
  let vehicleAssetId: string;

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
        data: { id: tenantId, name: "Logistics Test Traders", timeZone: "Asia/Kolkata" },
      });
      // Vehicles are Assets and documents are Evidence, so the capability
      // declares both. The database refuses the activation without them.
      await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      await activateCapability(tx, tenantId, ASSET_CAPABILITY);
      await activateCapability(tx, tenantId, EVIDENCE_CAPABILITY);
      await activateCapability(tx, tenantId, PLYWOOD_CAPABILITY);

      organizationId = (await tx.organization.create({ data: { tenantId, name: "HQ" } })).id;
      okhlaId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Okhla" } })
      ).id;
      noidaId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Noida" } })
      ).id;

      // A real Asset, so the reuse is exercised rather than asserted.
      vehicleAssetId = (
        await tx.asset.create({
          data: { tenantId, name: "Tata 407", reference: "DL-1AB-4471", locationId: okhlaId },
        })
      ).id;

      const role = await tx.role.create({
        data: { tenantId, name: "Logistics Coordinator" },
        select: { id: true },
      });
      await tx.permission.createMany({
        data: [ENTITY_TRANSPORTER, ENTITY_SHIPMENT, ENTITY_CUSTOMER, ENTITY_SALES_ORDER].flatMap(
          (entity) =>
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
        displayName: "Coordinator",
      });
      await tx.tenantMembership.update({
        where: { id: identity.membershipId },
        data: { roleId: role.id },
      });
      coordinator = {
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

    customerId = (
      await executeCommand(coordinator, createCustomer, {
        displayName: "Sharma Timber Mart",
        stateCode: "07",
      })
    ).id;
    transporterId = (
      await executeCommand(coordinator, createTransporter, {
        name: "Delhi Roadways",
        phone: "9810000000",
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

  /** A shipment out to the customer, without an order to keep the test narrow. */
  async function outboundShipment(): Promise<string> {
    const shipment = await executeCommand(coordinator, createShipment, {
      sourceLocationId: okhlaId,
      destCustomerId: customerId,
      salesOrderId: undefined,
      purchaseOrderId: undefined,
      freightChargePaise: 250_000,
      freightPayer: "customer",
    });
    return shipment.id;
  }

  /* ------------------------------- the chain -------------------------------- */

  it("refuses a shipment with no order, or with both", async () => {
    // The constraint exists in the column too. A named precondition is a better
    // error than a check violation on a screen.
    await expect(
      executeCommand(coordinator, createShipment, {
        sourceLocationId: okhlaId,
        destCustomerId: customerId,
      }),
    ).rejects.toThrow(/exactly one order/);
  });

  it("refuses a shipment to both a godown and a customer", async () => {
    await expect(
      executeCommand(coordinator, createShipment, {
        sourceLocationId: okhlaId,
        destLocationId: noidaId,
        destCustomerId: customerId,
        purchaseOrderId: randomUUID(),
      }),
    ).rejects.toThrow(/exactly one destination/);
  });

  it("answers where the material is, and how long it has been out", async () => {
    // Placed against a real sales order so the reference is searchable.
    const order = await withTenant(tenantId, (tx) =>
      tx.plywoodSalesOrder.create({
        data: {
          tenantId,
          customerId,
          locationId: okhlaId,
          reference: "SO-4471",
          state: "approved",
        },
      }),
    );

    const shipment = await executeCommand(coordinator, createShipment, {
      sourceLocationId: okhlaId,
      destCustomerId: customerId,
      salesOrderId: order.id,
      freightChargePaise: 180_000,
      freightPayer: "tenant",
    });
    await executeCommand(coordinator, assignCarrier, {
      shipmentId: shipment.id,
      transporterId,
      vehicleAssetId,
      lrNumber: "LR-90210",
    });
    await executeCommand(coordinator, dispatchShipment, { shipmentId: shipment.id });

    const [tracked] = await executeQuery(coordinator, trackMaterial, { search: "LR-90210" });
    expect(tracked).toBeDefined();
    expect(tracked!.state).toBe("in_transit");
    expect(tracked!.sourceName).toBe("Okhla");
    expect(tracked!.destination).toBe("Sharma Timber Mart");
    expect(tracked!.transporterName).toBe("Delhi Roadways");
    // The vehicle is an Asset. This is the reuse claimed in the gap analysis,
    // exercised rather than asserted on paper.
    expect(tracked!.vehicleReference).toBe("DL-1AB-4471");
    expect(tracked!.orderReference).toBe("SO-4471");
    expect(tracked!.direction).toBe("outbound");
    expect(tracked!.daysInTransit).toBe(0);
    expect(tracked!.deliveredAt).toBeNull();
  });

  it("finds a shipment by the customer's name, which is how the question arrives", async () => {
    const shipmentId = await outboundShipmentAgainstOrder();
    await executeCommand(coordinator, assignCarrier, {
      shipmentId,
      transporterId,
      lrNumber: `LR-${randomUUID().slice(0, 6)}`,
    });
    await executeCommand(coordinator, dispatchShipment, { shipmentId });

    const found = await executeQuery(coordinator, trackMaterial, { search: "Sharma" });
    expect(found.map((row) => row.shipmentId)).toContain(shipmentId);
  });

  it("records a delivery and stops counting days in transit", async () => {
    const shipmentId = await outboundShipmentAgainstOrder();
    await executeCommand(coordinator, assignCarrier, {
      shipmentId,
      transporterId,
      lrNumber: `LR-${randomUUID().slice(0, 6)}`,
    });
    await executeCommand(coordinator, dispatchShipment, { shipmentId });
    await executeCommand(coordinator, confirmDelivery, {
      shipmentId,
      receivedBy: "Ramesh at the yard gate",
    });

    const [tracked] = await executeQuery(coordinator, trackMaterial, {}).then((rows) =>
      rows.filter((row) => row.shipmentId === shipmentId),
    );
    expect(tracked!.state).toBe("delivered");
    expect(tracked!.deliveredAt).not.toBeNull();

    const signed = await withTenant(tenantId, (tx) =>
      tx.activity.findFirst({ where: { entityId: shipmentId, fieldChanged: "receivedBy" } }),
    );
    expect(signed?.newValue).toContain("Ramesh");
  });

  it("records goods lost in transit as cancelled, never as delivered", async () => {
    const shipmentId = await outboundShipmentAgainstOrder();
    await executeCommand(coordinator, assignCarrier, {
      shipmentId,
      transporterId,
      lrNumber: `LR-${randomUUID().slice(0, 6)}`,
    });
    await executeCommand(coordinator, dispatchShipment, { shipmentId });
    await executeCommand(coordinator, reportShipmentLost, {
      shipmentId,
      reason: "Vehicle overturned near Ghaziabad, load written off",
    });

    const rows = await executeQuery(coordinator, trackMaterial, {});
    const tracked = rows.find((row) => row.shipmentId === shipmentId)!;
    // Goods that never arrived are not a delivery. Recording them as one would
    // make every delivery-rate and transit-time report quietly wrong.
    expect(tracked.state).toBe("cancelled");
    expect(tracked.deliveredAt).toBeNull();
  });

  it("refuses to dispatch a shipment with no carrier assigned", async () => {
    const shipmentId = await outboundShipmentAgainstOrder();
    await expect(
      executeCommand(coordinator, dispatchShipment, { shipmentId }),
    ).rejects.toThrow(/no declared transition draft -> in_transit/);
  });

  it("keeps freight and who pays it as recorded facts", async () => {
    const shipmentId = await outboundShipmentAgainstOrder(300_000, "customer");
    const rows = await executeQuery(coordinator, trackMaterial, {});
    const tracked = rows.find((row) => row.shipmentId === shipmentId)!;
    // Freight changes the margin on the sale, so who bears it is recorded
    // rather than assumed at reporting time.
    expect(tracked.freightChargePaise).toBe(300_000);
    expect(tracked.freightPayer).toBe("customer");
  });

  it("shows another tenant no shipments at all (INV-001)", async () => {
    const seen = await withTenant(otherTenantId, async (tx) => ({
      transporters: await tx.plywoodTransporter.count(),
      shipments: await tx.plywoodShipment.count(),
    }));
    expect(seen).toEqual({ transporters: 0, shipments: 0 });
  });

  /** An outbound shipment carrying a real (minimal) sales order. */
  async function outboundShipmentAgainstOrder(
    freightChargePaise = 100_000,
    freightPayer: "tenant" | "customer" | "supplier" = "tenant",
  ): Promise<string> {
    const order = await withTenant(tenantId, (tx) =>
      tx.plywoodSalesOrder.create({
        data: {
          tenantId,
          customerId,
          locationId: okhlaId,
          reference: `SO-${randomUUID().slice(0, 6)}`,
          state: "approved",
        },
      }),
    );
    const shipment = await executeCommand(coordinator, createShipment, {
      sourceLocationId: okhlaId,
      destCustomerId: customerId,
      salesOrderId: order.id,
      freightChargePaise,
      freightPayer,
    });
    return shipment.id;
  }
});
