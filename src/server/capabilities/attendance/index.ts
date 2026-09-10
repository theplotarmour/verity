import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, ValidationError, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";

/**
 * CAPABILITY: Attendance — `verity.capability.attendance` (Colonel Kebabz
 * Phase 3, lean V1)
 *
 * Authority: `clients/colonel-kebabz/prd.md` §39-40, 42 (Attendance, Shift
 * Management, Payroll Inputs). A sibling to `hr`, not a fork — Task 78's
 * own scope explicitly excludes attendance/shifts/payroll. Payroll inputs
 * are computed at query time from AttendanceRecord, never stored as a
 * separate payroll entity — see the schema's own module doc for what's
 * deliberately dropped this cycle (overtime, late deductions, incentives,
 * advances, shift-gap detection).
 */

export const ATTENDANCE_CAPABILITY = "verity.capability.attendance";
export const ENTITY_ATTENDANCE = "verity.attendance.record";
export const ENTITY_SHIFT = "verity.attendance.shift";

export const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "OnLeave"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const recordAttendance: CommandDefinition<
  { employeeId: string; date: string; status: AttendanceStatus; checkInAt?: string; checkOutAt?: string },
  { id: string }
> = {
  key: "verity.attendance.record_attendance",
  entity: ENTITY_ATTENDANCE,
  verb: "Create",
  input: z.object({
    employeeId: z.string().uuid(),
    date: z.string().date(),
    status: z.enum(ATTENDANCE_STATUSES),
    checkInAt: z.string().datetime().optional(),
    checkOutAt: z.string().datetime().optional(),
  }),
  preconditions: async (ctx, input) => {
    const employee = await ctx.tx.hrEmployee.findUnique({ where: { id: input.employeeId } });
    if (!employee) throw new ValidationError("E_VALIDATION: employee not found in this tenant");
  },
  handler: async (ctx, input) => {
    const record = await ctx.tx.attendanceRecord.upsert({
      where: { tenantId_employeeId_date: { tenantId: ctx.actor.tenantId, employeeId: input.employeeId, date: new Date(input.date) } },
      create: {
        tenantId: ctx.actor.tenantId,
        employeeId: input.employeeId,
        date: new Date(input.date),
        status: input.status,
        checkInAt: input.checkInAt ? new Date(input.checkInAt) : null,
        checkOutAt: input.checkOutAt ? new Date(input.checkOutAt) : null,
      },
      update: {
        status: input.status,
        checkInAt: input.checkInAt ? new Date(input.checkInAt) : undefined,
        checkOutAt: input.checkOutAt ? new Date(input.checkOutAt) : undefined,
        version: { increment: 1 },
      },
    });
    return {
      result: { id: record.id },
      events: [{ name: "verity.attendance.recorded", entityId: record.id, payload: { status: input.status } }],
    };
  },
};

export const getAttendanceDashboard: QueryDefinition<
  { date: string },
  { present: number; absent: number; late: number; onLeave: number }
> = {
  key: "verity.attendance.get_dashboard",
  entity: ENTITY_ATTENDANCE,
  input: z.object({ date: z.string().date() }),
  handler: async (ctx, input) => {
    const rows = await ctx.tx.attendanceRecord.findMany({
      where: { date: new Date(input.date) },
      select: { status: true },
    });
    const count = (status: AttendanceStatus) => rows.filter((r) => r.status === status).length;
    return {
      present: count("Present"),
      absent: count("Absent"),
      late: count("Late"),
      onLeave: count("OnLeave"),
    };
  },
};

export const getPayrollInputs: QueryDefinition<
  { employeeId: string; fromDate: string; toDate: string },
  { daysWorked: number; hoursWorked: number; lateCount: number; absentCount: number; leaveCount: number }
> = {
  key: "verity.attendance.get_payroll_inputs",
  entity: ENTITY_ATTENDANCE,
  input: z.object({
    employeeId: z.string().uuid(),
    fromDate: z.string().date(),
    toDate: z.string().date(),
  }),
  handler: async (ctx, input) => {
    const rows = await ctx.tx.attendanceRecord.findMany({
      where: {
        employeeId: input.employeeId,
        date: { gte: new Date(input.fromDate), lte: new Date(input.toDate) },
      },
    });
    const worked = rows.filter((r) => r.status === "Present" || r.status === "Late");
    const hoursWorked = worked.reduce((sum, r) => {
      if (!r.checkInAt || !r.checkOutAt) return sum;
      return sum + (r.checkOutAt.getTime() - r.checkInAt.getTime()) / (1000 * 60 * 60);
    }, 0);
    return {
      daysWorked: worked.length,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      lateCount: rows.filter((r) => r.status === "Late").length,
      absentCount: rows.filter((r) => r.status === "Absent").length,
      leaveCount: rows.filter((r) => r.status === "OnLeave").length,
    };
  },
};

export const defineShift: CommandDefinition<
  { locationId: string; employeeId: string; date: string; label: string; startTime: string; endTime: string },
  { id: string }
> = {
  key: "verity.attendance.define_shift",
  entity: ENTITY_SHIFT,
  verb: "Create",
  input: z.object({
    locationId: z.string().uuid(),
    employeeId: z.string().uuid(),
    date: z.string().date(),
    label: z.string().min(1).max(40),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM"),
  }),
  preconditions: async (ctx, input) => {
    const employee = await ctx.tx.hrEmployee.findUnique({ where: { id: input.employeeId } });
    if (!employee) throw new ValidationError("E_VALIDATION: employee not found in this tenant");
  },
  handler: async (ctx, input) => {
    const shift = await ctx.tx.shift.create({
      data: {
        tenantId: ctx.actor.tenantId,
        locationId: input.locationId,
        employeeId: input.employeeId,
        date: new Date(input.date),
        label: input.label,
        startTime: input.startTime,
        endTime: input.endTime,
      },
    });
    return { result: { id: shift.id }, events: [{ name: "verity.attendance.shift_defined", entityId: shift.id }] };
  },
};

export const listShifts: QueryDefinition<
  { locationId?: string; date?: string },
  Array<{ id: string; employeeId: string; date: Date; label: string; startTime: string; endTime: string }>
> = {
  key: "verity.attendance.list_shifts",
  entity: ENTITY_SHIFT,
  input: z.object({ locationId: z.string().uuid().optional(), date: z.string().date().optional() }),
  handler: async (ctx, input) => {
    const rows = await ctx.tx.shift.findMany({
      where: {
        ...(input.locationId ? { locationId: input.locationId } : {}),
        ...(input.date ? { date: new Date(input.date) } : {}),
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      date: r.date,
      label: r.label,
      startTime: r.startTime,
      endTime: r.endTime,
    }));
  },
};

/* ============================== registration ============================== */

export function registerAttendanceCapability(): void {
  registerContribution({
    capabilityId: ATTENDANCE_CAPABILITY,
    navigation: [
      {
        href: "/attendance",
        label: "Attendance",
        group: "Administration",
        order: 40,
        icon: "clock",
        requiresEntity: ENTITY_ATTENDANCE,
        shells: ["platform", "operations"],
      },
    ],
  });
  registerCommand(recordAttendance);
  registerCommand(defineShift);
  registerQuery(getAttendanceDashboard);
  registerQuery(getPayrollInputs);
  registerQuery(listShifts);
}
