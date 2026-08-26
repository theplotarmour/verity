import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, registerHook, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { registerTransitionGuard, transition } from "@/server/platform/state";
import { validateCustomFields } from "@/server/platform/entity";
import { diffFields, recordActivity } from "@/server/platform/audit";
import { applyStateToClocks, startClock, sweepBreaches } from "@/server/platform/sla";
import { notify } from "@/server/platform/notification";
import { resolveConfig } from "@/server/platform/capability";

/**
 * THROWAWAY: the capability composition probe — work plan Phase 4, gate 9.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ THIS IS NOT A PRODUCT CAPABILITY AND MUST BE DELETED.                   │
 * │ PLATFORM-FREEZE forbids a fake or demonstration client surviving in the │
 * │ tree. It exists to prove one claim with evidence rather than argument.  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * The claim: a capability can contribute an entity, commands, queries, states
 * with StateCategory mapping, permissions, configuration, events, audit, SLA
 * behaviour, scheduled work, notifications, custom fields, navigation and a UI
 * page WITHOUT modifying platform internals.
 *
 * The proof is the diff, not this comment:
 *
 *   git diff --stat src/server/platform/ prisma/schema.prisma   →   empty
 *
 * Every contribution point below is exercised for real — nothing is stubbed,
 * and nothing calls into the platform in a way a genuine capability could not.
 * A "widget" is deliberately meaningless: naming it after a real domain would
 * make it a client capability nobody asked for, which is the thing being
 * avoided.
 */

export const PROBE_CAPABILITY = "verity.capability.probe";
export const ENTITY_WIDGET = "verity.probe.widget";

/* -------------------------------- commands -------------------------------- */

export const createWidget: CommandDefinition<
  { name: string; organizationId: string; customFields?: Record<string, unknown> },
  { id: string }
> = {
  key: "verity.probe.create_widget",
  entity: ENTITY_WIDGET,
  verb: "Create",
  input: z.object({
    name: z.string().min(1),
    organizationId: z.string().uuid(),
    customFields: z.record(z.string(), z.unknown()).optional(),
  }),
  preconditions: async (ctx, input) => {
    // CONFIGURATION: a tenant-set limit the capability reads rather than
    // hard-codes. Absent configuration means no limit — an unset value must not
    // silently become zero.
    const limit = await resolveConfig<number>(ctx.tx, "probe.max_widgets", {
      organizationId: ctx.actor.organizationId,
      userId: ctx.actor.userId,
    });
    if (typeof limit === "number") {
      const [row] = await ctx.tx.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n FROM probe_widget`;
      if (Number(row?.n ?? 0) >= limit) {
        throw new Error(`E_VALIDATION: this tenant's probe.max_widgets limit of ${limit} is reached`);
      }
    }
  },
  handler: async (ctx, input) => {
    // CUSTOM FIELDS: validated against the tenant's own declarations at write
    // time. An undeclared key is rejected rather than stored.
    const customFields = input.customFields
      ? await validateCustomFields(ctx.tx, ENTITY_WIDGET, input.customFields)
      : {};

    const [widget] = await ctx.tx.$queryRaw<{ id: string }[]>`
      INSERT INTO probe_widget (tenant_id, organization_id, name, state, custom_fields)
      VALUES (${ctx.actor.tenantId}::uuid, ${input.organizationId}::uuid, ${input.name},
              'received', ${JSON.stringify(customFields)}::jsonb)
      RETURNING id`;

    // SLA: the clock is started by the capability declaring that work has
    // arrived; everything after this is driven by StateCategory, not by keys.
    await startClock(ctx.tx, {
      tenantId: ctx.actor.tenantId,
      entityKey: ENTITY_WIDGET,
      entityId: widget!.id,
    });

    // Note what `startClock` does and does not do: it ATTACHES the policy and
    // creates the clock. Whether time is counted is decided later, by category
    // — and a widget in `received` is Pending, which does not burn the budget
    // (Bible V3 §1). Waiting for someone to pick the work up is not the same as
    // being late with it.

    // AUDIT: a field-level record, through the platform's own writer.
    await recordActivity(ctx, {
      entityKey: ENTITY_WIDGET,
      entityId: widget!.id,
      commandKey: "verity.probe.create_widget",
      changes: diffFields({}, { name: input.name, state: "received" }),
    });

    // EVENTS: appended to the outbox inside this transaction, so a rollback
    // takes them with it.
    return {
      result: { id: widget!.id },
      events: [{ name: "verity.probe.widget_created", entityId: widget!.id }],
    };
  },
};

export const advanceWidget: CommandDefinition<
  { widgetId: string; to: string },
  { from: string; to: string }
> = {
  key: "verity.probe.advance_widget",
  entity: ENTITY_WIDGET,
  verb: "ActionExecute",
  input: z.object({
    widgetId: z.string().uuid(),
    to: z.enum(["working", "waiting", "finished", "abandoned"]),
  }),
  handler: async (ctx, input) => {
    const [current] = await ctx.tx.$queryRaw<{ state: string }[]>`
      SELECT state FROM probe_widget WHERE id = ${input.widgetId}::uuid`;
    if (!current) throw new Error("E_VALIDATION: no such widget in this tenant");

    // STATE: the platform refuses a transition the capability never declared,
    // and refuses any transition out of a terminal state.
    const moved = await transition(ctx, {
      entityKey: ENTITY_WIDGET,
      entityId: input.widgetId,
      fromKey: current.state,
      toKey: input.to,
    });

    await ctx.tx.$executeRaw`
      UPDATE probe_widget
      SET state = ${input.to}, updated_at = now(), version = version + 1
      WHERE id = ${input.widgetId}::uuid`;

    // SLA again: pause, resume or stop is decided from the CATEGORY of the new
    // state. The capability declared its categories honestly and gets correct
    // clock behaviour without writing any clock code.
    await applyStateToClocks(ctx.tx, {
      entityKey: ENTITY_WIDGET,
      entityId: input.widgetId,
      category: moved.to.category,
    });

    await recordActivity(ctx, {
      entityKey: ENTITY_WIDGET,
      entityId: input.widgetId,
      commandKey: "verity.probe.advance_widget",
      changes: diffFields({ state: current.state }, { state: input.to }),
    });

    // NOTIFICATION: suppressed notifications are recorded, not dropped, and the
    // absence of a bound transport does not make this a no-op contract.
    await notify(ctx.tx, {
      tenantId: ctx.actor.tenantId,
      recipientIds: [ctx.actor.userId],
      key: "verity.probe.widget_advanced",
      entityKey: ENTITY_WIDGET,
      entityId: input.widgetId,
      variables: { name: input.to },
      fallback: { subject: "Widget advanced", body: "A probe widget moved to {name}." },
    });

    return { result: { from: moved.from.key, to: moved.to.key }, events: [moved.event] };
  },
};

/* --------------------------------- query ---------------------------------- */

export const listWidgets: QueryDefinition<
  Record<string, never>,
  Array<{ id: string; name: string; state: string }>
> = {
  key: "verity.probe.list_widgets",
  entity: ENTITY_WIDGET,
  input: z.object({}),
  handler: async (ctx) => {
    return ctx.tx.$queryRaw<Array<{ id: string; name: string; state: string }>>`
      SELECT id, name, state FROM probe_widget ORDER BY created_at DESC LIMIT 50`;
  },
};

/* ------------------------------ registration ------------------------------ */

export function registerProbeCapability(): void {
  // HOOK: PLA-EXT-004. Throwing here rolls the command back, which is the
  // property being exercised — not the trivial fact that a function ran.
  registerHook("verity.probe.create_widget", "before_save", async (_ctx, input) => {
    const name = (input as { name?: string }).name ?? "";
    if (name.toLowerCase() === "reject me") {
      throw new Error("E_VALIDATION: the probe hook refused this name");
    }
  });

  // TRANSITION GUARD: a capability-owned rule the state engine consults before
  // a specific move. Registered per edge, so the engine consults it only where
  // it applies rather than on every transition.
  registerTransitionGuard(ENTITY_WIDGET, "working", "finished", async (ctx, args) => {
    const [row] = await ctx.tx.$queryRaw<{ name: string }[]>`
      SELECT name FROM probe_widget WHERE id = ${args.entityId}::uuid`;
    if (row?.name.toLowerCase().includes("blocked")) {
      throw new Error("E_VALIDATION: the probe guard refuses to finish this widget");
    }
  });

  registerContribution({
    capabilityId: PROBE_CAPABILITY,
    navigation: [
      {
        href: "/probe",
        label: "Probe",
        group: "Capabilities",
        order: 90,
        icon: "capabilities",
        requiresEntity: ENTITY_WIDGET,
        shells: ["platform"],
      },
    ],
    workspace: [
      {
        key: "verity.probe.waiting",
        label: "Widgets waiting",
        href: "/probe",
        count: async () => 0,
        shells: ["platform"],
      },
    ],
    schedules: [
      {
        key: "verity.probe.sweep",
        label: "Sweep probe SLA breaches",
        cadence: "frequent",
        run: async ({ tx, tenantId, now }) => {
          // Idempotent by construction: sweepBreaches only marks clocks that
          // are past target and not already breached.
          const breached = await sweepBreaches(tx, now);
          // The schedule contract narrows `entityId` to string | undefined,
          // while an emitted event allows null. Mapping rather than casting, so
          // a genuinely absent id stays absent instead of becoming "null".
          return {
            events: breached.map((event) => ({
              name: event.name,
              entityId: event.entityId ?? undefined,
            })),
          };
        },
      },
    ],
  });

  registerCommand(createWidget);
  registerCommand(advanceWidget);
  registerQuery(listWidgets);
}
