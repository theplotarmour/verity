"use server";

import { revalidatePath } from "next/cache";
import type { ScheduleStatus, SwapStatus } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleAction } from "@/platform/modules/guard";
import { hasModule } from "@/platform/modules/entitlements";

/**
 * Shift scheduling.
 *
 * `Shift` is a definition — a name and two clock times. It answers "what is the
 * morning shift?" and nothing else. This module adds the calendar: one row per
 * person per day per shift, optionally pinned to a site, plus a swap request
 * flow so a change of plan is recorded rather than agreed over WhatsApp.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function revalidateSchedulingPaths() {
  revalidatePath("/owner/scheduling");
}

/**
 * Midnight UTC for a calendar day. Storing the date portion only is what makes
 * `@@unique([userId, date, shiftId])` mean "one posting per person per shift
 * per day" instead of "per instant".
 */
function toCalendarDate(value: string | Date): Date | null {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function weekStart(from: Date): Date {
  const day = from.getUTCDay(); // 0 = Sunday
  const mondayOffset = (day + 6) % 7;
  return new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() - mondayOffset),
  );
}

/**
 * A window of the roster: every scheduled shift between `from` and `to`, plus
 * everything a scheduling form needs. Defaults to the current week.
 */
export async function getSchedulingData(input?: { from?: string; to?: string; days?: number }) {
  const organizationId = await guardModuleAction("scheduling");
  const user = await getOwnerUser();
  if (!user) {
    return { from: "", to: "", schedules: [], shifts: [], staff: [], sites: [], swaps: [] };
  }

  const factoryId = user.factoryId;
  const start = (input?.from ? toCalendarDate(input.from) : null) ?? weekStart(new Date());
  const span = Math.min(Math.max(input?.days ?? 7, 1), 42);
  const end =
    (input?.to ? toCalendarDate(input.to) : null) ?? new Date(start.getTime() + (span - 1) * DAY_MS);

  const [schedules, shifts, staff, swaps, sites] = await Promise.all([
    prisma.shiftSchedule.findMany({
      where: { factoryId, date: { gte: start, lte: end } },
      orderBy: [{ date: "asc" }, { shiftId: "asc" }],
      include: {
        user: { select: { id: true, name: true, role: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        site: { select: { id: true, name: true } },
      },
    }),
    prisma.shift.findMany({
      where: { factoryId },
      select: { id: true, name: true, startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.user.findMany({
      where: { factoryId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.shiftSwap.findMany({
      where: { factoryId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: { select: { id: true, name: true } },
        swapWith: { select: { id: true, name: true } },
        schedule: {
          include: {
            shift: { select: { id: true, name: true, startTime: true, endTime: true } },
            site: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } },
          },
        },
      },
    }),
    (await hasModule(organizationId, "sites"))
      ? prisma.site.findMany({
          where: { factoryId, status: { not: "TERMINATED" } },
          select: { id: true, name: true, siteCode: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    from: start.toISOString(),
    to: end.toISOString(),
    schedules: schedules.map((s) => ({
      id: s.id,
      date: s.date.toISOString(),
      status: s.status,
      notes: s.notes,
      userId: s.userId,
      userName: s.user.name,
      shiftId: s.shiftId,
      shiftName: s.shift.name,
      shiftTime: `${s.shift.startTime}–${s.shift.endTime}`,
      siteId: s.siteId,
      siteName: s.site?.name ?? null,
    })),
    shifts,
    staff,
    sites,
    swaps: swaps.map((s) => ({
      id: s.id,
      status: s.status,
      reason: s.reason,
      requestedByName: s.requestedBy.name,
      swapWithName: s.swapWith?.name ?? null,
      createdAt: s.createdAt.toISOString(),
      scheduleId: s.scheduleId,
      scheduleDate: s.schedule.date.toISOString(),
      scheduleShift: s.schedule.shift.name,
      scheduleSite: s.schedule.site?.name ?? null,
      scheduleUserName: s.schedule.user.name,
    })),
  };
}

/** The signed-in person's own upcoming roster. */
export async function getMySchedule(days = 14) {
  await guardModuleAction("scheduling");
  const user = await getOwnerUser();
  if (!user) return [];

  const start = toCalendarDate(new Date())!;
  const end = new Date(start.getTime() + Math.min(Math.max(days, 1), 90) * DAY_MS);

  const rows = await prisma.shiftSchedule.findMany({
    where: { factoryId: user.factoryId, userId: user.id, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
    include: {
      shift: { select: { name: true, startTime: true, endTime: true } },
      site: { select: { id: true, name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    status: r.status,
    shiftName: r.shift.name,
    shiftTime: `${r.shift.startTime}–${r.shift.endTime}`,
    siteName: r.site?.name ?? null,
  }));
}

export async function scheduleShift(input: {
  userId: string;
  shiftId: string;
  siteId?: string | null;
  date: string;
  notes?: string | null;
}) {
  await guardModuleAction("scheduling");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const factoryId = user.factoryId;
  const date = toCalendarDate(input.date);
  if (!date) return { error: "A valid date is required." };

  // Both the person and the shift must belong to this tenant: a raw id from the
  // client is untrusted input, and the unique constraint would happily accept
  // someone else's user.
  const [staff, shift] = await Promise.all([
    prisma.user.findFirst({ where: { id: input.userId, factoryId }, select: { id: true } }),
    prisma.shift.findFirst({ where: { id: input.shiftId, factoryId }, select: { id: true } }),
  ]);
  if (!staff) return { error: "That person is not on this team." };
  if (!shift) return { error: "Shift not found." };

  if (input.siteId) {
    const site = await prisma.site.findFirst({
      where: { id: input.siteId, factoryId },
      select: { id: true },
    });
    if (!site) return { error: "Site not found." };
  }

  try {
    await prisma.shiftSchedule.create({
      data: {
        factoryId,
        userId: staff.id,
        shiftId: shift.id,
        siteId: input.siteId || null,
        date,
        notes: input.notes?.trim() || null,
      },
    });
  } catch {
    return { error: "That person is already on this shift that day." };
  }

  revalidateSchedulingPaths();
  return { success: true };
}

/**
 * Copy a week's roster forward. Rosters repeat, and re-entering forty rows every
 * Monday is how a schedule stops being kept up to date.
 */
export async function copyWeek(input: { fromWeekStart: string; toWeekStart: string }) {
  await guardModuleAction("scheduling");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const source = toCalendarDate(input.fromWeekStart);
  const target = toCalendarDate(input.toWeekStart);
  if (!source || !target) return { error: "Pick two valid weeks." };
  if (source.getTime() === target.getTime()) return { error: "Pick a different target week." };

  const sourceEnd = new Date(source.getTime() + 6 * DAY_MS);
  const offset = target.getTime() - source.getTime();

  const rows = await prisma.shiftSchedule.findMany({
    where: { factoryId: user.factoryId, date: { gte: source, lte: sourceEnd } },
    select: { userId: true, shiftId: true, siteId: true, date: true, notes: true },
  });
  if (rows.length === 0) return { error: "That week has nothing to copy." };

  // skipDuplicates rather than a pre-check: the unique constraint already says
  // what a duplicate is, and re-running a copy should be a no-op, not an error.
  const created = await prisma.shiftSchedule.createMany({
    data: rows.map((r) => ({
      factoryId: user.factoryId,
      userId: r.userId,
      shiftId: r.shiftId,
      siteId: r.siteId,
      date: new Date(r.date.getTime() + offset),
      notes: r.notes,
    })),
    skipDuplicates: true,
  });

  revalidateSchedulingPaths();
  return { success: true, created: created.count };
}

export async function setScheduleStatus(scheduleId: string, status: ScheduleStatus) {
  await guardModuleAction("scheduling");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const updated = await prisma.shiftSchedule.updateMany({
    where: { id: scheduleId, factoryId: user.factoryId },
    data: { status },
  });
  if (updated.count === 0) return { error: "Schedule entry not found." };

  revalidateSchedulingPaths();
  return { success: true };
}

export async function deleteSchedule(scheduleId: string) {
  await guardModuleAction("scheduling");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const deleted = await prisma.shiftSchedule.deleteMany({
    where: { id: scheduleId, factoryId: user.factoryId },
  });
  if (deleted.count === 0) return { error: "Schedule entry not found." };

  revalidateSchedulingPaths();
  return { success: true };
}

// --- Swaps -----------------------------------------------------------------

export async function requestSwap(input: {
  scheduleId: string;
  swapWithId?: string | null;
  reason?: string | null;
}) {
  await guardModuleAction("scheduling");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const factoryId = user.factoryId;
  const schedule = await prisma.shiftSchedule.findFirst({
    where: { id: input.scheduleId, factoryId },
    select: { id: true },
  });
  if (!schedule) return { error: "Schedule entry not found." };

  if (input.swapWithId) {
    const replacement = await prisma.user.findFirst({
      where: { id: input.swapWithId, factoryId },
      select: { id: true },
    });
    if (!replacement) return { error: "That person is not on this team." };
  }

  const alreadyPending = await prisma.shiftSwap.findFirst({
    where: { factoryId, scheduleId: schedule.id, status: "PENDING" },
    select: { id: true },
  });
  if (alreadyPending) return { error: "A swap is already pending for that shift." };

  await prisma.shiftSwap.create({
    data: {
      factoryId,
      scheduleId: schedule.id,
      requestedById: user.id,
      swapWithId: input.swapWithId || null,
      reason: input.reason?.trim() || null,
    },
  });

  revalidateSchedulingPaths();
  return { success: true };
}

/**
 * Approving a swap is the only place a schedule row changes owner. Both writes
 * go in one transaction: an approved swap that did not move the shift is worse
 * than a rejected one.
 */
export async function resolveSwap(swapId: string, decision: Exclude<SwapStatus, "PENDING">) {
  await guardModuleAction("scheduling");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const factoryId = user.factoryId;
  const swap = await prisma.shiftSwap.findFirst({
    where: { id: swapId, factoryId, status: "PENDING" },
    select: {
      id: true,
      scheduleId: true,
      swapWithId: true,
      schedule: { select: { date: true, shiftId: true } },
    },
  });
  if (!swap) return { error: "No pending swap found." };

  if (decision === "APPROVED" && !swap.swapWithId) {
    return { error: "Name a replacement before approving the swap." };
  }

  // The replacement may already be rostered on that shift. Caught here rather
  // than as a unique-constraint 500 halfway through the transaction.
  if (decision === "APPROVED" && swap.swapWithId) {
    const clash = await prisma.shiftSchedule.findFirst({
      where: {
        factoryId,
        userId: swap.swapWithId,
        date: swap.schedule.date,
        shiftId: swap.schedule.shiftId,
      },
      select: { id: true },
    });
    if (clash) return { error: "The replacement is already on that shift." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.shiftSwap.update({
      where: { id: swap.id },
      data: { status: decision, resolvedAt: new Date() },
    });

    if (decision !== "APPROVED" || !swap.swapWithId) return;

    await tx.shiftSchedule.update({
      where: { id: swap.scheduleId },
      data: { userId: swap.swapWithId, status: "SCHEDULED" },
    });
  });

  revalidateSchedulingPaths();
  return { success: true };
}
