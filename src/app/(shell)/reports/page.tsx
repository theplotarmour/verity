import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { salesSummary, type SalesSummary } from "@/server/capabilities/dinein";
import {
  EmptyState,
  PageHeader,
  Panel,
  PermissionDenied,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { DayPicker } from "./DayPicker";

export const dynamic = "force-dynamic";

function rupees(minor: number): string {
  return `₹${(minor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * The day's takings.
 *
 * Settled bills only. An open bill is money the restaurant has not been paid,
 * and counting it would make this page disagree with the till — which is the one
 * disagreement a day-end summary must never have.
 *
 * A day is a day in the RESTAURANT's zone, not the server's. Service runs past
 * midnight UTC in Delhi, so a naive date boundary would split one evening across
 * two reports.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { day } = await searchParams;

  // The day boundary is the capability's business, not this page's: it depends
  // on the restaurant's zone and on where a service day is judged to end.
  let summary: SalesSummary & { day: string };
  try {
    summary = await executeQuery(actor, salesSummary, { day });
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="sales reports" />;
    throw error;
  }

  const averageBill = summary.billsSettled === 0 ? 0 : Math.round(summary.grossMinor / summary.billsSettled);

  return (
    <>
      <PageHeader
        title="Day summary"
        description="Settled bills only — what was actually taken, in the restaurant's own day."
      />

      <div className="mb-6">
        <DayPicker day={summary.day} />
      </div>

      <StatRow className="mb-6">
        <Stat label="Bills settled" value={summary.billsSettled} />
        <Stat label="Taken" value={rupees(summary.grossMinor)} />
        <Stat label="Average bill" value={rupees(averageBill)} />
        <Stat label="Tax collected" value={rupees(summary.taxMinor)} />
      </StatRow>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="By payment method" flush>
          {summary.byMethod.length === 0 ? (
            <EmptyState compact title="Nothing settled on this day" />
          ) : (
            <table className="w-full border-collapse">
              <caption className="sr-only">Takings by payment method</caption>
              <thead>
                <tr>
                  <th className="border-b border-line px-4 py-3 text-left text-[12px] font-normal text-text-tertiary">
                    Method
                  </th>
                  <th className="border-b border-line px-4 py-3 text-right text-[12px] font-normal text-text-tertiary">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.byMethod.map((row) => (
                  <tr key={row.method}>
                    <td className="border-b border-line px-4 py-2.5 text-[14px] capitalize text-text">
                      {row.method}
                    </td>
                    <td className="tabular border-b border-line px-4 py-2.5 text-right text-[14px]">
                      {rupees(row.amountMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {summary.discountMinor > 0 && (
            <p className="mb-0 px-4 py-3 text-[12px] text-text-tertiary">
              {rupees(summary.discountMinor)} discounted across the day. Who and why is in the audit
              trail.
            </p>
          )}
        </Panel>

        <Panel title="What sold" flush>
          {summary.topItems.length === 0 ? (
            <EmptyState compact title="Nothing sold on this day" />
          ) : (
            <table className="w-full border-collapse">
              <caption className="sr-only">Items sold, by revenue</caption>
              <thead>
                <tr>
                  {["Item", "Qty", "Revenue"].map((heading, index) => (
                    <th
                      key={heading}
                      className={
                        "border-b border-line px-4 py-3 text-[12px] font-normal text-text-tertiary " +
                        (index === 0 ? "text-left" : "text-right")
                      }
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.topItems.map((item) => (
                  <tr key={item.itemName}>
                    <td className="border-b border-line px-4 py-2.5 text-[14px] text-text">
                      {item.itemName}
                    </td>
                    <td className="tabular border-b border-line px-4 py-2.5 text-right text-[14px]">
                      {item.qty}
                    </td>
                    <td className="tabular border-b border-line px-4 py-2.5 text-right text-[14px]">
                      {rupees(item.revenueMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <p className="mb-0 mt-4 text-[12px] text-text-tertiary">
        Every figure here is a sum of stored rows. Nothing is projected, averaged across days, or
        estimated.
      </p>
    </>
  );
}
