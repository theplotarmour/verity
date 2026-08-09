"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hashPin } from "@/lib/server/hash";
import { DEFAULT_MODULES, provisionTenant, systemRoleId } from "@/platform/tenancy/provision";
import { type ModuleKey, allModules } from "@/platform/modules/registry";

// ==========================================
// Verity HQ Agreements Actions

/**
 * Agreements store module names as free text chosen by sales ("Production
 * Board", "Quality Gates"). Map them onto registry keys, ignoring anything
 * unrecognised so a typo in an agreement cannot grant or deny a module.
 */
function modulesFromAgreement(raw: unknown): ModuleKey[] {
  const labels = Array.isArray(raw) ? raw.map((v) => String(v).toLowerCase()) : [];
  const matched = allModules()
    .filter((m) => labels.some((l) => l.includes(m.key) || l.includes(m.name.toLowerCase())))
    .map((m) => m.key);
  return matched.length > 0 ? matched : DEFAULT_MODULES;
}
// ==========================================

export async function createAgreement(data: {
  factoryName: string;
  ownerName: string;
  phone: string;
  modules: string[];
  setupFee: number;
  monthlyFee: number;
  createdBy: string;
}) {
  const agreement = await prisma.agreement.create({
    data: {
      factoryName: data.factoryName,
      ownerName: data.ownerName,
      phone: data.phone,
      modules: data.modules,
      setupFee: data.setupFee,
      monthlyFee: data.monthlyFee,
      status: "SENT",
      createdBy: data.createdBy,
    },
  });

  return { success: true, agreementId: agreement.id };
}

export async function getAgreement(id: string) {
  try {
    const agreement = await prisma.agreement.findUnique({
      where: { id },
    });
    return agreement;
  } catch (error) {
    return null;
  }
}

export async function acceptAgreement(id: string, signature: string) {
  try {
    const agreement = await prisma.agreement.findUnique({
      where: { id },
    });

    if (!agreement || agreement.status !== "SENT") {
      return { success: false, error: "Agreement not found or already accepted" };
    }

    // Create the slug from factory name
    const slug = agreement.factoryName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // 1. Create Factory Workspace
    // The agreement's module list is the entitlement, resolved through the
    // registry so unknown labels are dropped rather than silently trusted.
    const { factoryId: newFactoryId, organizationId } = await provisionTenant({
      name: agreement.factoryName,
      slug,
      industry: "Custom Manufacturing",
      onboardingStatus: "SETUP",
      setupFee: agreement.setupFee,
      monthlyFee: agreement.monthlyFee,
      modules: modulesFromAgreement(agreement.modules),
    });
    const factory = await prisma.factory.findUniqueOrThrow({ where: { id: newFactoryId } });

    // 2. Create Owner account (default PIN: "1234")
    const pin = "1234";
    const hashed = hashPin(pin, factory.id);

    const owner = await prisma.user.create({
      data: {
        factoryId: factory.id,
        name: agreement.ownerName,
        phone: agreement.phone,
        role: "OWNER",
        roleId: await systemRoleId(organizationId, "OWNER"),
        pinHash: hashed,
        isActive: true,
      },
    });

    // 3. Initialize Default Workflow Stages for Custom Manufacturing
    const defaultStages = [
      { name: "Order Placed", sortOrder: 1, requirePhoto: false, requireRemarks: false },
      { name: "Production Start", sortOrder: 2, requirePhoto: true, requireRemarks: false },
      { name: "Quality Control", sortOrder: 3, requirePhoto: true, requireRemarks: true },
      { name: "Finished Packaging", sortOrder: 4, requirePhoto: false, requireRemarks: false },
      { name: "Dispatched", sortOrder: 5, requirePhoto: false, requireRemarks: false },
    ];

    for (const stage of defaultStages) {
      await prisma.workflowStage.create({
        data: {
          factoryId: factory.id,
          name: stage.name,
          sortOrder: stage.sortOrder,
          requirePhoto: stage.requirePhoto,
          requireRemarks: stage.requireRemarks,
        },
      });
    }

    // 4. Update agreement state
    await prisma.agreement.update({
      where: { id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        signature,
        factoryId: factory.id,
      },
    });

    return { success: true, factoryId: factory.id, ownerId: owner.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to accept agreement" };
  }
}

// ==========================================
// Verity HQ Client Management Actions
// ==========================================

export async function getClientsList() {
  try {
    const clients = await prisma.factory.findMany({
      include: {
        users: true,
      },
    });

    const orderCounts = await prisma.salesOrder.groupBy({
      by: ["factoryId"],
      _count: { id: true },
    });
    const orderCountMap = new Map(orderCounts.map((o) => [o.factoryId, o._count.id]));

    return clients.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      industry: c.industry,
      onboardingStatus: c.onboardingStatus,
      userCount: c.users.length,
      orderCount: orderCountMap.get(c.id) ?? 0,
      setupFee: c.setupFee,
      monthlyFee: c.monthlyFee,
    }));
  } catch (error) {
    return [];
  }
}

export async function updateOnboardingStatus(factoryId: string, status: string) {
  try {
    await prisma.factory.update({
      where: { id: factoryId },
      data: { onboardingStatus: status },
    });
    revalidatePath("/verity/clients");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// ==========================================
// Verity HQ Support Impersonation Actions
// ==========================================

export async function createSupportSession(
  factoryId: string,
  internalUserId: string,
  reason: string
) {
  // Session expires in 2 hours
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  const session = await prisma.supportSession.create({
    data: {
      factoryId,
      internalUserId,
      reason,
      expiresAt,
    },
  });

  return { success: true, sessionId: session.id };
}

export async function getSupportLogs(factoryId?: string) {
  return await prisma.supportSession.findMany({
    where: factoryId ? { factoryId } : {},
    include: {
      factory: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAndSignAgreementDirect(data: {
  factoryName: string;
  ownerName: string;
  phone: string;
  signature: string;
}) {
  try {
    const slug = data.factoryName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check if slug exists to prevent collision
    const existing = await prisma.factory.findUnique({
      where: { slug }
    });
    const finalSlug = existing ? `${slug}-${Math.floor(Math.random() * 1000)}` : slug;

    // 1. Create Factory Workspace
    const { factoryId: newFactoryId, organizationId } = await provisionTenant({
      name: data.factoryName,
      slug: finalSlug,
      industry: "Automotive Seat Covers",
      onboardingStatus: "LIVE",
      setupFee: 150000,
      monthlyFee: 18000,
      modules: [...DEFAULT_MODULES, "automotive"],
    });
    const factory = await prisma.factory.findUniqueOrThrow({ where: { id: newFactoryId } });

    // 2. Create Owner account (default PIN: "1234")
    const pin = "1234";
    const hashed = hashPin(pin, factory.id);

    const owner = await prisma.user.create({
      data: {
        factoryId: factory.id,
        name: data.ownerName,
        phone: data.phone,
        role: "OWNER",
        roleId: await systemRoleId(organizationId, "OWNER"),
        pinHash: hashed,
        isActive: true,
      },
    });

    // 3. Create local agreement record
    await prisma.agreement.create({
      data: {
        factoryId: factory.id,
        factoryName: data.factoryName,
        ownerName: data.ownerName,
        phone: data.phone,
        modules: ["Production Board", "Quality Gates", "Public Passports"],
        setupFee: 150000,
        monthlyFee: 18000,
        status: "ACCEPTED",
        acceptedAt: new Date(),
        signature: data.signature,
        createdBy: "SELF_SERVICE",
      }
    });

    // Demo vehicle, qc template and product seeding skipped as these tables are retired in Veda schema

    return { success: true, factoryId: factory.id, slug: factory.slug };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to onboard factory" };
  }
}

