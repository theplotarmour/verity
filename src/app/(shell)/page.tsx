import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { resolvePermissions } from "@/server/platform/authorization";
import {
  DefinitionList,
  DemoDataNotice,
  EmptyState,
  PageHeader,
  Panel,
  Row,
  RowList,
  Stat,
  StateBadge,
} from "@/components/ui/primitives";

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
        eyebrow={data.organization?.name ?? "Workspace"}
        title="Overview"
        description="The platform's current state in this organization — what is active, what is waiting, and what has happened recently."
      />

      {/*
        A band of real counts, not a KPI strip. Each is something the platform
        genuinely knows: rows it can count right now. There are no trends,
        targets or sparklines, because a comparison implies a series and the
        platform has no analytics layer to derive one from. Zero is shown as zero
        and means zero.
      */}
      <div className="mb-9 grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4">
        <Stat
          label="Awaiting your role"
          value={data.pendingApprovals}
          hint={data.pendingApprovals > 0 ? "Approvals need a decision" : "No approvals pending"}
          href={data.pendingApprovals > 0 ? "/approvals" : undefined}
        />
        <Stat
          label="Sync exceptions"
          value={data.openExceptions}
          hint={data.openExceptions > 0 ? "Unresolved conflicts" : "None unresolved"}
        />
        <Stat label="Capabilities" value={data.activations.length} hint="Active in this tenant" />
        <Stat
          label="Permissions"
          value={data.permissions.length}
          hint={actor.roleId ? "Effective grants" : "No role assigned"}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Recent activity" action={<span className="text-[12px] text-text-tertiary">Newest first</span>} flush>
          {data.recentEvents.length === 0 ? (
            <EmptyState
              title="Nothing has happened yet"
              description="Platform events appear here as commands run. An empty stream means this organization has not executed one."
            />
          ) : (
            <RowList>
              {data.recentEvents.map((event) => (
                <Row key={event.id}>
                  <span className="truncate font-mono text-[12.5px] text-text">{event.name}</span>
                  <time
                    dateTime={event.occurredAt.toISOString()}
                    className="tabular shrink-0 text-[12px] text-text-tertiary"
                  >
                    {event.occurredAt.toISOString().replace("T", " ").slice(0, 16)}
                  </time>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Operating context">
            <DefinitionList
              items={[
                { term: "Organization", value: data.organization?.name ?? "—" },
                {
                  term: "Role",
                  value: actor.roleId ? "Assigned" : "No role assigned — read access only",
                },
                { term: "Tenant", value: <span className="font-mono text-[12px]">{actor.tenantId.slice(0, 8)}…</span> },
              ]}
            />
          </Panel>

          <Panel title="Active capabilities" flush>
            <RowList>
              {data.activations.map((a) => (
                <Row key={a.capabilityId}>
                  <span className="text-[14px] text-text">{a.capability.name}</span>
                  <StateBadge category="Active" label={`v${a.pinnedVersion ?? a.capability.version}`} />
                </Row>
              ))}
            </RowList>
          </Panel>

          <DemoDataNotice />
        </div>
      </div>
    </>
  );
}
