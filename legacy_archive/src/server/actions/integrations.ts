"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { issueKeyMaterial } from "@/lib/server/api-keys";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/outbox";
import { assertDeliverable } from "@/lib/webhooks/url-guard";

/**
 * A tenant managing its own integration credentials.
 *
 * These mirror the operator actions in `hq.ts`, with one difference that is the
 * whole point of the file: **the factory is read from the session, never taken
 * as an argument.** The HQ versions take a `factoryId` because an operator
 * legitimately acts across tenants, and they are gated by `requireHqAction()`.
 * Exporting those same signatures to owners would hand every tenant a
 * parameter naming somebody else's workspace.
 *
 * Gated on ACCESS_SETTINGS: a key issued here can inject production work, which
 * is an owner-level decision, not something a supervisor does in passing.
 */

async function requireSettingsAccess() {
  const user = await getOwnerUser();
  if (!user) return null;
  if (!(await canUser(user, "ACCESS_SETTINGS"))) return null;
  return user;
}

export async function listMyApiKeys() {
  const user = await requireSettingsAccess();
  if (!user) return [];

  const keys = await prisma.apiKey.findMany({
    where: { factoryId: user.factoryId },
    select: {
      id: true,
      name: true,
      prefix: true,
      signingSecret: true,
      externalDomain: true,
      revokedAt: true,
      lastUsedAt: true,
      createdAt: true,
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
 * Normalise a Shopify shop domain.
 *
 * People paste `https://acme.myshopify.com/admin`, `Acme.myshopify.com`, or
 * the bare handle. Shopify's webhook header sends the lowercase host and
 * nothing else, so anything that does not reduce to exactly that will never
 * match — and the symptom is an integration that silently receives nothing.
 */
function normaliseShopDomain(raw: string): string | { error: string } {
  let value = raw.trim().toLowerCase();
  if (!value) return "";

  value = value.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  // A bare handle is the commonest paste; complete it rather than refusing.
  if (!value.includes(".")) value = `${value}.myshopify.com`;

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value)) {
    return { error: `"${raw}" is not a Shopify domain. It should look like acme.myshopify.com.` };
  }
  return value;
}

/** Issue a key for the caller's own workspace. Token shown once. */
export async function issueMyApiKey(name: string, shopDomain?: string) {
  const user = await requireSettingsAccess();
  if (!user) return { error: "You do not have permission to manage integrations." };

  const label = name?.trim();
  if (!label) return { error: "Give the key a name so it can be told apart later." };

  let externalDomain: string | null = null;
  if (shopDomain?.trim()) {
    const normalised = normaliseShopDomain(shopDomain);
    if (typeof normalised !== "string") return normalised;
    externalDomain = normalised;

    // Globally unique, so this is checked before insert to return a sentence
    // rather than a constraint violation. The check is advisory — the unique
    // index is what actually guarantees it under a race.
    const taken = await prisma.apiKey.findUnique({
      where: { externalDomain },
      select: { factoryId: true },
    });
    if (taken) {
      return {
        error:
          taken.factoryId === user.factoryId
            ? "That shop is already connected to a key here. Revoke it first."
            : "That shop is already connected to another Verity workspace.",
      };
    }
  }

  // A cap, because each live key is an independent way in and "we issued
  // hundreds and cannot say which is which" is how a leak becomes unfixable.
  const live = await prisma.apiKey.count({
    where: { factoryId: user.factoryId, revokedAt: null },
  });
  if (live >= 10) {
    return { error: "You already have 10 active keys. Revoke one before issuing another." };
  }

  const material = issueKeyMaterial();
  await prisma.apiKey.create({
    data: {
      factoryId: user.factoryId,
      name: label,
      prefix: material.prefix,
      tokenHash: material.tokenHash,
      signingSecret: material.signingSecret,
      externalDomain,
      createdById: user.id,
    },
  });

  revalidatePath("/owner/settings/integrations");
  return {
    success: true,
    credentials: {
      token: material.token,
      signingSecret: material.signingSecret,
      prefix: material.prefix,
      shopDomain: externalDomain,
    },
  };
}

export async function revokeMyApiKey(keyId: string) {
  const user = await requireSettingsAccess();
  if (!user) return { error: "You do not have permission to manage integrations." };

  // findFirst scoped to the session's factory, not findUnique by id — a bare id
  // from the client would otherwise revoke another tenant's key.
  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, factoryId: user.factoryId },
    select: { id: true, revokedAt: true },
  });
  if (!key) return { error: "Key not found." };
  if (key.revokedAt) return { success: true };

  await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
  revalidatePath("/owner/settings/integrations");
  return { success: true };
}

export async function listMyWebhooks() {
  const user = await requireSettingsAccess();
  if (!user) return [];

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { factoryId: user.factoryId },
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

  const failures = await prisma.webhookDelivery.groupBy({
    by: ["endpointId"],
    where: { factoryId: user.factoryId, status: "FAILED" },
    _count: { endpointId: true },
  });
  const failed = new Map(failures.map((f) => [f.endpointId, f._count.endpointId]));

  return endpoints.map((endpoint) => ({
    ...endpoint,
    createdAt: endpoint.createdAt.toISOString(),
    failedDeliveries: failed.get(endpoint.id) ?? 0,
  }));
}

export async function addMyWebhook(input: { name: string; url: string; events?: string[] }) {
  const user = await requireSettingsAccess();
  if (!user) return { error: "You do not have permission to manage integrations." };

  const name = input.name?.trim();
  if (!name) return { error: "Give the endpoint a name." };

  // The SSRF check runs here, on tenant-supplied input, before anything is
  // stored. It runs again before each delivery, because DNS can be repointed
  // in between — that second check is not redundant.
  const verdict = await assertDeliverable(input.url ?? "");
  if (!verdict.ok) return { error: verdict.reason };

  const unknown = (input.events ?? []).filter(
    (event) => !WEBHOOK_EVENTS.includes(event as (typeof WEBHOOK_EVENTS)[number]),
  );
  if (unknown.length > 0) return { error: `Unknown event(s): ${unknown.join(", ")}` };

  await prisma.webhookEndpoint.create({
    data: {
      factoryId: user.factoryId,
      name,
      url: verdict.url.toString(),
      secret: randomBytes(32).toString("hex"),
      events: input.events ?? [],
      createdById: user.id,
    },
  });

  revalidatePath("/owner/settings/integrations");
  return { success: true };
}

export async function setMyWebhookActive(endpointId: string, isActive: boolean) {
  const user = await requireSettingsAccess();
  if (!user) return { error: "You do not have permission to manage integrations." };

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: endpointId, factoryId: user.factoryId },
    select: { id: true },
  });
  if (!endpoint) return { error: "Endpoint not found." };

  await prisma.webhookEndpoint.update({ where: { id: endpoint.id }, data: { isActive } });
  revalidatePath("/owner/settings/integrations");
  return { success: true };
}

/** Recent delivery attempts, so an owner can see why an integration is quiet. */
export async function listMyDeliveries(limit = 20) {
  const user = await requireSettingsAccess();
  if (!user) return [];

  const deliveries = await prisma.webhookDelivery.findMany({
    where: { factoryId: user.factoryId },
    select: {
      id: true,
      event: true,
      status: true,
      attempts: true,
      lastError: true,
      lastStatus: true,
      deliveredAt: true,
      createdAt: true,
      endpoint: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });

  return deliveries.map((d) => ({
    ...d,
    deliveredAt: d.deliveredAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  }));
}
