import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, ValidationError, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { assertMutable, transition } from "@/server/platform/state";
import { diffFields, recordActivity } from "@/server/platform/audit";
import { ForbiddenError } from "@/server/platform/authorization";
import type { TenantScopedClient } from "@/server/platform/tenancy";
import { reserveUpload, confirmUpload, readUrlFor } from "@/server/platform/files";

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
export const ENTITY_CONTACT = "verity.outreach.contact";
export const ENTITY_RESEARCH = "verity.outreach.research_entry";
export const ENTITY_TASK = "verity.outreach.task";
export const ENTITY_MEETING = "verity.outreach.meeting";
/**
 * Nav-gating markers (2026-09-14). Founder/Senior/Junior share broad
 * Read/Create/Edit grants on `ENTITY_LEAD` etc. at Tenant scope (a
 * documented P0 MVP limitation — see `seed-pa-oms.ts`), so entity+verb
 * alone can't tell the three roles apart for `requiresEntity` nav
 * gating. These two are Read-only markers granted to exactly one role
 * each, existing only so "Team Command" and "My Workspace" stop
 * appearing in every role's sidebar regardless of relevance.
 */
export const ENTITY_TEAM_LEADERSHIP = "verity.outreach.team_leadership";
export const ENTITY_JUNIOR_WORKSPACE = "verity.outreach.junior_workspace";

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
  // The daily workbook's own "Pitch Decks" and "Business R&A" columns
  // (2026-09-13) — distinct from ProposalSent/research-at-creation:
  // PitchDeck logs sending a deck at any stage, BusinessResearch logs
  // research time spent on a company that hasn't necessarily become a
  // lead yet (master-context doc §49: "make it a real activity").
  "PitchDeck",
  "BusinessResearch",
  "Other",
] as const;
const TRACKS = ["Agency", "Verity", "Both", "Undetermined"] as const;
/** Closed set (spec §24): a contact's decision-influence classification. */
const CONTACT_CLASSIFICATIONS = ["DecisionMaker", "Influencer", "Champion", "Gatekeeper", "Unknown"] as const;

/** Closed set (spec §26-29): research entry types. */
const RESEARCH_TYPES = [
  "Note",
  "Url",
  "Pdf",
  "Docx",
  "Spreadsheet",
  "Presentation",
  "Image",
  "Screenshot",
  "Other",
] as const;
/** Types that never carry a file — created directly, no upload phase. */
const FILELESS_RESEARCH_TYPES = ["Note", "Url"] as const;

/** Closed set (spec §53): task work-item fields. */
const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
const TASK_STATUSES = ["Todo", "InProgress", "Blocked", "Done", "Cancelled"] as const;
/** Closed set (spec §54) — initiative vs. assigned load, never client-set directly. */
const TASK_ORIGINS = ["TeamLeaderAssigned", "SelfCreated", "SystemGenerated"] as const;

/** Closed set (spec §62): meeting lifecycle. */
const MEETING_STATUSES = ["Scheduled", "Completed", "Cancelled", "NoShow"] as const;

/** Closed set (spec §68): daily-report review workflow. */
const CHECK_IN_REVIEW_STATUSES = ["Submitted", "Reviewed", "NeedsClarification"] as const;

const REASSIGNMENT_ELIGIBLE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;
const REACTIVATION_CREDIT_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

export type LeadHealth = "Hot" | "Stale" | "AtRisk" | "Healthy" | "Closed";

/**
 * Task 106 Phase 3 (spec §21): a meaningful, explainable health signal
 * instead of styling-only status. Branches ONLY on the ADR-009 category
 * (Draft/Pending/Active/Blocked/Completed/Cancelled) — never on the raw
 * state key, per ADR-009's hard rule that SLA/overdue logic must not read
 * `key`. Order matters: closed first, then stale (no activity at all
 * outranks a merely-overdue action), then overdue, then real momentum.
 */
export function deriveLeadHealth(lead: {
  category: string;
  lastActivityAt: Date | null;
  nextActionAt: Date | null;
  createdAt: Date;
}): LeadHealth {
  if (lead.category === "Completed" || lead.category === "Cancelled") return "Closed";

  const idleSince = lead.lastActivityAt ?? lead.createdAt;
  if (Date.now() - idleSince.getTime() > STALE_AFTER_MS) return "Stale";

  const overdue = lead.nextActionAt != null && lead.nextActionAt.getTime() < Date.now();
  if (overdue) return "AtRisk";

  const hasUpcomingAction = lead.nextActionAt != null && lead.nextActionAt.getTime() >= Date.now();
  if (lead.category === "Active" && hasUpcomingAction) return "Hot";

  return "Healthy";
}

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
  const led = await tx.outreachTeam.findFirst({
    where: { OR: [{ leaderId: partyId }, { coLeaderId: partyId }] },
  });
  if (led && led.id !== teamId) {
    throw new ForbiddenError("E_FORBIDDEN: not authorized to view another team's pipeline");
  }
}

// ---------------------------------------------------------------------------
// TEAMS
// ---------------------------------------------------------------------------

export const createOutreachTeam: CommandDefinition<
  { name: string; leaderId: string; coLeaderId?: string },
  { id: string }
> = {
  key: "verity.outreach.create_team",
  entity: ENTITY_TEAM,
  verb: "Create",
  input: z.object({ name: z.string().min(1), leaderId: z.string().uuid(), coLeaderId: z.string().uuid().optional() }),
  handler: async (ctx, input) => {
    const team = await ctx.tx.outreachTeam.create({
      data: {
        tenantId: ctx.actor.tenantId,
        name: input.name,
        leaderId: input.leaderId,
        coLeaderId: input.coLeaderId ?? null,
      },
    });
    return { result: { id: team.id }, events: [{ name: "verity.outreach.team_created", entityId: team.id }] };
  },
};

/** Sets or clears a team's co-leader. Co-leader is authorized identically to `leaderId` everywhere it's checked. */
export const setTeamCoLeader: CommandDefinition<{ teamId: string; coLeaderId: string | null }, { id: string }> = {
  key: "verity.outreach.set_team_co_leader",
  entity: ENTITY_TEAM,
  verb: "Edit",
  input: z.object({ teamId: z.string().uuid(), coLeaderId: z.string().uuid().nullable() }),
  handler: async (ctx, input) => {
    const team = await ctx.tx.outreachTeam.update({
      where: { id: input.teamId },
      data: { coLeaderId: input.coLeaderId, version: { increment: 1 } },
    });
    return { result: { id: team.id }, events: [{ name: "verity.outreach.co_leader_set", entityId: team.id }] };
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

/** Soft-removes a member — deactivates the membership, never deletes it, so attribution history stays intact. */
export const removeTeamMember: CommandDefinition<{ teamId: string; partyId: string }, { id: string }> = {
  key: "verity.outreach.remove_team_member",
  entity: ENTITY_TEAM_MEMBERSHIP,
  verb: "Edit",
  input: z.object({ teamId: z.string().uuid(), partyId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const membership = await ctx.tx.outreachTeamMembership.findFirstOrThrow({
      where: { teamId: input.teamId, partyId: input.partyId },
    });
    await ctx.tx.outreachTeamMembership.update({ where: { id: membership.id }, data: { active: false } });
    return {
      result: { id: membership.id },
      events: [{ name: "verity.outreach.member_removed", entityId: membership.id, payload: { teamId: input.teamId } }],
    };
  },
};

export const renameTeam: CommandDefinition<{ teamId: string; name: string }, { id: string }> = {
  key: "verity.outreach.rename_team",
  entity: ENTITY_TEAM,
  verb: "Edit",
  input: z.object({ teamId: z.string().uuid(), name: z.string().min(1) }),
  handler: async (ctx, input) => {
    const team = await ctx.tx.outreachTeam.update({
      where: { id: input.teamId },
      data: { name: input.name, version: { increment: 1 } },
    });
    return { result: { id: team.id }, events: [{ name: "verity.outreach.team_renamed", entityId: team.id }] };
  },
};

/**
 * People reachable in this tenant who aren't already on an active team
 * roster — the only pool an "add member" picker offers, so it can never be
 * used to create a new login. Provisioning a brand-new person stays an
 * admin/seed action, deliberately not exposed here.
 */
export const listAvailableParties: QueryDefinition<Record<string, never>, Array<{ id: string; name: string }>> = {
  key: "verity.outreach.list_available_parties",
  entity: ENTITY_TEAM_MEMBERSHIP,
  input: z.object({}),
  handler: async (ctx) => {
    const [memberships, leaders, allMemberships] = await Promise.all([
      ctx.tx.outreachTeamMembership.findMany({ where: { active: true }, select: { partyId: true } }),
      ctx.tx.outreachTeam.findMany({ where: { active: true }, select: { leaderId: true, coLeaderId: true } }),
      ctx.tx.tenantMembership.findMany({ include: { user: { include: { party: true } } } }),
    ]);
    const taken = new Set([
      ...memberships.map((m) => m.partyId),
      ...leaders.map((l) => l.leaderId),
      ...leaders.flatMap((l) => (l.coLeaderId ? [l.coLeaderId] : [])),
    ]);
    const seen = new Set<string>();
    const candidates: Array<{ id: string; name: string }> = [];
    for (const m of allMemberships) {
      const party = m.user.party;
      if (taken.has(party.id) || seen.has(party.id)) continue;
      seen.add(party.id);
      candidates.push({ id: party.id, name: party.displayName });
    }
    return candidates.sort((a, b) => a.name.localeCompare(b.name));
  },
};

// ---------------------------------------------------------------------------
// LEADS
// ---------------------------------------------------------------------------

function normalizeCompanyName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function domainOf(url: string): string | null {
  try {
    return new URL(url.match(/^https?:\/\//) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Duplicate detection (Task 106 Phase 4, spec §45-46, §49, §96). Company-
 * wide by design — a Junior's own team-scoped list can't tell them a
 * different team already owns this prospect, which is the whole point.
 * Confidentiality-preserving: a match outside the caller's access returns
 * only a generic message (spec §8), never the other owner/team/status.
 */
export const checkDuplicateProspect: QueryDefinition<
  { companyName: string; website?: string; linkedinUrl?: string },
  { possibleDuplicate: boolean; accessible: boolean; leadId?: string; companyName?: string; message: string }
> = {
  key: "verity.outreach.check_duplicate_prospect",
  entity: ENTITY_LEAD,
  input: z.object({
    companyName: z.string().min(1),
    website: z.string().min(1).optional(),
    linkedinUrl: z.string().min(1).optional(),
  }),
  handler: async (ctx, input) => {
    const normalizedName = normalizeCompanyName(input.companyName);
    const domain = input.website ? domainOf(input.website) : null;
    const normalizedLinkedin = input.linkedinUrl?.toLowerCase().replace(/\/$/, "") ?? null;

    // Company-wide scan, deliberately unfiltered by team — this is the one
    // outreach read that must see across the whole tenant to do its job.
    const candidates = await ctx.tx.outreachLead.findMany({
      select: { id: true, companyName: true, website: true, linkedinUrl: true, teamId: true },
    });
    const match = candidates.find((c) => {
      if (normalizeCompanyName(c.companyName) === normalizedName) return true;
      if (domain && c.website && domainOf(c.website) === domain) return true;
      if (normalizedLinkedin && c.linkedinUrl && c.linkedinUrl.toLowerCase().replace(/\/$/, "") === normalizedLinkedin) return true;
      return false;
    });

    if (!match) return { possibleDuplicate: false, accessible: false, message: "No existing record found." };

    let accessible = true;
    try {
      await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, match.teamId);
    } catch (error) {
      if (error instanceof ForbiddenError) accessible = false;
      else throw error;
    }

    if (!accessible) {
      return {
        possibleDuplicate: true,
        accessible: false,
        message: "A PlotArmour record for this company may already exist. Ask your Team Leader before creating a duplicate.",
      };
    }
    return {
      possibleDuplicate: true,
      accessible: true,
      leadId: match.id,
      companyName: match.companyName,
      message: `"${match.companyName}" already exists in your accessible pipeline.`,
    };
  },
};

export const createOutreachLead: CommandDefinition<
  {
    teamId: string;
    companyName: string;
    website?: string;
    industry?: string;
    track?: (typeof TRACKS)[number];
    whyRelevant: string;
    opportunityOwnerId: string;
    location?: string;
    whatTheyDo?: string;
    potentialNeed?: string;
    salesHypothesis?: string;
    linkedinUrl?: string;
    qualityScore?: number;
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
    // The real prospect-research sheet's own columns (2026-09-13) — see
    // the schema-field doc comment for why each is distinct from
    // `whyRelevant`.
    location: z.string().min(1).optional(),
    whatTheyDo: z.string().min(1).optional(),
    potentialNeed: z.string().min(1).optional(),
    salesHypothesis: z.string().min(1).optional(),
    linkedinUrl: z.string().min(1).optional(),
    qualityScore: z.number().int().min(1).max(10).optional(),
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
        location: input.location ?? null,
        whatTheyDo: input.whatTheyDo ?? null,
        potentialNeed: input.potentialNeed ?? null,
        salesHypothesis: input.salesHypothesis ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        qualityScore: input.qualityScore ?? null,
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

const ESCALATION_TYPES = ["Commercial", "Technical", "ClientIssue", "Attribution", "TeamIssue", "Other"] as const;
const ESCALATION_URGENCIES = ["Normal", "High", "Critical"] as const;

/**
 * Escalation (2026-09-13 hierarchical-architecture doc §38-39) — typed,
 * Junior -> Senior -> Core, not straight to Core: `type`/`urgency` are
 * optional so the pre-existing untyped flag flow keeps working, but the
 * new UI always sends them.
 */
export const flagForEscalation: CommandDefinition<
  { leadId: string; note: string; type?: string; urgency?: string },
  { id: string }
> = {
  key: "verity.outreach.flag_escalation",
  entity: ENTITY_LEAD,
  verb: "Edit",
  input: z.object({
    leadId: z.string().uuid(),
    note: z.string().min(1),
    type: z.enum(ESCALATION_TYPES).optional(),
    urgency: z.enum(ESCALATION_URGENCIES).optional(),
  }),
  handler: async (ctx, input) => {
    const actorId = await actorPartyId(ctx.tx, ctx.actor.userId);
    const lead = await ctx.tx.outreachLead.update({
      where: { id: input.leadId },
      data: {
        escalated: true,
        escalationNote: input.note,
        escalationType: input.type ?? null,
        escalationUrgency: input.urgency ?? null,
        escalatedById: actorId,
        escalatedAt: new Date(),
        version: { increment: 1 },
      },
    });
    return { result: { id: lead.id }, events: [{ name: "verity.outreach.lead_escalated", entityId: lead.id }] };
  },
};

/** The Founder side: mark an escalation handled. Doesn't touch the lead's own pipeline stage. */
export const resolveEscalation: CommandDefinition<{ leadId: string }, { id: string }> = {
  key: "verity.outreach.resolve_escalation",
  entity: ENTITY_LEAD,
  verb: "Edit",
  input: z.object({ leadId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const lead = await ctx.tx.outreachLead.update({
      where: { id: input.leadId },
      data: { escalated: false, version: { increment: 1 } },
    });
    return { result: { id: lead.id }, events: [{ name: "verity.outreach.escalation_resolved", entityId: lead.id }] };
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

/**
 * Follow-up queue, bucketed (Task 106 Phase 5, spec §61: OVERDUE/TODAY/
 * TOMORROW/UPCOMING). A query-shape change over the same data
 * `listOverdueFollowUps` already reads — that query stays as-is for
 * existing callers, this is the bucketed successor for the queue UI.
 */
export const listFollowUpQueue: QueryDefinition<
  { teamId?: string },
  { overdue: Array<Record<string, unknown>>; today: Array<Record<string, unknown>>; tomorrow: Array<Record<string, unknown>>; upcoming: Array<Record<string, unknown>> }
> = {
  key: "verity.outreach.follow_up_queue",
  entity: ENTITY_LEAD,
  input: z.object({ teamId: z.string().uuid().optional() }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setUTCDate(tomorrowEnd.getUTCDate() + 1);

    const active = await ctx.tx.outreachLead.findMany({
      where: {
        ...(input.teamId ? { teamId: input.teamId } : {}),
        state: { notIn: [...TERMINAL_STATES, "closed_won"] },
        nextActionAt: { not: null },
      },
      orderBy: { nextActionAt: "asc" },
    });

    return {
      overdue: active.filter((l) => l.nextActionAt! < todayStart),
      today: active.filter((l) => l.nextActionAt! >= todayStart && l.nextActionAt! < todayEnd),
      tomorrow: active.filter((l) => l.nextActionAt! >= todayEnd && l.nextActionAt! < tomorrowEnd),
      upcoming: active.filter((l) => l.nextActionAt! >= tomorrowEnd),
    };
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

/**
 * Escalation queue — the read side. Core calls with no `teamId` for the
 * tenant-wide view (unchanged from spec §57's original Founder-only
 * queue). Senior calls with their own `teamId` for Team Command's
 * first-line view (2026-09-13 doc §38-39: Junior -> Senior -> Core).
 */
export const listEscalatedLeads: QueryDefinition<{ teamId?: string }, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_escalated_leads",
  entity: ENTITY_LEAD,
  input: z.object({ teamId: z.string().uuid().optional() }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    return ctx.tx.outreachLead.findMany({
      where: { escalated: true, ...(input.teamId ? { teamId: input.teamId } : {}) },
      orderBy: { escalatedAt: "desc" },
    });
  },
};

/** Company Core's team-to-team comparison (master-context spec §8's own table shape). */
export const getTeamComparison: QueryDefinition<
  Record<string, never>,
  Array<{
    teamId: string;
    teamName: string;
    memberCount: number;
    leads: number;
    outreach: number;
    followUps: number;
    responses: number;
    meetings: number;
    proposals: number;
    pitchDecks: number;
    businessResearch: number;
    pipeline: number;
    closed: number;
  }>
> = {
  key: "verity.outreach.team_comparison",
  entity: ENTITY_TEAM,
  input: z.object({}),
  handler: async (ctx) => {
    const [teams, allLeads] = await Promise.all([
      ctx.tx.outreachTeam.findMany({ where: { active: true }, include: { memberships: { where: { active: true } } } }),
      ctx.tx.outreachLead.findMany(),
    ]);
    const teamIds = teams.map((t) => t.id);
    const activities = teamIds.length
      ? await ctx.tx.outreachActivity.findMany({ where: { lead: { teamId: { in: teamIds } } }, include: { lead: true } })
      : [];

    return teams.map((t) => {
      const leads = allLeads.filter((l) => l.teamId === t.id);
      const acts = activities.filter((a) => a.lead.teamId === t.id);
      return {
        teamId: t.id,
        teamName: t.name,
        memberCount: t.memberships.length,
        leads: leads.length,
        outreach: acts.filter((a) => a.activityType === "FirstOutreach").length,
        followUps: acts.filter((a) => a.activityType === "FollowUp").length,
        responses: acts.filter((a) => a.activityType === "Response").length,
        meetings: acts.filter((a) => a.activityType === "MeetingBooked" || a.activityType === "MeetingCompleted").length,
        proposals: acts.filter((a) => a.activityType === "ProposalSent").length,
        pitchDecks: acts.filter((a) => a.activityType === "PitchDeck").length,
        businessResearch: acts.filter((a) => a.activityType === "BusinessResearch").length,
        pipeline: leads.filter((l) => !(TERMINAL_STATES as readonly string[]).includes(l.state) && l.state !== "closed_won").length,
        closed: leads.filter((l) => l.state === "closed_won").length,
      };
    });
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
// CONTACTS (Task 106 Phase 3, spec §24-25) — a named person at a prospect
// company. Separate entity from OutreachLead (the company); not a Party
// (ADR-001, same reasoning as OutreachLead itself).
// ---------------------------------------------------------------------------

export const createOutreachContact: CommandDefinition<
  {
    leadId: string;
    fullName: string;
    designation?: string;
    department?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    classification?: (typeof CONTACT_CLASSIFICATIONS)[number];
    notes?: string;
  },
  { id: string }
> = {
  key: "verity.outreach.create_contact",
  entity: ENTITY_CONTACT,
  verb: "Create",
  input: z.object({
    leadId: z.string().uuid(),
    fullName: z.string().min(1),
    designation: z.string().min(1).optional(),
    department: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    linkedinUrl: z.string().min(1).optional(),
    classification: z.enum(CONTACT_CLASSIFICATIONS).optional(),
    notes: z.string().min(1).optional(),
  }),
  handler: async (ctx, input) => {
    // Lead must exist and be in-tenant (RLS enforces tenant, this just
    // 404s cleanly instead of a raw FK violation) — same lookup shape as
    // logOutreachActivity.
    await ctx.tx.outreachLead.findUniqueOrThrow({ where: { id: input.leadId } });
    const createdBy = await actorPartyId(ctx.tx, ctx.actor.userId);
    const contact = await ctx.tx.outreachContact.create({
      data: {
        tenantId: ctx.actor.tenantId,
        leadId: input.leadId,
        fullName: input.fullName,
        designation: input.designation ?? null,
        department: input.department ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        classification: input.classification ?? "Unknown",
        notes: input.notes ?? null,
        createdByPartyId: createdBy,
      },
    });
    return { result: { id: contact.id }, events: [{ name: "verity.outreach.contact_created", entityId: contact.id }] };
  },
};

export const listOutreachContacts: QueryDefinition<{ leadId: string }, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_contacts",
  entity: ENTITY_CONTACT,
  input: z.object({ leadId: z.string().uuid() }),
  handler: async (ctx, input) =>
    ctx.tx.outreachContact.findMany({ where: { leadId: input.leadId }, orderBy: { createdAt: "asc" } }),
};

// ---------------------------------------------------------------------------
// RESEARCH (Task 106 Phase 4, spec §26-29) — a chronological timeline of
// notes, URLs and uploaded artifacts per prospect. File entries go through
// the platform's two-phase upload (files.ts) with `entityKey`/`entityId`
// set to this lead, so read authorization derives from the lead rather than
// being duplicated onto the file (files.ts's own documented pattern).
// ---------------------------------------------------------------------------

/** Shared: 404s cleanly on a missing lead instead of a raw FK violation. */
async function requireLead(tx: TenantScopedClient, leadId: string) {
  return tx.outreachLead.findUniqueOrThrow({ where: { id: leadId } });
}

export const createResearchNote: CommandDefinition<
  { leadId: string; type: "Note" | "Url"; title: string; content?: string; sourceUrl?: string },
  { id: string }
> = {
  key: "verity.outreach.create_research_note",
  entity: ENTITY_RESEARCH,
  verb: "Create",
  input: z.object({
    leadId: z.string().uuid(),
    type: z.enum(FILELESS_RESEARCH_TYPES),
    title: z.string().min(1),
    content: z.string().min(1).optional(),
    sourceUrl: z.string().min(1).optional(),
  }),
  handler: async (ctx, input) => {
    await requireLead(ctx.tx, input.leadId);
    if (input.type === "Url" && !input.sourceUrl) {
      throw new ValidationError("E_VALIDATION: a Url research entry needs sourceUrl");
    }
    const createdBy = await actorPartyId(ctx.tx, ctx.actor.userId);
    const entry = await ctx.tx.outreachResearchEntry.create({
      data: {
        tenantId: ctx.actor.tenantId,
        leadId: input.leadId,
        type: input.type,
        title: input.title,
        content: input.content ?? null,
        sourceUrl: input.sourceUrl ?? null,
        createdByPartyId: createdBy,
      },
    });
    return { result: { id: entry.id }, events: [{ name: "verity.outreach.research_added", entityId: entry.id }] };
  },
};

/**
 * Phase one of a file-backed research entry: reserves a `StoredFile` (Pending,
 * unreadable) and returns an upload URL. The research entry itself is not
 * created until `confirmResearchFileUpload` — an entry referencing bytes
 * that never arrived would be a row claiming an artifact exists.
 */
export const reserveResearchFileUpload: CommandDefinition<
  { leadId: string; fileName: string; mimeType: string; byteSize: number },
  { fileId: string; uploadUrl?: string }
> = {
  key: "verity.outreach.reserve_research_file",
  entity: ENTITY_RESEARCH,
  verb: "Create",
  input: z.object({
    leadId: z.string().uuid(),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    byteSize: z.number().int().positive(),
  }),
  handler: async (ctx, input) => {
    await requireLead(ctx.tx, input.leadId);
    const uploadedBy = await actorPartyId(ctx.tx, ctx.actor.userId);
    const reserved = await reserveUpload(ctx.tx, {
      tenantId: ctx.actor.tenantId,
      uploadedById: uploadedBy,
      fileName: input.fileName,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      entityKey: ENTITY_LEAD,
      entityId: input.leadId,
    });
    return { result: { fileId: reserved.fileId, uploadUrl: reserved.uploadUrl }, events: [] };
  },
};

/** Phase two: confirm the bytes arrived, then create the research entry. */
export const confirmResearchFileUpload: CommandDefinition<
  {
    leadId: string;
    fileId: string;
    checksum: string;
    byteSize: number;
    type: Exclude<(typeof RESEARCH_TYPES)[number], "Note" | "Url">;
    title: string;
  },
  { id: string; status: "Stored" | "Quarantined" }
> = {
  key: "verity.outreach.confirm_research_file",
  entity: ENTITY_RESEARCH,
  verb: "Create",
  input: z.object({
    leadId: z.string().uuid(),
    fileId: z.string().uuid(),
    checksum: z.string().min(1),
    byteSize: z.number().int().positive(),
    type: z.enum(["Pdf", "Docx", "Spreadsheet", "Presentation", "Image", "Screenshot", "Other"]),
    title: z.string().min(1),
  }),
  handler: async (ctx, input) => {
    await requireLead(ctx.tx, input.leadId);
    const result = await confirmUpload(ctx.tx, {
      fileId: input.fileId,
      checksum: input.checksum,
      byteSize: input.byteSize,
    });
    if (!result.ok) {
      // Quarantined: no research entry is created for bytes that failed
      // their own declared size — same "don't claim an artifact that
      // isn't there" reasoning as the reserve step's own doc comment.
      return { result: { id: input.fileId, status: "Quarantined" }, events: [] };
    }
    const createdBy = await actorPartyId(ctx.tx, ctx.actor.userId);
    const entry = await ctx.tx.outreachResearchEntry.create({
      data: {
        tenantId: ctx.actor.tenantId,
        leadId: input.leadId,
        type: input.type,
        title: input.title,
        fileId: input.fileId,
        createdByPartyId: createdBy,
      },
    });
    return {
      result: { id: entry.id, status: "Stored" },
      events: [{ name: "verity.outreach.research_added", entityId: entry.id }],
    };
  },
};

export const listResearchEntries: QueryDefinition<{ leadId: string }, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_research",
  entity: ENTITY_RESEARCH,
  input: z.object({ leadId: z.string().uuid() }),
  handler: async (ctx, input) =>
    ctx.tx.outreachResearchEntry.findMany({ where: { leadId: input.leadId }, orderBy: { createdAt: "asc" } }),
};

/**
 * Closes the file-authorization gap taskplan 106 recorded: authorizes
 * against the research entry's OWNING LEAD (via `requireLead`, which fails
 * closed under tenant RLS the same way every other lookup here does) before
 * minting a signed URL — never against the file record alone.
 */
export const getResearchFileUrl: QueryDefinition<{ entryId: string }, { url: string }> = {
  key: "verity.outreach.research_file_url",
  entity: ENTITY_RESEARCH,
  input: z.object({ entryId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const entry = await ctx.tx.outreachResearchEntry.findUniqueOrThrow({ where: { id: input.entryId } });
    if (!entry.fileId) throw new ValidationError("E_VALIDATION: this research entry has no file");
    await requireLead(ctx.tx, entry.leadId);
    const url = await readUrlFor(ctx.tx, entry.fileId);
    return { url };
  },
};

// ---------------------------------------------------------------------------
// TASKS (Task 106 Phase 5, spec §53-55) — capability-private work items, no
// platform Task primitive exists (grepped the schema before adding this).
// ---------------------------------------------------------------------------

export const createOutreachTask: CommandDefinition<
  {
    teamId: string;
    leadId?: string;
    title: string;
    description?: string;
    priority?: (typeof TASK_PRIORITIES)[number];
    dueAt?: string;
    assignedToPartyId: string;
  },
  { id: string }
> = {
  key: "verity.outreach.create_task",
  entity: ENTITY_TASK,
  verb: "Create",
  input: z.object({
    teamId: z.string().uuid(),
    leadId: z.string().uuid().optional(),
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueAt: z.string().datetime().optional(),
    assignedToPartyId: z.string().uuid(),
  }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    if (input.leadId) await requireLead(ctx.tx, input.leadId);
    const assignedBy = await actorPartyId(ctx.tx, ctx.actor.userId);
    // Origin is derived, never client-supplied (spec §54's whole point is
    // telling initiative apart from assigned load without trusting the
    // client to self-report which one this is).
    const origin: (typeof TASK_ORIGINS)[number] = assignedBy === input.assignedToPartyId ? "SelfCreated" : "TeamLeaderAssigned";
    const task = await ctx.tx.outreachTask.create({
      data: {
        tenantId: ctx.actor.tenantId,
        teamId: input.teamId,
        leadId: input.leadId ?? null,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? "Medium",
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        origin,
        assignedToPartyId: input.assignedToPartyId,
        assignedByPartyId: assignedBy,
      },
    });
    return { result: { id: task.id }, events: [{ name: "verity.outreach.task_created", entityId: task.id }] };
  },
};

export const setTaskStatus: CommandDefinition<{ taskId: string; status: (typeof TASK_STATUSES)[number] }, { id: string; status: string }> = {
  key: "verity.outreach.set_task_status",
  entity: ENTITY_TASK,
  verb: "Edit",
  input: z.object({ taskId: z.string().uuid(), status: z.enum(TASK_STATUSES) }),
  handler: async (ctx, input) => {
    const task = await ctx.tx.outreachTask.findUniqueOrThrow({ where: { id: input.taskId } });
    const updated = await ctx.tx.outreachTask.update({
      where: { id: task.id },
      data: {
        status: input.status,
        completedAt: input.status === "Done" ? new Date() : task.completedAt,
        version: { increment: 1 },
      },
    });
    return {
      result: { id: updated.id, status: updated.status },
      events: [{ name: "verity.outreach.task_status_changed", entityId: updated.id, payload: { status: input.status } }],
    };
  },
};

export const listOutreachTasks: QueryDefinition<
  { teamId?: string; assignedToPartyId?: string; status?: (typeof TASK_STATUSES)[number] },
  Array<Record<string, unknown>>
> = {
  key: "verity.outreach.list_tasks",
  entity: ENTITY_TASK,
  input: z.object({
    teamId: z.string().uuid().optional(),
    assignedToPartyId: z.string().uuid().optional(),
    status: z.enum(TASK_STATUSES).optional(),
  }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    return ctx.tx.outreachTask.findMany({
      where: {
        ...(input.teamId ? { teamId: input.teamId } : {}),
        ...(input.assignedToPartyId ? { assignedToPartyId: input.assignedToPartyId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });
  },
};

// ---------------------------------------------------------------------------
// MEETINGS (Task 106 Phase 5, spec §62)
// ---------------------------------------------------------------------------

export const createOutreachMeeting: CommandDefinition<
  { leadId: string; scheduledAt: string; purpose?: string; locationOrUrl?: string; prepNotes?: string },
  { id: string }
> = {
  key: "verity.outreach.create_meeting",
  entity: ENTITY_MEETING,
  verb: "Create",
  input: z.object({
    leadId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
    purpose: z.string().min(1).optional(),
    locationOrUrl: z.string().min(1).optional(),
    prepNotes: z.string().min(1).optional(),
  }),
  handler: async (ctx, input) => {
    await requireLead(ctx.tx, input.leadId);
    const organizer = await actorPartyId(ctx.tx, ctx.actor.userId);
    const meeting = await ctx.tx.outreachMeeting.create({
      data: {
        tenantId: ctx.actor.tenantId,
        leadId: input.leadId,
        organizerPartyId: organizer,
        scheduledAt: new Date(input.scheduledAt),
        purpose: input.purpose ?? null,
        locationOrUrl: input.locationOrUrl ?? null,
        prepNotes: input.prepNotes ?? null,
      },
    });
    return { result: { id: meeting.id }, events: [{ name: "verity.outreach.meeting_created", entityId: meeting.id }] };
  },
};

export const updateMeetingOutcome: CommandDefinition<
  { meetingId: string; status: Exclude<(typeof MEETING_STATUSES)[number], "Scheduled">; outcomeNotes?: string },
  { id: string; status: string }
> = {
  key: "verity.outreach.update_meeting_outcome",
  entity: ENTITY_MEETING,
  verb: "Edit",
  input: z.object({
    meetingId: z.string().uuid(),
    status: z.enum(["Completed", "Cancelled", "NoShow"]),
    outcomeNotes: z.string().min(1).optional(),
  }),
  handler: async (ctx, input) => {
    const meeting = await ctx.tx.outreachMeeting.update({
      where: { id: input.meetingId },
      data: { status: input.status, outcomeNotes: input.outcomeNotes ?? null, version: { increment: 1 } },
    });
    return {
      result: { id: meeting.id, status: meeting.status },
      events: [{ name: "verity.outreach.meeting_outcome_recorded", entityId: meeting.id, payload: { status: input.status } }],
    };
  },
};

export const listOutreachMeetings: QueryDefinition<{ leadId?: string }, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_meetings",
  entity: ENTITY_MEETING,
  input: z.object({ leadId: z.string().uuid().optional() }),
  handler: async (ctx, input) =>
    ctx.tx.outreachMeeting.findMany({
      where: input.leadId ? { leadId: input.leadId } : {},
      orderBy: { scheduledAt: "asc" },
    }),
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
    changeReason?: string;
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
    changeReason: z.string().min(1).optional(),
  }),
  handler: async (ctx, input) => {
    // Task 106 Phase 3 (spec §72-73): a second call for the same scope/
    // team/party/period/metric/periodStart supersedes the prior active row
    // instead of leaving two ambiguous "current" targets. The old row is
    // never edited or deleted — only flipped inactive — and the value
    // change is recorded through the platform's own append-only audit log
    // (recordActivity), not a parallel history table.
    const previous = await ctx.tx.outreachTarget.findFirst({
      where: {
        active: true,
        scope: input.scope,
        teamId: input.teamId ?? null,
        partyId: input.partyId ?? null,
        period: input.period,
        metric: input.metric,
        periodStart: new Date(input.periodStart),
      },
    });

    if (previous) {
      await ctx.tx.outreachTarget.update({
        where: { id: previous.id },
        data: { active: false, version: { increment: 1 } },
      });
    }

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
        changeReason: input.changeReason ?? null,
      },
    });

    if (previous) {
      await recordActivity(ctx, {
        entityKey: ENTITY_TARGET,
        entityId: target.id,
        commandKey: "verity.outreach.set_target",
        changes: diffFields(
          { targetValue: previous.targetValue },
          { targetValue: target.targetValue },
          [],
        ),
      });
    }

    return { result: { id: target.id }, events: [] };
  },
};

export const listOutreachTargets: QueryDefinition<
  { scope?: "Company" | "Team" | "Individual"; teamId?: string; partyId?: string; includeSuperseded?: boolean },
  Array<Record<string, unknown>>
> = {
  key: "verity.outreach.list_targets",
  entity: ENTITY_TARGET,
  input: z.object({
    scope: z.enum(["Company", "Team", "Individual"]).optional(),
    teamId: z.string().uuid().optional(),
    partyId: z.string().uuid().optional(),
    // Task 106 Phase 3: default view is "what's current" — a superseded
    // target only shows when explicitly asked for (e.g. a history panel).
    includeSuperseded: z.boolean().optional(),
  }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    return ctx.tx.outreachTarget.findMany({
      where: {
        ...(input.includeSuperseded ? {} : { active: true }),
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
    mostImportantDevelopment?: string;
    needsAttention?: string;
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
    // Task 106 Phase 5 (spec §64-71): the two questions the original
    // 5-field shape didn't ask.
    mostImportantDevelopment: z.string().optional(),
    needsAttention: z.string().optional(),
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
        mostImportantDevelopment: input.mostImportantDevelopment ?? null,
        needsAttention: input.needsAttention ?? null,
      },
    });
    return { result: { id: checkIn.id }, events: [{ name: "verity.outreach.check_in_submitted", entityId: checkIn.id }] };
  },
};

/**
 * Team Leader review of a Junior's daily report (spec §68: Submitted →
 * Reviewed → NeedsClarification). `OutreachCheckIn` carries a hard
 * append-only DB trigger (its original migration), so review is a
 * NEW row in `OutreachCheckInReview`, never an UPDATE to the check-in
 * itself — matching handbook Ch. 02's "never rewrite the Junior's own
 * text" rule at the database level, not just by convention.
 */
export const reviewCheckIn: CommandDefinition<
  { checkInId: string; reviewStatus: Exclude<(typeof CHECK_IN_REVIEW_STATUSES)[number], "Submitted">; leaderFeedback?: string },
  { id: string; reviewStatus: string }
> = {
  key: "verity.outreach.review_check_in",
  entity: ENTITY_CHECK_IN,
  verb: "Create",
  input: z.object({
    checkInId: z.string().uuid(),
    reviewStatus: z.enum(["Reviewed", "NeedsClarification"]),
    leaderFeedback: z.string().min(1).optional(),
  }),
  handler: async (ctx, input) => {
    await ctx.tx.outreachCheckIn.findUniqueOrThrow({ where: { id: input.checkInId } });
    const reviewer = await actorPartyId(ctx.tx, ctx.actor.userId);
    const review = await ctx.tx.outreachCheckInReview.create({
      data: {
        tenantId: ctx.actor.tenantId,
        checkInId: input.checkInId,
        reviewedByPartyId: reviewer,
        reviewStatus: input.reviewStatus,
        leaderFeedback: input.leaderFeedback ?? null,
      },
    });
    return {
      result: { id: review.id, reviewStatus: review.reviewStatus },
      events: [{ name: "verity.outreach.check_in_reviewed", entityId: input.checkInId, payload: { reviewStatus: input.reviewStatus } }],
    };
  },
};

/**
 * A team's check-ins for one day, for the Team Leader review screen. Each
 * row carries its latest review (if any) as `currentReview` — the most
 * recent `OutreachCheckInReview` row, or null if still un-reviewed
 * (implicitly "Submitted").
 */
export const listTeamCheckIns: QueryDefinition<{ teamId: string; date: string }, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_team_check_ins",
  entity: ENTITY_CHECK_IN,
  input: z.object({ teamId: z.string().uuid(), date: z.string().datetime() }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    const dayStart = new Date(input.date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    // Leaders/co-leaders aren't OutreachTeamMembership rows (that table is
    // the Junior roster only — see OutreachTeam.leaderId/coLeaderId) but
    // they submit check-ins too, same as every other page's member-list
    // computation in this file.
    const team = await ctx.tx.outreachTeam.findUniqueOrThrow({
      where: { id: input.teamId },
      include: { memberships: { where: { active: true } } },
    });
    const memberIds = [
      team.leaderId,
      ...(team.coLeaderId ? [team.coLeaderId] : []),
      ...team.memberships.map((m) => m.partyId),
    ];

    const checkIns = await ctx.tx.outreachCheckIn.findMany({
      where: { partyId: { in: memberIds }, checkInDate: { gte: dayStart, lt: dayEnd } },
      orderBy: { submittedAt: "asc" },
    });
    const reviews = checkIns.length
      ? await ctx.tx.outreachCheckInReview.findMany({
          where: { checkInId: { in: checkIns.map((c) => c.id) } },
          orderBy: { reviewedAt: "desc" },
        })
      : [];
    const latestReviewByCheckIn = new Map<string, (typeof reviews)[number]>();
    for (const r of reviews) if (!latestReviewByCheckIn.has(r.checkInId)) latestReviewByCheckIn.set(r.checkInId, r);

    return checkIns.map((c) => ({ ...c, currentReview: latestReviewByCheckIn.get(c.id) ?? null }));
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
      pitchDecks: activities.filter((a) => a.activityType === "PitchDeck").length,
      businessResearch: activities.filter((a) => a.activityType === "BusinessResearch").length,
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
      pitchDecks: activities.filter((a) => a.activityType === "PitchDeck").length,
      businessResearch: activities.filter((a) => a.activityType === "BusinessResearch").length,
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
        requiresEntity: ENTITY_JUNIOR_WORKSPACE, shells: ["platform", "operations"] },
      { href: "/outreach/team", label: "Team Command", group: "Overview", order: 29, icon: "people",
        requiresEntity: ENTITY_TEAM_LEADERSHIP, shells: ["platform", "operations"] },
      { href: "/outreach/check-in", label: "Daily check-in", group: "Overview", order: 31, icon: "check",
        requiresEntity: ENTITY_CHECK_IN, requiresVerb: "Create", shells: ["platform", "operations"] },
      { href: "/outreach/targets", label: "Targets", group: "Overview", order: 32, icon: "overview",
        requiresEntity: ENTITY_TARGET, shells: ["platform", "operations"] },
      { href: "/outreach/reports", label: "Reports", group: "Overview", order: 33, icon: "ledger",
        requiresEntity: ENTITY_WEEKLY_REPORT, requiresVerb: "Create", shells: ["platform", "operations"] },
    ],
  });

  registerCommand(createOutreachTeam);
  registerCommand(setTeamCoLeader);
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
  registerCommand(removeTeamMember);
  registerCommand(renameTeam);
  registerCommand(flagForEscalation);
  registerCommand(resolveEscalation);
  registerCommand(createOutreachContact);
  registerCommand(createResearchNote);
  registerCommand(reserveResearchFileUpload);
  registerCommand(confirmResearchFileUpload);
  registerCommand(createOutreachTask);
  registerCommand(setTaskStatus);
  registerCommand(createOutreachMeeting);
  registerCommand(updateMeetingOutcome);
  registerCommand(reviewCheckIn);

  registerQuery(listOutreachTeams);
  registerQuery(listOutreachContacts);
  registerQuery(listResearchEntries);
  registerQuery(getResearchFileUrl);
  registerQuery(checkDuplicateProspect);
  registerQuery(listOutreachLeads);
  registerQuery(listOverdueFollowUps);
  registerQuery(listFollowUpQueue);
  registerQuery(getFunnelCounts);
  registerQuery(getLeadTimeline);
  registerQuery(listOutreachTargets);
  registerQuery(getDailyMetrics);
  registerQuery(getTeamWeeklyRollup);
  registerQuery(getCurrentDirection);
  registerQuery(listDirections);
  registerQuery(getAttentionExceptions);
  registerQuery(listAvailableParties);
  registerQuery(listEscalatedLeads);
  registerQuery(getTeamComparison);
  registerQuery(listOutreachTasks);
  registerQuery(listOutreachMeetings);
  registerQuery(listTeamCheckIns);
}
