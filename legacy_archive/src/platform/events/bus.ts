import "server-only";

/**
 * The platform event bus.
 *
 * A decoupled way for one module to react to another without importing it. A
 * server action publishes an operational milestone — `booking.completed`,
 * `appointment.no_show` — and any listener another module registered for that
 * event runs, with no compile-time edge between the two. This is the seam the
 * manifesto's workflows compose on: `booking.completed → billing.create_draft` is
 * a registration, not a function call baked into the booking action.
 *
 * **Not** `lib/server/events.ts`. That is a notification fan-out — it tells
 * *people* something happened (in-app, email, WhatsApp). This tells *code*. A
 * reaction here may well end by emitting a notification, but the two are different
 * layers and conflating them is how "send an email" ends up wired into a
 * database write.
 *
 * ## Isolation is the contract
 *
 * Listeners are best-effort and isolated. `emit` runs every listener, swallows an
 * individual failure (logged, counted), and never throws back to the publisher.
 * The reason is a rule this codebase already follows for post-commit fan-out: a
 * booking that reached COMPLETED is true whether or not a draft invoice was
 * raised, and a listener that throws must not roll back the milestone that
 * triggered it. Emit after your own commit, treat reactions as fallible.
 */

/** An event name, dot-namespaced by module: `<module>.<milestone>`. */
export type PlatformEvent = string;

/** Every payload carries the tenant. A reaction that cannot see the factory is a bug. */
export interface EventPayload {
  factoryId: string;
  [key: string]: unknown;
}

export type EventListener<P extends EventPayload = EventPayload> = (
  payload: P,
) => void | Promise<void>;

interface Registration {
  /** For diagnostics: which module/reaction registered this. */
  label: string;
  listener: EventListener;
}

const REGISTRY = new Map<PlatformEvent, Registration[]>();

/**
 * Register a reaction to an event. Returns an unsubscribe, mostly for tests —
 * production reactions are registered once at startup and never removed.
 */
export function on(event: PlatformEvent, listener: EventListener, label = "anonymous"): () => void {
  const list = REGISTRY.get(event) ?? [];
  const registration: Registration = { label, listener };
  list.push(registration);
  REGISTRY.set(event, list);

  return () => {
    const current = REGISTRY.get(event);
    if (!current) return;
    const next = current.filter((r) => r !== registration);
    if (next.length > 0) REGISTRY.set(event, next);
    else REGISTRY.delete(event);
  };
}

export interface EmitResult {
  event: PlatformEvent;
  /** Listeners invoked. */
  handled: number;
  /** Listeners that threw — logged, never rethrown. */
  failed: number;
}

/**
 * Publish an event. Runs every registered listener, isolating failures, and
 * resolves once they all have. Never throws — an unhandled event is a no-op, and
 * a throwing listener is logged and counted, not propagated.
 *
 * Listeners run concurrently: they are independent by construction (no shared
 * transaction, no ordering contract), so serialising them would only add latency.
 */
export async function emit<P extends EventPayload>(event: PlatformEvent, payload: P): Promise<EmitResult> {
  const list = REGISTRY.get(event);
  if (!list || list.length === 0) return { event, handled: 0, failed: 0 };

  const outcomes = await Promise.allSettled(list.map((r) => Promise.resolve().then(() => r.listener(payload))));

  let failed = 0;
  outcomes.forEach((outcome, i) => {
    if (outcome.status === "rejected") {
      failed += 1;
      console.error(`Event listener failed: ${event} → ${list[i].label}`, outcome.reason);
    }
  });

  return { event, handled: list.length, failed };
}

/** How many listeners an event has. For tests and diagnostics. */
export function listenerCount(event: PlatformEvent): number {
  return REGISTRY.get(event)?.length ?? 0;
}

/** Drop every registration. Test hygiene only — never call this in production. */
export function __clearListeners(): void {
  REGISTRY.clear();
}
