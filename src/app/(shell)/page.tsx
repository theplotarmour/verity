import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { resolvePermissions } from "@/server/platform/authorization";
import { DefinitionList, DemoDataNotice, PageHeader, SectionHeading, StateBadge, Surface } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/**
 * Platform overview.
 *
 * §10 forbids invented KPIs, so every figure here is a count the platform can
 * actually produce. There are no trend arrows, no percentages against targets,
 * and no charts — a chart implies a series, and the platform has no analytics
 * layer to derive one from. When there is nothing meaningful to say, this page
 * says less rather than filling space.
 */
export default async function OverviewPage() {
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    const [organization, activations, permissions, recentEvents, pendingApprovals, openExceptions] =
      await Promise.all([
        tx.organization.findUnique({ where: { id: actor.organizationId } }),
        tx.tenantActivation.findMany({ where: { status: "Active" }, include: { capability: true } }),
        actor.roleId ? resolvePermissions(tx, actor.roleId) : Promise.resolve([]),
        tx.domainEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 8 }),
        tx.approvalStep.count({ where: { decision: "Pending", approverRoleId: actor.roleId ?? undefined } }),
        tx.syncException.count({ where: { resolvedAt: null } }),
      ]);

    return { organization, activations, permissions, recentEvents, pendingApprovals, openExceptions };
  });

  return (
    <>
      <PageHeader
        title="Overview"
        description="Current operating context and what the platform can actually tell you about it."
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-8">
          <section>
            <SectionHeading>Context</SectionHeading>
            <Surface className="p-5">
              <DefinitionList
                items={[
                  { term: "Organization", value: data.organization?.name ?? "—" },
                  {
                    term: "Role",
                    value: actor.roleId ? "Assigned" : "No role assigned — read access only",
                  },
                  { term: "Permissions", value: `${data.permissions.length} effective grants` },
                  { term: "Capabilities", value: `${data.activations.length} active` },
                ]}
              />
            </Surface>
          </section>

          <section>
            <SectionHeading note="Newest first">Recent activity</SectionHeading>
            <Surface className="p-1">
              {data.recentEvents.length === 0 ? (
                <p className="text-text-secondary px-4 py-6 m-0">
                  No platform events recorded in this organization yet.
                </p>
              ) : (
                <ul className="list-none m-0 p-0">
                  {data.recentEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-baseline justify-between gap-4 px-4 py-2.5 border-b border-line last:border-b-0"
                    >
                      <span className="font-mono text-[13px] text-text truncate">{event.name}</span>
                      <time
                        dateTime={event.occurredAt.toISOString()}
                        className="text-[13px] text-text-tertiary shrink-0 tabular"
                      >
                        {event.occurredAt.toISOString().replace("T", " ").slice(0, 16)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </section>
        </div>

        <div className="flex flex-col gap-8">
          <section>
            <SectionHeading>Needs attention</SectionHeading>
            <Surface className="p-5 flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-text-secondary">Approvals awaiting your role</span>
                <span className="text-[26px] font-light tabular tracking-[-0.02em]">{data.pendingApprovals}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-text-secondary">Unresolved sync exceptions</span>
                <span className="text-[26px] font-light tabular tracking-[-0.02em]">{data.openExceptions}</span>
              </div>
              {data.pendingApprovals > 0 && (
                <Link href="/approvals" className="text-accent-ink no-underline hover:underline">
                  Review approvals →
                </Link>
              )}
            </Surface>
          </section>

          <section>
            <SectionHeading>Active capabilities</SectionHeading>
            <Surface className="p-5">
              <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                {data.activations.map((a) => (
                  <li key={a.capabilityId} className="flex items-center justify-between gap-3">
                    <span className="text-text">{a.capability.name}</span>
                    <StateBadge category="Active" label={`v${a.pinnedVersion ?? a.capability.version}`} />
                  </li>
                ))}
              </ul>
            </Surface>
          </section>

          <DemoDataNotice />
        </div>
      </div>
    </>
  );
}
