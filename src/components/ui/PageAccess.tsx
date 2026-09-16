import "server-only";
import type { ReactNode } from "react";
import { ForbiddenError } from "@/server/platform/authorization";
import { CapabilityError } from "@/server/platform/capability";
import { withCapabilityCheck } from "@/server/platform/capability";
import { requireActor } from "@/server/platform/auth";
import { recordExecutionFailure } from "@/server/platform/execution-failure";
import { EmptyState, PermissionDenied } from "./primitives";

export function withPageAccess<Args extends unknown[]>(page: (...args: Args) => Promise<ReactNode>) {
  return async function PageWithAccess(...args: Args) {
    try { return await page(...args); }
    catch (error) {
      if (error instanceof ForbiddenError) return <PermissionDenied what="the data needed for this page" />;
      if (error instanceof CapabilityError) return <EmptyState title="This feature is not active" description="Ask your administrator to enable this feature for your business." />;
      throw error;
    }
  };
}

/** Guard a capability-owned page before any page-level data loader executes. */
export function withCapabilityPageAccess<Args extends unknown[]>(
  capabilityId: string,
  page: (...args: Args) => Promise<ReactNode>,
) {
  return withPageAccess(async (...args: Args) => {
    const actor = await requireActor();
    try {
      await withCapabilityCheck(actor.tenantId, capabilityId, async () => undefined);
    } catch (error) {
      await recordExecutionFailure(error, actor, `page:${capabilityId}`);
      throw error;
    }
    return page(...args);
  });
}
