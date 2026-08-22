import { notFound } from "next/navigation";

import { resolvePortalTenant, publishedCatalog } from "@/server/internal/portal";
import { hasModule } from "@/platform/modules/entitlements";
import { MenuClient } from "./client";

export const dynamic = "force-dynamic";

/**
 * The customer menu portal.
 *
 * Gated on `catalog`, which is what publishes the items. Ordering additionally
 * needs `sales`, which owns SalesOrder — a tenant may publish a menu as a
 * price list without taking orders through it, so that is a prop rather than a
 * second gate on the page.
 */
export default async function MenuPortalPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const tenant = await resolvePortalTenant(clientSlug, "catalog");
  if (!tenant) notFound();

  const [items, canOrder] = await Promise.all([
    publishedCatalog(tenant.factoryId, "FINISHED_PRODUCT"),
    hasModule(tenant.organizationId, "sales"),
  ]);

  return (
    <MenuClient
      slug={clientSlug}
      tenantName={tenant.name}
      canOrder={canOrder}
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        imageUrl: i.imageUrl,
        pricePaise: i.pricePaise,
        categoryName: i.category?.name ?? "Menu",
      }))}
    />
  );
}
