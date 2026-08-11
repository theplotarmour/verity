// Deliberately not "use server": it takes a factoryId and is called
// server-to-server from the actions that need to enforce it.

import prisma from "@/lib/prisma";

/**
 * The daily SOP gate.
 *
 * A franchise opening checklist that nobody has to complete is a checklist
 * nobody completes. The gate is what makes it consequential: until today's
 * opening SOP has been signed off for an outlet, that outlet cannot dispatch.
 *
 * Two deliberate limits on how hard it bites:
 *
 *  1. **It only applies where a checklist is actually configured as an opening
 *     SOP.** A tenant that has not set one up is not blocked by a rule they
 *     never opted into — the gate opens by default and closes when they say so.
 *  2. **It gates dispatch, not data entry.** Blocking an outlet from *recording*
 *     what happened would mean the day's history is lost as well as its
 *     trading, and the record is the thing we most want kept.
 *
 * A blocked outlet is a business decision, so the reason is always returned in
 * words the person on the floor can act on.
 */

/**
 * How an opening SOP is recognised.
 *
 * By convention on the template name rather than a new column: a franchise sets
 * this up once, and asking them to name a checklist "Opening SOP" is a smaller
 * ask than a schema field plus an admin screen to set it. If this needs to
 * become explicit later, this is the one place that changes.
 */
const OPENING_SOP_PATTERN = /opening|open\s*sop|daily\s*sop/i;

export interface SopVerdict {
  /** True when work may proceed. */
  open: boolean;
  /** Why, in words, when it is closed. */
  reason?: string;
  /** The checklist that has to be completed, when one is outstanding. */
  checklistName?: string;
}

/** Midnight today, in the server's zone — the boundary a trading day uses. */
function startOfToday(): Date {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return day;
}

/**
 * Whether `siteId` has passed its opening SOP today.
 *
 * `siteId` may be null — plenty of work is not attached to an outlet, and that
 * work is not gated.
 */
export async function checkOpeningSop(
  factoryId: string,
  siteId: string | null | undefined,
): Promise<SopVerdict> {
  if (!siteId) return { open: true };

  const templates = await prisma.checklistTemplate.findMany({
    where: { factoryId, status: "active" },
    select: { id: true, name: true },
  });
  const opening = templates.filter((t) => OPENING_SOP_PATTERN.test(t.name));

  // Nobody configured one. Not our rule to invent.
  if (opening.length === 0) return { open: true };

  const passed = await prisma.serviceInspection.findFirst({
    where: {
      factoryId,
      siteId,
      checklistId: { in: opening.map((t) => t.id) },
      status: "APPROVED",
      // Approved *today*. Yesterday's clean kitchen says nothing about this
      // morning, which is the entire point of a daily checklist.
      approvedAt: { gte: startOfToday() },
    },
    select: { id: true },
  });

  if (passed) return { open: true };

  // Distinguish "started and not signed off" from "not started", because the
  // person reading this needs to know whether to finish something or begin it.
  const inFlight = await prisma.serviceInspection.findFirst({
    where: {
      factoryId,
      siteId,
      checklistId: { in: opening.map((t) => t.id) },
      createdAt: { gte: startOfToday() },
    },
    select: { status: true },
  });

  const checklistName = opening[0].name;
  return {
    open: false,
    checklistName,
    reason: inFlight
      ? `Today's "${checklistName}" is started but not yet approved. It needs sign-off before this outlet can dispatch.`
      : `Today's "${checklistName}" has not been completed for this outlet yet.`,
  };
}
