import "server-only";

import prisma from "@/lib/prisma";

/**
 * The assistant's token cap.
 *
 * Exists so a runaway loop cannot bill a month of inference in an afternoon — not
 * to charge per token. So it is checked before the call and incremented after,
 * which can overshoot by one request. That is the right trade: reserving tokens up
 * front would need the count before the model has answered.
 */

export const ASSISTANT_TOKEN_CAP = { paid: 100_000, trial: 10_000 } as const;

/** Windows are monthly, counted from whenever the first request landed. */
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type BudgetVerdict =
  | { ok: true; organizationId: string; used: number; cap: number }
  | { ok: false; reason: string };

/**
 * Whether this tenant may call the model.
 *
 * Read-only workspaces are refused here rather than at the model: a lapsed trial
 * has no business spending inference, and the refusal should say so plainly
 * instead of arriving as an empty answer.
 */
export async function checkAssistantBudget(factoryId: string): Promise<BudgetVerdict> {
  const factory = await prisma.factory.findUnique({
    where: { id: factoryId },
    select: { organizationId: true },
  });
  if (!factory) return { ok: false, reason: "Workspace not found" };

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { organizationId: factory.organizationId },
    select: {
      status: true,
      assistantTokensUsed: true,
      assistantTokenResetAt: true,
    },
  });

  // No subscription row: a tenant that predates billing. Unrestricted, the same
  // rule the read-only guard uses — a missing row must not lock anybody out.
  if (!subscription) {
    return { ok: true, organizationId: factory.organizationId, used: 0, cap: ASSISTANT_TOKEN_CAP.paid };
  }

  if (subscription.status === "TRIAL_EXPIRED" || subscription.status === "READ_ONLY") {
    return {
      ok: false,
      reason:
        "This workspace is read-only, so the assistant is switched off. Activate billing to turn it back on.",
    };
  }

  const cap =
    subscription.status === "TRIAL" ? ASSISTANT_TOKEN_CAP.trial : ASSISTANT_TOKEN_CAP.paid;

  // An elapsed window is treated as zero without writing — the write happens on
  // the next successful call, so a refused request never resets anybody's counter.
  const expired =
    subscription.assistantTokenResetAt !== null &&
    Date.now() - subscription.assistantTokenResetAt.getTime() > WINDOW_MS;
  const used = expired ? 0 : subscription.assistantTokensUsed;

  if (used >= cap) {
    return {
      ok: false,
      reason: `The assistant has used its ${cap.toLocaleString("en-IN")} tokens for this month. It resets at the start of the next billing period.`,
    };
  }

  return { ok: true, organizationId: factory.organizationId, used, cap };
}

/** Add what the call actually cost. Rolls the window when it has elapsed. */
export async function recordAssistantTokens(organizationId: string, tokens: number) {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { organizationId },
    select: { assistantTokenResetAt: true },
  });
  if (!subscription) return;

  const rolled =
    subscription.assistantTokenResetAt === null ||
    Date.now() - subscription.assistantTokenResetAt.getTime() > WINDOW_MS;

  await prisma.tenantSubscription.update({
    where: { organizationId },
    data: rolled
      ? { assistantTokensUsed: tokens, assistantTokenResetAt: new Date() }
      : { assistantTokensUsed: { increment: tokens } },
  });
}
