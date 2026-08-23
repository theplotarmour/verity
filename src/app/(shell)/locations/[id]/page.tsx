import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { assertRowInScope, ForbiddenError } from "@/server/platform/authorization";
import { ENTITY_LOCATION } from "@/server/capabilities/location";
import { installCapabilities } from "@/server/capabilities/registry";
import { entityHistory } from "@/server/platform/audit";
import {
  DefinitionList,
  EmptyState,
  PageHeader,
  Panel,
  PermissionDenied,
  Row,
  RowList,
  Stat,
} from "@/components/ui/primitives";
import { AuditTrail } from "@/components/shell/AuditTrail";
import { buildFormDescriptor } from "@/server/platform/experience";
import { hasPermission } from "@/server/platform/authorization";
import { CustomFieldsPanel } from "./CustomFieldsPanel";

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
    // Built from the tenant's own declarations, so a newly declared field
    // appears without this page changing (PLA-EXT-002).
    const descriptor = await buildFormDescriptor(tx, ENTITY_LOCATION);
    const canEdit = await hasPermission(tx, actor.roleId, "Edit", ENTITY_LOCATION);
    return { location, history, descriptor, canEdit };
  });

  if ("notFound" in data) notFound();
  if ("denied" in data) return <PermissionDenied what="viewing this location" />;

  const { location, history } = data;

  return (
    <>
      {/*
        A detail page is an operational record, not a stack of equal cards. The
        eyebrow carries the parent so the title can be the site's own name, and
        the identity block sits at full width above the split — it is what the
        page is ABOUT, and burying it in a left column beside a history feed
        gives it the same weight as an audit row.
      */}
      <PageHeader
        eyebrow={`Location · ${location.organization.name}`}
        title={location.name}
        description={
          location.place
            ? `Sited at ${location.place.name}.`
            : "No place linked — this site has no physical coordinates."
        }
      />

      <div className="mb-6 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-4">
        <Stat label="Assets on site" value={location.assets.length} />
        <Stat label="Assigned users" value={location.assignments.length} />
        <Stat label="Geofences" value={location.geofences.length} />
        <Stat
          label="Coordinates"
          value={
            location.place?.latitude
              ? `${Number(location.place.latitude).toFixed(3)}, ${Number(location.place.longitude).toFixed(3)}`
              : "—"
          }
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Identity">
            <DefinitionList
              items={[
                { term: "Organization", value: location.organization.name },
                {
                  term: "Place",
                  value: location.place ? location.place.name : "No place linked",
                },
              ]}
            />
          </Panel>

          <Panel
            title="Geofences"
            action={
              <span className="text-[12px] text-text-tertiary">Policies, not places</span>
            }
            flush
          >
            {location.geofences.length === 0 ? (
              <EmptyState
                title="No geofence defined"
                description="Evidence captured here will record coordinates but no boundary verdict."
              />
            ) : (
              <RowList>
                {location.geofences.map((fence) => (
                  <Row key={fence.id}>
                    <span className="text-[14px] text-text">{fence.name}</span>
                    <span className="tabular shrink-0 text-[12px] text-text-tertiary">
                      {Number(fence.centreLat).toFixed(4)}, {Number(fence.centreLng).toFixed(4)} ·{" "}
                      {fence.radiusMetres} m
                    </span>
                  </Row>
                ))}
              </RowList>
            )}
          </Panel>

          <CustomFieldsPanel
            entityKey={ENTITY_LOCATION}
            entityId={location.id}
            descriptor={data.descriptor}
            values={(location.customFields as Record<string, unknown>) ?? {}}
            canEdit={data.canEdit}
          />
        </div>

        <Panel title="History" flush>
          <AuditTrail
            entries={history.map((h) => ({
              id: h.id,
              field: h.fieldChanged,
              from: h.oldValue,
              to: h.newValue,
              at: h.occurredAt.toISOString(),
              command: h.commandKey,
            }))}
          />
        </Panel>
      </div>
    </>
  );
}
