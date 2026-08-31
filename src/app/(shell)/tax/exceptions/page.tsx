import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { taxSummary } from "@/server/capabilities/plywood";
import {
  EmptyState,
  PageHeader,
  Panel,
  PermissionDenied,
  Row,
  RowList,
} from "@/components/ui/primitives";
import { Related } from "@/components/ui/business/Related";
import {
  PeriodSwitch,
  periodFromParam,
} from "@/components/ui/business/PeriodSwitch";
import { monthKeyOf, monthWindow } from "@/components/ui/business/period";

export const dynamic = "force-dynamic";

/**
 * §63 — the accountant's actual work.
 *
 * The specification's point is that an accountant should work exceptions rather
 * than re-key transactions, so each row here says what is wrong, on which
 * document, and what to do about it. A list of codes would be a different
 * screen doing none of that.
 */

/** What each exception kind means, and the action that clears it. */
const EXCEPTION: Record<
  string,
  { title: string; action: string; href: string }
> = {
  missing_place_of_supply: {
    title: "Place of supply missing",
    action: "Set the customer's state so CGST/SGST against IGST can be decided",
    href: "/customers",
  },
  missing_hsn: {
    title: "HSN code missing",
    action: "Add the HSN to the product; the return summarises by HSN",
    href: "/catalogue",
  },
  zero_tax: {
    title: "No tax charged",
    action:
      "Confirm the supply is genuinely exempt, or add the rate under Tax settings",
    href: "/settings/tax",
  },
  no_input_credit: {
    title: "Purchase invoice has no tax split",
    action:
      "Enter the supplier's CGST/SGST/IGST so the credit can be evidenced",
    href: "/finance",
  },
};

export default async function TaxExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  // Carried through from the tax centre, so stepping into a return does not
  // silently jump back to the current month.
  const chosen = periodFromParam((await searchParams).period);
  const window = chosen ? monthWindow(chosen) : {};

  let summary: Awaited<ReturnType<typeof taxSummary.handler>>;
  try {
    summary = await executeQuery(actor, taxSummary, window);
  } catch (error) {
    if (error instanceof ForbiddenError)
      return <PermissionDenied what="tax exceptions" />;
    throw error;
  }

  // Grouped by kind, because they are fixed a kind at a time: whoever is
  // adding HSN codes is in the catalogue and should stay there.
  const grouped = new Map<string, typeof summary.exceptions>();
  for (const exception of summary.exceptions) {
    grouped.set(exception.kind, [
      ...(grouped.get(exception.kind) ?? []),
      exception,
    ]);
  }

  const periodKey = chosen ?? monthKeyOf(new Date());

  return (
    <>
      <PageHeader
        actions={
          <PeriodSwitch basePath="/tax/exceptions" periodKey={periodKey} />
        }
        title="Tax exceptions"
        description="Everything standing between the posted documents and a filing. Each one is a thing to fix on a record, not a number to correct on a return."
      />

      <div className="flex flex-col gap-5">
        {summary.exceptions.length === 0 ? (
          <EmptyState
            title="Nothing needs attention"
            description="Every invoice this period has a place of supply, an HSN code and a tax treatment."
          />
        ) : (
          [...grouped.entries()].map(([kind, rows]) => {
            const meta = EXCEPTION[kind];
            return (
              <Panel
                key={kind}
                flush
                title={meta?.title ?? kind}
                action={
                  meta && (
                    <Link
                      href={meta.href}
                      className="text-[13px] text-accent-ink no-underline hover:underline"
                    >
                      Fix these →
                    </Link>
                  )
                }
              >
                {meta && (
                  <p className="m-0 px-5 pb-3 pt-0 text-[13px] text-text-secondary">
                    {meta.action}
                  </p>
                )}
                <RowList>
                  {rows.map((exception, index) => (
                    <Row key={`${exception.documentNumber}-${index}`}>
                      <div className="min-w-0">
                        <p className="m-0 text-[14px] text-text">
                          {exception.documentNumber}
                        </p>
                        <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                          {exception.detail}
                        </p>
                      </div>
                    </Row>
                  ))}
                </RowList>
              </Panel>
            );
          })
        )}

        <Related
          links={[
            { href: `/tax?period=${periodKey}`, label: "Tax & Compliance" },
            { href: `/tax/gstr-1?period=${periodKey}`, label: "GSTR-1" },
            { href: `/tax/gstr-3b?period=${periodKey}`, label: "GSTR-3B" },
            { href: "/settings/tax", label: "Tax settings" },
          ]}
        />
      </div>
    </>
  );
}
