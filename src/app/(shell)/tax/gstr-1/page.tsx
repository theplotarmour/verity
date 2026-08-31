import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { gstr1Working } from "@/server/capabilities/plywood";
import {
  EmptyState,
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
 * §61 — outward supplies, generated from issued sales invoices.
 *
 * B2B and B2C split on whether the buyer holds a GSTIN and on nothing else,
 * plus the HSN summary the return actually asks for. Generated, never typed.
 */
export default async function Gstr1Page() {
  installCapabilities();
  const actor = await requireActor();

  let working: Awaited<ReturnType<typeof gstr1Working.handler>>;
  try {
    working = await executeQuery(actor, gstr1Working, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="the GSTR-1 working" />;
    throw error;
  }

  const taxable =
    working.b2b.reduce((sum, row) => sum + row.taxablePaise, 0) +
    working.b2c.reduce((sum, row) => sum + row.taxablePaise, 0);
  const tax =
    working.b2b.reduce((sum, row) => sum + row.taxPaise, 0) +
    working.b2c.reduce((sum, row) => sum + row.taxPaise, 0);

  return (
    <>
      <PageHeader
        title="GSTR-1 working"
        description="Outward supplies, read from issued tax invoices. A buyer with a GSTIN is B2B and one without is B2C — that is the whole distinction."
      />

      <div className="flex flex-col gap-5">
        <StatRow cols={4}>
          <Stat label="Taxable value" value={rupeesShort(taxable)} />
          <Stat label="Tax" value={rupeesShort(tax)} />
          <Stat label="B2B invoices" value={working.b2b.length} />
          <Stat label="B2C invoices" value={working.b2c.length} />
        </StatRow>

        {working.validations.length > 0 && (
          <div className="rounded-lg border border-warning/25 bg-warning-subtle px-5 py-4">
            <p className="m-0 text-[14px] text-text">Check these before filing.</p>
            <ul className="m-0 mt-2 list-disc pl-5 text-[13px] text-text-secondary">
              {working.validations.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <Panel flush title="B2B">
          {working.b2b.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState compact title="No registered-buyer supplies this period" />
            </div>
          ) : (
            <RowList>
              {working.b2b.map((row) => (
                <Row key={row.invoiceNumber}>
                  <div className="min-w-0">
                    <p className="m-0 text-[14px] text-text">{row.invoiceNumber}</p>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                      {row.customerName} · {row.gstin} · place of supply {row.placeOfSupply}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-8 text-right">
                    <div>
                      <p className="tabular m-0 text-[14px] text-text">{rupees(row.taxablePaise)}</p>
                      <p className="m-0 text-[12px] text-text-tertiary">Taxable</p>
                    </div>
                    <div className="w-24">
                      <p className="tabular m-0 text-[14px] text-text">{rupees(row.taxPaise)}</p>
                      <p className="m-0 text-[12px] text-text-tertiary">Tax</p>
                    </div>
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <Panel flush title="B2C">
          {working.b2c.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState compact title="No unregistered-buyer supplies this period" />
            </div>
          ) : (
            <RowList>
              {working.b2c.map((row) => (
                <Row key={row.invoiceNumber}>
                  <div className="min-w-0">
                    <p className="m-0 text-[14px] text-text">{row.invoiceNumber}</p>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                      Place of supply {row.placeOfSupply}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-8 text-right">
                    <div>
                      <p className="tabular m-0 text-[14px] text-text">{rupees(row.taxablePaise)}</p>
                      <p className="m-0 text-[12px] text-text-tertiary">Taxable</p>
                    </div>
                    <div className="w-24">
                      <p className="tabular m-0 text-[14px] text-text">{rupees(row.taxPaise)}</p>
                      <p className="m-0 text-[12px] text-text-tertiary">Tax</p>
                    </div>
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <Panel flush title="HSN summary">
          {working.hsnSummary.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState compact title="Nothing supplied this period" />
            </div>
          ) : (
            <RowList>
              {working.hsnSummary.map((row) => (
                <Row key={row.hsnCode}>
                  <div>
                    <p className="m-0 text-[14px] text-text">HSN {row.hsnCode}</p>
                    <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                      {row.qtyUnits.toLocaleString("en-IN")} sheets
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-8 text-right">
                    <div>
                      <p className="tabular m-0 text-[14px] text-text">{rupees(row.taxablePaise)}</p>
                      <p className="m-0 text-[12px] text-text-tertiary">Taxable</p>
                    </div>
                    <div className="w-24">
                      <p className="tabular m-0 text-[14px] text-text">{rupees(row.taxPaise)}</p>
                      <p className="m-0 text-[12px] text-text-tertiary">Tax</p>
                    </div>
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <Related
          links={[
            { href: "/tax", label: "Tax & Compliance" },
            { href: "/tax/gstr-3b", label: "GSTR-3B", note: "The summary return" },
            { href: "/tax/exceptions", label: "Exceptions" },
            { href: "/finance", label: "Invoices" },
          ]}
        />
      </div>
    </>
  );
}
