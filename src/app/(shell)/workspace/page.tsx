import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { resolvePermissions } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { EmptyState, PageHeader, SectionHeading, StateBadge, Surface } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/**
 * Workspace (§11).
 *
 * Bible V4 §3 draws the distinction this page is built on: a dashboard is for
 * reading, a workspace is for executing. So this is a queue of things awaiting
 * this actor, not a set of metric tiles. Every item links to where the work is
 * done.
 *
 * It shows only what the platform can genuinely answer today — approvals awaiting
 * the actor's role, unresolved sync exceptions, and blocked records. There are no
 * SLA warnings because no SLA engine exists yet, and inventing one here would be
 * a fake workflow.
 */
export default async function WorkspacePage() {
  installCapabilities();
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    const permissions = actor.roleId ? await resolvePermissions(tx, actor.roleId) : [];

    const [approvals, exceptions, blockedAssets] = await Promise.all([
      tx.approvalStep.findMany({
        where: { decision: "Pending", approverRoleId: actor.roleId ?? undefined },
        include: { request: true },
        orderBy: { sequence: "asc" },
      }),
      tx.syncException.findMany({ where: { resolvedAt: null }, take: 10 }),
      tx.asset.findMany({ where: { state: "maintenance" }, take: 10 }),
    ]);

    // Only chains whose *current* step is this one.
    const actionable = [];
    for (const step of approvals) {
      const current = await tx.approvalStep.findFirst({
        where: { requestId: step.requestId, decision: "Pending" },
        orderBy: { sequence: "asc" },
      });
      if (current?.id === step.id) actionable.push(step);
    }

    return { permissions, actionable, exceptions, blockedAssets };
  });

  const nothingWaiting =
    data.actionable.length === 0 && data.exceptions.length === 0 && data.blockedAssets.length === 0;

  return (
    <>
      <PageHeader
        title="Workspace"
        description="What is waiting on you right now. A workspace is for executing; the overview is for reading."
      />

      {nothingWaiting ? (
        <EmptyState
          title="Nothing is waiting on you"
          description="Approvals, unresolved sync exceptions and blocked records appear here when they need attention."
        />
      ) : (
        <div className="flex flex-col gap-10">
          {data.actionable.length > 0 && (
            <section>
              <SectionHeading note={`${data.actionable.length} item${data.actionable.length === 1 ? "" : "s"}`}>
                Awaiting your decision
              </SectionHeading>
              <Surface className="p-1">
                <ul className="list-none m-0 p-0">
                  {data.actionable.map((step) => (
                    <li key={step.id} className="flex items-center justify-between gap-4 px-4 py-3 border-b border-line last:border-b-0">
                      <span className="text-text">
                        {step.request.subjectEntityKey.split(".").pop()} · step {step.sequence + 1}
                      </span>
                      <Link href="/approvals" className="text-accent no-underline hover:underline shrink-0">
                        Decide →
                      </Link>
                    </li>
                  ))}
                </ul>
              </Surface>
            </section>
          )}

          {data.blockedAssets.length > 0 && (
            <section>
              <SectionHeading>Blocked records</SectionHeading>
              <Surface className="p-1">
                <ul className="list-none m-0 p-0">
                  {data.blockedAssets.map((asset) => (
                    <li key={asset.id} className="flex items-center justify-between gap-4 px-4 py-3 border-b border-line last:border-b-0">
                      <Link href={`/assets/${asset.id}`} className="text-accent no-underline hover:underline">
                        {asset.name}
                      </Link>
                      <StateBadge category="Blocked" label={asset.state} />
                    </li>
                  ))}
                </ul>
              </Surface>
            </section>
          )}

          {data.exceptions.length > 0 && (
            <section>
              <SectionHeading>Sync exceptions</SectionHeading>
              <Surface className="p-1">
                <ul className="list-none m-0 p-0">
                  {data.exceptions.map((exception) => (
                    <li key={exception.id} className="px-4 py-3 border-b border-line last:border-b-0">
                      <p className="text-text m-0">{exception.kind}</p>
                      <p className="text-[13px] text-text-secondary m-0">{exception.detail}</p>
                    </li>
                  ))}
                </ul>
              </Surface>
            </section>
          )}
        </div>
      )}
    </>
  );
}
