import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { provisionIdentity } from "@/server/platform/identity";
import {
  registerCommand,
  clearCommands,
  type ActorContext,
  type CommandDefinition,
} from "@/server/platform/command";
import { registerQuery, clearQueries, type QueryDefinition } from "@/server/platform/query";
import { activateCapability, suspendCapability, invalidateCapabilityCache } from "@/server/platform/capability";
import { buildToolManifest } from "@/server/platform/tool-manifest";

/**
 * Tool-manifest test.
 * Authority: taskplans/84_verity_ai_agent_system.md areas 1 and 3.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "tool-manifest.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const ENTITY = "verity.test.manifest_widget";
const CAPABILITY = "verity.capability.manifest_test";

const doThing: CommandDefinition<{ note: string }, { note: string }> = {
  key: "verity.test.manifest_do_thing",
  entity: ENTITY,
  verb: "Edit",
  description: "Do the test thing.",
  impact: "destructive",
  input: z.object({ note: z.string() }),
  handler: async (ctx, input) => {
    const updated = await ctx.tx.tenant.update({
      where: { id: ctx.actor.tenantId },
      data: { name: input.note },
    });
    return { result: { note: updated.name } };
  },
};

const readThing: QueryDefinition<Record<string, never>, string | undefined> = {
  key: "verity.test.manifest_read_thing",
  entity: ENTITY,
  description: "Read the test thing.",
  input: z.object({}),
  handler: async (ctx) => (await ctx.tx.tenant.findFirst())?.name,
};

describeDb("tool manifest", () => {
  const tenantA = randomUUID();
  let editorActor: ActorContext;
  let readerActor: ActorContext;
  let noRoleActor: ActorContext;
  let editorRole: string;
  let readerRole: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    registerCommand(doThing);
    registerQuery(readThing);

    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.capabilityDefinition.create({
        data: { id: CAPABILITY, name: "Tool manifest test", version: "1.0.0", entityTypes: [ENTITY] },
      });
      await admin.entityDefinition.create({
        data: { key: ENTITY, capability: CAPABILITY, class: "Persistent", tableName: "tenant" },
      });
    } finally {
      await admin.$disconnect();
    }

    await withTenant(tenantA, async (tx) => {
      await tx.tenant.create({ data: { id: tenantA, name: "Manifest Fixture" } });
      await activateCapability(tx, tenantA, CAPABILITY);
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
        displayName: "Manifest Operator",
      });
      const base = {
        tenantId: tenantA,
        userId: identity.userId,
        membershipId: identity.membershipId,
        organizationId: org.id,
      };
      await tx.tenantMembership.update({
        where: { id: identity.membershipId },
        data: { roleId: editorRole },
      });
      editorActor = { ...base, roleId: editorRole };
      readerActor = { ...base, roleId: readerRole };
      noRoleActor = { ...base, roleId: null };
    });
  });

  afterAll(async () => {
    clearCommands();
    clearQueries();
    invalidateCapabilityCache();

    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantA}::uuid`;
      await admin.$executeRaw`DELETE FROM entity_definition WHERE key = ${ENTITY}`;
      await admin.$executeRaw`DELETE FROM capability_definition WHERE id = ${CAPABILITY}`;
      if (editorActor?.userId) {
        await admin.$executeRaw`DELETE FROM "user" WHERE id = ${editorActor.userId}::uuid`;
      }
      await admin.$executeRaw`DELETE FROM party WHERE id NOT IN (SELECT party_id FROM "user")`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("includes the command and query for an actor whose role grants them", async () => {
    const tools = await withTenant(tenantA, (tx) => buildToolManifest(tx, editorActor));
    const keys = tools.map((t) => t.key);
    expect(keys).toContain(doThing.key);
    // Editor holds Edit, not Read, on the entity — the query needs Read.
    expect(keys).not.toContain(readThing.key);
  });

  it("excludes the command for an actor whose role doesn't grant it, includes the query for one that does", async () => {
    const tools = await withTenant(tenantA, (tx) => buildToolManifest(tx, readerActor));
    const keys = tools.map((t) => t.key);
    expect(keys).not.toContain(doThing.key);
    expect(keys).toContain(readThing.key);
  });

  it("excludes everything for an actor with no role at all (fails closed)", async () => {
    const tools = await withTenant(tenantA, (tx) => buildToolManifest(tx, noRoleActor));
    const keys = tools.map((t) => t.key);
    expect(keys).not.toContain(doThing.key);
    expect(keys).not.toContain(readThing.key);
  });

  it("excludes both once the capability is suspended, even for the editor", async () => {
    await withTenant(tenantA, (tx) => suspendCapability(tx, tenantA, CAPABILITY));
    invalidateCapabilityCache();
    const tools = await withTenant(tenantA, (tx) => buildToolManifest(tx, editorActor));
    expect(tools.map((t) => t.key)).not.toContain(doThing.key);
    // Reactivate so this test isn't order-dependent on the ones above/after it.
    await withTenant(tenantA, (tx) => activateCapability(tx, tenantA, CAPABILITY));
    invalidateCapabilityCache();
  });

  it("carries description, impact, and a real JSON Schema for the input", async () => {
    const tools = await withTenant(tenantA, (tx) => buildToolManifest(tx, editorActor));
    const tool = tools.find((t) => t.key === doThing.key);
    expect(tool?.description).toBe("Do the test thing.");
    expect(tool?.impact).toBe("destructive");
    expect(tool?.kind).toBe("command");
    expect(tool?.inputSchema).toMatchObject({
      type: "object",
      properties: { note: { type: "string" } },
    });
  });

  it("leaves impact undefined on a query — the field only applies to commands", async () => {
    const tools = await withTenant(tenantA, (tx) => buildToolManifest(tx, readerActor));
    const tool = tools.find((t) => t.key === readThing.key);
    expect(tool?.kind).toBe("query");
    expect(tool?.impact).toBeUndefined();
  });
});
