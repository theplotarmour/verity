import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listInvoices, openOrders, outstandingReceivables } from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { FinanceDesk } from "./FinanceDesk";

export const dynamic = "force-dynamic";

/**
 * Invoices, payments and what is still owed.
 *
 * Receivables lead. An invoice that has been paid is a record; an invoice that
 * has not is a phone call somebody has to make today.
 */
export default async function FinancePage() {
  installCapabilities();
  const actor = await requireActor();

  let invoices: Awaited<ReturnType<typeof listInvoices.handler>>;
  try {
    invoices = await executeQuery(actor, listInvoices, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="invoices" />;
    throw error;
  }

  const [receivables, orders] = await Promise.all([
    executeQuery(actor, outstandingReceivables, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
    executeQuery(actor, openOrders, {}).catch((error) => {
      if (error instanceof ForbiddenError) return { purchases: [], sales: [] };
      throw error;
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Finance"
        description="Tax invoices, payments received, and what each customer still owes. Invoice numbers are sequential and gapless within a financial year, which is a legal requirement rather than a convention."
      />
      <FinanceDesk
        invoices={invoices}
        receivables={receivables}
        // Only orders that can legitimately be invoiced: an order still in draft
        // or already cancelled would be refused by the command anyway, and
        // offering it here would be an invitation to a failure.
        invoiceableOrders={orders.sales.filter(
          (order) => order.state !== "draft" && order.state !== "cancelled",
        )}
      />
    </>
  );
}
