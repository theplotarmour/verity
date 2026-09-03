import { z } from "zod";
import { listCommands, type CommandDefinition } from "./command";
import { listQueries, type QueryDefinition } from "./query";
import { resolvePermissions } from "./authorization";
import { isCapabilityActive, capabilityForEntity } from "./capability";
import type { ActorContext } from "./command";
import type { TenantScopedClient } from "./tenancy";

/**
 * Tool manifest — Task 84 areas 1 and 3, combined.
 *
 * Authority: `taskplans/84_verity_ai_agent_system.md` areas 1 ("tool-manifest
 * generator... one source of truth, never a hand-duplicated second copy of
 * 'what a sales order needs'") and 3 ("the model never sees a tool it holds
 * no grant for"). Combined into one function rather than a generate-then-
 * filter pipeline, because a manifest that isn't already scoped to the
 * actor isn't a manifest worth generating — nothing downstream should ever
 * see the unfiltered list.
 *
 * This produces DATA ONLY. No LLM SDK, no tool-calling loop, nothing wired
 * to a chat surface — that is area 6, a separate, not-yet-started piece
 * gated on a provider decision this file makes no assumption about.
 *
 * ADR-017's rule is unchanged by this file's existence: whatever eventually
 * calls a tool from this manifest still executes as the calling human's own
 * `ActorContext`, through `executeCommand`/`executeQuery` exactly like any
 * other caller. This file only decides which tools that actor is even
 * offered — it grants nothing by itself.
 *
 * PERFORMANCE: the first version of this called `permittedVerbs()` (which
 * itself calls `resolvePermissions`, a recursive role-composition query) once
 * PER registered command/query. Timed out a 15s interactive transaction
 * against the real registry (~110 commands/queries across every shipped
 * capability) before it finished — confirmed live, not assumed. Fixed by
 * calling `resolvePermissions` exactly once per manifest build and checking
 * each candidate against the in-memory result; `capabilityForEntity` gets
 * the same one-Map-per-build treatment, since several commands typically
 * share one entity. `isCapabilityActive` was already fine as-is — it caches
 * per tenant internally (`capability.ts`'s own `activeCache`).
 */

export type ToolDescriptor = {
  key: string;
  kind: "command" | "query";
  entity: string;
  description?: string;
  /** JSON Schema for the input, from zod's own `toJSONSchema` — no separate
   *  schema to keep in sync with the zod definition every command/query
   *  already carries. */
  inputSchema: object;
  /** Commands only. Absent means routine — see `CommandDefinition.impact`. */
  impact?: "routine" | "destructive";
};

/**
 * The tools one actor is currently offered: every registered command whose
 * capability is active for this tenant and whose verb the actor's role
 * grants on that entity, plus every such query for `Read`.
 */
export async function buildToolManifest(
  tx: TenantScopedClient,
  actor: ActorContext,
): Promise<ToolDescriptor[]> {
  // Deny-by-default: a membership with no role grants nothing (matches
  // evaluatePolicy's own first check in policy.ts) — no point resolving
  // anything further.
  if (!actor.roleId) return [];

  // One recursive permission-resolution query for the whole build, not one
  // per candidate. `grantedVerbs.get(entity)` is the actor's verb set for
  // that entity across every scope the role holds — scope narrowing (which
  // records this actor may act on) is Layer 2's job at execution time, not
  // this listing's; a tool appearing here means "this verb, on this entity,
  // at SOME scope," which is exactly what deciding tool visibility needs.
  const grants = await resolvePermissions(tx, actor.roleId);
  const grantedVerbs = new Map<string, Set<string>>();
  for (const g of grants) {
    const set = grantedVerbs.get(g.entity) ?? new Set<string>();
    set.add(g.verb);
    grantedVerbs.set(g.entity, set);
  }

  const capabilityByEntity = new Map<string, string | null>();
  async function capabilityOf(entity: string): Promise<string | null> {
    if (!capabilityByEntity.has(entity)) {
      capabilityByEntity.set(entity, await capabilityForEntity(tx, entity));
    }
    return capabilityByEntity.get(entity)!;
  }

  async function entityUsable(entity: string, verb: string): Promise<boolean> {
    if (!grantedVerbs.get(entity)?.has(verb)) return false;
    const capability = await capabilityOf(entity);
    if (capability && !(await isCapabilityActive(tx, actor.tenantId, capability))) return false;
    return true;
  }

  const tools: ToolDescriptor[] = [];

  for (const def of listCommands()) {
    if (!(await entityUsable(def.entity, def.verb))) continue;
    tools.push({
      key: def.key,
      kind: "command",
      entity: def.entity,
      description: def.description,
      inputSchema: z.toJSONSchema(def.input as z.ZodType),
      impact: def.impact,
    });
  }

  for (const def of listQueries()) {
    if (!(await entityUsable(def.entity, "Read"))) continue;
    tools.push({
      key: def.key,
      kind: "query",
      entity: def.entity,
      description: def.description,
      inputSchema: z.toJSONSchema(def.input as z.ZodType),
    });
  }

  return tools;
}
