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
  ENTITY_LEAD,
  ENTITY_TARGET,
  ENTITY_TEAM,
  ENTITY_TEAM_MEMBERSHIP,
  ENTITY_TEAM_WEEKLY_ASSESSMENT,
  ENTITY_WEEKLY_REPORT,
  OUTREACH_CAPABILITY,
  addTeamMember,
  advanceLeadStage,
  createOutreachLead,
  createOutreachTeam,
  getFunnelCounts,
  getTeamWeeklyRollup,
  listOutreachLeads,
  listOverdueFollowUps,
  logOutreachActivity,
  reactivateLead,
  reassignOpportunityOwner,
  recordAdvancePayment,
  registerOutreachCapability,
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
});
