import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import {
  ENTITY_LEAD,
  ENTITY_CONTACT,
  ENTITY_RESEARCH,
  ENTITY_TASK,
  ENTITY_MEETING,
  assertTeamScopeAllowed,
  deriveLeadHealth,
} from "@/server/capabilities/outreach";
import { ForbiddenError } from "@/server/platform/authorization";
import {
  Badge,
  DefinitionList,
  EmptyState,
  PageHeader,
  Panel,
  PermissionDenied,
  Row,
  RowList,
  Stat,
  StatRow,
  StateBadge,
  HealthBadge,
} from "@/components/ui/primitives";
import { LeadActions } from "./LeadActions";
import { ContactForm } from "./ContactForm";
import { ResearchForm, ViewFileLink } from "./ResearchForm";
import { TaskPanel } from "./TaskPanel";
import { MeetingPanel } from "./MeetingPanel";

export const dynamic = "force-dynamic";

const TERMINAL_STATES = ["not_a_fit", "unresponsive", "lost", "deferred", "disqualified"];

/**
 * Lead detail — the chain handbook Ch. 02/master-context §112 asks for:
 * which company, who owns it, what was said, what happened, what's next.
 */
export default async function OutreachLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  installCapabilities();
  const { id } = await params;
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_LEAD))) return { denied: true as const };

    const lead = await tx.outreachLead.findUnique({ where: { id } });
    if (!lead) return { notFound: true as const };

    // Phase 3 fix (taskplan 105): fetching by raw id bypasses any team
    // filter a list view applies — this is the more direct version of the
    // recorded gap (a Senior opening another team's lead straight by URL),
    // so it's checked here independently of the list page's own check.
    try {
      await assertTeamScopeAllowed(tx, actor.userId, lead.teamId);
    } catch (error) {
      if (error instanceof ForbiddenError) return { denied: true as const };
      throw error;
    }

    const [
      states,
      transitions,
      activities,
      team,
      canEdit,
      canLog,
      contacts,
      canCreateContact,
      researchEntries,
      canCreateResearch,
      tasks,
      canCreateTask,
      meetings,
      canCreateMeeting,
    ] = await Promise.all([
      tx.stateDefinition.findMany({ where: { entityKey: ENTITY_LEAD } }),
      (async () => {
        const current = await tx.stateDefinition.findUnique({
          where: { entityKey_key: { entityKey: ENTITY_LEAD, key: lead.state } },
        });
        if (!current) return [];
        return tx.transitionDefinition.findMany({ where: { entityKey: ENTITY_LEAD, fromStateId: current.id } });
      })(),
      tx.outreachActivity.findMany({ where: { leadId: id }, orderBy: { occurredAt: "desc" } }),
      tx.outreachTeam.findUnique({ where: { id: lead.teamId }, include: { memberships: { where: { active: true } } } }),
      hasPermission(tx, actor.roleId, "Edit", ENTITY_LEAD),
      hasPermission(tx, actor.roleId, "Create", "verity.outreach.activity"),
      tx.outreachContact.findMany({ where: { leadId: id }, orderBy: { createdAt: "asc" } }),
      hasPermission(tx, actor.roleId, "Create", ENTITY_CONTACT),
      tx.outreachResearchEntry.findMany({ where: { leadId: id }, orderBy: { createdAt: "desc" } }),
      hasPermission(tx, actor.roleId, "Create", ENTITY_RESEARCH),
      tx.outreachTask.findMany({ where: { leadId: id }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }] }),
      hasPermission(tx, actor.roleId, "Create", ENTITY_TASK),
      tx.outreachMeeting.findMany({ where: { leadId: id }, orderBy: { scheduledAt: "asc" } }),
      hasPermission(tx, actor.roleId, "Create", ENTITY_MEETING),
    ]);

    const stateById = new Map(states.map((s) => [s.id, s]));
    const category = new Map(states.map((s) => [s.key, s.category]));

    const teamMemberPartyIds = team
      ? [team.leaderId, ...(team.coLeaderId ? [team.coLeaderId] : []), ...team.memberships.map((m) => m.partyId)]
      : [];
    const partyIds = [
      ...new Set([
        lead.leadOriginatorId,
        lead.opportunityOwnerId,
        ...(lead.closerId ? [lead.closerId] : []),
        ...activities.map((a) => a.actorPartyId),
        ...teamMemberPartyIds,
      ]),
    ];
    const parties = partyIds.length ? await tx.party.findMany({ where: { id: { in: partyIds } } }) : [];
    const partyName = new Map(parties.map((p) => [p.id, p.displayName]));

    return {
      lead,
      category: category.get(lead.state) ?? "Draft",
      isTerminal: TERMINAL_STATES.includes(lead.state) || lead.state === "closed_won",
      transitions: transitions.map((t) => stateById.get(t.toStateId)!).filter(Boolean),
      activities,
      teamName: team?.name ?? "—",
      teamMembers: teamMemberPartyIds.map((pid) => ({ id: pid, name: partyName.get(pid) ?? "Unknown" })),
      partyName,
      canEdit,
      canLog,
      contacts,
      canCreateContact,
      researchEntries,
      canCreateResearch,
      tasks,
      canCreateTask,
      meetings,
      canCreateMeeting,
    };
  });

  if ("denied" in data) return <PermissionDenied what="viewing this lead" />;
  if ("notFound" in data) notFound();

  const { lead } = data;
  const overdue = lead.nextActionAt != null && lead.nextActionAt < new Date() && !data.isTerminal;
  const health = deriveLeadHealth({
    category: data.category,
    lastActivityAt: lead.lastActivityAt,
    nextActionAt: lead.nextActionAt,
    createdAt: lead.createdAt,
  });

  return (
    <>
      <PageHeader
        title={lead.companyName}
        description={lead.whyRelevant ?? "No research recorded yet."}
        actions={
          <LeadActions
            leadId={lead.id}
            transitions={data.transitions.map((s) => ({ key: s.key, category: s.category }))}
            canEdit={data.canEdit}
            canLog={data.canLog}
            isTerminal={data.isTerminal}
            advanceThresholdMinor={lead.advanceThresholdMinor}
            advanceReceivedMinor={lead.advanceReceivedMinor}
            teamMembers={data.teamMembers}
            currentOwnerId={lead.opportunityOwnerId}
            isEscalated={lead.escalated}
          />
        }
      />

      <StatRow className="mb-6">
        <div className="flex flex-col px-5 py-4">
          <span className="flex h-[26px] items-center text-[15px]">
            <StateBadge category={data.category} label={lead.state.replace(/_/g, " ")} />
          </span>
          <span className="mt-2 text-[12px] leading-[1.3] text-text-tertiary">Stage</span>
        </div>
        <div className="flex flex-col px-5 py-4">
          <span className="flex h-[26px] items-center text-[15px]">
            <HealthBadge health={health} />
          </span>
          <span className="mt-2 text-[12px] leading-[1.3] text-text-tertiary">Health</span>
        </div>
        <Stat label="Team" value={data.teamName} />
        <Stat
          label="Next action"
          value={lead.nextActionAt ? lead.nextActionAt.toISOString().slice(0, 10) : "None set"}
          hint={overdue ? "Overdue" : undefined}
        />
      </StatRow>

      <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Identity">
            <DefinitionList
              items={[
                { term: "Track", value: lead.track },
                { term: "Website", value: lead.website ?? "—" },
                { term: "Industry", value: lead.industry ?? "—" },
                { term: "Location", value: lead.location ?? "—" },
                { term: "Contact", value: lead.contactName ?? "—" },
                { term: "Designation", value: lead.contactDesignation ?? "—" },
                { term: "Email", value: lead.contactEmail ?? "—" },
                { term: "Phone", value: lead.contactPhone ?? "—" },
                {
                  term: "LinkedIn",
                  value: lead.linkedinUrl ? (
                    <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="text-accent-ink no-underline hover:underline">
                      {lead.linkedinUrl}
                    </a>
                  ) : (
                    "—"
                  ),
                },
              ]}
            />
          </Panel>

          <Panel title="Qualification">
            <DefinitionList
              items={[
                { term: "What they do", value: lead.whatTheyDo ?? "—" },
                { term: "Potential need", value: lead.potentialNeed ?? "—" },
                { term: "Sales hypothesis", value: lead.salesHypothesis ?? "—" },
                { term: "Fit score", value: lead.qualityScore != null ? `${lead.qualityScore} / 10` : "—" },
              ]}
            />
          </Panel>

          <Panel title="Research">
            {data.researchEntries.length === 0 ? (
              <p className="text-[13px] text-text-tertiary">No research recorded yet.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {data.researchEntries.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1 border-b border-line pb-3 last:border-none last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px] text-text">{r.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge>{r.type}</Badge>
                        <span className="text-[11px] text-text-tertiary">
                          {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                        </span>
                      </span>
                    </div>
                    {r.content && <p className="m-0 text-[13px] text-text-secondary">{r.content}</p>}
                    {r.sourceUrl && (
                      <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-[12px] text-accent-ink no-underline hover:underline">
                        {r.sourceUrl}
                      </a>
                    )}
                    {r.fileId && <ViewFileLink entryId={r.id} />}
                  </li>
                ))}
              </ul>
            )}
            {data.canCreateResearch && (
              <div className="mt-4">
                <ResearchForm leadId={lead.id} />
              </div>
            )}
          </Panel>

          <Panel title="Contacts">
            {data.contacts.length === 0 ? (
              <p className="text-[13px] text-text-tertiary">No contacts added yet.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {data.contacts.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1 border-b border-line pb-3 last:border-none last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[14px] text-text">{c.fullName}</span>
                      {c.classification !== "Unknown" && (
                        <Badge>{c.classification.replace(/([A-Z])/g, " $1").trim()}</Badge>
                      )}
                    </div>
                    {(c.designation || c.department) && (
                      <span className="text-[12px] text-text-secondary">
                        {[c.designation, c.department].filter(Boolean).join(" · ")}
                      </span>
                    )}
                    <span className="text-[12px] text-text-tertiary">
                      {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact details on file"}
                    </span>
                    {c.linkedinUrl && (
                      <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="text-[12px] text-accent-ink no-underline hover:underline">
                        {c.linkedinUrl}
                      </a>
                    )}
                    {c.notes && <span className="text-[12px] text-text-tertiary">{c.notes}</span>}
                  </li>
                ))}
              </ul>
            )}
            {data.canCreateContact && (
              <div className="mt-4">
                <ContactForm leadId={lead.id} />
              </div>
            )}
          </Panel>

          <Panel title="Attribution">
            <DefinitionList
              items={[
                { term: "Lead originator", value: data.partyName.get(lead.leadOriginatorId) ?? "—" },
                { term: "Opportunity owner", value: data.partyName.get(lead.opportunityOwnerId) ?? "—" },
                { term: "Closer", value: lead.closerId ? data.partyName.get(lead.closerId) ?? "—" : "—" },
                {
                  term: "Advance received",
                  value: `${(lead.advanceReceivedMinor / 100).toFixed(2)} / ${
                    lead.advanceThresholdMinor != null ? (lead.advanceThresholdMinor / 100).toFixed(2) : "no threshold set"
                  }`,
                },
                ...(lead.rejectionReason
                  ? [
                      {
                        term: "Rejection reason",
                        value: <Badge>{lead.rejectionReason.replace(/([A-Z])/g, " $1").trim()}</Badge>,
                      },
                    ]
                  : []),
              ]}
            />
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Timeline" flush>
            {data.activities.length === 0 ? (
              <EmptyState
                title="No activity logged"
                description="Nothing has been recorded against this lead yet. Field rule: if it isn't recorded, it didn't happen."
              />
            ) : (
              <RowList>
                {data.activities.map((a) => (
                  <Row key={a.id}>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[14px] text-text">
                        {a.activityType.replace(/([A-Z])/g, " $1").trim()} · {a.channel}
                      </span>
                      {a.message && <span className="text-[12px] text-text-secondary">{a.message}</span>}
                      {a.response && <span className="text-[12px] text-text-tertiary">Response: {a.response}</span>}
                      <span className="text-[11px] text-text-tertiary">{data.partyName.get(a.actorPartyId) ?? "—"}</span>
                    </span>
                    <span className="tabular shrink-0 text-[12px] text-text-tertiary">
                      {a.occurredAt.toISOString().slice(0, 16).replace("T", " ")}
                    </span>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>

          <TaskPanel
            leadId={lead.id}
            teamId={lead.teamId}
            tasks={data.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              priority: t.priority,
              status: t.status,
              origin: t.origin,
              dueAt: t.dueAt ? t.dueAt.toISOString() : null,
              assignedToPartyId: t.assignedToPartyId,
            }))}
            teamMembers={data.teamMembers}
            partyName={data.partyName}
            canCreate={data.canCreateTask}
          />

          <MeetingPanel
            leadId={lead.id}
            meetings={data.meetings.map((m) => ({
              id: m.id,
              scheduledAt: m.scheduledAt.toISOString(),
              purpose: m.purpose,
              locationOrUrl: m.locationOrUrl,
              status: m.status,
              outcomeNotes: m.outcomeNotes,
            }))}
            canCreate={data.canCreateMeeting}
          />
        </div>
      </div>
    </>
  );
}
