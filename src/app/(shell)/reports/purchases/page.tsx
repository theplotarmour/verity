import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { purchaseAnalysis } from "@/server/capabilities/plywood";
import {
  EmptyState, PageHeader, Panel, PermissionDenied, Row, RowList, Stat, StatRow,
} from "@/components/ui/primitives";
import { day, rupees, rupeesShort, sheets } from "@/components/ui/business/format";
import { Related } from "@/components/ui/business/Related";

export const dynamic = "force-dynamic";

/** §73 Purchases — value by supplier and board, and how prices have moved (§16). */
export default async function PurchaseReportPage() {
  installCapabilities();
  const actor = await requireActor();

  let report: Awaited<ReturnType<typeof purchaseAnalysis.handler>>;
  try {
    report = await executeQuery(actor, purchaseAnalysis, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="purchase reports" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Purchase report"
        description={`Last ${report.sinceDays} days, from ${day(report.from)}. Drafts are excluded — a draft is a note to self, not money the business has committed.`}
      />
      <div className="flex flex-col gap-5">
        <StatRow cols={3}>
          <Stat label="Purchase value" value={rupeesShort(report.purchaseValuePaise)} />
          <Stat label="Quantity" value={report.qtyUnits.toLocaleString("en-IN")} hint="Sheets ordered" />
          <Stat label="Orders" value={report.orderCount} href="/purchases" />
        </StatRow>

        <Panel flush title="By supplier">
          {report.bySupplier.length === 0 ? (
            <div className="px-5 py-6"><EmptyState compact title="Nothing bought in this period" /></div>
          ) : (
            <RowList>
              {report.bySupplier.map((row) => (
                <Row key={row.supplierId}>
                  <div className="min-w-0">
                    <Link href={`/suppliers/${row.supplierId}`} className="text-[14px] text-text no-underline hover:underline">
                      {row.supplierName}
                    </Link>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">{row.orderCount} order(s)</p>
                  </div>
                  <span className="tabular shrink-0 text-[14px] text-text">{rupees(row.valuePaise)}</span>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <Panel flush title="By board">
          {report.byProduct.length === 0 ? (
            <div className="px-5 py-6"><EmptyState compact title="Nothing bought in this period" /></div>
          ) : (
            <RowList>
              {report.byProduct.map((row) => (
                <Row key={row.productId}>
                  <Link href={`/catalogue/${row.productId}`} className="text-[14px] text-text no-underline hover:underline">
                    {row.productName}
                  </Link>
                  <div className="flex shrink-0 items-center gap-8 text-right">
                    <span className="tabular w-24 text-[13px] text-text-tertiary">{sheets(row.qtyUnits)}</span>
                    <span className="tabular w-28 text-[14px] text-text">{rupees(row.valuePaise)}</span>
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <Panel
          flush
          title="Price movement"
          action={<span className="text-[12px] text-text-tertiary">Only boards whose price changed</span>}
        >
          {report.priceTrend.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState compact title="No price changed in this period" />
            </div>
          ) : (
            <RowList>
              {report.priceTrend.map((row) => (
                <Row key={`${row.supplierId}-${row.productId}`}>
                  <div className="min-w-0">
                    <Link href={`/catalogue/${row.productId}`} className="text-[14px] text-text no-underline hover:underline">
                      {row.productName}
                    </Link>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                      <Link href={`/suppliers/${row.supplierId}`} className="text-text-tertiary no-underline hover:underline">
                        {row.supplierName}
                      </Link>{" "}
                      · {rupees(row.firstCostPaise)} → {rupees(row.latestCostPaise)}
                    </p>
                  </div>
                  <span className={"tabular shrink-0 text-[14px] " + (row.changePaise > 0 ? "text-danger" : "text-text")}>
                    {row.changePaise > 0 ? "+" : "−"}{rupees(Math.abs(row.changePaise))}
                  </span>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <Related links={[
          { href: "/reports", label: "All reports" },
          { href: "/reports/sales", label: "Sales" },
          { href: "/tax/purchases", label: "Purchase review" },
          { href: "/suppliers", label: "Suppliers" },
        ]} />
      </div>
    </>
  );
}
