import { z } from "zod";
import { registerScopeResolver } from "@/server/platform/authorization";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { validateCustomFields } from "@/server/platform/entity";
import { diffFields, recordActivity } from "@/server/platform/audit";
import type { TenantScopedClient } from "@/server/platform/tenancy";
import type { ActorContext } from "@/server/platform/command";

/**
 * CAPABILITY: Location — `verity.capability.location`
 *
 * Authority: ADR-004 (Place / Address / Location / Geofence are four distinct
 * concepts), GOV-TER-017 (`Location` is the canonical term for a site;
 * `branch`, `depot` and `factory_outlet` are prohibited synonyms).
 *
 * Demanded independently by Security Operations, Facilities and Field Service
 * in the foundation validation, which is why it is a shared capability rather
 * than something the first client builds privately.
 *
 * The four concepts are kept apart because they change independently: a depot's
 * postal address, the coordinates a technician navigates to, the operational
 * site work is scheduled against, and the boundary that validates a check-in
 * are four different facts. Collapsing them is the mistake ADR-004 exists to
 * prevent.
 */

export const LOCATION_CAPABILITY = "verity.capability.location";
export const ENTITY_PLACE = "verity.location.place";
export const ENTITY_ADDRESS = "verity.location.address";
export const ENTITY_LOCATION = "verity.location.location";
export const ENTITY_GEOFENCE = "verity.location.geofence";

/**
 * The Locations an actor is assigned to.
 *
 * Registered with the platform so a `Location`-scoped permission grant can be
 * evaluated (PLA-AUT-004). The platform defines the scope value but cannot
 * resolve it without this capability, and it deliberately does not import the
 * capability to find out — an unregistered axis reaches nothing rather than
 * everything.
 */
export async function actorLocations(
  tx: TenantScopedClient,
  actor: ActorContext,
): Promise<string[]> {
  const rows = await tx.locationAssignment.findMany({
    where: { userId: actor.userId },
    select: { locationId: true },
  });
  return rows.map((r) => r.locationId);
}

/** Is a point inside a geofence? (ADR-004: geofences are policies.) */
export async function withinGeofence(
  tx: TenantScopedClient,
  geofenceId: string,
  point: { latitude: number; longitude: number },
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ within_geofence: boolean | null }[]>`
    SELECT verity.within_geofence(${geofenceId}::uuid, ${point.latitude}::numeric, ${point.longitude}::numeric)`;
  return rows[0]?.within_geofence ?? false;
}

/* ------------------------------- commands -------------------------------- */

export const createPlace: CommandDefinition<
  { name: string; latitude?: number; longitude?: number },
  { id: string }
> = {
  key: "verity.location.create_place",
  entity: ENTITY_PLACE,
  verb: "Create",
  input: z.object({
    name: z.string().min(1),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),
  handler: async (ctx, input) => {
    const place = await ctx.tx.place.create({
      data: {
        tenantId: ctx.actor.tenantId,
        name: input.name,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
    });
    return {
      result: { id: place.id },
      events: [{ name: "verity.location.place_created", entityId: place.id }],
    };
  },
};

export const createLocation: CommandDefinition<
  { name: string; organizationId: string; placeId?: string },
  { id: string }
> = {
  key: "verity.location.create_location",
  entity: ENTITY_LOCATION,
  verb: "Create",
  input: z.object({
    name: z.string().min(1),
    organizationId: z.string().uuid(),
    placeId: z.string().uuid().optional(),
  }),
  preconditions: async (ctx, input) => {
    // The composite foreign key would catch a cross-tenant organization, but a
    // named precondition failure is a better error than a constraint violation.
    const org = await ctx.tx.organization.findUnique({ where: { id: input.organizationId } });
    if (!org) throw new Error("E_VALIDATION: organization not found in this tenant");
  },
  handler: async (ctx, input) => {
    const location = await ctx.tx.location.create({
      data: {
        tenantId: ctx.actor.tenantId,
        organizationId: input.organizationId,
        placeId: input.placeId ?? null,
        name: input.name,
      },
    });
    return {
      result: { id: location.id },
      events: [{ name: "verity.location.location_created", entityId: location.id }],
    };
  },
};

export const addGeofence: CommandDefinition<
  { locationId: string; name: string; centreLat: number; centreLng: number; radiusMetres: number },
  { id: string }
> = {
  key: "verity.location.add_geofence",
  entity: ENTITY_GEOFENCE,
  verb: "Create",
  input: z.object({
    locationId: z.string().uuid(),
    name: z.string().min(1),
    centreLat: z.number().min(-90).max(90),
    centreLng: z.number().min(-180).max(180),
    // A zero-radius fence admits nothing and is always a mistake.
    radiusMetres: z.number().int().positive(),
  }),
  handler: async (ctx, input) => {
    const fence = await ctx.tx.geofence.create({
      data: {
        tenantId: ctx.actor.tenantId,
        locationId: input.locationId,
        name: input.name,
        centreLat: input.centreLat,
        centreLng: input.centreLng,
        radiusMetres: input.radiusMetres,
      },
    });
    return {
      result: { id: fence.id },
      events: [{ name: "verity.location.geofence_added", entityId: fence.id }],
    };
  },
};

export const assignUserToLocation: CommandDefinition<
  { locationId: string; userId: string },
  { id: string }
> = {
  key: "verity.location.assign_user",
  entity: ENTITY_LOCATION,
  verb: "Edit",
  input: z.object({ locationId: z.string().uuid(), userId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const assignment = await ctx.tx.locationAssignment.create({
      data: {
        tenantId: ctx.actor.tenantId,
        locationId: input.locationId,
        userId: input.userId,
      },
    });
    return {
      result: { id: assignment.id },
      events: [{ name: "verity.location.user_assigned", entityId: input.locationId }],
    };
  },
};

/**
 * Writes tenant custom fields on a Location.
 *
 * Validation is the platform's `validateCustomFields`, which compiles the
 * tenant's own declarations at write time (PLA-EXT-003). The form's coercion is
 * a convenience; this is the control. An undeclared key is rejected rather than
 * stored, so `custom_fields` cannot accumulate data nothing validates.
 */
export const setLocationCustomFields: CommandDefinition<
  { locationId: string; customFields: Record<string, unknown> },
  { fields: number }
> = {
  key: "verity.location.set_custom_fields",
  entity: ENTITY_LOCATION,
  verb: "Edit",
  input: z.object({
    locationId: z.string().uuid(),
    customFields: z.record(z.string(), z.unknown()),
  }),
  handler: async (ctx, input) => {
    const before = await ctx.tx.location.findUniqueOrThrow({ where: { id: input.locationId } });
    const validated = await validateCustomFields(ctx.tx, ENTITY_LOCATION, input.customFields);

    const after = await ctx.tx.location.update({
      where: { id: input.locationId },
      data: { customFields: validated as never, version: { increment: 1 } },
    });

    await recordActivity(ctx, {
      entityKey: ENTITY_LOCATION,
      entityId: after.id,
      commandKey: "verity.location.set_custom_fields",
      changes: diffFields(
        { customFields: before.customFields },
        { customFields: after.customFields },
      ),
    });

    return {
      result: { fields: Object.keys(validated).length },
      events: [{ name: "verity.location.custom_fields_updated", entityId: after.id }],
    };
  },
};

/* -------------------------------- queries -------------------------------- */

export const listLocations: QueryDefinition<
  Record<string, never>,
  Array<Record<string, unknown>>
> = {
  key: "verity.location.list_locations",
  entity: ENTITY_LOCATION,
  input: z.object({}),
  handler: async (ctx) => {
    // Layer 2: only sites inside the actor's organization scope.
    const scope = await ctx.scope();
    return ctx.tx.location.findMany({ where: scope, orderBy: { name: "asc" } });
  },
};

/** Installs the capability into the running process. */
export function registerLocationCapability(): void {
  registerScopeResolver("Location", actorLocations);
  registerContribution({
    capabilityId: LOCATION_CAPABILITY,
    navigation: [
      { href: "/locations", label: "Locations", group: "Capabilities", order: 10,
        requiresEntity: ENTITY_LOCATION, shells: ["platform", "operations"] },
    ],
  });
  registerCommand(createPlace);
  registerCommand(createLocation);
  registerCommand(addGeofence);
  registerCommand(assignUserToLocation);
  registerCommand(setLocationCustomFields);
  registerQuery(listLocations);
}
