import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listCustomers, listSuppliers, partyLedger } from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { LedgerView } from "./LedgerView";

export const dynamic = "force-dynamic";

/**
 * Customer and supplier ledgers (plywood.md §1.4).
 *
 * The party is chosen through the URL rather than client state, so a ledger can
 * be sent to whoever asked for it — which is what happens when a customer
 * disputes a balance.
 *
 * Every figure here is derived (P3). There is no stored balance to disagree with
 * the entries, and the running balance in the last column is computed for
 * display and never written down.
 */
export default async function LedgersPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; supplier?: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { customer, supplier } = await searchParams;

  let customers: Awaited<ReturnType<typeof listCustomers.handler>>;
  try {
    customers = await executeQuery(actor, listCustomers, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="ledgers" />;
    throw error;
  }

  const suppliers = await executeQuery(actor, listSuppliers, {}).catch((error) => {
    if (error instanceof ForbiddenError) return [];
    throw error;
  });

  // Exactly one party, as the query requires. A ledger of everybody at once is
  // not a ledger, it is a journal, and nobody asked for one.
  const selected = customer
    ? { customerId: customer }
    : supplier
      ? { supplierId: supplier }
      : null;

  const ledger = selected
    ? await executeQuery(actor, partyLedger, selected).catch((error) => {
        if (error instanceof ForbiddenError) return null;
        throw error;
      })
    : null;

  const selectedName = customer
    ? (customers.find((row) => row.id === customer)?.displayName ?? "Unknown customer")
    : supplier
      ? (suppliers.find((row) => row.id === supplier)?.displayName ?? "Unknown supplier")
      : null;

  return (
    <>
      <PageHeader
        title="Ledgers"
        description="Every movement of money against one party, oldest first. The balance is the sum of these entries — nothing caches it, so nothing can disagree with it."
      />
      <LedgerView
        customers={customers.map((row) => ({ id: row.id, name: row.displayName }))}
        suppliers={suppliers.map((row) => ({ id: row.id, name: row.displayName }))}
        selectedCustomerId={customer ?? null}
        selectedSupplierId={supplier ?? null}
        selectedName={selectedName}
        ledger={ledger}
      />
    </>
  );
}
