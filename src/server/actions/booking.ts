"use server";

import { revalidatePath } from "next/cache";
import type { AppointmentStatus } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import { resolveAccess } from "@/platform/rbac/permissions";
import { APPOINTMENT_STATUSES, bookingDayRange, bookingWeekRange } from "@/lib/booking";

/**
 * Appointment booking.
 *
 * A thin query/write layer over one model. Every read is scoped to the session's
 * factory — `factoryId` is never accepted from the caller — and every write goes
 * through `guardModuleWrite`, which adds the subscription check on top of the
 * entitlement one. The read guard is deliberately lighter than the write guard so
 * a lapsed subscription can still look at the day's book.
 */

export type BookingRow = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  pricePaise: number;
  status: AppointmentStatus;
  startTime: string;
  endTime: string;
  notes: string | null;
  staffId: string | null;
  staffName: string | null;
};

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { error: string };

function toRow(a: {
  id: string;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  pricePaise: number;
  status: AppointmentStatus;
  startTime: Date;
  endTime: Date;
  notes: string | null;
  staffId: string | null;
  staff: { name: string } | null;
}): BookingRow {
  return {
    id: a.id,
    customerName: a.customerName,
    customerPhone: a.customerPhone,
    serviceName: a.serviceName,
    pricePaise: a.pricePaise,
    status: a.status,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    notes: a.notes,
    staffId: a.staffId,
    staffName: a.staff?.name ?? null,
  };
}

const bookingSelect = {
  id: true,
  customerName: true,
  customerPhone: true,
  serviceName: true,
  pricePaise: true,
  status: true,
  startTime: true,
  endTime: true,
  notes: true,
  staffId: true,
  staff: { select: { name: true } },
} as const;

async function appointmentsInRange(factoryId: string, start: Date, end: Date): Promise<BookingRow[]> {
  const rows = await prisma.appointment.findMany({
    where: { factoryId, startTime: { gte: start, lt: end } },
    orderBy: { startTime: "asc" },
    select: bookingSelect,
  });
  return rows.map(toRow);
}

/** The book for one IST day. `dateISO` defaults to today. */
export async function getBookingDay(dateISO?: string): Promise<BookingRow[]> {
  const user = await getOwnerUser();
  if (!user) return [];
  await guardModuleAction("booking");

  const on = dateISO ? new Date(dateISO) : new Date();
  const { start, end } = bookingDayRange(on);
  return appointmentsInRange(user.factoryId, start, end);
}

/** The book for the seven days from the IST midnight of `dateISO` (default today). */
export async function getBookingWeek(dateISO?: string): Promise<BookingRow[]> {
  const user = await getOwnerUser();
  if (!user) return [];
  await guardModuleAction("booking");

  const on = dateISO ? new Date(dateISO) : new Date();
  const { start, end } = bookingWeekRange(on);
  return appointmentsInRange(user.factoryId, start, end);
}

/** The staff a slot can be assigned to — active users of this factory. */
export async function getBookingStaff(): Promise<Array<{ id: string; name: string }>> {
  const user = await getOwnerUser();
  if (!user) return [];
  await guardModuleAction("booking");

  return prisma.user.findMany({
    where: { factoryId: user.factoryId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export interface CreateBookingInput {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceName: string;
  pricePaise: number;
  staffId?: string | null;
  startTime: string;
  endTime: string;
  notes?: string;
}

export async function createAppointment(input: CreateBookingInput): Promise<ActionResult<{ id: string }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("booking");

  const access = await resolveAccess(user.id);
  if (!access?.permissions.has("booking.manage")) {
    return { error: "You do not have permission to manage bookings." };
  }

  const customerName = input.customerName?.trim();
  const serviceName = input.serviceName?.trim();
  if (!customerName) return { error: "A customer name is required." };
  if (!serviceName) return { error: "A service name is required." };

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "The appointment needs a valid start and end time." };
  }
  if (end <= start) return { error: "The end time has to be after the start time." };

  const pricePaise = Math.max(0, Math.round(input.pricePaise || 0));

  // A staff member, if named, must belong to this factory — never trust the id
  // from the payload as authoritative.
  let staffId: string | null = null;
  if (input.staffId) {
    const staff = await prisma.user.findFirst({
      where: { id: input.staffId, factoryId: user.factoryId },
      select: { id: true },
    });
    if (!staff) return { error: "That staff member is not part of this workspace." };
    staffId = staff.id;
  }

  const created = await prisma.appointment.create({
    data: {
      factoryId: user.factoryId,
      customerName,
      customerPhone: input.customerPhone?.trim() || null,
      customerEmail: input.customerEmail?.trim() || null,
      serviceName,
      pricePaise,
      staffId,
      startTime: start,
      endTime: end,
      notes: input.notes?.trim() || null,
    },
    select: { id: true },
  });

  revalidatePath("/owner/booking");
  revalidatePath("/owner/dashboard");
  return { success: true, id: created.id };
}

export async function setAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("booking");

  const access = await resolveAccess(user.id);
  if (!access?.permissions.has("booking.manage")) {
    return { error: "You do not have permission to manage bookings." };
  }

  if (!APPOINTMENT_STATUSES.includes(status)) {
    return { error: "Unknown appointment status." };
  }

  // Scoped update: the where clause carries factoryId so a tampered id from
  // another tenant matches nothing rather than mutating a stranger's row.
  const result = await prisma.appointment.updateMany({
    where: { id, factoryId: user.factoryId },
    data: { status },
  });
  if (result.count === 0) return { error: "Appointment not found." };

  revalidatePath("/owner/booking");
  revalidatePath("/owner/dashboard");
  return { success: true };
}
