import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import {
  listCustomers,
  listSuppliers,
  paymentJournal,
} from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { TransactionsDesk } from "./TransactionsDesk";

export const dynamic = "force-dynamic";

/**
 * The cash book — every rupee in and every rupee out.
 *
 * Reported: "the transaction page is the only page where we can record that we
 * received a payment or we sent a payment. No other thing should be able to do
 * that automatically."
 *
 * So this page owns recording money, and nothing else offers it. What the rest
 * of the system does automatically is raise DOCUMENTS — a delivery raises the
 * customer's invoice, a receipt raises the supplier's bill — which is a
 * different thing entirely: a document records what was agreed, a payment
 * records what moved. Nothing in Verity ever invents a payment.
 */
export default async function TransactionsPage() {
  installCapabilities();
  const actor = await requireActor();

  let payments: Awaited<ReturnType<typeof paymentJournal.handler>>;
  try {
    payments = await executeQuery(actor, paymentJournal, {});
  } catch (error) {
    if (error instanceof ForbiddenError)
      return <PermissionDenied what="payments" />;
    throw error;
  }

  const [customers, suppliers] = await Promise.all([
    executeQuery(actor, listCustomers, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
    executeQuery(actor, listSuppliers, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every payment received and every payment sent. This is the only place money is recorded — invoices and bills raise themselves when goods move, but no payment is ever entered for you."
      />
      <TransactionsDesk
        payments={payments}
        customers={customers.map((row) => ({
          id: row.id,
          displayName: row.displayName,
        }))}
        suppliers={suppliers.map((row) => ({
          id: row.id,
          displayName: row.displayName,
        }))}
      />
    </>
  );
}
