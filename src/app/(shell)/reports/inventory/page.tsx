import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { inventoryAnalysis } from "@/server/capabilities/plywood";
import {
  EmptyState, PageHeader, Panel, PermissionDenied, Row, RowList, Stat, StatRow,
} from "@/components/ui/primitives";
import { day, rupees, rupeesShort, sheets } from "@/components/ui/business/format";
import { Related } from "@/components/ui/business/Related";

export const dynamic = "force-dynamic";

/** §73 Inventory — valuation, ageing, damage and adjustments. */
export default async function InventoryReportPage() {
  installCapabilities();
  const actor = await requireActor();

  let report: Awaited<ReturnType<typeof inventoryAnalysis.handler>>;
  try {
    report = await executeQuery(actor, inventoryAnalysis, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="inventory reports" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Inventory report"
        description={`Stock on hand across the godowns you can see, and what has been written off or corrected since ${day(report.from)}.`}
      />
      <div className="flex flex-col gap-5">
        <StatRow>
          <Stat label="Stock value" value={rupeesShort(report.valuePaise)} href="/stock" hint="At average cost" />
          <Stat label="On hand" value={report.qtyUnits.toLocaleString("en-IN")} hint="Sheets" />
          <Stat label="Damage" value={rupeesShort(report.damageValuePaise)} hint={`${report.damage.length} record(s)`} />
          <Stat label="Adjustments" value={report.adjustmentCount} hint="Counts corrected" />
        </StatRow>

        <Panel flush title="Ageing">
          <RowList>
            {report.ageing.map((bucket) => (
              <Row key={bucket.bucket}>
                <span className="text-[14px] text-text">{bucket.bucket}</span>
                <div className="flex shrink-0 items-center gap-8 text-right">
                  <span className="tabular w-24 text-[13px] text-text-tertiary">{sheets(bucket.qtyUnits)}</span>
                  <span className="tabular w-28 text-[14px] text-text">{rupees(bucket.valuePaise)}</span>
                </div>
              </Row>
            ))}
          </RowList>
          {/* Said rather than assumed. The reader will otherwise take these
              buckets for something stricter than what is recorded. */}
          <p className="m-0 px-5 py-4 text-[12px] text-text-tertiary">
            Age is measured from the last time anything was added to that pile in that godown — the
            honest reading of what the stock ledger records. Stock with no inward movement at all is
            counted as the oldest, because guessing &ldquo;new&rdquo; is the flattering error.
          </p>
        </Panel>

        <Panel flush title="Damage">
          {report.damage.length === 0 ? (
            <div className="px-5 py-6"><EmptyState compact title="Nothing written off in this period" /></div>
          ) : (
            <RowList>
              {report.damage.map((row, index) => (
                <Row key={`${row.productId}-${index}`}>
                  <div className="min-w-0">
                    <Link href={`/catalogue/${row.productId}`} className="text-[14px] text-text no-underline hover:underline">
                      {row.productName}
                    </Link>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                      {day(row.occurredAt)} · {row.locationName}
                      {row.reason ? ` · ${row.reason}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-8 text-right">
                    <span className="tabular w-20 text-[13px] text-text-tertiary">{sheets(row.qtyUnits)}</span>
                    <span className="tabular w-24 text-[14px] text-text">{rupees(row.valuePaise)}</span>
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <Panel flush title="Adjustments">
          {report.adjustments.length === 0 ? (
            <div className="px-5 py-6"><EmptyState compact title="No counts corrected in this period" /></div>
          ) : (
            <RowList>
              {report.adjustments.map((row, index) => (
                <Row key={`${row.productId}-adj-${index}`}>
                  <div className="min-w-0">
                    <Link href={`/catalogue/${row.productId}`} className="text-[14px] text-text no-underline hover:underline">
                      {row.productName}
                    </Link>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                      {day(row.occurredAt)} · {row.locationName}
                      {/* §65 — the movement ledger preserves WHY. An
                          adjustment without its reason is an unexplained
                          change to a count, which is what §64 forbids. */}
                      {row.reason ? ` · ${row.reason}` : " · no reason recorded"}
                    </p>
                  </div>
                  <span className="tabular shrink-0 text-[14px] text-text">
                    {row.qtyDeltaUnits > 0 ? "+" : ""}{row.qtyDeltaUnits}
                  </span>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <Related links={[
          { href: "/reports", label: "All reports" },
          { href: "/stock", label: "Stock" },
          { href: "/godowns", label: "Godowns" },
        ]} />
      </div>
    </>
  );
}
