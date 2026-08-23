import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import {
  ForbiddenError,
  authorize,
  hasPermission,
  resolvePermissions,
} from "@/server/platform/authorization";

/**
 * Authorization gate test.
 *
 * Authority: Spec PLA-AUT-001→003, MET-ACT-002, Bible Synthesis ADOPTED
 * (composite roles). Covers Layer 1 only — row-level and field-level scoping
 * arrive with the command pipeline.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message =
    "authorization.test.ts cannot run: DATABASE_URL is unset, so MET-ACT-002 is NOT verified.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

describeDb("authorization", () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let supervisor: string;
  let technician: string;
  let base: string;
  let foreignRole: string;

  beforeAll(async () => {
    await assertRlsEnforceable();

    await withTenant(tenantA, async (tx) => {
      await tx.tenant.create({ data: { id: tenantA, name: "Tenant A" } });
      base = (await tx.role.create({ data: { tenantId: tenantA, name: "Base" } })).id;
      technician = (await tx.role.create({ data: { tenantId: tenantA, name: "Field Technician" } })).id;
      supervisor = (await tx.role.create({ data: { tenantId: tenantA, name: "Branch Supervisor" } })).id;

      // Supervisor -> Technician -> Base (PLA-AUT-001).
      await tx.roleComposition.create({
        data: { tenantId: tenantA, parentRoleId: supervisor, childRoleId: technician },
      });
      await tx.roleComposition.create({
        data: { tenantId: tenantA, parentRoleId: technician, childRoleId: base },
      });

      await tx.permission.createMany({
        data: [
          { tenantId: tenantA, roleId: base, verb: "Read", entity: "work_order", scope: "Organization" },
          { tenantId: tenantA, roleId: technician, verb: "Edit", entity: "work_order", scope: "Organization" },
          { tenantId: tenantA, roleId: supervisor, verb: "Delete", entity: "work_order", scope: "Tenant" },
          { tenantId: tenantA, roleId: supervisor, verb: "Read", entity: "billable_rate", scope: "Global" },
        ],
      });
    });

    await withTenant(tenantB, async (tx) => {
      await tx.tenant.create({ data: { id: tenantB, name: "Tenant B" } });
      foreignRole = (await tx.role.create({ data: { tenantId: tenantB, name: "B Role" } })).id;
    });
  });

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("flattens a composite role through the whole inheritance chain", async () => {
    const perms = await withTenant(tenantA, (tx) => resolvePermissions(tx, supervisor));
    expect(perms.map((p) => `${p.verb}:${p.entity}`).sort()).toEqual([
      "Delete:work_order",
      "Edit:work_order",
      "Read:work_order",
    ]);
  });

  it("does not leak a parent's permissions down to its child", async () => {
    const perms = await withTenant(tenantA, (tx) => resolvePermissions(tx, technician));
    expect(perms.map((p) => p.verb).sort()).toEqual(["Edit", "Read"]);
    expect(perms.some((p) => p.verb === "Delete")).toBe(false);
  });

  it("resolves a leaf role to its own grants only", async () => {
    const perms = await withTenant(tenantA, (tx) => resolvePermissions(tx, base));
    expect(perms).toHaveLength(1);
    expect(perms[0]?.verb).toBe("Read");
  });

  it("carries the scope through for the later row-level layer", async () => {
    const perms = await withTenant(tenantA, (tx) => resolvePermissions(tx, supervisor));
    expect(perms.find((p) => p.verb === "Delete")?.scope).toBe("Tenant");
    expect(perms.find((p) => p.verb === "Read")?.scope).toBe("Organization");
  });

  it("never returns a Global-scope grant", async () => {
    const perms = await withTenant(tenantA, (tx) => resolvePermissions(tx, supervisor));
    expect(perms.some((p) => p.scope === "Global")).toBe(false);
    expect(perms.some((p) => p.entity === "billable_rate")).toBe(false);
  });

  it("refuses a role that inherits from itself", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.roleComposition.create({
          data: { tenantId: tenantA, parentRoleId: supervisor, childRoleId: supervisor },
        }),
      ),
    ).rejects.toThrow();
  });

  it("refuses a direct inheritance cycle", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.roleComposition.create({
          data: { tenantId: tenantA, parentRoleId: technician, childRoleId: supervisor },
        }),
      ),
    ).rejects.toThrow();
  });

  it("refuses a transitive inheritance cycle", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.roleComposition.create({
          data: { tenantId: tenantA, parentRoleId: base, childRoleId: supervisor },
        }),
      ),
    ).rejects.toThrow();
  });

  it("refuses composition across tenants", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.roleComposition.create({
          data: { tenantId: tenantA, parentRoleId: supervisor, childRoleId: foreignRole },
        }),
      ),
    ).rejects.toThrow();
  });

  it("hides another tenant's roles and permissions", async () => {
    const { roles, perms } = await withTenant(tenantB, async (tx) => ({
      roles: await tx.role.findMany(),
      perms: await tx.permission.findMany(),
    }));
    expect(roles).toHaveLength(1);
    expect(roles[0]?.id).toBe(foreignRole);
    expect(perms).toHaveLength(0);
  });

  it("grants an inherited permission through hasPermission", async () => {
    const allowed = await withTenant(tenantA, (tx) =>
      hasPermission(tx, supervisor, "Read", "work_order"),
    );
    expect(allowed).toBe(true);
  });

  it("denies a permission the role does not hold", async () => {
    const allowed = await withTenant(tenantA, (tx) =>
      hasPermission(tx, base, "Delete", "work_order"),
    );
    expect(allowed).toBe(false);
  });

  it("denies a membership that has no role (fails closed)", async () => {
    const allowed = await withTenant(tenantA, (tx) =>
      hasPermission(tx, null, "Read", "work_order"),
    );
    expect(allowed).toBe(false);
  });

  it("authorize() passes silently when permitted", async () => {
    await expect(
      withTenant(tenantA, (tx) => authorize(tx, technician, "Edit", "work_order")),
    ).resolves.toBeUndefined();
  });

  it("authorize() throws E_FORBIDDEN when not permitted (MET-ACT-002)", async () => {
    await expect(
      withTenant(tenantA, (tx) => authorize(tx, base, "Delete", "work_order")),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const err = await withTenant(tenantA, (tx) =>
      authorize(tx, base, "Delete", "work_order").catch((e: unknown) => e),
    );
    expect((err as ForbiddenError).code).toBe("E_FORBIDDEN");
  });

  it("resolves nothing without a tenant context", async () => {
    const perms = await prisma.$queryRaw<
      { verb: string }[]
    >`SELECT verb FROM verity.resolve_permissions(${supervisor}::uuid)`;
    expect(perms).toHaveLength(0);
  });
});
