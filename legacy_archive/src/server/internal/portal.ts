// Deliberately not "use server". Every export of a server-action module is a
// public endpoint, and these take a tenant slug — as actions they would be a
// second, unguarded way into any tenant's data. The `"use server"` wrappers in
// `server/actions/portal.ts` are the endpoints; this is the logic under them.

import prisma from "@/lib/prisma";
import { hasModule } from "@/platform/modules/entitlements";
import type { ModuleKey } from "@/platform/modules/registry";
import { BRAND_ACCENT } from "@/lib/brand";

/**
 * The tenant behind a public portal URL.
 *
 * This is the whole trust boundary for the B2C portals. Everything past it runs
 * without a session, so three things have to be true before any query executes:
 *
 *  1. the slug resolves to a real factory — the slug is the tenant's public
 *     identity, taken from the URL, and is the *only* tenant input a portal
 *     accepts. A `factoryId` from a form body would let anyone book into
 *     anyone's diary;
 *  2. that tenant is entitled to the module the portal needs, so switching
 *     `booking` off in HQ closes `/c/<slug>/book` rather than leaving a public
 *     write path open behind a hidden nav item;
 *  3. the tenant has published something. An unconfigured tenant should read as
 *     "not open yet", not as an empty shop.
 *
 * Returns null rather than throwing: a bad slug is a 404, which is a page
 * decision, not an exception.
 */

export interface PortalTenant {
  factoryId: string;
  organizationId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  /** Hex, validated. Falls back to the Verity accent when a tenant has set none. */
  themeColor: string;
}

/** The one place a stored theme colour becomes a CSS value. */
function safeAccent(settings: unknown): string {
  const raw = (settings as { themeColor?: unknown } | null)?.themeColor;
  return typeof raw === "string" && /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : BRAND_ACCENT;
}

export async function resolvePortalTenant(
  slug: string,
  moduleKey: ModuleKey,
): Promise<PortalTenant | null> {
  const clean = slug?.trim().toLowerCase();
  if (!clean || !/^[a-z0-9-]{1,64}$/.test(clean)) return null;

  const factory = await prisma.factory.findUnique({
    where: { slug: clean },
    select: { id: true, organizationId: true, name: true, slug: true, logoUrl: true, settings: true },
  });
  if (!factory) return null;
  if (!(await hasModule(factory.organizationId, moduleKey))) return null;

  return {
    factoryId: factory.id,
    organizationId: factory.organizationId,
    name: factory.name,
    slug: factory.slug,
    logoUrl: factory.logoUrl,
    themeColor: safeAccent(factory.settings),
  };
}

/**
 * The tenant's published catalogue, for either portal.
 *
 * `itemType` narrows it: the booking portal wants services, the menu portal
 * wants finished products. Both want only what an owner deliberately published
 * and priced — `isPublished` is set on a screen that refuses to publish a
 * zero-priced item, so a portal never has to decide what "free" means.
 */
export async function publishedCatalog(
  factoryId: string,
  itemType: "SERVICE" | "FINISHED_PRODUCT",
) {
  return prisma.product.findMany({
    where: { factoryId, isPublished: true, status: "ACTIVE", itemType },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      pricePaise: true,
      category: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
}
