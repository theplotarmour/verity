import { z } from "zod";
import { registerContribution } from "@/server/platform/contribution";
import { registerCommand, ValidationError, type CommandDefinition } from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { assertMutable, transition } from "@/server/platform/state";
import { diffFields, recordActivity } from "@/server/platform/audit";
import { ForbiddenError, hasPermission } from "@/server/platform/authorization";
import type { TenantScopedClient } from "@/server/platform/tenancy";
import { reserveUpload, confirmUpload, readUrlFor } from "@/server/platform/files";
import { notify } from "@/server/platform/notification";

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
export const ENTITY_COACHING_NOTE = "verity.outreach.coaching_note";
export const ENTITY_AI_INSIGHT = "verity.outreach.ai_insight";
export const ENTITY_DOMAIN_GROUP = "verity.outreach.domain_group";
export const ENTITY_DOMAIN = "verity.outreach.domain";
export const ENTITY_ATTRIBUTION_RECORD = "verity.outreach.attribution_record";
export const ENTITY_ESCALATION = "verity.outreach.escalation";
export const ENTITY_OPPORTUNITY = "verity.outreach.opportunity";
export const ENTITY_PROPOSAL = "verity.outreach.proposal";
export const ENTITY_CLOSED_CLIENT = "verity.outreach.closed_client";
export const ENTITY_ASSIGNMENT = "verity.outreach.assignment";
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

/** Closed set (spec §79): who may read a coaching note. */
const COACHING_NOTE_VISIBILITIES = ["JuniorVisible", "LeaderPrivate"] as const;

/**
 * Closed set (spec §78) — scoped down per lean-V1 to the queues that map
 * cleanly onto data this capability already has, not the full 12-queue
 * list. `StaleLeads` and `HighPriority` reuse `deriveLeadHealth`/
 * `qualityScore` rather than inventing a second scoring concept.
 */
const LEAD_QUEUES = ["New", "NeedsResearch", "Stale", "HighPriority", "AdvancePending"] as const;

/** Closed set (Task 106 Phase 8, master-context §85's permitted list). */
export const INSIGHT_KINDS = ["Summary", "NextStep", "Qualification"] as const;
export type InsightKind = (typeof INSIGHT_KINDS)[number];
/** Bumped whenever `insightPrompt` changes shape — stored on every row so a
 *  reader can tell which instructions produced which suggestion (§32). */
export const INSIGHT_PROMPT_VERSION = "2026-09-15.1";

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
 * Task 106 Phase B: append one attribution-history row. Called alongside
 * every write that already touches `leadOriginatorId`/`opportunityOwnerId`/
 * `closerId` — never a replacement for those fields, just the queryable
 * trail behind them (master prompt §60).
 */
async function recordAttribution(
  ctx: Parameters<CommandDefinition<unknown, unknown>["handler"]>[0],
  input: { leadId: string; role: "Originator" | "Owner" | "Closer"; partyId: string; reason?: string },
): Promise<void> {
  const changedByPartyId = await actorPartyId(ctx.tx, ctx.actor.userId);
  await ctx.tx.outreachAttributionRecord.create({
    data: {
      tenantId: ctx.actor.tenantId,
      leadId: input.leadId,
      role: input.role,
      partyId: input.partyId,
      changedByPartyId,
      reason: input.reason ?? null,
    },
  });
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
    domainId?: string;
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
    // Task 106 Phase A: the structured taxonomy leaf. `industry` stays
    // accepted for continuity with pre-Phase-A callers/tests, but a new
    // lead should carry this instead (module doc's "DO NOT store industry
    // only as arbitrary text" rule).
    domainId: z.string().uuid().optional(),
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
        domainId: input.domainId ?? null,
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
    await recordAttribution(ctx, { leadId: lead.id, role: "Originator", partyId: originatorId, reason: "Lead created" });
    await recordAttribution(ctx, { leadId: lead.id, role: "Owner", partyId: input.opportunityOwnerId, reason: "Lead created" });
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

    // Task 106 Phase D: materialize the stage-transition fact. `onConflict`
    // via the (tenantId, leadId) unique constraint makes each idempotent —
    // a lead can only ever have one Opportunity/ClosedClient row.
    if (input.toState === "opportunity") {
      await ctx.tx.outreachOpportunity.upsert({
        where: { tenantId_leadId: { tenantId: ctx.actor.tenantId, leadId: lead.id } },
        create: { tenantId: ctx.actor.tenantId, leadId: lead.id, teamId: lead.teamId, track: lead.track },
        update: {},
      });
    }
    if (input.toState === "proposal") {
      await ctx.tx.outreachProposal.create({
        data: { tenantId: ctx.actor.tenantId, leadId: lead.id },
      });
    }
    if (input.toState === "closed_won") {
      await recordAttribution(ctx, { leadId: lead.id, role: "Closer", partyId: closerId!, reason: "Lead closed won" });
      await ctx.tx.outreachClosedClient.upsert({
        where: { tenantId_leadId: { tenantId: ctx.actor.tenantId, leadId: lead.id } },
        create: {
          tenantId: ctx.actor.tenantId,
          leadId: lead.id,
          closerId: closerId!,
          advanceReceivedMinor: lead.advanceReceivedMinor,
        },
        update: {},
      });
    }

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
    await recordAttribution(ctx, {
      leadId: lead.id,
      role: "Owner",
      partyId: updated.opportunityOwnerId,
      reason: "Reassigned — 14-day inactivity rule",
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
    await recordAttribution(ctx, {
      leadId: fresh.id,
      role: "Originator",
      partyId: withinCreditWindow ? dead.leadOriginatorId : reactivatorId,
      reason: withinCreditWindow ? "Reactivated within 90-day credit window" : "Reactivated outside credit window",
    });
    await recordAttribution(ctx, { leadId: fresh.id, role: "Owner", partyId: input.newOwnerId, reason: "Reactivated" });

    return { result: { id: fresh.id }, events: [{ name: "verity.outreach.lead_reactivated", entityId: fresh.id, payload: { from: dead.id } }] };
  },
};

const ESCALATION_TYPES = ["Commercial", "Technical", "ClientIssue", "Attribution", "TeamIssue", "Other"] as const;
const ESCALATION_URGENCIES = ["Normal", "High", "Critical"] as const;
/** Task 106 Phase C — the OutreachEscalation lifecycle (master prompt §35). */
const ESCALATION_STATUSES = ["Open", "InReview", "Resolved"] as const;

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
    // Task 106 Phase C: the structured OPEN/IN REVIEW/RESOLVED record,
    // written alongside the lead's own flag fields (kept for existing UI).
    const escalation = await ctx.tx.outreachEscalation.create({
      data: {
        tenantId: ctx.actor.tenantId,
        leadId: lead.id,
        type: input.type ?? null,
        urgency: input.urgency ?? null,
        note: input.note,
        raisedByPartyId: actorId,
      },
    });

    // Task 106 Phase H: Junior -> Senior first (2026-09-13 doc §38-39), not
    // straight to Core — the recipient is this lead's own team leader/
    // co-leader, whoever that structurally is, never a role-name check.
    const team = await ctx.tx.outreachTeam.findUnique({ where: { id: lead.teamId } });
    const leaderPartyIds = team ? [team.leaderId, ...(team.coLeaderId ? [team.coLeaderId] : [])] : [];
    const recipients = leaderPartyIds.length
      ? await ctx.tx.user.findMany({ where: { partyId: { in: leaderPartyIds } }, select: { id: true } })
      : [];
    if (recipients.length > 0) {
      await notify(ctx.tx, {
        tenantId: ctx.actor.tenantId,
        key: "verity.outreach.escalation_raised",
        recipientIds: recipients.map((r) => r.id),
        variables: { company: lead.companyName, note: input.note },
        fallback: { subject: `Escalation: ${lead.companyName}`, body: input.note },
      });
    }

    return {
      result: { id: lead.id },
      events: [
        { name: "verity.outreach.lead_escalated", entityId: lead.id, payload: { escalationId: escalation.id } },
      ],
    };
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
    const actorId = await actorPartyId(ctx.tx, ctx.actor.userId);
    const openOnes = await ctx.tx.outreachEscalation.findMany({
      where: { leadId: lead.id, status: { in: ["Open", "InReview"] } },
      select: { id: true, raisedByPartyId: true },
    });
    await ctx.tx.outreachEscalation.updateMany({
      where: { leadId: lead.id, status: { in: ["Open", "InReview"] } },
      data: { status: "Resolved", resolvedByPartyId: actorId, resolvedAt: new Date() },
    });

    // Task 106 Phase H: tell whoever raised it that it's been handled.
    const raiserPartyIds = [...new Set(openOnes.map((e) => e.raisedByPartyId))];
    const recipients = raiserPartyIds.length
      ? await ctx.tx.user.findMany({ where: { partyId: { in: raiserPartyIds } }, select: { id: true } })
      : [];
    if (recipients.length > 0) {
      await notify(ctx.tx, {
        tenantId: ctx.actor.tenantId,
        key: "verity.outreach.escalation_resolved",
        recipientIds: recipients.map((r) => r.id),
        variables: { company: lead.companyName },
        fallback: { subject: `Escalation resolved: ${lead.companyName}`, body: "Your escalation has been handled." },
      });
    }

    return { result: { id: lead.id }, events: [{ name: "verity.outreach.escalation_resolved", entityId: lead.id }] };
  },
};

/** Moves an escalation to IN REVIEW — the first-line Senior acknowledging it before Core sees it (2026-09-13 doc §38-39). */
export const setEscalationInReview: CommandDefinition<{ escalationId: string }, { id: string }> = {
  key: "verity.outreach.set_escalation_in_review",
  entity: ENTITY_ESCALATION,
  verb: "Edit",
  input: z.object({ escalationId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const escalation = await ctx.tx.outreachEscalation.update({
      where: { id: input.escalationId },
      data: { status: "InReview" },
    });
    return { result: { id: escalation.id }, events: [] };
  },
};

/** The structured read: escalations by status, optionally scoped to a team via its leads. */
export const listEscalations: QueryDefinition<
  { teamId?: string; status?: (typeof ESCALATION_STATUSES)[number] },
  Array<Record<string, unknown>>
> = {
  key: "verity.outreach.list_escalations",
  entity: ENTITY_ESCALATION,
  input: z.object({ teamId: z.string().uuid().optional(), status: z.enum(ESCALATION_STATUSES).optional() }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    return ctx.tx.outreachEscalation.findMany({
      where: {
        ...(input.status ? { status: input.status } : {}),
        lead: input.teamId ? { teamId: input.teamId } : undefined,
      },
      include: { lead: { select: { id: true, companyName: true, teamId: true } } },
      orderBy: { raisedAt: "desc" },
    });
  },
};

export const listOutreachLeads: QueryDefinition<
  { teamId?: string; ownerId?: string; state?: string; leadId?: string },
  Array<Record<string, unknown>>
> = {
  key: "verity.outreach.list_leads",
  entity: ENTITY_LEAD,
  input: z.object({
    teamId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
    state: z.string().optional(),
    /// One lead by id (Phase 8: the agent reads a single record, not the book).
    leadId: z.string().uuid().optional(),
  }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    return ctx.tx.outreachLead.findMany({
      where: {
        ...(input.leadId ? { id: input.leadId } : {}),
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

/**
 * Shared shape for every Company-Core roll-up below (Task 106 Phase 7,
 * spec §84-85): an optional inclusive-from / exclusive-to window applied
 * to activity `occurredAt`, lead `createdAt` and `closedAt`. No window
 * means all-time — the pre-Phase-7 behaviour, unchanged.
 */
const WINDOW_INPUT = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  /** Task 106 Phase F (master prompt §60): Domain × Team / Domain × Channel
   *  matrices are this same query shape filtered to one domain, not a new
   *  primitive. Optional and additive — every existing caller is unaffected. */
  domainId: z.string().uuid().optional(),
});
type WindowInput = z.infer<typeof WINDOW_INPUT>;
function dateRange(input: WindowInput): { gte?: Date; lt?: Date } | undefined {
  if (!input.from && !input.to) return undefined;
  return { ...(input.from ? { gte: new Date(input.from) } : {}), ...(input.to ? { lt: new Date(input.to) } : {}) };
}
function isOpenPipeline(state: string): boolean {
  return !(TERMINAL_STATES as readonly string[]).includes(state) && state !== "closed_won";
}
/** Activity-type buckets every roll-up here counts the same way (the daily workbook's own columns). */
function tally(acts: Array<{ activityType: string }>) {
  return {
    outreach: acts.filter((a) => a.activityType === "FirstOutreach").length,
    followUps: acts.filter((a) => a.activityType === "FollowUp").length,
    responses: acts.filter((a) => a.activityType === "Response").length,
    meetings: acts.filter((a) => a.activityType === "MeetingBooked" || a.activityType === "MeetingCompleted").length,
    proposals: acts.filter((a) => a.activityType === "ProposalSent").length,
    pitchDecks: acts.filter((a) => a.activityType === "PitchDeck").length,
    businessResearch: acts.filter((a) => a.activityType === "BusinessResearch").length,
  };
}
/** Responses per first outreach, 0-1, or null when there is nothing to divide by. */
function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 1000 : null;
}

/**
 * Company Core's team-to-team comparison (master-context spec §8's own
 * table shape; 2026-09-13 doc §5 adds Leader and Target columns). Phase 7
 * adds the time window, the leader's name, the team's active Weekly
 * QualifiedProspects target for the window's start (the one number §5's
 * table shows as "Target"), and a response rate — same source facts, one
 * more derived column each, no stored aggregate.
 */
export const getTeamComparison: QueryDefinition<
  WindowInput,
  Array<{
    teamId: string;
    teamName: string;
    leaderName: string;
    memberCount: number;
    target: number | null;
    leads: number;
    outreach: number;
    followUps: number;
    responses: number;
    meetings: number;
    proposals: number;
    pitchDecks: number;
    businessResearch: number;
    responseRate: number | null;
    pipeline: number;
    closed: number;
  }>
> = {
  key: "verity.outreach.team_comparison",
  entity: ENTITY_TEAM,
  input: WINDOW_INPUT,
  handler: async (ctx, input) => {
    const range = dateRange(input);
    const at = input.from ? new Date(input.from) : new Date();
    const [teams, allLeads] = await Promise.all([
      ctx.tx.outreachTeam.findMany({ where: { active: true }, include: { memberships: { where: { active: true } } } }),
      ctx.tx.outreachLead.findMany(input.domainId ? { where: { domainId: input.domainId } } : undefined),
    ]);
    const teamIds = teams.map((t) => t.id);
    const [activities, leaders, targets] = await Promise.all([
      teamIds.length
        ? ctx.tx.outreachActivity.findMany({
            where: {
              lead: { teamId: { in: teamIds }, ...(input.domainId ? { domainId: input.domainId } : {}) },
              ...(range ? { occurredAt: range } : {}),
            },
            include: { lead: true },
          })
        : Promise.resolve([]),
      ctx.tx.party.findMany({ where: { id: { in: teams.map((t) => t.leaderId) } } }),
      teamIds.length
        ? ctx.tx.outreachTarget.findMany({
            where: {
              scope: "Team",
              teamId: { in: teamIds },
              period: "Weekly",
              metric: "QualifiedProspects",
              active: true,
              periodStart: { lte: at },
              periodEnd: { gte: at },
            },
          })
        : Promise.resolve([]),
    ]);
    const leaderName = new Map(leaders.map((p) => [p.id, p.displayName]));
    const targetFor = new Map(targets.map((t) => [t.teamId, t.targetValue]));
    const inWindow = (d: Date | null) => !range || (d != null && (!range.gte || d >= range.gte) && (!range.lt || d < range.lt));

    return teams.map((t) => {
      const teamLeads = allLeads.filter((l) => l.teamId === t.id);
      const acts = activities.filter((a) => a.lead.teamId === t.id);
      const counts = tally(acts);
      return {
        teamId: t.id,
        teamName: t.name,
        leaderName: leaderName.get(t.leaderId) ?? "Unknown",
        memberCount: t.memberships.length,
        target: targetFor.get(t.id) ?? null,
        leads: teamLeads.filter((l) => inWindow(l.createdAt)).length,
        ...counts,
        responseRate: rate(counts.responses, counts.outreach),
        // Open pipeline is a point-in-time fact, never windowed.
        pipeline: teamLeads.filter((l) => isOpenPipeline(l.state)).length,
        closed: teamLeads.filter((l) => l.state === "closed_won" && inWindow(l.closedAt)).length,
      };
    });
  },
};

// ---------------------------------------------------------------------------
// COMPANY PULSE + INTELLIGENCE — Task 106 Phase 7 (spec §84-85, §90;
// master-context §52-54; 2026-09-13 doc §4 "Company pulse"). Every number
// here is a read over the activity log and the lead table — derived, never
// stored (capability-builder skill's own source-of-truth rule).
// ---------------------------------------------------------------------------

/** The organisation-wide stat row at the top of the Core view (2026-09-13 doc §4). */
export const getCompanyPulse: QueryDefinition<
  WindowInput,
  {
    activeTeams: number;
    activeMembers: number;
    leads: number;
    outreach: number;
    followUps: number;
    responses: number;
    meetings: number;
    proposals: number;
    responseRate: number | null;
    activePipeline: number;
    closed: number;
  }
> = {
  key: "verity.outreach.company_pulse",
  entity: ENTITY_LEAD,
  input: WINDOW_INPUT,
  handler: async (ctx, input) => {
    const range = dateRange(input);
    const [teams, leads, activities, closed] = await Promise.all([
      ctx.tx.outreachTeam.findMany({ where: { active: true }, include: { memberships: { where: { active: true } } } }),
      ctx.tx.outreachLead.findMany({ select: { state: true, createdAt: true } }),
      ctx.tx.outreachActivity.findMany({ where: range ? { occurredAt: range } : {}, select: { activityType: true } }),
      ctx.tx.outreachLead.count({ where: { state: "closed_won", ...(range ? { closedAt: range } : {}) } }),
    ]);
    const counts = tally(activities);
    const memberIds = new Set(teams.flatMap((t) => t.memberships.map((m) => m.partyId)));
    return {
      activeTeams: teams.length,
      activeMembers: memberIds.size,
      leads: leads.filter((l) => !range || ((!range.gte || l.createdAt >= range.gte) && (!range.lt || l.createdAt < range.lt))).length,
      outreach: counts.outreach,
      followUps: counts.followUps,
      responses: counts.responses,
      meetings: counts.meetings,
      proposals: counts.proposals,
      responseRate: rate(counts.responses, counts.outreach),
      activePipeline: leads.filter((l) => isOpenPipeline(l.state)).length,
      closed,
    };
  },
};

type IntelligenceRow = {
  key: string;
  leads: number;
  outreach: number;
  responses: number;
  meetings: number;
  proposals: number;
  closed: number;
  responseRate: number | null;
  /** §53: "Do not optimize prematurely on tiny sample sizes." Below this many first outreaches the rate is shown but flagged. */
  thinSample: boolean;
};
const THIN_SAMPLE_BELOW = 20;

/**
 * Performance by domain (master-context §52; Task 106 Phase A rekeys this
 * off the structured taxonomy): "Which markets are actually converting?"
 * A lead created before Phase A may have no `domainId` — its legacy
 * free-text `industry` is used as the bucket key instead, so history isn't
 * silently dropped into "Unspecified" the moment this shipped.
 */
export const getVerticalIntelligence: QueryDefinition<WindowInput, IntelligenceRow[]> = {
  key: "verity.outreach.vertical_intelligence",
  entity: ENTITY_LEAD,
  input: WINDOW_INPUT,
  handler: async (ctx, input) => {
    const range = dateRange(input);
    const [leads, activities] = await Promise.all([
      ctx.tx.outreachLead.findMany({
        select: { id: true, industry: true, state: true, createdAt: true, closedAt: true, domain: { select: { name: true } } },
      }),
      ctx.tx.outreachActivity.findMany({ where: range ? { occurredAt: range } : {}, select: { leadId: true, activityType: true } }),
    ]);
    const industryOf = new Map(leads.map((l) => [l.id, l.domain?.name || l.industry?.trim() || "Unspecified"]));
    const inWindow = (d: Date | null) => !range || (d != null && (!range.gte || d >= range.gte) && (!range.lt || d < range.lt));
    const rows = new Map<string, { leads: number; closed: number; acts: Array<{ activityType: string }> }>();
    const bucket = (key: string) => rows.get(key) ?? rows.set(key, { leads: 0, closed: 0, acts: [] }).get(key)!;
    for (const l of leads) {
      const b = bucket(industryOf.get(l.id)!);
      if (inWindow(l.createdAt)) b.leads += 1;
      if (l.state === "closed_won" && inWindow(l.closedAt)) b.closed += 1;
    }
    for (const a of activities) bucket(industryOf.get(a.leadId) ?? "Unspecified").acts.push(a);
    return [...rows.entries()]
      .map(([key, b]) => {
        const c = tally(b.acts);
        return {
          key,
          leads: b.leads,
          outreach: c.outreach,
          responses: c.responses,
          meetings: c.meetings,
          proposals: c.proposals,
          closed: b.closed,
          responseRate: rate(c.responses, c.outreach),
          thinSample: c.outreach < THIN_SAMPLE_BELOW,
        };
      })
      .filter((r) => r.leads > 0 || r.outreach > 0)
      .sort((a, b) => b.leads - a.leads || a.key.localeCompare(b.key));
  },
};

/**
 * Performance by channel (master-context §53). A lead has no single channel
 * — each activity does — so `leads` here means distinct leads touched on
 * that channel, and `closed` means distinct closed-won leads that were
 * ever contacted on it (attribution is shared, not split).
 */
export const getChannelIntelligence: QueryDefinition<WindowInput, IntelligenceRow[]> = {
  key: "verity.outreach.channel_intelligence",
  entity: ENTITY_ACTIVITY,
  input: WINDOW_INPUT,
  handler: async (ctx, input) => {
    const range = dateRange(input);
    const activities = await ctx.tx.outreachActivity.findMany({
      where: {
        ...(range ? { occurredAt: range } : {}),
        ...(input.domainId ? { lead: { domainId: input.domainId } } : {}),
      },
      select: { leadId: true, channel: true, activityType: true, lead: { select: { state: true } } },
    });
    const rows = new Map<string, { leads: Set<string>; closed: Set<string>; acts: Array<{ activityType: string }> }>();
    for (const a of activities) {
      const b = rows.get(a.channel) ?? rows.set(a.channel, { leads: new Set(), closed: new Set(), acts: [] }).get(a.channel)!;
      b.leads.add(a.leadId);
      if (a.lead.state === "closed_won") b.closed.add(a.leadId);
      b.acts.push(a);
    }
    return [...rows.entries()]
      .map(([key, b]) => {
        const c = tally(b.acts);
        return {
          key,
          leads: b.leads.size,
          outreach: c.outreach,
          responses: c.responses,
          meetings: c.meetings,
          proposals: c.proposals,
          closed: b.closed.size,
          responseRate: rate(c.responses, c.outreach),
          thinSample: c.outreach < THIN_SAMPLE_BELOW,
        };
      })
      .sort((a, b) => b.outreach - a.outreach || a.key.localeCompare(b.key));
  },
};

/**
 * Bottleneck detection (master-context spec §63) — a stage-to-stage ratio
 * reading over already-agreed facts. Lived in `reports/page.tsx` since 105
 * Phase 5; moved here so the Intelligence page and Reports read one rule.
 */
export function detectBottleneck(counts: {
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
 * Handbook Ch. 22's 14 linear stages (as seeded in 20260912120000) in order, for reach-counting: a lead
 * at `proposal` has necessarily passed `contacted`. Counting "reached or
 * beyond" is what makes stage-to-stage conversion a ratio of the same
 * population, not of whoever happens to sit at each stage right now.
 */
const LINEAR_STAGES = [
  "research",
  "prospect",
  "contacted",
  "responded",
  "qualified",
  "discovery",
  "opportunity",
  "handoff",
  "proposal",
  "negotiation",
  "verbal_yes",
  "invoice_requested",
  "advance_received",
  "closed_won",
] as const;

/** Stage reach + stage-to-stage conversion + the §63 bottleneck reading (spec §90). */
export const getConversionFunnel: QueryDefinition<
  WindowInput,
  { stages: Array<{ key: string; atStage: number; reached: number; conversionFromPrevious: number | null }>; bottleneck: string | null }
> = {
  key: "verity.outreach.conversion_funnel",
  entity: ENTITY_LEAD,
  input: WINDOW_INPUT,
  handler: async (ctx, input) => {
    const range = dateRange(input);
    const leads = await ctx.tx.outreachLead.findMany({
      where: range ? { createdAt: range } : {},
      select: { state: true },
    });
    const index = new Map(LINEAR_STAGES.map((k, i) => [k, i]));
    // A terminal/negative lead still reached whatever stage it left from —
    // that is unknown from `state` alone, so it counts only at `research`.
    const rank = (state: string) => index.get(state as (typeof LINEAR_STAGES)[number]) ?? 0;
    const stages = LINEAR_STAGES.map((key, i) => {
      const reached = leads.filter((l) => rank(l.state) >= i).length;
      const atStage = leads.filter((l) => l.state === key).length;
      return { key, atStage, reached, conversionFromPrevious: i === 0 ? null : null as number | null };
    });
    for (let i = 1; i < stages.length; i += 1) {
      stages[i]!.conversionFromPrevious = rate(stages[i]!.reached, stages[i - 1]!.reached);
    }
    const reachedAt = (key: (typeof LINEAR_STAGES)[number]) => stages[index.get(key)!]!.reached;
    return {
      stages,
      bottleneck: detectBottleneck({
        prospected: reachedAt("prospect"),
        contacted: reachedAt("contacted"),
        responded: reachedAt("responded"),
        qualifiedPlus: reachedAt("qualified"),
        proposal: reachedAt("proposal"),
        closedWon: reachedAt("closed_won"),
      }),
    };
  },
};

// ---------------------------------------------------------------------------
// DOMAIN INTELLIGENCE WORKSPACE — Task 109 Phase F (master prompt §42-50):
// "a genuine domain intelligence workspace, not domain as a table filter."
// ---------------------------------------------------------------------------

const DOMAIN_INPUT = z.object({ domainId: z.string().uuid(), from: z.string().datetime().optional(), to: z.string().datetime().optional() });

/** Same shape as `getConversionFunnel`, filtered to one domain (Phase F). */
export const getDomainFunnel: QueryDefinition<
  z.infer<typeof DOMAIN_INPUT>,
  { stages: Array<{ key: string; atStage: number; reached: number; conversionFromPrevious: number | null }>; bottleneck: string | null }
> = {
  key: "verity.outreach.domain_funnel",
  entity: ENTITY_LEAD,
  input: DOMAIN_INPUT,
  handler: async (ctx, input) => {
    const range = dateRange(input);
    const leads = await ctx.tx.outreachLead.findMany({
      where: { domainId: input.domainId, ...(range ? { createdAt: range } : {}) },
      select: { state: true },
    });
    const index = new Map(LINEAR_STAGES.map((k, i) => [k, i]));
    const rank = (state: string) => index.get(state as (typeof LINEAR_STAGES)[number]) ?? 0;
    const stages = LINEAR_STAGES.map((key, i) => {
      const reached = leads.filter((l) => rank(l.state) >= i).length;
      const atStage = leads.filter((l) => l.state === key).length;
      return { key, atStage, reached, conversionFromPrevious: null as number | null };
    });
    for (let i = 1; i < stages.length; i += 1) {
      stages[i]!.conversionFromPrevious = rate(stages[i]!.reached, stages[i - 1]!.reached);
    }
    const reachedAt = (key: (typeof LINEAR_STAGES)[number]) => stages[index.get(key)!]!.reached;
    return {
      stages,
      bottleneck: detectBottleneck({
        prospected: reachedAt("prospect"),
        contacted: reachedAt("contacted"),
        responded: reachedAt("responded"),
        qualifiedPlus: reachedAt("qualified"),
        proposal: reachedAt("proposal"),
        closedWon: reachedAt("closed_won"),
      }),
    };
  },
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}
function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000);
}
function stat(values: number[]): { average: number | null; median: number | null; sampleSize: number } {
  return {
    average: values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10 : null,
    median: median(values) !== null ? Math.round(median(values)! * 10) / 10 : null,
    sampleSize: values.length,
  };
}

/**
 * Days between the checkpoints Phase D actually materializes (Phase F).
 *
 * **Known gap, stated rather than papered over**: this is coarser than the
 * master prompt's ideal Prospect→Contact→Response→Meeting→Proposal→Close
 * breakdown — only Lead created, Opportunity created, Proposal sent, and
 * Closed are timestamped facts today. Earlier stage transitions live only in
 * `OutreachLead.state` plus the generic audit trail, not as their own
 * timestamped rows (an open decision in `taskplans/109_*`, not resolved here).
 */
export const getDomainVelocity: QueryDefinition<
  { domainId: string },
  {
    leadToOpportunity: { average: number | null; median: number | null; sampleSize: number };
    opportunityToProposal: { average: number | null; median: number | null; sampleSize: number };
    proposalToClosed: { average: number | null; median: number | null; sampleSize: number };
    leadToClosed: { average: number | null; median: number | null; sampleSize: number };
    coarserThanIdeal: true;
  }
> = {
  key: "verity.outreach.domain_velocity",
  entity: ENTITY_LEAD,
  input: z.object({ domainId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const leads = await ctx.tx.outreachLead.findMany({
      where: { domainId: input.domainId },
      select: {
        id: true,
        createdAt: true,
        opportunity: { select: { createdAt: true } },
        proposals: { select: { sentAt: true }, orderBy: { sentAt: "asc" }, take: 1 },
        closedClient: { select: { closedAt: true } },
      },
    });
    const leadToOpportunity: number[] = [];
    const opportunityToProposal: number[] = [];
    const proposalToClosed: number[] = [];
    const leadToClosed: number[] = [];
    for (const l of leads) {
      const opp = l.opportunity[0]?.createdAt ?? null;
      const firstProposal = l.proposals[0]?.sentAt ?? null;
      const closed = l.closedClient[0]?.closedAt ?? null;
      if (opp) leadToOpportunity.push(daysBetween(l.createdAt, opp));
      if (opp && firstProposal) opportunityToProposal.push(daysBetween(opp, firstProposal));
      if (firstProposal && closed) proposalToClosed.push(daysBetween(firstProposal, closed));
      if (closed) leadToClosed.push(daysBetween(l.createdAt, closed));
    }
    return {
      leadToOpportunity: stat(leadToOpportunity),
      opportunityToProposal: stat(opportunityToProposal),
      proposalToClosed: stat(proposalToClosed),
      leadToClosed: stat(leadToClosed),
      coarserThanIdeal: true,
    };
  },
};

/** Open leads bucketed by staleness, reusing `deriveLeadHealth`'s threshold shape (Phase F). Domain optional — omitted means company-wide. */
export const getDomainAging: QueryDefinition<
  { domainId?: string },
  { within7d: number; over7d: number; over14d: number; over30d: number; leads: Array<{ id: string; companyName: string; daysIdle: number }> }
> = {
  key: "verity.outreach.domain_aging",
  entity: ENTITY_LEAD,
  input: z.object({ domainId: z.string().uuid().optional() }),
  handler: async (ctx, input) => {
    const leads = await ctx.tx.outreachLead.findMany({
      where: { ...(input.domainId ? { domainId: input.domainId } : {}), state: { notIn: [...TERMINAL_STATES, "closed_won"] } },
      select: { id: true, companyName: true, lastActivityAt: true, createdAt: true },
    });
    const now = Date.now();
    const rows = leads.map((l) => ({
      id: l.id,
      companyName: l.companyName,
      daysIdle: Math.floor((now - (l.lastActivityAt ?? l.createdAt).getTime()) / (24 * 60 * 60 * 1000)),
    }));
    return {
      within7d: rows.filter((r) => r.daysIdle <= 7).length,
      over7d: rows.filter((r) => r.daysIdle > 7 && r.daysIdle <= 14).length,
      over14d: rows.filter((r) => r.daysIdle > 14 && r.daysIdle <= 30).length,
      over30d: rows.filter((r) => r.daysIdle > 30).length,
      leads: rows.filter((r) => r.daysIdle > 7).sort((a, b) => b.daysIdle - a.daysIdle),
    };
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
// TEAM LEADER OPERATIONS (Task 106 Phase 6) — lead review queues, coaching
// notes. Target distribution reuses Phase 3's setOutreachTarget/
// listOutreachTargets as-is; weekly report depth is the member-breakdown
// query right after getTeamWeeklyRollup below.
// ---------------------------------------------------------------------------

/**
 * Lead review queues (spec §78, scoped per the LEAD_QUEUES comment).
 * Query-layer filters over existing OutreachLead data — no new schema.
 */
export const listLeadQueue: QueryDefinition<{ teamId: string; queue: (typeof LEAD_QUEUES)[number] }, Array<Record<string, unknown>>> = {
  key: "verity.outreach.lead_queue",
  entity: ENTITY_LEAD,
  input: z.object({ teamId: z.string().uuid(), queue: z.enum(LEAD_QUEUES) }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    const active = { teamId: input.teamId, state: { notIn: [...TERMINAL_STATES, "closed_won"] } };

    switch (input.queue) {
      case "New": {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        return ctx.tx.outreachLead.findMany({ where: { ...active, createdAt: { gte: threeDaysAgo } }, orderBy: { createdAt: "desc" } });
      }
      case "NeedsResearch": {
        const leads = await ctx.tx.outreachLead.findMany({ where: active });
        const withResearch = new Set(
          (await ctx.tx.outreachResearchEntry.findMany({ where: { leadId: { in: leads.map((l) => l.id) } }, select: { leadId: true } })).map(
            (r) => r.leadId,
          ),
        );
        return leads.filter((l) => !withResearch.has(l.id));
      }
      case "Stale": {
        const leads = await ctx.tx.outreachLead.findMany({ where: active });
        const states = await ctx.tx.stateDefinition.findMany({ where: { entityKey: ENTITY_LEAD } });
        const category = new Map(states.map((s) => [s.key, s.category]));
        return leads.filter(
          (l) => deriveLeadHealth({ category: category.get(l.state) ?? "Draft", lastActivityAt: l.lastActivityAt, nextActionAt: l.nextActionAt, createdAt: l.createdAt }) === "Stale",
        );
      }
      case "HighPriority":
        return ctx.tx.outreachLead.findMany({ where: { ...active, qualityScore: { gte: 8 } }, orderBy: { qualityScore: "desc" } });
      case "AdvancePending":
        return ctx.tx.outreachLead.findMany({ where: { ...active, state: { in: ["invoice_requested", "advance_received"] } } });
    }
  },
};

/**
 * Coaching notes (spec §79) — append-only. `LeaderPrivate` notes never
 * reach the query result for the Junior they're about; only a team leader
 * (structurally, same leaderId/coLeaderId check as everywhere else in
 * this file) or Founder sees the full set.
 */
export const createCoachingNote: CommandDefinition<
  { teamId: string; aboutPartyId: string; leadId?: string; content: string; visibility?: (typeof COACHING_NOTE_VISIBILITIES)[number] },
  { id: string }
> = {
  key: "verity.outreach.create_coaching_note",
  entity: ENTITY_COACHING_NOTE,
  verb: "Create",
  input: z.object({
    teamId: z.string().uuid(),
    aboutPartyId: z.string().uuid(),
    leadId: z.string().uuid().optional(),
    content: z.string().min(1),
    visibility: z.enum(COACHING_NOTE_VISIBILITIES).optional(),
  }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    if (input.leadId) await requireLead(ctx.tx, input.leadId);
    const author = await actorPartyId(ctx.tx, ctx.actor.userId);
    const note = await ctx.tx.outreachCoachingNote.create({
      data: {
        tenantId: ctx.actor.tenantId,
        teamId: input.teamId,
        leadId: input.leadId ?? null,
        aboutPartyId: input.aboutPartyId,
        authorPartyId: author,
        content: input.content,
        visibility: input.visibility ?? "JuniorVisible",
      },
    });
    return { result: { id: note.id }, events: [{ name: "verity.outreach.coaching_note_added", entityId: note.id }] };
  },
};

export const listCoachingNotes: QueryDefinition<{ teamId: string; aboutPartyId: string }, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_coaching_notes",
  entity: ENTITY_COACHING_NOTE,
  input: z.object({ teamId: z.string().uuid(), aboutPartyId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const actorParty = await actorPartyId(ctx.tx, ctx.actor.userId);
    const team = await ctx.tx.outreachTeam.findUniqueOrThrow({ where: { id: input.teamId } });
    const isLeaderOfThisTeam = team.leaderId === actorParty || team.coLeaderId === actorParty;
    // Same "is this Company Core" structural signal used elsewhere in this
    // file (outreach/page.tsx's canPostDirection) — Create on the
    // Founder-only Direction entity, reused rather than inventing a
    // second role-detection primitive.
    const isFounder = await hasPermission(ctx.tx, ctx.actor.roleId, "Create", ENTITY_DIRECTION);

    if (!isLeaderOfThisTeam && !isFounder) {
      // A non-leader may only read their own JuniorVisible notes — never
      // another Junior's, and never a LeaderPrivate note about themselves.
      if (actorParty !== input.aboutPartyId) throw new ForbiddenError("E_FORBIDDEN: cannot view another person's coaching notes");
      return ctx.tx.outreachCoachingNote.findMany({
        where: { teamId: input.teamId, aboutPartyId: input.aboutPartyId, visibility: "JuniorVisible" },
        orderBy: { createdAt: "desc" },
      });
    }
    return ctx.tx.outreachCoachingNote.findMany({
      where: { teamId: input.teamId, aboutPartyId: input.aboutPartyId },
      orderBy: { createdAt: "desc" },
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

/**
 * Weekly report depth (Task 106 Phase 6, spec §80-81): per-member counts
 * over the same range `getTeamWeeklyRollup` aggregates — so a Senior's
 * Weekly Team Report can show who did what, not just the team total.
 */
export const getTeamWeeklyMemberBreakdown: QueryDefinition<
  { teamId: string; weekStart: string; weekEnd: string },
  Array<{ partyId: string; name: string; leads: number; outreach: number; responses: number; closed: number }>
> = {
  key: "verity.outreach.team_weekly_member_breakdown",
  entity: ENTITY_LEAD,
  input: z.object({ teamId: z.string().uuid(), weekStart: z.string().datetime(), weekEnd: z.string().datetime() }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    const range = { gte: new Date(input.weekStart), lt: new Date(input.weekEnd) };
    const team = await ctx.tx.outreachTeam.findUniqueOrThrow({
      where: { id: input.teamId },
      include: { memberships: { where: { active: true } } },
    });
    const memberPartyIds = [
      team.leaderId,
      ...(team.coLeaderId ? [team.coLeaderId] : []),
      ...team.memberships.map((m) => m.partyId),
    ];
    const [parties, leads, activities] = await Promise.all([
      ctx.tx.party.findMany({ where: { id: { in: memberPartyIds } } }),
      ctx.tx.outreachLead.findMany({ where: { teamId: input.teamId, createdAt: range } }),
      ctx.tx.outreachActivity.findMany({ where: { occurredAt: range, lead: { teamId: input.teamId } } }),
    ]);
    const partyName = new Map(parties.map((p) => [p.id, p.displayName]));

    return memberPartyIds.map((partyId) => ({
      partyId,
      name: partyName.get(partyId) ?? "Unknown",
      leads: leads.filter((l) => l.leadOriginatorId === partyId).length,
      outreach: activities.filter((a) => a.actorPartyId === partyId && a.activityType === "FirstOutreach").length,
      responses: activities.filter((a) => a.actorPartyId === partyId && a.activityType === "Response").length,
      closed: leads.filter((l) => l.leadOriginatorId === partyId && l.state === "closed_won").length,
    }));
  },
};

// ---------------------------------------------------------------------------
// AI INSIGHTS — Task 106 Phase 8 (master-context §85; §32-33 provenance).
//
// The LLM turn itself runs OUTSIDE any command (it is a network call that
// may take seconds; a command's transaction is not the place for it — the
// same reasoning `src/server/actions/people.ts` gives for Supabase Auth).
// `src/server/actions/outreach.ts` orchestrates: authorize the lead read
// as the actor, run `runAgentTurn` (Task 84 — every read it makes goes
// through `enforcePolicy()` as the same human, so nothing outside their
// access can reach the model), then persist through `recordAiInsight`.
// This file owns the prompt, the command and the query, nothing provider-
// shaped: `agent-chat.ts` stays the only module that knows an LLM exists.
// ---------------------------------------------------------------------------

/**
 * The task the agent is given. It is told the lead id and which reads to
 * make; it is NOT handed any record content here — it must query, so the
 * grounding cache (Task 84 area 4) sees every id and the turn's tool-call
 * record is a true list of what it was grounded on. §85's never-list is
 * restated in the model's own instructions, not merely assumed.
 */
/** The only tools an insight turn is given (`runAgentTurn`'s `toolKeys`) — the prompt's "use ONLY these" is enforced, not requested. */
export const INSIGHT_TOOL_KEYS = [
  "verity.outreach.list_leads",
  "verity.outreach.lead_timeline",
  "verity.outreach.list_contacts",
  "verity.outreach.list_research",
] as const;

export function insightPrompt(kind: InsightKind, leadId: string): string {
  const reads =
    `Use ONLY these tools, in this order, on lead id ${leadId}: ` +
    `verity.outreach.list_leads (with leadId set to this lead), verity.outreach.lead_timeline, ` +
    `verity.outreach.list_contacts, verity.outreach.list_research. ` +
    `Do not call any command. Do not call any other query.`;
  const never =
    "Never invent facts, business problems or buying signals; never claim a deal is closed; " +
    "never make a commercial commitment; never draft a message to send. If the records are too thin " +
    "to say something, say exactly that in one sentence.";
  const ask: Record<InsightKind, string> = {
    Summary:
      "Write a 3-5 sentence plain-English summary of this prospect for a colleague picking it up cold: " +
      "who they are, why we think they're relevant, what has happened so far, and where it stands. Cite only what the records say.",
    NextStep:
      "Suggest the single most useful next action for the opportunity owner, in 2-3 sentences, and say which record " +
      "(an activity, a contact, a research note) makes you suggest it. If the lead already has a next action set, say whether it still fits and why.",
    Qualification:
      "Assess fit against the PlotArmour tracks (Agency / Verity / Both) using only the recorded research and conversation. " +
      "Give a one-line verdict, then 2-4 bullet reasons each tied to a record. State plainly what is unknown.",
  };
  return `${reads}\n\n${ask[kind]}\n\n${never}\n\nReply in plain prose. No headings, no JSON.`;
}

/**
 * Persist a suggestion the orchestrator already obtained. Called with
 * `channel: "human"` by the action — the human asked for it and is the
 * requester of record; the model's own reads were the `agent`-channel part.
 */
export const recordAiInsight: CommandDefinition<
  { leadId: string; kind: InsightKind; content: string; model: string; promptVersion: string; sourceReads: string[] },
  { id: string }
> = {
  key: "verity.outreach.record_ai_insight",
  entity: ENTITY_AI_INSIGHT,
  verb: "Create",
  input: z.object({
    leadId: z.string().uuid(),
    kind: z.enum(INSIGHT_KINDS),
    content: z.string().trim().min(1).max(8000),
    model: z.string().min(1).max(200),
    promptVersion: z.string().min(1).max(40),
    sourceReads: z.array(z.string().min(1).max(200)).max(20),
  }),
  handler: async (ctx, input) => {
    const lead = await ctx.tx.outreachLead.findUnique({ where: { id: input.leadId } });
    if (!lead) throw new ValidationError("E_VALIDATION: lead does not exist");
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, lead.teamId);
    const requestedByPartyId = await actorPartyId(ctx.tx, ctx.actor.userId);
    const row = await ctx.tx.outreachAiInsight.create({
      data: {
        tenantId: ctx.actor.tenantId,
        leadId: input.leadId,
        kind: input.kind,
        content: input.content,
        model: input.model,
        promptVersion: input.promptVersion,
        sourceReads: input.sourceReads,
        requestedByPartyId,
      },
    });
    return { result: { id: row.id }, events: [{ name: "verity.outreach.ai_insight_recorded", entityId: row.id }] };
  },
};

export const listAiInsights: QueryDefinition<{ leadId: string }, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_ai_insights",
  entity: ENTITY_AI_INSIGHT,
  input: z.object({ leadId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const lead = await ctx.tx.outreachLead.findUnique({ where: { id: input.leadId } });
    if (!lead) return [];
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, lead.teamId);
    return ctx.tx.outreachAiInsight.findMany({ where: { leadId: input.leadId }, orderBy: { createdAt: "desc" }, take: 10 });
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
    priorityIndustries?: string[];
    secondaryOpportunity?: string;
    geographicFocus?: string;
    targetCompanyProfile?: string;
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
    // Task 106 Phase 7 (spec §91). Industries are a list so vertical
    // intelligence can match a lead's `industry` without parsing copy.
    priorityIndustries: z.array(z.string().trim().min(1)).max(20).optional(),
    secondaryOpportunity: z.string().optional(),
    geographicFocus: z.string().optional(),
    targetCompanyProfile: z.string().optional(),
  }),
  handler: async (ctx, input) => {
    const postedById = await actorPartyId(ctx.tx, ctx.actor.userId);
    // APPEND-ONLY (ADR-009): a new direction is a new fact that supersedes
    // the old one by being later — nothing on the old row changes. The
    // table's own migration enforces this (SELECT + INSERT policies, a
    // reject_mutation trigger), which is why the earlier "close the prior
    // Active row" UPDATE here silently did nothing (Phase 7 correction).
    const direction = await ctx.tx.outreachDirection.create({
      data: {
        tenantId: ctx.actor.tenantId,
        weekLabel: input.weekLabel,
        priorityVertical: input.priorityVertical ?? null,
        primaryTrack: input.primaryTrack ?? "Undetermined",
        companyProspectingTarget: input.companyProspectingTarget ?? null,
        strategicNote: input.strategicNote ?? null,
        priorityIndustries: input.priorityIndustries ?? [],
        secondaryOpportunity: input.secondaryOpportunity ?? null,
        geographicFocus: input.geographicFocus ?? null,
        targetCompanyProfile: input.targetCompanyProfile ?? null,
        postedById,
      },
    });
    return { result: { id: direction.id }, events: [{ name: "verity.outreach.direction_posted", entityId: direction.id }] };
  },
};

/** Derived: the latest posted direction is the current one; no stored flag. */
export const getCurrentDirection: QueryDefinition<Record<string, never>, Record<string, unknown> | null> = {
  key: "verity.outreach.current_direction",
  entity: ENTITY_DIRECTION,
  input: z.object({}),
  handler: async (ctx) => {
    const latest = await ctx.tx.outreachDirection.findFirst({ orderBy: { postedAt: "desc" } });
    return latest ? { ...latest, status: "Active", closedAt: null } : null;
  },
};

/**
 * History (§66) newest first, each row carrying its derived `status` and
 * `closedAt` — the moment the next direction was posted — so a reader can
 * see how long each held without a column nothing could maintain.
 */
export const listDirections: QueryDefinition<Record<string, never>, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_directions",
  entity: ENTITY_DIRECTION,
  input: z.object({}),
  handler: async (ctx) => {
    const rows = await ctx.tx.outreachDirection.findMany({ orderBy: { postedAt: "desc" }, take: 20 });
    return rows.map((d, i) => ({
      ...d,
      status: i === 0 ? "Active" : "Closed",
      closedAt: i === 0 ? null : rows[i - 1]!.postedAt,
    }));
  },
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
// DOMAIN TAXONOMY — Task 106 Phase A (master prompt §6: "DOMAIN GROUP ->
// DOMAIN", "must be database-driven", "do not hardcode"). Seeded once per
// tenant by migration 20260917100000; these are the read/manage surface.
// Create/Edit are Founders-only by grant (migration's own permission rows) —
// "allow future Core-level taxonomy management" without overbuilding it.
// ---------------------------------------------------------------------------

/** Every group with its domains, ordered — the shape a picker needs in one read. */
export const listDomainTaxonomy: QueryDefinition<
  Record<string, never>,
  Array<{ id: string; name: string; domains: Array<{ id: string; name: string }> }>
> = {
  key: "verity.outreach.list_domain_taxonomy",
  entity: ENTITY_DOMAIN_GROUP,
  input: z.object({}),
  handler: async (ctx) => {
    const groups = await ctx.tx.outreachDomainGroup.findMany({
      orderBy: { order: "asc" },
      include: { domains: { orderBy: { order: "asc" }, select: { id: true, name: true } } },
    });
    return groups.map((g) => ({ id: g.id, name: g.name, domains: g.domains }));
  },
};

export const createOutreachDomainGroup: CommandDefinition<{ name: string; order?: number }, { id: string }> = {
  key: "verity.outreach.create_domain_group",
  entity: ENTITY_DOMAIN_GROUP,
  verb: "Create",
  input: z.object({ name: z.string().min(1), order: z.number().int().optional() }),
  handler: async (ctx, input) => {
    const group = await ctx.tx.outreachDomainGroup.create({
      data: { tenantId: ctx.actor.tenantId, name: input.name, order: input.order ?? 0 },
    });
    return { result: { id: group.id }, events: [{ name: "verity.outreach.domain_group_created", entityId: group.id }] };
  },
};

export const createOutreachDomain: CommandDefinition<{ groupId: string; name: string; order?: number }, { id: string }> = {
  key: "verity.outreach.create_domain",
  entity: ENTITY_DOMAIN,
  verb: "Create",
  input: z.object({ groupId: z.string().uuid(), name: z.string().min(1), order: z.number().int().optional() }),
  handler: async (ctx, input) => {
    const domain = await ctx.tx.outreachDomain.create({
      data: { tenantId: ctx.actor.tenantId, groupId: input.groupId, name: input.name, order: input.order ?? 0 },
    });
    return { result: { id: domain.id }, events: [{ name: "verity.outreach.domain_created", entityId: domain.id }] };
  },
};

/** Rename only — moving a domain to a different group is deliberately not offered here (would silently reclassify every lead that carries it). */
export const renameOutreachDomain: CommandDefinition<{ domainId: string; name: string }, { id: string }> = {
  key: "verity.outreach.rename_domain",
  entity: ENTITY_DOMAIN,
  verb: "Edit",
  input: z.object({ domainId: z.string().uuid(), name: z.string().min(1) }),
  handler: async (ctx, input) => {
    const domain = await ctx.tx.outreachDomain.update({
      where: { id: input.domainId },
      data: { name: input.name },
    });
    return { result: { id: domain.id }, events: [{ name: "verity.outreach.domain_renamed", entityId: domain.id }] };
  },
};

// ---------------------------------------------------------------------------
// ASSIGNMENT — Task 106 Phase E (master prompt §30: "Healthcare -> Shreya +
// Mehak"). A Team Leader (Founders included, per their company-wide reach)
// hands a domain/domain-group/track/geography slice to a member.
// ---------------------------------------------------------------------------

const ASSIGNMENT_SCOPES = ["Domain", "DomainGroup", "Track", "Geography"] as const;

export const createAssignment: CommandDefinition<
  { teamId: string; partyId: string; scope: (typeof ASSIGNMENT_SCOPES)[number]; value: string },
  { id: string }
> = {
  key: "verity.outreach.create_assignment",
  entity: ENTITY_ASSIGNMENT,
  verb: "Create",
  input: z.object({
    teamId: z.string().uuid(),
    partyId: z.string().uuid(),
    scope: z.enum(ASSIGNMENT_SCOPES),
    value: z.string().min(1),
  }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    const assignedByPartyId = await actorPartyId(ctx.tx, ctx.actor.userId);
    const assignment = await ctx.tx.outreachAssignment.create({
      data: {
        tenantId: ctx.actor.tenantId,
        teamId: input.teamId,
        partyId: input.partyId,
        scope: input.scope,
        value: input.value,
        assignedByPartyId,
      },
    });
    return { result: { id: assignment.id }, events: [{ name: "verity.outreach.assignment_created", entityId: assignment.id }] };
  },
};

/** Soft-removes — deactivates, never deletes, so "who was assigned what and when" stays intact. */
export const deactivateAssignment: CommandDefinition<{ assignmentId: string }, { id: string }> = {
  key: "verity.outreach.deactivate_assignment",
  entity: ENTITY_ASSIGNMENT,
  verb: "Edit",
  input: z.object({ assignmentId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const assignment = await ctx.tx.outreachAssignment.findUniqueOrThrow({ where: { id: input.assignmentId } });
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, assignment.teamId);
    await ctx.tx.outreachAssignment.update({ where: { id: assignment.id }, data: { active: false } });
    return { result: { id: assignment.id }, events: [{ name: "verity.outreach.assignment_deactivated", entityId: assignment.id }] };
  },
};

export const listTeamAssignments: QueryDefinition<{ teamId?: string; partyId?: string }, Array<Record<string, unknown>>> = {
  key: "verity.outreach.list_assignments",
  entity: ENTITY_ASSIGNMENT,
  input: z.object({ teamId: z.string().uuid().optional(), partyId: z.string().uuid().optional() }),
  handler: async (ctx, input) => {
    await assertTeamScopeAllowed(ctx.tx, ctx.actor.userId, input.teamId);
    return ctx.tx.outreachAssignment.findMany({
      where: {
        active: true,
        ...(input.teamId ? { teamId: input.teamId } : {}),
        ...(input.partyId ? { partyId: input.partyId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
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
      // Company Core only (Task 106 Phase 7, spec §90): Create on Direction
      // is the same structural "this is Core" signal the Outreach page uses.
      { href: "/outreach/intelligence", label: "Intelligence", group: "Overview", order: 34, icon: "overview",
        requiresEntity: ENTITY_DIRECTION, requiresVerb: "Create", shells: ["platform", "operations"] },
      // Task 109 Phase F: same Core-only structural signal as Intelligence above.
      { href: "/outreach/domains", label: "Domains", group: "Overview", order: 35, icon: "overview",
        requiresEntity: ENTITY_DIRECTION, requiresVerb: "Create", shells: ["platform", "operations"] },
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
  registerCommand(createCoachingNote);
  registerCommand(recordAiInsight);
  registerCommand(createOutreachDomainGroup);
  registerCommand(createOutreachDomain);
  registerCommand(renameOutreachDomain);
  registerCommand(setEscalationInReview);
  registerCommand(createAssignment);
  registerCommand(deactivateAssignment);

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
  registerQuery(listLeadQueue);
  registerQuery(listCoachingNotes);
  registerQuery(getTeamWeeklyMemberBreakdown);
  registerQuery(getCompanyPulse);
  registerQuery(getVerticalIntelligence);
  registerQuery(getChannelIntelligence);
  registerQuery(getConversionFunnel);
  registerQuery(listAiInsights);
  registerQuery(listDomainTaxonomy);
  registerQuery(listEscalations);
  registerQuery(listTeamAssignments);
  registerQuery(getDomainFunnel);
  registerQuery(getDomainVelocity);
  registerQuery(getDomainAging);
}
