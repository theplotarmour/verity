import Link from "next/link";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_DIRECTION, ENTITY_LEAD, assertTeamScopeAllowed } from "@/server/capabilities/outreach";
import { ForbiddenError } from "@/server/platform/authorization";
import { DataTable } from "@/components/ui/DataTable";
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  PermissionDenied,
  Stat,
  StatRow,
} from "@/components/ui/primitives";
import { NewLeadForm } from "./NewLeadForm";
import { DirectionForm } from "./DirectionForm";

export const dynamic = "force-dynamic";

const TERMINAL_STATES = ["not_a_fit", "unresponsive", "lost", "deferred", "disqualified"];

type LeadRow = Record<string, unknown> & {
  id: string;
  companyName: string;
  team: string;
  owner: string;
  track: string;
  state: string;
  category: string;
};

/**
 * PA-OMS overview — one shared lead/activity/pipeline database, one screen
 * (master-context spec §3, §100). Team- and role-specific workspaces (Junior
 * "My Workspace", Senior "Team Command") are a later slice; this is the
 * Company-Core-shaped read that proves the data end to end first.
 */
export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; state?: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const filters = await searchParams;

  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_LEAD))) return null;

    // Phase 3 fix (taskplan 105): a Senior may only view a `?team=` scope
    // they actually lead — see `assertTeamScopeAllowed`'s own doc comment
    // for why this is structural (leader-of-record), not a role-name check.
    try {
      await assertTeamScopeAllowed(tx, actor.userId, filters.team);
    } catch (error) {
      if (error instanceof ForbiddenError) return "forbidden" as const;
      throw error;
    }

    const [teams, leads, states, canCreate, canPostDirection, currentDirection] = await Promise.all([
      tx.outreachTeam.findMany({
        where: { active: true },
        include: { _count: { select: { memberships: true } }, memberships: { where: { active: true } } },
        orderBy: { name: "asc" },
      }),
      tx.outreachLead.findMany({
        where: {
          ...(filters.team ? { teamId: filters.team } : {}),
          ...(filters.state ? { state: filters.state } : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      tx.stateDefinition.findMany({ where: { entityKey: ENTITY_LEAD }, orderBy: { key: "asc" } }),
      hasPermission(tx, actor.roleId, "Create", ENTITY_LEAD),
      hasPermission(tx, actor.roleId, "Create", ENTITY_DIRECTION),
      tx.outreachDirection.findFirst({ where: { status: "Active" }, orderBy: { postedAt: "desc" } }),
    ]);

    // Attention/exceptions (master-context spec §9) and Company Direction
    // (spec §10) are company-wide reads — only meaningful, and only shown,
    // when nobody's narrowed the view to one team. `canPostDirection`
    // (Founder-only, per the permission grant) doubles as this screen's
    // signal for "this is the Company Core view," same idea as
    // `assertTeamScopeAllowed`'s structural-not-role-name approach.
    let exceptions: Array<{ kind: string; message: string }> = [];
    if (!filters.team && canPostDirection) {
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const [overdueCount, noNextActionCount, checkIns] = await Promise.all([
        tx.outreachLead.count({
          where: { state: { notIn: [...TERMINAL_STATES, "closed_won"] }, nextActionAt: { lt: new Date() } },
        }),
        tx.outreachLead.count({
          where: { state: { notIn: [...TERMINAL_STATES, "closed_won"] }, nextActionAt: null },
        }),
        tx.outreachCheckIn.findMany({ where: { checkInDate: { gte: dayStart } } }),
      ]);
      if (overdueCount > 0) exceptions.push({ kind: "follow_up_overdue", message: `${overdueCount} follow-up${overdueCount === 1 ? "" : "s"} overdue.` });
      if (noNextActionCount > 0)
        exceptions.push({ kind: "no_next_action", message: `${noNextActionCount} active lead${noNextActionCount === 1 ? "" : "s"} with no next action set.` });
      const checkedIn = new Set(checkIns.map((c) => c.partyId));
      for (const team of teams) {
        const memberIds = team.memberships.map((m) => m.partyId);
        const missing = memberIds.filter((id) => !checkedIn.has(id));
        if (missing.length > 0)
          exceptions.push({ kind: "missing_check_in", message: `${team.name}: ${missing.length} of ${memberIds.length} haven't checked in today.` });
      }
    }

    const category = new Map(states.map((s) => [s.key, s.category]));
    const teamName = new Map(teams.map((t) => [t.id, t.name]));

    // Every team member plus every team's leader — either can be an
    // Opportunity Owner (master-context §16: Senior "help move opportunities
    // forward" too), and every current lead owner even if now inactive.
    const memberPartyIds = teams.flatMap((t) => [t.leaderId, ...t.memberships.map((m) => m.partyId)]);
    const ownerIds = [...new Set([...memberPartyIds, ...leads.map((l) => l.opportunityOwnerId)])];
    const owners = ownerIds.length ? await tx.party.findMany({ where: { id: { in: ownerIds } } }) : [];
    const ownerName = new Map(owners.map((p) => [p.id, p.displayName]));

    const members = teams.flatMap((t) => [
      { id: t.leaderId, name: ownerName.get(t.leaderId) ?? "Unknown", teamId: t.id },
      ...t.memberships.map((m) => ({ id: m.partyId, name: ownerName.get(m.partyId) ?? "Unknown", teamId: t.id })),
    ]);

    const rows: LeadRow[] = leads.map((l) => ({
      id: l.id,
      companyName: l.companyName,
      team: teamName.get(l.teamId) ?? "—",
      owner: ownerName.get(l.opportunityOwnerId) ?? "—",
      track: l.track,
      state: l.state.replace(/_/g, " "),
      category: category.get(l.state) ?? "Draft",
    }));

    const funnel = states
      .filter((s) => !TERMINAL_STATES.includes(s.key) && s.key !== "closed_won")
      .map((s) => ({
        key: s.key,
        label: s.key.replace(/_/g, " "),
        count: leads.filter((l) => l.state === s.key).length,
      }));

    return {
      teams: teams.map((t) => ({ id: t.id, name: t.name, members: t._count.memberships })),
      members,
      rows,
      funnel,
      totalLeads: leads.length,
      activeLeads: leads.filter((l) => !TERMINAL_STATES.includes(l.state) && l.state !== "closed_won").length,
      closedWon: leads.filter((l) => l.state === "closed_won").length,
      overdue: leads.filter(
        (l) => l.nextActionAt != null && l.nextActionAt < new Date() && !TERMINAL_STATES.includes(l.state) && l.state !== "closed_won",
      ).length,
      canCreate,
      canPostDirection,
      currentDirection,
      exceptions,
    };
  });

  if (!data) return <PermissionDenied what="reading the outreach pipeline" />;
  if (data === "forbidden") return <PermissionDenied what="viewing another team's pipeline" />;

  return (
    <>
      <PageHeader
        title="Outreach"
        description="PlotArmour's client-acquisition pipeline — one lead database, one activity history, one pipeline. Company Core view."
      />

      {/* Operations Room framing (spec §105): the company's own direction is
          the first thing on the screen, drawn as a directive banner — not a
          panel among panels — because everything below exists to execute
          against it. Accent-tinted per ADR-011/012's existing token, never a
          new color. */}
      {data.canPostDirection && (
        <div
          className={
            data.currentDirection
              ? "mb-6 rounded-xl border border-accent-line bg-accent-subtle px-6 py-5"
              : "mb-6 rounded-xl border border-line bg-surface px-6 py-5"
          }
        >
          {data.currentDirection ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="m-0 text-[11px] uppercase tracking-wide text-text-tertiary">
                    Current direction · {data.currentDirection.weekLabel}
                  </p>
                  <p className="m-0 mt-1 text-[18px] font-light text-text">
                    {data.currentDirection.priorityVertical ?? "No priority vertical set"}
                  </p>
                </div>
                <Badge tone="accent">{data.currentDirection.primaryTrack}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                {data.currentDirection.companyProspectingTarget != null && (
                  <span className="text-[13px] text-text-secondary">
                    Target: <b className="text-text">{data.currentDirection.companyProspectingTarget}</b> qualified businesses
                  </span>
                )}
                {data.currentDirection.strategicNote && (
                  <span className="text-[13px] text-text-tertiary">{data.currentDirection.strategicNote}</span>
                )}
              </div>
              <div className="mt-4">
                <DirectionForm />
              </div>
            </>
          ) : (
            <>
              <p className="m-0 text-[15px] text-text">No direction posted for this week.</p>
              <p className="m-0 mt-1 text-[13px] text-text-tertiary">
                Post this week's priority — it's the first thing every team sees.
              </p>
              <div className="mt-4">
                <DirectionForm />
              </div>
            </>
          )}
        </div>
      )}

      <StatRow cols={4} className="mb-6">
        <Stat label="Teams" value={data.teams.length} />
        <Stat label="Active leads" value={data.activeLeads} />
        <Stat label="Closed Won" value={data.closedWon} />
        <Stat label="Follow-ups overdue" value={data.overdue} />
      </StatRow>

      {data.canPostDirection && (
        <div className="mb-6">
          <Panel title="Needs attention" flush>
            {data.exceptions.length === 0 ? (
              <EmptyState title="Nothing waiting" description="No exceptions right now — records appear here as they occur." compact />
            ) : (
              <div className="flex flex-col divide-y divide-line px-6">
                {data.exceptions.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <Badge>{e.kind.replace(/_/g, " ")}</Badge>
                    <span className="text-[13px] text-text">{e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Panel title="Teams" flush>
          <div className="flex flex-col divide-y divide-line px-6">
            {data.teams.map((t) => (
              <Link
                key={t.id}
                href={`/outreach?team=${t.id}`}
                className="flex items-center justify-between py-3 text-text no-underline hover:text-accent-ink"
              >
                <span className="text-[14px]">{t.name}</span>
                <span className="text-[12px] text-text-tertiary">{t.members} members</span>
              </Link>
            ))}
            {filters.team && (
              <Link href="/outreach" className="py-3 text-[12px] text-text-tertiary no-underline hover:text-accent-ink">
                Clear team filter
              </Link>
            )}
          </div>
        </Panel>

        <Panel title="Funnel" flush>
          <div className="flex flex-col divide-y divide-line px-6">
            {data.funnel.map((f) => (
              <Link
                key={f.key}
                href={`/outreach?state=${f.key}${filters.team ? `&team=${filters.team}` : ""}`}
                className="flex items-center justify-between py-2.5 text-text no-underline hover:text-accent-ink"
              >
                <span className="text-[13px] capitalize">{f.label}</span>
                <span className="tabular text-[13px] text-text-secondary">{f.count}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {data.canCreate && (
        <NewLeadForm teams={data.teams} members={data.members} defaultTeamId={filters.team} />
      )}

      <div className="mt-6">
        <DataTable
          caption={filters.state ? `Leads — ${filters.state.replace(/_/g, " ")}` : "Leads"}
          rows={data.rows}
          columns={[
            { key: "companyName", header: "Company", variant: "link", href: "/outreach/{id}", subKey: "track" },
            { key: "team", header: "Team" },
            { key: "owner", header: "Owner" },
            { key: "state", header: "Stage", variant: "state", categoryKey: "category" },
          ]}
          emptyTitle="No leads yet"
          emptyDescription="A lead is a researched prospect company with a stated reason it's relevant. None exists in this scope yet."
        />
      </div>
    </>
  );
}
