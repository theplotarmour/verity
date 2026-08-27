import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { clearCommands, executeCommand, type ActorContext } from "@/server/platform/command";
import { clearQueries, executeQuery } from "@/server/platform/query";
import { ForbiddenError, clearScopeResolvers } from "@/server/platform/authorization";
import { provisionIdentity } from "@/server/platform/identity";
import { invalidateCapabilityCache } from "@/server/platform/capability";
import {
  ENTITY_MEMBERSHIP,
  ENTITY_ORGANIZATION,
  ENTITY_ROLE,
  ENTITY_TENANT,
  assignRole,
  composeRole,
  createOrganization,
  createRole,
  grantPermission,
  installAdministration,
  invitePerson,
  listPeople,
  listRoles,
  resetAdministrationInstall,
  revokeMembership,
  revokePermission,
  setPersonState,
  setTenantConfiguration,
  updateOrganization,
} from "@/server/platform/administration";
import { OPERATOR_GRANTS, OPERATOR_ROLE_NAME } from "@/server/platform/operator";

/**
 * HQ administration — the contracts behind Workflows A, B and D.
 *
 * These assert the platform half. The browser half is asserted in
 * `e2e/hq.spec.ts`, which walks the same workflows through the interface; a UI
 * test alone would prove a page renders, and this alone would prove a function
 * works. Both are needed and neither substitutes for the other.
 *
 * The load-bearing assertions here are the REFUSALS. A permission system is
 * only as good as what it says no to, and every positive case below has a
 * matching negative one.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "hq-administration.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

describeDb("HQ administration", () => {
  const clientA = randomUUID();
  const clientB = randomUUID();

  let rootOrgA: string;
  let rootOrgB: string;
  let operatorInA: ActorContext;
  let operatorInB: ActorContext;
  let plainUserInA: ActorContext;

  beforeAll(async () => {
    await assertRlsEnforceable();
    clearCommands();
    clearQueries();
    clearScopeResolvers();
    resetAdministrationInstall();
    installAdministration();

    for (const [tenantId, label] of [
      [clientA, "Admin Client A"],
      [clientB, "Admin Client B"],
    ] as const) {
      await withTenant(tenantId, async (tx) => {
        await tx.tenant.create({ data: { id: tenantId, name: label } });
        const org = await tx.organization.create({
          data: { tenantId, name: `${label} Root` },
          select: { id: true },
        });

        // The operator role, built exactly as `operatorRoleFor` builds it. Not
        // imported from there because that function needs a live session; the
        // grants themselves are the shared truth and are imported.
        const operatorRole = await tx.role.create({
          data: { tenantId, name: OPERATOR_ROLE_NAME },
          select: { id: true },
        });
        await tx.permission.createMany({
          data: OPERATOR_GRANTS.map((grant) => ({
            tenantId,
            roleId: operatorRole.id,
            verb: grant.verb,
            entity: grant.entity,
            scope: "Tenant" as const,
          })),
        });

        const identity = await provisionIdentity(tx, {
          organizationId: org.id,
          authUserId: randomUUID(),
          displayName: "Operator",
        });
        await tx.tenantMembership.update({
          where: { id: identity.membershipId },
          data: { roleId: operatorRole.id },
        });

        const actor: ActorContext = {
          tenantId,
          userId: identity.userId,
          membershipId: identity.membershipId,
          organizationId: org.id,
          roleId: operatorRole.id,
        };

        if (tenantId === clientA) {
          rootOrgA = org.id;
          operatorInA = actor;

          // An ordinary member of client A: a real role with a real grant, but
          // nothing administrative. This is the actor Workflow D is about.
          const plainRole = await tx.role.create({
            data: { tenantId, name: "Ordinary" },
            select: { id: true },
          });
          await tx.permission.create({
            data: {
              tenantId,
              roleId: plainRole.id,
              verb: "Read",
              entity: "verity.asset.asset",
              scope: "Tenant",
            },
          });
          const plain = await provisionIdentity(tx, {
            organizationId: org.id,
            authUserId: randomUUID(),
            displayName: "Ordinary Person",
          });
          await tx.tenantMembership.update({
            where: { id: plain.membershipId },
            data: { roleId: plainRole.id },
          });
          plainUserInA = {
            tenantId,
            userId: plain.userId,
            membershipId: plain.membershipId,
            organizationId: org.id,
            roleId: plainRole.id,
          };
        } else {
          rootOrgB = org.id;
          operatorInB = actor;
        }
      });
    }
    invalidateCapabilityCache();
  });

  afterAll(async () => {
    clearCommands();
    clearQueries();
    clearScopeResolvers();
    resetAdministrationInstall();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id IN (${clientA}::uuid, ${clientB}::uuid)`;
      await admin.$executeRaw`DELETE FROM "user" WHERE id NOT IN (SELECT user_id FROM tenant_membership)`;
      await admin.$executeRaw`DELETE FROM party WHERE id NOT IN (SELECT party_id FROM "user")`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  /* ------------------------------ Workflow A ------------------------------ */

  it("invites a person, assigns a role, and grants them exactly what the role holds", async () => {
    const role = await executeCommand(operatorInA, createRole, { name: "Depot Supervisor" });
    await executeCommand(operatorInA, grantPermission, {
      roleId: role.id,
      verb: "Read",
      entity: "verity.location.location",
      scope: "Organization",
    });

    const invited = await executeCommand(operatorInA, invitePerson, {
      displayName: "Priya Raman",
      email: "priya@example.test",
      organizationId: rootOrgA,
      roleId: role.id,
    });

    const people = await executeQuery(operatorInA, listPeople, {});
    const person = people.find((p) => p.membershipId === invited.membershipId);
    expect(person?.displayName).toBe("Priya Raman");
    expect(person?.roleName).toBe("Depot Supervisor");
    // Invited, not Active: the lifecycle starts before the person ever signs in
    // (Bible V2 Primitive 2 §3), and pretending otherwise would make "who has
    // actually turned up" unanswerable.
    expect(person?.state).toBe("Invited");
  });

  it("removes access by clearing the role, without removing the person", async () => {
    const invited = await executeCommand(operatorInA, invitePerson, {
      displayName: "Temporary Cover",
      organizationId: rootOrgA,
    });

    await executeCommand(operatorInA, assignRole, {
      membershipId: invited.membershipId,
      roleId: null,
    });

    const people = await executeQuery(operatorInA, listPeople, {});
    const person = people.find((p) => p.membershipId === invited.membershipId);
    // A membership with no role grants nothing — access is gone, the person is
    // not.
    expect(person).toBeDefined();
    expect(person?.roleId).toBeNull();
  });

  it("suspends and restores a person without touching their membership", async () => {
    const invited = await executeCommand(operatorInA, invitePerson, {
      displayName: "On Leave",
      organizationId: rootOrgA,
    });

    await executeCommand(operatorInA, setPersonState, {
      membershipId: invited.membershipId,
      state: "Suspended",
    });
    let people = await executeQuery(operatorInA, listPeople, {});
    expect(people.find((p) => p.membershipId === invited.membershipId)?.state).toBe("Suspended");

    await executeCommand(operatorInA, setPersonState, {
      membershipId: invited.membershipId,
      state: "Active",
    });
    people = await executeQuery(operatorInA, listPeople, {});
    expect(people.find((p) => p.membershipId === invited.membershipId)?.state).toBe("Active");
  });

  it("revokes a membership and records why", async () => {
    const invited = await executeCommand(operatorInA, invitePerson, {
      displayName: "Left The Company",
      organizationId: rootOrgA,
    });

    await executeCommand(operatorInA, revokeMembership, { membershipId: invited.membershipId });

    const people = await executeQuery(operatorInA, listPeople, {});
    expect(people.some((p) => p.membershipId === invited.membershipId)).toBe(false);

    const events = await withTenant(clientA, (tx) =>
      tx.securityAuditEvent.findMany({ where: { eventType: "PermissionRevoked" } }),
    );
    expect(events.length).toBeGreaterThan(0);
  });

  it("refuses to let an operator revoke their own membership", async () => {
    await expect(
      executeCommand(operatorInA, revokeMembership, { membershipId: operatorInA.membershipId }),
    ).rejects.toThrow(/your own membership/);
  });

  /* ------------------------------ roles ---------------------------------- */

  it("resolves composed permissions the way the checker will see them", async () => {
    const parent = await executeCommand(operatorInA, createRole, { name: "Regional Manager" });
    const child = await executeCommand(operatorInA, createRole, { name: "Regional Reader" });

    await executeCommand(operatorInA, grantPermission, {
      roleId: child.id,
      verb: "Read",
      entity: "verity.evidence.evidence",
      scope: "Tenant",
    });
    await executeCommand(operatorInA, composeRole, {
      parentRoleId: parent.id,
      childRoleId: child.id,
      attach: true,
    });

    const roles = await executeQuery(operatorInA, listRoles, {});
    const resolved = roles.find((r) => r.id === parent.id);

    // The parent holds nothing directly and everything the child holds. That
    // gap is the whole reason the screen shows both.
    expect(resolved?.directGrants).toHaveLength(0);
    expect(
      resolved?.resolvedGrants.some((g) => g.entity === "verity.evidence.evidence"),
    ).toBe(true);
  });

  it("refuses a self-composing role", async () => {
    const role = await executeCommand(operatorInA, createRole, { name: "Self Referential" });
    await expect(
      executeCommand(operatorInA, composeRole, {
        parentRoleId: role.id,
        childRoleId: role.id,
        attach: true,
      }),
    ).rejects.toThrow(/cannot inherit from itself/);
  });

  it("refuses a duplicate grant rather than silently creating two", async () => {
    const role = await executeCommand(operatorInA, createRole, { name: "Duplicate Test" });
    const input = {
      roleId: role.id,
      verb: "Read" as const,
      entity: "verity.asset.asset",
      scope: "Tenant" as const,
    };
    await executeCommand(operatorInA, grantPermission, input);
    await expect(executeCommand(operatorInA, grantPermission, input)).rejects.toThrow(
      /already exists/,
    );
  });

  it("revokes a grant and the resolved set shrinks with it", async () => {
    const role = await executeCommand(operatorInA, createRole, { name: "Revocable" });
    const granted = await executeCommand(operatorInA, grantPermission, {
      roleId: role.id,
      verb: "Edit",
      entity: "verity.asset.asset",
      scope: "Tenant",
    });

    await executeCommand(operatorInA, revokePermission, { permissionId: granted.id });

    const roles = await executeQuery(operatorInA, listRoles, {});
    expect(roles.find((r) => r.id === role.id)?.resolvedGrants).toHaveLength(0);
  });

  /* --------------------------- organizations ------------------------------ */

  it("builds a hierarchy and refuses a move that would swallow its own subtree", async () => {
    const parent = await executeCommand(operatorInA, createOrganization, { name: "North Region" });
    const child = await executeCommand(operatorInA, createOrganization, {
      name: "North Depot",
      parentId: parent.id,
    });

    await expect(
      executeCommand(operatorInA, updateOrganization, {
        organizationId: parent.id,
        parentId: child.id,
      }),
    ).rejects.toThrow(/inside itself/);

    // The legitimate move still works, so the guard is not simply refusing
    // everything.
    const sibling = await executeCommand(operatorInA, createOrganization, { name: "South Region" });
    await executeCommand(operatorInA, updateOrganization, {
      organizationId: child.id,
      parentId: sibling.id,
    });
  });

  /* --------------------------- configuration ------------------------------ */

  it("sets and clears tenant configuration, and clearing is not the same as empty", async () => {
    await executeCommand(operatorInA, setTenantConfiguration, {
      key: "probe.example_setting",
      value: "14",
    });
    let rows = await withTenant(clientA, (tx) =>
      tx.configParameter.findMany({ where: { key: "probe.example_setting" } }),
    );
    expect(rows).toHaveLength(1);

    await executeCommand(operatorInA, setTenantConfiguration, {
      key: "probe.example_setting",
      value: null,
    });
    rows = await withTenant(clientA, (tx) =>
      tx.configParameter.findMany({ where: { key: "probe.example_setting" } }),
    );
    expect(rows).toHaveLength(0);
  });

  /* ------------------------------ Workflow D ------------------------------ */

  it("refuses every administrative command to an ordinary tenant user", async () => {
    // Thunks, not promises. Creating four rejecting promises up front leaves
    // three of them unhandled while the first is awaited, which surfaces as an
    // unhandled rejection and makes a passing run look broken.
    const attempts: Array<() => Promise<unknown>> = [
      () => executeCommand(plainUserInA, createRole, { name: "Should Not Exist" }),
      () => executeCommand(plainUserInA, createOrganization, { name: "Should Not Exist" }),
      () =>
        executeCommand(plainUserInA, invitePerson, {
          displayName: "Should Not Exist",
          organizationId: rootOrgA,
        }),
      () => executeCommand(plainUserInA, setTenantConfiguration, { key: "x", value: "y" }),
    ];

    for (const attempt of attempts) {
      await expect(attempt()).rejects.toBeInstanceOf(ForbiddenError);
    }

    // And nothing leaked: the refusal is not a partial success.
    const roles = await withTenant(clientA, (tx) =>
      tx.role.findMany({ where: { name: "Should Not Exist" } }),
    );
    expect(roles).toHaveLength(0);
  });

  it("refuses administrative READS to an ordinary tenant user", async () => {
    // Denial covers queries too. A user who cannot administer people should not
    // be able to enumerate them either — the read is where the leak would be.
    await expect(executeQuery(plainUserInA, listPeople, {})).rejects.toBeInstanceOf(ForbiddenError);
    await expect(executeQuery(plainUserInA, listRoles, {})).rejects.toBeInstanceOf(ForbiddenError);
  });

  /* ------------------------------ Workflow C ------------------------------ */

  it("shows an operator only the client they are administering", async () => {
    const inA = await executeQuery(operatorInA, listPeople, {});
    const inB = await executeQuery(operatorInB, listPeople, {});

    // Same person, same authority, two clients — and no row crosses. Not
    // because the query filters, but because each ran inside one tenant scope.
    const namesInA = new Set(inA.map((p) => p.displayName));
    expect(inA.length).toBeGreaterThan(0);
    expect(inB.every((p) => !namesInA.has(p.displayName) || p.displayName === "Operator")).toBe(true);

    const orgsInB = await executeQuery(operatorInB, listPeople, {});
    expect(orgsInB.every((p) => p.organizationId === rootOrgB)).toBe(true);
  });

  it("cannot reach client B's records with an actor scoped to client A", async () => {
    // The actor is the operator's own A context; the id belongs to B. RLS
    // decides, not the query.
    const found = await withTenant(clientA, (tx) =>
      tx.organization.findMany({ where: { id: rootOrgB } }),
    );
    expect(found).toHaveLength(0);
  });

  /* --------------------------- entity key hygiene -------------------------- */

  it("administers through the four platform entity keys the operator role grants", () => {
    // A drift check rather than a behaviour one: if a command starts using an
    // entity the operator role does not grant, every HQ page for it fails with
    // E_FORBIDDEN at runtime and nothing else would catch it.
    const granted = new Set(OPERATOR_GRANTS.map((g) => g.entity));
    for (const entity of [ENTITY_TENANT, ENTITY_ORGANIZATION, ENTITY_MEMBERSHIP, ENTITY_ROLE]) {
      expect(granted.has(entity)).toBe(true);
    }
  });
});
