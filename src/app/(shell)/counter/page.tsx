import { withPageAccess } from "@/components/ui/PageAccess";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listOpenBills } from "@/server/capabilities/dinein";
import {
  EmptyState,
  PageHeader,
  Panel,
  PermissionDenied,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { BillableOrders } from "./BillableOrders";

export const dynamic = "force-dynamic";

function rupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const openBillColumns: Column[] = [
  { key: "tableLabel", header: "Table", sortable: true },
  { key: "total", header: "Total", sortable: true },
  { key: "paid", header: "Paid", sortable: true },
  { key: "outstanding", header: "Outstanding", sortable: true },
  { key: "action", header: "", variant: "link", href: "/counter/{id}" },
];

/**
 * The counter.
 *
 * Two lists, because a cashier has two jobs: tables that have finished eating
 * and need a bill, and bills waiting to be paid. Merging them into one queue
 * would hide which of the two a row actually needs.
 */
async function CounterPage() {
  installCapabilities();
  const actor = await requireActor();

  let openBills: Awaited<ReturnType<typeof listOpenBills.handler>>;
  let awaitingBill: Array<{
    id: string;
    covers: number;
    table: { label: string };
    lines: Array<{ unitPriceMinor: number; qty: number }>;
  }>;

  try {
    openBills = await executeQuery(actor, listOpenBills, {});

    // Served orders with no bill yet. Read directly rather than through a query
    // definition because it is one join used on one page, and a registered
    // query exists to be reused — inventing one for a single caller is the
    // ceremony this codebase avoids elsewhere.
    awaitingBill = await withTenant(actor.tenantId, (tx) =>
      tx.diningOrder.findMany({
        where: { state: "served", bill: null },
        include: {
          table: { select: { label: true } },
          lines: { where: { state: { not: "voided" } } },
        },
        orderBy: { servedAt: "asc" },
      }),
    );
  } catch (error) {
    if (error instanceof ForbiddenError)
      return <PermissionDenied what="the counter" />;
    throw error;
  }

  const outstanding = openBills.reduce(
    (sum, bill) => sum + (bill.totalMinor - bill.paidMinor),
    0,
  );

  return (
    <>
      <PageHeader
        title="Counter"
        description="Bills to raise, and money to take."
      />

      <StatRow className="mb-6" cols={3}>
        <Stat label="Tables awaiting a bill" value={awaitingBill.length} />
        <Stat label="Bills open" value={openBills.length} />
        <Stat label="Outstanding" value={rupees(outstanding)} />
      </StatRow>

      <div className="mb-6">
        <Panel title="Ready to bill" flush>
          {awaitingBill.length === 0 ? (
            <EmptyState compact title="Nothing waiting" />
          ) : (
            <BillableOrders
              orders={awaitingBill.map((order) => ({
                id: order.id,
                tableLabel: order.table.label,
                covers: order.covers,
                subtotalMinor: order.lines.reduce(
                  (sum, line) => sum + line.unitPriceMinor * line.qty,
                  0,
                ),
              }))}
            />
          )}
        </Panel>
      </div>

      <Panel title="Open bills" flush>
        <DataTable
          columns={openBillColumns}
          rows={openBills.map((bill) => ({
            id: bill.id,
            tableLabel: bill.tableLabel,
            total: rupees(bill.totalMinor),
            paid: rupees(bill.paidMinor),
            outstanding: rupees(bill.totalMinor - bill.paidMinor),
            action: "Take payment",
          }))}
          caption="Bills awaiting payment"
          emptyTitle="No bills open"
        />
      </Panel>
    </>
  );
}

export default withPageAccess(CounterPage);
