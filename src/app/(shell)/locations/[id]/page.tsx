import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { assertRowInScope, ForbiddenError } from "@/server/platform/authorization";
import { ENTITY_LOCATION } from "@/server/capabilities/location";
import { installCapabilities } from "@/server/capabilities/registry";
import { entityHistory } from "@/server/platform/audit";
import {
  DefinitionList, PageHeader, PermissionDenied, SectionHeading, Surface,
} from "@/components/ui/primitives";
import { AuditTrail } from "@/components/shell/AuditTrail";

export const dynamic = "force-dynamic";

/**
 * Location detail — the reusable entity experience shape (§12):
 * identity, related records, history.
 *
 * Row-level authorization is re-checked here rather than assumed from the list.
 * A list filters, but a detail page can be reached by typing a URL, and the
 * platform must be the thing that says no.
 */
export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  installCapabilities();
  const { id } = await params;
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    const location = await tx.location.findUnique({
      where: { id },
      include: { place: true, organization: true, geofences: true, assets: true, assignments: true },
    });
    if (!location) return { notFound: true as const };

    try {
      await assertRowInScope(tx, actor, ENTITY_LOCATION, "Read", {
        organizationId: location.organizationId,
        locationId: location.id,
      });
    } catch (error) {
      if (error instanceof ForbiddenError) return { denied: true as const };
      throw error;
    }

    const history = await entityHistory(tx, ENTITY_LOCATION, location.id);
    return { location, history };
  });

  if ("notFound" in data) notFound();
  if ("denied" in data) return <PermissionDenied what="viewing this location" />;

  const { location, history } = data;

  return (
    <>
      <PageHeader title={location.name} description={`Operational site in ${location.organization.name}`} />

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-8">
          <section>
            <SectionHeading>Identity</SectionHeading>
            <Surface className="p-5">
              <DefinitionList
                items={[
                  { term: "Organization", value: location.organization.name },
                  {
                    term: "Place",
                    value: location.place
                      ? `${location.place.name}${
                          location.place.latitude
                            ? ` · ${Number(location.place.latitude).toFixed(4)}, ${Number(location.place.longitude).toFixed(4)}`
                            : ""
                        }`
                      : "No place linked — this site has no physical coordinates",
                  },
                  { term: "Assets on site", value: String(location.assets.length) },
                  { term: "Assigned users", value: String(location.assignments.length) },
                ]}
              />
            </Surface>
          </section>

          <section>
            <SectionHeading note="Geofences are policies, not places">Geofences</SectionHeading>
            <Surface className="p-1">
              {location.geofences.length === 0 ? (
                <p className="text-text-secondary px-4 py-6 m-0">
                  No geofence defined. Evidence captured here will record coordinates but no boundary verdict.
                </p>
              ) : (
                <ul className="list-none m-0 p-0">
                  {location.geofences.map((fence) => (
                    <li
                      key={fence.id}
                      className="flex items-baseline justify-between gap-4 px-4 py-3 border-b border-line last:border-b-0"
                    >
                      <span className="text-text">{fence.name}</span>
                      <span className="text-[13px] text-text-tertiary tabular">
                        {Number(fence.centreLat).toFixed(4)}, {Number(fence.centreLng).toFixed(4)} · {fence.radiusMetres} m
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </section>
        </div>

        <section>
          <SectionHeading>History</SectionHeading>
          <AuditTrail entries={history.map((h) => ({
            id: h.id,
            field: h.fieldChanged,
            from: h.oldValue,
            to: h.newValue,
            at: h.occurredAt.toISOString(),
            command: h.commandKey,
          }))} />
        </section>
      </div>
    </>
  );
}
