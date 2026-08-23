import { z } from "zod";
import { authorize } from "./authorization";
import { capabilityForEntity, requireCapabilityActive } from "./capability";
import { withTenant, type TenantScopedClient } from "./tenancy";
import { ValidationError, type ActorContext } from "./command";

/**
 * Query runtime.
 *
 * A Query reads current state; it never mutates. Separating it from Command is
 * required by the platform vocabulary — Command requests an action, Query reads
 * state, Event records a fact — and blurring them is what lets a "read" quietly
 * acquire side effects.
 *
 * Reads still pass an authorization check: RLS guarantees a tenant cannot see
 * another tenant's rows, but it says nothing about whether *this actor* may read
 * this entity at all. Both are needed.
 */

export type QueryContext = {
  actor: ActorContext;
  tx: TenantScopedClient;
};

export type QueryDefinition<TInput, TResult> = {
  key: string;
  /** EntityDefinition.key being read. */
  entity: string;
  input: z.ZodType<TInput>;
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

/** Test seam: empties the query registry. */
export function clearQueries(): void {
  registry.clear();
}

/** Runs a query: validate input, check Read permission, then read. */
export async function executeQuery<TInput, TResult>(
  actor: ActorContext,
  def: QueryDefinition<TInput, TResult>,
  rawInput: unknown,
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
    await authorize(tx, actor.roleId, "Read", def.entity);
    return def.handler({ actor, tx }, parsed.data);
  });
}
