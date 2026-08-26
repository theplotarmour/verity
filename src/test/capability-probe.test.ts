import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache, setConfig } from "@/server/platform/capability";
import {
  clearCommands,
  clearHooks,
  executeCommand,
  type ActorContext,
} from "@/server/platform/command";
import { clearQueries, executeQuery } from "@/server/platform/query";
import { clearScopeResolvers } from "@/server/platform/authorization";
import { clearTransitionGuards } from "@/server/platform/state";
import { clearContributions, contributionFor, runDueWork } from "@/server/platform/contribution";
import { provisionIdentity } from "@/server/platform/identity";
import {
  ENTITY_WIDGET,
  PROBE_CAPABILITY,
  advanceWidget,
  createWidget,
  listWidgets,
  registerProbeCapability,
} from "@/server/capabilities/probe";

/**
 * THROWAWAY: gate 9 — client foundation readiness.
 *
 * Work plan §8.2 is explicit that this gate is proven by building, not by
 * arguing: a capability exercises every contribution point, and the evidence is
 * that `src/server/platform/` and `prisma/schema.prisma` are unchanged. This
 * suite is the functional half — that each contribution point actually works
 * when composed, rather than merely compiling.
 *
 * Deleted along with the probe. If you are reading this in a later milestone,
 * something went wrong: PLATFORM-FREEZE forbids a demonstration capability
 * surviving in the tree.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-probe.test.ts cannot run: DATABASE_URL is unset, so gate 9 is NOT proven.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

describeDb("gate 9: capability composition probe", () => {
  const tenantId = randomUUID();
  let organizationId: string;
  let actor: ActorContext;

  beforeAll(async () => {
    await assertRlsEnforceable();
    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();
    registerProbeCapability();

    await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({ data: { id: tenantId, name: "Probe Tenant" } });
      await activateCapability(tx, tenantId, PROBE_CAPABILITY);

      organizationId = (await tx.organization.create({ data: { tenantId, name: "Probe Org" } })).id;

      const role = await tx.role.create({ data: { tenantId, name: "Probe Operator" } });
      await tx.permission.createMany({
        data: [
          { tenantId, roleId: role.id, verb: "Create", entity: ENTITY_WIDGET, scope: "Tenant" },
          { tenantId, roleId: role.id, verb: "Read", entity: ENTITY_WIDGET, scope: "Tenant" },
          { tenantId, roleId: role.id, verb: "ActionExecute", entity: ENTITY_WIDGET, scope: "Tenant" },
        ],
      });

      // SLA policy — data the capability relies on but does not own.
      await tx.slaPolicy.create({
        data: { tenantId, entityKey: ENTITY_WIDGET, name: "Probe response", targetMinutes: 60 },
      });

      // CUSTOM FIELD declared by the tenant, not by the capability.
      await tx.customFieldSchema.create({
        data: {
          tenantId,
          entityKey: ENTITY_WIDGET,
          fieldName: "batch",
          fieldType: "String",
          required: false,
        },
      });

      const identity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Probe Actor",
      });

      actor = {
        tenantId,
        userId: identity.userId,
        membershipId: identity.membershipId,
        organizationId,
        roleId: role.id,
      };
    });
    invalidateCapabilityCache();
  });

  afterAll(async () => {
    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantId}::uuid`;
      await admin.$executeRaw`DELETE FROM "user" WHERE id NOT IN (SELECT user_id FROM tenant_membership)`;
      await admin.$executeRaw`DELETE FROM party WHERE id NOT IN (SELECT party_id FROM "user")`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("contributes an entity, a command, storage and an event", async () => {
    const widget = await executeCommand(actor, createWidget, {
      name: "First widget",
      organizationId,
      customFields: { batch: "A-1" },
    });

    const stored = await withTenant(tenantId, (tx) =>
      tx.$queryRaw<Array<{ name: string; state: string; custom_fields: Record<string, unknown> }>>`
        SELECT name, state, custom_fields FROM probe_widget WHERE id = ${widget.id}::uuid`,
    );
    expect(stored[0]?.state).toBe("received");
    expect(stored[0]?.custom_fields).toEqual({ batch: "A-1" });

    const events = await withTenant(tenantId, (tx) =>
      tx.domainEvent.findMany({ where: { entityId: widget.id } }),
    );
    expect(events.map((e) => e.name)).toContain("verity.probe.widget_created");
  });

  it("rejects a custom field the tenant never declared", async () => {
    await expect(
      executeCommand(actor, createWidget, {
        name: "Undeclared",
        organizationId,
        customFields: { smuggled: "value" },
      }),
    ).rejects.toThrow();
  });

  it("rolls the whole command back when a capability hook refuses", async () => {
    const before = await withTenant(tenantId, (tx) =>
      tx.$queryRaw<[{ n: bigint }]>`SELECT count(*) AS n FROM probe_widget`,
    );

    await expect(
      executeCommand(actor, createWidget, { name: "Reject me", organizationId }),
    ).rejects.toThrow(/probe hook refused/);

    const after = await withTenant(tenantId, (tx) =>
      tx.$queryRaw<[{ n: bigint }]>`SELECT count(*) AS n FROM probe_widget`,
    );
    // Not merely "the command failed" — nothing was written, which is the
    // property PLA-EXT-004 promises.
    expect(Number(after[0].n)).toBe(Number(before[0].n));
  });

  it("honours tenant configuration without the capability hard-coding a limit", async () => {
    await withTenant(tenantId, (tx) => setConfig(tx, tenantId, "probe.max_widgets", 1, "Tenant"));

    await expect(
      executeCommand(actor, createWidget, { name: "Over limit", organizationId }),
    ).rejects.toThrow(/probe.max_widgets/);

    // Removing the configuration removes the limit; an unset value must not
    // silently behave as zero.
    await withTenant(tenantId, (tx) =>
      tx.configParameter.deleteMany({ where: { key: "probe.max_widgets" } }),
    );
    const allowed = await executeCommand(actor, createWidget, {
      name: "After limit lifted",
      organizationId,
    });
    expect(allowed.id).toBeTruthy();
  });

  it("drives SLA clocks from StateCategory alone", async () => {
    const widget = await executeCommand(actor, createWidget, {
      name: "Clock widget",
      organizationId,
    });

    const attached = await withTenant(tenantId, (tx) =>
      tx.slaClock.findFirst({ where: { entityId: widget.id } }),
    );
    // The clock exists but is not counting: `received` is Pending, and waiting
    // for someone to pick work up is not the same as being late with it
    // (Bible V3 §1). The capability wrote no clock code to get this right — it
    // declared its categories honestly and the substrate did the rest.
    expect(attached?.status).toBe("NotStarted");

    await executeCommand(actor, advanceWidget, { widgetId: widget.id, to: "working" });
    const running = await withTenant(tenantId, (tx) =>
      tx.slaClock.findFirst({ where: { entityId: widget.id } }),
    );
    expect(running?.status).toBe("Running"); // Active

    await executeCommand(actor, advanceWidget, { widgetId: widget.id, to: "waiting" });
    const paused = await withTenant(tenantId, (tx) =>
      tx.slaClock.findFirst({ where: { entityId: widget.id } }),
    );
    expect(paused?.status).toBe("Paused"); // Blocked

    await executeCommand(actor, advanceWidget, { widgetId: widget.id, to: "working" });
    await executeCommand(actor, advanceWidget, { widgetId: widget.id, to: "finished" });
    const stopped = await withTenant(tenantId, (tx) =>
      tx.slaClock.findFirst({ where: { entityId: widget.id } }),
    );
    expect(stopped?.status).toBe("Stopped"); // Completed
  });

  it("refuses a transition the capability never declared", async () => {
    const widget = await executeCommand(actor, createWidget, {
      name: "Undeclared move",
      organizationId,
    });
    // received -> finished is not an edge in the probe's own state machine.
    await expect(
      executeCommand(actor, advanceWidget, { widgetId: widget.id, to: "finished" }),
    ).rejects.toThrow();
  });

  it("consults a capability-owned transition guard", async () => {
    const widget = await executeCommand(actor, createWidget, {
      name: "Blocked widget",
      organizationId,
    });
    await executeCommand(actor, advanceWidget, { widgetId: widget.id, to: "working" });
    await expect(
      executeCommand(actor, advanceWidget, { widgetId: widget.id, to: "finished" }),
    ).rejects.toThrow(/probe guard refuses/);
  });

  it("writes audit and a notification through the platform's own paths", async () => {
    const widget = await executeCommand(actor, createWidget, {
      name: "Audited widget",
      organizationId,
    });
    await executeCommand(actor, advanceWidget, { widgetId: widget.id, to: "working" });

    const [activity, notifications] = await withTenant(tenantId, async (tx) => [
      await tx.activity.findMany({ where: { entityId: widget.id } }),
      await tx.notification.findMany({ where: { entityId: widget.id } }),
    ]);

    expect(activity.some((a) => a.commandKey === "verity.probe.advance_widget")).toBe(true);
    expect(notifications.length).toBeGreaterThan(0);
  });

  it("serves a query through the platform pipeline", async () => {
    const rows = await executeQuery(actor, listWidgets, {});
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("contributes navigation, a workspace queue and scheduled work", async () => {
    const contribution = contributionFor(PROBE_CAPABILITY);
    expect(contribution?.navigation?.[0]?.href).toBe("/probe");
    expect(contribution?.workspace?.[0]?.key).toBe("verity.probe.waiting");
    expect(contribution?.schedules?.[0]?.cadence).toBe("frequent");

    // The scheduled work runs under an ordinary tenant scope — there is no
    // privileged path around tenancy for background work.
    const outcomes = await runDueWork({
      tenantId,
      activeCapabilityIds: [PROBE_CAPABILITY],
      cadence: "frequent",
    });
    expect(outcomes.some((o) => o.key === "verity.probe.sweep")).toBe(true);
  });
});
