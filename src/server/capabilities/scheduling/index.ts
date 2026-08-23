import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import type { TenantScopedClient } from "@/server/platform/tenancy";

/**
 * CAPABILITY: Scheduling — `verity.capability.scheduling`
 *
 * Authority: ADR-008. Depends on Asset.
 *
 * ADR-008 fixed this shape so it would not be re-litigated per capability: a
 * Resource is a single schedulable unit backed by exactly one Party or Asset,
 * and crews, pools and room sets are ResourceGroup compositions. A group has no
 * calendar of its own — its availability derives from its members — which keeps
 * conflict detection a single implementation instead of two that must agree.
 */

export const SCHEDULING_CAPABILITY = "verity.capability.scheduling";
export const ENTITY_RESOURCE = "verity.scheduling.resource";
export const ENTITY_RESOURCE_GROUP = "verity.scheduling.resource_group";
export const ENTITY_BOOKING = "verity.scheduling.booking";

/** Is a resource free for a period? Free = no booking and no unavailability. */
export async function resourceIsFree(
  tx: TenantScopedClient,
  resourceId: string,
  period: { startsAt: Date; endsAt: Date },
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ resource_is_free: boolean }[]>`
    SELECT verity.resource_is_free(${resourceId}::uuid, ${period.startsAt}, ${period.endsAt})`;
  return rows[0]?.resource_is_free ?? false;
}

/**
 * Resolves a group to the concrete Resources a booking would consume.
 *
 * `AllOf` needs every member free; `AnyOf` needs one; `NOf` needs the declared
 * count. Returning the members rather than a yes/no keeps the decision with the
 * caller, which is what lets a capability implement its own preference order
 * without Scheduling knowing the domain.
 */
export async function resolveGroup(
  tx: TenantScopedClient,
  groupId: string,
  period: { startsAt: Date; endsAt: Date },
): Promise<{ satisfied: boolean; resourceIds: string[] }> {
  const group = await tx.resourceGroup.findUniqueOrThrow({
    where: { id: groupId },
    include: { members: true },
  });

  const free: string[] = [];
  for (const member of group.members) {
    if (await resourceIsFree(tx, member.resourceId, period)) free.push(member.resourceId);
  }

  switch (group.selection) {
    case "AllOf":
      return { satisfied: free.length === group.members.length, resourceIds: free };
    case "AnyOf":
      return { satisfied: free.length > 0, resourceIds: free.slice(0, 1) };
    case "NOf": {
      const needed = group.requiredCount ?? 0;
      return { satisfied: free.length >= needed, resourceIds: free.slice(0, needed) };
    }
  }
}

export const createResource: CommandDefinition<
  { name: string; partyId?: string; assetId?: string },
  { id: string }
> = {
  key: "verity.scheduling.create_resource",
  entity: ENTITY_RESOURCE,
  verb: "Create",
  input: z
    .object({
      name: z.string().min(1),
      partyId: z.string().uuid().optional(),
      assetId: z.string().uuid().optional(),
    })
    // ADR-008, checked here as well as by the database constraint so the caller
    // gets a named validation failure rather than a constraint violation.
    .refine((v) => Boolean(v.partyId) !== Boolean(v.assetId), {
      message: "a Resource must be backed by exactly one Party or Asset (ADR-008)",
    }),
  handler: async (ctx, input) => {
    const resource = await ctx.tx.resource.create({
      data: {
        tenantId: ctx.actor.tenantId,
        name: input.name,
        partyId: input.partyId ?? null,
        assetId: input.assetId ?? null,
      },
    });
    return {
      result: { id: resource.id },
      events: [{ name: "verity.scheduling.resource_created", entityId: resource.id }],
    };
  },
};

export const createGroup: CommandDefinition<
  { name: string; selection: "AllOf" | "AnyOf" | "NOf"; requiredCount?: number; resourceIds: string[] },
  { id: string }
> = {
  key: "verity.scheduling.create_group",
  entity: ENTITY_RESOURCE_GROUP,
  verb: "Create",
  input: z
    .object({
      name: z.string().min(1),
      selection: z.enum(["AllOf", "AnyOf", "NOf"]),
      requiredCount: z.number().int().positive().optional(),
      resourceIds: z.array(z.string().uuid()).min(1),
    })
    .refine((v) => (v.selection === "NOf") === (v.requiredCount !== undefined), {
      message: "requiredCount is required for NOf and meaningless otherwise",
    }),
  handler: async (ctx, input) => {
    const group = await ctx.tx.resourceGroup.create({
      data: {
        tenantId: ctx.actor.tenantId,
        name: input.name,
        selection: input.selection,
        requiredCount: input.requiredCount ?? null,
      },
    });
    await ctx.tx.resourceGroupMember.createMany({
      data: input.resourceIds.map((resourceId) => ({
        tenantId: ctx.actor.tenantId,
        groupId: group.id,
        resourceId,
      })),
    });
    return {
      result: { id: group.id },
      events: [{ name: "verity.scheduling.group_created", entityId: group.id }],
    };
  },
};

export const declareUnavailable: CommandDefinition<
  { resourceId: string; startsAt: string; endsAt: string },
  { id: string }
> = {
  key: "verity.scheduling.declare_unavailable",
  entity: ENTITY_RESOURCE,
  verb: "Edit",
  input: z.object({
    resourceId: z.string().uuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  }),
  handler: async (ctx, input) => {
    const window = await ctx.tx.availabilityWindow.create({
      data: {
        tenantId: ctx.actor.tenantId,
        resourceId: input.resourceId,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        available: false,
      },
    });
    return {
      result: { id: window.id },
      events: [{ name: "verity.scheduling.resource_unavailable", entityId: input.resourceId }],
    };
  },
};

export const book: CommandDefinition<
  { resourceId: string; subjectEntityKey: string; subjectEntityId: string; startsAt: string; endsAt: string },
  { id: string }
> = {
  key: "verity.scheduling.book",
  entity: ENTITY_BOOKING,
  verb: "Create",
  input: z.object({
    resourceId: z.string().uuid(),
    subjectEntityKey: z.string().min(1),
    subjectEntityId: z.string().uuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  }),
  preconditions: async (ctx, input) => {
    // The trigger is the guarantee; this produces the better error message.
    const free = await resourceIsFree(ctx.tx, input.resourceId, {
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
    });
    if (!free) throw new Error("E_VALIDATION: resource is not free for that period");
  },
  handler: async (ctx, input) => {
    const booking = await ctx.tx.booking.create({
      data: {
        tenantId: ctx.actor.tenantId,
        resourceId: input.resourceId,
        subjectEntityKey: input.subjectEntityKey,
        subjectEntityId: input.subjectEntityId,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
      },
    });
    return {
      result: { id: booking.id },
      events: [{ name: "verity.scheduling.booked", entityId: booking.id }],
    };
  },
};

export const listBookings: QueryDefinition<
  { resourceId?: string },
  Array<Record<string, unknown>>
> = {
  key: "verity.scheduling.list_bookings",
  entity: ENTITY_BOOKING,
  input: z.object({ resourceId: z.string().uuid().optional() }),
  handler: async (ctx, input) =>
    ctx.tx.booking.findMany({
      where: { cancelled: false, ...(input.resourceId ? { resourceId: input.resourceId } : {}) },
      orderBy: { startsAt: "asc" },
    }),
};

export function registerSchedulingCapability(): void {
  registerContribution({
    capabilityId: SCHEDULING_CAPABILITY,
    navigation: [
      { href: "/scheduling", label: "Scheduling", group: "Capabilities", order: 40,
        requiresEntity: ENTITY_BOOKING, shells: ["platform", "operations"] },
    ],
  });
  registerCommand(createResource);
  registerCommand(createGroup);
  registerCommand(declareUnavailable);
  registerCommand(book);
  registerQuery(listBookings);
}
