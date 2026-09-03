import { z } from "zod";
import { redactFields, scopeFilter } from "./authorization";
import { capabilityForEntity, requireCapabilityActive } from "./capability";
import { withTenant, type TenantScopedClient } from "./tenancy";
import { ValidationError, type ActorContext } from "./command";
import { enforcePolicy, type PolicyChannel } from "./policy";

/**
 * Query runtime.
 *
 * A Query reads current state; it never mutates. Separating it from Command is
 * required by the platform vocabulary — Command requests an action, Query reads
 * state, Event records a fact — and blurring them is what lets a "read" quietly
 * acquire side effects.
 *
 * Reads pass all three authorization layers. RLS guarantees a tenant cannot see
 * another tenant's rows; Layer 1 decides whether this actor may read the entity
 * at all; Layer 2 narrows which rows inside the tenant are theirs; Layer 3
 * removes restricted fields from what survives.
 *
 * Layer 2 is offered to the handler rather than imposed on it, because the
 * platform does not know where a capability keeps its organization column — or
 * whether the entity is organization-scoped at all. Layer 3 is applied
 * automatically to a top-level array result, which is the shape almost every
 * list query returns; a handler returning something more nested is responsible
 * for calling `ctx.redact` itself, and the field-permission registry makes that
 * requirement discoverable rather than tribal.
 */

export type QueryContext = {
  actor: ActorContext;
  tx: TenantScopedClient;
  /**
   * Prisma filter limiting results to organizations the actor can reach
   * (PLA-AUT-004). Spread into a `where` clause.
   */
  scope: () => Promise<{ organizationId: { in: string[] } }>;
  /** Strips restricted fields the actor may not read (PLA-AUT-005). */
  redact: <T extends Record<string, unknown>>(rows: T[]) => Promise<Array<Partial<T>>>;
};

export type QueryDefinition<TInput, TResult> = {
  key: string;
  /** EntityDefinition.key being read. */
  entity: string;
  input: z.ZodType<TInput>;
  /** One sentence, business language — see the same field on CommandDefinition. */
  description?: string;
  handler: (ctx: QueryContext, input: TInput) => Promise<TResult>;
};

const registry = new Map<string, QueryDefinition<unknown, unknown>>();

export function registerQuery<TInput, TResult>(def: QueryDefinition<TInput, TResult>): void {
  if (registry.has(def.key)) throw new Error(`Query already registered: ${def.key}`);
  registry.set(def.key, def as QueryDefinition<unknown, unknown>);
}

export function getQuery(key: string): QueryDefinition<unknown, unknown> | undefined {
  return registry.get(key);
}

/** Every registered query. Mirrors `listCommands` in `command.ts`, same reason. */
export function listQueries(): QueryDefinition<unknown, unknown>[] {
  return [...registry.values()];
}

/** Test seam: empties the query registry. */
export function clearQueries(): void {
  registry.clear();
}

/**
 * Runs a query: validate input, check Read permission, then read.
 *
 * `channel` defaults to `"api"`, matching `executeCommand`'s own default —
 * a server action or route handler is the ordinary caller. Threaded through
 * to `enforcePolicy` for the same reason `executeCommand` already does:
 * recorded on the decision for audit, consulted by no authorization rule
 * (`policy.ts`'s own module doc explains why that split matters).
 */
export async function executeQuery<TInput, TResult>(
  actor: ActorContext,
  def: QueryDefinition<TInput, TResult>,
  rawInput: unknown,
  channel: PolicyChannel = "api",
): Promise<TResult> {
  return withTenant(actor.tenantId, async (tx) => {
    const parsed = def.input.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError(
        `E_VALIDATION: input rejected for ${def.key}`,
        parsed.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`),
      );
    }
    const capability = await capabilityForEntity(tx, def.entity);
    if (capability) await requireCapabilityActive(tx, actor.tenantId, capability);
    // Was a direct `authorize()` call (Layer 1 only, no channel). Routed
    // through the same decision point `executeCommand` uses instead —
    // `enforcePolicy` throws ForbiddenError on deny exactly like `authorize`
    // did, and Layer 1's grant resolution is the same `resolve_permissions`
    // call either way, so this changes nothing about who can read what.
    await enforcePolicy(tx, actor, { verb: "Read", entity: def.entity, channel });

    const ctx: QueryContext = {
      actor,
      tx,
      scope: () => scopeFilter(tx, actor, def.entity, "Read"),
      redact: (rows) => redactFields(tx, actor, def.entity, rows),
    };

    const result = await def.handler(ctx, parsed.data);

    // Layer 3 on the common shape. Only a top-level array of plain objects is
    // handled; anything else is the handler's own responsibility, and silently
    // half-redacting a nested structure would be worse than not touching it.
    if (Array.isArray(result) && result.every((r) => r && typeof r === "object")) {
      return (await redactFields(
        tx,
        actor,
        def.entity,
        result as Array<Record<string, unknown>>,
      )) as TResult;
    }
    return result;
  });
}
