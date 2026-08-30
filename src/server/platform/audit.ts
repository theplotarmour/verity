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
 * Field names whose *values* must never reach the audit tables (Task 38).
 *
 * The audit stream is append-only by trigger: `UPDATE` is refused for every
 * role without exception. A secret written here cannot be redacted afterwards
 * — not by the application, not by an administrator, not by a support
 * engineer with good intentions. The only safe moment is before the write.
 *
 * Matched on the field *name*, not the value, because a value-shaped heuristic
 * ("looks like a token") fails in both directions and fails silently.
 */
const SENSITIVE_FIELD =
  /(password|passphrase|secret|token|credential|api_?key|private_?key|signing_?key|otp_?code|^otp$|^pin$|^salt$)/i;

/** Marker written in place of a sensitive value. Never a real value's shape. */
export const REDACTED = "[redacted]";

/**
 * Whether this field's values must be withheld from the audit stream.
 *
 * Exported so a capability can check the same rule rather than inventing a
 * second list that drifts from this one.
 */
export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD.test(fieldName);
}

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
 * Renders a value, withholding it when the field is sensitive.
 *
 * The change is still recorded — the field name, that it changed, by whom and
 * when. "The API key was rotated by X at T" is exactly the fact a compliance
 * reviewer needs; the key itself is exactly what they must not be handed.
 *
 * A null stays null rather than becoming `[redacted]`: "this secret was
 * cleared" and "this secret was set to something" are different events, and
 * flattening them would hide a credential removal.
 */
function renderAuditable(fieldName: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return isSensitiveField(fieldName) ? REDACTED : render(value);
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
      // Sensitive values are withheld here, at the only moment it is possible:
      // the row cannot be updated afterwards, by anyone (EXE-AUD-003).
      oldValue: renderAuditable(c.field, c.oldValue),
      newValue: renderAuditable(c.field, c.newValue),
      commandKey: args.commandKey ?? null,
      correlationId: ctx.correlationId,
      source: ctx.channel,
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
    /** Ties this event to the request that caused it (Task 38). */
    correlationId?: string | null;
  },
): Promise<void> {
  await tx.securityAuditEvent.create({
    data: {
      tenantId: args.tenantId,
      eventType: args.eventType,
      actorUserId: args.actorUserId ?? null,
      ipAddress: args.ipAddress ?? null,
      payload: redactPayload(args.payload ?? {}) as never,
      correlationId: args.correlationId ?? null,
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

/**
 * Recursively withholds sensitive values from a security-event payload.
 *
 * A security event's payload is free-form — a capability records what it
 * considers relevant — and `ConfigurationChanged` or `ApiKeyGenerated` is
 * exactly where a secret would otherwise be handed to an append-only table.
 * Keys are preserved so the shape of the event remains readable.
 */
export function redactPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isSensitiveField(key)) {
      out[key] = value === null || value === undefined ? value : REDACTED;
    } else if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      out[key] = redactPayload(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/* ------------------------------------------------------------------------- *
 * Reconstruction (Task 38)
 * ------------------------------------------------------------------------- */

/**
 * One entry in a reconstructed history.
 *
 * Carries the brief's whole list — actor, action, resource, before, after,
 * timestamp, context, correlation, source — in one shape, so a reader does not
 * reassemble a timeline from three tables by hand and get it subtly wrong.
 */
export type HistoryEntry = {
  kind: "change" | "fact";
  occurredAt: Date;
  entityKey: string;
  entityId: string | null;
  /** Field name for a change; event name for a fact. */
  action: string;
  actorUserId: string | null;
  commandKey: string | null;
  correlationId: string | null;
  source: string | null;
  before?: string | null;
  after?: string | null;
  payload?: unknown;
};

/**
 * The reconstructable history of one record: what changed, and what facts were
 * published about it, in one ordered timeline.
 *
 * Answers the brief's question directly — *who did what, to which object, when,
 * and what changed* — rather than leaving it as a convention each caller
 * reassembles. Oldest first, because a history is read forwards.
 *
 * The business ledger is deliberately **not** merged in. A ledger entry is a
 * business consequence owned by a capability, and folding a bookkeeping
 * correction into the audit stream would make a legitimate adjustment
 * indistinguishable from a tampered audit row.
 */
export async function reconstructHistory(
  tx: TenantScopedClient,
  entityKey: string,
  entityId: string,
): Promise<HistoryEntry[]> {
  const [changes, facts] = await Promise.all([
    tx.activity.findMany({
      where: { entityKey, entityId },
      orderBy: { occurredAt: "asc" },
    }),
    tx.domainEvent.findMany({
      where: { entityKey, entityId },
      orderBy: { occurredAt: "asc" },
    }),
  ]);

  const entries: HistoryEntry[] = [
    ...changes.map((row): HistoryEntry => ({
      kind: "change",
      occurredAt: row.occurredAt,
      entityKey: row.entityKey,
      entityId: row.entityId,
      action: row.fieldChanged,
      actorUserId: row.actorUserId,
      commandKey: row.commandKey,
      correlationId: row.correlationId,
      source: row.source,
      before: row.oldValue,
      after: row.newValue,
    })),
    ...facts.map((row): HistoryEntry => ({
      kind: "fact",
      occurredAt: row.occurredAt,
      entityKey: row.entityKey,
      entityId: row.entityId,
      action: row.name,
      actorUserId: row.actorUserId,
      commandKey: row.commandKey,
      correlationId: row.correlationId,
      source: row.source,
      payload: row.payload,
    })),
  ];

  return entries.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

/**
 * Everything one request produced, across all three streams.
 *
 * This is what correlation buys. Asked "what else happened in the operation
 * that changed this price?", the platform can now answer instead of inferring
 * from timestamps — and a timestamp inference is precisely the kind of
 * reasoning that fails in a dispute, because two requests a millisecond apart
 * look identical to it.
 */
export async function reconstructRequest(
  tx: TenantScopedClient,
  correlationId: string,
): Promise<{
  changes: HistoryEntry[];
  facts: HistoryEntry[];
  securityEvents: Array<{ eventType: string; actorUserId: string | null; occurredAt: Date }>;
}> {
  const [changes, facts, security] = await Promise.all([
    tx.activity.findMany({ where: { correlationId }, orderBy: { occurredAt: "asc" } }),
    tx.domainEvent.findMany({ where: { correlationId }, orderBy: { occurredAt: "asc" } }),
    tx.securityAuditEvent.findMany({ where: { correlationId }, orderBy: { occurredAt: "asc" } }),
  ]);

  return {
    changes: changes.map((row) => ({
      kind: "change" as const,
      occurredAt: row.occurredAt,
      entityKey: row.entityKey,
      entityId: row.entityId,
      action: row.fieldChanged,
      actorUserId: row.actorUserId,
      commandKey: row.commandKey,
      correlationId: row.correlationId,
      source: row.source,
      before: row.oldValue,
      after: row.newValue,
    })),
    facts: facts.map((row) => ({
      kind: "fact" as const,
      occurredAt: row.occurredAt,
      entityKey: row.entityKey,
      entityId: row.entityId,
      action: row.name,
      actorUserId: row.actorUserId,
      commandKey: row.commandKey,
      correlationId: row.correlationId,
      source: row.source,
      payload: row.payload,
    })),
    securityEvents: security.map((row) => ({
      eventType: row.eventType,
      actorUserId: row.actorUserId,
      occurredAt: row.occurredAt,
    })),
  };
}
