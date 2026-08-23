import { z } from "zod";
import { ForbiddenError, resolvePermissions } from "@/server/platform/authorization";
import { registerCommand, type CommandDefinition, type EmittedEvent } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { transition } from "@/server/platform/state";
import { recordActivity, diffFields } from "@/server/platform/audit";

/**
 * CAPABILITY: Approval — `verity.capability.approval`
 *
 * Authority: foundation validation — demanded independently by Professional
 * Services, Staffing, Finance and Procurement. Built once so those four do not
 * each grow their own approval chain.
 *
 * Steps name a *role*, not a person, so a chain survives someone leaving the
 * organisation. Steps are decided in sequence: a chain whose second approver can
 * act before the first has is not a chain, it is a set.
 */

export const APPROVAL_CAPABILITY = "verity.capability.approval";
export const ENTITY_APPROVAL = "verity.approval.request";

export const requestApproval: CommandDefinition<
  { subjectEntityKey: string; subjectEntityId: string; approverRoleIds: string[] },
  { id: string }
> = {
  key: "verity.approval.request",
  entity: ENTITY_APPROVAL,
  verb: "Create",
  input: z.object({
    subjectEntityKey: z.string().min(1),
    subjectEntityId: z.string().uuid(),
    // An empty chain would be approved by nobody and complete instantly.
    approverRoleIds: z.array(z.string().uuid()).min(1),
  }),
  handler: async (ctx, input) => {
    const request = await ctx.tx.approvalRequest.create({
      data: {
        tenantId: ctx.actor.tenantId,
        subjectEntityKey: input.subjectEntityKey,
        subjectEntityId: input.subjectEntityId,
        requestedById: ctx.actor.userId,
      },
    });
    await ctx.tx.approvalStep.createMany({
      data: input.approverRoleIds.map((approverRoleId, index) => ({
        tenantId: ctx.actor.tenantId,
        requestId: request.id,
        sequence: index,
        approverRoleId,
      })),
    });
    return {
      result: { id: request.id },
      events: [{ name: "verity.approval.requested", entityId: request.id }],
    };
  },
};

/** The step awaiting a decision, or null when the chain is finished. */
export async function currentStep(
  tx: Parameters<typeof resolvePermissions>[0],
  requestId: string,
) {
  return tx.approvalStep.findFirst({
    where: { requestId, decision: "Pending" },
    orderBy: { sequence: "asc" },
  });
}

export const decide: CommandDefinition<
  { requestId: string; approve: boolean; comment?: string },
  { outcome: string; finished: boolean }
> = {
  key: "verity.approval.decide",
  entity: ENTITY_APPROVAL,
  verb: "ActionExecute",
  input: z.object({
    requestId: z.string().uuid(),
    approve: z.boolean(),
    comment: z.string().optional(),
  }),
  preconditions: async (ctx, input) => {
    const step = await currentStep(ctx.tx, input.requestId);
    if (!step) throw new Error("E_VALIDATION: approval chain is already complete");

    // Only the role this step names may decide it. Holding a later step's role
    // is not authority over an earlier one.
    if (ctx.actor.roleId !== step.approverRoleId) {
      throw new ForbiddenError(
        `E_FORBIDDEN: step ${step.sequence} must be decided by its designated approver role`,
      );
    }
  },
  handler: async (ctx, input) => {
    const step = (await currentStep(ctx.tx, input.requestId))!;
    const request = await ctx.tx.approvalRequest.findUniqueOrThrow({
      where: { id: input.requestId },
    });

    await ctx.tx.approvalStep.update({
      where: { id: step.id },
      data: {
        decision: input.approve ? "Approved" : "Rejected",
        decidedByUserId: ctx.actor.userId,
        decidedAt: new Date(),
        comment: input.comment ?? null,
      },
    });

    // A rejection ends the chain immediately; later approvers are not consulted
    // about a decision that has already been made.
    let outcome: "Pending" | "Approved" | "Rejected" = "Pending";
    let toState: string | null = null;

    if (!input.approve) {
      outcome = "Rejected";
      toState = "rejected";
      await ctx.tx.approvalStep.updateMany({
        where: { requestId: request.id, decision: "Pending" },
        data: { decision: "Skipped" },
      });
    } else if (!(await currentStep(ctx.tx, request.id))) {
      outcome = "Approved";
      toState = "approved";
    }

    const events: EmittedEvent[] = [
      {
        name: input.approve ? "verity.approval.step_approved" : "verity.approval.step_rejected",
        entityId: request.id,
        payload: { sequence: step.sequence },
      },
    ];

    if (toState) {
      const moved = await transition(ctx, {
        entityKey: ENTITY_APPROVAL,
        entityId: request.id,
        fromKey: request.state,
        toKey: toState,
      });
      await ctx.tx.approvalRequest.update({
        where: { id: request.id },
        data: { state: toState, outcome, version: { increment: 1 } },
      });
      await recordActivity(ctx, {
        entityKey: ENTITY_APPROVAL,
        entityId: request.id,
        commandKey: "verity.approval.decide",
        changes: diffFields({ state: request.state }, { state: toState }),
      });
      events.push(moved.event);
    }

    return { result: { outcome, finished: toState !== null }, events };
  },
};

export const listPendingFor: QueryDefinition<
  Record<string, never>,
  Array<Record<string, unknown>>
> = {
  key: "verity.approval.list_pending",
  entity: ENTITY_APPROVAL,
  input: z.object({}),
  handler: async (ctx) => {
    if (!ctx.actor.roleId) return [];
    // Only chains whose *current* step names a role this actor holds.
    const steps = await ctx.tx.approvalStep.findMany({
      where: { decision: "Pending", approverRoleId: ctx.actor.roleId },
      orderBy: { sequence: "asc" },
      include: { request: true },
    });
    const awaiting = [];
    for (const step of steps) {
      const current = await currentStep(ctx.tx, step.requestId);
      if (current?.id === step.id) awaiting.push(step.request as Record<string, unknown>);
    }
    return awaiting;
  },
};

export function registerApprovalCapability(): void {
  registerCommand(requestApproval);
  registerCommand(decide);
  registerQuery(listPendingFor);
}
