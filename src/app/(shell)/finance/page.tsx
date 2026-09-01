import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import {
  listInvoices,
  partyBalances,
  unbilledMovements,
} from "@/server/capabilities/plywood";
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

  const [balances, unbilled] = await Promise.all([
    executeQuery(actor, partyBalances, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
    // Goods moved with no document — a FAILED automatic raise, not a queue.
    executeQuery(actor, unbilledMovements, {}).catch((error) => {
      if (error instanceof ForbiddenError)
        return { purchases: [], sales: [] };
      throw error;
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Finance"
        description="The paperwork behind the money: which invoices and supplier bills exist, which are still waiting on a supplier's own document, and anything that moved without producing one. Money itself is recorded on Transactions, and who owes what is on Who owes what."
      />
      <FinanceDesk
        invoices={invoices}
        balances={balances}
        unbilledSales={unbilled.sales}
        unbilledPurchases={unbilled.purchases}
      />
    </>
  );
}
