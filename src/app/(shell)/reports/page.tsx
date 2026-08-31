import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { Related } from "@/components/ui/business/Related";
import { ForbiddenError } from "@/server/platform/authorization";
import {
  closeChecklist,
  lowStock,
  marginReport,
  outstandingReceivables,
  ownerConsole,
  taxSummary,
} from "@/server/capabilities/plywood";
import {
  EmptyState,
  PageHeader,
  Panel,
  PermissionDenied,
  Stat,
  StatRow,
} from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * Reports.
 *
 * Authority: specification §73; PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-10.
 *
 * WHAT THIS REPLACES
 * This page called `salesSummary` from the **dine-in** capability and described
 * a restaurant's daily takings. On a plywood tenant it either returned nothing
 * or returned another capability's data — the audit's P0-10, and the clearest
 * example of a screen that looks finished and is answering a different
 * business's question.
 *
 * EVERY FIGURE IS SOMEONE ELSE'S FIGURE
 * Trade, money, inventory, margin and tax all read the same queries the
 * Overview and the desks read. Nothing here computes its own version of a
 * number, because two definitions of "receivables" is how a report and a ledger
 * end up disagreeing in front of a customer.
 */
export default async function ReportsPage() {
  installCapabilities();
  const actor = await requireActor();

  let console_: Awaited<ReturnType<typeof ownerConsole.handler>> | null = null;
  let margin: Awaited<ReturnType<typeof marginReport.handler>> | null = null;
  let receivables: Awaited<ReturnType<typeof outstandingReceivables.handler>> = [];
  let low: Awaited<ReturnType<typeof lowStock.handler>> = [];
  let tax: Awaited<ReturnType<typeof taxSummary.handler>> | null = null;
  let checklist: Awaited<ReturnType<typeof closeChecklist.handler>> | null = null;

  // Each section is fetched independently and each failure is swallowed
  // separately. A reader who may see stock but not money gets the stock
  // report, not a permission error for the whole page — the composition rule
  // the audit asks for on the Overview (§4.3), applied here too.
  const attempt = async <T,>(run: () => Promise<T>): Promise<T | null> => {
    try {
      return await run();
    } catch (error) {
      if (error instanceof ForbiddenError) return null;
      throw error;
    }
  };

  console_ = await attempt(() => executeQuery(actor, ownerConsole, {}));
  margin = await attempt(() => executeQuery(actor, marginReport, {}));
  receivables = (await attempt(() => executeQuery(actor, outstandingReceivables, {}))) ?? [];
  low = (await attempt(() => executeQuery(actor, lowStock, {}))) ?? [];
  tax = await attempt(() => executeQuery(actor, taxSummary, {}));
  checklist = await attempt(() => executeQuery(actor, closeChecklist, {}));

  if (!console_ && !margin && receivables.length === 0 && low.length === 0 && !tax) {
    return <PermissionDenied what="reports" />;
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Every figure here is the same figure the desk that owns it shows. Nothing on this page computes its own version of a number."
      />

      {/* §73 — the detailed reports, each of which drills into source records.
          This page stays the summary; the depth lives behind these. */}
      <div className="mb-5">
        <Related
          title="Detailed reports"
          links={[
            { href: "/reports/sales", label: "Sales", note: "By board and customer" },
            { href: "/reports/purchases", label: "Purchases", note: "By supplier, and price movement" },
            { href: "/reports/inventory", label: "Inventory", note: "Ageing, damage, adjustments" },
            { href: "/reports/finance", label: "Ageing", note: "Receivable and payable" },
          ]}
        />
      </div>

      {console_ && (
        <div className="mb-4">
          <Panel title="Trade">
            <StatRow>
              <Stat label="Sales today" value={rupees(console_.todaysSalesPaise)} href="/finance" />
              <Stat
                label="Purchases today"
                value={rupees(console_.todaysPurchasesPaise)}
                href="/purchases"
              />
              <Stat
                label="Awaiting goods issue"
                value={String(console_.awaitingGoodsIssue)}
                href="/sales"
                hint="Approved, not yet issued"
              />
            </StatRow>
          </Panel>
        </div>
      )}

      {console_ && (
        <div className="mb-4">
          <Panel title="Inventory and money">
            <StatRow>
              <Stat label="Stock value" value={rupees(console_.stockValuePaise)} href="/stock" />
              <Stat
                label="Low stock"
                value={String(console_.lowStockBoards)}
                href="/stock"
                hint="Available below reorder level"
              />
              <Stat label="Receivables" value={rupees(console_.receivablesPaise)} href="/finance" />
              <Stat label="Payables" value={rupees(console_.payablesPaise)} href="/finance" />
            </StatRow>
          </Panel>
        </div>
      )}

      {margin && (
        <div className="mb-4">
          <Panel title="Margin, last 30 days">
            <StatRow>
              <Stat label="Revenue" value={rupees(margin.revenuePaise)} />
              <Stat label="Cost of goods sold" value={rupees(margin.costOfGoodsSoldPaise)} />
              <Stat
                label="Gross margin"
                value={rupees(margin.marginPaise)}
                hint={`${(margin.marginBp / 100).toFixed(1)}% · ${margin.costingMethod}`}
              />
            </StatRow>
          </Panel>
        </div>
      )}

      {tax && (
        <div className="mb-4">
          <Panel title="Tax this period">
            <StatRow>
              <Stat label="Output GST" value={rupees(tax.outputTaxPaise)} href="/tax/close" />
              <Stat label="Input GST" value={rupees(tax.inputTaxPaise)} href="/tax/close" />
              <Stat label="Net payable" value={rupees(tax.netPayablePaise)} href="/tax/close" />
              <Stat
                label="Exceptions"
                value={String(tax.exceptions.length)}
                href="/tax/close"
                hint="Documents needing attention"
              />
            </StatRow>
          </Panel>
        </div>
      )}

      <div className="mb-4">
        <Panel title="Boards below reorder level">
          {low.length === 0 ? (
            <EmptyState title="Nothing to reorder" description="Every board is above its reorder level." />
          ) : (
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr>
                  <th className="border-b border-line px-3 py-2 text-left font-medium">Board</th>
                  <th className="border-b border-line px-3 py-2 text-right font-medium">On hand</th>
                  <th className="border-b border-line px-3 py-2 text-right font-medium">Reserved</th>
                  <th className="border-b border-line px-3 py-2 text-right font-medium">Available</th>
                  <th className="border-b border-line px-3 py-2 text-right font-medium">Reorder at</th>
                </tr>
              </thead>
              <tbody>
                {low.map((row) => (
                  <tr key={row.productId}>
                    <td className="border-b border-line px-3 py-2">
                      {row.brandName} {row.productName}
                    </td>
                    <td className="tabular border-b border-line px-3 py-2 text-right">{row.onHandUnits}</td>
                    <td className="tabular border-b border-line px-3 py-2 text-right">{row.reservedUnits}</td>
                    {/* Available is what can be sold. On hand looks healthy
                        while every sheet is already promised to somebody. */}
                    <td className="tabular border-b border-line px-3 py-2 text-right font-medium">
                      {row.availableUnits}
                    </td>
                    <td className="tabular border-b border-line px-3 py-2 text-right text-text-tertiary">
                      {row.reorderLevelUnits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      {receivables.length > 0 && (
        <div className="mb-4">
          <Panel title="Who owes what">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr>
                  <th className="border-b border-line px-3 py-2 text-left font-medium">Customer</th>
                  <th className="border-b border-line px-3 py-2 text-right font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map((row) => (
                  <tr key={row.customerId}>
                    <td className="border-b border-line px-3 py-2">{row.customerName}</td>
                    <td className="tabular border-b border-line px-3 py-2 text-right">
                      {rupees(row.outstandingPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      )}

      {checklist && (
        <Panel title={`Close readiness — ${checklist.periodKey}`}>
          {checklist.ready ? (
            <p className="m-0 text-[15px] text-success">Nothing outstanding for this period.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {checklist.blockers.map((blocker) => (
                <li key={blocker.kind} className="flex items-baseline gap-3 text-[15px]">
                  <span className="tabular font-medium">{blocker.count}</span>
                  <span className="text-text-secondary">{blocker.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  );
}
