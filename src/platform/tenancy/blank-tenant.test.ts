import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "@/lib/prisma";
import { provisionTenant } from "./provision";
import { resolveNavItems, allNavItems } from "../modules/navigation";
import { entitledModules, hasModule, enableModules, disableModule } from "../modules/entitlements";
import { guardModulePage, guardModuleAction, guardModuleWrite } from "../modules/guard";

// Mock getUserSession so we can inject active test tenant contexts at runtime.
let mockSession: { userId: string; factoryId: string; role: string; language: string } | null = null;
vi.mock("@/lib/server/auth", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getUserSession: () => Promise.resolve(mockSession),
  };
});

describe("Blank Tenant & Module Disable Runtime Invariants", () => {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  let organizationId: string;
  let factoryId: string;
  let ownerUserId: string;

  beforeAll(async () => {
    // 1. Provision a blank tenant (omitting modules parameter to test it defaults to ["core"])
    const result = await provisionTenant({
      name: `Blank Test Org ${suffix}`,
      slug: `blank-${suffix}`,
    });

    organizationId = result.organizationId;
    factoryId = result.factoryId;

    // Create an owner user
    const owner = await prisma.user.create({
      data: {
        factoryId,
        name: "Blank Owner",
        phone: `9${Math.random().toString().slice(2, 11)}`,
        role: "OWNER",
        roleId: result.roleIdByArchetype.OWNER,
        isActive: true,
      },
    });

    ownerUserId = owner.id;
  });

  afterAll(async () => {
    // Cleanup created tenant resources
    await prisma.user.deleteMany({ where: { factoryId } });
    await prisma.moduleEntitlement.deleteMany({ where: { organizationId } });
    await prisma.rolePermission.deleteMany({ where: { role: { organizationId } } });
    await prisma.role.deleteMany({ where: { organizationId } });
    await prisma.factory.delete({ where: { id: factoryId } });
    await prisma.organization.delete({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it("proves B-A: provisionTenant defaults to ['core'] only", async () => {
    const modules = await entitledModules(organizationId);
    expect(modules).toEqual(["core"]);
  });

  it("proves B-B: resolveNavItems with core only resolves only core links", () => {
    const items = resolveNavItems({
      userRole: "OWNER",
      enabledModules: ["core"],
    });

    const nonCore = items.filter((item) => item.moduleKey !== "core");
    expect(nonCore).toEqual([]);

    const hrefs = items.map((i) => i.href);
    expect(hrefs).toContain("/owner/dashboard");
    expect(hrefs).toContain("/owner/settings");
    expect(hrefs).not.toContain("/owner/inventory");
  });

  it("proves Scenario E: page guards and action guards block access to un-entitled modules", async () => {
    // Inject mock session
    mockSession = {
      userId: ownerUserId,
      factoryId,
      role: "OWNER",
      language: "en",
    };

    // Page guard redirects to dashboard
    let pageRedirected = false;
    try {
      await guardModulePage("inventory");
    } catch (err: any) {
      if (err?.digest?.includes("NEXT_REDIRECT") && err?.digest?.includes("/owner/dashboard")) {
        pageRedirected = true;
      }
    }
    expect(pageRedirected, "guardModulePage should redirect to dashboard").toBe(true);

    // Action guard throws error
    await expect(guardModuleAction("inventory")).rejects.toThrow("The Inventory module is not enabled.");
    await expect(guardModuleWrite("inventory")).rejects.toThrow("The Inventory module is not enabled.");
  });

  it("proves Scenario E: enable -> use -> disable -> retain data cycle works", async () => {
    mockSession = {
      userId: ownerUserId,
      factoryId,
      role: "OWNER",
      language: "en",
    };

    // 1. Enable module
    await enableModules(organizationId, ["inventory"]);
    expect(await hasModule(organizationId, "inventory")).toBe(true);

    // Action guard should now pass and return organizationId
    const org = await guardModuleAction("inventory");
    expect(org).toBe(organizationId);

    // Create a mock inventory resource
    const item = await prisma.itemMaster.create({
      data: {
        factoryId,
        itemCode: `TEST-ITEM-${suffix}`,
        sku: `TEST-SKU-${suffix}`,
        name: "Test Integration Item",
        itemType: "RAW_MATERIAL",
        defaultUOM: "PCS",
      },
    });

    // 2. Disable module
    await disableModule(organizationId, "inventory");
    expect(await hasModule(organizationId, "inventory")).toBe(false);

    // Action guard should block again
    await expect(guardModuleAction("inventory")).rejects.toThrow("The Inventory module is not enabled.");

    // 3. Verify data retention (the row is still in the database)
    const dbItem = await prisma.itemMaster.findUnique({
      where: { id: item.id },
    });
    expect(dbItem).not.toBeNull();
    expect(dbItem?.name).toBe("Test Integration Item");

    // Clean up test item
    await prisma.itemMaster.delete({ where: { id: item.id } });
  });
});
