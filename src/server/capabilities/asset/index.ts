import { z } from "zod";
import { registerCommand, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { assertMutable, transition } from "@/server/platform/state";
import { diffFields, recordActivity } from "@/server/platform/audit";

/**
 * CAPABILITY: Asset — `verity.capability.asset`
 *
 * Authority: GOV-TER-009, ADR-008 (an Asset is one of the two things a Resource
 * may be backed by). Depends on Location.
 *
 * Note what is absent: no make, model, year, or equipment-specific column of any
 * kind. Forbidden pattern #3 exists because VEDA put vehicle brand and model
 * identifiers into a core table. A fleet tenant and a hospital tenant describe
 * their equipment through custom fields, and the platform knows neither domain.
 */

export const ASSET_CAPABILITY = "verity.capability.asset";
export const ENTITY_ASSET = "verity.asset.asset";

export const registerAsset: CommandDefinition<
  { name: string; reference?: string; locationId?: string },
  { id: string }
> = {
  key: "verity.asset.register",
  entity: ENTITY_ASSET,
  verb: "Create",
  input: z.object({
    name: z.string().min(1),
    reference: z.string().min(1).optional(),
    locationId: z.string().uuid().optional(),
  }),
  handler: async (ctx, input) => {
    const asset = await ctx.tx.asset.create({
      data: {
        tenantId: ctx.actor.tenantId,
        name: input.name,
        reference: input.reference ?? null,
        locationId: input.locationId ?? null,
      },
    });
    return {
      result: { id: asset.id },
      events: [{ name: "verity.asset.registered", entityId: asset.id }],
    };
  },
};

/**
 * Moves an asset between states through the platform's transition runtime, so
 * an undeclared move is refused by absence rather than by a check here.
 */
export const changeAssetState: CommandDefinition<
  { assetId: string; toState: string },
  { state: string }
> = {
  key: "verity.asset.change_state",
  entity: ENTITY_ASSET,
  verb: "Edit",
  input: z.object({ assetId: z.string().uuid(), toState: z.string().min(1) }),
  handler: async (ctx, input) => {
    const asset = await ctx.tx.asset.findUniqueOrThrow({ where: { id: input.assetId } });

    // INV-002: a retired or lost asset is permanently read-only.
    await assertMutable(ctx.tx, ENTITY_ASSET, asset.state);

    const moved = await transition(ctx, {
      entityKey: ENTITY_ASSET,
      entityId: asset.id,
      fromKey: asset.state,
      toKey: input.toState,
    });

    const updated = await ctx.tx.asset.update({
      where: { id: asset.id },
      data: { state: input.toState, version: { increment: 1 } },
    });

    await recordActivity(ctx, {
      entityKey: ENTITY_ASSET,
      entityId: asset.id,
      commandKey: "verity.asset.change_state",
      changes: diffFields({ state: asset.state }, { state: updated.state }),
    });

    return { result: { state: updated.state }, events: [moved.event] };
  },
};

export const relocateAsset: CommandDefinition<
  { assetId: string; locationId: string },
  { locationId: string }
> = {
  key: "verity.asset.relocate",
  entity: ENTITY_ASSET,
  verb: "Edit",
  input: z.object({ assetId: z.string().uuid(), locationId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const before = await ctx.tx.asset.findUniqueOrThrow({ where: { id: input.assetId } });
    await assertMutable(ctx.tx, ENTITY_ASSET, before.state);

    const after = await ctx.tx.asset.update({
      where: { id: input.assetId },
      data: { locationId: input.locationId, version: { increment: 1 } },
    });

    await recordActivity(ctx, {
      entityKey: ENTITY_ASSET,
      entityId: after.id,
      commandKey: "verity.asset.relocate",
      changes: diffFields({ locationId: before.locationId }, { locationId: after.locationId }),
    });

    return {
      result: { locationId: input.locationId },
      events: [{ name: "verity.asset.relocated", entityId: after.id, payload: { to: input.locationId } }],
    };
  },
};

export const listAssets: QueryDefinition<
  { locationId?: string },
  Array<Record<string, unknown>>
> = {
  key: "verity.asset.list",
  entity: ENTITY_ASSET,
  input: z.object({ locationId: z.string().uuid().optional() }),
  handler: async (ctx, input) =>
    ctx.tx.asset.findMany({
      where: input.locationId ? { locationId: input.locationId } : {},
      orderBy: { name: "asc" },
    }),
};

export function registerAssetCapability(): void {
  registerCommand(registerAsset);
  registerCommand(changeAssetState);
  registerCommand(relocateAsset);
  registerQuery(listAssets);
}
