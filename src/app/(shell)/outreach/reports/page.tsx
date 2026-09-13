import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_DIRECTION, ENTITY_TEAM_WEEKLY_ASSESSMENT, ENTITY_WEEKLY_REPORT } from "@/server/capabilities/outreach";
import { EmptyState, PageHeader, Panel, PermissionDenied, Row, RowList, Stat, StatRow } from "@/components/ui/primitives";
import { WeeklyReportForm } from "./WeeklyReportForm";
import { TeamAssessmentForm } from "./TeamAssessmentForm";

export const dynamic = "force-dynamic";

const TERMINAL_STATES = ["not_a_fit", "unresponsive", "lost", "deferred", "disqualified"];

/** Bottleneck detection (master-context spec §63) — a stage-to-stage ratio reading, computed over already-agreed facts, never a report designed ahead of the data. */
function detectBottleneck(counts: {
  prospected: number;
  contacted: number;
  responded: number;
  qualifiedPlus: number;
  proposal: number;
  closedWon: number;
}): string | null {
  const { prospected, contacted, responded, qualifiedPlus, proposal, closedWon } = counts;
  if (prospected < 5) return null; // too little volume to read anything into ratios
  if (contacted > 0 && responded / contacted < 0.1) return "High outreach, low responses — likely a targeting or messaging problem.";
  if (responded > 0 && qualifiedPlus / responded < 0.3) return "High responses, low qualification — likely a conversation/qualification problem.";
  if (qualifiedPlus > 0 && proposal / qualifiedPlus < 0.2) return "Qualified opportunities aren't reaching proposal — likely a discovery/fit problem.";
  if (proposal > 0 && closedWon / proposal < 0.2) return "Proposals aren't converting — likely a commercial/pricing/decision problem.";
  if (prospected > 0 && contacted / prospected < 0.5) return "High prospecting, low outreach — a research-to-action gap.";
  return null;
}

/**
 * Individual weekly report (master-context spec §24) + Senior's team weekly
 * assessment (spec §25). Numeric roll-ups are `getTeamWeeklyRollup`, a
 * separate live query — this screen only takes the qualitative fields a
 * person has to type by hand.
 */
export default async function ReportsPage() {
  installCapabilities();
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    const canSubmitReport = await hasPermission(tx, actor.roleId, "Create", ENTITY_WEEKLY_REPORT);
    if (!canSubmitReport) return null;
    const canSubmitAssessment = await hasPermission(tx, actor.roleId, "Create", ENTITY_TEAM_WEEKLY_ASSESSMENT);
    const canSeeCompanyRollup = await hasPermission(tx, actor.roleId, "Create", ENTITY_DIRECTION);

    const user = await tx.user.findUniqueOrThrow({ where: { id: actor.userId } });
    const ledTeams = canSubmitAssessment
      ? await tx.outreachTeam.findMany({ where: { leaderId: user.partyId, active: true } })
      : [];

    const [recentReports, recentAssessments] = await Promise.all([
      tx.outreachWeeklyReport.findMany({ where: { partyId: user.partyId }, orderBy: { weekStart: "desc" }, take: 5 }),
      ledTeams.length
        ? tx.outreachTeamWeeklyAssessment.findMany({
            where: { teamId: { in: ledTeams.map((t) => t.id) } },
            orderBy: { weekStart: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    // Company weekly roll-up + bottleneck (master-context spec §26, §62-63)
    // — Founder-only (same `canPostDirection`-style proxy as /outreach's
    // Attention/Direction panels).
    let companyRollup: null | {
      teams: Array<{ name: string; leads: number; closed: number }>;
      totalLeads: number;
      totalClosed: number;
      bottleneck: string | null;
    } = null;
    if (canSeeCompanyRollup) {
      const [teams, allLeads] = await Promise.all([
        tx.outreachTeam.findMany({ where: { active: true } }),
        tx.outreachLead.findMany(),
      ]);
      const perTeam = teams.map((t) => {
        const teamLeads = allLeads.filter((l) => l.teamId === t.id);
        return { name: t.name, leads: teamLeads.length, closed: teamLeads.filter((l) => l.state === "closed_won").length };
      });
      const counts = {
        prospected: allLeads.length,
        contacted: allLeads.filter((l) => !["research", "prospect"].includes(l.state)).length,
        responded: allLeads.filter(
          (l) => !["research", "prospect", "contacted"].includes(l.state),
        ).length,
        qualifiedPlus: allLeads.filter(
          (l) =>
            !["research", "prospect", "contacted", "responded"].includes(l.state) &&
            !TERMINAL_STATES.includes(l.state),
        ).length,
        proposal: allLeads.filter((l) =>
          ["proposal", "negotiation", "verbal_yes", "invoice_requested", "advance_received", "closed_won"].includes(l.state),
        ).length,
        closedWon: allLeads.filter((l) => l.state === "closed_won").length,
      };
      companyRollup = {
        teams: perTeam,
        totalLeads: allLeads.length,
        totalClosed: counts.closedWon,
        bottleneck: detectBottleneck(counts),
      };
    }

    return {
      ledTeams: ledTeams.map((t) => ({ id: t.id, name: t.name })),
      recentReports,
      recentAssessments,
      companyRollup,
    };
  });

  if (!data) return <PermissionDenied what="submitting reports" />;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Weekly reflection, individual and (for team leaders) team. Roll-up numbers live in the team's own funnel view, not typed here."
      />

      <Panel title="Your weekly report" className="mb-6">
        <WeeklyReportForm />
      </Panel>

      {data.ledTeams.length > 0 && (
        <Panel title="Team weekly assessment" className="mb-6">
          <TeamAssessmentForm teams={data.ledTeams} />
        </Panel>
      )}

      {data.companyRollup && (
        <Panel title="Company weekly roll-up" className="mb-6">
          <StatRow cols={2} className="mb-4">
            <Stat label="Total leads" value={data.companyRollup.totalLeads} />
            <Stat label="Total Closed Won" value={data.companyRollup.totalClosed} />
          </StatRow>
          <div className="mb-4 flex flex-wrap gap-4">
            {data.companyRollup.teams.map((t) => (
              <span key={t.name} className="text-[13px] text-text-secondary">
                {t.name}: <b className="text-text">{t.leads}</b> leads, <b className="text-text">{t.closed}</b> closed
              </span>
            ))}
          </div>
          {data.companyRollup.bottleneck ? (
            <p className="m-0 text-[13px] text-danger">{data.companyRollup.bottleneck}</p>
          ) : (
            <p className="m-0 text-[13px] text-text-tertiary">No clear bottleneck yet — not enough volume, or the funnel is healthy.</p>
          )}
        </Panel>
      )}

      <Panel title="Your recent reports" flush>
        {data.recentReports.length === 0 ? (
          <EmptyState title="No reports yet" description="Your submitted weekly reports will appear here." />
        ) : (
          <RowList>
            {data.recentReports.map((r) => (
              <Row key={r.id}>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[14px] text-text">{r.whatWorked ?? "—"}</span>
                  {r.biggestLearning && <span className="text-[12px] text-text-tertiary">{r.biggestLearning}</span>}
                </span>
                <span className="tabular shrink-0 text-[12px] text-text-tertiary">
                  {r.weekStart.toISOString().slice(0, 10)}
                </span>
              </Row>
            ))}
          </RowList>
        )}
      </Panel>
    </>
  );
}
