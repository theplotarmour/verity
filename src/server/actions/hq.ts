"use server";

import { randomBytes, randomInt } from "node:crypto";

import prisma from "@/lib/prisma";
import { phoneKey } from "@/lib/phone";
import { revalidatePath } from "next/cache";
import { hashPin } from "@/lib/server/hash";
import { requireHqAction } from "@/lib/server/hq-auth";
import {
  DEFAULT_MODULES,
  VERTICAL_PACKS,
  modulesForPack,
  packLabel,
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
import { issueKeyMaterial } from "@/lib/server/api-keys";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/outbox";
import { assertDeliverable } from "@/lib/webhooks/url-guard";

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

    // 2. Create Owner account. Generated PIN — see the note in
    // createAndSignAgreementDirect for why a fixed default is not safe here.
    const pin = generatePin();
    const hashed = hashPin(pin, factory.id);

    const owner = await prisma.user.create({
      data: {
        factoryId: factory.id,
        name: agreement.ownerName,
        phone: phoneKey(agreement.phone),
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

    return {
      success: true,
      factoryId: factory.id,
      ownerId: owner.id,
      // Shown once, then unrecoverable.
      credentials: { name: agreement.ownerName, phone: phoneKey(agreement.phone), pin },
    };
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
      industry: packLabel(c.industry),
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
      // The pack *key*, not its label: this field routes the tenant to its
      // dashboard, so it has to be exact. `packLabel()` renders it for humans.
      industry: pack ? data.verticalPack! : "auto_components",
      onboardingStatus: "LIVE",
      setupFee: 150000,
      monthlyFee: 18000,
      modules: pack ? modulesForPack(data.verticalPack) : [...DEFAULT_MODULES, "automotive"],
    });
    const factory = await prisma.factory.findUniqueOrThrow({ where: { id: newFactoryId } });

    // 2. Create Owner account.
    //
    // A generated PIN, not a fixed "1234". hashPin is salted by factoryId only,
    // so a constant default makes every workspace's owner account guessable the
    // moment someone knows the workspace exists. Returned once, below.
    const pin = generatePin();
    const hashed = hashPin(pin, factory.id);

    const owner = await prisma.user.create({
      data: {
        factoryId: factory.id,
        name: data.ownerName,
        phone: phoneKey(data.phone),
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


    return {
      success: true,
      factoryId: factory.id,
      slug: factory.slug,
      // Shown once. There is no way to read it back — only to reset it.
      credentials: { name: data.ownerName, phone: phoneKey(data.phone), pin },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to onboard factory" };
  }
}


// ==========================================
// Verity HQ Provisioning
// ==========================================

/** A random 4-digit PIN. Matches the format the login keypad accepts. */
function generatePin(): string {
  return String(randomInt(1000, 10000));
}

/**
 * Provision a client workspace and mint its owner account.
 *
 * The generated PIN is returned exactly once, in this response, and is never
 * recoverable afterwards — only its salted hash is stored. That is deliberate:
 * an admin screen that can re-display an existing credential is a credential
 * store. Lost PINs are reset, not looked up.
 */
export async function provisionClient(input: {
  name: string;
  ownerName: string;
  ownerPhone: string;
  verticalPack: string;
  setupFee?: number;
  monthlyFee?: number;
}) {
  const operator = await requireHqAction();

  const name = input.name?.trim();
  const ownerName = input.ownerName?.trim();
  // Canonical, so the number an operator types during onboarding is the number
  // login will match. This is the first credential the client ever uses; getting
  // it wrong means their very first sign-in fails.
  const phone = phoneKey(input.ownerPhone ?? "");

  if (!name) return { error: "A workspace name is required." };
  if (!ownerName) return { error: "An owner name is required." };
  if (phone.length < 10) return { error: "Enter a valid 10-digit owner phone number." };
  if (!VERTICAL_PACKS[input.verticalPack]) return { error: "Pick a business type." };

  // Phone is the username across the whole platform, so it must be unique
  // globally rather than per tenant.
  const clash = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
  if (clash) return { error: "That phone number already has an account." };

  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!base) return { error: "That workspace name produces an empty address." };

  // Walk the suffix rather than trusting a random number not to collide.
  let slug = base;
  for (let n = 2; await prisma.factory.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${base}-${n}`;
  }

  try {
    const { factoryId, organizationId } = await provisionTenant({
      name,
      slug,
      // Store the key, not the label — see the note in createAndSignAgreementDirect.
      industry: input.verticalPack,
      onboardingStatus: "SETUP",
      setupFee: input.setupFee ?? 0,
      monthlyFee: input.monthlyFee ?? 0,
      modules: modulesForPack(input.verticalPack),
    });

    const pin = generatePin();
    const owner = await prisma.user.create({
      data: {
        factoryId,
        name: ownerName,
        phone,
        role: "OWNER",
        roleId: await systemRoleId(organizationId, "OWNER"),
        pinHash: hashPin(pin, factoryId),
        isActive: true,
        createdById: operator.userId,
      },
      select: { id: true },
    });

    revalidatePath("/verity/clients");
    return {
      success: true,
      factoryId,
      organizationId,
      slug,
      ownerId: owner.id,
      // Shown once, then gone.
      credentials: { name: ownerName, phone, pin },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not provision the workspace.",
    };
  }
}

/**
 * Issue a fresh PIN for a tenant user. Returned once, same rule as above.
 * Clears any lockout, since a reset is also the answer to "they locked
 * themselves out".
 */
export async function resetTenantUserPin(userId: string) {
  await requireHqAction();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, factoryId: true },
  });
  if (!user) return { error: "User not found." };

  const pin = generatePin();
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash: hashPin(pin, user.factoryId), failedAttempts: 0, lockedUntil: null },
  });

  revalidatePath(`/verity/clients/${user.factoryId}`);
  return { success: true, credentials: { name: user.name, phone: user.phone ?? "", pin } };
}

/** One client workspace: entitlements, people, and the numbers on the account. */
export async function getClientDetail(factoryId: string) {
  await requireHqAction();

  const factory = await prisma.factory.findUnique({
    where: { id: factoryId },
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      onboardingStatus: true,
      setupFee: true,
      monthlyFee: true,
      createdAt: true,
      organizationId: true,
      organization: { select: { name: true, currency: true, timezone: true } },
    },
  });
  if (!factory) return null;

  const [users, modules] = await Promise.all([
    prisma.user.findMany({
      where: { factoryId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        lockedUntil: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    getTenantModules(factory.organizationId),
  ]);

  return {
    factory: {
      ...factory,
      industry: packLabel(factory.industry),
      createdAt: factory.createdAt.toISOString(),
    },
    users: users.map((u) => ({
      ...u,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      locked: !!u.lockedUntil && u.lockedUntil > new Date(),
    })),
    modules,
  };
}

// ==========================================
// Headless integration credentials
//
// An API key is what lets a tenant's storefront POST orders in, and a webhook
// endpoint is where their milestones go out. Both are managed here rather than
// by the tenant: they are integration plumbing an operator sets up during
// onboarding, and a key that can write production work is not a self-service
// control.
// ==========================================

/** Keys for one tenant. The token itself is never returned — only its prefix. */
export async function listApiKeys(factoryId: string) {
  await requireHqAction();

  const keys = await prisma.apiKey.findMany({
    where: { factoryId },
    select: {
      id: true,
      name: true,
      prefix: true,
      revokedAt: true,
      lastUsedAt: true,
      createdAt: true,
      // The signing secret is shown so an operator can hand it to whoever is
      // building the integration. It is a shared secret by design — unlike the
      // token, the receiver needs the original bytes to compute an HMAC.
      signingSecret: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return keys.map((key) => ({
    ...key,
    revokedAt: key.revokedAt?.toISOString() ?? null,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
  }));
}

/**
 * Issue a key. The token is returned exactly once and is unrecoverable
 * afterwards, because only its hash is stored.
 */
export async function issueApiKey(factoryId: string, name: string) {
  const operator = await requireHqAction();

  const label = name?.trim();
  if (!label) return { error: "Give the key a name so it can be told apart later." };

  const factory = await prisma.factory.findUnique({
    where: { id: factoryId },
    select: { id: true },
  });
  if (!factory) return { error: "Workspace not found." };

  const material = issueKeyMaterial();

  await prisma.apiKey.create({
    data: {
      factoryId,
      name: label,
      prefix: material.prefix,
      tokenHash: material.tokenHash,
      signingSecret: material.signingSecret,
      createdById: operator.userId,
    },
  });

  revalidatePath(`/verity/clients/${factoryId}`);
  return {
    success: true,
    // Shown once. There is no way to read the token back — only to revoke it
    // and issue another.
    credentials: {
      token: material.token,
      signingSecret: material.signingSecret,
      prefix: material.prefix,
    },
  };
}

/**
 * Revoke, rather than delete. A deleted key takes its ingest history with it —
 * and "which key booked this order" is exactly the question asked after
 * something goes wrong.
 */
export async function revokeApiKey(keyId: string) {
  await requireHqAction();

  const key = await prisma.apiKey.findUnique({
    where: { id: keyId },
    select: { id: true, factoryId: true, revokedAt: true },
  });
  if (!key) return { error: "Key not found." };
  if (key.revokedAt) return { success: true };

  await prisma.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } });

  revalidatePath(`/verity/clients/${key.factoryId}`);
  return { success: true };
}

/** Webhook endpoints for one tenant, with their recent delivery health. */
export async function listWebhookEndpoints(factoryId: string) {
  await requireHqAction();

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { factoryId },
    select: {
      id: true,
      name: true,
      url: true,
      secret: true,
      events: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Failed deliveries per endpoint — the number that says whether the
  // integration is actually working, rather than merely configured.
  const failures = await prisma.webhookDelivery.groupBy({
    by: ["endpointId"],
    where: { factoryId, status: "FAILED" },
    _count: { endpointId: true },
  });
  const failureCount = new Map(failures.map((f) => [f.endpointId, f._count.endpointId]));

  return endpoints.map((endpoint) => ({
    ...endpoint,
    createdAt: endpoint.createdAt.toISOString(),
    failedDeliveries: failureCount.get(endpoint.id) ?? 0,
  }));
}

/**
 * Add a webhook endpoint.
 *
 * The URL is checked before it is stored: this is an address we will make
 * authenticated outbound requests to, so a private or link-local target is an
 * SSRF vector, not a configuration mistake. It is checked again before every
 * delivery, because DNS can be repointed after the fact.
 */
export async function addWebhookEndpoint(input: {
  factoryId: string;
  name: string;
  url: string;
  events?: string[];
}) {
  const operator = await requireHqAction();

  const name = input.name?.trim();
  if (!name) return { error: "Give the endpoint a name." };

  const verdict = await assertDeliverable(input.url ?? "");
  if (!verdict.ok) return { error: verdict.reason };

  const unknown = (input.events ?? []).filter(
    (event) => !WEBHOOK_EVENTS.includes(event as (typeof WEBHOOK_EVENTS)[number]),
  );
  if (unknown.length > 0) return { error: `Unknown event(s): ${unknown.join(", ")}` };

  await prisma.webhookEndpoint.create({
    data: {
      factoryId: input.factoryId,
      name,
      url: verdict.url.toString(),
      secret: randomBytes(32).toString("hex"),
      events: input.events ?? [],
      createdById: operator.userId,
    },
  });

  revalidatePath(`/verity/clients/${input.factoryId}`);
  return { success: true };
}

/** Turn an endpoint off without losing its delivery history. */
export async function setWebhookEndpointActive(endpointId: string, isActive: boolean) {
  await requireHqAction();

  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
    select: { id: true, factoryId: true },
  });
  if (!endpoint) return { error: "Endpoint not found." };

  await prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { isActive } });

  revalidatePath(`/verity/clients/${endpoint.factoryId}`);
  return { success: true };
}
