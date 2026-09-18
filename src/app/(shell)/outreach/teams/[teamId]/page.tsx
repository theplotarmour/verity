import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_DIRECTION, ENTITY_LEAD, OUTREACH_CAPABILITY } from "@/server/capabilities/outreach";
import { withTenant } from "@/server/platform/tenancy";
import { withCapabilityPageAccess } from "@/components/ui/PageAccess";
import { EmptyState, PageHeader, PermissionDenied, Stat, StatRow } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";
const TERMINAL = ["not_a_fit", "unresponsive", "lost", "deferred", "disqualified", "closed_won"];

/** One team's transparent roster. Core may review any team; a Senior sees a
 * led team; an individual contributor can only see a team they belong to. */
async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  installCapabilities();
  const actor = await requireActor();
  const { teamId } = await params;
  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_LEAD))) return null;
    const [user, team, core] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: actor.userId } }),
      tx.outreachTeam.findUnique({ where: { id: teamId }, include: { memberships: { where: { active: true } } } }),
      hasPermission(tx, actor.roleId, "Create", ENTITY_DIRECTION),
    ]);
    if (!team || !team.active) return { missing: true as const };
    const memberIds = new Set([team.leaderId, ...(team.coLeaderId ? [team.coLeaderId] : []), ...team.memberships.map((m) => m.partyId)]);
    const canView = core || memberIds.has(user.partyId);
    if (!canView) return { denied: true as const };
    const [people, leads, activities] = await Promise.all([
      tx.party.findMany({ where: { id: { in: [...memberIds] } } }),
      tx.outreachLead.findMany({ where: { teamId } }),
      tx.outreachActivity.findMany({ where: { actorPartyId: { in: [...memberIds] } } }),
    ]);
    const now = new Date();
    return { team, members: people.sort((a, b) => a.displayName.localeCompare(b.displayName)).map((person) => {
      const owned = leads.filter((lead) => lead.opportunityOwnerId === person.id);
      return { id: person.id, name: person.displayName, role: person.id === team.leaderId ? "Team lead" : person.id === team.coLeaderId ? "Co-lead" : "Member", active: owned.filter((lead) => !TERMINAL.includes(lead.state)).length, overdue: owned.filter((lead) => lead.nextActionAt && lead.nextActionAt < now && !TERMINAL.includes(lead.state)).length, touches: activities.filter((activity) => activity.actorPartyId === person.id).length };
    }), active: leads.filter((lead) => !TERMINAL.includes(lead.state)).length, overdue: leads.filter((lead) => lead.nextActionAt && lead.nextActionAt < now && !TERMINAL.includes(lead.state)).length };
  });
  if (!data) return <PermissionDenied what="viewing this outreach team" />;
  if ("missing" in data) notFound();
  if ("denied" in data) return <PermissionDenied what="viewing this outreach team" />;
  return <><PageHeader title={data.team.name} description="People, ownership, and follow-up health for this outreach team." actions={<Link href="/outreach/teams" className="text-[13px] text-accent-ink no-underline hover:underline">All teams</Link>} />
    <StatRow cols={3} className="mb-6"><Stat label="Members" value={data.members.length} /><Stat label="Active prospects" value={data.active} /><Stat label="Overdue follow-ups" value={data.overdue} hint={data.overdue ? "Needs attention" : undefined} /></StatRow>
    {data.members.length === 0 ? <EmptyState title="No members" description="Add people to this team before assigning prospect work." /> : <div className="verity-solid overflow-hidden rounded-xl border border-line shadow-sm"><div className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] gap-3 border-b border-line px-5 py-3 text-[11px] uppercase tracking-wide text-text-tertiary"><span>Member</span><span className="text-right">Active</span><span className="text-right">Touches</span><span className="text-right">Overdue</span></div>{data.members.map((member) => <Link key={member.id} href={`/outreach/teams/${data.team.id}/members/${member.id}`} className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] gap-3 border-b border-line px-5 py-4 text-text no-underline transition last:border-none hover:bg-surface-sunken"><span><strong className="block text-[14px] font-medium">{member.name}</strong><small className="text-[12px] text-text-tertiary">{member.role}</small></span><span className="tabular text-right text-[14px]">{member.active}</span><span className="tabular text-right text-[14px]">{member.touches}</span><span className={`tabular text-right text-[14px] ${member.overdue ? "font-medium text-danger" : "text-text-secondary"}`}>{member.overdue}</span></Link>)}</div>}</>;
}
export default withCapabilityPageAccess(OUTREACH_CAPABILITY, TeamPage);
