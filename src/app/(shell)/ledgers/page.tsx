import { withPageAccess } from "@/components/ui/PageAccess";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import {
  listCustomers,
  listSuppliers,
  partyBalances,
  partyLedger,
} from "@/server/capabilities/plywood";
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
async function LedgersPage({
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

  const suppliers = await executeQuery(actor, listSuppliers, {});

  // Reported: "instead of selecting a particular customer or supplier, we see
  // the full table of amount we need to send, and amount they send us."
  // Choosing a party first meant the screen said nothing until you already knew
  // whose name you were looking for, which is the opposite of what it is for.
  const balances = await executeQuery(actor, partyBalances, {});

  // One business at a time. A firm we both buy from and sell to is ONE
  // business, so choosing either side opens the ledger for both (2026-09-15:
  // "one dropdown containing both customers and suppliers").
  const linkedSupplier = customer ? suppliers.find((row) => row.linkedCustomerId === customer) : undefined;
  const chosenSupplier = supplier ? suppliers.find((row) => row.id === supplier) : undefined;
  const selected =
    customer
      ? { customerId: customer, ...(linkedSupplier ? { supplierId: linkedSupplier.id } : {}) }
      : supplier
        ? { supplierId: supplier, ...(chosenSupplier?.linkedCustomerId ? { customerId: chosenSupplier.linkedCustomerId } : {}) }
        : null;

  const ledger = selected
    ? await executeQuery(actor, partyLedger, selected)
    : null;

  const selectedName = customer
    ? (customers.find((row) => row.id === customer)?.displayName ?? "Unknown customer")
    : supplier
      ? (chosenSupplier?.displayName ?? "Unknown supplier")
      : null;

  // The single picker: every customer, plus every supplier that is not the
  // same business as a customer already listed.
  const linkedCustomerIds = new Set(suppliers.map((row) => row.linkedCustomerId).filter(Boolean));
  const parties = [
    ...customers.map((row) => ({
      value: `customer:${row.id}`,
      label: row.displayName,
      note: linkedCustomerIds.has(row.id) ? "Customer & supplier" : "Customer",
    })),
    ...suppliers
      .filter((row) => !row.linkedCustomerId)
      .map((row) => ({ value: `supplier:${row.id}`, label: row.displayName, note: "Supplier" })),
  ].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <PageHeader
        title="Who owes what"
        description="Everyone the business trades with, and which way the money is owed. Open a name to see every movement against them, oldest first. Nothing is cached — a balance is the sum of its entries, so nothing can disagree with it."
      />
      <LedgerView
        parties={parties}
        selectedValue={customer ? `customer:${customer}` : supplier ? `supplier:${supplier}` : null}
        bothSides={Boolean(selected && "customerId" in selected && "supplierId" in selected)}
        isSupplier={Boolean(supplier) && !chosenSupplier?.linkedCustomerId}
        selectedName={selectedName}
        ledger={ledger}
        balances={balances}
      />
    </>
  );
}

export default withPageAccess(LedgersPage);
