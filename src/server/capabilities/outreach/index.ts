import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, ValidationError, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { assertMutable, transition } from "@/server/platform/state";
import { diffFields, recordActivity } from "@/server/platform/audit";
import { ForbiddenError } from "@/server/platform/authorization";
import type { TenantScopedClient } from "@/server/platform/tenancy";

/**
 * CAPABILITY: OUTREACH — `verity.capability.outreach` (Task 105, P0 scope)
 *
 * Authority: `taskplans/105_pa_oms_outreach_capability.md`, grounded in
 * `clients/pa-oms/PlotArmour_Outreach_Team_Management_System_Master_Context.md`
 * and `clients/pa-oms/handbook-outreach.html` (the higher-ranked authority
 * for exact field/state values — see that file's own Ch. 00).
 *
 * PlotArmour Studio's internal client-acquisition operating system. NOT a
 * generalized CRM primitive, and NOT `verity.capability.crm` (a different
 * domain — Colonel Kebazb's restaurant-guest 360). Runs on its own tenant.
 *
 * SCOPE BUILT (P0 only): teams (no member-count cap), leads with the
 * platform's state-machine runtime bound to handbook Ch. 22's 13+5 states,
 * append-only activity timeline, follow-up/next-action query, targets,
 * daily check-in + weekly report + team weekly assessment (all auto-metric,
 * append-only), three-role attribution (handbook Ch. 02) with the 14-day
 * reassignment-eligibility rule and 90-day reactivation-credit window,
 * advance-payment-gated Closed Won.
 *
 * NOT built here (see taskplan's own Scope section): lead quality scoring,
 * duplicate detection, vertical/channel intelligence, experiments, AI
 * assistance, email integration, a compensation-view UI, promotion support,
 * onboarding-flow UI.
 */

export const OUTREACH_CAPABILITY = "verity.capability.outreach";
export const ENTITY_TEAM = "verity.outreach.team";
export const ENTITY_TEAM_MEMBERSHIP = "verity.outreach.team_membership";
export const ENTITY_LEAD = "verity.outreach.lead";
export const ENTITY_ACTIVITY = "verity.outreach.activity";
export const ENTITY_TARGET = "verity.outreach.target";
export const ENTITY_CHECK_IN = "verity.outreach.check_in";
export const ENTITY_WEEKLY_REPORT = "verity.outreach.weekly_report";
export const ENTITY_TEAM_WEEKLY_ASSESSMENT = "verity.outreach.team_weekly_assessment";
export const ENTITY_DIRECTION = "verity.outreach.direction";

/** The 5 terminal/negative lead states (handbook Ch. 22). */
const TERMINAL_STATES = ["not_a_fit", "unresponsive", "lost", "deferred", "disqualified"] as const;

/** Handbook Ch. 20's 9-value rejection taxonomy — closed set owned by this capability. */
const REJECTION_REASONS = [
  "NoFit",
  "NoBudget",
  "NoTiming",
  "NotInterested",
  "WrongPerson",
  "RevisitLater",
  "LostToCompetitor",
  "LostOnPrice",
  "LostOnScopeTrust",
] as const;

const CHANNELS = ["LinkedIn", "Email", "WhatsApp", "Call", "Referral", "Meeting", "Other"] as const;
const ACTIVITY_TYPES = [
  "FirstOutreach",
  "FollowUp",
  "Response",
  "MeetingBooked",
  "MeetingCompleted",
  "ProposalSent",
  "Other",
] as const;
const TRACKS = ["Agency", "Verity", "Both", "Undetermined"] as const;

const REASSIGNMENT_ELIGIBLE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;
const REACTIVATION_CREDIT_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

/** Resolves the actor's Party id. `ActorContext` carries `userId`, not `partyId` directly. */
async function actorPartyId(tx: TenantScopedClient, userId: string): Promise<string> {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  return user.partyId;
}

/**
 * Phase 3 fix (taskplan 105's own recorded gap): Senior-role permissions
 * are granted at Tenant scope like Founders' — there's no `Organization`-
 * scope equivalent for a capability-private `OutreachTeam` (ADR-005 keeps
 * `Organization` for the tenant's own nested business units, not a lead-gen
 * pod). This is the query-level filter option the taskplan named as the
 * cheap, correct fix: a Senior (identified structurally — leads exactly the
 * teams `OutreachTeam.leaderId` says they lead, not by role name, so it
 * holds even if a tenant renames or adds Senior-equivalent roles) may only
 * query a `teamId` they actually lead. An actor who leads no team (Founders'
 * Office, and every Junior) is unrestricted by this check — Founders keep
 * company-wide visibility by design (master-context §7), and a Junior-level
 * restriction is a separate, not-yet-requested narrowing this doesn't
 * attempt.
 */
export async function assertTeamScopeAllowed(
  tx: TenantScopedClient,
  actorUserId: string,
  teamId: string | undefined,
): Promise<void> {
  if (!teamId) return;
  const partyId = await actorPartyId(tx, actorUserId);
  const led = await tx.outreachTeam.findFirst({ where: { leaderId: partyId } });
  if (led && led.id !== teamId) {
    throw new ForbiddenError("E_FORBIDDEN: not authorized to view another team's pipeline");
  }
}

// ---------------------------------------------------------------------------
// TEAMS
// ---------------------------------------------------------------------------

export const createOutreachTeam: CommandDefinition<{ name: string; leaderId: string }, { id: string }> = {
  key: "verity.outreach.create_team",
  entity: ENTITY_TEAM,
  verb: "Create",
  input: z.object({ name: z.string().min(1), leaderId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const team = await ctx.tx.outreachTeam.create({
      data: { tenantId: ctx.actor.tenantId, name: input.name, leaderId: input.leaderId },
    });
    return { result: { id: team.id }, events: [{ name: "verity.outreach.team_created", entityId: team.id }] };
  },
};

/** No maximum team size — see module doc. */
export const addTeamMember: CommandDefinition<{ teamId: string; partyId: string }, { id: string }> = {
  key: "verity.outreach.add_team_member",
  entity: ENTITY_TEAM_MEMBERSHIP,
  verb: "Create",
  input: z.object({ teamId: z.string().uuid(), partyId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const membership = await ctx.tx.outreachTeamMembership.create({
      data: { tenantId: ctx.actor.tenantId, teamId: input.teamId, partyId: input.partyId },
    });
    return {
      result: { id: membership.id },
      events: [{ name: "verity.outreach.member_added", entityId: membership.id, payload: { teamId: input.teamId } }],
    };
  },
};

export const listOutreachTeams: QueryDefinition<Record<string, never>, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_teams",
  entity: ENTITY_TEAM,
  input: z.object({}),
  handler: async (ctx) =>
    ctx.tx.outreachTeam.findMany({
      where: { active: true },
      include: { memberships: { where: { active: true } } },
      orderBy: { name: "asc" },
    }),
};

// ---------------------------------------------------------------------------
// LEADS
// ---------------------------------------------------------------------------

export const createOutreachLead: CommandDefinition<
  {
    teamId: string;
    companyName: string;
    website?: string;
    industry?: string;
    track?: (typeof TRACKS)[number];
    whyRelevant: string;
    opportunityOwnerId: string;
  },
  { id: string }
> = {
  key: "verity.outreach.create_lead",
  entity: ENTITY_LEAD,
  verb: "Create",
  input: z.object({
    teamId: z.string().uuid(),
    companyName: z.string().min(1),
    website: z.string().min(1).optional(),
    industry: z.string().min(1).optional(),
    track: z.enum(TRACKS).optional(),
    // Required-at-creation per master-context spec §73 — a bare company
    // name is not a qualified lead.
    whyRelevant: z.string().min(1),
    opportunityOwnerId: z.string().uuid(),
  }),
  handler: async (ctx, input) => {
    const originatorId = await actorPartyId(ctx.tx, ctx.actor.userId);
    const lead = await ctx.tx.outreachLead.create({
      data: {
        tenantId: ctx.actor.tenantId,
        teamId: input.teamId,
        companyName: input.companyName,
        website: input.website ?? null,
        industry: input.industry ?? null,
        track: input.track ?? "Undetermined",
        whyRelevant: input.whyRelevant,
        leadOriginatorId: originatorId,
        opportunityOwnerId: input.opportunityOwnerId,
      },
    });
    return { result: { id: lead.id }, events: [{ name: "verity.outreach.lead_created", entityId: lead.id }] };
  },
};

/**
 * Advances (or ends) a lead through the state machine. Moving to a terminal
 * negative state requires a `rejectionReason` from handbook Ch. 20's closed
 * taxonomy; moving to `closed_won` requires cumulative
 * `advanceReceivedMinor` to already clear `advanceThresholdMinor` (handbook
 * Ch. 02 — never on partial payment).
 */
export const advanceLeadStage: CommandDefinition<
  { leadId: string; toState: string; rejectionReason?: (typeof REJECTION_REASONS)[number] },
  { state: string }
> = {
  key: "verity.outreach.advance_stage",
  entity: ENTITY_LEAD,
  verb: "Edit",
  input: z.object({
    leadId: z.string().uuid(),
    toState: z.string().min(1),
    rejectionReason: z.enum(REJECTION_REASONS).optional(),
  }),
  handler: async (ctx, input) => {
    const lead = await ctx.tx.outreachLead.findUniqueOrThrow({ where: { id: input.leadId } });
    await assertMutable(ctx.tx, ENTITY_LEAD, lead.state);

    if ((TERMINAL_STATES as readonly string[]).includes(input.toState) && !input.rejectionReason) {
      throw new ValidationError("E_VALIDATION: a terminal outcome requires a rejectionReason (handbook Ch. 20)");
    }
    if (input.toState === "closed_won") {
      const threshold = lead.advanceThresholdMinor;
      if (threshold == null || lead.advanceReceivedMinor < threshold) {
        throw new ValidationError(
          "E_VALIDATION: cumulative advance received has not cleared the qualifying threshold (handbook Ch. 02)",
        );
      }
    }

    const moved = await transition(ctx, {
      entityKey: ENTITY_LEAD,
      entityId: lead.id,
      fromKey: lead.state,
      toKey: input.toState,
    });

    const closerId =
      input.toState === "closed_won" ? await actorPartyId(ctx.tx, ctx.actor.userId) : lead.closerId;

    const updated = await ctx.tx.outreachLead.update({
      where: { id: lead.id },
      data: {
        state: input.toState,
        rejectionReason: input.rejectionReason ?? lead.rejectionReason,
        closerId,
        closedAt: input.toState === "closed_won" ? new Date() : lead.closedAt,
        version: { increment: 1 },
      },
    });

    await recordActivity(ctx, {
      entityKey: ENTITY_LEAD,
      entityId: lead.id,
      commandKey: "verity.outreach.advance_stage",
      changes: diffFields({ state: lead.state }, { state: updated.state }),
    });

    return { result: { state: updated.state }, events: [moved.event] };
  },
};

/** Records a payment against a lead's cumulative advance (handbook Ch. 02's milestone rule). */
export const recordAdvancePayment: CommandDefinition<
  { leadId: string; amountMinor: number; advanceThresholdMinor?: number },
  { advanceReceivedMinor: number }
> = {
  key: "verity.outreach.record_advance_payment",
  entity: ENTITY_LEAD,
  verb: "Edit",
  input: z.object({
    leadId: z.string().uuid(),
    amountMinor: z.number().int().positive(),
    advanceThresholdMinor: z.number().int().positive().optional(),
  }),
  handler: async (ctx, input) => {
    const lead = await ctx.tx.outreachLead.findUniqueOrThrow({ where: { id: input.leadId } });
    await assertMutable(ctx.tx, ENTITY_LEAD, lead.state);

    const updated = await ctx.tx.outreachLead.update({
      where: { id: lead.id },
      data: {
        advanceReceivedMinor: { increment: input.amountMinor },
        advanceThresholdMinor: input.advanceThresholdMinor ?? lead.advanceThresholdMinor,
        version: { increment: 1 },
      },
    });

    return {
      result: { advanceReceivedMinor: updated.advanceReceivedMinor },
      events: [{ name: "verity.outreach.advance_payment_recorded", entityId: lead.id, payload: { amountMinor: input.amountMinor } }],
    };
  },
};

/**
 * Reassigns the Opportunity Owner. Handbook Ch. 02: eligible once 14+ days
 * have passed with no logged activity. `leadOriginatorId` never changes.
 */
export const reassignOpportunityOwner: CommandDefinition<{ leadId: string; newOwnerId: string }, { opportunityOwnerId: string }> = {
  key: "verity.outreach.reassign_owner",
  entity: ENTITY_LEAD,
  verb: "Edit",
  input: z.object({ leadId: z.string().uuid(), newOwnerId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const lead = await ctx.tx.outreachLead.findUniqueOrThrow({ where: { id: input.leadId } });
    await assertMutable(ctx.tx, ENTITY_LEAD, lead.state);

    const idleSince = lead.lastActivityAt ?? lead.createdAt;
    if (Date.now() - idleSince.getTime() < REASSIGNMENT_ELIGIBLE_AFTER_MS) {
      throw new ValidationError(
        "E_VALIDATION: not eligible for reassignment — under 14 days since the last logged activity (handbook Ch. 02)",
      );
    }

    const before = lead.opportunityOwnerId;
    const updated = await ctx.tx.outreachLead.update({
      where: { id: lead.id },
      data: { opportunityOwnerId: input.newOwnerId, version: { increment: 1 } },
    });

    await recordActivity(ctx, {
      entityKey: ENTITY_LEAD,
      entityId: lead.id,
      commandKey: "verity.outreach.reassign_owner",
      changes: diffFields({ opportunityOwnerId: before }, { opportunityOwnerId: updated.opportunityOwnerId }),
    });

    return { result: { opportunityOwnerId: updated.opportunityOwnerId }, events: [] };
  },
};

/**
 * INV-002: a terminal lead is never reopened. Reactivation spawns a new
 * `OutreachLead` row. Handbook Ch. 02: original origination credit is kept
 * only if reactivated within 90 days of the last logged activity.
 */
export const reactivateLead: CommandDefinition<
  { leadId: string; newOwnerId: string; whyRelevant: string },
  { id: string }
> = {
  key: "verity.outreach.reactivate_lead",
  entity: ENTITY_LEAD,
  verb: "Create",
  input: z.object({
    leadId: z.string().uuid(),
    newOwnerId: z.string().uuid(),
    whyRelevant: z.string().min(1),
  }),
  handler: async (ctx, input) => {
    const dead = await ctx.tx.outreachLead.findUniqueOrThrow({ where: { id: input.leadId } });
    if (!(TERMINAL_STATES as readonly string[]).includes(dead.state) && dead.state !== "closed_won") {
      throw new ValidationError("E_VALIDATION: only a terminal lead can be reactivated");
    }

    const reactivatorId = await actorPartyId(ctx.tx, ctx.actor.userId);
    const idleSince = (dead.lastActivityAt ?? dead.createdAt).getTime();
    const withinCreditWindow = Date.now() - idleSince <= REACTIVATION_CREDIT_WINDOW_MS;

    const fresh = await ctx.tx.outreachLead.create({
      data: {
        tenantId: ctx.actor.tenantId,
        teamId: dead.teamId,
        companyName: dead.companyName,
        website: dead.website,
        industry: dead.industry,
        track: dead.track,
        whyRelevant: input.whyRelevant,
        contactName: dead.contactName,
        contactDesignation: dead.contactDesignation,
        contactEmail: dead.contactEmail,
        contactPhone: dead.contactPhone,
        leadOriginatorId: withinCreditWindow ? dead.leadOriginatorId : reactivatorId,
        opportunityOwnerId: input.newOwnerId,
        reactivatedFromLeadId: dead.id,
      },
    });

    return { result: { id: fresh.id }, events: [{ name: "verity.outreach.lead_reactivated", entityId: fresh.id, payload: { from: dead.id } }] };
  },
};

export const listOutreachLeads: QueryDefinition<
  { teamId?: string; ownerId?: string; state?: string },
  Array<Record<string, unknown>>
> = {
  key: "verity.outreach.list_leads",
  entity: ENTITY_LEAD,
  input: z.object({
    teamId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
    state: z.string().optional(),
  }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    return ctx.tx.outreachLead.findMany({
      where: {
        ...(input.teamId ? { teamId: input.teamId } : {}),
        ...(input.ownerId ? { opportunityOwnerId: input.ownerId } : {}),
        ...(input.state ? { state: input.state } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
  },
};

/** Master-context spec §43-44: no active lead should lack a next action. */
export const listOverdueFollowUps: QueryDefinition<{ teamId?: string }, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_overdue_follow_ups",
  entity: ENTITY_LEAD,
  input: z.object({ teamId: z.string().uuid().optional() }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    return ctx.tx.outreachLead.findMany({
      where: {
        ...(input.teamId ? { teamId: input.teamId } : {}),
        state: { notIn: [...TERMINAL_STATES, "closed_won"] },
        nextActionAt: { lt: new Date() },
      },
      orderBy: { nextActionAt: "asc" },
    });
  },
};

/** Pipeline funnel counts by state — master-context spec §49, §62. */
export const getFunnelCounts: QueryDefinition<{ teamId?: string }, Array<{ state: string; count: number }>> = {
  key: "verity.outreach.funnel_counts",
  entity: ENTITY_LEAD,
  input: z.object({ teamId: z.string().uuid().optional() }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    const rows = await ctx.tx.outreachLead.groupBy({
      by: ["state"],
      where: input.teamId ? { teamId: input.teamId } : {},
      _count: { _all: true },
    });
    return rows.map((r) => ({ state: r.state, count: r._count._all }));
  },
};

// ---------------------------------------------------------------------------
// ACTIVITY LOG
// ---------------------------------------------------------------------------

export const logOutreachActivity: CommandDefinition<
  {
    leadId: string;
    channel: (typeof CHANNELS)[number];
    activityType: (typeof ACTIVITY_TYPES)[number];
    message?: string;
    response?: string;
    nextActionNote?: string;
    nextActionAt?: string;
  },
  { id: string }
> = {
  key: "verity.outreach.log_activity",
  entity: ENTITY_ACTIVITY,
  verb: "Create",
  input: z.object({
    leadId: z.string().uuid(),
    channel: z.enum(CHANNELS),
    activityType: z.enum(ACTIVITY_TYPES),
    message: z.string().optional(),
    response: z.string().optional(),
    nextActionNote: z.string().optional(),
    nextActionAt: z.string().datetime().optional(),
  }),
  handler: async (ctx, input) => {
    const lead = await ctx.tx.outreachLead.findUniqueOrThrow({ where: { id: input.leadId } });
    await assertMutable(ctx.tx, ENTITY_LEAD, lead.state);

    const actorId = await actorPartyId(ctx.tx, ctx.actor.userId);
    const activity = await ctx.tx.outreachActivity.create({
      data: {
        tenantId: ctx.actor.tenantId,
        leadId: input.leadId,
        actorPartyId: actorId,
        channel: input.channel,
        activityType: input.activityType,
        message: input.message ?? null,
        response: input.response ?? null,
      },
    });

    // Every logged activity refreshes the 14-day reassignment clock
    // (handbook Ch. 02) and can set the next action (spec §43-44).
    await ctx.tx.outreachLead.update({
      where: { id: lead.id },
      data: {
        lastActivityAt: activity.occurredAt,
        ...(input.nextActionNote !== undefined ? { nextActionNote: input.nextActionNote } : {}),
        ...(input.nextActionAt !== undefined ? { nextActionAt: new Date(input.nextActionAt) } : {}),
        version: { increment: 1 },
      },
    });

    return {
      result: { id: activity.id },
      events: [{ name: "verity.outreach.activity_logged", entityId: activity.id, payload: { leadId: input.leadId } }],
    };
  },
};

export const getLeadTimeline: QueryDefinition<{ leadId: string }, Array<Record<string, unknown>>> = {
  key: "verity.outreach.lead_timeline",
  entity: ENTITY_ACTIVITY,
  input: z.object({ leadId: z.string().uuid() }),
  handler: async (ctx, input) =>
    ctx.tx.outreachActivity.findMany({ where: { leadId: input.leadId }, orderBy: { occurredAt: "asc" } }),
};

// ---------------------------------------------------------------------------
// TARGETS
// ---------------------------------------------------------------------------

export const setOutreachTarget: CommandDefinition<
  {
    scope: "Company" | "Team" | "Individual";
    teamId?: string;
    partyId?: string;
    period: "Daily" | "Weekly";
    metric: "QualifiedProspects" | "Outreach" | "FollowUps" | "Responses" | "Meetings" | "Proposals" | "Closed";
    targetValue: number;
    periodStart: string;
    periodEnd: string;
  },
  { id: string }
> = {
  key: "verity.outreach.set_target",
  entity: ENTITY_TARGET,
  verb: "Create",
  input: z.object({
    scope: z.enum(["Company", "Team", "Individual"]),
    teamId: z.string().uuid().optional(),
    partyId: z.string().uuid().optional(),
    period: z.enum(["Daily", "Weekly"]),
    metric: z.enum(["QualifiedProspects", "Outreach", "FollowUps", "Responses", "Meetings", "Proposals", "Closed"]),
    targetValue: z.number().int().positive(),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
  }),
  handler: async (ctx, input) => {
    const target = await ctx.tx.outreachTarget.create({
      data: {
        tenantId: ctx.actor.tenantId,
        scope: input.scope,
        teamId: input.teamId ?? null,
        partyId: input.partyId ?? null,
        period: input.period,
        metric: input.metric,
        targetValue: input.targetValue,
        periodStart: new Date(input.periodStart),
        periodEnd: new Date(input.periodEnd),
      },
    });
    return { result: { id: target.id }, events: [] };
  },
};

export const listOutreachTargets: QueryDefinition<
  { scope?: "Company" | "Team" | "Individual"; teamId?: string; partyId?: string },
  Array<Record<string, unknown>>
> = {
  key: "verity.outreach.list_targets",
  entity: ENTITY_TARGET,
  input: z.object({
    scope: z.enum(["Company", "Team", "Individual"]).optional(),
    teamId: z.string().uuid().optional(),
    partyId: z.string().uuid().optional(),
  }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    return ctx.tx.outreachTarget.findMany({
      where: {
        ...(input.scope ? { scope: input.scope } : {}),
        ...(input.teamId ? { teamId: input.teamId } : {}),
        ...(input.partyId ? { partyId: input.partyId } : {}),
      },
      orderBy: { periodStart: "desc" },
    });
  },
};

// ---------------------------------------------------------------------------
// DAILY CHECK-IN / WEEKLY REPORTS — numeric fields are ALWAYS a live query,
// never hand-typed (master-context spec §21-23, Task 93 precedent).
// ---------------------------------------------------------------------------

export const submitDailyCheckIn: CommandDefinition<
  {
    checkInDate: string;
    summary: string;
    bestLeadId?: string;
    learning?: string;
    blocker?: string;
    tomorrowPlan?: string;
  },
  { id: string }
> = {
  key: "verity.outreach.submit_check_in",
  entity: ENTITY_CHECK_IN,
  verb: "Create",
  input: z.object({
    checkInDate: z.string().datetime(),
    summary: z.string().min(1),
    bestLeadId: z.string().uuid().optional(),
    learning: z.string().optional(),
    blocker: z.string().optional(),
    tomorrowPlan: z.string().optional(),
  }),
  handler: async (ctx, input) => {
    const partyId = await actorPartyId(ctx.tx, ctx.actor.userId);
    const checkIn = await ctx.tx.outreachCheckIn.create({
      data: {
        tenantId: ctx.actor.tenantId,
        partyId,
        checkInDate: new Date(input.checkInDate),
        summary: input.summary,
        bestLeadId: input.bestLeadId ?? null,
        learning: input.learning ?? null,
        blocker: input.blocker ?? null,
        tomorrowPlan: input.tomorrowPlan ?? null,
      },
    });
    return { result: { id: checkIn.id }, events: [{ name: "verity.outreach.check_in_submitted", entityId: checkIn.id }] };
  },
};

/** Auto metrics for one person on one day — computed live, never stored. */
export const getDailyMetrics: QueryDefinition<{ partyId: string; date: string }, Record<string, number>> = {
  key: "verity.outreach.daily_metrics",
  entity: ENTITY_ACTIVITY,
  input: z.object({ partyId: z.string().uuid(), date: z.string().datetime() }),
  handler: async (ctx, input) => {
    const dayStart = new Date(input.date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const [leadsCreated, activities] = await Promise.all([
      ctx.tx.outreachLead.count({
        where: { leadOriginatorId: input.partyId, createdAt: { gte: dayStart, lt: dayEnd } },
      }),
      ctx.tx.outreachActivity.findMany({
        where: { actorPartyId: input.partyId, occurredAt: { gte: dayStart, lt: dayEnd } },
      }),
    ]);

    return {
      leadsGenerated: leadsCreated,
      outreach: activities.filter((a) => a.activityType === "FirstOutreach").length,
      followUps: activities.filter((a) => a.activityType === "FollowUp").length,
      responses: activities.filter((a) => a.activityType === "Response").length,
      meetings: activities.filter((a) => a.activityType === "MeetingBooked" || a.activityType === "MeetingCompleted").length,
      proposals: activities.filter((a) => a.activityType === "ProposalSent").length,
    };
  },
};

export const submitWeeklyReport: CommandDefinition<
  {
    weekStart: string;
    whatWorked?: string;
    whatDidntWork?: string;
    strongestOpportunityId?: string;
    biggestLearning?: string;
    nextWeekChange?: string;
    nextWeekTargetValue?: number;
  },
  { id: string }
> = {
  key: "verity.outreach.submit_weekly_report",
  entity: ENTITY_WEEKLY_REPORT,
  verb: "Create",
  input: z.object({
    weekStart: z.string().datetime(),
    whatWorked: z.string().optional(),
    whatDidntWork: z.string().optional(),
    strongestOpportunityId: z.string().uuid().optional(),
    biggestLearning: z.string().optional(),
    nextWeekChange: z.string().optional(),
    nextWeekTargetValue: z.number().int().positive().optional(),
  }),
  handler: async (ctx, input) => {
    const partyId = await actorPartyId(ctx.tx, ctx.actor.userId);
    const report = await ctx.tx.outreachWeeklyReport.create({
      data: {
        tenantId: ctx.actor.tenantId,
        partyId,
        weekStart: new Date(input.weekStart),
        whatWorked: input.whatWorked ?? null,
        whatDidntWork: input.whatDidntWork ?? null,
        strongestOpportunityId: input.strongestOpportunityId ?? null,
        biggestLearning: input.biggestLearning ?? null,
        nextWeekChange: input.nextWeekChange ?? null,
        nextWeekTargetValue: input.nextWeekTargetValue ?? null,
      },
    });
    return { result: { id: report.id }, events: [{ name: "verity.outreach.weekly_report_submitted", entityId: report.id }] };
  },
};

export const submitTeamWeeklyAssessment: CommandDefinition<
  {
    teamId: string;
    weekStart: string;
    strongestPerformerId?: string;
    strongestProspectId?: string;
    strongestVertical?: string;
    biggestProblem?: string;
    biggestLearning?: string;
    nextWeekPriority?: string;
  },
  { id: string }
> = {
  key: "verity.outreach.submit_team_weekly_assessment",
  entity: ENTITY_TEAM_WEEKLY_ASSESSMENT,
  verb: "Create",
  input: z.object({
    teamId: z.string().uuid(),
    weekStart: z.string().datetime(),
    strongestPerformerId: z.string().uuid().optional(),
    strongestProspectId: z.string().uuid().optional(),
    strongestVertical: z.string().optional(),
    biggestProblem: z.string().optional(),
    biggestLearning: z.string().optional(),
    nextWeekPriority: z.string().optional(),
  }),
  handler: async (ctx, input) => {
    const assessment = await ctx.tx.outreachTeamWeeklyAssessment.create({
      data: {
        tenantId: ctx.actor.tenantId,
        teamId: input.teamId,
        weekStart: new Date(input.weekStart),
        strongestPerformerId: input.strongestPerformerId ?? null,
        strongestProspectId: input.strongestProspectId ?? null,
        strongestVertical: input.strongestVertical ?? null,
        biggestProblem: input.biggestProblem ?? null,
        biggestLearning: input.biggestLearning ?? null,
        nextWeekPriority: input.nextWeekPriority ?? null,
      },
    });
    return {
      result: { id: assessment.id },
      events: [{ name: "verity.outreach.team_weekly_assessment_submitted", entityId: assessment.id }],
    };
  },
};

/** Live team roll-up for a week — master-context spec §25, never hand-typed. */
export const getTeamWeeklyRollup: QueryDefinition<{ teamId: string; weekStart: string; weekEnd: string }, Record<string, number>> = {
  key: "verity.outreach.team_weekly_rollup",
  entity: ENTITY_LEAD,
  input: z.object({ teamId: z.string().uuid(), weekStart: z.string().datetime(), weekEnd: z.string().datetime() }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    const range = { gte: new Date(input.weekStart), lt: new Date(input.weekEnd) };
    const [qualifiedLeads, activities, closed] = await Promise.all([
      ctx.tx.outreachLead.count({ where: { teamId: input.teamId, createdAt: range } }),
      ctx.tx.outreachActivity.findMany({
        where: { occurredAt: range, lead: { teamId: input.teamId } },
      }),
      ctx.tx.outreachLead.count({ where: { teamId: input.teamId, state: "closed_won", closedAt: range } }),
    ]);
    return {
      leads: qualifiedLeads,
      outreach: activities.filter((a) => a.activityType === "FirstOutreach").length,
      followUps: activities.filter((a) => a.activityType === "FollowUp").length,
      responses: activities.filter((a) => a.activityType === "Response").length,
      meetings: activities.filter((a) => a.activityType === "MeetingBooked" || a.activityType === "MeetingCompleted").length,
      proposals: activities.filter((a) => a.activityType === "ProposalSent").length,
      closed,
    };
  },
};

// ---------------------------------------------------------------------------
// COMPANY DIRECTION — master-context spec §10-11. Phase 2.
// ---------------------------------------------------------------------------

export const postCompanyDirection: CommandDefinition<
  {
    weekLabel: string;
    priorityVertical?: string;
    primaryTrack?: (typeof TRACKS)[number];
    companyProspectingTarget?: number;
    strategicNote?: string;
  },
  { id: string }
> = {
  key: "verity.outreach.post_direction",
  entity: ENTITY_DIRECTION,
  verb: "Create",
  input: z.object({
    weekLabel: z.string().min(1),
    priorityVertical: z.string().optional(),
    primaryTrack: z.enum(TRACKS).optional(),
    companyProspectingTarget: z.number().int().positive().optional(),
    strategicNote: z.string().optional(),
  }),
  handler: async (ctx, input) => {
    const postedById = await actorPartyId(ctx.tx, ctx.actor.userId);
    // APPEND-ONLY (ADR-009): close every prior Active direction rather than
    // editing one — a new direction is a new fact, not a correction of the
    // old row.
    await ctx.tx.outreachDirection.updateMany({ where: { status: "Active" }, data: { status: "Closed" } });
    const direction = await ctx.tx.outreachDirection.create({
      data: {
        tenantId: ctx.actor.tenantId,
        weekLabel: input.weekLabel,
        priorityVertical: input.priorityVertical ?? null,
        primaryTrack: input.primaryTrack ?? "Undetermined",
        companyProspectingTarget: input.companyProspectingTarget ?? null,
        strategicNote: input.strategicNote ?? null,
        postedById,
      },
    });
    return { result: { id: direction.id }, events: [{ name: "verity.outreach.direction_posted", entityId: direction.id }] };
  },
};

export const getCurrentDirection: QueryDefinition<Record<string, never>, Record<string, unknown> | null> = {
  key: "verity.outreach.current_direction",
  entity: ENTITY_DIRECTION,
  input: z.object({}),
  handler: async (ctx) => ctx.tx.outreachDirection.findFirst({ where: { status: "Active" }, orderBy: { postedAt: "desc" } }),
};

export const listDirections: QueryDefinition<Record<string, never>, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_directions",
  entity: ENTITY_DIRECTION,
  input: z.object({}),
  handler: async (ctx) => ctx.tx.outreachDirection.findMany({ orderBy: { postedAt: "desc" }, take: 20 }),
};

// ---------------------------------------------------------------------------
// ATTENTION / EXCEPTIONS — master-context spec §9. Company Core should see
// exceptions surfaced, not every event — this returns a short, prioritized
// list, never a raw event firehose.
// ---------------------------------------------------------------------------

export type AttentionException = { kind: string; message: string; leadId?: string };

export const getAttentionExceptions: QueryDefinition<Record<string, never>, AttentionException[]> = {
  key: "verity.outreach.attention_exceptions",
  entity: ENTITY_LEAD,
  input: z.object({}),
  handler: async (ctx) => {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);

    const [teams, overdueLeads, noNextActionLeads, missingCheckIns] = await Promise.all([
      ctx.tx.outreachTeam.findMany({ where: { active: true }, include: { memberships: { where: { active: true } } } }),
      ctx.tx.outreachLead.findMany({
        where: {
          state: { notIn: [...TERMINAL_STATES, "closed_won"] },
          nextActionAt: { lt: new Date() },
        },
      }),
      ctx.tx.outreachLead.count({
        where: { state: { notIn: [...TERMINAL_STATES, "closed_won"] }, nextActionAt: null },
      }),
      ctx.tx.outreachCheckIn.findMany({ where: { checkInDate: { gte: dayStart } } }),
    ]);

    const exceptions: AttentionException[] = [];

    if (overdueLeads.length > 0) {
      exceptions.push({
        kind: "follow_up_overdue",
        message: `${overdueLeads.length} follow-up${overdueLeads.length === 1 ? "" : "s"} overdue.`,
      });
    }
    if (noNextActionLeads > 0) {
      exceptions.push({
        kind: "no_next_action",
        message: `${noNextActionLeads} active lead${noNextActionLeads === 1 ? "" : "s"} with no next action set (spec §44 rule).`,
      });
    }

    const checkedInPartyIds = new Set(missingCheckIns.map((c) => c.partyId));
    for (const team of teams) {
      const memberPartyIds = team.memberships.map((m) => m.partyId);
      const missing = memberPartyIds.filter((id) => !checkedInPartyIds.has(id));
      if (missing.length > 0) {
        exceptions.push({
          kind: "missing_check_in",
          message: `${team.name}: ${missing.length} of ${memberPartyIds.length} member${memberPartyIds.length === 1 ? "" : "s"} have not checked in today.`,
        });
      }
    }

    return exceptions;
  },
};

// ---------------------------------------------------------------------------
// REGISTRATION
// ---------------------------------------------------------------------------

export function registerOutreachCapability(): void {
  registerContribution({
    capabilityId: OUTREACH_CAPABILITY,
    navigation: [
      // "Capabilities" only renders for the platform tenant (layout.tsx's own
      // audit finding U3-2 — a client must never see platform vocabulary);
      // this runs on PlotArmour Studio's own client tenant, so it needs a
      // business-facing group like `crm`'s own precedent, not `asset`'s.
      // No dedicated pipeline icon exists in `icons.tsx`'s closed `IconName`
      // set yet — "sales" is the closest existing shape rather than inventing
      // a new one for a single nav item.
      { href: "/outreach", label: "Outreach", group: "Overview", order: 30, icon: "sales",
        requiresEntity: ENTITY_LEAD, shells: ["platform", "operations"] },
      { href: "/outreach/workspace", label: "My Workspace", group: "Overview", order: 29, icon: "workspace",
        requiresEntity: ENTITY_LEAD, shells: ["platform", "operations"] },
      { href: "/outreach/team", label: "Team Command", group: "Overview", order: 29, icon: "people",
        requiresEntity: ENTITY_LEAD, shells: ["platform", "operations"] },
      { href: "/outreach/check-in", label: "Daily check-in", group: "Overview", order: 31, icon: "check",
        requiresEntity: ENTITY_CHECK_IN, requiresVerb: "Create", shells: ["platform", "operations"] },
      { href: "/outreach/targets", label: "Targets", group: "Overview", order: 32, icon: "overview",
        requiresEntity: ENTITY_TARGET, shells: ["platform", "operations"] },
      { href: "/outreach/reports", label: "Reports", group: "Overview", order: 33, icon: "ledger",
        requiresEntity: ENTITY_WEEKLY_REPORT, requiresVerb: "Create", shells: ["platform", "operations"] },
    ],
  });

  registerCommand(createOutreachTeam);
  registerCommand(addTeamMember);
  registerCommand(createOutreachLead);
  registerCommand(advanceLeadStage);
  registerCommand(recordAdvancePayment);
  registerCommand(reassignOpportunityOwner);
  registerCommand(reactivateLead);
  registerCommand(logOutreachActivity);
  registerCommand(setOutreachTarget);
  registerCommand(submitDailyCheckIn);
  registerCommand(submitWeeklyReport);
  registerCommand(submitTeamWeeklyAssessment);
  registerCommand(postCompanyDirection);

  registerQuery(listOutreachTeams);
  registerQuery(listOutreachLeads);
  registerQuery(listOverdueFollowUps);
  registerQuery(getFunnelCounts);
  registerQuery(getLeadTimeline);
  registerQuery(listOutreachTargets);
  registerQuery(getDailyMetrics);
  registerQuery(getTeamWeeklyRollup);
  registerQuery(getCurrentDirection);
  registerQuery(listDirections);
  registerQuery(getAttentionExceptions);
}
