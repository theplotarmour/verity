import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listCustomers } from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { CustomerList } from "./CustomerList";

export const dynamic = "force-dynamic";

/**
 * §34 — who the business sells to, and how much more each may be sold.
 *
 * Headroom leads, not the credit limit. The number a salesperson needs before
 * promising anything is what is left, and a bare limit next to a bare
 * outstanding makes them do the subtraction on the phone.
 */
export default async function CustomersPage() {
  installCapabilities();
  const actor = await requireActor();

  let customers: Awaited<ReturnType<typeof listCustomers.handler>>;
  try {
    customers = await executeQuery(actor, listCustomers, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="customers" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone the business sells to. Exposure is what they owe plus what has been approved and not yet billed — the same figure the credit check uses, so the list and the block never disagree."
      />
      <CustomerList customers={customers} />
    </>
  );
}
