import { withCapabilityPageAccess } from "@/components/ui/PageAccess";
import { CRM_CAPABILITY, listCustomers } from "@/server/capabilities/crm";
import { requireActor } from "@/server/platform/auth";
import { runQuery } from "@/server/actions/platform";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader, Stat, StatRow, DemoDataNotice, ErrorState } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

function formatRupees(minor: number): string {
  return (minor / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

/**
 * §28-30 — every walk-in diner the business has a phone number for.
 * `listCustomers` computes spend/visits live from settled Bills; this page
 * has no state of its own beyond what that query already returns.
 */
async function GuestsPage() {
  await requireActor();
  const result = await runQuery<Awaited<ReturnType<typeof listCustomers.handler>>>("verity.crm.list_customers", {});
  if (!result.ok) return <ErrorState title="Could not load guests" message={result.message} issues={result.issues} retryable={result.retryable} />;

  const guests = result.data;
  const repeat = guests.filter((g) => g.orderCount >= 2).length;
  const totalSpend = guests.reduce((sum, g) => sum + g.totalSpendMinor, 0);

  return (
    <>
      <PageHeader
        title="Guests"
        description="Every diner matched by phone number, shared across outlets. Spend and visits are computed live from settled bills — never cached."
      />

      <StatRow cols={3} className="mb-6">
        <Stat label="Guests" value={guests.length} />
        <Stat label="Repeat guests (2+ visits)" value={repeat} />
        <Stat label="Lifetime spend" value={formatRupees(totalSpend)} />
      </StatRow>

      <DataTable
        caption="Guests"
        rows={guests.map((g) => ({
          id: g.id,
          name: g.name ?? "—",
          phone: g.phone,
          orderCount: g.orderCount,
          totalSpend: formatRupees(g.totalSpendMinor),
          lastOrderAt: g.lastOrderAt ? new Date(g.lastOrderAt).toLocaleDateString("en-IN") : "Never",
        }))}
        columns={[
          { key: "name", header: "Guest", variant: "link", href: "/guests/{id}", subKey: "phone" },
          { key: "orderCount", header: "Visits", numeric: true },
          { key: "totalSpend", header: "Lifetime spend", numeric: true },
          { key: "lastOrderAt", header: "Last order" },
        ]}
        emptyTitle="No guests yet"
        emptyDescription="A guest is created automatically the first time a phone number is captured on a settled bill."
      />
      <div className="mt-6">
        <DemoDataNotice />
      </div>
    </>
  );
}

export default withCapabilityPageAccess(CRM_CAPABILITY, GuestsPage);
