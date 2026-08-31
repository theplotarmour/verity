import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { salesAnalysis } from "@/server/capabilities/plywood";
import {
  EmptyState, PageHeader, Panel, PermissionDenied, Row, RowList, Stat, StatRow,
} from "@/components/ui/primitives";
import { day, rupees, rupeesShort, sheets } from "@/components/ui/business/format";
import { Related } from "@/components/ui/business/Related";

export const dynamic = "force-dynamic";

/** §73 Sales — revenue and quantity, by product and by customer. */
export default async function SalesReportPage() {
  installCapabilities();
  const actor = await requireActor();

  let report: Awaited<ReturnType<typeof salesAnalysis.handler>>;
  try {
    report = await executeQuery(actor, salesAnalysis, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="sales reports" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Sales report"
        description={`Last ${report.sinceDays} days, from ${day(report.from)}. Revenue is the taxable value — tax collected is the government's money passing through, not income.`}
      />
      <div className="flex flex-col gap-5">
        <StatRow>
          <Stat label="Revenue" value={rupeesShort(report.revenuePaise)} hint="Excluding tax" />
          <Stat label="Tax collected" value={rupeesShort(report.taxPaise)} href="/tax/gstr-1" />
          <Stat label="Quantity" value={report.qtyUnits.toLocaleString("en-IN")} hint="Sheets" />
          <Stat label="Invoices" value={report.invoiceCount} href="/finance" />
        </StatRow>

        <Panel flush title="By board">
          {report.byProduct.length === 0 ? (
            <div className="px-5 py-6"><EmptyState compact title="Nothing sold in this period" /></div>
          ) : (
            <RowList>
              {report.byProduct.map((row) => (
                <Row key={row.productId}>
                  <Link href={`/catalogue/${row.productId}`} className="text-[14px] text-text no-underline hover:underline">
                    {row.productName}
                  </Link>
                  <div className="flex shrink-0 items-center gap-8 text-right">
                    <span className="tabular w-24 text-[13px] text-text-tertiary">{sheets(row.qtyUnits)}</span>
                    <span className="tabular w-28 text-[14px] text-text">{rupees(row.revenuePaise)}</span>
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <Panel flush title="By customer">
          {report.byCustomer.length === 0 ? (
            <div className="px-5 py-6"><EmptyState compact title="No customers billed in this period" /></div>
          ) : (
            <RowList>
              {report.byCustomer.map((row) => (
                <Row key={row.customerId}>
                  <div className="min-w-0">
                    <Link href={`/customers/${row.customerId}`} className="text-[14px] text-text no-underline hover:underline">
                      {row.customerName}
                    </Link>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">{row.invoiceCount} invoice(s)</p>
                  </div>
                  <span className="tabular shrink-0 text-[14px] text-text">{rupees(row.revenuePaise)}</span>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        {/* Stated, not silently absent. §73 asks for sales by salesperson and
            an order records no salesperson — attributing revenue to whoever
            keyed the order would be wrong the first time an accountant enters
            a phone order, and wrong attribution is worse than none. */}
        <p className="m-0 text-[12px] text-text-tertiary">
          Sales by salesperson is not shown: an order does not record who sold it, only who entered
          it, and those are different facts. It needs a field on the order.
        </p>

        <Related links={[
          { href: "/reports", label: "All reports" },
          { href: "/reports/purchases", label: "Purchases" },
          { href: "/finance", label: "Invoices" },
          { href: "/customers", label: "Customers" },
        ]} />
      </div>
    </>
  );
}
