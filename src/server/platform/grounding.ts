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
  /** Every number that appeared anywhere in a query result this turn,
   *  canonicalized (see `canonicalizeNumber`). Feeds `checkProseClaims`
   *  only — never consulted by `assertGrounded`, which stays ID-only. */
  private readonly seenNumbers = new Set<string>();

  /** Records every `id` surfaced by a query result, and every numeric
   *  value reachable from it (for `checkProseClaims`). */
  record(result: unknown): void {
    for (const row of Array.isArray(result) ? result : [result]) {
      this.recordNumbers(row, 0);
      if (row && typeof row === "object" && "id" in row) {
        const id = (row as { id: unknown }).id;
        if (typeof id === "string" && id.length > 0) this.seen.add(id);
      }
    }
  }

  private recordNumbers(value: unknown, depth: number): void {
    if (depth > 6) return; // bounded recursion, not a general JSON walker
    if (typeof value === "number" && Number.isFinite(value)) {
      this.seenNumbers.add(canonicalizeNumber(String(value)));
    } else if (Array.isArray(value)) {
      for (const v of value) this.recordNumbers(v, depth + 1);
    } else if (value && typeof value === "object") {
      for (const v of Object.values(value)) this.recordNumbers(v, depth + 1);
    }
  }

  has(id: string): boolean {
    return this.seen.has(id);
  }

  hasNumber(canonical: string): boolean {
    return this.seenNumbers.has(canonical);
  }
}

/** Strips currency symbols, thousands separators, and trailing ".00" so a
 *  query result's raw `1234.5` and a reply's prose `"₹1,234.50"` compare
 *  equal. Not locale-general — Verity's own currency formatting only. */
function canonicalizeNumber(raw: string): string {
  const stripped = raw.replace(/[₹$,\s]/g, "");
  const n = Number(stripped);
  return Number.isFinite(n) ? String(n) : stripped;
}

/** Matches a prose number worth checking: currency-prefixed, comma-grouped,
 *  or with a decimal point. Deliberately excludes bare small integers
 *  ("3 invoices," "step 2") — those are almost never the kind of claim
 *  Task 81 rule 1 is about, and checking them would mostly produce noise. */
const PROSE_NUMBER = /₹\s?[\d,]+(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d+\.\d+\b/g;

/**
 * Task 81 rules 1/2's "still open" gap (`implementation/13-conformance/
 * task-81-compliance-audit.md`): a prose claim ("the customer's balance is
 * ₹12,400") is not checked against this turn's query results the way a
 * write-time `*Id` field is.
 *
 * DELIBERATELY A WARNING, NOT A BLOCK. Full enforcement would mean refusing
 * to send a reply the model already composed — a false positive there
 * (a correctly-computed derived total, a number the user themselves stated,
 * a date-like number) blocks a correct answer outright, which is worse than
 * the gap this closes. Returns the claims that could not be matched to any
 * number surfaced by a query this turn; the caller decides what to do with
 * them (currently: attach to `AgentTurnResult.groundingWarnings`, never
 * used to alter or suppress the reply itself).
 *
 * Only meaningful when at least one query ran this turn — call sites should
 * skip this when `toolCalls` contains no successful query, to avoid flagging
 * every plain-conversation reply that happens to contain a number.
 */
export function checkProseClaims(reply: string, cache: GroundingCache): string[] {
  const matches = reply.match(PROSE_NUMBER);
  if (!matches) return [];

  const ungrounded: string[] = [];
  for (const raw of matches) {
    const canonical = canonicalizeNumber(raw);
    if (!cache.hasNumber(canonical)) ungrounded.push(raw.trim());
  }
  return ungrounded;
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
