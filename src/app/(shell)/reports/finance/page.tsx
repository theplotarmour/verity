import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { financeAgeing } from "@/server/capabilities/plywood";
import {
  PageHeader, Panel, PermissionDenied, Row, RowList, Stat, StatRow,
} from "@/components/ui/primitives";
import { rupees, rupeesShort } from "@/components/ui/business/format";
import { Related } from "@/components/ui/business/Related";

export const dynamic = "force-dynamic";

/** §73 Finance — receivable and payable ageing. */
export default async function FinanceReportPage() {
  installCapabilities();
  const actor = await requireActor();

  let report: Awaited<ReturnType<typeof financeAgeing.handler>>;
  try {
    report = await executeQuery(actor, financeAgeing, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="finance reports" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Ageing"
        description="What is owed in each direction, by how long the invoice has been outstanding."
      />
      <div className="flex flex-col gap-5">
        <StatRow cols={3}>
          <Stat label="Receivable" value={rupeesShort(report.receivableTotalPaise)} href="/finance" hint="Owed to us" />
          <Stat label="Payable" value={rupeesShort(report.payableTotalPaise)} href="/finance" hint="Owed by us" />
          <Stat
            label="Net"
            value={rupeesShort(report.receivableTotalPaise - report.payableTotalPaise)}
            hint="Receivable less payable"
          />
        </StatRow>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel flush title="Receivable">
            <RowList>
              {report.receivable.map((bucket) => (
                <Row key={bucket.bucket}>
                  <div>
                    <p className="m-0 text-[14px] text-text">{bucket.bucket}</p>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">{bucket.invoiceCount} invoice(s)</p>
                  </div>
                  <span className="tabular shrink-0 text-[14px] text-text">{rupees(bucket.amountPaise)}</span>
                </Row>
              ))}
            </RowList>
          </Panel>
          <Panel flush title="Payable">
            <RowList>
              {report.payable.map((bucket) => (
                <Row key={bucket.bucket}>
                  <div>
                    <p className="m-0 text-[14px] text-text">{bucket.bucket}</p>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">{bucket.invoiceCount} invoice(s)</p>
                  </div>
                  <span className="tabular shrink-0 text-[14px] text-text">{rupees(bucket.amountPaise)}</span>
                </Row>
              ))}
            </RowList>
          </Panel>
        </div>

        {/* These are AGE buckets, not overdue buckets, and the difference
            matters: this capability records no payment terms, so calling a
            60-day invoice overdue would assert a due date the business never
            agreed to. */}
        <p className="m-0 text-[12px] text-text-tertiary">
          Buckets are by invoice age, not by due date — no payment terms are recorded against a
          customer or supplier, so nothing here asserts that an amount is late.
        </p>

        <Related links={[
          { href: "/reports", label: "All reports" },
          { href: "/finance", label: "Finance" },
          { href: "/ledgers", label: "Ledgers" },
        ]} />
      </div>
    </>
  );
}
