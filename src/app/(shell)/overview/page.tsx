import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import {
  lowStock,
  marginReport,
  onboardingChecklist,
  ownerConsole,
} from "@/server/capabilities/plywood";
import { SetupChecklist } from "./SetupChecklist";
import {
  Button,
  PageHeader,
  Panel,
  PermissionDenied,
  Stat,
  StatRow,
} from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * The owner console.
 *
 * plywood.md §8.1 names eight figures, so this shows exactly those eight and
 * nothing invented alongside them. Each is a link, because the value of a
 * dashboard number is the screen it takes you to — a figure with no way through
 * to the records behind it is a number to worry about rather than act on.
 *
 * Everything here is the sum of records that already exist. Nothing is typed in
 * and nothing is estimated.
 */
export default async function OverviewPage() {
  installCapabilities();
  const actor = await requireActor();

  let console_: Awaited<ReturnType<typeof ownerConsole.handler>>;
  try {
    console_ = await executeQuery(actor, ownerConsole, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="the owner console" />;
    throw error;
  }

  const [margin, short, setup] = await Promise.all([
    executeQuery(actor, marginReport, { sinceDays: 30 }).catch((error) => {
      if (error instanceof ForbiddenError) return null;
      throw error;
    }),
    executeQuery(actor, lowStock, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
    // §3. Denied is treated as "nothing to show" rather than as an error: a
    // warehouse operator cannot read the business profile and does not need an
    // onboarding checklist either.
    executeQuery(actor, onboardingChecklist, {}).catch((error) => {
      if (error instanceof ForbiddenError) return null;
      throw error;
    }),
  ]);

  // The trade name if the business has set one, its legal name otherwise, and
  // the tenant's own name until either exists. Read here rather than passed
  // down from the shell, because the shell names the workspace and this names
  // the business — they are the same string today and need not stay so.
  const businessName = await withTenant(actor.tenantId, async (tx) => {
    const profile = await tx.plywoodBusinessProfile.findFirst({
      select: { tradeName: true, legalName: true },
    });
    if (profile?.tradeName) return profile.tradeName;
    if (profile?.legalName) return profile.legalName;
    const tenant = await tx.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { name: true },
    });
    return tenant?.name ?? "your business";
  });

  return (
    <>
      <PageHeader
        title="Business Overview"
        description="Today's trade, what the godowns hold, and what is owed in each direction. Every figure is the sum of records — follow any of them through to the screen it came from."
      />

      {/* §3 — the checklist leads while it is unfinished, and disappears
          entirely once it is done. A permanent "you are set up" banner is
          furniture. */}
      {setup && !setup.complete && (
        <div className="mb-6">
          <SetupChecklist checklist={setup} businessName={businessName} />
        </div>
      )}

      <div className="mb-4">
        <StatRow>
          <Stat
            label="Today's sales"
            value={rupees(console_.todaysSalesPaise)}
            href="/finance"
            hint="Invoiced today"
          />
          <Stat
            label="Today's purchases"
            value={rupees(console_.todaysPurchasesPaise)}
            href="/purchases"
            hint="Billed today"
          />
          <Stat
            label="Stock value"
            value={rupees(console_.stockValuePaise)}
            href="/stock"
            hint="At weighted average cost"
          />
          <Stat
            label="Low stock"
            value={String(console_.lowStockBoards)}
            href="/stock"
            hint={console_.lowStockBoards === 0 ? "Nothing to buy" : "At or below reorder"}
          />
        </StatRow>
      </div>

      <div className="mb-6">
        <StatRow>
          <Stat
            label="Receivables"
            value={rupees(console_.receivablesPaise)}
            href="/finance"
            hint="Owed to us"
          />
          <Stat
            label="Payables"
            value={rupees(console_.payablesPaise)}
            href="/finance"
            hint="Owed by us"
          />
          <Stat
            label="Awaiting goods issue"
            value={String(console_.awaitingGoodsIssue)}
            href="/sales"
            hint="Approved, not yet issued"
          />
        </StatRow>
      </div>

      {margin && (
        <div className="mb-4">
          <Panel title="Margin, last 30 days">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="tabular m-0 text-[28px] font-normal leading-none tracking-[-0.02em] text-text">
                  {rupees(margin.marginPaise)}
                </p>
                <p className="mb-0 mt-2 text-[13px] text-text-secondary">
                  {rupees(margin.revenuePaise)} sold, {rupees(margin.costOfGoodsSoldPaise)} cost —{" "}
                  <span className="tabular">{(margin.marginBp / 100).toFixed(1)}%</span>
                </p>
              </div>
              {/* Named, not implied. FIFO and last-purchase-cost would each give
                  a different number from the same records, and an owner reading
                  this is entitled to know which one they are looking at. */}
              <p className="m-0 max-w-[46ch] text-[12px] text-text-tertiary">
                Costed by {margin.costingMethod.toLowerCase()}. Revenue excludes tax collected — tax
                is not income. Cost is what the stock ledger recorded as consumed at the moment each
                sale happened, so a later purchase cannot restate a past margin.
              </p>
            </div>
          </Panel>
        </div>
      )}

      {short.length > 0 && (
        <Panel
          title="Needs buying"
          action={
            <Link href="/purchases">
              <Button size="sm">Raise an order</Button>
            </Link>
          }
        >
          <table className="w-full border-collapse">
            <caption className="sr-only">Boards at or below their reorder level</caption>
            <thead>
              <tr>
                {["Board", "On hand", "Reorder at"].map((heading, index) => (
                  <th
                    key={heading}
                    className={
                      "border-b border-line px-3 py-2 text-[12px] font-normal text-text-tertiary " +
                      (index === 0 ? "text-left" : "text-right")
                    }
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {short.slice(0, 10).map((row) => (
                <tr key={row.productId}>
                  <td className="border-b border-line px-3 py-2 text-[14px] text-text">
                    {row.brandName} · {row.productName}
                  </td>
                  <td className="tabular border-b border-line px-3 py-2 text-right text-[14px] text-warning">
                    {row.onHandUnits} {row.unitLabel}
                  </td>
                  <td className="tabular border-b border-line px-3 py-2 text-right text-[13px] text-text-secondary">
                    {row.reorderLevelUnits}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
