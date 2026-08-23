import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { ForbiddenError } from "@/server/platform/authorization";
import { provisionIdentity } from "@/server/platform/identity";
import {
  ValidationError,
  clearHooks,
  executeCommand,
  registerHook,
  type ActorContext,
  type CommandDefinition,
} from "@/server/platform/command";
import { executeQuery, type QueryDefinition } from "@/server/platform/query";

/**
 * Command/query pipeline gate test.
 * Authority: MET-ACT-001→004, PLA-EXT-004.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "command-runtime.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const ENTITY = "verity.test.widget";

/** A command that renames a Tenant — a real mutation on a real table. */
const renameTenant: CommandDefinition<{ name: string }, { name: string }> = {
  key: "verity.test.rename_tenant",
  entity: ENTITY,
  verb: "Edit",
  input: z.object({ name: z.string().min(3) }),
  preconditions: async (_ctx, input) => {
    if (input.name === "forbidden-name") {
      throw new ValidationError("E_VALIDATION: name is reserved");
    }
  },
  handler: async (ctx, input) => {
    const updated = await ctx.tx.tenant.update({
      where: { id: ctx.actor.tenantId },
      data: { name: input.name },
    });
    return {
      result: { name: updated.name },
      events: [{ name: "verity.test.tenant_renamed", entityId: updated.id, payload: { name: input.name } }],
    };
  },
};

const readTenant: QueryDefinition<Record<string, never>, string | undefined> = {
  key: "verity.test.read_tenant",
  entity: ENTITY,
  input: z.object({}),
  handler: async (ctx) => {
    const t = await ctx.tx.tenant.findFirst();
    return t?.name;
  },
};

describeDb("command and query runtime", () => {
  const tenantA = randomUUID();
  let actor: ActorContext;
  let editorRole: string;
  let readerRole: string;

  beforeAll(async () => {
    await assertRlsEnforceable();

    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.entityDefinition.create({
        data: { key: ENTITY, capability: "test", class: "Persistent", tableName: "tenant" },
      });
    } finally {
      await admin.$disconnect();
    }

    await withTenant(tenantA, async (tx) => {
      await tx.tenant.create({ data: { id: tenantA, name: "Original" } });
      const org = await tx.organization.create({ data: { tenantId: tenantA, name: "HQ" } });

      editorRole = (await tx.role.create({ data: { tenantId: tenantA, name: "Editor" } })).id;
      readerRole = (await tx.role.create({ data: { tenantId: tenantA, name: "Reader" } })).id;
      await tx.permission.createMany({
        data: [
          { tenantId: tenantA, roleId: editorRole, verb: "Edit", entity: ENTITY, scope: "Tenant" },
          { tenantId: tenantA, roleId: readerRole, verb: "Read", entity: ENTITY, scope: "Tenant" },
        ],
      });

      const identity = await provisionIdentity(tx, {
        organizationId: org.id,
        authUserId: randomUUID(),
        displayName: "Operator",
      });
      await tx.tenantMembership.update({
        where: { id: identity.membershipId },
        data: { roleId: editorRole },
      });

      actor = {
        tenantId: tenantA,
        userId: identity.userId,
        membershipId: identity.membershipId,
        organizationId: org.id,
        roleId: editorRole,
      };
    });
  });

  afterEach(() => clearHooks());

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantA}::uuid`;
      await admin.$executeRaw`DELETE FROM entity_definition WHERE key = ${ENTITY}`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("runs a command end to end and returns its result", async () => {
    const out = await executeCommand(actor, renameTenant, { name: "Renamed One" });
    expect(out.name).toBe("Renamed One");
  });

  it("records the event on commit (MET-ACT-004)", async () => {
    await executeCommand(actor, renameTenant, { name: "Renamed Two" });
    const events = await withTenant(tenantA, (tx) =>
      tx.domainEvent.findMany({ where: { name: "verity.test.tenant_renamed" } }),
    );
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.commandKey).toBe(renameTenant.key);
    expect(events[0]?.actorUserId).toBe(actor.userId);
  });

  it("rejects input that fails the schema (MET-ACT-001)", async () => {
    await expect(executeCommand(actor, renameTenant, { name: "no" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects an unauthorized actor with E_FORBIDDEN (MET-ACT-002)", async () => {
    const reader = { ...actor, roleId: readerRole };
    await expect(
      executeCommand(reader, renameTenant, { name: "Should Not Apply" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("denies an actor with no role at all (fails closed)", async () => {
    await expect(
      executeCommand({ ...actor, roleId: null }, renameTenant, { name: "Nope At All" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rolls the mutation back when a precondition fails (MET-ACT-003)", async () => {
    const before = await withTenant(tenantA, (tx) => tx.tenant.findFirst());
    await expect(
      executeCommand(actor, renameTenant, { name: "forbidden-name" }),
    ).rejects.toBeInstanceOf(ValidationError);
    const after = await withTenant(tenantA, (tx) => tx.tenant.findFirst());
    expect(after?.name).toBe(before?.name);
  });

  it("emits no event when the command fails", async () => {
    const countBefore = await withTenant(tenantA, (tx) => tx.domainEvent.count());
    await expect(
      executeCommand(actor, renameTenant, { name: "forbidden-name" }),
    ).rejects.toBeInstanceOf(ValidationError);
    const countAfter = await withTenant(tenantA, (tx) => tx.domainEvent.count());
    expect(countAfter).toBe(countBefore);
  });

  it("rolls back the mutation AND the event when a before_save hook throws (PLA-EXT-004)", async () => {
    const before = await withTenant(tenantA, (tx) => tx.tenant.findFirst());
    const eventsBefore = await withTenant(tenantA, (tx) => tx.domainEvent.count());

    registerHook(renameTenant.key, "before_save", async () => {
      throw new Error("hook veto");
    });

    await expect(executeCommand(actor, renameTenant, { name: "Hook Blocked" })).rejects.toThrow(
      /hook veto/,
    );

    const after = await withTenant(tenantA, (tx) => tx.tenant.findFirst());
    const eventsAfter = await withTenant(tenantA, (tx) => tx.domainEvent.count());
    expect(after?.name).toBe(before?.name);
    expect(eventsAfter).toBe(eventsBefore);
  });

  it("runs hooks in pipeline order", async () => {
    const seen: string[] = [];
    registerHook(renameTenant.key, "before_validate", async () => void seen.push("before_validate"));
    registerHook(renameTenant.key, "before_save", async () => void seen.push("before_save"));
    registerHook(renameTenant.key, "after_save", async () => void seen.push("after_save"));

    await executeCommand(actor, renameTenant, { name: "Hook Ordered" });
    expect(seen).toEqual(["before_validate", "before_save", "after_save"]);
  });

  it("does not undo a committed command when an after_save hook throws", async () => {
    registerHook(renameTenant.key, "after_save", async () => {
      throw new Error("post-commit failure");
    });
    await expect(executeCommand(actor, renameTenant, { name: "Committed Anyway" })).rejects.toThrow(
      /post-commit failure/,
    );
    const after = await withTenant(tenantA, (tx) => tx.tenant.findFirst());
    expect(after?.name).toBe("Committed Anyway");
  });

  it("runs a query and returns current state", async () => {
    await executeCommand(actor, renameTenant, { name: "Queryable" });
    const name = await executeQuery({ ...actor, roleId: readerRole }, readTenant, {});
    expect(name).toBe("Queryable");
  });

  it("refuses a query the actor may not read", async () => {
    const noPerms = { ...actor, roleId: null };
    await expect(executeQuery(noPerms, readTenant, {})).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("keeps recorded events immutable", async () => {
    await executeCommand(actor, renameTenant, { name: "Immutable Check" });
    const event = await withTenant(tenantA, (tx) => tx.domainEvent.findFirst());
    expect(event).not.toBeNull();
    await expect(
      withTenant(tenantA, (tx) =>
        tx.domainEvent.update({ where: { id: event!.id }, data: { name: "tampered" } }),
      ),
    ).rejects.toThrow();
    await expect(
      withTenant(tenantA, (tx) => tx.domainEvent.delete({ where: { id: event!.id } })),
    ).rejects.toThrow();
  });
});
