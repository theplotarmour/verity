import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache } from "@/server/platform/capability";
import { clearCommands, executeCommand, type ActorContext } from "@/server/platform/command";
import { clearQueries, executeQuery } from "@/server/platform/query";
import {
  assertRowInScope,
  clearScopeResolvers,
  ForbiddenError,
  reachableLocations,
  registerScopeResolver,
} from "@/server/platform/authorization";
import { provisionIdentity } from "@/server/platform/identity";
import {
  ENTITY_GEOFENCE,
  ENTITY_LOCATION,
  ENTITY_PLACE,
  LOCATION_CAPABILITY,
  actorLocations,
  addGeofence,
  assignUserToLocation,
  createLocation,
  createPlace,
  listLocations,
  registerLocationCapability,
  withinGeofence,
} from "@/server/capabilities/location";

/**
 * CAPABILITY: Location.
 * Authority: ADR-004, GOV-TER-017, PLA-AUT-004.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-location.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

describeDb("capability: Location", () => {
  const tenantA = randomUUID();
  let northOrg: string;
  let southOrg: string;
  let actor: ActorContext;
  let siteScopedActor: ActorContext;
  let northSite: string;
  let southSite: string;
  let fenceId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    clearCommands();
    clearQueries();
    clearScopeResolvers();
    registerLocationCapability();

    await withTenant(tenantA, async (tx) => {
      await tx.tenant.create({ data: { id: tenantA, name: "Location Tenant" } });
      await activateCapability(tx, tenantA, LOCATION_CAPABILITY);

      northOrg = (await tx.organization.create({ data: { tenantId: tenantA, name: "North" } })).id;
      southOrg = (await tx.organization.create({ data: { tenantId: tenantA, name: "South" } })).id;

      const admin = await tx.role.create({ data: { tenantId: tenantA, name: "Estates Admin" } });
      const siteOnly = await tx.role.create({ data: { tenantId: tenantA, name: "Site Guard" } });

      await tx.permission.createMany({
        data: [
          { tenantId: tenantA, roleId: admin.id, verb: "Create", entity: ENTITY_PLACE, scope: "Tenant" },
          { tenantId: tenantA, roleId: admin.id, verb: "Create", entity: ENTITY_LOCATION, scope: "Tenant" },
          { tenantId: tenantA, roleId: admin.id, verb: "Create", entity: ENTITY_GEOFENCE, scope: "Tenant" },
          { tenantId: tenantA, roleId: admin.id, verb: "Edit", entity: ENTITY_LOCATION, scope: "Tenant" },
          { tenantId: tenantA, roleId: admin.id, verb: "Read", entity: ENTITY_LOCATION, scope: "Tenant" },
          // A guard reads sites only at their own location (PLA-AUT-004).
          { tenantId: tenantA, roleId: siteOnly.id, verb: "Read", entity: ENTITY_LOCATION, scope: "Location" },
        ],
      });

      const adminIdentity = await provisionIdentity(tx, {
        organizationId: northOrg, authUserId: randomUUID(), displayName: "Estates",
      });
      const guardIdentity = await provisionIdentity(tx, {
        organizationId: southOrg, authUserId: randomUUID(), displayName: "Guard",
      });

      actor = { tenantId: tenantA, userId: adminIdentity.userId, membershipId: adminIdentity.membershipId, organizationId: northOrg, roleId: admin.id };
      siteScopedActor = { tenantId: tenantA, userId: guardIdentity.userId, membershipId: guardIdentity.membershipId, organizationId: southOrg, roleId: siteOnly.id };
    });
    invalidateCapabilityCache();
  });

  afterAll(async () => {
    clearCommands();
    clearQueries();
    clearScopeResolvers();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantA}::uuid`;
      await admin.$executeRaw`DELETE FROM "user" WHERE id NOT IN (SELECT user_id FROM tenant_membership)`;
      await admin.$executeRaw`DELETE FROM party WHERE id NOT IN (SELECT party_id FROM "user")`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("keeps Place and Location as separate records (ADR-004)", async () => {
    const place = await executeCommand(actor, createPlace, {
      name: "Wind Farm 7", latitude: 55.9533, longitude: -3.1883,
    });
    northSite = (await executeCommand(actor, createLocation, {
      name: "North Depot", organizationId: northOrg, placeId: place.id,
    })).id;

    const stored = await withTenant(tenantA, (tx) =>
      tx.location.findUniqueOrThrow({ where: { id: northSite }, include: { place: true } }),
    );
    // The site references a Place; it does not carry the coordinates itself.
    expect(stored.placeId).toBe(place.id);
    expect(Number(stored.place?.latitude)).toBeCloseTo(55.9533, 4);
    expect("latitude" in stored).toBe(false);
  });

  it("creates a Location with no Place at all", async () => {
    southSite = (await executeCommand(actor, createLocation, {
      name: "South Depot", organizationId: southOrg,
    })).id;
    const stored = await withTenant(tenantA, (tx) =>
      tx.location.findUniqueOrThrow({ where: { id: southSite } }),
    );
    expect(stored.placeId).toBeNull();
  });

  it("rejects coordinates outside the valid range", async () => {
    await expect(
      executeCommand(actor, createPlace, { name: "Nowhere", latitude: 120, longitude: 0 }),
    ).rejects.toThrow();
  });

  it("attaches a geofence to a Location as a policy, not a place", async () => {
    fenceId = (await executeCommand(actor, addGeofence, {
      locationId: northSite, name: "Perimeter", centreLat: 55.9533, centreLng: -3.1883, radiusMetres: 200,
    })).id;
    const fence = await withTenant(tenantA, (tx) =>
      tx.geofence.findUniqueOrThrow({ where: { id: fenceId } }),
    );
    expect(fence.locationId).toBe(northSite);
  });

  it("refuses a zero or negative geofence radius", async () => {
    await expect(
      executeCommand(actor, addGeofence, {
        locationId: northSite, name: "Bad", centreLat: 0, centreLng: 0, radiusMetres: 0,
      }),
    ).rejects.toThrow();
  });

  it("evaluates a point inside the geofence", async () => {
    const inside = await withTenant(tenantA, (tx) =>
      withinGeofence(tx, fenceId, { latitude: 55.9534, longitude: -3.1884 }),
    );
    expect(inside).toBe(true);
  });

  it("evaluates a point outside the geofence", async () => {
    // ~1.5km north — comfortably beyond a 200m radius.
    const outside = await withTenant(tenantA, (tx) =>
      withinGeofence(tx, fenceId, { latitude: 55.9670, longitude: -3.1883 }),
    );
    expect(outside).toBe(false);
  });

  it("emits the capability's events into the platform outbox", async () => {
    const events = await withTenant(tenantA, (tx) =>
      tx.domainEvent.findMany({ where: { entityKey: { startsWith: "verity.location." } } }),
    );
    expect(events.map((e) => e.name)).toEqual(
      expect.arrayContaining([
        "verity.location.place_created",
        "verity.location.location_created",
        "verity.location.geofence_added",
      ]),
    );
  });

  it("resolves a Location-scoped grant once the actor is assigned (PLA-AUT-004)", async () => {
    // Before assignment the grant reaches nothing.
    const before = await withTenant(tenantA, (tx) =>
      reachableLocations(tx, siteScopedActor, "Read", ENTITY_LOCATION),
    );
    expect(before).toEqual([]);

    await executeCommand(actor, assignUserToLocation, {
      locationId: southSite, userId: siteScopedActor.userId,
    });

    const after = await withTenant(tenantA, (tx) =>
      reachableLocations(tx, siteScopedActor, "Read", ENTITY_LOCATION),
    );
    expect(after).toEqual([southSite]);
  });

  it("admits a record at the actor's own site and refuses another", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        assertRowInScope(tx, siteScopedActor, ENTITY_LOCATION, "Read", { locationId: southSite }),
      ),
    ).resolves.toBeUndefined();

    await expect(
      withTenant(tenantA, (tx) =>
        assertRowInScope(tx, siteScopedActor, ENTITY_LOCATION, "Read", { locationId: northSite }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns nothing for a Location grant when no resolver is registered", async () => {
    clearScopeResolvers();
    const reach = await withTenant(tenantA, (tx) =>
      reachableLocations(tx, siteScopedActor, "Read", ENTITY_LOCATION),
    );
    // Fails closed: an unevaluable axis reaches nothing, never everything.
    expect(reach).toEqual([]);
    // Restore only the resolver — re-running the whole installer would collide
    // on the already-registered commands.
    registerScopeResolver("Location", actorLocations);
  });

  it("lists only sites inside the actor's organization scope", async () => {
    const sites = await executeQuery(actor, listLocations, {});
    expect(sites.map((s) => s.name)).toEqual(["North Depot", "South Depot"]);
  });

  it("registers the capability's lifecycle with the platform", async () => {
    const states = await withTenant(tenantA, (tx) =>
      tx.stateDefinition.findMany({ where: { entityKey: ENTITY_LOCATION } }),
    );
    expect(states.map((s) => s.key).sort()).toEqual(["active", "decommissioned", "suspended"]);
    expect(states.find((s) => s.key === "decommissioned")?.isTerminal).toBe(true);
  });
});
