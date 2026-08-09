"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hashPin } from "@/lib/server/hash";
import { requireHqAction } from "@/lib/server/hq-auth";
import {
  DEFAULT_MODULES,
  VERTICAL_PACKS,
  modulesForPack,
  provisionTenant,
  systemRoleId,
  verticalPackOptions,
} from "@/platform/tenancy/provision";
import {
  type ModuleKey,
  allModules,
  getModule,
  withDependencies,
} from "@/platform/modules/registry";
import { entitledModules } from "@/platform/modules/entitlements";

// ==========================================
// Verity HQ Agreements Actions

/**
 * Agreements store module names as free text chosen by sales ("Production
 * Board", "Quality Gates"). Map them onto registry keys, ignoring anything
 * unrecognised so a typo in an agreement cannot grant or deny a module.
 */
function modulesFromAgreement(raw: unknown): ModuleKey[] {
  const labels = Array.isArray(raw) ? raw.map((v) => String(v).toLowerCase()) : [];

  // A vertical pack named in the agreement wins over label matching: "Facility
  // Management" is a decision about what kind of business this is, not a guess
  // at which module a phrase resembles.
  const pack = labels.find((l) => Object.prototype.hasOwnProperty.call(VERTICAL_PACKS, l));
  if (pack) return modulesForPack(pack);

  const matched = allModules()
    .filter((m) => labels.some((l) => l.includes(m.key) || l.includes(m.name.toLowerCase())))
    .map((m) => m.key);
  return matched.length > 0 ? matched : DEFAULT_MODULES;
}

/**
 * The vertical packs an onboarding selector offers, each with the modules it
 * resolves to (dependencies already expanded) so the UI can show "what's
 * included" without re-deriving it.
 */
export async function listVerticalPacks() {
  await requireHqAction();
  return verticalPackOptions().map((pack) => ({
    key: pack.key,
    label: pack.label,
    modules: pack.modules.map((key) => ({
      key,
      name: getModule(key)?.name ?? key,
    })),
  }));
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
  await requireHqAction();
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
  await requireHqAction();
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
  await requireHqAction();
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
  await requireHqAction();
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
      // Entitlements hang off the Organization, not the Factory. Without this
      // the admin module toggle has no id to act on.
      organizationId: c.organizationId,
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

/**
 * A tenant's current module entitlements, alongside the full catalogue, for an
 * admin toggle UI.
 */
export async function getTenantModules(organizationId: string) {
  await requireHqAction();
  const enabled = new Set(await entitledModules(organizationId));
  return allModules().map((mod) => ({
    key: mod.key,
    name: mod.name,
    description: mod.description,
    requires: mod.requires,
    alwaysOn: mod.alwaysOn ?? false,
    enabled: enabled.has(mod.key),
  }));
}

/**
 * Set a tenant's modules to exactly this list.
 *
 * Disabling only flips the entitlement off. No data is deleted — a tenant who
 * turns Helpdesk off for a quarter and back on must find their tickets where
 * they left them, and "we dropped the tables" is not a recoverable mistake.
 */
export async function updateTenantModules(organizationId: string, moduleKeys: string[]) {
  await requireHqAction();
  try {
    const requested = moduleKeys.filter((k): k is ModuleKey => getModule(k as ModuleKey) !== undefined);
    // Dependencies are added rather than rejected: entitling `manufacturing`
    // without `inventory` is a configuration mistake, not a runtime one.
    const resolved = new Set(withDependencies(requested));

    await prisma.$transaction(
      allModules().map((mod) => {
        const enabled = mod.alwaysOn === true || resolved.has(mod.key);
        return prisma.moduleEntitlement.upsert({
          where: { organizationId_moduleKey: { organizationId, moduleKey: mod.key } },
          create: { organizationId, moduleKey: mod.key, enabled },
          update: { enabled, ...(enabled ? { expiresAt: null } : {}) },
        });
      }),
    );

    revalidatePath("/verity/clients");
    revalidatePath("/owner", "layout");
    return { success: true, modules: [...resolved] };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not update modules.",
    };
  }
}

/** Apply a whole vertical pack to an existing tenant. */
export async function applyVerticalPack(organizationId: string, packKey: string) {
  await requireHqAction();
  if (!VERTICAL_PACKS[packKey]) return { success: false, error: "Unknown pack." };
  return updateTenantModules(organizationId, modulesForPack(packKey));
}

export async function updateOnboardingStatus(factoryId: string, status: string) {
  await requireHqAction();
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
  await requireHqAction();
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
  await requireHqAction();
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
  /**
   * Which kind of business this is. Drives the module bundle, so a security
   * company is not provisioned with a production board it will never open.
   * Omitted keeps the historical automotive-manufacturer default.
   */
  verticalPack?: string;
}) {
  await requireHqAction();
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
    const pack = data.verticalPack ? VERTICAL_PACKS[data.verticalPack] : undefined;
    const { factoryId: newFactoryId, organizationId } = await provisionTenant({
      name: data.factoryName,
      slug: finalSlug,
      industry: pack?.label ?? "Automotive Seat Covers",
      onboardingStatus: "LIVE",
      setupFee: 150000,
      monthlyFee: 18000,
      modules: pack ? modulesForPack(data.verticalPack) : [...DEFAULT_MODULES, "automotive"],
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

