import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_LEAD } from "@/server/capabilities/outreach";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState, PageHeader, Panel, PermissionDenied, Stat, StatRow } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

const TERMINAL_STATES = ["not_a_fit", "unresponsive", "lost", "deferred", "disqualified"];

/**
 * "Team Command" — the Senior Outreach Officer's cockpit (master-context
 * spec §13-16, §102, §106). Shows exactly this Senior's own led team(s) —
 * never another team's, per taskplan 105's Phase 3 fix — target, people,
 * pipeline, exceptions.
 */
export default async function TeamCommandPage() {
  installCapabilities();
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_LEAD))) return null;

    const user = await tx.user.findUniqueOrThrow({ where: { id: actor.userId } });
    const ledTeams = await tx.outreachTeam.findMany({
      where: { leaderId: user.partyId, active: true },
      include: { memberships: { where: { active: true } } },
    });
    if (ledTeams.length === 0) return { noTeam: true as const };

    // Senior leads exactly one team in this roster; if a future tenant gives
    // one Senior multiple teams, this takes the first — a picker is a real
    // gap, not silently handled.
    const team = ledTeams[0]!;
    const memberPartyIds = team.memberships.map((m) => m.partyId);
    const [members, leads, states] = await Promise.all([
      tx.party.findMany({ where: { id: { in: memberPartyIds } } }),
      tx.outreachLead.findMany({ where: { teamId: team.id } }),
      tx.stateDefinition.findMany({ where: { entityKey: ENTITY_LEAD } }),
    ]);
    const memberName = new Map(members.map((p) => [p.id, p.displayName]));
    const category = new Map(states.map((s) => [s.key, s.category]));

    const activities = await tx.outreachActivity.findMany({
      where: { actorPartyId: { in: memberPartyIds } },
    });

    const memberRows = memberPartyIds.map((partyId) => {
      const ownedLeads = leads.filter((l) => l.opportunityOwnerId === partyId);
      const acts = activities.filter((a) => a.actorPartyId === partyId);
      return {
        id: partyId,
        name: memberName.get(partyId) ?? "Unknown",
        leads: ownedLeads.length,
        outreach: acts.filter((a) => a.activityType === "FirstOutreach").length,
        closed: ownedLeads.filter((l) => l.state === "closed_won").length,
        overdue: ownedLeads.filter(
          (l) => l.nextActionAt != null && l.nextActionAt < new Date() && !TERMINAL_STATES.includes(l.state) && l.state !== "closed_won",
        ).length,
      };
    });

    const overdueLeads = leads.filter(
      (l) => l.nextActionAt != null && l.nextActionAt < new Date() && !TERMINAL_STATES.includes(l.state) && l.state !== "closed_won",
    );

    return {
      noTeam: false as const,
      teamName: team.name,
      memberCount: memberPartyIds.length,
      activeLeads: leads.filter((l) => !TERMINAL_STATES.includes(l.state) && l.state !== "closed_won").length,
      closedWon: leads.filter((l) => l.state === "closed_won").length,
      overdue: overdueLeads.map((l) => ({
        id: l.id,
        companyName: l.companyName,
        state: l.state.replace(/_/g, " "),
        category: category.get(l.state) ?? "Draft",
      })),
      memberRows,
    };
  });

  if (!data) return <PermissionDenied what="viewing team command" />;
  if (data.noTeam) {
    return (
      <>
        <PageHeader title="Team Command" description="Only shown to Seniors who lead a team." />
        <EmptyState title="You don't lead a team" description="This view is for a team's Senior Outreach Officer." />
      </>
    );
  }

  const weekOf = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" });

  return (
    <>
      {/* Cockpit framing: team name is the identity, week is the operating
          window — a manager's console reads as "right now, my team," not a
          generic page title (contrast Company Core's "Outreach" masthead). */}
      <header className="mb-6">
        <p className="m-0 text-[12px] uppercase tracking-wide text-text-tertiary">Week of {weekOf}</p>
        <h1 className="mt-1">{data.teamName}</h1>
        <p className="mb-0 mt-2 max-w-[62ch] text-[14px] text-text-secondary">
          Is my team executing the company direction effectively?
        </p>
      </header>

      <StatRow cols={4} className="mb-6">
        <Stat label="Members" value={data.memberCount} />
        <Stat label="Active leads" value={data.activeLeads} />
        <Stat label="Closed Won" value={data.closedWon} />
        <Stat label="Overdue" value={data.overdue.length} hint={data.overdue.length > 0 ? "Needs attention" : undefined} />
      </StatRow>

      <div className="mb-6">
        <Panel title="Member performance" flush>
          <div className="flex flex-col divide-y divide-line px-6">
            <div className="flex items-center gap-4 py-2 text-[11px] uppercase tracking-wide text-text-tertiary">
              <span className="w-3" />
              <span className="flex-1">Member</span>
              <span className="w-16 text-right">Leads</span>
              <span className="w-20 text-right">Outreach</span>
              <span className="w-16 text-right">Closed</span>
              <span className="w-16 text-right">Overdue</span>
            </div>
            {data.memberRows.map((m) => {
              // Status dot, cockpit-instrument style: 0 overdue reads Active
              // (success), 1-2 reads a caution, 3+ reads a real problem —
              // computed from data the Senior already sees, not a new metric.
              const dotClass = m.overdue === 0 ? "bg-success" : m.overdue <= 2 ? "bg-warning" : "bg-danger";
              return (
                <div key={m.id} className="flex items-center gap-4 py-2.5">
                  <span aria-hidden="true" className={`size-[7px] shrink-0 rounded-full ${dotClass}`} />
                  <span className="flex-1 text-[14px] text-text">{m.name}</span>
                  <span className="tabular w-16 text-right text-[13px] text-text-secondary">{m.leads}</span>
                  <span className="tabular w-20 text-right text-[13px] text-text-secondary">{m.outreach}</span>
                  <span className="tabular w-16 text-right text-[13px] text-text-secondary">{m.closed}</span>
                  <span className={`tabular w-16 text-right text-[13px] ${m.overdue > 0 ? "text-danger" : "text-text-secondary"}`}>
                    {m.overdue}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* An alert strip, not a plain panel, when there's something the
          Senior needs to act on — the cockpit's own "master caution" idea,
          drawn with the same warning/danger tokens as everywhere else. */}
      <div
        className={
          data.overdue.length > 0
            ? "rounded-xl border border-danger/25 bg-danger-subtle"
            : "rounded-xl border border-line bg-surface"
        }
      >
        <Panel title="Overdue follow-ups" flush className="border-none bg-transparent">
          {data.overdue.length === 0 ? (
            <EmptyState title="Nothing overdue" description="Every active lead in this team has a current next action." compact />
          ) : (
            <DataTable
              caption="Overdue"
              rows={data.overdue}
              columns={[
                { key: "companyName", header: "Company", variant: "link", href: "/outreach/{id}" },
                { key: "state", header: "Stage", variant: "state", categoryKey: "category" },
              ]}
              emptyTitle="Nothing overdue"
            />
          )}
        </Panel>
      </div>
    </>
  );
}
