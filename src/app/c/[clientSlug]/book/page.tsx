import { notFound } from "next/navigation";

import { resolvePortalTenant, publishedCatalog } from "@/server/internal/portal";
import { getPortalStaff } from "@/server/actions/portal";
import { BookClient } from "./client";

export const dynamic = "force-dynamic";

/**
 * The customer booking portal.
 *
 * `resolvePortalTenant` with `booking` is the gate: an unknown slug and a tenant
 * without the module both 404. That is deliberate — "this shop does not take
 * online bookings" and "this shop does not exist" look the same from outside,
 * and the alternative leaks which slugs are real.
 */
export default async function BookPortalPage({
  params,
}: {
  params: Promise<{ clientSlug: string }>;
}) {
  const { clientSlug } = await params;
  const tenant = await resolvePortalTenant(clientSlug, "booking");
  if (!tenant) notFound();

  const [services, staff] = await Promise.all([
    publishedCatalog(tenant.factoryId, "SERVICE"),
    getPortalStaff(clientSlug),
  ]);

  return (
    <BookClient
      slug={clientSlug}
      tenantName={tenant.name}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        pricePaise: s.pricePaise,
      }))}
      staff={staff}
    />
  );
}
