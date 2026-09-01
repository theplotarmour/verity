import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import {
  closeChecklist,
  gstr3bWorking,
  taxSummary,
} from "@/server/capabilities/plywood";
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
import {
  PeriodSwitch,
  periodFromParam,
} from "@/components/ui/business/PeriodSwitch";
import { monthKeyOf, monthWindow } from "@/components/ui/business/period";
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
export default async function TaxCentrePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  // An accountant in the first week of a month is working on the month that
  // just ended. The screen defaults to now and lets them step back.
  const chosen = periodFromParam((await searchParams).period);
  const window = chosen ? monthWindow(chosen) : {};

  let summary: Awaited<ReturnType<typeof taxSummary.handler>>;
  try {
    summary = await executeQuery(actor, taxSummary, window);
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="tax" />;
    throw error;
  }

  const [threeB, close] = await Promise.all([
    executeQuery(actor, gstr3bWorking, window).catch((error) => {
      if (error instanceof ForbiddenError) return null;
      throw error;
    }),
    executeQuery(actor, closeChecklist, {}).catch((error) => {
      if (error instanceof ForbiddenError) return null;
      throw error;
    }),
  ]);

  // Named by the SERVER, from the business's own zone.
  //
  // This used to derive both from `summary.from` formatted in UTC. The window
  // starts at midnight local time, which east of UTC is the previous day — so
  // September's figures were headed "August 2026" and every link below carried
  // period=2026-08, making GSTR-1, ITC and the exceptions page each query a
  // month with nothing in it. The section looked empty while the data sat one
  // month over.
  const periodKey = chosen ?? summary.periodKey;
  const [year, month] = periodKey.split("-").map(Number);
  const period = new Date(Date.UTC(year!, month! - 1, 1)).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );

  return (
    <>
      <PageHeader
        actions={<PeriodSwitch basePath="/tax" periodKey={periodKey} />}
        title="Tax & Compliance"
        description={`${period}. Every figure is read from invoices already raised — nothing here is typed in, and there is no field to type it into.`}
      />

      <div className="flex flex-col gap-5">
        {/* REPORTED: "I don't understand the tax and compliance section and am
            not sure if it is working. It shows 0 for all the fields." The
            figures were right and the screen never said what they were. GST is
            two flows and a subtraction; saying so costs four lines and is the
            difference between a page an owner trusts and one they avoid. */}
        <Panel title="What this page is">
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[13px] leading-relaxed text-text-secondary">
            <li>
              <strong className="font-medium text-text">
                You collect GST when you sell.
              </strong>{" "}
              It is added to the customer&apos;s invoice and it is not your
              money — you are holding it for the government.
            </li>
            <li>
              <strong className="font-medium text-text">
                You pay GST when you buy,
              </strong>{" "}
              and you can claim that back. It is called input credit.
            </li>
            <li>
              <strong className="font-medium text-text">
                You send the difference.
              </strong>{" "}
              Collected on sales, minus what you can claim on purchases. If you
              bought more than you sold this month, the balance carries forward
              instead.
            </li>
            <li>
              A supplier&apos;s GST can only be claimed once their own bill is
              recorded. Until then Verity shows it separately — the money is
              real, the claim is not yet.
            </li>
          </ul>
        </Panel>

        <StatRow cols={4}>
          <Stat
            label="GST collected on sales"
            value={rupeesShort(summary.outputTaxPaise)}
            hint={`${summary.salesInvoiceCount} sales invoice(s)`}
            href={`/tax/gstr-1?period=${periodKey}`}
          />
          <Stat
            label="Credit you can claim"
            value={rupeesShort(summary.inputTaxEligiblePaise)}
            hint={
              summary.awaitingBillCount === 0
                ? `${summary.purchaseInvoiceCount} purchase invoice(s)`
                : `${rupeesShort(summary.inputTaxAwaitingBillPaise)} more once ${summary.awaitingBillCount} supplier bill(s) arrive`
            }
            href={`/tax/itc?period=${periodKey}`}
          />
          <Stat
            label="Estimated to pay"
            value={rupeesShort(summary.netPayablePaise)}
            hint="Collected on sales, less claimable credit"
            href={`/tax/gstr-3b?period=${periodKey}`}
          />
          <Stat
            label="Exceptions"
            value={summary.exceptions.length}
            hint={
              summary.exceptions.length === 0
                ? "Nothing to fix"
                : "Need attention"
            }
            href={`/tax/exceptions?period=${periodKey}`}
          />
        </StatRow>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel flush title="Returns">
            <RowList>
              <Row>
                <div>
                  <Link
                    href={`/tax/gstr-1?period=${periodKey}`}
                    className="text-[14px] text-text no-underline hover:underline"
                  >
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
                  <Link
                    href={`/tax/itc?period=${periodKey}`}
                    className="text-[14px] text-text no-underline hover:underline"
                  >
                    Input credit reconciliation
                  </Link>
                  <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                    Your purchase register against what suppliers filed
                  </p>
                </div>
              </Row>
              <Row>
                <div>
                  <Link
                    href="/tax/purchases"
                    className="text-[14px] text-text no-underline hover:underline"
                  >
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
                  <Link
                    href={`/tax/gstr-3b?period=${periodKey}`}
                    className="text-[14px] text-text no-underline hover:underline"
                  >
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
                href={`/tax/exceptions?period=${periodKey}`}
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
                    <p className="m-0 text-[14px] text-text">
                      {exception.detail}
                    </p>
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
            {
              href: "/settings/tax",
              label: "Tax settings",
              note: "Registration and rates",
            },
            {
              href: "/finance",
              label: "Finance",
              note: "Receivables and payables",
            },
            { href: "/ledgers", label: "Ledgers" },
            { href: "/reports", label: "Reports" },
          ]}
        />
      </div>
    </>
  );
}
