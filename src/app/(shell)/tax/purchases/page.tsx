import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { purchaseReviewQueue } from "@/server/capabilities/plywood";
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  PermissionDenied,
  Row,
  RowList,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { rupees, rupeesShort, sheets } from "@/components/ui/business/format";
import { Related } from "@/components/ui/business/Related";

export const dynamic = "force-dynamic";

/**
 * §60 — the accountant's purchase review.
 *
 * §75 describes the job this replaces: ask the purchase team, collect the
 * bills, compare against the order, compare against stock, key it into
 * accounting software, check GST, reconcile in Excel. Every one of those
 * comparisons is already recorded here, so the screen shows the conclusion and
 * names what is still missing.
 *
 * Clean rows are shown too. §60's ideal case is `✓ Ordered ✓ Received
 * ✓ Invoice matched ✓ GST matched ✓ ITC eligible`, and an order that
 * disappears once it is clean leaves the accountant unsure it was ever checked.
 */
export default async function PurchaseReviewPage() {
  installCapabilities();
  const actor = await requireActor();

  let queue: Awaited<ReturnType<typeof purchaseReviewQueue.handler>>;
  try {
    queue = await executeQuery(actor, purchaseReviewQueue, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="purchase review" />;
    throw error;
  }

  const blocked = queue.filter((row) => row.blockers.length > 0);
  const clean = queue.filter((row) => row.blockers.length === 0);

  return (
    <>
      <PageHeader
        title="Purchase review"
        description="Every purchase with goods against it, and what each is still waiting on. The order, the receipt and the supplier invoice are compared here — there is nothing to reconcile by hand."
      />

      <div className="flex flex-col gap-5">
        <StatRow cols={3}>
          <Stat label="Needing attention" value={blocked.length} />
          <Stat label="Fully matched" value={clean.length} />
          <Stat
            label="Invoiced"
            value={rupeesShort(queue.reduce((sum, row) => sum + row.invoicedTotalPaise, 0))}
            hint="Across every purchase here"
          />
        </StatRow>

        <Panel flush title="Needing attention">
          {blocked.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState
                compact
                title="Nothing outstanding"
                description="Every purchase with goods against it has a matched invoice."
              />
            </div>
          ) : (
            <RowList>
              {blocked.map((row) => (
                <Row key={row.purchaseOrderId}>
                  <div className="min-w-0">
                    <p className="m-0 text-[14px] text-text">
                      <Link
                        href={`/purchases/${row.purchaseOrderId}`}
                        className="text-text no-underline hover:underline"
                      >
                        {row.reference ?? `Order ${row.purchaseOrderId.slice(0, 8)}`}
                      </Link>{" "}
                      <span className="text-text-tertiary">·</span>{" "}
                      <Link
                        href={`/suppliers/${row.supplierId}`}
                        className="text-text-tertiary no-underline hover:underline"
                      >
                        {row.supplierName}
                      </Link>
                    </p>
                    <ul className="m-0 mt-1 list-none p-0">
                      {row.blockers.map((blocker) => (
                        <li key={blocker} className="text-[12px] text-text-tertiary">
                          {blocker}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular m-0 text-[14px] text-text">
                      {rupees(row.orderedTotalPaise)}
                    </p>
                    <p className="m-0 text-[12px] text-text-tertiary">
                      {row.receivedUnits} of {sheets(row.orderedUnits)} received
                    </p>
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <Panel flush title="Fully matched">
          {clean.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState compact title="Nothing fully matched yet" />
            </div>
          ) : (
            <RowList>
              {clean.map((row) => (
                <Row key={row.purchaseOrderId}>
                  <div className="min-w-0">
                    <p className="m-0 flex items-center gap-2 text-[14px] text-text">
                      <Link
                        href={`/purchases/${row.purchaseOrderId}`}
                        className="text-text no-underline hover:underline"
                      >
                        {row.reference ?? `Order ${row.purchaseOrderId.slice(0, 8)}`}
                      </Link>
                      <Badge tone="accent">Matched</Badge>
                    </p>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                      {row.supplierName} · ordered, received, invoiced and taxed in agreement
                    </p>
                  </div>
                  {row.invoiceId && (
                    <Link
                      href={`/finance/${row.invoiceId}`}
                      className="tabular shrink-0 text-[14px] text-text no-underline hover:underline"
                    >
                      {row.invoiceNumber}
                    </Link>
                  )}
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <Related
          links={[
            { href: "/tax", label: "Tax & Compliance" },
            { href: "/tax/exceptions", label: "Exceptions" },
            { href: "/purchases", label: "Purchases" },
            { href: "/finance", label: "Invoices" },
          ]}
        />
      </div>
    </>
  );
}
