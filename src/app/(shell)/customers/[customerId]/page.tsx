import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { customerDetail } from "@/server/capabilities/plywood";
import { PermissionDenied } from "@/components/ui/primitives";
import { CustomerWorkspace } from "./CustomerWorkspace";

export const dynamic = "force-dynamic";

/** §35 — the customer as an operating account, credit decision included. */
export default async function CustomerPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { customerId } = await params;

  let customer: Awaited<ReturnType<typeof customerDetail.handler>>;
  try {
    customer = await executeQuery(actor, customerDetail, { customerId });
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="this customer" />;
    throw error;
  }
  if (!customer) notFound();

  return <CustomerWorkspace customer={customer} />;
}
