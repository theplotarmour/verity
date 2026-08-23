import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache, CapabilityError } from "@/server/platform/capability";
import { clearCommands, executeCommand, type ActorContext } from "@/server/platform/command";
import { clearQueries, executeQuery } from "@/server/platform/query";
import { clearScopeResolvers, ForbiddenError } from "@/server/platform/authorization";
import { provisionIdentity } from "@/server/platform/identity";
import { registerLocationCapability, createLocation, ENTITY_LOCATION, LOCATION_CAPABILITY, addGeofence, ENTITY_GEOFENCE, createPlace, ENTITY_PLACE } from "@/server/capabilities/location";
import { registerAssetCapability, registerAsset, changeAssetState, relocateAsset, listAssets, ASSET_CAPABILITY, ENTITY_ASSET } from "@/server/capabilities/asset";
import { registerEvidenceCapability, captureEvidence, listEvidenceFor, EVIDENCE_CAPABILITY, ENTITY_EVIDENCE } from "@/server/capabilities/evidence";
import { registerSchedulingCapability, createResource, createGroup, declareUnavailable, book, resolveGroup, resourceIsFree, SCHEDULING_CAPABILITY, ENTITY_RESOURCE, ENTITY_RESOURCE_GROUP, ENTITY_BOOKING } from "@/server/capabilities/scheduling";
import { registerApprovalCapability, requestApproval, decide, listPendingFor, APPROVAL_CAPABILITY, ENTITY_APPROVAL } from "@/server/capabilities/approval";

/**
 * Shared capabilities: Asset, Evidence, Scheduling, Approval.
 * Authority: GOV-TER-009, ADR-004, ADR-008, EXE-AUD-003, INV-002.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-shared.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const T0 = "2026-09-01T09:00:00.000Z";
const T1 = "2026-09-01T11:00:00.000Z";
const T2 = "2026-09-01T10:00:00.000Z";
const T3 = "2026-09-01T12:00:00.000Z";

describeDb("shared capabilities", () => {
  const tenantA = randomUUID();
  let orgId: string, siteId: string, actor: ActorContext, adminRole: string;
  let financeRole: string, directorRole: string;
  let financeActor: ActorContext, directorActor: ActorContext;
  let assetId: string, vanResource: string, techResource: string, techPartyId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    clearCommands(); clearQueries(); clearScopeResolvers();
    registerLocationCapability();
    registerAssetCapability();
    registerEvidenceCapability();
    registerSchedulingCapability();
    registerApprovalCapability();

    await withTenant(tenantA, async (tx) => {
      await tx.tenant.create({ data: { id: tenantA, name: "Shared Caps Tenant" } });
      for (const c of [LOCATION_CAPABILITY, ASSET_CAPABILITY, EVIDENCE_CAPABILITY, SCHEDULING_CAPABILITY, APPROVAL_CAPABILITY]) {
        await activateCapability(tx, tenantA, c);
      }
      orgId = (await tx.organization.create({ data: { tenantId: tenantA, name: "Ops" } })).id;

      const admin = await tx.role.create({ data: { tenantId: tenantA, name: "Ops Admin" } });
      const finance = await tx.role.create({ data: { tenantId: tenantA, name: "Finance" } });
      const director = await tx.role.create({ data: { tenantId: tenantA, name: "Director" } });
      adminRole = admin.id; financeRole = finance.id; directorRole = director.id;

      const entities = [ENTITY_PLACE, ENTITY_LOCATION, ENTITY_GEOFENCE, ENTITY_ASSET, ENTITY_EVIDENCE, ENTITY_RESOURCE, ENTITY_RESOURCE_GROUP, ENTITY_BOOKING, ENTITY_APPROVAL];
      await tx.permission.createMany({
        data: entities.flatMap((entity) =>
          (["Create", "Read", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId: tenantA, roleId: admin.id, verb, entity, scope: "Tenant" as const,
          })),
        ),
      });
      for (const r of [finance.id, director.id]) {
        await tx.permission.createMany({
          data: (["Create", "Read", "ActionExecute"] as const).map((verb) => ({
            tenantId: tenantA, roleId: r, verb, entity: ENTITY_APPROVAL, scope: "Tenant" as const,
          })),
        });
      }

      const mk = async (name: string, roleId: string) => {
        const id = await provisionIdentity(tx, { organizationId: orgId, authUserId: randomUUID(), displayName: name });
        return { tenantId: tenantA, userId: id.userId, membershipId: id.membershipId, organizationId: orgId, roleId };
      };
      actor = await mk("Ops Admin", admin.id);
      financeActor = await mk("Finance Officer", finance.id);
      directorActor = await mk("Director", director.id);
      techPartyId = (await tx.party.findFirstOrThrow({ where: { displayName: "Ops Admin" } })).id;
    });
    invalidateCapabilityCache();

    siteId = (await executeCommand(actor, createLocation, { name: "Depot", organizationId: orgId })).id;
  });

  afterAll(async () => {
    clearCommands(); clearQueries(); clearScopeResolvers();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantA}::uuid`;
      await admin.$executeRaw`DELETE FROM "user" WHERE id NOT IN (SELECT user_id FROM tenant_membership)`;
      await admin.$executeRaw`DELETE FROM party WHERE id NOT IN (SELECT party_id FROM "user")`;
    } finally { await admin.$disconnect(); }
    await prisma.$disconnect();
  });

  /* ---------------------------- Asset ---------------------------- */

  it("registers an asset with no equipment-specific columns (forbidden pattern #3)", async () => {
    assetId = (await executeCommand(actor, registerAsset, { name: "Van 12", reference: "FLEET-12", locationId: siteId })).id;
    const asset = await withTenant(tenantA, (tx) => tx.asset.findUniqueOrThrow({ where: { id: assetId } }));
    expect(asset.state).toBe("in_service");
    // Domain attributes live in custom_fields, never as core columns. The core
    // columns are exactly the base entity pattern plus name/reference/state.
    expect(Object.keys(asset).sort()).toEqual([
      "createdAt", "customFields", "id", "locationId", "name",
      "reference", "state", "tenantId", "updatedAt", "version",
    ]);
  });

  it("moves an asset through its declared lifecycle and audits the change", async () => {
    await executeCommand(actor, changeAssetState, { assetId, toState: "maintenance" });
    const history = await withTenant(tenantA, (tx) =>
      tx.activity.findMany({ where: { entityKey: ENTITY_ASSET, entityId: assetId } }),
    );
    expect(history[0]).toMatchObject({ fieldChanged: "state", oldValue: "in_service", newValue: "maintenance" });
  });

  it("refuses an undeclared asset transition", async () => {
    await expect(
      executeCommand(actor, changeAssetState, { assetId, toState: "in_service" }),
    ).resolves.toBeDefined();
    await expect(
      executeCommand(actor, changeAssetState, { assetId, toState: "nonsense" }),
    ).rejects.toThrow();
  });

  it("locks a retired asset permanently (INV-002)", async () => {
    const scrap = (await executeCommand(actor, registerAsset, { name: "Van 99" })).id;
    await executeCommand(actor, changeAssetState, { assetId: scrap, toState: "retired" });
    await expect(
      executeCommand(actor, relocateAsset, { assetId: scrap, locationId: siteId }),
    ).rejects.toThrow(/INV-002/);
  });

  it("lists assets at a site", async () => {
    const atSite = await executeQuery(actor, listAssets, { locationId: siteId });
    expect(atSite.map((a) => a.name)).toContain("Van 12");
  });

  /* --------------------------- Evidence --------------------------- */

  it("captures evidence and judges it against a geofence at capture time", async () => {
    const place = await executeCommand(actor, createPlace, { name: "Depot Yard", latitude: 55.9533, longitude: -3.1883 });
    void place;
    const fence = (await executeCommand(actor, addGeofence, {
      locationId: siteId, name: "Yard", centreLat: 55.9533, centreLng: -3.1883, radiusMetres: 150,
    })).id;

    const inside = await executeCommand(actor, captureEvidence, {
      entityKey: ENTITY_ASSET, entityId: assetId, kind: "GeoPoint",
      latitude: 55.9534, longitude: -3.1884, capturedAt: T0, geofenceId: fence,
    });
    expect(inside.withinFence).toBe(true);

    const outside = await executeCommand(actor, captureEvidence, {
      entityKey: ENTITY_ASSET, entityId: assetId, kind: "GeoPoint",
      latitude: 55.9700, longitude: -3.1883, capturedAt: T0, geofenceId: fence,
    });
    expect(outside.withinFence).toBe(false);
  });

  it("requires an artefact for photo evidence", async () => {
    await expect(
      executeCommand(actor, captureEvidence, {
        entityKey: ENTITY_ASSET, entityId: assetId, kind: "Photo", capturedAt: T0,
      }),
    ).rejects.toThrow(/requires a stored artefact/);
  });

  it("requires coordinates for a GeoPoint", async () => {
    await expect(
      executeCommand(actor, captureEvidence, {
        entityKey: ENTITY_ASSET, entityId: assetId, kind: "GeoPoint", capturedAt: T0,
      }),
    ).rejects.toThrow(/requires coordinates/);
  });

  it("keeps evidence immutable even for a privileged role (EXE-AUD-003)", async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await expect(
        admin.$executeRaw`UPDATE evidence SET uri = 'tampered' WHERE entity_id = ${assetId}::uuid`,
      ).rejects.toThrow(/append-only/);
    } finally { await admin.$disconnect(); }
  });

  it("preserves the device capture time, not the server time", async () => {
    const list = await executeQuery(actor, listEvidenceFor, { entityKey: ENTITY_ASSET, entityId: assetId });
    expect(new Date(list[0]!.capturedAt as string).toISOString()).toBe(T0);
  });

  /* -------------------------- Scheduling -------------------------- */

  it("creates resources backed by a Party and by an Asset (ADR-008)", async () => {
    techResource = (await executeCommand(actor, createResource, { name: "Technician", partyId: techPartyId })).id;
    vanResource = (await executeCommand(actor, createResource, { name: "Van 12", assetId })).id;
    expect(techResource).toBeTruthy();
    expect(vanResource).toBeTruthy();
  });

  it("refuses a Resource backed by neither or by both (ADR-008)", async () => {
    await expect(executeCommand(actor, createResource, { name: "Nothing" })).rejects.toThrow();
    await expect(
      executeCommand(actor, createResource, { name: "Both", partyId: techPartyId, assetId }),
    ).rejects.toThrow();
  });

  it("books a free resource", async () => {
    const b = await executeCommand(actor, book, {
      resourceId: techResource, subjectEntityKey: ENTITY_ASSET, subjectEntityId: assetId,
      startsAt: T0, endsAt: T1,
    });
    expect(b.id).toBeTruthy();
  });

  it("refuses a double booking that overlaps", async () => {
    await expect(
      executeCommand(actor, book, {
        resourceId: techResource, subjectEntityKey: ENTITY_ASSET, subjectEntityId: assetId,
        startsAt: T2, endsAt: T3,
      }),
    ).rejects.toThrow(/not free/);
  });

  it("allows a booking that starts exactly when another ends (half-open)", async () => {
    const b = await executeCommand(actor, book, {
      resourceId: techResource, subjectEntityKey: ENTITY_ASSET, subjectEntityId: assetId,
      startsAt: T1, endsAt: T3,
    });
    expect(b.id).toBeTruthy();
  });

  it("treats an unavailability window as not free", async () => {
    await executeCommand(actor, declareUnavailable, { resourceId: vanResource, startsAt: T0, endsAt: T1 });
    const free = await withTenant(tenantA, (tx) =>
      resourceIsFree(tx, vanResource, { startsAt: new Date(T0), endsAt: new Date(T1) }),
    );
    expect(free).toBe(false);
  });

  it("resolves an AnyOf group to one free member", async () => {
    const spare = (await executeCommand(actor, createResource, { name: "Spare Van", assetId: (await executeCommand(actor, registerAsset, { name: "Van 13" })).id })).id;
    const groupId = (await executeCommand(actor, createGroup, {
      name: "Van pool", selection: "AnyOf", resourceIds: [vanResource, spare],
    })).id;
    const resolved = await withTenant(tenantA, (tx) =>
      resolveGroup(tx, groupId, { startsAt: new Date(T0), endsAt: new Date(T1) }),
    );
    // vanResource is unavailable in that window, so the spare satisfies it.
    expect(resolved.satisfied).toBe(true);
    expect(resolved.resourceIds).toEqual([spare]);
  });

  it("fails an AllOf group when any member is busy", async () => {
    const groupId = (await executeCommand(actor, createGroup, {
      name: "Full crew", selection: "AllOf", resourceIds: [vanResource, techResource],
    })).id;
    const resolved = await withTenant(tenantA, (tx) =>
      resolveGroup(tx, groupId, { startsAt: new Date(T0), endsAt: new Date(T1) }),
    );
    expect(resolved.satisfied).toBe(false);
  });

  it("requires a count for NOf and rejects one otherwise", async () => {
    await expect(
      executeCommand(actor, createGroup, { name: "Bad", selection: "NOf", resourceIds: [techResource] }),
    ).rejects.toThrow();
    await expect(
      executeCommand(actor, createGroup, { name: "Bad2", selection: "AnyOf", requiredCount: 2, resourceIds: [techResource] }),
    ).rejects.toThrow();
  });

  /* --------------------------- Approval --------------------------- */

  it("runs a two-step chain in sequence and approves", async () => {
    const req = (await executeCommand(actor, requestApproval, {
      subjectEntityKey: ENTITY_ASSET, subjectEntityId: assetId,
      approverRoleIds: [financeRole, directorRole],
    })).id;

    // The director cannot jump the queue.
    await expect(
      executeCommand(directorActor, decide, { requestId: req, approve: true }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const first = await executeCommand(financeActor, decide, { requestId: req, approve: true });
    expect(first.finished).toBe(false);

    const second = await executeCommand(directorActor, decide, { requestId: req, approve: true });
    expect(second).toEqual({ outcome: "Approved", finished: true });

    const stored = await withTenant(tenantA, (tx) => tx.approvalRequest.findUniqueOrThrow({ where: { id: req } }));
    expect(stored.state).toBe("approved");
  });

  it("ends the chain immediately on rejection and skips later approvers", async () => {
    const req = (await executeCommand(actor, requestApproval, {
      subjectEntityKey: ENTITY_ASSET, subjectEntityId: assetId,
      approverRoleIds: [financeRole, directorRole],
    })).id;

    const out = await executeCommand(financeActor, decide, { requestId: req, approve: false, comment: "over budget" });
    expect(out).toEqual({ outcome: "Rejected", finished: true });

    const steps = await withTenant(tenantA, (tx) =>
      tx.approvalStep.findMany({ where: { requestId: req }, orderBy: { sequence: "asc" } }),
    );
    expect(steps.map((s) => s.decision)).toEqual(["Rejected", "Skipped"]);
  });

  it("refuses a decision on a completed chain", async () => {
    const req = (await executeCommand(actor, requestApproval, {
      subjectEntityKey: ENTITY_ASSET, subjectEntityId: assetId, approverRoleIds: [financeRole],
    })).id;
    await executeCommand(financeActor, decide, { requestId: req, approve: true });
    await expect(
      executeCommand(financeActor, decide, { requestId: req, approve: true }),
    ).rejects.toThrow(/already complete/);
  });

  it("rejects an empty approval chain", async () => {
    await expect(
      executeCommand(actor, requestApproval, {
        subjectEntityKey: ENTITY_ASSET, subjectEntityId: assetId, approverRoleIds: [],
      }),
    ).rejects.toThrow();
  });

  it("shows an approver only chains currently awaiting their role", async () => {
    const req = (await executeCommand(actor, requestApproval, {
      subjectEntityKey: ENTITY_ASSET, subjectEntityId: assetId,
      approverRoleIds: [financeRole, directorRole],
    })).id;
    void req;
    const forDirector = await executeQuery(directorActor, listPendingFor, {});
    const forFinance = await executeQuery(financeActor, listPendingFor, {});
    // The director's step exists but is not yet current.
    expect(forDirector).toHaveLength(0);
    expect(forFinance.length).toBeGreaterThan(0);
  });

  /* ------------------- cross-capability + gating ------------------- */

  it("blocks a capability's commands when the tenant suspends it", async () => {
    // Evidence is chosen because nothing depends on it. Suspending Asset would
    // be refused outright, since Scheduling declares a dependency on it — which
    // is itself the behaviour asserted in the next test.
    await withTenant(tenantA, (tx) =>
      tx.tenantActivation.update({
        where: { tenantId_capabilityId: { tenantId: tenantA, capabilityId: EVIDENCE_CAPABILITY } },
        data: { status: "Suspended" },
      }),
    );
    invalidateCapabilityCache(tenantA);
    await expect(
      executeCommand(actor, captureEvidence, {
        entityKey: ENTITY_ASSET, entityId: assetId, kind: "Reading", capturedAt: T0,
      }),
    ).rejects.toBeInstanceOf(CapabilityError);

    await withTenant(tenantA, (tx) => activateCapability(tx, tenantA, EVIDENCE_CAPABILITY));
    invalidateCapabilityCache(tenantA);
  });

  it("refuses to suspend Asset while Scheduling depends on it", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.tenantActivation.update({
          where: { tenantId_capabilityId: { tenantId: tenantA, capabilityId: ASSET_CAPABILITY } },
          data: { status: "Suspended" },
        }),
      ),
    ).rejects.toThrow(/still required by/);
  });

  it("refuses to suspend Location while Asset and Evidence depend on it (PLA-CAP-003)", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.tenantActivation.update({
          where: { tenantId_capabilityId: { tenantId: tenantA, capabilityId: LOCATION_CAPABILITY } },
          data: { status: "Suspended" },
        }),
      ),
    ).rejects.toThrow(/still required by/);
  });
});
