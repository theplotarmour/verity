import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, ValidationError, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";

/**
 * CAPABILITY: HR — `verity.capability.hr` (Task 78, MVP scope)
 *
 * Authority: `taskplans/78_erpclaw_capability_hr.md`. Same override as
 * Tasks 72/73, 2026-09-04.
 *
 * REGISTERED 2026-09-04, same as `../accounting`/`../inventory` — see that
 * file's module doc for the migration-drift resolution, not repeated here.
 *
 * An `HrEmployee` is HR-specific attributes on an EXISTING `Party` — never a
 * second identity record (INV-003, ADR-008: HR sits above scheduling, does
 * not redefine `Resource`/`Party`). `createEmployee` takes a `partyId`, it
 * never creates one; provisioning a Party is `provisionIdentity()`'s job
 * (`src/server/platform/identity.ts`), not this capability's.
 *
 * SCOPE BUILT: departments, employees, leave types, leave applications, and
 * append-only leave decisions (Task 78's own requirement: "no in-place
 * status edits" — a decision is a new row, never an update to the
 * application). NOT built: designations-as-their-own-entity, lifecycle
 * events, documents/expiry, attendance, holiday lists, shift types, expense
 * claims — Task 78's own open scope.
 *
 * FIELD REDACTION (Task 78's other critical requirement — "sensitive
 * employee data is redacted via the existing Layer-3 field redaction,
 * never a bolt-on second access-control model") is NOT wired here because
 * this MVP added no field that is actually sensitive (no salary, no
 * government ID) — there is nothing yet to register a `FieldPermission` row
 * for. The moment a capability consumer adds one, it registers through the
 * ordinary `field_permission` migration seed like every other restricted
 * field in this schema, not a new mechanism.
 */

export const HR_CAPABILITY = "verity.capability.hr";
export const ENTITY_HR_EMPLOYEE = "verity.hr.employee";
export const ENTITY_HR_LEAVE = "verity.hr.leave";

export const LEAVE_DECISIONS = ["Approved", "Rejected", "Revoked"] as const;
export type LeaveDecisionKind = (typeof LEAVE_DECISIONS)[number];

/* ================================ departments ================================ */

export const createDepartment: CommandDefinition<{ name: string }, { id: string }> = {
  key: "verity.hr.create_department",
  entity: ENTITY_HR_EMPLOYEE,
  verb: "Create",
  input: z.object({ name: z.string().min(1).max(120) }),
  preconditions: async (ctx, input) => {
    const clash = await ctx.tx.hrDepartment.findFirst({ where: { name: input.name } });
    if (clash) throw new ValidationError("E_VALIDATION: a department with that name already exists");
  },
  handler: async (ctx, input) => {
    const dept = await ctx.tx.hrDepartment.create({ data: { tenantId: ctx.actor.tenantId, name: input.name } });
    return {
      result: { id: dept.id },
      events: [{ name: "verity.hr.department_created", entityId: dept.id }],
    };
  },
};

/* ================================= employees ================================= */

export const createEmployee: CommandDefinition<
  { partyId: string; departmentId?: string; designation?: string; dateOfJoining?: string },
  { id: string }
> = {
  key: "verity.hr.create_employee",
  entity: ENTITY_HR_EMPLOYEE,
  verb: "Create",
  input: z.object({
    partyId: z.string().uuid(),
    departmentId: z.string().uuid().optional(),
    designation: z.string().max(120).optional(),
    dateOfJoining: z.string().datetime().optional(),
  }),
  preconditions: async (ctx, input) => {
    const existing = await ctx.tx.hrEmployee.findFirst({ where: { partyId: input.partyId } });
    if (existing) throw new ValidationError("E_VALIDATION: this Party is already an employee in this tenant");
    if (input.departmentId) {
      const dept = await ctx.tx.hrDepartment.findUnique({ where: { id: input.departmentId } });
      if (!dept) throw new ValidationError("E_VALIDATION: department not found in this tenant");
    }
  },
  handler: async (ctx, input) => {
    const employee = await ctx.tx.hrEmployee.create({
      data: {
        tenantId: ctx.actor.tenantId,
        partyId: input.partyId,
        departmentId: input.departmentId ?? null,
        designation: input.designation ?? null,
        dateOfJoining: input.dateOfJoining ? new Date(input.dateOfJoining) : null,
      },
    });
    return {
      result: { id: employee.id },
      events: [{ name: "verity.hr.employee_created", entityId: employee.id }],
    };
  },
};

export const setEmployeeActive: CommandDefinition<{ employeeId: string; active: boolean }, { id: string }> = {
  key: "verity.hr.set_employee_active",
  entity: ENTITY_HR_EMPLOYEE,
  verb: "Edit",
  input: z.object({ employeeId: z.string().uuid(), active: z.boolean() }),
  handler: async (ctx, input) => {
    const employee = await ctx.tx.hrEmployee.update({
      where: { id: input.employeeId },
      data: { active: input.active, version: { increment: 1 } },
    });
    return {
      result: { id: employee.id },
      events: [
        {
          name: input.active ? "verity.hr.employee_activated" : "verity.hr.employee_deactivated",
          entityId: employee.id,
        },
      ],
    };
  },
};

export const listEmployees: QueryDefinition<
  { includeInactive?: boolean; departmentId?: string },
  Array<{ id: string; partyId: string; departmentId: string | null; designation: string | null; active: boolean }>
> = {
  key: "verity.hr.list_employees",
  entity: ENTITY_HR_EMPLOYEE,
  input: z.object({ includeInactive: z.boolean().optional(), departmentId: z.string().uuid().optional() }),
  handler: async (ctx, input) => {
    const rows = await ctx.tx.hrEmployee.findMany({
      where: {
        ...(input.includeInactive ? {} : { active: true }),
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      },
    });
    return rows.map((r) => ({
      id: r.id,
      partyId: r.partyId,
      departmentId: r.departmentId,
      designation: r.designation,
      active: r.active,
    }));
  },
};

/* ================================== leave ==================================== */

export const createLeaveType: CommandDefinition<{ name: string; daysPerYear: number }, { id: string }> = {
  key: "verity.hr.create_leave_type",
  entity: ENTITY_HR_LEAVE,
  verb: "Create",
  input: z.object({ name: z.string().min(1).max(80), daysPerYear: z.number().int().min(0).max(365) }),
  preconditions: async (ctx, input) => {
    const clash = await ctx.tx.hrLeaveType.findFirst({ where: { name: input.name } });
    if (clash) throw new ValidationError("E_VALIDATION: a leave type with that name already exists");
  },
  handler: async (ctx, input) => {
    const type = await ctx.tx.hrLeaveType.create({
      data: { tenantId: ctx.actor.tenantId, name: input.name, daysPerYear: input.daysPerYear },
    });
    return {
      result: { id: type.id },
      events: [{ name: "verity.hr.leave_type_created", entityId: type.id }],
    };
  },
};

export const applyForLeave: CommandDefinition<
  { employeeId: string; leaveTypeId: string; fromDate: string; toDate: string; reason?: string },
  { id: string }
> = {
  key: "verity.hr.apply_for_leave",
  entity: ENTITY_HR_LEAVE,
  verb: "Create",
  input: z
    .object({
      employeeId: z.string().uuid(),
      leaveTypeId: z.string().uuid(),
      fromDate: z.string().datetime(),
      toDate: z.string().datetime(),
      reason: z.string().max(500).optional(),
    })
    .refine((v) => new Date(v.toDate) >= new Date(v.fromDate), {
      message: "toDate must not be before fromDate",
      path: ["toDate"],
    }),
  preconditions: async (ctx, input) => {
    const employee = await ctx.tx.hrEmployee.findUnique({ where: { id: input.employeeId } });
    if (!employee) throw new ValidationError("E_VALIDATION: employee not found in this tenant");
    if (!employee.active) throw new ValidationError("E_VALIDATION: employee is not active");
    const leaveType = await ctx.tx.hrLeaveType.findUnique({ where: { id: input.leaveTypeId } });
    if (!leaveType) throw new ValidationError("E_VALIDATION: leave type not found in this tenant");
  },
  handler: async (ctx, input) => {
    const application = await ctx.tx.hrLeaveApplication.create({
      data: {
        tenantId: ctx.actor.tenantId,
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        fromDate: new Date(input.fromDate),
        toDate: new Date(input.toDate),
        reason: input.reason ?? null,
      },
    });
    return {
      result: { id: application.id },
      events: [{ name: "verity.hr.leave_applied", entityId: application.id }],
    };
  },
};

/**
 * The only way a leave application's status changes. Appends a decision row
 * rather than updating the application (Task 78's own requirement) — the
 * current status is "the latest decision," computed by the queries below,
 * never stored as a mutable field.
 */
export const decideLeaveApplication: CommandDefinition<
  { leaveApplicationId: string; decision: LeaveDecisionKind; note?: string },
  { id: string }
> = {
  key: "verity.hr.decide_leave_application",
  entity: ENTITY_HR_LEAVE,
  verb: "Edit",
  impact: "destructive",
  input: z.object({
    leaveApplicationId: z.string().uuid(),
    decision: z.enum(LEAVE_DECISIONS),
    note: z.string().max(500).optional(),
  }),
  preconditions: async (ctx, input) => {
    const application = await ctx.tx.hrLeaveApplication.findUnique({ where: { id: input.leaveApplicationId } });
    if (!application) throw new ValidationError("E_VALIDATION: leave application not found in this tenant");
    if (input.decision === "Revoked") {
      const priorApproval = await ctx.tx.hrLeaveDecision.findFirst({
        where: { leaveApplicationId: input.leaveApplicationId, decision: "Approved" },
      });
      if (!priorApproval) {
        throw new ValidationError("E_VALIDATION: only an approved application can be revoked");
      }
    }
  },
  handler: async (ctx, input) => {
    const decision = await ctx.tx.hrLeaveDecision.create({
      data: {
        tenantId: ctx.actor.tenantId,
        leaveApplicationId: input.leaveApplicationId,
        decision: input.decision,
        decidedById: ctx.actor.userId,
        note: input.note ?? null,
      },
    });
    return {
      result: { id: decision.id },
      events: [
        {
          name: "verity.hr.leave_decided",
          entityId: input.leaveApplicationId,
          payload: { decision: input.decision },
        },
      ],
    };
  },
};

export const leaveApplicationStatus: QueryDefinition<
  { employeeId?: string },
  Array<{ applicationId: string; employeeId: string; leaveTypeId: string; fromDate: Date; toDate: Date; status: LeaveDecisionKind | "Pending" }>
> = {
  key: "verity.hr.leave_application_status",
  entity: ENTITY_HR_LEAVE,
  input: z.object({ employeeId: z.string().uuid().optional() }),
  handler: async (ctx, input) => {
    const apps = await ctx.tx.hrLeaveApplication.findMany({
      where: input.employeeId ? { employeeId: input.employeeId } : {},
      include: { decisions: { orderBy: { decidedAt: "desc" }, take: 1 } },
      orderBy: { appliedAt: "desc" },
    });
    return apps.map((a) => ({
      applicationId: a.id,
      employeeId: a.employeeId,
      leaveTypeId: a.leaveTypeId,
      fromDate: a.fromDate,
      toDate: a.toDate,
      status: (a.decisions[0]?.decision as LeaveDecisionKind | undefined) ?? "Pending",
    }));
  },
};

/* ============================== registration ============================== */

/** Called by `registry.ts`'s `installCapabilities()`. */
export function registerHrCapability(): void {
  registerContribution({
    capabilityId: HR_CAPABILITY,
    navigation: [
      {
        href: "/hr",
        label: "People operations",
        group: "Administration",
        order: 59,
        icon: "people",
        requiresEntity: ENTITY_HR_EMPLOYEE,
        shells: ["platform"],
      },
    ],
  });
  registerCommand(createDepartment);
  registerCommand(createEmployee);
  registerCommand(setEmployeeActive);
  registerCommand(createLeaveType);
  registerCommand(applyForLeave);
  registerCommand(decideLeaveApplication);
  registerQuery(listEmployees);
  registerQuery(leaveApplicationStatus);
}
