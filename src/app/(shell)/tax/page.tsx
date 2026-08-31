import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { closeChecklist, gstr3bWorking, taxSummary } from "@/server/capabilities/plywood";
import {
  PageHeader,
  Panel,
  PermissionDenied,
  Row,
  RowList,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { rupees, rupeesShort } from "@/components/ui/business/format";
import { Related } from "@/components/ui/business/Related";

export const dynamic = "force-dynamic";

/**
 * §58 — the accountant's home.
 *
 * Output, credit, and what is left to pay, with the exceptions that stand
 * between those figures and a filing. Every number is derived from posted
 * documents; there is deliberately no field on this page, because §58 is
 * explicit that the tax centre must never become a second entry system.
 */
export default async function TaxCentrePage() {
  installCapabilities();
  const actor = await requireActor();

  let summary: Awaited<ReturnType<typeof taxSummary.handler>>;
  try {
    summary = await executeQuery(actor, taxSummary, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="tax" />;
    throw error;
  }

  const [threeB, close] = await Promise.all([
    executeQuery(actor, gstr3bWorking, {}).catch((error) => {
      if (error instanceof ForbiddenError) return null;
      throw error;
    }),
    executeQuery(actor, closeChecklist, {}).catch((error) => {
      if (error instanceof ForbiddenError) return null;
      throw error;
    }),
  ]);

  const period = new Date(summary.from).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <PageHeader
        title="Tax & Compliance"
        description={`${period}. Every figure here is read from posted invoices and notes — nothing on this page is entered, and there is no field to enter it in.`}
      />

      <div className="flex flex-col gap-5">
        <StatRow cols={4}>
          <Stat
            label="Output GST"
            value={rupeesShort(summary.outputTaxPaise)}
            hint={`${summary.salesInvoiceCount} sales invoice(s)`}
            href="/tax/gstr-1"
          />
          <Stat
            label="Input credit"
            value={rupeesShort(summary.inputTaxPaise)}
            hint={`${summary.purchaseInvoiceCount} purchase invoice(s)`}
          />
          <Stat
            label="Net estimate"
            value={rupeesShort(summary.netPayablePaise)}
            hint="Output less credit"
            href="/tax/gstr-3b"
          />
          <Stat
            label="Exceptions"
            value={summary.exceptions.length}
            hint={summary.exceptions.length === 0 ? "Nothing to fix" : "Need attention"}
            href="/tax/exceptions"
          />
        </StatRow>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel flush title="Returns">
            <RowList>
              <Row>
                <div>
                  <Link href="/tax/gstr-1" className="text-[14px] text-text no-underline hover:underline">
                    GSTR-1
                  </Link>
                  <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                    Outward supplies, invoice by invoice
                  </p>
                </div>
                <span className="text-[13px] text-text-tertiary">
                  {summary.salesInvoiceCount} invoice(s)
                </span>
              </Row>
              <Row>
                <div>
                  <Link href="/tax/purchases" className="text-[14px] text-text no-underline hover:underline">
                    Purchase review
                  </Link>
                  <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                    Order, receipt and supplier invoice, compared
                  </p>
                </div>
                <span className="text-[13px] text-text-tertiary">
                  {summary.purchaseInvoiceCount} invoice(s)
                </span>
              </Row>
              <Row>
                <div>
                  <Link href="/tax/gstr-3b" className="text-[14px] text-text no-underline hover:underline">
                    GSTR-3B
                  </Link>
                  <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                    The summary you pay from
                  </p>
                </div>
                <span className="text-[13px] text-text-tertiary">
                  {threeB === null
                    ? "—"
                    : threeB.ready
                      ? "Ready"
                      : `${threeB.blockers.length} blocker(s)`}
                </span>
              </Row>
            </RowList>
          </Panel>

          <Panel flush title="Period close">
            {close === null ? (
              <div className="px-5 py-6 text-[13px] text-text-tertiary">
                You do not have access to the close checklist.
              </div>
            ) : (
              <RowList>
                <Row>
                  <div>
                    <Link
                      href="/tax/close"
                      className="text-[14px] text-text no-underline hover:underline"
                    >
                      Close the period
                    </Link>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                      Locks invoices and finalised tax facts
                    </p>
                  </div>
                </Row>
              </RowList>
            )}
          </Panel>
        </div>

        {summary.exceptions.length > 0 && (
          <Panel
            flush
            title="Needs attention"
            action={
              <Link
                href="/tax/exceptions"
                className="text-[13px] text-accent-ink no-underline hover:underline"
              >
                All exceptions →
              </Link>
            }
          >
            <RowList>
              {summary.exceptions.slice(0, 5).map((exception, index) => (
                <Row key={`${exception.documentNumber}-${index}`}>
                  <div className="min-w-0">
                    <p className="m-0 text-[14px] text-text">{exception.detail}</p>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                      {exception.documentNumber}
                    </p>
                  </div>
                </Row>
              ))}
            </RowList>
          </Panel>
        )}

        <Related
          links={[
            { href: "/settings/tax", label: "Tax settings", note: "Registration and rates" },
            { href: "/finance", label: "Finance", note: "Receivables and payables" },
            { href: "/ledgers", label: "Ledgers" },
            { href: "/reports", label: "Reports" },
          ]}
        />
      </div>
    </>
  );
}
