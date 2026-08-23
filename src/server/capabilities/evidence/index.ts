import { z } from "zod";
import { registerCommand, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { withinGeofence } from "@/server/capabilities/location";

/**
 * CAPABILITY: Evidence — `verity.capability.evidence`
 *
 * Authority: Bible V2 (Evidence as immutable field data — GPS, photos,
 * signatures), EXE-AUD-003 (append-only), ADR-004 (a geofence is the policy
 * that judges a captured point). Depends on Location.
 *
 * Evidence is why the append-only guarantee had to hold even against a
 * privileged role: a calibration certificate or a proof-of-attendance
 * photograph that can be edited afterwards is not evidence, and a regulator
 * asking "could this have been changed" needs the answer to be no.
 *
 * The geofence verdict is stored at capture time rather than computed on read.
 * A fence can be moved or resized later, and re-judging a two-year-old check-in
 * against today's boundary would silently rewrite history.
 */

export const EVIDENCE_CAPABILITY = "verity.capability.evidence";
export const ENTITY_EVIDENCE = "verity.evidence.evidence";

export const captureEvidence: CommandDefinition<
  {
    entityKey: string;
    entityId: string;
    kind: "Photo" | "Signature" | "GeoPoint" | "Document" | "Reading";
    uri?: string;
    latitude?: number;
    longitude?: number;
    capturedAt: string;
    geofenceId?: string;
    payload?: Record<string, unknown>;
  },
  { id: string; withinFence: boolean | null }
> = {
  key: "verity.evidence.capture",
  entity: ENTITY_EVIDENCE,
  verb: "Create",
  input: z.object({
    entityKey: z.string().min(1),
    entityId: z.string().uuid(),
    kind: z.enum(["Photo", "Signature", "GeoPoint", "Document", "Reading"]),
    uri: z.string().min(1).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    capturedAt: z.string().datetime(),
    geofenceId: z.string().uuid().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  }),
  preconditions: async (_ctx, input) => {
    // A photo or document without a stored artefact is not evidence of anything.
    if ((input.kind === "Photo" || input.kind === "Document") && !input.uri) {
      throw new Error(`E_VALIDATION: ${input.kind} evidence requires a stored artefact`);
    }
    if (input.kind === "GeoPoint" && (input.latitude === undefined || input.longitude === undefined)) {
      throw new Error("E_VALIDATION: GeoPoint evidence requires coordinates");
    }
  },
  handler: async (ctx, input) => {
    // Judge against the fence now and record the verdict, because the fence may
    // move later and the verdict must not move with it.
    let withinFence: boolean | null = null;
    if (input.geofenceId && input.latitude !== undefined && input.longitude !== undefined) {
      withinFence = await withinGeofence(ctx.tx, input.geofenceId, {
        latitude: input.latitude,
        longitude: input.longitude,
      });
    }

    const evidence = await ctx.tx.evidence.create({
      data: {
        tenantId: ctx.actor.tenantId,
        entityKey: input.entityKey,
        entityId: input.entityId,
        kind: input.kind,
        uri: input.uri ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        capturedAt: new Date(input.capturedAt),
        capturedById: ctx.actor.userId,
        geofenceId: input.geofenceId ?? null,
        withinFence,
        payload: (input.payload ?? {}) as never,
      },
    });

    return {
      result: { id: evidence.id, withinFence },
      events: [
        {
          name: "verity.evidence.captured",
          entityId: evidence.id,
          payload: { kind: input.kind, subject: input.entityKey, withinFence },
        },
      ],
    };
  },
};

export const listEvidenceFor: QueryDefinition<
  { entityKey: string; entityId: string },
  Array<Record<string, unknown>>
> = {
  key: "verity.evidence.list_for",
  entity: ENTITY_EVIDENCE,
  input: z.object({ entityKey: z.string().min(1), entityId: z.string().uuid() }),
  handler: async (ctx, input) =>
    ctx.tx.evidence.findMany({
      where: { entityKey: input.entityKey, entityId: input.entityId },
      orderBy: { capturedAt: "asc" },
    }),
};

export function registerEvidenceCapability(): void {
  registerCommand(captureEvidence);
  registerQuery(listEvidenceFor);
}
