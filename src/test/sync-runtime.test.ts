import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache } from "@/server/platform/capability";
import {
  ValidationError,
  clearCommands,
  registerCommand,
  type ActorContext,
  type CommandDefinition,
} from "@/server/platform/command";
import { ConflictError } from "@/server/platform/entity";
import {
  classifyConflict,
  enqueueOfflineCommand,
  mergeFieldLevel,
  replayPending,
  updateWithVersion,
} from "@/server/platform/sync";

/**
 * Offline sync gate test.
 * Authority: Bible V5 §2, REQ-DATA-SYNC-001→002, REQ-DATA-CONFLICTRESOLUTION.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "sync-runtime.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const ENTITY = "verity.test.sync_target";
const CAPABILITY = "verity.capability.sync_test";
const applied: string[] = [];

const renameCmd: CommandDefinition<{ name: string }, { name: string }> = {
  key: "verity.test.sync_rename",
  entity: ENTITY,
  verb: "Edit",
  input: z.object({ name: z.string() }),
  handler: async (ctx, input) => {
    if (input.name === "conflict") {
      throw new ValidationError("E_VALIDATION: shift was cancelled server-side");
    }
    applied.push(input.name);
    await ctx.tx.tenant.update({
      where: { id: ctx.actor.tenantId },
      data: { name: input.name },
    });
    return { result: { name: input.name } };
  },
};

describeDb("offline sync runtime", () => {
  const tenantA = randomUUID();
  let actor: ActorContext;
  let roleId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.capabilityDefinition.create({
        data: { id: CAPABILITY, name: "Sync test", version: "1.0.0", entityTypes: [ENTITY] },
      });
      await admin.entityDefinition.create({
        data: { key: ENTITY, capability: CAPABILITY, class: "Persistent", tableName: "tenant" },
      });
    } finally {
      await admin.$disconnect();
    }

    await withTenant(tenantA, async (tx) => {
      await tx.tenant.create({ data: { id: tenantA, name: "Sync Tenant" } });
      await activateCapability(tx, tenantA, CAPABILITY);
      roleId = (await tx.role.create({ data: { tenantId: tenantA, name: "SyncEditor" } })).id;
      await tx.permission.create({
        data: { tenantId: tenantA, roleId, verb: "Edit", entity: ENTITY, scope: "Tenant" },
      });
    });

    actor = {
      tenantId: tenantA,
      userId: randomUUID(),
      membershipId: randomUUID(),
      organizationId: randomUUID(),
      roleId,
    };
  });

  afterEach(() => {
    clearCommands();
    invalidateCapabilityCache();
    applied.length = 0;
  });

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantA}::uuid`;
      await admin.$executeRaw`DELETE FROM entity_definition WHERE key = ${ENTITY}`;
      await admin.$executeRaw`DELETE FROM capability_definition WHERE id = ${CAPABILITY}`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  const enqueue = (commandId: string, name: string, at: Date, key = renameCmd.key) =>
    withTenant(tenantA, (tx) =>
      enqueueOfflineCommand(tx, {
        tenantId: tenantA,
        commandId,
        commandKey: key,
        actorUserId: actor.userId,
        payload: { name },
        deviceTimestamp: at,
      }),
    );

  it("accepts a command once and treats a retry as a duplicate (Bible V5 §2.B.2)", async () => {
    const id = randomUUID();
    const first = await enqueue(id, "One", new Date("2026-01-01T10:00:00Z"));
    const retry = await enqueue(id, "One", new Date("2026-01-01T10:00:00Z"));
    expect(first.accepted).toBe(true);
    expect(retry.accepted).toBe(false);
    expect(retry.duplicateOf).toBe(first.duplicateOf);

    const rows = await withTenant(tenantA, (tx) =>
      tx.offlineCommand.findMany({ where: { commandId: id } }),
    );
    expect(rows).toHaveLength(1);
  });

  it("replays in deviceTimestamp order, not arrival order (Bible V5 §2.B.3)", async () => {
    registerCommand(renameCmd);
    // Isolate this batch: an earlier test enqueued a command it never replayed,
    // and a shared pending queue would make the ordering assertion depend on
    // test execution order rather than on deviceTimestamp.
    await withTenant(tenantA, (tx) => tx.offlineCommand.deleteMany({ where: { status: "Pending" } }));

    // Enqueued newest-first; must apply oldest-first.
    await enqueue(randomUUID(), "Third", new Date("2026-01-01T12:00:00Z"));
    await enqueue(randomUUID(), "First", new Date("2026-01-01T10:00:00Z"));
    await enqueue(randomUUID(), "Second", new Date("2026-01-01T11:00:00Z"));

    const outcome = await replayPending(tenantA, async () => actor);
    expect(outcome.rejected).toBe(0);
    expect(applied).toEqual(["First", "Second", "Third"]);
  });

  it("marks replayed commands Applied and caches their result", async () => {
    const rows = await withTenant(tenantA, (tx) =>
      tx.offlineCommand.findMany({ where: { status: "Applied" } }),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.result).not.toBeNull();
    expect(rows[0]?.appliedAt).not.toBeNull();
  });

  it("records a sync exception instead of dropping a failed replay (Bible V5 §2.C)", async () => {
    registerCommand(renameCmd);
    await enqueue(randomUUID(), "conflict", new Date("2026-01-02T10:00:00Z"));

    const outcome = await replayPending(tenantA, async () => actor);
    expect(outcome.rejected).toBe(1);

    const exceptions = await withTenant(tenantA, (tx) =>
      tx.syncException.findMany({ where: { resolvedAt: null } }),
    );
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]?.kind).toBe("StateConflict");
    expect(exceptions[0]?.detail).toMatch(/cancelled server-side/);
  });

  it("continues the batch after one command fails", async () => {
    registerCommand(renameCmd);
    await enqueue(randomUUID(), "conflict", new Date("2026-01-03T10:00:00Z"));
    await enqueue(randomUUID(), "Survivor", new Date("2026-01-03T11:00:00Z"));

    const outcome = await replayPending(tenantA, async () => actor);
    expect(outcome.applied).toBe(1);
    expect(outcome.rejected).toBe(1);
    expect(applied).toContain("Survivor");
  });

  it("rejects a command whose key is not registered", async () => {
    await enqueue(randomUUID(), "Orphan", new Date("2026-01-04T10:00:00Z"), "verity.test.gone");
    const outcome = await replayPending(tenantA, async () => actor);
    expect(outcome.rejected).toBe(1);

    const rows = await withTenant(tenantA, (tx) =>
      tx.offlineCommand.findMany({ where: { commandKey: "verity.test.gone" } }),
    );
    expect(rows[0]?.status).toBe("Rejected");
    expect(rows[0]?.error).toMatch(/Unknown command/);
  });

  it("classifies conflicts into the Bible's taxonomy (§2.C)", () => {
    expect(classifyConflict(new ConflictError("x"))).toBe("VersionConflict");
    expect(classifyConflict(new ValidationError("x"))).toBe("StateConflict");
  });

  it("merges edits to different fields and only resolves real collisions", () => {
    const merged = mergeFieldLevel(
      { title: "base", notes: "base", owner: "base" },
      [
        { changes: { title: "from A" }, deviceTimestamp: new Date("2026-01-01T10:00:00Z") },
        { changes: { notes: "from B" }, deviceTimestamp: new Date("2026-01-01T10:05:00Z") },
        { changes: { title: "from C (later)" }, deviceTimestamp: new Date("2026-01-01T11:00:00Z") },
      ],
    );
    // Different fields both survive; the same field goes to the later timestamp.
    expect(merged).toEqual({ title: "from C (later)", notes: "from B", owner: "base" });
  });

  it("keeps an earlier write from overwriting a later one", () => {
    const merged = mergeFieldLevel({ title: "base" }, [
      { changes: { title: "later" }, deviceTimestamp: new Date("2026-01-01T12:00:00Z") },
      { changes: { title: "earlier" }, deviceTimestamp: new Date("2026-01-01T09:00:00Z") },
    ]);
    expect(merged.title).toBe("later");
  });

  it("raises E_CONFLICT when optimistic concurrency loses (Bible V3)", async () => {
    const current = await withTenant(tenantA, (tx) => tx.tenant.findUniqueOrThrow({ where: { id: tenantA } }));

    await withTenant(tenantA, (tx) =>
      updateWithVersion(tx, {
        model: tx.tenant as never,
        id: tenantA,
        expectedVersion: current.version,
        data: { name: "Version Bumped" },
        label: "tenant",
      }),
    );

    await expect(
      withTenant(tenantA, (tx) =>
        updateWithVersion(tx, {
          model: tx.tenant as never,
          id: tenantA,
          expectedVersion: current.version, // stale
          data: { name: "Should Lose" },
          label: "tenant",
        }),
      ),
    ).rejects.toBeInstanceOf(ConflictError);

    const after = await withTenant(tenantA, (tx) => tx.tenant.findUniqueOrThrow({ where: { id: tenantA } }));
    expect(after.name).toBe("Version Bumped");
    expect(after.version).toBe(current.version + 1);
  });
});
