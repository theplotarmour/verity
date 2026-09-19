import { withCapabilityPageAccess } from "@/components/ui/PageAccess";
import { FINANCE_CAPABILITY } from "@/server/capabilities/finance";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { PageHeader } from "@/components/ui/primitives";
import { CashReconciliationForm } from "./CashReconciliationForm";

export const dynamic = "force-dynamic";

/** §44-45 — expected cash (opening + cash sales - cash expenses - withdrawn) vs. actual, per outlet per day. */
async function CashReconciliationPage() {
  const actor = await requireActor();
  const locations = await withTenant(actor.tenantId, (tx) => tx.location.findMany({ select: { id: true, name: true } }));

  return (
    <>
      <PageHeader
        title="Cash reconciliation"
        description="Expected cash is computed from opening float, cash sales, cash expenses and withdrawals. A variance requires an explanation."
      />
      <CashReconciliationForm locations={locations} />
    </>
  );
}

export default withCapabilityPageAccess(FINANCE_CAPABILITY, CashReconciliationPage);
