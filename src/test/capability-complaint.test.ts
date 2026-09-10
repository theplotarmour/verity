import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache } from "@/server/platform/capability";
import { clearCommands, clearHooks, executeCommand, type ActorContext } from "@/server/platform/command";
import { clearQueries, executeQuery } from "@/server/platform/query";
import { clearScopeResolvers } from "@/server/platform/authorization";
import { clearTransitionGuards } from "@/server/platform/state";
import { clearContributions } from "@/server/platform/contribution";
import { provisionIdentity } from "@/server/platform/identity";
import { DINEIN_CAPABILITY, registerDineinCapability } from "@/server/capabilities/dinein";
import { LOCATION_CAPABILITY, registerLocationCapability } from "@/server/capabilities/location";
import { CRM_CAPABILITY, ENTITY_CUSTOMER, registerCrmCapability } from "@/server/capabilities/crm";
import { ENTITY_LOYALTY_ENTRY, LOYALTY_CAPABILITY, getLoyaltyBalance, registerLoyaltyCapability } from "@/server/capabilities/loyalty";
import {
  COMPLAINT_CAPABILITY,
  ENTITY_COMPLAINT,
  fileComplaint,
  listComplaints,
  registerComplaintCapability,
  resolveComplaint,
  updateComplaintStatus,
} from "@/server/capabilities/complaint";

/** CAPABILITY: Complaint — a ticket moves through status, resolves with
 * LoyaltyPoints compensation, and that compensation actually credits the
 * customer's loyalty balance (§36-37). */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-complaint.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

describeDb("capability: Complaint", () => {
  const tenantId = randomUUID();

  let organizationId: string;
  let locationId: string;
  let manager: ActorContext;
  let customerId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();
    registerLocationCapability();
    registerDineinCapability();
    registerCrmCapability();
    registerLoyaltyCapability();
    registerComplaintCapability();

    await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({
        data: { id: tenantId, name: "Colonel Kebabz Complaint Test", timeZone: "Asia/Kolkata" },
      });
      await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      await activateCapability(tx, tenantId, DINEIN_CAPABILITY);
      await activateCapability(tx, tenantId, CRM_CAPABILITY);
      await activateCapability(tx, tenantId, LOYALTY_CAPABILITY);
      await activateCapability(tx, tenantId, COMPLAINT_CAPABILITY);

      organizationId = (await tx.organization.create({ data: { tenantId, name: "Outlet 1" } })).id;
      locationId = (
        await tx.location.create({ data: { tenantId, organizationId, name: "Outlet 1" } })
      ).id;

      const managerRole = await tx.role.create({ data: { tenantId, name: "Manager" }, select: { id: true } });
      const everything = [ENTITY_CUSTOMER, ENTITY_LOYALTY_ENTRY, ENTITY_COMPLAINT];
      await tx.permission.createMany({
        data: everything.flatMap((entity) =>
          (["Read", "Create", "Edit", "ActionExecute"] as const).map((verb) => ({
            tenantId,
            roleId: managerRole.id,
            verb,
            entity,
            scope: "Tenant" as const,
          })),
        ),
      });

      const managerIdentity = await provisionIdentity(tx, {
        organizationId,
        authUserId: randomUUID(),
        displayName: "Manager",
      });
      await tx.tenantMembership.update({
        where: { id: managerIdentity.membershipId },
        data: { roleId: managerRole.id },
      });

      manager = {
        tenantId,
        userId: managerIdentity.userId,
        membershipId: managerIdentity.membershipId,
        organizationId,
        roleId: managerRole.id,
      };

      // A Customer created directly (CRM's own upsert-on-bill path is
      // covered by capability-crm.test.ts; this test only needs one to exist).
      const customer = await tx.customer.create({
        data: { tenantId, phone: "9876511111", name: "Unhappy Guest" },
      });
      customerId = customer.id;
    });

    invalidateCapabilityCache();
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

  it("files, assigns, resolves with compensation, and credits loyalty points", async () => {
    const complaint = await executeCommand(manager, fileComplaint, {
      locationId,
      customerId,
      category: "Food quality",
      severity: "High",
      description: "Order arrived cold",
    });

    await executeCommand(manager, updateComplaintStatus, {
      complaintId: complaint.id,
      status: "Assigned",
      assignedToUserId: manager.userId,
    });

    const open = await executeQuery(manager, listComplaints, { status: "Assigned" });
    expect(open.some((c) => c.id === complaint.id)).toBe(true);

    await executeCommand(manager, resolveComplaint, {
      complaintId: complaint.id,
      resolution: "Apologized, issued loyalty points",
      compensationType: "LoyaltyPoints",
      compensationValue: 100,
    });

    const balance = await executeQuery(manager, getLoyaltyBalance, { customerId });
    expect(balance.balance).toBe(100);

    // A resolved-then-closed complaint refuses further status edits.
    await executeCommand(manager, updateComplaintStatus, { complaintId: complaint.id, status: "Closed" });
    await expect(
      executeCommand(manager, updateComplaintStatus, { complaintId: complaint.id, status: "Assigned" }),
    ).rejects.toThrow(/cannot be reopened/);
  });
});
