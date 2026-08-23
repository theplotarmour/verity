import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache, resolveConfig, setConfig } from "@/server/platform/capability";
import { executeCommand, registerCommand, clearCommands, type ActorContext, type CommandDefinition } from "@/server/platform/command";
import { validateCustomFields } from "@/server/platform/entity";
import { assertMutable, transition } from "@/server/platform/state";
import { diffFields, recordActivity } from "@/server/platform/audit";
import { buildFormDescriptor, buildNavigation } from "@/server/platform/experience";
import { clearNodeHandlers, executeWorkflow, registerNodeHandler } from "@/server/platform/workflow";
import { provisionIdentity } from "@/server/platform/identity";

/**
 * FOUNDATION ACCEPTANCE TEST — step 14.
 *
 * Composes a capability the specification has never heard of, using only the
 * platform's public surface: no file under src/server/platform is imported
 * privately, modified, or special-cased for it.
 *
 * Drone Inspection is chosen deliberately because nothing in the Bible, the
 * specification or the handoff anticipates it — no aerial concepts, no altitude,
 * no flight windows. If the foundation can carry it without alteration, the
 * claim that it can carry an unseen industry is evidence rather than assertion.
 *
 * This is a DEMONSTRATED result, not a BUILT one: Drone Inspection is not a real
 * capability and nothing here ships.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "foundation-acceptance.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const CAPABILITY = "verity.capability.drone_inspection";
const ENTITY = "verity.drone_inspection.flight";
const TABLE = "demo_drone_flight";

describeDb("foundation acceptance: an unforeseen capability", () => {
  const tenantA = randomUUID();
  let actor: ActorContext;
  let roleId: string;
  let orgId: string;
  let flightId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      // 1. The capability ships its own table, exactly as a real one would —
      //    base entity pattern plus RLS, no platform change required.
      await admin.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${TABLE}" (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
          state TEXT NOT NULL,
          site TEXT NOT NULL,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          version INTEGER NOT NULL DEFAULT 1,
          custom_fields JSONB NOT NULL DEFAULT '{}'
        )`);
      await admin.$executeRawUnsafe(`ALTER TABLE "${TABLE}" ENABLE ROW LEVEL SECURITY`);
      await admin.$executeRawUnsafe(`ALTER TABLE "${TABLE}" FORCE ROW LEVEL SECURITY`);
      await admin.$executeRawUnsafe(`
        CREATE POLICY "${TABLE}_isolation" ON "${TABLE}"
          USING (tenant_id = verity.current_tenant_id())
          WITH CHECK (tenant_id = verity.current_tenant_id())`);
      await admin.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON "${TABLE}" TO verity_app`);

      // 2. Register with the platform registries.
      await admin.capabilityDefinition.create({
        data: { id: CAPABILITY, name: "Drone Inspection", version: "0.1.0", entityTypes: [ENTITY] },
      });
      await admin.entityDefinition.create({
        data: { key: ENTITY, capability: CAPABILITY, class: "Persistent", tableName: TABLE },
      });

      // 3. Declare a lifecycle the platform has never seen.
      const planned = await admin.stateDefinition.create({
        data: { entityKey: ENTITY, key: "planned", category: "Draft", isInitial: true },
      });
      const flying = await admin.stateDefinition.create({
        data: { entityKey: ENTITY, key: "in_flight", category: "Active" },
      });
      const grounded = await admin.stateDefinition.create({
        data: { entityKey: ENTITY, key: "grounded", category: "Blocked" },
      });
      const filed = await admin.stateDefinition.create({
        data: { entityKey: ENTITY, key: "report_filed", category: "Completed", isTerminal: true },
      });
      await admin.transitionDefinition.createMany({
        data: [
          { entityKey: ENTITY, fromStateId: planned.id, toStateId: flying.id },
          { entityKey: ENTITY, fromStateId: flying.id, toStateId: grounded.id },
          { entityKey: ENTITY, fromStateId: grounded.id, toStateId: flying.id },
          { entityKey: ENTITY, fromStateId: flying.id, toStateId: filed.id },
        ],
      });
    } finally {
      await admin.$disconnect();
    }

    await withTenant(tenantA, async (tx) => {
      await tx.tenant.create({ data: { id: tenantA, name: "Skyward Surveys" } });
      orgId = (await tx.organization.create({ data: { tenantId: tenantA, name: "North Region" } })).id;
      await activateCapability(tx, tenantA, CAPABILITY);

      roleId = (await tx.role.create({ data: { tenantId: tenantA, name: "Pilot" } })).id;
      await tx.permission.createMany({
        data: [
          { tenantId: tenantA, roleId, verb: "Read", entity: ENTITY, scope: "Organization" },
          { tenantId: tenantA, roleId, verb: "Create", entity: ENTITY, scope: "Organization" },
          { tenantId: tenantA, roleId, verb: "Edit", entity: ENTITY, scope: "Organization" },
        ],
      });

      // 4. Domain-specific attributes as tenant extensions, not core columns.
      await tx.customFieldSchema.createMany({
        data: [
          { tenantId: tenantA, entityKey: ENTITY, fieldName: "airframe", fieldType: "String", required: true },
          { tenantId: tenantA, entityKey: ENTITY, fieldName: "max_altitude_m", fieldType: "Number" },
          { tenantId: tenantA, entityKey: ENTITY, fieldName: "airspace_class", fieldType: "Select", selectOptions: ["G", "D", "C"] },
        ],
      });

      // 5. Configuration rather than code for an expected variation.
      await setConfig(tx, tenantA, "drone.max_altitude_m", 120);

      const identity = await provisionIdentity(tx, {
        organizationId: orgId,
        authUserId: randomUUID(),
        displayName: "Pilot One",
      });
      await tx.tenantMembership.update({ where: { id: identity.membershipId }, data: { roleId } });

      actor = {
        tenantId: tenantA,
        userId: identity.userId,
        membershipId: identity.membershipId,
        organizationId: orgId,
        roleId,
      };
    });
    invalidateCapabilityCache();
  });

  afterAll(async () => {
    clearCommands();
    clearNodeHandlers();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      // Everything with a FIXED name comes first, and nothing that can throw is
      // allowed in front of it. These are the rows and objects whose survival
      // breaks the NEXT run — the table by its policy name, the definitions by
      // their primary keys. They used to run behind an unguarded `actor.userId`,
      // which is undefined whenever setup failed, so one bad run left this
      // fixture in the database and every later run failed on it.
      await admin.$executeRawUnsafe(`DROP TABLE IF EXISTS "${TABLE}" CASCADE`);
      // The tenant precedes the capability definition: its activation rows hold
      // a foreign key to it.
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantA}::uuid`;
      await admin.$executeRaw`DELETE FROM entity_definition WHERE key = ${ENTITY}`;
      await admin.$executeRaw`DELETE FROM capability_definition WHERE id = ${CAPABILITY}`;

      if (actor?.userId) {
        await admin.$executeRaw`DELETE FROM "user" WHERE id = ${actor.userId}::uuid`;
      }
      await admin.$executeRaw`DELETE FROM party WHERE id NOT IN (SELECT party_id FROM "user")`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("creates a record through the command pipeline, validating tenant extensions", async () => {
    const planFlight: CommandDefinition<
      { site: string; airframe: string; max_altitude_m: number; airspace_class: string },
      { id: string }
    > = {
      key: "verity.drone_inspection.plan_flight",
      entity: ENTITY,
      verb: "Create",
      input: z.object({
        site: z.string(),
        airframe: z.string(),
        max_altitude_m: z.number(),
        airspace_class: z.string(),
      }),
      preconditions: async (ctx, input) => {
        const ceiling = await resolveConfig<number>(ctx.tx, "drone.max_altitude_m");
        if (ceiling !== undefined && input.max_altitude_m > ceiling) {
          throw new Error(`E_VALIDATION: altitude ${input.max_altitude_m} exceeds ceiling ${ceiling}`);
        }
      },
      handler: async (ctx, input) => {
        const custom = await validateCustomFields(ctx.tx, ENTITY, {
          airframe: input.airframe,
          max_altitude_m: input.max_altitude_m,
          airspace_class: input.airspace_class,
        });
        const id = randomUUID();
        await ctx.tx.$executeRawUnsafe(
          `INSERT INTO "${TABLE}" (id, tenant_id, state, site, updated_at, custom_fields)
           VALUES ($1::uuid, $2::uuid, 'planned', $3, now(), $4::jsonb)`,
          id,
          ctx.actor.tenantId,
          input.site,
          JSON.stringify(custom),
        );
        return { result: { id }, events: [{ name: "verity.drone_inspection.flight_planned", entityId: id }] };
      },
    };
    registerCommand(planFlight);

    const out = await executeCommand(actor, planFlight, {
      site: "Wind Farm 7",
      airframe: "Quad-X",
      max_altitude_m: 90,
      airspace_class: "G",
    });
    flightId = out.id;
    expect(flightId).toBeTruthy();
  });

  it("emitted the capability's own event into the platform outbox", async () => {
    const events = await withTenant(tenantA, (tx) =>
      tx.domainEvent.findMany({ where: { entityKey: ENTITY } }),
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.name).toBe("verity.drone_inspection.flight_planned");
  });

  it("enforces a tenant configuration value as a business rule", async () => {
    const planFlight = { ...(await import("@/server/platform/command")) };
    void planFlight;
    const cmd = (await import("@/server/platform/command")).getCommand(
      "verity.drone_inspection.plan_flight",
    )!;
    await expect(
      executeCommand(actor, cmd, {
        site: "Wind Farm 7",
        airframe: "Quad-X",
        max_altitude_m: 400, // above the tenant's configured ceiling
        airspace_class: "G",
      }),
    ).rejects.toThrow(/exceeds ceiling/);
  });

  it("rejects an extension value the tenant never declared", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        validateCustomFields(tx, ENTITY, { airframe: "Quad-X", rotor_count: 4 }),
      ),
    ).rejects.toThrow();
  });

  it("rejects a value outside the tenant's declared options", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        validateCustomFields(tx, ENTITY, { airframe: "Quad-X", airspace_class: "Z" }),
      ),
    ).rejects.toThrow();
  });

  it("moves through a lifecycle the platform has never seen", async () => {
    const out = await withTenant(tenantA, (tx) =>
      transition(
        { actor, tx },
        { entityKey: ENTITY, entityId: flightId, fromKey: "planned", toKey: "in_flight" },
      ),
    );
    expect(out.to.category).toBe("Active");
  });

  it("blocks a transition the capability never declared", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        transition(
          { actor, tx },
          { entityKey: ENTITY, entityId: flightId, fromKey: "planned", toKey: "report_filed" },
        ),
      ),
    ).rejects.toThrow(/no declared transition/);
  });

  it("locks the record once its lifecycle reaches a terminal state (INV-002)", async () => {
    await expect(
      withTenant(tenantA, (tx) => assertMutable(tx, ENTITY, "report_filed")),
    ).rejects.toThrow(/INV-002/);
  });

  it("writes field-level history to the shared audit stream", async () => {
    await withTenant(tenantA, (tx) =>
      recordActivity(
        { actor, tx },
        {
          entityKey: ENTITY,
          entityId: flightId,
          commandKey: "verity.drone_inspection.plan_flight",
          changes: diffFields({ state: "planned" }, { state: "in_flight" }),
        },
      ),
    );
    const history = await withTenant(tenantA, (tx) =>
      tx.activity.findMany({ where: { entityKey: ENTITY, entityId: flightId } }),
    );
    expect(history).toHaveLength(1);
    expect(history[0]?.newValue).toBe("in_flight");
  });

  it("drives a capability workflow through the shared engine", async () => {
    registerNodeHandler("drone.start", async (_ctx, input) => input);
    registerNodeHandler("drone.notify_caa", async (_ctx, input) => ({
      json: { ...input.json, filed: true },
    }));

    await withTenant(tenantA, async (tx) => {
      const wf = await tx.workflowDefinition.create({
        data: { tenantId: tenantA, key: "drone.post_flight" },
      });
      const start = await tx.workflowNode.create({
        data: { tenantId: tenantA, workflowId: wf.id, key: "start", type: "Trigger", handlerKey: "drone.start" },
      });
      const notify = await tx.workflowNode.create({
        data: { tenantId: tenantA, workflowId: wf.id, key: "notify", type: "Action", handlerKey: "drone.notify_caa" },
      });
      await tx.workflowEdge.create({
        data: {
          tenantId: tenantA,
          workflowId: wf.id,
          fromNodeId: start.id,
          toNodeId: notify.id,
          condition: { path: "incident", op: "eq", value: true },
        },
      });
    });

    const ran = await executeWorkflow(actor, "drone.post_flight", { json: { incident: true } });
    expect(ran.status).toBe("Succeeded");
    expect(ran.output.json.filed).toBe(true);
  });

  it("surfaces the capability in navigation and builds its form from metadata", async () => {
    const nav = await withTenant(tenantA, (tx) => buildNavigation(tx, actor));
    const entry = nav.find((n) => n.entityKey === ENTITY);
    expect(entry?.capabilityName).toBe("Drone Inspection");

    const form = await withTenant(tenantA, (tx) =>
      buildFormDescriptor(tx, ENTITY, {
        stateKey: "planned",
        nativeFields: [{ name: "site", control: "text", required: true }],
      }),
    );
    expect(form.fields.map((f) => f.name)).toEqual([
      "site",
      "airframe",
      "airspace_class",
      "max_altitude_m",
    ]);
    expect(form.readOnly).toBe(false);
  });

  it("renders the capability read-only in its terminal state without any UI change", async () => {
    const form = await withTenant(tenantA, (tx) =>
      buildFormDescriptor(tx, ENTITY, { stateKey: "report_filed" }),
    );
    expect(form.readOnly).toBe(true);
  });

  it("disappears entirely when the tenant suspends the capability (PLA-CAP-002)", async () => {
    await withTenant(tenantA, (tx) =>
      tx.tenantActivation.update({
        where: { tenantId_capabilityId: { tenantId: tenantA, capabilityId: CAPABILITY } },
        data: { status: "Suspended" },
      }),
    );
    invalidateCapabilityCache(tenantA);

    const nav = await withTenant(tenantA, (tx) => buildNavigation(tx, actor));
    expect(nav.some((n) => n.entityKey === ENTITY)).toBe(false);

    const cmd = (await import("@/server/platform/command")).getCommand(
      "verity.drone_inspection.plan_flight",
    )!;
    await expect(
      executeCommand(actor, cmd, {
        site: "Wind Farm 8",
        airframe: "Quad-X",
        max_altitude_m: 50,
        airspace_class: "G",
      }),
    ).rejects.toThrow(/E_CAPABILITY_INACTIVE/);
  });
});
