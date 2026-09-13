import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_TARGET } from "@/server/capabilities/outreach";
import { PageHeader, Panel, PermissionDenied, RowList, Row, EmptyState } from "@/components/ui/primitives";
import { TargetForm } from "./TargetForm";

export const dynamic = "force-dynamic";

/** Targets — master-context spec §11-12. Progress is a separate live query (see /outreach's funnel); this screen only sets and lists the target rows themselves. */
export default async function TargetsPage() {
  installCapabilities();
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_TARGET))) return null;
    const canCreate = await hasPermission(tx, actor.roleId, "Create", ENTITY_TARGET);

    const [teams, targets] = await Promise.all([
      tx.outreachTeam.findMany({ where: { active: true }, include: { memberships: true }, orderBy: { name: "asc" } }),
      tx.outreachTarget.findMany({ orderBy: { periodStart: "desc" }, take: 50 }),
    ]);

    const teamName = new Map(teams.map((t) => [t.id, t.name]));
    const memberPartyIds = teams.flatMap((t) => [t.leaderId, ...t.memberships.map((m) => m.partyId)]);
    const parties = memberPartyIds.length
      ? await tx.party.findMany({ where: { id: { in: [...new Set(memberPartyIds)] } } })
      : [];
    const partyName = new Map(parties.map((p) => [p.id, p.displayName]));

    return {
      canCreate,
      teams: teams.map((t) => ({ id: t.id, name: t.name })),
      members: [
        ...new Set(memberPartyIds),
      ].map((id) => ({ id, name: partyName.get(id) ?? "Unknown" })),
      targets: targets.map((t) => ({
        id: t.id,
        scope: t.scope,
        label:
          t.scope === "Team" && t.teamId
            ? teamName.get(t.teamId) ?? "—"
            : t.scope === "Individual" && t.partyId
              ? partyName.get(t.partyId) ?? "—"
              : "Company-wide",
        period: t.period,
        metric: t.metric,
        targetValue: t.targetValue,
        periodStart: t.periodStart.toISOString().slice(0, 10),
        periodEnd: t.periodEnd.toISOString().slice(0, 10),
      })),
    };
  });

  if (!data) return <PermissionDenied what="viewing targets" />;

  return (
    <>
      <PageHeader title="Targets" description="Company, team and individual targets — cascaded top-down (master-context spec §11)." />

      {data.canCreate && (
        <Panel title="Set a target" className="mb-6">
          <TargetForm teams={data.teams} members={data.members} />
        </Panel>
      )}

      <Panel title="Current targets" flush>
        {data.targets.length === 0 ? (
          <EmptyState title="No targets set" description="Set a company, team, or individual target above." />
        ) : (
          <RowList>
            {data.targets.map((t) => (
              <Row key={t.id}>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[14px] text-text">
                    {t.scope} · {t.label}
                  </span>
                  <span className="text-[12px] text-text-tertiary">
                    {t.metric.replace(/([A-Z])/g, " $1").trim()} · {t.period} · {t.periodStart} → {t.periodEnd}
                  </span>
                </span>
                <span className="tabular shrink-0 text-[14px] text-text">{t.targetValue}</span>
              </Row>
            ))}
          </RowList>
        )}
      </Panel>
    </>
  );
}
