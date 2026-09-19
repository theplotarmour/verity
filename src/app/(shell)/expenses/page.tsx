import { withCapabilityPageAccess } from "@/components/ui/PageAccess";
import { FINANCE_CAPABILITY } from "@/server/capabilities/finance";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { runQuery } from "@/server/actions/platform";
import { PageHeader, Stat, StatRow, ErrorState } from "@/components/ui/primitives";
import { ExpenseBoard } from "./ExpenseBoard";

export const dynamic = "force-dynamic";

type ExpenseRow = { id: string; category: string; amountMinor: number; status: string; expenseDate: string };

function formatRupees(minor: number): string {
  return (minor / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

/** §44-46 — every outlet expense, pending ones needing a decision. */
async function ExpensesPage() {
  const actor = await requireActor();
  const [result, locations] = await Promise.all([
    runQuery<ExpenseRow[]>("verity.finance.list_expenses", {}),
    withTenant(actor.tenantId, (tx) => tx.location.findMany({ select: { id: true, name: true } })),
  ]);
  if (!result.ok) return <ErrorState title="Could not load expenses" message={result.message} issues={result.issues} retryable={result.retryable} />;

  const expenses = result.data;
  const pending = expenses.filter((e) => e.status === "Pending");
  const approvedTotal = expenses.filter((e) => e.status === "Approved").reduce((sum, e) => sum + e.amountMinor, 0);

  return (
    <>
      <PageHeader title="Expenses" description="Every outlet expense — rent, utilities, supplies — approved or rejected before it counts against P&L." />
      <StatRow cols={3} className="mb-6">
        <Stat label="Pending decision" value={pending.length} />
        <Stat label="Approved, this range" value={formatRupees(approvedTotal)} />
        <Stat label="Total records" value={expenses.length} />
      </StatRow>
      <ExpenseBoard expenses={expenses} locations={locations} />
    </>
  );
}

export default withCapabilityPageAccess(FINANCE_CAPABILITY, ExpensesPage);
