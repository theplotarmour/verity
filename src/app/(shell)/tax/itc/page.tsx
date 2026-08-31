import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { itcReconciliation } from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { ItcView } from "./ItcView";

export const dynamic = "force-dynamic";

/**
 * §59 — the purchase register against the GST portal.
 *
 * The accountant works only the differences. Everything matched is collapsed to
 * a count, because a reconciliation that makes someone scroll past agreement to
 * find disagreement has recreated the spreadsheet it replaced.
 */
export default async function ItcPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { period } = await searchParams;

  let report: Awaited<ReturnType<typeof itcReconciliation.handler>>;
  try {
    report = await executeQuery(actor, itcReconciliation, {
      ...(period && /^\d{4}-\d{2}$/.test(period) ? { periodKey: period } : {}),
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="ITC reconciliation" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Input credit reconciliation"
        description={`${report.periodKey}. What suppliers billed, against what they filed. Portal data is never posted from — it is a second opinion used to find disagreements, not a source your books follow.`}
      />
      <ItcView report={report} />
    </>
  );
}
