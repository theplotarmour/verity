import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listLocations } from "@/server/capabilities/location";
import { listGodownRacks } from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { GodownRacks } from "./GodownRacks";

export const dynamic = "force-dynamic";

/**
 * Rack layout inside each godown.
 *
 * Two reads, not one, and deliberately so. A godown is a `Location` and a rack
 * is a capability-owned row, so each is authorized on its own entity: someone
 * who may see the sites but not their internal layout sees the sites and an
 * empty layout, rather than an error or — worse — the layout.
 *
 * The rack query alone would also be the wrong read here. It returns godowns
 * that already have racks, which is exactly the set that excludes the one the
 * user came to fix: the empty godown they want to lay out first.
 */
export default async function GodownsPage() {
  installCapabilities();
  const actor = await requireActor();

  let locations: Array<Record<string, unknown>>;
  try {
    locations = await executeQuery(actor, listLocations, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="godowns" />;
    throw error;
  }

  let layout: Awaited<ReturnType<typeof listGodownRacks.handler>> = [];
  try {
    layout = await executeQuery(actor, listGodownRacks, { includeInactive: true });
  } catch (error) {
    if (!(error instanceof ForbiddenError)) throw error;
  }

  const racksByLocation = new Map(layout.map((entry) => [entry.locationId, entry.racks]));
  const godowns = locations.map((location) => ({
    id: String(location.id),
    name: String(location.name),
    racks: racksByLocation.get(String(location.id)) ?? [],
  }));

  return (
    <>
      <PageHeader
        title="Godowns"
        description="Where stock physically sits. A godown is a Location; a rack is a position inside it, and a retired rack keeps its history rather than disappearing."
      />
      <GodownRacks godowns={godowns} />
    </>
  );
}
