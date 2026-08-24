import { requireActor } from "@/server/platform/auth";
import { withTenant } from "@/server/platform/tenancy";
import { hasPermission } from "@/server/platform/authorization";
import { installCapabilities } from "@/server/capabilities/registry";
import { ENTITY_BOOKING } from "@/server/capabilities/scheduling";
import {
  EmptyState,
  PageHeader,
  Panel,
  PermissionDenied,
  Stat,
  StatRow,
  Surface,
} from "@/components/ui/primitives";
import { ScheduleGrid } from "./ScheduleGrid";

export const dynamic = "force-dynamic";

/**
 * Scheduling (§20) — the one place the brief encourages specialisation.
 *
 * A booking is a period, and a period is badly served by a row in a table: the
 * questions an operator asks are "what overlaps", "where is the gap", "who is
 * free", and a list answers none of them. So this is a resource-by-time grid.
 *
 * Times are rendered in UTC with the offset stated. Bible V4 §5.B expects
 * schedulers to work in a local project context, but the platform has no
 * per-tenant timezone setting yet, and silently rendering UTC as though it were
 * local would misplace every booking by the offset. Stating the zone is honest;
 * guessing it is not. Recorded as a gap.
 */
export default async function SchedulingPage() {
  installCapabilities();
  const actor = await requireActor();

  const data = await withTenant(actor.tenantId, async (tx) => {
    if (!(await hasPermission(tx, actor.roleId, "Read", ENTITY_BOOKING))) return null;

    const [resources, bookings, unavailable] = await Promise.all([
      tx.resource.findMany({
        where: { active: true },
        include: { party: true, asset: true },
        orderBy: { name: "asc" },
      }),
      tx.booking.findMany({ where: { cancelled: false }, orderBy: { startsAt: "asc" } }),
      tx.availabilityWindow.findMany({ where: { available: false } }),
    ]);

    return {
      resources: resources.map((r) => ({
        id: r.id,
        name: r.name,
        // ADR-008: exactly one backing, so this is never ambiguous.
        backing: r.partyId ? "Person" : "Asset",
      })),
      bookings: bookings.map((b) => ({
        id: b.id,
        resourceId: b.resourceId,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        subject: b.subjectEntityKey.split(".").pop() ?? b.subjectEntityKey,
      })),
      unavailable: unavailable.map((w) => ({
        id: w.id,
        resourceId: w.resourceId,
        startsAt: w.startsAt.toISOString(),
        endsAt: w.endsAt.toISOString(),
      })),
    };
  });

  if (!data) return <PermissionDenied what="reading the schedule" />;

  return (
    <>
      {/*
        Scheduling keeps its purpose-built grid. It is the one surface where
        density IS the design — an operator reads coverage across resources and
        time at a glance, and forcing it into the shared table would destroy the
        only view that answers "who is free when".
      */}
      <PageHeader
        title="Scheduling"
        description="Resources across time. A resource is a single schedulable unit backed by exactly one person or asset."
      />

      {data.resources.length === 0 ? (
        <Surface>
          <EmptyState
            title="No schedulable resources"
            description="A resource must be backed by a person or an asset. Register one to start scheduling against it."
          />
        </Surface>
      ) : (
        <>
          <StatRow cols={3} className="mb-6">
            <Stat label="Resources" value={data.resources.length} hint="Schedulable units" />
            <Stat label="Bookings" value={data.bookings.length} hint="In the 14-day window" />
            <Stat label="Unavailable" value={data.unavailable.length} hint="Declared windows" />
          </StatRow>

          <ScheduleGrid
            resources={data.resources}
            bookings={data.bookings}
            unavailable={data.unavailable}
          />

          <div className="mt-6">
            <Panel title="Conflict rules">
              <p className="m-0 max-w-[70ch] text-[13px] leading-relaxed text-text-secondary">
                Overlaps are rejected by the database, not by this screen. Intervals are half-open,
                so a booking that ends at 10:00 does not conflict with one that starts at 10:00.
              </p>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
