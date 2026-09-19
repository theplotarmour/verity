import { withCapabilityPageAccess } from "@/components/ui/PageAccess";
import { COMPLAINT_CAPABILITY } from "@/server/capabilities/complaint";
import { requireActor } from "@/server/platform/auth";
import { runQuery } from "@/server/actions/platform";
import { PageHeader, Stat, StatRow, ErrorState } from "@/components/ui/primitives";
import { ComplaintQueue } from "./ComplaintQueue";

export const dynamic = "force-dynamic";

type ComplaintRow = { id: string; locationId: string; customerId: string | null; category: string; severity: string; status: string; createdAt: string };

/** §36-37 — every open service issue, in one queue. */
async function ComplaintsPage() {
  await requireActor();
  const result = await runQuery<ComplaintRow[]>("verity.complaint.list", {});
  if (!result.ok) return <ErrorState title="Could not load complaints" message={result.message} issues={result.issues} retryable={result.retryable} />;

  const complaints = result.data;
  const open = complaints.filter((c) => c.status !== "Resolved" && c.status !== "Closed").length;
  const critical = complaints.filter((c) => c.severity === "Critical" && c.status !== "Resolved" && c.status !== "Closed").length;

  return (
    <>
      <PageHeader
        title="Complaints"
        description="Every service issue, from filing to resolution. Compensation, when offered, is recorded on the same ticket."
      />
      <StatRow cols={3} className="mb-6">
        <Stat label="Total" value={complaints.length} />
        <Stat label="Open" value={open} />
        <Stat label="Critical, open" value={critical} />
      </StatRow>
      <ComplaintQueue complaints={complaints} />
    </>
  );
}

export default withCapabilityPageAccess(COMPLAINT_CAPABILITY, ComplaintsPage);
