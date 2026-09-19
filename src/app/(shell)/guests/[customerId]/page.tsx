import { withCapabilityPageAccess } from "@/components/ui/PageAccess";
import { CRM_CAPABILITY } from "@/server/capabilities/crm";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { runQuery } from "@/server/actions/platform";
import { PageHeader, Stat, StatRow, DefinitionList, Panel, EmptyState, ErrorState } from "@/components/ui/primitives";
import { GuestActions } from "./GuestActions";

export const dynamic = "force-dynamic";

function formatRupees(minor: number): string {
  return (minor / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

type Customer360 = {
  id: string; phone: string; name: string | null; email: string | null;
  orderCount: number; totalSpendMinor: number; avgOrderValueMinor: number; lastOrderAt: string | null;
};
type Complaint = { id: string; category: string; severity: string; status: string; createdAt: string };

/** §28-30 detail + §31 loyalty balance/redeem + §36-37 complaint history — one guest, one screen. */
async function GuestDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const actor = await requireActor();

  const [customerResult, balanceResult, complaintsResult, locations] = await Promise.all([
    runQuery<Customer360 | null>("verity.crm.get_customer_360", { customerId }),
    runQuery<{ balance: number }>("verity.loyalty.get_balance", { customerId }),
    runQuery<Complaint[]>("verity.complaint.list", { customerId }),
    withTenant(actor.tenantId, (tx) => tx.location.findMany({ select: { id: true, name: true } })),
  ]);

  if (!customerResult.ok) return <ErrorState title="Could not load guest" message={customerResult.message} issues={customerResult.issues} retryable={customerResult.retryable} />;
  const customer = customerResult.data;
  if (!customer) return <EmptyState title="Guest not found" description="No guest with this id in your scope." />;

  const balance = balanceResult.ok ? balanceResult.data.balance : 0;
  const complaints = complaintsResult.ok ? complaintsResult.data : [];

  return (
    <>
      <PageHeader title={customer.name ?? customer.phone} description={customer.phone} />

      <StatRow cols={4} className="mb-6">
        <Stat label="Visits" value={customer.orderCount} />
        <Stat label="Lifetime spend" value={formatRupees(customer.totalSpendMinor)} />
        <Stat label="Avg order value" value={formatRupees(customer.avgOrderValueMinor)} />
        <Stat label="Loyalty points" value={balance} />
      </StatRow>

      <Panel title="Details" className="mb-6">
        <DefinitionList
          items={[
            { term: "Phone", value: customer.phone },
            { term: "Email", value: customer.email ?? "—" },
            {
              term: "Last order",
              value: customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("en-IN") : "Never",
            },
          ]}
        />
      </Panel>

      <GuestActions customerId={customer.id} balance={balance} locations={locations} complaints={complaints} />
    </>
  );
}

export default withCapabilityPageAccess(CRM_CAPABILITY, GuestDetailPage);
