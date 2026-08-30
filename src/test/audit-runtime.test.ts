import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import type { ActorContext, CommandContext } from "@/server/platform/command";
import {
  diffFields,
  entityHistory,
  recordActivity,
  recordSecurityEvent,
} from "@/server/platform/audit";

/**
 * Audit gate test.
 * Authority: EXE-AUD-001→003, MET-EVE-001.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "audit-runtime.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const ENTITY = "verity.test.audited";

describeDb("audit runtime", () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const subjectId = randomUUID();
  let actor: ActorContext;
  const ctxFor = (tx: CommandContext["tx"]): CommandContext => ({
    actor,
    tx,
    correlationId: randomUUID(),
    channel: "api",
  });

  beforeAll(async () => {
    await assertRlsEnforceable();
    for (const id of [tenantA, tenantB]) {
      await withTenant(id, (tx) => tx.tenant.create({ data: { id, name: `T-${id.slice(0, 4)}` } }));
    }
    actor = {
      tenantId: tenantA,
      userId: randomUUID(),
      membershipId: randomUUID(),
      organizationId: randomUUID(),
      roleId: null,
    };
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

  it("reports only fields that actually changed", () => {
    const changes = diffFields(
      { name: "before", count: 1, note: "same" },
      { name: "after", count: 2, note: "same" },
    );
    expect(changes.map((c) => c.field).sort()).toEqual(["count", "name"]);
  });

  it("produces no entry when a field is rewritten with its existing value", () => {
    expect(diffFields({ name: "x" }, { name: "x" })).toHaveLength(0);
  });

  it("ignores bookkeeping columns by default", () => {
    const changes = diffFields(
      { name: "a", version: 1, updatedAt: new Date("2020-01-01") },
      { name: "a", version: 2, updatedAt: new Date("2026-01-01") },
    );
    expect(changes).toHaveLength(0);
  });

  it("writes field-level history to the operational stream (EXE-AUD-001)", async () => {
    await withTenant(tenantA, (tx) =>
      recordActivity(ctxFor(tx), {
        entityKey: ENTITY,
        entityId: subjectId,
        commandKey: "verity.test.update",
        changes: diffFields({ status: "draft" }, { status: "active" }),
      }),
    );

    const history = await withTenant(tenantA, (tx) => entityHistory(tx, ENTITY, subjectId));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      fieldChanged: "status",
      oldValue: "draft",
      newValue: "active",
      commandKey: "verity.test.update",
      actorUserId: actor.userId,
    });
  });

  it("records a null old value for a newly set field", async () => {
    const id = randomUUID();
    await withTenant(tenantA, (tx) =>
      recordActivity(ctxFor(tx), {
        entityKey: ENTITY,
        entityId: id,
        changes: diffFields({}, { note: "first value" }),
      }),
    );
    const history = await withTenant(tenantA, (tx) => entityHistory(tx, ENTITY, id));
    expect(history[0]?.oldValue).toBeNull();
    expect(history[0]?.newValue).toBe("first value");
  });

  it("refuses to rewrite an activity row (EXE-AUD-003)", async () => {
    const row = await withTenant(tenantA, (tx) => tx.activity.findFirstOrThrow());
    await expect(
      withTenant(tenantA, (tx) =>
        tx.activity.update({ where: { id: row.id }, data: { newValue: "tampered" } }),
      ),
    ).rejects.toThrow();
  });

  it("refuses to delete an activity row (EXE-AUD-003)", async () => {
    const row = await withTenant(tenantA, (tx) => tx.activity.findFirstOrThrow());
    await expect(
      withTenant(tenantA, (tx) => tx.activity.delete({ where: { id: row.id } })),
    ).rejects.toThrow();
  });

  it("refuses to rewrite an activity row even for a BYPASSRLS role (EXE-AUD-003)", async () => {
    // RLS alone would not stop this role, so the trigger has to. Content is
    // immutable for everyone: there is no legitimate reason to rewrite an audit
    // row, and a privileged path to do so would make the whole trail deniable.
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await expect(
        admin.$executeRaw`UPDATE activity SET new_value = 'tampered' WHERE entity_key = ${ENTITY}`,
      ).rejects.toThrow(/append-only/);
    } finally {
      await admin.$disconnect();
    }
  });

  it("permits deletion only through the privileged retention path (EXE-AUD-002)", async () => {
    // The application can never erase its own trail. RLS defines no DELETE
    // policy for these tables, so the statement matches no rows at all and the
    // trigger is never even reached — the rows survive.
    const before = await withTenant(tenantA, (tx) => tx.activity.count({ where: { entityKey: ENTITY } }));
    const attempt = await withTenant(tenantA, (tx) =>
      tx.activity.deleteMany({ where: { entityKey: ENTITY } }),
    );
    expect(attempt.count).toBe(0);
    const after = await withTenant(tenantA, (tx) => tx.activity.count({ where: { entityKey: ENTITY } }));
    expect(after).toBe(before);
    expect(after).toBeGreaterThan(0);

    // ...but a retention window implies eventual pruning, so a privileged role can.
    const id = randomUUID();
    await withTenant(tenantA, (tx) =>
      recordActivity(ctxFor(tx), {
        entityKey: "verity.test.prunable",
        entityId: id,
        changes: diffFields({}, { note: "expired" }),
      }),
    );
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      const pruned = await admin.$executeRaw`
        DELETE FROM activity WHERE entity_key = 'verity.test.prunable'`;
      expect(pruned).toBe(1);
    } finally {
      await admin.$disconnect();
    }
  });

  it("writes and reads the security stream (EXE-AUD-002)", async () => {
    await withTenant(tenantA, (tx) =>
      recordSecurityEvent(tx, {
        tenantId: tenantA,
        eventType: "RoleAssigned",
        actorUserId: actor.userId,
        ipAddress: "203.0.113.9",
        payload: { role: "Supervisor" },
      }),
    );
    const events = await withTenant(tenantA, (tx) => tx.securityAuditEvent.findMany());
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("RoleAssigned");
    expect(events[0]?.ipAddress).toBe("203.0.113.9");
  });

  it("refuses to rewrite a security audit row", async () => {
    const row = await withTenant(tenantA, (tx) => tx.securityAuditEvent.findFirstOrThrow());
    await expect(
      withTenant(tenantA, (tx) =>
        tx.securityAuditEvent.update({ where: { id: row.id }, data: { ipAddress: "0.0.0.0" } }),
      ),
    ).rejects.toThrow();
  });

  it("leaves recorded events intact when the application tries to delete them (MET-EVE-001)", async () => {
    // Self-contained: the fact this test protects is created here, not borrowed
    // from another test's ordering.
    await withTenant(tenantA, (tx) =>
      tx.domainEvent.create({
        data: { tenantId: tenantA, name: "verity.test.undeletable", entityKey: ENTITY, entityId: subjectId },
      }),
    );
    const before = await withTenant(tenantA, (tx) =>
      tx.domainEvent.count({ where: { entityKey: ENTITY } }),
    );
    const attempt = await withTenant(tenantA, (tx) =>
      tx.domainEvent.deleteMany({ where: { entityKey: ENTITY } }),
    );
    expect(attempt.count).toBe(0);
    const after = await withTenant(tenantA, (tx) =>
      tx.domainEvent.count({ where: { entityKey: ENTITY } }),
    );
    expect(after).toBe(before);
    expect(after).toBeGreaterThan(0);
  });

  it("keeps one tenant's audit trail invisible to another", async () => {
    const seenActivity = await withTenant(tenantB, (tx) => tx.activity.findMany());
    const seenSecurity = await withTenant(tenantB, (tx) => tx.securityAuditEvent.findMany());
    expect(seenActivity).toHaveLength(0);
    expect(seenSecurity).toHaveLength(0);
  });

  it("hides the audit trail from an unscoped connection", async () => {
    expect(await prisma.activity.findMany()).toHaveLength(0);
    expect(await prisma.securityAuditEvent.findMany()).toHaveLength(0);
  });

  it("lets the dispatcher stamp delivery but not rewrite the fact (MET-EVE-001)", async () => {
    await withTenant(tenantA, (tx) =>
      tx.domainEvent.create({
        data: { tenantId: tenantA, name: "verity.test.fact", entityKey: ENTITY, entityId: subjectId },
      }),
    );
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      const marked = await admin.$executeRaw`
        UPDATE domain_event SET delivered_at = now() WHERE entity_key = ${ENTITY}`;
      expect(marked).toBeGreaterThan(0);

      await expect(
        admin.$executeRaw`UPDATE domain_event SET name = 'tampered' WHERE entity_key = ${ENTITY}`,
      ).rejects.toThrow(/write-once/);
    } finally {
      await admin.$disconnect();
    }
  });
});
