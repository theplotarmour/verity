import "server-only";
import type { ReactNode } from "react";
import { ForbiddenError } from "@/server/platform/authorization";
import { CapabilityError } from "@/server/platform/capability";
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
