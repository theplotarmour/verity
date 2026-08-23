import "server-only";
import type { StateCategory } from "@prisma/client";
import type { TenantScopedClient } from "./tenancy";
import type { EmittedEvent } from "./command";
import { workingMinutesBetween } from "./temporal";

/**
 * SLA substrate.
 *
 * Authority: Bible V3 §1 [FACT] — the clock state machine is constitutional:
 *
 *   INITIALIZE → START ─┬─────────────────┬→ STOP (Completed)
 *                       │ (Pause/Blocked) │
 *                       ▼                 ▼
 *                     PAUSE            BREACH (Overdue)
 *
 * and MET-STA-004, which requires clocks to evaluate at the StateCategory layer
 * and ignore tenant status labels.
 *
 * This is substrate, not policy. It provides clocks, calendars, pause and breach
 * semantics and an escalation hook. It defines no client's SLA rules and no
 * domain workflow — a capability attaches a policy to its own entity and the
 * platform runs the clock.
 *
 * The crucial design point: clock transitions are derived from StateCategory,
 * not from state keys or labels. That is why ADR-009 fixed a behavioural
 * category set. A capability that declares its states honestly gets correct SLA
 * behaviour without writing any clock code at all, and renaming a state to
 * "Awaiting Gate Pass" cannot change whether the clock runs.
 */

/** How a category drives the clock (Bible V3 §1, MET-STA-004). */
export function clockIntentFor(category: StateCategory): "start" | "pause" | "stop" | "idle" {
  switch (category) {
    case "Active":
      return "start";
    // Both pause, but they stay distinct upstream because they differ in whose
    // action resumes them (ADR-009).
    case "Pending":
    case "Blocked":
      return "pause";
    case "Completed":
    case "Cancelled":
      return "stop";
    case "Draft":
      return "idle";
  }
}

/** Attaches the highest-precedence active policy for an entity, if any. */
export async function startClock(
  tx: TenantScopedClient,
  args: {
    tenantId: string;
    entityKey: string;
    entityId: string;
    overrideDeadlineAt?: Date | null;
  },
): Promise<{ clockId: string } | null> {
  // Bible V3 precedence: the most specific policy wins.
  const policy = await tx.slaPolicy.findFirst({
    where: { entityKey: args.entityKey, active: true },
    orderBy: { precedence: "desc" },
  });
  if (!policy) return null;

  const existing = await tx.slaClock.findFirst({
    where: { policyId: policy.id, entityKey: args.entityKey, entityId: args.entityId },
  });
  if (existing) return { clockId: existing.id };

  const clock = await tx.slaClock.create({
    data: {
      tenantId: args.tenantId,
      policyId: policy.id,
      entityKey: args.entityKey,
      entityId: args.entityId,
      status: "NotStarted",
      overrideDeadlineAt: args.overrideDeadlineAt ?? null,
    },
  });
  return { clockId: clock.id };
}

/**
 * Advances every clock on a record to match a new state category.
 *
 * Called from a capability's transition command, inside the same transaction,
 * so the clock can never disagree with the state that moved it. Returns the
 * facts to emit — breach in particular is an event other parts of the system
 * react to, and emitting it here keeps that consistent across capabilities.
 */
export async function applyStateToClocks(
  tx: TenantScopedClient,
  args: {
    entityKey: string;
    entityId: string;
    category: StateCategory;
    now?: Date;
  },
): Promise<EmittedEvent[]> {
  const now = args.now ?? new Date();
  const intent = clockIntentFor(args.category);
  const events: EmittedEvent[] = [];

  const clocks = await tx.slaClock.findMany({
    where: { entityKey: args.entityKey, entityId: args.entityId },
    include: { policy: true },
  });

  for (const clock of clocks) {
    if (clock.status === "Stopped") continue;

    // Bank the running segment before changing anything else.
    let elapsed = clock.elapsedMinutes;
    if (clock.status === "Running" && clock.runningSince) {
      elapsed += await workingMinutesBetween(tx, clock.policy.calendarId, clock.runningSince, now);
    }

    if (intent === "start") {
      // Recompute the deadline from remaining budget, so a paused clock resumes
      // where it left off rather than restarting its allowance.
      const remaining = Math.max(0, clock.policy.targetMinutes - elapsed);
      const deadline =
        clock.overrideDeadlineAt ?? new Date(now.getTime() + remaining * 60_000);

      await tx.slaClock.update({
        where: { id: clock.id },
        data: {
          status: "Running",
          runningSince: now,
          elapsedMinutes: elapsed,
          deadlineAt: deadline,
          version: { increment: 1 },
        },
      });
      events.push({
        name: "verity.sla.clock_started",
        entityId: args.entityId,
        payload: { clockId: clock.id, deadlineAt: deadline.toISOString() },
      });
      continue;
    }

    if (intent === "pause") {
      await tx.slaClock.update({
        where: { id: clock.id },
        data: {
          status: "Paused",
          runningSince: null,
          elapsedMinutes: elapsed,
          version: { increment: 1 },
        },
      });
      events.push({
        name: "verity.sla.clock_paused",
        entityId: args.entityId,
        payload: { clockId: clock.id, elapsedMinutes: elapsed },
      });
      continue;
    }

    if (intent === "stop") {
      const breached = elapsed > clock.policy.targetMinutes;
      await tx.slaClock.update({
        where: { id: clock.id },
        data: {
          status: "Stopped",
          runningSince: null,
          elapsedMinutes: elapsed,
          stoppedAt: now,
          // A clock that ran over and then completed is still a breach; the
          // record must not launder its own history by finishing.
          breachedAt: breached ? (clock.breachedAt ?? now) : clock.breachedAt,
          version: { increment: 1 },
        },
      });
      events.push({
        name: "verity.sla.clock_stopped",
        entityId: args.entityId,
        payload: { clockId: clock.id, elapsedMinutes: elapsed, breached },
      });
    }
  }

  return events;
}

/**
 * Marks running clocks whose deadline has passed.
 *
 * Breach is time passing, not an action anybody takes, so it cannot be detected
 * by a command alone — something must sweep. This is the function a scheduled
 * job calls; it is idempotent, so running it twice marks nothing twice.
 */
export async function sweepBreaches(
  tx: TenantScopedClient,
  now: Date = new Date(),
): Promise<EmittedEvent[]> {
  const overdue = await tx.slaClock.findMany({
    where: { status: "Running", deadlineAt: { lt: now }, breachedAt: null },
  });

  const events: EmittedEvent[] = [];
  for (const clock of overdue) {
    await tx.slaClock.update({
      where: { id: clock.id },
      data: { status: "Breached", breachedAt: now, version: { increment: 1 } },
    });
    events.push({
      name: "verity.sla.breached",
      entityId: clock.entityId,
      payload: { clockId: clock.id, entityKey: clock.entityKey, deadlineAt: clock.deadlineAt?.toISOString() },
    });
  }
  return events;
}

/**
 * Remaining working minutes, or negative when overdue.
 *
 * Computed rather than stored: a stored "minutes remaining" is wrong the moment
 * it is written, and every reader would have to know how stale it is.
 */
export async function remainingMinutes(
  tx: TenantScopedClient,
  clockId: string,
  now: Date = new Date(),
): Promise<number | null> {
  const clock = await tx.slaClock.findUnique({
    where: { id: clockId },
    include: { policy: true },
  });
  if (!clock) return null;

  let elapsed = clock.elapsedMinutes;
  if (clock.status === "Running" && clock.runningSince) {
    elapsed += await workingMinutesBetween(tx, clock.policy.calendarId, clock.runningSince, now);
  }
  return clock.policy.targetMinutes - elapsed;
}

/**
 * Urgency derived from time remaining, kept separate from business priority.
 *
 * Bible V4 §5.B is explicit that these are different axes: an item of Medium
 * priority has Critical urgency when its deadline is five minutes away. Fusing
 * them would lose exactly the distinction that makes a queue triageable.
 */
export type Urgency = "none" | "low" | "medium" | "high" | "critical" | "breached";

export function urgencyFor(remaining: number | null, targetMinutes: number): Urgency {
  if (remaining === null) return "none";
  if (remaining < 0) return "breached";
  const fraction = targetMinutes > 0 ? remaining / targetMinutes : 1;
  if (fraction <= 0.05) return "critical";
  if (fraction <= 0.2) return "high";
  if (fraction <= 0.5) return "medium";
  return "low";
}
