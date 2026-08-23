import type { SecurityEventType } from "@prisma/client";
import type { CommandContext } from "./command";
import type { TenantScopedClient } from "./tenancy";

/**
 * Audit runtime.
 *
 * Authority: Spec EXE-AUD-001 (operational stream, infinite retention),
 * EXE-AUD-002 (security stream), EXE-AUD-003 (append-only at the database level),
 * MET-EVE-001 (events are write-once).
 *
 * Two streams, deliberately not one. The operational stream answers "what
 * changed on this record and who changed it" and is kept forever for contract
 * disputes; the security stream answers "who authenticated, whose permissions
 * moved" and is retained on a compliance clock. Merging them would force the
 * stricter retention on both and make either harder to read.
 *
 * An Event and an Activity are not the same thing and are not interchangeable:
 * an Event is a fact published for other parts of the system to react to, an
 * Activity is the field-level record of a mutation. A capability usually writes
 * both, and they are stored separately so a change to one does not rewrite the
 * other.
 */

export type FieldChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

/**
 * Renders a value for the audit log.
 *
 * Stored as text because an audit row must remain readable after the column it
 * describes has been altered or dropped — a typed reference would rot with the
 * schema it points at.
 */
function render(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Computes the changed fields between two versions of a record.
 *
 * Only fields whose rendered value actually differs are returned, so an update
 * that rewrites a field with its existing value produces no audit noise.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  ignore: readonly string[] = ["updatedAt", "version"],
): FieldChange[] {
  const skip = new Set(ignore);
  const changes: FieldChange[] = [];

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (skip.has(key)) continue;
    if (render(before[key]) !== render(after[key])) {
      changes.push({ field: key, oldValue: before[key], newValue: after[key] });
    }
  }
  return changes;
}

/**
 * Appends field-level changes to the operational stream (EXE-AUD-001).
 *
 * Call from inside a command handler so the audit row shares the mutation's
 * transaction: an audit entry for work that rolled back would be a lie, and one
 * missing for work that committed would be a gap.
 */
export async function recordActivity(
  ctx: CommandContext,
  args: {
    entityKey: string;
    entityId: string;
    changes: FieldChange[];
    commandKey?: string;
  },
): Promise<number> {
  if (args.changes.length === 0) return 0;

  const { count } = await ctx.tx.activity.createMany({
    data: args.changes.map((c) => ({
      tenantId: ctx.actor.tenantId,
      entityKey: args.entityKey,
      entityId: args.entityId,
      actorUserId: ctx.actor.userId,
      fieldChanged: c.field,
      oldValue: render(c.oldValue),
      newValue: render(c.newValue),
      commandKey: args.commandKey ?? null,
    })),
  });
  return count;
}

/** Appends to the security stream (EXE-AUD-002). */
export async function recordSecurityEvent(
  tx: TenantScopedClient,
  args: {
    tenantId: string;
    eventType: SecurityEventType;
    actorUserId?: string | null;
    ipAddress?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.securityAuditEvent.create({
    data: {
      tenantId: args.tenantId,
      eventType: args.eventType,
      actorUserId: args.actorUserId ?? null,
      ipAddress: args.ipAddress ?? null,
      payload: (args.payload ?? {}) as never,
    },
  });
}

/** The change history for one record, newest first. */
export async function entityHistory(
  tx: TenantScopedClient,
  entityKey: string,
  entityId: string,
) {
  return tx.activity.findMany({
    where: { entityKey, entityId },
    orderBy: { occurredAt: "desc" },
  });
}
