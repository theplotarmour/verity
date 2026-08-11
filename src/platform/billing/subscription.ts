import "server-only";

import { cache } from "react";

import prisma from "@/lib/prisma";
import { TEAM_BRACKET, type TeamSizeBracket } from "@/platform/pricing";

/**
 * Subscription state, and the write guard that depends on it.
 *
 * A lapsed trial has to stop *writes* and keep *reads*. Doing that in the UI is
 * not doing it: every `"use server"` export is a public POST endpoint, which is
 * the lesson `storage.ts` already taught this codebase the hard way. Hiding a
 * button leaves the endpoint.
 *
 * So the check lives beside `guardModuleAction`, and mutating actions call it
 * for the same reason they call that one — because it is the one place that
 * cannot be forgotten per-action once it is wired into the shared guard.
 */

/** States in which a tenant may read but not write. */
const FROZEN = new Set(["TRIAL_EXPIRED", "READ_ONLY", "CANCELLED"]);

export interface SubscriptionState {
  status: string;
  packKey: string | null;
  teamSizeBracket: TeamSizeBracket;
  trialEndsAt: Date | null;
  readOnlySince: Date | null;
  /** True when writes are refused. */
  frozen: boolean;
  /** Days left in the trial. Null when not on one. */
  trialDaysLeft: number | null;
  /** True on the day the assistant should raise billing. See PRD 02 R8. */
  nudgeDue: boolean;
}

/**
 * The subscription for an organisation, or null when it has none.
 *
 * **Null means unrestricted, deliberately.** Every existing tenant predates this
 * table, and a missing row must not freeze a paying customer's workspace. New
 * tenants get a row at provisioning; the absence of one is "not yet metered",
 * not "not entitled".
 *
 * `cache()` so several guards in one request share a lookup.
 */
export const getSubscription = cache(
  async (organizationId: string): Promise<SubscriptionState | null> => {
    const row = await prisma.tenantSubscription.findUnique({
      where: { organizationId },
      select: {
        status: true,
        packKey: true,
        teamSizeBracket: true,
        trialEndsAt: true,
        readOnlySince: true,
      },
    });
    if (!row) return null;

    const now = Date.now();
    const msLeft = row.trialEndsAt ? row.trialEndsAt.getTime() - now : null;
    // Ceil, so "18 hours left" reads as 1 day rather than 0. A tenant told they
    // have zero days while the workspace still works does not trust either.
    const trialDaysLeft =
      msLeft === null ? null : Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

    return {
      status: row.status,
      packKey: row.packKey,
      teamSizeBracket: row.teamSizeBracket,
      trialEndsAt: row.trialEndsAt,
      readOnlySince: row.readOnlySince,
      frozen: FROZEN.has(row.status),
      trialDaysLeft,
      // Day 5 of 7 → 2 days left. Raised early on purpose: a trial ending
      // tomorrow forces a decision under pressure, and that answer is "not now".
      nudgeDue: row.status === "TRIAL" && trialDaysLeft !== null && trialDaysLeft <= 2,
    };
  },
);

/** Thrown by the write guard. Carries a message meant for the user. */
export class ReadOnlyWorkspaceError extends Error {
  readonly status: string;

  constructor(status: string) {
    super(
      status === "TRIAL_EXPIRED"
        ? "Your trial has ended, so this workspace is read-only. Activate billing to make changes — nothing has been deleted."
        : status === "CANCELLED"
          ? "This subscription was cancelled, so the workspace is read-only. Reactivate to make changes."
          : "This workspace is read-only while billing is unresolved. Your data is intact.",
    );
    this.name = "ReadOnlyWorkspaceError";
    this.status = status;
  }
}

/**
 * Refuse a write when the subscription is frozen.
 *
 * Throws rather than returning a flag: a guard whose result can be ignored will
 * be, and this one is the difference between read-only meaning something and
 * read-only being a label.
 */
export async function assertWritable(organizationId: string): Promise<void> {
  const subscription = await getSubscription(organizationId);
  if (subscription?.frozen) throw new ReadOnlyWorkspaceError(subscription.status);
}

/** Whether writes are currently allowed. For UI, which should not throw. */
export async function canWrite(organizationId: string): Promise<boolean> {
  const subscription = await getSubscription(organizationId);
  return !subscription?.frozen;
}

/** The bracket's monthly add-on, for display beside the pack price. */
export function bracketFee(bracket: TeamSizeBracket): number {
  return TEAM_BRACKET[bracket].monthly;
}
