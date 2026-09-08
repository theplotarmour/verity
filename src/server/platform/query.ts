import { recordExecutionFailure } from "./execution-failure";
import { limitActorRequests } from "./request-limits";
import { z } from "zod";
import { redactFields, redactResult, scopeFilter } from "./authorization";
import { capabilityForEntity, requireCapabilityActive } from "./capability";
import { withTenant, type TenantScopedClient } from "./tenancy";
import { ValidationError, type ActorContext } from "./command";
import { enforcePolicy, type PolicyChannel } from "./policy";
import type { GroundingCache } from "./grounding";

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
 * Handlers must explicitly declare scopeHandling to accept narrow grants and
 * enforce their row filters. All other operations require a Tenant grant.
 * Declared field restrictions are applied to arrays, objects and nested values.

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
  /** Only handlers with explicit row filtering/guards may opt into narrow grants. */
  scopeHandling?: "handler";
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
  /** Task 84 area 4 — records this query's result rows so a same-turn
   *  agent command can prove an `*Id` field was actually seen, not
   *  invented. Only meaningful when `channel === "agent"`. */
  grounding?: GroundingCache,
): Promise<TResult> {
  if (channel !== "job") await limitActorRequests(actor.tenantId, actor.userId, "query");
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
    await enforcePolicy(tx, actor, { verb: "Read", entity: def.entity, channel, resource: def.scopeHandling === "handler" ? undefined : {} });

    const ctx: QueryContext = {
      actor,
      tx,
      scope: () => scopeFilter(tx, actor, def.entity, "Read"),
      redact: (rows) => redactFields(tx, actor, def.entity, rows),
    };

    const result = await def.handler(ctx, parsed.data);

    const final = await redactResult(tx, actor, def.entity, result);

    // Task 84 area 4. Recorded AFTER redaction — a field the actor cannot
    // read cannot ground anything either, and `redactFields` omits rather
    // than nulls, so a redacted `id` (never realistic, but not assumed away)
    // would simply not be present to record.
    if (channel === "agent" && grounding) grounding.record(final);

    return final;
  }).catch(async (error: unknown) => {
    await recordExecutionFailure(error, actor, def.key);
    throw error;
  });
}
