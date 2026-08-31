import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listSuppliers } from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { SupplierList } from "./SupplierList";

export const dynamic = "force-dynamic";

/**
 * §14 — who we buy from, and what each relationship currently costs us.
 *
 * The list carries the three numbers a purchase manager decides on: what is
 * owed, how much is committed on open orders, and how many orders are running.
 * Outstanding and commitment are deliberately separate columns — a purchase
 * order is not a payable (§20, §54), and one column holding both would be the
 * error the specification spends two sections preventing.
 */
export default async function SuppliersPage() {
  installCapabilities();
  const actor = await requireActor();

  let suppliers: Awaited<ReturnType<typeof listSuppliers.handler>>;
  try {
    suppliers = await executeQuery(actor, listSuppliers, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="suppliers" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Everyone the business buys from. Outstanding is money owed on invoices received; committed is the value of orders placed and not yet billed — they are different obligations and are never added together."
      />
      <SupplierList suppliers={suppliers} />
    </>
  );
}
