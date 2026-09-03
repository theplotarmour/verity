/**
 * Grounding enforcement (Task 84 area 4; Task 81 rule 1, "query before
 * claiming").
 *
 * Not authorization. An agent-channel command can be rejected here even when
 * `enforcePolicy` would allow it, and every other channel never calls this at
 * all. ADR-017 says the channel never changes WHO may act; this restricts the
 * SOURCE of a value, not who may write it — a human typing an ID into a form
 * grounded it by reading it off a screen the platform rendered. An agent has
 * to prove the same thing by having queried it in this turn.
 *
 * MVP scope, not the full design the taskplan describes: any input field
 * named `*Id` with a non-empty string value must have appeared as an `id` in
 * an `executeQuery` result during this turn. It does not yet know WHICH
 * entity a field references — that needs a declarative reference schema on
 * `CommandDefinition.input` that does not exist yet — so it catches "the
 * model invented a plausible UUID" but not "the model quoted a real ID from
 * the wrong entity." That refinement is future work, tracked in
 * `taskplans/84_verity_ai_agent_system.md`, not built here.
 */

export class GroundingError extends Error {
  readonly code = "E_UNGROUNDED" as const;
  constructor(
    message: string,
    readonly fields: string[],
  ) {
    super(message);
    this.name = "GroundingError";
  }
}

/**
 * One per agent turn — never module-level state, and never shared across
 * turns or actors. The caller (the chat route, area 6) owns its lifetime.
 */
export class GroundingCache {
  private readonly seen = new Set<string>();

  /** Records every `id` surfaced by a query result. */
  record(result: unknown): void {
    for (const row of Array.isArray(result) ? result : [result]) {
      if (row && typeof row === "object" && "id" in row) {
        const id = (row as { id: unknown }).id;
        if (typeof id === "string" && id.length > 0) this.seen.add(id);
      }
    }
  }

  has(id: string): boolean {
    return this.seen.has(id);
  }
}

const ID_FIELD = /Id$/;

/**
 * Throws `GroundingError` if any `*Id` field in `input` was never surfaced by
 * a query this turn. Called only when a `GroundingCache` was actually passed
 * — every non-agent channel passes none, so this is a no-op cost for them.
 */
export function assertGrounded(input: unknown, cache: GroundingCache): void {
  if (!input || typeof input !== "object") return;

  const ungrounded: string[] = [];
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!ID_FIELD.test(key) || typeof value !== "string" || value.length === 0) continue;
    if (!cache.has(value)) ungrounded.push(key);
  }

  if (ungrounded.length > 0) {
    throw new GroundingError(
      `E_UNGROUNDED: field(s) ${ungrounded.join(", ")} reference an ID not seen in a query result this turn`,
      ungrounded,
    );
  }
}
