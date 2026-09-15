import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, ValidationError, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";

/**
 * CAPABILITY: Complaint — `verity.capability.complaint` (Colonel Kebabz
 * Phase 2, lean V1)
 *
 * Authority: `clients/colonel-kebabz/prd.md` §36 (Complaint Management) and
 * §37 (Service Recovery). Every complaint becomes a ticket with a plain
 * closed-set status (New|Assigned|InProgress|AwaitingCustomer|Resolved|
 * Closed), validated in code rather than the platform's full
 * StateDefinition/transition machinery — deliberately lighter than dinein's
 * order/table state machine, per the 2026-09-10 lean-scope correction.
 *
 * Service recovery (§37: coupon/refund/replacement/complimentary item/
 * loyalty points) lives on the same row as `compensationType`/
 * `compensationValue` rather than a separate entity — the PRD frames it as
 * how a complaint gets resolved, not an independent workflow. Issuing
 * LoyaltyPoints compensation posts directly to `loyalty`'s ledger (cross-
 * capability read/write via ctx.tx, same posture as every other hook this
 * session). Coupon/Refund/Replacement compensation is recorded here as a
 * fact but not automatically wired to a real coupon/payment/kitchen ticket
 * — that wiring is a manual staff step for this cycle, not built yet.
 *
 * NOT BUILT: mandatory approval gating before compensation (the `approval`
 * capability is reusable here once a threshold is decided — no threshold
 * exists yet, same open-decision posture as wastage's approval-if-required).
 */

export const COMPLAINT_CAPABILITY = "verity.capability.complaint";
export const ENTITY_COMPLAINT = "verity.complaint.complaint";

export const COMPLAINT_STATUSES = [
  "New",
  "Assigned",
  "InProgress",
  "AwaitingCustomer",
  "Resolved",
  "Closed",
] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const COMPLAINT_SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export type ComplaintSeverity = (typeof COMPLAINT_SEVERITIES)[number];

export const COMPENSATION_TYPES = ["Coupon", "Refund", "Replacement", "Complimentary", "LoyaltyPoints"] as const;
export type CompensationType = (typeof COMPENSATION_TYPES)[number];

export const fileComplaint: CommandDefinition<
  {
    locationId: string;
    customerId?: string;
    orderId?: string;
    category: string;
    severity: ComplaintSeverity;
    description: string;
  },
  { id: string }
> = {
  key: "verity.complaint.file_complaint",
  entity: ENTITY_COMPLAINT,
  verb: "Create",
  input: z.object({
    locationId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    category: z.string().min(1).max(60),
    severity: z.enum(COMPLAINT_SEVERITIES),
    description: z.string().min(1).max(2000),
  }),
  handler: async (ctx, input) => {
    const complaint = await ctx.tx.complaint.create({
      data: {
        tenantId: ctx.actor.tenantId,
        locationId: input.locationId,
        customerId: input.customerId ?? null,
        orderId: input.orderId ?? null,
        category: input.category,
        severity: input.severity,
        description: input.description,
      },
    });
    return {
      result: { id: complaint.id },
      events: [{ name: "verity.complaint.filed", entityId: complaint.id }],
    };
  },
};

export const updateComplaintStatus: CommandDefinition<
  { complaintId: string; status: ComplaintStatus; assignedToUserId?: string },
  { id: string }
> = {
  key: "verity.complaint.update_status",
  entity: ENTITY_COMPLAINT,
  verb: "Edit",
  input: z.object({
    complaintId: z.string().uuid(),
    status: z.enum(COMPLAINT_STATUSES),
    assignedToUserId: z.string().uuid().optional(),
  }),
  preconditions: async (ctx, input) => {
    const complaint = await ctx.tx.complaint.findUnique({ where: { id: input.complaintId } });
    if (!complaint) throw new ValidationError("E_VALIDATION: complaint not found");
    if (complaint.status === "Closed") {
      throw new ValidationError("E_VALIDATION: a closed complaint cannot be reopened here");
    }
  },
  handler: async (ctx, input) => {
    const complaint = await ctx.tx.complaint.update({
      where: { id: input.complaintId },
      data: {
        status: input.status,
        assignedToUserId: input.assignedToUserId ?? undefined,
        closedAt: input.status === "Closed" ? new Date() : undefined,
        version: { increment: 1 },
      },
    });
    return {
      result: { id: complaint.id },
      events: [{ name: "verity.complaint.status_changed", entityId: complaint.id, payload: { status: input.status } }],
    };
  },
};

export const resolveComplaint: CommandDefinition<
  {
    complaintId: string;
    resolution: string;
    compensationType?: CompensationType;
    compensationValue?: number;
  },
  { id: string }
> = {
  key: "verity.complaint.resolve",
  entity: ENTITY_COMPLAINT,
  verb: "Edit",
  input: z.object({
    complaintId: z.string().uuid(),
    resolution: z.string().min(1).max(2000),
    compensationType: z.enum(COMPENSATION_TYPES).optional(),
    compensationValue: z.number().int().positive().optional(),
  }),
  preconditions: async (ctx, input) => {
    const complaint = await ctx.tx.complaint.findUnique({ where: { id: input.complaintId } });
    if (!complaint) throw new ValidationError("E_VALIDATION: complaint not found");
    if (complaint.status === "Closed") throw new ValidationError("E_VALIDATION: complaint already closed");
    if (input.compensationType && !input.compensationValue) {
      throw new ValidationError("E_VALIDATION: compensationValue required when compensationType is set");
    }
    if (input.compensationType === "LoyaltyPoints" && !complaint.customerId) {
      throw new ValidationError("E_VALIDATION: LoyaltyPoints compensation needs a customer on the complaint");
    }
  },
  handler: async (ctx, input) => {
    const complaint = await ctx.tx.complaint.update({
      where: { id: input.complaintId },
      data: {
        status: "Resolved",
        resolution: input.resolution,
        compensationType: input.compensationType ?? null,
        compensationValue: input.compensationValue ?? null,
        version: { increment: 1 },
      },
    });

    if (input.compensationType === "LoyaltyPoints" && complaint.customerId && input.compensationValue) {
      await ctx.tx.loyaltyPointEntry.create({
        data: {
          tenantId: ctx.actor.tenantId,
          customerId: complaint.customerId,
          points: input.compensationValue,
          reason: "service_recovery",
        },
      });
    }

    return {
      result: { id: complaint.id },
      events: [{ name: "verity.complaint.resolved", entityId: complaint.id }],
    };
  },
};

export const listComplaints: QueryDefinition<
  { status?: ComplaintStatus; locationId?: string },
  Array<{
    id: string;
    locationId: string;
    category: string;
    severity: ComplaintSeverity;
    status: ComplaintStatus;
    createdAt: Date;
  }>
> = {
  key: "verity.complaint.list",
  entity: ENTITY_COMPLAINT,
  input: z.object({ status: z.enum(COMPLAINT_STATUSES).optional(), locationId: z.string().uuid().optional() }),
  handler: async (ctx, input) => {
    const rows = await ctx.tx.complaint.findMany({
      where: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.locationId ? { locationId: input.locationId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      locationId: r.locationId,
      category: r.category,
      severity: r.severity as ComplaintSeverity,
      status: r.status as ComplaintStatus,
      createdAt: r.createdAt,
    }));
  },
};

/* ============================== registration ============================== */

export function registerComplaintCapability(): void {
  registerContribution({
    capabilityId: COMPLAINT_CAPABILITY,
    navigation: [
      {
        href: "/complaints",
        label: "Complaints",
        group: "Overview",
        order: 16,
        icon: "flag",
        requiresEntity: ENTITY_COMPLAINT,
        shells: ["platform", "operations"],
      },
    ],
  });
  registerCommand(fileComplaint);
  registerCommand(updateComplaintStatus);
  registerCommand(resolveComplaint);
  registerQuery(listComplaints);
}
