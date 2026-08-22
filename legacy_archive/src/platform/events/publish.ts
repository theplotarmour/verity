import "server-only";

import type { EventPayload, PlatformEvent } from "./bus";

/**
 * The one way an action announces a milestone.
 *
 * Publishing used to be five lines inlined at the call site: import the bus,
 * import the reactions, register them, emit, swallow. Five lines that must be
 * identical everywhere or a workflow silently stops composing — the reaction
 * registry is lazily built, so an emit that forgets `registerReactions()` runs
 * against an empty map and reports success.
 *
 * So it is one call. `publish("work_order.completed", { factoryId, ... })`.
 *
 * Three properties every caller can rely on:
 *
 *  1. **Never throws.** A milestone that reached the database is true whether or
 *     not anything reacted to it. A failing reaction must not roll back the
 *     write that triggered it, so failures are logged here and stop here.
 *  2. **Registration is guaranteed.** Reactions are registered before the emit,
 *     idempotently, so no workflow depends on which module happened to import
 *     first.
 *  3. **Imports are lazy.** `reactions.ts` imports Prisma and every module it
 *     wires; loading that graph eagerly from an action that never emits is cost
 *     for nothing, and it is what makes a client component's import chain drag
 *     in `server-only`.
 *
 * Call it *after* your own commit, never inside the transaction.
 */
export async function publish<P extends EventPayload>(
  event: PlatformEvent,
  payload: P,
): Promise<void> {
  try {
    const [{ emit }, { registerReactions }] = await Promise.all([
      import("./bus"),
      import("./reactions"),
    ]);
    registerReactions();
    await emit(event, payload);
  } catch (error) {
    console.error(`event publish failed: ${event}`, error);
  }
}
