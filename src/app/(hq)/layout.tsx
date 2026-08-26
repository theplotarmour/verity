import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolveOperator } from "@/server/platform/operator";
import { getAuthUser } from "@/server/platform/auth";
import { HqChrome } from "@/components/shell/HqChrome";

export const dynamic = "force-dynamic";

/**
 * Verity HQ.
 *
 * The gate is here rather than in each page, so a route added later is
 * protected by existing, not by remembering. `resolveOperator()` returns null
 * for anyone who is not currently operating as a platform operator — including
 * an operator who has switched into a client, whose next click belongs to that
 * client and not to the platform.
 *
 * A non-operator is redirected rather than shown a refusal page: HQ's existence
 * is not something a tenant user needs confirmed. The refusal that matters —
 * the recorded security event — happens on the action path, where an attempt to
 * *do* something is what deserves an incident record.
 */
export default async function HqLayout({ children }: { children: ReactNode }) {
  const operator = await resolveOperator();
  if (!operator) redirect("/");

  const authUser = await getAuthUser();
  const label = authUser?.email ?? "Operator";
  const initials = label.slice(0, 2).toUpperCase();

  return (
    <HqChrome operatorLabel={label} operatorInitials={initials}>
      {children}
    </HqChrome>
  );
}
