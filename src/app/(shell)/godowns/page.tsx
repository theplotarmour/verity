import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listLocations } from "@/server/capabilities/location";
import { listOrganizations } from "@/server/platform/administration";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { GodownList } from "./GodownList";

export const dynamic = "force-dynamic";

/**
 * The godowns a business holds stock in.
 *
 * Racks were withdrawn at the product owner's request, so this is one read
 * again: a godown is a `Location`, and there is no longer a second,
 * capability-owned layout to authorize separately.
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

  // §0 — hiding the generic Locations entry is only honest if a godown can be
  // created here. Otherwise onboarding step 3 leads to a menu item that no
  // longer exists.
  const organizations = await executeQuery(actor, listOrganizations, {}).catch((error) => {
    if (error instanceof ForbiddenError) return [];
    throw error;
  });

  const godowns = locations.map((location) => ({
    id: String(location.id),
    name: String(location.name),
  }));

  return (
    <>
      <PageHeader
        title="Godowns"
        description="Where stock physically sits. Every movement names a godown, so this is the first thing to set up. A godown that has held stock is archived rather than deleted — the movements that name it still have to read."
      />
      <GodownList
        godowns={godowns}
        organizations={organizations.map((organization) => ({
          id: organization.id,
          name: organization.name,
        }))}
      />
    </>
  );
}
