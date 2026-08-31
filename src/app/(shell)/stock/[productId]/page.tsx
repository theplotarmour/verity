import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { stockLedger } from "@/server/capabilities/plywood";
import {
  EmptyState,
  PageHeader,
  Panel,
  PermissionDenied,
  Row,
  RowList,
} from "@/components/ui/primitives";
import { day, rupees } from "@/components/ui/business/format";
import { MOVEMENT_KIND, movementHref } from "@/components/ui/business/movements";
import { Related } from "@/components/ui/business/Related";

export const dynamic = "force-dynamic";

/**
 * §13 — why a quantity is what it is.
 *
 * The specification calls this critical for warehouse staff and accountants,
 * and it is what makes §9's rule enforceable: stock is never hand-edited, so
 * every sheet on hand traces to a movement that says who moved it and why.
 *
 * Oldest first with a running balance, so the closing figure is the last row.
 * A running total that counts down from the present is not a running balance.
 */
export default async function StockLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ godown?: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { productId } = await params;
  const { godown } = await searchParams;

  let ledger: Awaited<ReturnType<typeof stockLedger.handler>>;
  try {
    ledger = await executeQuery(actor, stockLedger, {
      productId,
      // A malformed godown in the query string is ignored rather than fatal:
      // this is a shareable URL and a truncated one should still show the
      // product's whole ledger.
      ...(godown && /^[0-9a-f-]{36}$/i.test(godown) ? { locationId: godown } : {}),
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="stock movements" />;
    throw error;
  }
  if (!ledger) notFound();

  return (
    <>
      <PageHeader
        title={`${ledger.productName} — movement ledger`}
        description={
          ledger.locationName
            ? `Every recorded movement in ${ledger.locationName}, oldest first. The closing balance is the last row.`
            : "Every recorded movement across the godowns you can see, oldest first. The closing balance is the last row."
        }
      />

      <div className="flex flex-col gap-5">
        <Panel
          flush
          title="Movements"
          action={
            <span className="tabular text-[13px] text-text">
              Closing {ledger.closingUnits.toLocaleString("en-IN")}
            </span>
          }
        >
          {ledger.entries.length === 0 ? (
            <div className="px-5 py-6">
              <EmptyState
                compact
                title="No movements recorded"
                description="Stock appears here the moment goods are received against a purchase order."
              />
            </div>
          ) : (
            <RowList>
              {ledger.entries.map((entry) => {
                const href = movementHref(entry.sourceOrderType, entry.sourceOrderId);
                const label = MOVEMENT_KIND[entry.kind] ?? entry.kind;
                return (
                  <Row key={entry.id}>
                    <div className="min-w-0">
                      {href ? (
                        <Link
                          href={href}
                          className="text-[14px] text-text no-underline hover:underline"
                        >
                          {label}
                          {entry.sourceNumber ? ` · ${entry.sourceNumber}` : ""}
                        </Link>
                      ) : (
                        <span className="text-[14px] text-text">{label}</span>
                      )}
                      <p className="m-0 mt-0.5 text-[12px] text-text-tertiary">
                        {day(entry.occurredAt)} ·{" "}
                        <Link
                          href={`/godowns/${entry.locationId}`}
                          className="text-text-tertiary no-underline hover:underline"
                        >
                          {entry.locationName}
                        </Link>
                        {entry.rackLabel ? ` · rack ${entry.rackLabel}` : ""}
                        {/* The reason is the whole point of an adjustment or a
                            damage record. §64: never silently edit a count. */}
                        {entry.reason ? ` · ${entry.reason}` : ""}
                        {entry.unitCostPaise > 0 ? ` · ${rupees(entry.unitCostPaise)} / sheet` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-8 text-right">
                      <span className="tabular w-16 text-[14px] text-text">
                        {entry.qtyDeltaUnits > 0 ? "+" : ""}
                        {entry.qtyDeltaUnits}
                      </span>
                      <span className="tabular w-20 text-[13px] text-text-tertiary">
                        {entry.runningBalanceUnits.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </Row>
                );
              })}
            </RowList>
          )}
        </Panel>

        <Related
          links={[
            { href: `/catalogue/${ledger.productId}`, label: "Product", note: ledger.productName },
            ...(ledger.locationId
              ? [
                  { href: `/godowns/${ledger.locationId}`, label: "Godown", note: ledger.locationName ?? "" },
                  { href: `/stock/${ledger.productId}`, label: "All godowns", note: "Remove the filter" },
                ]
              : [{ href: "/stock", label: "Stock", note: "Every product" }]),
          ]}
        />
      </div>
    </>
  );
}
