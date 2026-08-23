import type { SyncConflictKind } from "@prisma/client";
import { ForbiddenError } from "./authorization";
import { ConflictError } from "./entity";
import { ValidationError, executeCommand, getCommand, type ActorContext } from "./command";
import { withTenant, type TenantScopedClient } from "./tenancy";

/**
 * Offline sync runtime.
 *
 * Authority: Bible V5 §2 (Offline Synchronization Engine), REQ-DATA-SYNC-001→002,
 * REQ-DATA-OFFLINE-001→003, REQ-DATA-CONFLICTRESOLUTION-001→003.
 *
 * Only the parts the foundation itself requires are built here: an idempotent
 * inbox, ordered replay, optimistic concurrency, and explicit conflict
 * surfacing. Telemetry buffering and heartbeat merging are client-side and
 * capability concerns and are deliberately absent.
 */

/**
 * Accepts a command captured offline.
 *
 * Idempotency is a uniqueness constraint on the client-generated commandId
 * rather than a check-then-insert, because a check-then-insert races: two
 * retries arriving together would both find nothing and both apply. A collision
 * returns the stored result, so a client that retries after a dropped response
 * sees the original outcome instead of a second mutation.
 */
export async function enqueueOfflineCommand(
  tx: TenantScopedClient,
  args: {
    tenantId: string;
    commandId: string;
    commandKey: string;
    actorUserId: string;
    payload: Record<string, unknown>;
    deviceTimestamp: Date;
  },
): Promise<{ accepted: boolean; duplicateOf?: string }> {
  const existing = await tx.offlineCommand.findUnique({
    where: { tenantId_commandId: { tenantId: args.tenantId, commandId: args.commandId } },
  });
  if (existing) return { accepted: false, duplicateOf: existing.id };

  try {
    const row = await tx.offlineCommand.create({
      data: {
        tenantId: args.tenantId,
        commandId: args.commandId,
        commandKey: args.commandKey,
        actorUserId: args.actorUserId,
        payload: args.payload as never,
        deviceTimestamp: args.deviceTimestamp,
      },
    });
    return { accepted: true, duplicateOf: row.id };
  } catch {
    // Lost the race against a concurrent retry; the constraint decided.
    const winner = await tx.offlineCommand.findUnique({
      where: { tenantId_commandId: { tenantId: args.tenantId, commandId: args.commandId } },
    });
    return { accepted: false, duplicateOf: winner?.id };
  }
}

/** Classifies a replay failure into the Bible's conflict taxonomy (§2.C). */
export function classifyConflict(error: unknown): SyncConflictKind {
  if (error instanceof ForbiddenError) return "AuthorizationRevoked";
  if (error instanceof ConflictError) return "VersionConflict";
  if (error instanceof ValidationError) return "StateConflict";
  return "StateConflict";
}

/**
 * Replays pending commands for a tenant.
 *
 * Ordered by deviceTimestamp, not arrival time (Bible V5 §2.B.3): a device that
 * reconnects late must still have its work applied in the order the worker
 * actually did it, or process continuity is lost.
 *
 * A failure does not abort the batch. Bible V5 §2.C requires an aborted replay
 * to be recorded and queued for manual resolution rather than dropped — losing a
 * field worker's captured evidence is worse than surfacing a conflict — so each
 * failure is marked Rejected with a SyncException and the run continues.
 */
export async function replayPending(
  tenantId: string,
  resolveActor: (row: { actorUserId: string }) => Promise<ActorContext>,
  limit = 100,
): Promise<{ applied: number; rejected: number }> {
  const pending = await withTenant(tenantId, (tx) =>
    tx.offlineCommand.findMany({
      where: { status: "Pending" },
      orderBy: { deviceTimestamp: "asc" },
      take: limit,
    }),
  );

  let applied = 0;
  let rejected = 0;

  for (const row of pending) {
    const definition = getCommand(row.commandKey);

    if (!definition) {
      await withTenant(tenantId, async (tx) => {
        await tx.offlineCommand.update({
          where: { id: row.id },
          data: { status: "Rejected", error: `Unknown command: ${row.commandKey}` },
        });
        await tx.syncException.create({
          data: {
            tenantId,
            offlineCommandId: row.id,
            kind: "StateConflict",
            detail: `Unknown command: ${row.commandKey}`,
          },
        });
      });
      rejected++;
      continue;
    }

    try {
      const actor = await resolveActor({ actorUserId: row.actorUserId });
      const result = await executeCommand(actor, definition, row.payload);
      await withTenant(tenantId, (tx) =>
        tx.offlineCommand.update({
          where: { id: row.id },
          data: { status: "Applied", result: (result ?? {}) as never, appliedAt: new Date() },
        }),
      );
      applied++;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const kind = classifyConflict(error);
      await withTenant(tenantId, async (tx) => {
        await tx.offlineCommand.update({
          where: { id: row.id },
          data: { status: "Rejected", error: detail },
        });
        await tx.syncException.create({
          data: { tenantId, offlineCommandId: row.id, kind, detail },
        });
      });
      rejected++;
    }
  }

  return { applied, rejected };
}

/**
 * Field-level last-write-wins merge (Authority: Bible V5 §2.C).
 *
 * Two offline users editing *different* fields of one record both keep their
 * work; only a genuine collision on the same field is resolved by
 * deviceTimestamp. Merging at record level instead would silently discard the
 * other user's untouched fields.
 */
export function mergeFieldLevel<T extends Record<string, unknown>>(
  base: T,
  edits: Array<{ changes: Partial<T>; deviceTimestamp: Date }>,
): T {
  const winners = new Map<string, { value: unknown; at: Date }>();

  for (const edit of edits) {
    for (const [field, value] of Object.entries(edit.changes)) {
      const held = winners.get(field);
      if (!held || edit.deviceTimestamp > held.at) {
        winners.set(field, { value, at: edit.deviceTimestamp });
      }
    }
  }

  const merged: Record<string, unknown> = { ...base };
  for (const [field, { value }] of winners) merged[field] = value;
  return merged as T;
}

/**
 * Optimistic concurrency guard (Authority: Bible V3, implementation entity.md).
 *
 * Increments `version` only when the caller's expected version still matches,
 * and raises E_CONFLICT otherwise. The comparison and the write are one
 * statement, so a concurrent update cannot slip between them.
 */
export async function updateWithVersion<T>(
  tx: TenantScopedClient,
  args: {
    model: { updateMany: (a: never) => Promise<{ count: number }> };
    id: string;
    expectedVersion: number;
    data: Record<string, unknown>;
    label?: string;
  },
): Promise<void> {
  const { count } = await args.model.updateMany({
    where: { id: args.id, version: args.expectedVersion },
    data: { ...args.data, version: { increment: 1 } },
  } as never);

  if (count === 0) {
    throw new ConflictError(
      `E_CONFLICT: ${args.label ?? "record"} ${args.id} was modified by someone else`,
    );
  }
}
