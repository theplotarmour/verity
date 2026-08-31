import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { gstr3bWorking } from "@/server/capabilities/plywood";
import {
  DefinitionList,
  PageHeader,
  Panel,
  PermissionDenied,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { rupees, rupeesShort } from "@/components/ui/business/format";
import { Related } from "@/components/ui/business/Related";

export const dynamic = "force-dynamic";

/**
 * §62 — the summary return, and the cash it implies.
 *
 * There is no field on this page and no save button, by design. §58: the tax
 * centre must never become a second entry system. A person who can type into a
 * 3B has produced a return that no longer agrees with the invoices behind it,
 * and no way to say which is right.
 */
export default async function Gstr3bPage() {
  installCapabilities();
  const actor = await requireActor();

  let working: Awaited<ReturnType<typeof gstr3bWorking.handler>>;
  try {
    working = await executeQuery(actor, gstr3bWorking, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="the GSTR-3B working" />;
    throw error;
  }

  const period = new Date(working.from).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <PageHeader
        title="GSTR-3B working"
        description={`${period}. Derived from posted invoices and notes. Every amount below is the sum of documents you can open — nothing is entered here.`}
      />

      <div className="flex flex-col gap-5">
        <StatRow cols={3}>
          <Stat
            label="Output liability"
            value={rupeesShort(working.outward.netTaxPaise)}
            hint={`${working.outward.invoiceCount} invoice(s)`}
          />
          <Stat
            label="Eligible credit"
            value={rupeesShort(working.inward.eligibleItcPaise)}
            hint={`${working.inward.invoiceCount} purchase invoice(s)`}
          />
          <Stat
            label="Cash required"
            value={rupeesShort(working.netCashRequiredPaise)}
            hint={working.ready ? "Ready to file" : "Not ready"}
          />
        </StatRow>

        {!working.ready && (
          // §63 — an accountant works exceptions. Naming each blocker is the
          // difference between a task and a warning.
          <div className="rounded-lg border border-warning/25 bg-warning-subtle px-5 py-4">
            <p className="m-0 text-[14px] text-text">
              This return is not ready to file.
            </p>
            <ul className="m-0 mt-2 list-disc pl-5 text-[13px] text-text-secondary">
              {working.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Outward supplies">
            <DefinitionList
              items={[
                { term: "Taxable value", value: rupees(working.outward.taxablePaise) },
                { term: "CGST", value: rupees(working.outward.cgstPaise) },
                { term: "SGST", value: rupees(working.outward.sgstPaise) },
                { term: "IGST", value: rupees(working.outward.igstPaise) },
                { term: "Debit notes", value: `+ ${rupees(working.outward.debitNoteTaxPaise)}` },
                { term: "Credit notes", value: `− ${rupees(working.outward.creditNoteTaxPaise)}` },
                { term: "Net liability", value: rupees(working.outward.netTaxPaise) },
              ]}
            />
          </Panel>

          <Panel title="Input credit">
            <DefinitionList
              items={[
                { term: "Taxable value", value: rupees(working.inward.taxablePaise) },
                { term: "CGST", value: rupees(working.inward.cgstPaise) },
                { term: "SGST", value: rupees(working.inward.sgstPaise) },
                { term: "IGST", value: rupees(working.inward.igstPaise) },
                { term: "Credit in books", value: rupees(working.inward.booksItcPaise) },
                { term: "Eligible credit", value: rupees(working.inward.eligibleItcPaise) },
                {
                  term: "Unsubstantiated",
                  value:
                    working.inward.unsubstantiatedCount === 0
                      ? "None"
                      : `${working.inward.unsubstantiatedCount} invoice(s) with no tax split`,
                },
              ]}
            />
            {/* Books and eligible are two fields on purpose. They are equal
                today; the moment a portal import exists, only "eligible"
                changes meaning, and a single merged number would have to be
                split then with every reader of it re-checked. */}
            <p className="m-0 mt-3 text-[12px] text-text-tertiary">
              Credit in books is what suppliers billed. Eligible is what can be evidenced. An
              invoice recorded without its tax split is not disallowed — it is unproven, and it is
              listed under exceptions until the split is entered.
            </p>
          </Panel>
        </div>

        <Panel title="Net tax">
          <DefinitionList
            items={[
              { term: "Output liability", value: rupees(working.outward.netTaxPaise) },
              { term: "Less eligible credit", value: `− ${rupees(working.inward.eligibleItcPaise)}` },
              { term: "Cash required", value: rupees(working.netCashRequiredPaise) },
            ]}
          />
          <p className="m-0 mt-3 text-[12px] text-text-tertiary">
            A credit surplus carries forward rather than becoming a refund, so this figure never
            goes below zero.
          </p>
        </Panel>

        <Related
          links={[
            { href: "/tax", label: "Tax & Compliance" },
            { href: "/tax/gstr-1", label: "GSTR-1", note: "Outward supplies" },
            { href: "/tax/exceptions", label: "Exceptions" },
            { href: "/finance", label: "Invoices" },
          ]}
        />
      </div>
    </>
  );
}
