import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache } from "@/server/platform/capability";
import type { ActorContext } from "@/server/platform/command";
import {
  ForbiddenError,
  assertRowInScope,
  fieldGrantKey,
  reachableOrganizations,
  redactFields,
  scopeFilter,
} from "@/server/platform/authorization";
import { executeQuery, type QueryDefinition } from "@/server/platform/query";

/**
 * Authorization layers 2 and 3.
 * Authority: PLA-AUT-004, PLA-AUT-005, PLA-ORG-002, PLA-ORG-003.
 *
 * Organization tree used throughout:
 *
 *   HQ
 *   ├── North ── Manchester
 *   └── South ── London
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "authorization-layers.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const ENTITY = "verity.test.job";
const CAPABILITY = "verity.capability.authz_layers_test";

describeDb("authorization layers 2 and 3", () => {
  const tenantA = randomUUID();
  const orgs: Record<string, string> = {};
  let regionalRole: string;
  let branchRole: string;
  let tenantRole: string;
  let supervisorRole: string;

  const actorIn = (organizationId: string, roleId: string): ActorContext => ({
    tenantId: tenantA,
    userId: randomUUID(),
    membershipId: randomUUID(),
    organizationId,
    roleId,
  });

  beforeAll(async () => {
    await assertRlsEnforceable();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.capabilityDefinition.create({
        data: { id: CAPABILITY, name: "Authz layers test", version: "1.0.0", entityTypes: [ENTITY] },
      });
      await admin.entityDefinition.create({
        data: { key: ENTITY, capability: CAPABILITY, class: "Persistent", tableName: "job" },
      });
      // billable_rate is the specification's own example of a restricted field.
      await admin.fieldPermission.createMany({
        data: [
          { entityKey: ENTITY, fieldName: "billable_rate" },
          { entityKey: ENTITY, fieldName: "margin" },
        ],
      });
    } finally {
      await admin.$disconnect();
    }

    await withTenant(tenantA, async (tx) => {
      await tx.tenant.create({ data: { id: tenantA, name: "Scoping Tenant" } });
      await activateCapability(tx, tenantA, CAPABILITY);

      const hq = await tx.organization.create({ data: { tenantId: tenantA, name: "HQ" } });
      const north = await tx.organization.create({ data: { tenantId: tenantA, name: "North", parentId: hq.id } });
      const south = await tx.organization.create({ data: { tenantId: tenantA, name: "South", parentId: hq.id } });
      const manchester = await tx.organization.create({ data: { tenantId: tenantA, name: "Manchester", parentId: north.id } });
      const london = await tx.organization.create({ data: { tenantId: tenantA, name: "London", parentId: south.id } });
      Object.assign(orgs, { hq: hq.id, north: north.id, south: south.id, manchester: manchester.id, london: london.id });

      regionalRole = (await tx.role.create({ data: { tenantId: tenantA, name: "Regional Manager" } })).id;
      branchRole = (await tx.role.create({ data: { tenantId: tenantA, name: "Branch Worker" } })).id;
      tenantRole = (await tx.role.create({ data: { tenantId: tenantA, name: "Head Office" } })).id;
      supervisorRole = (await tx.role.create({ data: { tenantId: tenantA, name: "Supervisor" } })).id;

      await tx.permission.createMany({
        data: [
          { tenantId: tenantA, roleId: regionalRole, verb: "Read", entity: ENTITY, scope: "Organization" },
          { tenantId: tenantA, roleId: branchRole, verb: "Read", entity: ENTITY, scope: "Organization" },
          { tenantId: tenantA, roleId: tenantRole, verb: "Read", entity: ENTITY, scope: "Tenant" },
          { tenantId: tenantA, roleId: supervisorRole, verb: "Read", entity: ENTITY, scope: "Tenant" },
          // Only the supervisor may see the restricted fields (PLA-AUT-005).
          { tenantId: tenantA, roleId: supervisorRole, verb: "Read", entity: fieldGrantKey(ENTITY, "billable_rate"), scope: "Tenant" },
        ],
      });
    });
    invalidateCapabilityCache();
  });

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      // Every tenant holding this capability, not only the one this run made.
      //
      // A previous run that died between creating its tenant and reaching this
      // block leaves an activation behind, and the capability delete below then
      // fails on the foreign key forever after — the suite goes permanently red
      // on a database it does not own, for a reason that has nothing to do with
      // the code under test. The capability id is unique to this file, so
      // anything activating it is this test's residue by definition.
      await admin.$executeRaw`
        DELETE FROM tenant
         WHERE id IN (SELECT tenant_id FROM tenant_activation WHERE capability_id = ${CAPABILITY})`;
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantA}::uuid`;
      await admin.$executeRaw`DELETE FROM entity_definition WHERE key = ${ENTITY}`;
      await admin.$executeRaw`DELETE FROM capability_definition WHERE id = ${CAPABILITY}`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  /* ---- Layer 2: row-level scoping ---- */

  it("gives a parent-node actor visibility over the whole subtree (PLA-ORG-002)", async () => {
    const actor = actorIn(orgs.north, regionalRole);
    const { organizationIds } = await withTenant(tenantA, (tx) =>
      reachableOrganizations(tx, actor, "Read", ENTITY),
    );
    expect(new Set(organizationIds)).toEqual(new Set([orgs.north, orgs.manchester]));
  });

  it("keeps a branch actor out of sibling branches (PLA-ORG-003)", async () => {
    const actor = actorIn(orgs.manchester, branchRole);
    const { organizationIds } = await withTenant(tenantA, (tx) =>
      reachableOrganizations(tx, actor, "Read", ENTITY),
    );
    expect(organizationIds).toEqual([orgs.manchester]);
    expect(organizationIds).not.toContain(orgs.london);
  });

  it("does not give a child actor visibility upward", async () => {
    const actor = actorIn(orgs.manchester, branchRole);
    const { organizationIds } = await withTenant(tenantA, (tx) =>
      reachableOrganizations(tx, actor, "Read", ENTITY),
    );
    expect(organizationIds).not.toContain(orgs.north);
    expect(organizationIds).not.toContain(orgs.hq);
  });

  it("reaches every organization on a Tenant-scoped grant", async () => {
    const actor = actorIn(orgs.london, tenantRole);
    const { organizationIds } = await withTenant(tenantA, (tx) =>
      reachableOrganizations(tx, actor, "Read", ENTITY),
    );
    expect(new Set(organizationIds)).toEqual(new Set(Object.values(orgs)));
  });

  it("reaches nothing without a role", async () => {
    const actor = { ...actorIn(orgs.hq, branchRole), roleId: null };
    const { organizationIds } = await withTenant(tenantA, (tx) =>
      reachableOrganizations(tx, actor, "Read", ENTITY),
    );
    expect(organizationIds).toEqual([]);
  });

  it("admits a record inside the actor's scope", async () => {
    const actor = actorIn(orgs.north, regionalRole);
    await expect(
      withTenant(tenantA, (tx) =>
        assertRowInScope(tx, actor, ENTITY, "Read", { organizationId: orgs.manchester }),
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects a record in a sibling branch with E_FORBIDDEN (PLA-AUT-004)", async () => {
    const actor = actorIn(orgs.manchester, branchRole);
    await expect(
      withTenant(tenantA, (tx) =>
        assertRowInScope(tx, actor, ENTITY, "Read", { organizationId: orgs.london }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses an unscoped record unless the grant is tenant-wide", async () => {
    const branch = actorIn(orgs.manchester, branchRole);
    await expect(
      withTenant(tenantA, (tx) => assertRowInScope(tx, branch, ENTITY, "Read", { organizationId: null })),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const headOffice = actorIn(orgs.hq, tenantRole);
    await expect(
      withTenant(tenantA, (tx) => assertRowInScope(tx, headOffice, ENTITY, "Read", { organizationId: null })),
    ).resolves.toBeUndefined();
  });

  it("produces a query filter matching the actor's subtree", async () => {
    const actor = actorIn(orgs.south, regionalRole);
    const filter = await withTenant(tenantA, (tx) => scopeFilter(tx, actor, ENTITY));
    expect(new Set(filter.organizationId.in)).toEqual(new Set([orgs.south, orgs.london]));
  });

  it("treats a Location-scoped grant as reaching nothing until Location exists", async () => {
    await withTenant(tenantA, async (tx) => {
      const role = await tx.role.create({ data: { tenantId: tenantA, name: "Site Only" } });
      await tx.permission.create({
        data: { tenantId: tenantA, roleId: role.id, verb: "Read", entity: ENTITY, scope: "Location" },
      });
      const actor = actorIn(orgs.london, role.id);
      const { organizationIds, unresolvedScopes } = await reachableOrganizations(tx, actor, "Read", ENTITY);
      // Fails closed rather than widening to the tenant.
      expect(organizationIds).toEqual([]);
      expect(unresolvedScopes).toEqual(["Location"]);
    });
  });

  /* ---- Layer 3: field-level scoping ---- */

  it("strips a restricted field from an actor without the grant (PLA-AUT-005)", async () => {
    const actor = actorIn(orgs.hq, tenantRole);
    const rows = await withTenant(tenantA, (tx) =>
      redactFields(tx, actor, ENTITY, [{ id: "1", site: "Depot", billable_rate: 250, margin: 40 }]),
    );
    expect(rows[0]).toEqual({ id: "1", site: "Depot" });
  });

  it("omits the field rather than nulling it", async () => {
    const actor = actorIn(orgs.hq, tenantRole);
    const rows = await withTenant(tenantA, (tx) =>
      redactFields(tx, actor, ENTITY, [{ id: "1", billable_rate: 250 }]),
    );
    // A null would be indistinguishable from a genuinely absent value.
    expect("billable_rate" in rows[0]!).toBe(false);
  });

  it("keeps a field the actor is granted and strips the one they are not", async () => {
    const actor = actorIn(orgs.hq, supervisorRole);
    const rows = await withTenant(tenantA, (tx) =>
      redactFields(tx, actor, ENTITY, [{ id: "1", billable_rate: 250, margin: 40 }]),
    );
    expect(rows[0]).toEqual({ id: "1", billable_rate: 250 });
  });

  it("leaves unrestricted entities untouched", async () => {
    const actor = actorIn(orgs.hq, tenantRole);
    const rows = await withTenant(tenantA, (tx) =>
      redactFields(tx, actor, "verity.test.unrestricted", [{ id: "1", anything: true }]),
    );
    expect(rows[0]).toEqual({ id: "1", anything: true });
  });

  it("applies redaction automatically through the query pipeline", async () => {
    const listJobs: QueryDefinition<Record<string, never>, Array<Record<string, unknown>>> = {
      key: "verity.test.list_jobs",
      entity: ENTITY,
      input: z.object({}),
      handler: async () => [{ id: "1", site: "Depot", billable_rate: 250, margin: 40 }],
    };

    const unprivileged = await executeQuery(actorIn(orgs.hq, tenantRole), listJobs, {});
    expect(unprivileged[0]).toEqual({ id: "1", site: "Depot" });

    const privileged = await executeQuery(actorIn(orgs.hq, supervisorRole), listJobs, {});
    expect(privileged[0]).toMatchObject({ billable_rate: 250 });
    expect("margin" in privileged[0]!).toBe(false);
  });

  it("exposes the scope filter to a query handler", async () => {
    const scopedQuery: QueryDefinition<Record<string, never>, { orgs: string[] }> = {
      key: "verity.test.scoped",
      entity: ENTITY,
      input: z.object({}),
      handler: async (ctx) => ({ orgs: (await ctx.scope()).organizationId.in }),
    };
    const out = await executeQuery(actorIn(orgs.north, regionalRole), scopedQuery, {});
    expect(new Set(out.orgs)).toEqual(new Set([orgs.north, orgs.manchester]));
  });
});
