import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { scopeFilter } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_LOCATION } from "@/server/capabilities/location";
import { DataTable } from "@/components/ui/DataTable";
import { DemoDataNotice, PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { CreateLocationForm } from "./CreateLocationForm";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown> & {
  id: string; name: string; organization: string; place: string; geofences: number;
};

/**
 * Location list (§18).
 *
 * Rows are filtered by the actor's row-level scope, not merely by tenant: a
 * supervisor in one branch sees their own sites and their descendants, and never
 * a sibling branch's. That filter comes from the platform (PLA-AUT-004) rather
 * than from a `where` clause written here, so this page cannot accidentally be
 * more permissive than the permission model.
 */
export default async function LocationsPage() {
  installCapabilities();
  const actor = await requireActor();

  const result = await withTenant(actor.tenantId, async (tx) => {
    const scope = await scopeFilter(tx, actor, ENTITY_LOCATION, "Read");
    if (scope.organizationId.in.length === 0) return null;

    const [locations, organizations] = await Promise.all([
      tx.location.findMany({
        where: scope,
        include: { place: true, organization: true, _count: { select: { geofences: true } } },
        orderBy: { name: "asc" },
      }),
      tx.organization.findMany({ where: { id: { in: scope.organizationId.in } }, orderBy: { name: "asc" } }),
    ]);

    return {
      rows: locations.map<Row>((l) => ({
        id: l.id,
        name: l.name,
        organization: l.organization.name,
        place: l.place ? `${l.place.name}` : "No place linked",
        geofences: l._count.geofences,
      })),
      organizations: organizations.map((o) => ({ id: o.id, name: o.name })),
    };
  });

  if (!result) return <PermissionDenied what="reading locations" />;

  return (
    <>
      <PageHeader
        eyebrow="Capability"
        title="Locations"
        description="Operational sites. A Location is where work happens; the Place it references is where it physically is."
        actions={<CreateLocationForm organizations={result.organizations} />}
      />
      <DataTable
        caption="Locations"
        rows={result.rows}
        columns={[
          { key: "name", header: "Location", variant: "link", href: "/locations/{id}", subKey: "organization" },
          { key: "place", header: "Place" },
          { key: "geofences", header: "Geofences", numeric: true },
        ]}
        emptyTitle="No locations in your scope"
        emptyDescription="Locations you can see are limited to your organization and the branches beneath it."
      />
      <div className="mt-6">
        <DemoDataNotice />
      </div>
    </>
  );
}
