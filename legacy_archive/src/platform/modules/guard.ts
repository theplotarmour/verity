import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { cached } from "@/lib/server/ttl-cache";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";
import { type ModuleKey, getModule } from "./registry";
import { hasModule } from "./entitlements";
import { assertWritable } from "@/platform/billing/subscription";

/**
 * Route and action guards for module entitlement.
 *
 * Hiding a nav link is an affordance, not a control — the URL is still
 * reachable by typing it. These are the actual enforcement, and every page or
 * server action belonging to an optional module should call one.
 */

/** Memoised: every guard on a page resolves the same session to the same org. */
const organizationIdForSession = cache(async function organizationIdForSession(): Promise<string | null> {
  const session = await getUserSession();
  if (!session) return null;
  // A factory never changes organisation, so this mapping is immutable for the
  // life of the row — held for five minutes rather than re-fetched on every
  // guard call, which is once or twice per page.
  return cached(`factory-org:${session.factoryId}`, 300_000, async () => {
    const factory = await prisma.factory.findUnique({
      where: { id: session.factoryId },
      select: { organizationId: true },
    });
    return factory?.organizationId ?? null;
  });
});

/**
 * Page guard. Redirects rather than throwing, so an un-entitled tenant landing
 * on a bookmarked URL gets their dashboard instead of an error screen.
 */
export async function guardModulePage(moduleKey: ModuleKey): Promise<void> {
  const organizationId = await organizationIdForSession();
  if (!organizationId) redirect("/");
  if (!(await hasModule(organizationId, moduleKey))) redirect("/owner/dashboard");
}

/**
 * Server-action guard. Throws, because an action invoked without entitlement is
 * a programming or tampering error, not a navigation mistake.
 */
export async function guardModuleAction(moduleKey: ModuleKey): Promise<string> {
  const organizationId = await organizationIdForSession();
  if (!organizationId) throw new Error("Not authenticated.");
  if (!(await hasModule(organizationId, moduleKey))) {
    throw new Error(`The ${getModule(moduleKey)?.name ?? moduleKey} module is not enabled.`);
  }
  return organizationId;
}

/**
 * Guard for an action that **writes**.
 *
 * Entitlement plus the subscription check, in one call. Two reasons it is a
 * separate function rather than a flag on `guardModuleAction`:
 *
 *  - a read on a read-only workspace must still work, and most actions are
 *    reads, so freezing them all would break the thing read-only is for;
 *  - a caller has to make a positive statement that it mutates, and a boolean
 *    argument is easy to leave at its default and never notice.
 *
 * Enforcing this server-side is not belt-and-braces. Every `"use server"` export
 * is a public POST endpoint, so hiding a button leaves the endpoint — the lesson
 * `uploadStorageImage` already taught this codebase.
 */
export async function guardModuleWrite(moduleKey: ModuleKey): Promise<string> {
  const organizationId = await guardModuleAction(moduleKey);
  await assertWritable(organizationId);
  return organizationId;
}

/**
 * The subscription write check on its own, for actions that belong to `core` and
 * so have no optional module to guard.
 */
export async function guardWrite(): Promise<string> {
  const organizationId = await organizationIdForSession();
  if (!organizationId) throw new Error("Not authenticated.");
  await assertWritable(organizationId);
  return organizationId;
}
