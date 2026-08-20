import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { resolveAccess } from "@/platform/rbac/permissions";
import { getCatalog } from "@/server/actions/catalog";
import prisma from "@/lib/prisma";
import { CatalogClient } from "./client";

/**
 * The storefront view of the item catalogue.
 *
 * Gated on `catalog.view`, and the page passes `canManage` down rather than
 * hiding the screen from someone who may only look: an owner wants a manager to
 * see the menu without being able to reprice it.
 */
export default async function CatalogPage() {
  const user = await getOwnerUser();
  if (!user) redirect("/onboarding");
  await guardModulePage("catalog");

  const access = await resolveAccess(user.id);
  if (!access?.permissions.has("catalog.view")) redirect("/owner/dashboard");

  const [items, factory] = await Promise.all([
    getCatalog(),
    prisma.factory.findUnique({
      where: { id: user.factoryId },
      select: { slug: true },
    }),
  ]);

  return (
    <CatalogClient
      items={items}
      canManage={access.permissions.has("catalog.manage")}
      portalSlug={factory?.slug ?? null}
    />
  );
}
