import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { resolvePermissions } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { workspaceContributionsFor } from "@/server/platform/contribution";
import { EmptyState, PageHeader, SectionHeading, Surface } from "@/components/ui/primitives";

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

    const [activations, exceptions] = await Promise.all([
      tx.tenantActivation.findMany({ where: { status: "Active" } }),
      tx.syncException.findMany({ where: { resolvedAt: null }, take: 10 }),
    ]);

    return { permissions, activations, exceptions };
  });

  // Queue entries are supplied by the capabilities themselves. The workspace
  // does not know what an approval or a patrol is; it knows how to render "N
  // things are waiting on you" and where to send the user. A capability that
  // cannot count something real simply contributes nothing.
  const queues = workspaceContributionsFor({
    activeCapabilityIds: data.activations.map((a) => a.capabilityId),
    shell: "platform",
  });

  const counted = await Promise.all(
    queues.map(async (queue) => ({
      ...queue,
      value: await queue.count({
        tenantId: actor.tenantId,
        roleId: actor.roleId,
        userId: actor.userId,
      }),
    })),
  );
  const waiting = counted.filter((q) => q.value > 0);

  const nothingWaiting = waiting.length === 0 && data.exceptions.length === 0;

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
          {waiting.map((queue) => (
            <section key={queue.key}>
              <SectionHeading note={`${queue.value} item${queue.value === 1 ? "" : "s"}`}>
                {queue.label}
              </SectionHeading>
              <Surface className="p-5 flex items-center justify-between gap-4">
                <span className="text-[26px] font-light tabular tracking-[-0.02em]">{queue.value}</span>
                <Link href={queue.href} className="text-accent-ink no-underline hover:underline">
                  Open →
                </Link>
              </Surface>
            </section>
          ))}

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
