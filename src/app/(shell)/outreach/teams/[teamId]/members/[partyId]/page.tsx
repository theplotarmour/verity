import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_DIRECTION, ENTITY_LEAD, OUTREACH_CAPABILITY } from "@/server/capabilities/outreach";
import { withTenant } from "@/server/platform/tenancy";
import { withCapabilityPageAccess } from "@/components/ui/PageAccess";
import { EmptyState, PageHeader, PermissionDenied, StateBadge } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";
const TERMINAL = ["not_a_fit", "unresponsive", "lost", "deferred", "disqualified", "closed_won"];

/** A member's operational record, not an HR profile: owned prospects,
 * follow-up state, and history needed by a leader to unblock the work. */
async function MemberPage({ params }: { params: Promise<{ teamId: string; partyId: string }> }) {
  installCapabilities();
  const actor = await requireActor();
  const { teamId, partyId } = await params;
  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_LEAD))) return null;
    const [user, team, core] = await Promise.all([tx.user.findUniqueOrThrow({ where: { id: actor.userId } }), tx.outreachTeam.findUnique({ where: { id: teamId }, include: { memberships: { where: { active: true } } } }), hasPermission(tx, actor.roleId, "Create", ENTITY_DIRECTION)]);
    if (!team || !team.active) return { missing: true as const };
    const memberIds = new Set([team.leaderId, ...(team.coLeaderId ? [team.coLeaderId] : []), ...team.memberships.map((m) => m.partyId)]);
    if (!memberIds.has(partyId)) return { missing: true as const };
    if (!core && !memberIds.has(user.partyId)) return { denied: true as const };
    const [person, leads, states] = await Promise.all([tx.party.findUnique({ where: { id: partyId } }), tx.outreachLead.findMany({ where: { teamId, opportunityOwnerId: partyId }, orderBy: { updatedAt: "desc" } }), tx.stateDefinition.findMany({ where: { entityKey: ENTITY_LEAD } })]);
    if (!person) return { missing: true as const };
    const category = new Map(states.map((state) => [state.key, state.category]));
    const now = new Date();
    return { team, person, leads: leads.map((lead) => ({ id: lead.id, company: lead.companyName, state: lead.state.replace(/_/g, " "), category: category.get(lead.state) ?? "Draft", next: lead.nextActionNote, overdue: lead.nextActionAt && lead.nextActionAt < now && !TERMINAL.includes(lead.state) })), active: leads.filter((lead) => !TERMINAL.includes(lead.state)).length };
  });
  if (!data) return <PermissionDenied what="viewing this member" />;
  if ("missing" in data) notFound();
  if ("denied" in data) return <PermissionDenied what="viewing this member" />;
  return <><PageHeader title={data.person.displayName} description={`${data.active} active prospect${data.active === 1 ? "" : "s"} in ${data.team.name}.`} actions={<Link href={`/outreach/teams/${data.team.id}`} className="text-[13px] text-accent-ink no-underline hover:underline">Back to team</Link>} />
    {data.leads.length === 0 ? <EmptyState title="No assigned prospects" description="This member has no prospect work assigned yet." /> : <div className="verity-solid overflow-hidden rounded-xl border border-line shadow-sm">{data.leads.map((lead) => <Link key={lead.id} href={`/outreach/${lead.id}`} className="flex items-center gap-4 border-b border-line px-5 py-4 text-text no-underline transition last:border-none hover:bg-surface-sunken"><span className="min-w-0 flex-1"><strong className="block truncate text-[14px] font-medium">{lead.company}</strong><small className={lead.overdue ? "text-danger" : "text-text-tertiary"}>{lead.next ?? "No next action set"}</small></span><StateBadge category={lead.category} label={lead.state} /></Link>)}</div>}</>;
}
export default withCapabilityPageAccess(OUTREACH_CAPABILITY, MemberPage);
