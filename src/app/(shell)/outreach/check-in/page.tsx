import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_CHECK_IN } from "@/server/capabilities/outreach";
import { PageHeader, Panel, PermissionDenied, RowList, Row, EmptyState, Stat, StatRow } from "@/components/ui/primitives";
import { CheckInForm } from "./CheckInForm";

export const dynamic = "force-dynamic";

/**
 * Daily check-in (master-context spec §20-23). Numeric activity is a live
 * query, never hand-typed — spec §21's own automatic-vs-manual split.
 */
export default async function CheckInPage() {
  installCapabilities();
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Create", ENTITY_CHECK_IN))) return null;

    const user = await tx.user.findUniqueOrThrow({ where: { id: actor.userId } });
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const [leadsCreated, activities, recentCheckIns, alreadySubmittedToday] = await Promise.all([
      tx.outreachLead.count({ where: { leadOriginatorId: user.partyId, createdAt: { gte: dayStart, lt: dayEnd } } }),
      tx.outreachActivity.findMany({ where: { actorPartyId: user.partyId, occurredAt: { gte: dayStart, lt: dayEnd } } }),
      tx.outreachCheckIn.findMany({ where: { partyId: user.partyId }, orderBy: { checkInDate: "desc" }, take: 7 }),
      tx.outreachCheckIn.findFirst({ where: { partyId: user.partyId, checkInDate: { gte: dayStart, lt: dayEnd } } }),
    ]);

    return {
      metrics: {
        leadsGenerated: leadsCreated,
        outreach: activities.filter((a) => a.activityType === "FirstOutreach").length,
        followUps: activities.filter((a) => a.activityType === "FollowUp").length,
        responses: activities.filter((a) => a.activityType === "Response").length,
        meetings: activities.filter((a) => a.activityType === "MeetingBooked" || a.activityType === "MeetingCompleted").length,
      },
      recentCheckIns,
      alreadySubmittedToday: Boolean(alreadySubmittedToday),
    };
  });

  if (!data) return <PermissionDenied what="submitting a daily check-in" />;

  return (
    <>
      <PageHeader
        title="Daily check-in"
        description="Numbers below are computed live from your own logged activity — never typed by hand. Add what a number can't say."
      />

      <StatRow cols={4} className="mb-6">
        <Stat label="Leads generated" value={data.metrics.leadsGenerated} />
        <Stat label="Outreach" value={data.metrics.outreach} />
        <Stat label="Follow-ups" value={data.metrics.followUps} />
        <Stat label="Responses" value={data.metrics.responses} />
      </StatRow>
      <p className="mb-6 text-[13px] text-text-secondary">Meetings today: {data.metrics.meetings}</p>

      {data.alreadySubmittedToday ? (
        <Panel title="Today">
          <EmptyState title="Already submitted" description="You've already checked in today. Come back tomorrow." compact />
        </Panel>
      ) : (
        <Panel title="Submit today's check-in">
          <CheckInForm />
        </Panel>
      )}

      <div className="mt-6">
        <Panel title="Recent check-ins" flush>
          {data.recentCheckIns.length === 0 ? (
            <EmptyState title="No check-ins yet" description="Your submitted check-ins will appear here." />
          ) : (
            <RowList>
              {data.recentCheckIns.map((c) => (
                <Row key={c.id}>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14px] text-text">{c.summary}</span>
                    {c.blocker && <span className="text-[12px] text-danger">Blocker: {c.blocker}</span>}
                    {c.tomorrowPlan && <span className="text-[12px] text-text-tertiary">Next: {c.tomorrowPlan}</span>}
                  </span>
                  <span className="tabular shrink-0 text-[12px] text-text-tertiary">
                    {c.checkInDate.toISOString().slice(0, 10)}
                  </span>
                </Row>
              ))}
            </RowList>
          )}
        </Panel>
      </div>
    </>
  );
}
