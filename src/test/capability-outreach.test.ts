import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache } from "@/server/platform/capability";
import { clearCommands, clearHooks, executeCommand, type ActorContext } from "@/server/platform/command";
import { clearQueries, executeQuery } from "@/server/platform/query";
import { ForbiddenError, clearScopeResolvers } from "@/server/platform/authorization";
import { clearTransitionGuards } from "@/server/platform/state";
import { clearContributions } from "@/server/platform/contribution";
import { provisionIdentity } from "@/server/platform/identity";
import {
  ENTITY_ACTIVITY,
  ENTITY_CHECK_IN,
  ENTITY_CONTACT,
  ENTITY_LEAD,
  ENTITY_TARGET,
  ENTITY_TEAM,
  ENTITY_TEAM_MEMBERSHIP,
  ENTITY_TEAM_WEEKLY_ASSESSMENT,
  ENTITY_WEEKLY_REPORT,
  OUTREACH_CAPABILITY,
  addTeamMember,
  advanceLeadStage,
  createOutreachContact,
  createOutreachLead,
  createOutreachTeam,
  deriveLeadHealth,
  listOutreachContacts,
  flagForEscalation,
  getDailyMetrics,
  getFunnelCounts,
  getTeamComparison,
  getTeamWeeklyRollup,
  listAvailableParties,
  listEscalatedLeads,
  listOutreachLeads,
  listOutreachTargets,
  listOverdueFollowUps,
  logOutreachActivity,
  reactivateLead,
  reassignOpportunityOwner,
  recordAdvancePayment,
  registerOutreachCapability,
  removeTeamMember,
  renameTeam,
  resolveEscalation,
  setOutreachTarget,
  submitDailyCheckIn,
  submitTeamWeeklyAssessment,
  submitWeeklyReport,
} from "@/server/capabilities/outreach";

/**
 * CAPABILITY: OUTREACH — Task 105 Phase 4.
 *
 * Covers the business invariants the taskplan names explicitly: state-
 * machine legality (handbook Ch. 22), the terminal-state rejection-reason
 * guard (Ch. 20), the advance-payment threshold gate on Closed Won (Ch. 02),
 * the 14-day reassignment-eligibility window and the 90-day reactivation-
 * credit window (both Ch. 02), and the Phase 3 per-team scope fix.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-outreach.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const DAY_MS = 24 * 60 * 60 * 1000;

describeDb("capability: Outreach", () => {
  const tenantId = randomUUID();

  let organizationId: string;
  let founder: ActorContext;
  let seniorA: ActorContext; // leads teamA
  let seniorB: ActorContext; // leads teamB
  let teamAId: string;
  let teamBId: string;
  let founderPartyId: string;
  let seniorAPartyId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();
    registerOutreachCapability();

    const everything = [
      ENTITY_TEAM,
      ENTITY_TEAM_MEMBERSHIP,
      ENTITY_LEAD,
      ENTITY_ACTIVITY,
      ENTITY_TARGET,
      ENTITY_CHECK_IN,
      ENTITY_WEEKLY_REPORT,
      ENTITY_TEAM_WEEKLY_ASSESSMENT,
      ENTITY_CONTACT,
    ];

    await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({ data: { id: tenantId, name: "Outreach Test", timeZone: "Asia/Kolkata" } });
      await activateCapability(tx, tenantId, OUTREACH_CAPABILITY);
      organizationId = (await tx.organization.create({ data: { tenantId, name: "PlotArmour Test" } })).id;

      const role = await tx.role.create({ data: { tenantId, name: "Everyone" } });
      await tx.permission.createMany({
        data: everything.flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId,
            roleId: role.id,
            verb,
            entity,
            scope: "Tenant" as const,
          })),
        ),
      });

      const founderIdentity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Founder",
      });
      await tx.tenantMembership.update({ where: { id: founderIdentity.membershipId }, data: { roleId: role.id } });
      founderPartyId = founderIdentity.partyId;
      founder = {
        tenantId,
        userId: founderIdentity.userId,
        membershipId: founderIdentity.membershipId,
        organizationId,
        roleId: role.id,
      };

      const seniorAIdentity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Senior A",
      });
      await tx.tenantMembership.update({ where: { id: seniorAIdentity.membershipId }, data: { roleId: role.id } });
      seniorAPartyId = seniorAIdentity.partyId;
      seniorA = {
        tenantId,
        userId: seniorAIdentity.userId,
        membershipId: seniorAIdentity.membershipId,
        organizationId,
        roleId: role.id,
      };

      const seniorBIdentity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Senior B",
      });
      await tx.tenantMembership.update({ where: { id: seniorBIdentity.membershipId }, data: { roleId: role.id } });
      seniorB = {
        tenantId,
        userId: seniorBIdentity.userId,
        membershipId: seniorBIdentity.membershipId,
        organizationId,
        roleId: role.id,
      };

      teamAId = (await tx.outreachTeam.create({ data: { tenantId, name: "Team A", leaderId: seniorAPartyId } })).id;
      teamBId = (
        await tx.outreachTeam.create({ data: { tenantId, name: "Team B", leaderId: seniorBIdentity.partyId } })
      ).id;
    });

    invalidateCapabilityCache();
    void seniorB;
  });

  afterAll(async () => {
    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantId}::uuid`;
      await admin.$executeRaw`DELETE FROM "user" WHERE id NOT IN (SELECT user_id FROM tenant_membership)`;
      await admin.$executeRaw`DELETE FROM party WHERE id NOT IN (SELECT party_id FROM "user")`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("creates a lead with the creator as originator, initial state 'research'", async () => {
    const lead = await executeCommand(founder, createOutreachLead, {
      teamId: teamAId,
      companyName: "Acme Test Co",
      whyRelevant: "Fragmented purchasing per job posting.",
      opportunityOwnerId: seniorAPartyId,
    });
    const row = await withTenant(tenantId, (tx) => tx.outreachLead.findUniqueOrThrow({ where: { id: lead.id } }));
    expect(row.state).toBe("research");
    expect(row.leadOriginatorId).toBe(founderPartyId);
    expect(row.opportunityOwnerId).toBe(seniorAPartyId);
  });

  it("stores the prospect-research sheet's fields when given (2026-09-13 batch)", async () => {
    const lead = await executeCommand(founder, createOutreachLead, {
      teamId: teamAId,
      companyName: "Research Fields Co",
      whyRelevant: "Fresh funding round per press release.",
      opportunityOwnerId: seniorAPartyId,
      location: "Melbourne, Australia",
      whatTheyDo: "A vegan-leather pet accessories brand.",
      potentialNeed: "Brand photography, launch campaign production.",
      salesHypothesis: "New launch needs a content library before competitors crowd them out.",
      linkedinUrl: "https://www.linkedin.com/in/example",
      qualityScore: 8,
    });
    const row = await withTenant(tenantId, (tx) => tx.outreachLead.findUniqueOrThrow({ where: { id: lead.id } }));
    expect(row.location).toBe("Melbourne, Australia");
    expect(row.whatTheyDo).toBe("A vegan-leather pet accessories brand.");
    expect(row.potentialNeed).toBe("Brand photography, launch campaign production.");
    expect(row.salesHypothesis).toBe("New launch needs a content library before competitors crowd them out.");
    expect(row.linkedinUrl).toBe("https://www.linkedin.com/in/example");
    expect(row.qualityScore).toBe(8);
  });

  it("logs PitchDeck and BusinessResearch activity types (daily workbook columns, 2026-09-13 batch)", async () => {
    const lead = await executeCommand(founder, createOutreachLead, {
      teamId: teamAId,
      companyName: "Pitch Deck Co",
      whyRelevant: "Test.",
      opportunityOwnerId: seniorAPartyId,
    });
    await executeCommand(founder, logOutreachActivity, {
      leadId: lead.id,
      channel: "Email",
      activityType: "PitchDeck",
      message: "Sent the deck.",
    });
    await executeCommand(founder, logOutreachActivity, {
      leadId: lead.id,
      channel: "Other",
      activityType: "BusinessResearch",
      message: "Reviewed their site and LinkedIn.",
    });
    const timeline = await withTenant(tenantId, (tx) => tx.outreachActivity.findMany({ where: { leadId: lead.id } }));
    expect(timeline.map((a) => a.activityType).sort()).toEqual(["BusinessResearch", "PitchDeck"]);

    const metrics = await executeQuery(founder, getDailyMetrics, { partyId: founderPartyId, date: new Date().toISOString() });
    expect(metrics.pitchDecks).toBeGreaterThanOrEqual(1);
    expect(metrics.businessResearch).toBeGreaterThanOrEqual(1);
  });

  describe("contacts (Task 106 Phase 3)", () => {
    it("creates a contact on a lead and lists it back", async () => {
      const lead = await executeCommand(founder, createOutreachLead, {
        teamId: teamAId,
        companyName: "Contact Test Co",
        whyRelevant: "Test.",
        opportunityOwnerId: seniorAPartyId,
      });
      const contact = await executeCommand(founder, createOutreachContact, {
        leadId: lead.id,
        fullName: "Priya Sharma",
        designation: "Operations Head",
        email: "priya@contacttest.example",
        classification: "DecisionMaker",
      });
      const contacts = await executeQuery(founder, listOutreachContacts, { leadId: lead.id });
      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toMatchObject({
        id: contact.id,
        fullName: "Priya Sharma",
        designation: "Operations Head",
        email: "priya@contacttest.example",
        classification: "DecisionMaker",
      });
    });

    it("defaults classification to Unknown when omitted", async () => {
      const lead = await executeCommand(founder, createOutreachLead, {
        teamId: teamAId,
        companyName: "Contact Default Co",
        whyRelevant: "Test.",
        opportunityOwnerId: seniorAPartyId,
      });
      const contact = await executeCommand(founder, createOutreachContact, {
        leadId: lead.id,
        fullName: "Unclassified Person",
      });
      const stored = await withTenant(tenantId, (tx) => tx.outreachContact.findUniqueOrThrow({ where: { id: contact.id } }));
      expect(stored.classification).toBe("Unknown");
    });

    it("rejects a contact on a lead that does not exist", async () => {
      await expect(
        executeCommand(founder, createOutreachContact, {
          leadId: randomUUID(),
          fullName: "Ghost Contact",
        }),
      ).rejects.toThrow();
    });
  });

  describe("deriveLeadHealth (Task 106 Phase 3, spec §21 — category-only per ADR-009)", () => {
    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * DAY_MS);
    const daysAhead = (n: number) => new Date(now.getTime() + n * DAY_MS);

    it("is Closed for Completed/Cancelled categories regardless of activity", () => {
      expect(deriveLeadHealth({ category: "Completed", lastActivityAt: daysAgo(100), nextActionAt: null, createdAt: daysAgo(100) })).toBe("Closed");
      expect(deriveLeadHealth({ category: "Cancelled", lastActivityAt: null, nextActionAt: null, createdAt: daysAgo(1) })).toBe("Closed");
    });

    it("is Stale when idle beyond 14 days, even with an Active category", () => {
      expect(deriveLeadHealth({ category: "Active", lastActivityAt: daysAgo(20), nextActionAt: null, createdAt: daysAgo(30) })).toBe("Stale");
    });

    it("is AtRisk when the next action is overdue but activity is recent", () => {
      expect(deriveLeadHealth({ category: "Active", lastActivityAt: daysAgo(1), nextActionAt: daysAgo(2), createdAt: daysAgo(10) })).toBe("AtRisk");
    });

    it("is Hot when Active with a real upcoming action", () => {
      expect(deriveLeadHealth({ category: "Active", lastActivityAt: daysAgo(1), nextActionAt: daysAhead(3), createdAt: daysAgo(10) })).toBe("Hot");
    });

    it("is Healthy for a fresh Draft/Pending lead with no overdue action", () => {
      expect(deriveLeadHealth({ category: "Draft", lastActivityAt: null, nextActionAt: null, createdAt: daysAgo(1) })).toBe("Healthy");
    });
  });

  describe("state machine (handbook Ch. 22)", () => {
    it("advances only through declared transitions", async () => {
      const lead = await executeCommand(founder, createOutreachLead, {
        teamId: teamAId,
        companyName: "Linear Path Co",
        whyRelevant: "Test.",
        opportunityOwnerId: seniorAPartyId,
      });

      const afterFirst = await executeCommand(founder, advanceLeadStage, { leadId: lead.id, toState: "prospect" });
      expect(afterFirst.state).toBe("prospect");

      // Undeclared transition (skipping straight to closed_won from prospect)
      // must fail by absence, per state.ts's own MET-TRA-001 guarantee.
      await expect(
        executeCommand(founder, advanceLeadStage, { leadId: lead.id, toState: "closed_won" }),
      ).rejects.toThrow();
    });

    it("requires a rejectionReason to reach a terminal state, and locks the record after (INV-002)", async () => {
      const lead = await executeCommand(founder, createOutreachLead, {
        teamId: teamAId,
        companyName: "Dead End Co",
        whyRelevant: "Test.",
        opportunityOwnerId: seniorAPartyId,
      });

      await expect(
        executeCommand(founder, advanceLeadStage, { leadId: lead.id, toState: "not_a_fit" }),
      ).rejects.toThrow(/rejectionReason/);

      const result = await executeCommand(founder, advanceLeadStage, {
        leadId: lead.id,
        toState: "not_a_fit",
        rejectionReason: "NoFit",
      });
      expect(result.state).toBe("not_a_fit");

      const row = await withTenant(tenantId, (tx) => tx.outreachLead.findUniqueOrThrow({ where: { id: lead.id } }));
      expect(row.rejectionReason).toBe("NoFit");

      // INV-002: terminal is permanently read-only.
      await expect(
        executeCommand(founder, advanceLeadStage, { leadId: lead.id, toState: "research" }),
      ).rejects.toThrow(/terminal/);
    });

    it("blocks Closed Won until cumulative advance received clears the threshold (handbook Ch. 02)", async () => {
      const lead = await executeCommand(founder, createOutreachLead, {
        teamId: teamAId,
        companyName: "Payment Gate Co",
        whyRelevant: "Test.",
        opportunityOwnerId: seniorAPartyId,
      });
      await withTenant(tenantId, (tx) =>
        tx.outreachLead.update({
          where: { id: lead.id },
          data: {
            state: "advance_received",
            advanceThresholdMinor: 10_000,
          },
        }),
      );

      // Below threshold: blocked.
      await executeCommand(founder, recordAdvancePayment, { leadId: lead.id, amountMinor: 4_000 });
      await expect(
        executeCommand(founder, advanceLeadStage, { leadId: lead.id, toState: "closed_won" }),
      ).rejects.toThrow(/threshold/);

      // Milestone payment brings cumulative total past the threshold — never
      // replaces it, always adds (handbook Ch. 02's milestone ruling).
      await executeCommand(founder, recordAdvancePayment, { leadId: lead.id, amountMinor: 7_000 });
      const row = await withTenant(tenantId, (tx) => tx.outreachLead.findUniqueOrThrow({ where: { id: lead.id } }));
      expect(row.advanceReceivedMinor).toBe(11_000);

      const closed = await executeCommand(founder, advanceLeadStage, { leadId: lead.id, toState: "closed_won" });
      expect(closed.state).toBe("closed_won");

      const finalRow = await withTenant(tenantId, (tx) => tx.outreachLead.findUniqueOrThrow({ where: { id: lead.id } }));
      expect(finalRow.closerId).not.toBeNull();
      expect(finalRow.closedAt).not.toBeNull();
    });
  });

  describe("attribution (handbook Ch. 02)", () => {
    it("blocks owner reassignment inside the 14-day window, allows it after", async () => {
      const lead = await executeCommand(founder, createOutreachLead, {
        teamId: teamAId,
        companyName: "Reassign Co",
        whyRelevant: "Test.",
        opportunityOwnerId: seniorAPartyId,
      });

      await expect(
        executeCommand(founder, reassignOpportunityOwner, { leadId: lead.id, newOwnerId: founderPartyId }),
      ).rejects.toThrow(/14 days/);

      // Backdate creation past the window to simulate real elapsed time —
      // the command reads `lastActivityAt ?? createdAt`.
      await withTenant(tenantId, (tx) =>
        tx.outreachLead.update({ where: { id: lead.id }, data: { createdAt: new Date(Date.now() - 15 * DAY_MS) } }),
      );

      const result = await executeCommand(founder, reassignOpportunityOwner, {
        leadId: lead.id,
        newOwnerId: founderPartyId,
      });
      expect(result.opportunityOwnerId).toBe(founderPartyId);
    });

    it("keeps origination credit on reactivation within 90 days, reassigns it past that window", async () => {
      // Within window: dead 10 days ago, reactivate now -> credit stays.
      const recentDead = await executeCommand(founder, createOutreachLead, {
        teamId: teamAId,
        companyName: "Recently Dead Co",
        whyRelevant: "Test.",
        opportunityOwnerId: seniorAPartyId,
      });
      await executeCommand(founder, advanceLeadStage, {
        leadId: recentDead.id,
        toState: "not_a_fit",
        rejectionReason: "NoTiming",
      });
      await withTenant(tenantId, (tx) =>
        tx.outreachLead.update({
          where: { id: recentDead.id },
          data: { lastActivityAt: new Date(Date.now() - 10 * DAY_MS) },
        }),
      );
      const revived = await executeCommand(seniorA, reactivateLead, {
        leadId: recentDead.id,
        newOwnerId: seniorAPartyId,
        whyRelevant: "New trigger: they just raised funding.",
      });
      const revivedRow = await withTenant(tenantId, (tx) =>
        tx.outreachLead.findUniqueOrThrow({ where: { id: revived.id } }),
      );
      expect(revivedRow.leadOriginatorId).toBe(founderPartyId); // unchanged, original creator
      expect(revivedRow.reactivatedFromLeadId).toBe(recentDead.id);
      expect(revivedRow.state).toBe("research"); // fresh row, not the reopened terminal one

      // Past window: dead 100 days ago -> reactivator becomes the new originator.
      const longDead = await executeCommand(founder, createOutreachLead, {
        teamId: teamAId,
        companyName: "Long Dead Co",
        whyRelevant: "Test.",
        opportunityOwnerId: seniorAPartyId,
      });
      await executeCommand(founder, advanceLeadStage, {
        leadId: longDead.id,
        toState: "lost",
        rejectionReason: "LostToCompetitor",
      });
      await withTenant(tenantId, (tx) =>
        tx.outreachLead.update({
          where: { id: longDead.id },
          data: { lastActivityAt: new Date(Date.now() - 100 * DAY_MS) },
        }),
      );
      const revivedLate = await executeCommand(seniorA, reactivateLead, {
        leadId: longDead.id,
        newOwnerId: seniorAPartyId,
        whyRelevant: "New trigger, much later.",
      });
      const revivedLateRow = await withTenant(tenantId, (tx) =>
        tx.outreachLead.findUniqueOrThrow({ where: { id: revivedLate.id } }),
      );
      expect(revivedLateRow.leadOriginatorId).toBe(seniorAPartyId); // reactivator, not original creator

      // The dead lead itself was never reopened (INV-002).
      const originalRow = await withTenant(tenantId, (tx) =>
        tx.outreachLead.findUniqueOrThrow({ where: { id: longDead.id } }),
      );
      expect(originalRow.state).toBe("lost");
    });
  });

  it("logs activity and refreshes lastActivityAt", async () => {
    const lead = await executeCommand(founder, createOutreachLead, {
      teamId: teamAId,
      companyName: "Activity Co",
      whyRelevant: "Test.",
      opportunityOwnerId: seniorAPartyId,
    });
    await executeCommand(founder, logOutreachActivity, {
      leadId: lead.id,
      channel: "LinkedIn",
      activityType: "FirstOutreach",
      message: "Hi there",
    });
    const row = await withTenant(tenantId, (tx) => tx.outreachLead.findUniqueOrThrow({ where: { id: lead.id } }));
    expect(row.lastActivityAt).not.toBeNull();

    const timeline = await withTenant(tenantId, (tx) =>
      tx.outreachActivity.findMany({ where: { leadId: lead.id } }),
    );
    expect(timeline).toHaveLength(1);
    expect(timeline[0]!.channel).toBe("LinkedIn");
  });

  it("rejects a duplicate daily check-in for the same person and date", async () => {
    const today = new Date().toISOString();
    await executeCommand(founder, submitDailyCheckIn, { checkInDate: today, summary: "Did outreach." });
    await expect(
      executeCommand(founder, submitDailyCheckIn, { checkInDate: today, summary: "Again." }),
    ).rejects.toThrow();
  });

  it("submits a weekly report and a team weekly assessment", async () => {
    const weekStart = new Date().toISOString();
    const report = await executeCommand(founder, submitWeeklyReport, {
      weekStart,
      whatWorked: "LinkedIn outreach",
      nextWeekTargetValue: 10,
    });
    expect(report.id).toBeTruthy();

    const assessment = await executeCommand(seniorA, submitTeamWeeklyAssessment, {
      teamId: teamAId,
      weekStart,
      biggestLearning: "Personalize the first line.",
    });
    expect(assessment.id).toBeTruthy();
  });

  it("sets and lists a target", async () => {
    const periodStart = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 7 * DAY_MS).toISOString();
    await executeCommand(founder, setOutreachTarget, {
      scope: "Team",
      teamId: teamAId,
      period: "Weekly",
      metric: "QualifiedProspects",
      targetValue: 10,
      periodStart,
      periodEnd,
    });
    const list = await withTenant(tenantId, (tx) => tx.outreachTarget.findMany({ where: { teamId: teamAId } }));
    expect(list.length).toBeGreaterThan(0);
  });

  it("supersedes rather than duplicates a target for the same scope/period/metric (Task 106 Phase 3)", async () => {
    const periodStart = new Date(Date.now() + 30 * DAY_MS).toISOString();
    const periodEnd = new Date(Date.now() + 37 * DAY_MS).toISOString();
    const first = await executeCommand(founder, setOutreachTarget, {
      scope: "Team",
      teamId: teamBId,
      period: "Weekly",
      metric: "Outreach",
      targetValue: 20,
      periodStart,
      periodEnd,
    });
    const second = await executeCommand(founder, setOutreachTarget, {
      scope: "Team",
      teamId: teamBId,
      period: "Weekly",
      metric: "Outreach",
      targetValue: 30,
      periodStart,
      periodEnd,
      changeReason: "Raised after strong week 1 response rate.",
    });

    const activeOnly = await executeQuery(founder, listOutreachTargets, { teamId: teamBId });
    const activeForPeriod = activeOnly.filter((t) => t.id === first.id || t.id === second.id);
    expect(activeForPeriod).toHaveLength(1);
    expect(activeForPeriod[0]).toMatchObject({ id: second.id, targetValue: 30, active: true });

    const withHistory = await executeQuery(founder, listOutreachTargets, { teamId: teamBId, includeSuperseded: true });
    const bothForPeriod = withHistory.filter((t) => t.id === first.id || t.id === second.id);
    expect(bothForPeriod).toHaveLength(2);
    const oldRow = bothForPeriod.find((t) => t.id === first.id);
    expect(oldRow).toMatchObject({ active: false, targetValue: 20 });

    const auditRows = await withTenant(tenantId, (tx) =>
      tx.activity.findMany({ where: { entityKey: ENTITY_TARGET, entityId: second.id, fieldChanged: "targetValue" } }),
    );
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({ oldValue: "20", newValue: "30" });
  });

  describe("Phase 3: per-team query scoping", () => {
    it("lets a Founder query any team's leads", async () => {
      const leads = await executeQuery(founder, listOutreachLeads, { teamId: teamAId });
      expect(Array.isArray(leads)).toBe(true);
    });

    it("lets a Senior query their own team", async () => {
      const leads = await executeQuery(seniorA, listOutreachLeads, { teamId: teamAId });
      expect(Array.isArray(leads)).toBe(true);
    });

    it("blocks a Senior from querying another team's leads", async () => {
      await expect(executeQuery(seniorA, listOutreachLeads, { teamId: teamBId })).rejects.toThrow(ForbiddenError);
      await expect(executeQuery(seniorA, listOverdueFollowUps, { teamId: teamBId })).rejects.toThrow(ForbiddenError);
      await expect(executeQuery(seniorA, getFunnelCounts, { teamId: teamBId })).rejects.toThrow(ForbiddenError);
      await expect(
        executeQuery(seniorA, getTeamWeeklyRollup, {
          teamId: teamBId,
          weekStart: new Date(0).toISOString(),
          weekEnd: new Date().toISOString(),
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  it("adds a team member with no maximum size enforced", async () => {
    const team = await executeCommand(founder, createOutreachTeam, {
      name: `Big Team ${randomUUID()}`,
      leaderId: seniorAPartyId,
    });
    for (let i = 0; i < 8; i += 1) {
      const identity = await withTenant(tenantId, (tx) =>
        provisionIdentity(tx, { organizationId, authUserId: randomUUID(), displayName: `Junior ${i}` }),
      );
      await executeCommand(founder, addTeamMember, { teamId: team.id, partyId: identity.partyId });
    }
    const memberships = await withTenant(tenantId, (tx) =>
      tx.outreachTeamMembership.findMany({ where: { teamId: team.id } }),
    );
    expect(memberships).toHaveLength(8); // no cap — 8 exceeds any "4-5" guidance, and succeeds
  });

  describe("roster management (2026-09-13 batch)", () => {
    it("soft-removes a member (active: false) rather than deleting the row", async () => {
      const identity = await withTenant(tenantId, (tx) =>
        provisionIdentity(tx, { organizationId, authUserId: randomUUID(), displayName: "Removable Junior" }),
      );
      await executeCommand(founder, addTeamMember, { teamId: teamAId, partyId: identity.partyId });
      await executeCommand(founder, removeTeamMember, { teamId: teamAId, partyId: identity.partyId });

      const membership = await withTenant(tenantId, (tx) =>
        tx.outreachTeamMembership.findFirstOrThrow({ where: { teamId: teamAId, partyId: identity.partyId } }),
      );
      expect(membership.active).toBe(false);
    });

    it("renames a team", async () => {
      const team = await executeCommand(founder, createOutreachTeam, {
        name: `Rename Me ${randomUUID()}`,
        leaderId: seniorAPartyId,
      });
      await executeCommand(founder, renameTeam, { teamId: team.id, name: "Renamed Team" });
      const row = await withTenant(tenantId, (tx) => tx.outreachTeam.findUniqueOrThrow({ where: { id: team.id } }));
      expect(row.name).toBe("Renamed Team");
    });

    it("lists only parties with no active roster slot, excluding leaders", async () => {
      const identity = await withTenant(tenantId, (tx) =>
        provisionIdentity(tx, { organizationId, authUserId: randomUUID(), displayName: "Unrostered Party" }),
      );
      const candidates = await executeQuery(founder, listAvailableParties, {});
      const ids = candidates.map((c) => c.id);
      expect(ids).toContain(identity.partyId); // never rostered anywhere — a legitimate candidate
      expect(ids).not.toContain(seniorAPartyId); // leads teamA — never offered as addable
    });
  });

  describe("escalation (2026-09-13 batch)", () => {
    it("flags a lead for escalation and resolves it", async () => {
      const lead = await executeCommand(founder, createOutreachLead, {
        teamId: teamAId,
        companyName: "Escalate Me Co",
        whyRelevant: "Test.",
        opportunityOwnerId: seniorAPartyId,
      });

      const flagged = await executeCommand(seniorA, flagForEscalation, {
        leadId: lead.id,
        note: "Large deal, needs Founder sign-off.",
        type: "Commercial",
        urgency: "High",
      });
      const flaggedRow = await withTenant(tenantId, (tx) =>
        tx.outreachLead.findUniqueOrThrow({ where: { id: flagged.id } }),
      );
      expect(flaggedRow.escalated).toBe(true);
      expect(flaggedRow.escalationNote).toBe("Large deal, needs Founder sign-off.");
      expect(flaggedRow.escalationType).toBe("Commercial");
      expect(flaggedRow.escalationUrgency).toBe("High");
      expect(flaggedRow.escalatedById).toBe(seniorAPartyId);
      expect(flaggedRow.escalatedAt).not.toBeNull();

      await executeCommand(founder, resolveEscalation, { leadId: lead.id });
      const resolvedRow = await withTenant(tenantId, (tx) =>
        tx.outreachLead.findUniqueOrThrow({ where: { id: lead.id } }),
      );
      expect(resolvedRow.escalated).toBe(false);
    });

    it("routes escalations to the Team Leader first (2026-09-13 hierarchical-architecture doc)", async () => {
      const leadA = await executeCommand(founder, createOutreachLead, {
        teamId: teamAId,
        companyName: "Team A Escalation Co",
        whyRelevant: "Test.",
        opportunityOwnerId: seniorAPartyId,
      });
      await executeCommand(seniorA, flagForEscalation, {
        leadId: leadA.id,
        note: "Needs a second look.",
        type: "TeamIssue",
        urgency: "Normal",
      });

      // Senior A, scoped to their own team, sees it.
      const seniorAView = await executeQuery(seniorA, listEscalatedLeads, { teamId: teamAId });
      expect(seniorAView.some((l) => l.id === leadA.id)).toBe(true);

      // Senior A cannot see Team B's escalation queue.
      await expect(executeQuery(seniorA, listEscalatedLeads, { teamId: teamBId })).rejects.toThrow(ForbiddenError);

      // Core, unscoped, still sees everything — no visibility was removed.
      const founderView = await executeQuery(founder, listEscalatedLeads, {});
      expect(founderView.some((l) => l.id === leadA.id)).toBe(true);

      await executeCommand(founder, resolveEscalation, { leadId: leadA.id });
    });
  });

  describe("team comparison (2026-09-13 batch)", () => {
    it("reports per-team member and lead counts across all teams", async () => {
      const rows = await executeQuery(founder, getTeamComparison, {});
      const teamARow = rows.find((r) => r.teamId === teamAId);
      expect(teamARow).toBeDefined();
      expect(teamARow!.teamName).toBe("Team A");
      expect(typeof teamARow!.leads).toBe("number");
      expect(typeof teamARow!.pipeline).toBe("number");
      expect(typeof teamARow!.closed).toBe("number");
    });
  });
});
