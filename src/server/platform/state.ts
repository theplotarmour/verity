import { ValidationError, type CommandContext } from "./command";
import type { TenantScopedClient } from "./tenancy";

/**
 * State and transition runtime.
 *
 * Authority: Spec MET-STA-001→004, MET-TRA-001→004, INV-002 (read-only closed
 * states), implementation/04-domain-runtime/state.md.
 *
 * The three guard categories are enforced in different places, deliberately:
 *
 *   MET-TRA-001 structural   — the transition_definition table. A transition
 *                              that is not declared cannot happen, so
 *                              `Completed -> Draft` is blocked by absence rather
 *                              than by a check somebody has to remember.
 *   MET-TRA-002 authorization — the command pipeline. A transition is triggered
 *                              exclusively by an Action, and that Action already
 *                              passes authorize() before its handler runs.
 *   MET-TRA-003 data evidence — registered guards below, because "required
 *                              fields populated, checklist submitted, photo
 *                              present" is capability knowledge, not platform
 *                              knowledge.
 *
 * MET-TRA-004: any guard failing raises ValidationError. These functions are
 * called from inside a command handler, so that error aborts the surrounding
 * transaction and every related write rolls back with it.
 */

/** A capability-supplied evidence guard (MET-TRA-003). */
export type TransitionGuard = (
  ctx: CommandContext,
  args: { entityKey: string; entityId: string; fromKey: string; toKey: string },
) => Promise<void>;

const guards = new Map<string, TransitionGuard[]>();
const guardKey = (entityKey: string, from: string, to: string) => `${entityKey}::${from}->${to}`;

export function registerTransitionGuard(
  entityKey: string,
  fromKey: string,
  toKey: string,
  guard: TransitionGuard,
): void {
  const key = guardKey(entityKey, fromKey, toKey);
  guards.set(key, [...(guards.get(key) ?? []), guard]);
}

/** Test seam: drops all registered guards. */
export function clearTransitionGuards(): void {
  guards.clear();
}

/** The initial state for an entity (MET-STA-001). */
export async function initialState(tx: TenantScopedClient, entityKey: string) {
  const state = await tx.stateDefinition.findFirst({ where: { entityKey, isInitial: true } });
  if (!state) throw new Error(`No initial state declared for ${entityKey}`);
  return state;
}

/** Resolves a state by its machine key. */
export async function getState(tx: TenantScopedClient, entityKey: string, key: string) {
  const state = await tx.stateDefinition.findUnique({
    where: { entityKey_key: { entityKey, key } },
  });
  if (!state) throw new ValidationError(`Unknown state ${key} for ${entityKey}`);
  return state;
}

/**
 * INV-002: a terminal state locks the record permanently.
 *
 * Call this at the top of every mutating command on a stateful entity. Rework
 * spawns a child record; it never reopens a closed one.
 */
export async function assertMutable(
  tx: TenantScopedClient,
  entityKey: string,
  currentStateKey: string,
): Promise<void> {
  const state = await getState(tx, entityKey, currentStateKey);
  if (state.isTerminal) {
    throw new ValidationError(
      `E_VALIDATION: ${entityKey} is in terminal state ${currentStateKey} and is read-only (INV-002)`,
    );
  }
}

/**
 * Runs every guard for a transition and returns the target state.
 *
 * Structural guard first (is this movement declared at all?), then the
 * capability's evidence guards. The authorization guard already ran in the
 * command pipeline before the handler was entered.
 */
export async function assertTransitionAllowed(
  ctx: CommandContext,
  args: { entityKey: string; entityId: string; fromKey: string; toKey: string },
) {
  const { tx } = ctx;
  const { entityKey, fromKey, toKey } = args;

  const [from, to] = await Promise.all([
    getState(tx, entityKey, fromKey),
    getState(tx, entityKey, toKey),
  ]);

  // MET-TRA-001
  const declared = await tx.transitionDefinition.findUnique({
    where: { fromStateId_toStateId: { fromStateId: from.id, toStateId: to.id } },
  });
  if (!declared) {
    throw new ValidationError(
      `E_VALIDATION: ${entityKey} has no declared transition ${fromKey} -> ${toKey}`,
    );
  }

  // MET-TRA-003
  for (const guard of guards.get(guardKey(entityKey, fromKey, toKey)) ?? []) {
    await guard(ctx, args);
  }

  return { from, to, declared };
}

/**
 * Performs a state transition and returns the fact to emit.
 *
 * The caller applies the new state to its own table — the platform does not know
 * where a capability keeps its state column — and includes the returned event in
 * the command's result so it lands in the outbox inside the same transaction
 * (MET-ACT-004: a state change must emit an event).
 */
export async function transition(
  ctx: CommandContext,
  args: { entityKey: string; entityId: string; fromKey: string; toKey: string },
) {
  const { from, to } = await assertTransitionAllowed(ctx, args);

  return {
    from,
    to,
    event: {
      name: `${args.entityKey}.transitioned`,
      entityId: args.entityId,
      payload: {
        from: from.key,
        to: to.key,
        fromCategory: from.category,
        toCategory: to.category,
      },
    },
  };
}

/**
 * The tenant's label for a state, falling back to the platform key.
 *
 * MET-STA-004: labels are presentation only. Nothing in the engine branches on
 * them — SLA clocks and progress read `category` — so renaming a state cannot
 * change behaviour.
 */
export async function statusLabel(
  tx: TenantScopedClient,
  entityKey: string,
  stateKey: string,
): Promise<string> {
  const state = await getState(tx, entityKey, stateKey);
  const label = await tx.tenantStatusLabel.findFirst({ where: { stateId: state.id } });
  return label?.label ?? state.key;
}
