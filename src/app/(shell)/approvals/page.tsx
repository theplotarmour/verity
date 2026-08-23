import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_APPROVAL } from "@/server/capabilities/approval";
import { PageHeader, PermissionDenied, SectionHeading, StateBadge, Surface } from "@/components/ui/primitives";
import { ApprovalQueue } from "./ApprovalQueue";

export const dynamic = "force-dynamic";

/**
 * Approval queue (§22).
 *
 * A queue rather than a table, because the operator's question is "what needs me
 * next" rather than "show me all approvals". Chains where the current step
 * belongs to someone else are listed separately and without controls, so it is
 * visible that they exist and clear that they are not actionable yet.
 */
export default async function ApprovalsPage() {
  installCapabilities();
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_APPROVAL))) return null;

    const requests = await tx.approvalRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { steps: { orderBy: { sequence: "asc" }, include: { role: true } } },
    });
    const canDecide = await hasPermission(tx, actor.roleId, "ActionExecute", ENTITY_APPROVAL);

    const shaped = requests.map((request) => {
      const current = request.steps.find((s) => s.decision === "Pending");
      return {
        id: request.id,
        subject: request.subjectEntityKey.split(".").pop() ?? request.subjectEntityKey,
        subjectId: request.subjectEntityId,
        state: request.state,
        outcome: request.outcome,
        createdAt: request.createdAt.toISOString(),
        currentStepSequence: current?.sequence ?? null,
        currentApprover: current?.role.name ?? null,
        // Mine only when the current step names a role I hold.
        mine: Boolean(current && current.approverRoleId === actor.roleId),
        steps: request.steps.map((s) => ({
          sequence: s.sequence,
          role: s.role.name,
          decision: s.decision,
          comment: s.comment,
        })),
      };
    });

    return { canDecide, shaped };
  });

  if (!data) return <PermissionDenied what="reading approvals" />;

  const awaitingMe = data.shaped.filter((r) => r.mine);
  const awaitingOthers = data.shaped.filter((r) => !r.mine && r.outcome === "Pending");
  const settled = data.shaped.filter((r) => r.outcome !== "Pending");

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Chains are decided in sequence. A step can only be decided by the role it names."
      />

      <div className="flex flex-col gap-10">
        <section>
          <SectionHeading note={`${awaitingMe.length} awaiting you`}>Your queue</SectionHeading>
          <ApprovalQueue requests={awaitingMe} canDecide={data.canDecide} />
        </section>

        {awaitingOthers.length > 0 && (
          <section>
            <SectionHeading>Awaiting others</SectionHeading>
            <Surface className="p-1">
              <ul className="list-none m-0 p-0">
                {awaitingOthers.map((request) => (
                  <li key={request.id} className="flex items-baseline justify-between gap-4 px-4 py-3 border-b border-line last:border-b-0">
                    <span className="text-text">
                      {request.subject}
                      <span className="text-text-tertiary"> · step {(request.currentStepSequence ?? 0) + 1}</span>
                    </span>
                    <span className="text-[13px] text-text-tertiary">
                      with {request.currentApprover}
                    </span>
                  </li>
                ))}
              </ul>
            </Surface>
          </section>
        )}

        {settled.length > 0 && (
          <section>
            <SectionHeading>Settled</SectionHeading>
            <Surface className="p-1">
              <ul className="list-none m-0 p-0">
                {settled.map((request) => (
                  <li key={request.id} className="flex items-baseline justify-between gap-4 px-4 py-3 border-b border-line last:border-b-0">
                    <span className="text-text">{request.subject}</span>
                    <StateBadge
                      category={request.outcome === "Approved" ? "Completed" : "Cancelled"}
                      label={request.outcome}
                    />
                  </li>
                ))}
              </ul>
            </Surface>
          </section>
        )}
      </div>
    </>
  );
}
