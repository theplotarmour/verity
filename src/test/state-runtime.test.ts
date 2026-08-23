import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { ValidationError, type ActorContext, type CommandContext } from "@/server/platform/command";
import {
  assertMutable,
  assertTransitionAllowed,
  clearTransitionGuards,
  initialState,
  registerTransitionGuard,
  statusLabel,
  transition,
} from "@/server/platform/state";

/**
 * State runtime gate test.
 * Authority: MET-STA-001→004, MET-TRA-001→004, INV-002.
 *
 * The fixture models the Party lifecycle from Bible V2 Primitive 2 §3/§5:
 * Invited -> Active -> Suspended -> Archived.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "state-runtime.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const ENTITY = "verity.test.lifecycle";

describeDb("state runtime", () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const subjectId = randomUUID();
  let actor: ActorContext;
  const ctxFor = (tx: CommandContext["tx"]): CommandContext => ({ actor, tx });

  beforeAll(async () => {
    await assertRlsEnforceable();

    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.entityDefinition.create({
        data: { key: ENTITY, capability: "test", class: "Persistent", tableName: "party" },
      });
      const mk = (key: string, category: string, isInitial = false, isTerminal = false) =>
        admin.stateDefinition.create({
          data: { entityKey: ENTITY, key, category: category as never, isInitial, isTerminal },
        });
      const invited = await mk("invited", "Draft", true);
      const active = await mk("active", "Active");
      const suspended = await mk("suspended", "Blocked");
      const archived = await mk("archived", "Completed", false, true);

      await admin.transitionDefinition.createMany({
        data: [
          { entityKey: ENTITY, fromStateId: invited.id, toStateId: active.id, commandKey: "verity.test.accept_invite" },
          { entityKey: ENTITY, fromStateId: active.id, toStateId: suspended.id },
          { entityKey: ENTITY, fromStateId: suspended.id, toStateId: active.id },
          { entityKey: ENTITY, fromStateId: suspended.id, toStateId: archived.id },
        ],
      });
    } finally {
      await admin.$disconnect();
    }

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

    await withTenant(tenantA, async (tx) => {
      const suspended = await tx.stateDefinition.findFirstOrThrow({
        where: { entityKey: ENTITY, key: "suspended" },
      });
      await tx.tenantStatusLabel.create({
        data: { tenantId: tenantA, stateId: suspended.id, label: "On Hold Pending Review" },
      });
    });
  });

  afterEach(() => clearTransitionGuards());

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`;
      await admin.$executeRaw`DELETE FROM entity_definition WHERE key = ${ENTITY}`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("resolves exactly one initial state (MET-STA-001)", async () => {
    const s = await withTenant(tenantA, (tx) => initialState(tx, ENTITY));
    expect(s.key).toBe("invited");
    expect(s.category).toBe("Draft");
  });

  it("allows a declared transition (MET-TRA-001)", async () => {
    const out = await withTenant(tenantA, (tx) =>
      transition(ctxFor(tx), { entityKey: ENTITY, entityId: subjectId, fromKey: "invited", toKey: "active" }),
    );
    expect(out.to.key).toBe("active");
    expect(out.event.name).toBe(`${ENTITY}.transitioned`);
    expect(out.event.payload).toMatchObject({ from: "invited", to: "active", toCategory: "Active" });
  });

  it("blocks an undeclared transition by absence (Completed -> Draft stays impossible)", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        assertTransitionAllowed(ctxFor(tx), {
          entityKey: ENTITY,
          entityId: subjectId,
          fromKey: "archived",
          toKey: "invited",
        }),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("blocks skipping a step in the lifecycle", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        assertTransitionAllowed(ctxFor(tx), {
          entityKey: ENTITY,
          entityId: subjectId,
          fromKey: "invited",
          toKey: "archived",
        }),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an unknown state key", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        assertTransitionAllowed(ctxFor(tx), {
          entityKey: ENTITY,
          entityId: subjectId,
          fromKey: "invited",
          toKey: "teleported",
        }),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("runs a capability evidence guard and aborts on failure (MET-TRA-003/004)", async () => {
    registerTransitionGuard(ENTITY, "suspended", "archived", async () => {
      throw new ValidationError("E_VALIDATION: archival requires a closure record");
    });
    await expect(
      withTenant(tenantA, (tx) =>
        assertTransitionAllowed(ctxFor(tx), {
          entityKey: ENTITY,
          entityId: subjectId,
          fromKey: "suspended",
          toKey: "archived",
        }),
      ),
    ).rejects.toThrow(/closure record/);
  });

  it("permits the transition once the evidence guard passes", async () => {
    let called = false;
    registerTransitionGuard(ENTITY, "suspended", "archived", async () => {
      called = true;
    });
    const out = await withTenant(tenantA, (tx) =>
      transition(ctxFor(tx), {
        entityKey: ENTITY,
        entityId: subjectId,
        fromKey: "suspended",
        toKey: "archived",
      }),
    );
    expect(called).toBe(true);
    expect(out.to.isTerminal).toBe(true);
  });

  it("locks a record in a terminal state (INV-002)", async () => {
    await expect(
      withTenant(tenantA, (tx) => assertMutable(tx, ENTITY, "archived")),
    ).rejects.toThrow(/read-only \(INV-002\)/);
  });

  it("permits mutation in a non-terminal state", async () => {
    await expect(
      withTenant(tenantA, (tx) => assertMutable(tx, ENTITY, "active")),
    ).resolves.toBeUndefined();
  });

  it("returns the tenant's own label but keeps the category underneath (MET-STA-002/004)", async () => {
    const labelA = await withTenant(tenantA, (tx) => statusLabel(tx, ENTITY, "suspended"));
    expect(labelA).toBe("On Hold Pending Review");

    const state = await withTenant(tenantA, (tx) =>
      tx.stateDefinition.findFirstOrThrow({ where: { entityKey: ENTITY, key: "suspended" } }),
    );
    expect(state.category).toBe("Blocked");
  });

  it("falls back to the platform key for a tenant with no label", async () => {
    const labelB = await withTenant(tenantB, (tx) => statusLabel(tx, ENTITY, "suspended"));
    expect(labelB).toBe("suspended");
  });

  it("shares the lifecycle across tenants but not the labels", async () => {
    const statesB = await withTenant(tenantB, (tx) =>
      tx.stateDefinition.findMany({ where: { entityKey: ENTITY } }),
    );
    expect(statesB).toHaveLength(4);
    const labelsB = await withTenant(tenantB, (tx) => tx.tenantStatusLabel.findMany());
    expect(labelsB).toHaveLength(0);
  });

  it("forbids a tenant from inventing a transition its capability never declared", async () => {
    const states = await withTenant(tenantA, (tx) =>
      tx.stateDefinition.findMany({ where: { entityKey: ENTITY } }),
    );
    const archived = states.find((s) => s.key === "archived")!;
    const invited = states.find((s) => s.key === "invited")!;
    await expect(
      withTenant(tenantA, (tx) =>
        tx.transitionDefinition.create({
          data: { entityKey: ENTITY, fromStateId: archived.id, toStateId: invited.id },
        }),
      ),
    ).rejects.toThrow();
  });
});
