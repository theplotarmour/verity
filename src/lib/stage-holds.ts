/**
 * Why a stage stopped.
 *
 * A free-text reason is what the worker types; the cause is what a supervisor
 * triages on. Without one, "on hold" reads the same whether a machine is broken or
 * somebody stepped out, and an alert that cannot be triaged gets ignored.
 *
 * Lives here rather than in `stages.ts` so the worker's hold panel can render the
 * same list the server validates against — and because a `"use server"` module may
 * only export async functions.
 */
export const HOLD_CAUSES = {
  MACHINE_FAILURE: "Machine failure",
  CRITICAL_DELAY: "Critical delay",
  MATERIAL_SHORTAGE: "Waiting on material",
  OTHER: "Other",
} as const;

export type HoldCause = keyof typeof HOLD_CAUSES;

export const HOLD_CAUSE_KEYS = Object.keys(HOLD_CAUSES) as HoldCause[];

/**
 * The causes that stop the line and need somebody now rather than at shift end.
 *
 * A broken machine and a delay the worker cannot absorb are both idle capacity
 * from the moment they are reported. Waiting on material usually already has a
 * purchase trail behind it, and "other" is by definition not classified — both are
 * worth sending, neither is worth shouting about.
 */
export const URGENT_HOLD_CAUSES: HoldCause[] = ["MACHINE_FAILURE", "CRITICAL_DELAY"];

export function isUrgentHold(cause: HoldCause): boolean {
  return URGENT_HOLD_CAUSES.includes(cause);
}

/**
 * Narrow untrusted input to a known cause; anything unrecognised is OTHER.
 *
 * `Object.hasOwn`, not `in`: `in` walks the prototype chain, so `"constructor"`
 * and `"toString"` would validate as causes and then index to a function, putting
 * `function Object() { [native code] }` in a supervisor's alert.
 */
export function normalizeHoldCause(value: unknown): HoldCause {
  return typeof value === "string" && Object.hasOwn(HOLD_CAUSES, value)
    ? (value as HoldCause)
    : "OTHER";
}
