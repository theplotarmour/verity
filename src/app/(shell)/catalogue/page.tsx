import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import {
  listCatalogue,
  listShades,
  listTextures,
} from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { CatalogueAdmin } from "./CatalogueAdmin";

export const dynamic = "force-dynamic";

/**
 * The product catalogue.
 *
 * Withdrawn products are shown here and nowhere else, for the same reason the
 * menu shows retired dishes: a purchase order from last quarter references what
 * was traded, so nothing is ever deleted.
 */
export default async function CataloguePage() {
  installCapabilities();
  const actor = await requireActor();

  let catalogue: Awaited<ReturnType<typeof listCatalogue.handler>>;
  // The two laminate variant axes, fetched here so the add-product form can
  // offer them as a list to pick from. A free text box would spell one shade
  // three ways across twenty-five generated rows, and nothing would group them
  // again.
  let shades: Awaited<ReturnType<typeof listShades.handler>> = [];
  let textures: Awaited<ReturnType<typeof listTextures.handler>> = [];
  try {
    [catalogue, shades, textures] = await Promise.all([
      executeQuery(actor, listCatalogue, { includeInactive: true }),
      executeQuery(actor, listShades, {}),
      executeQuery(actor, listTextures, {}),
    ]);
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="the catalogue" />;
    throw error;
  }

  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Every board, plywood sheet, laminate and louvre this business trades, by brand. Each family is quoted in its own unit — feet for sheets, inches for louvres. A size is fixed at creation: an 18 mm board and a 12 mm board are two products, not one that was corrected."
      />
      <CatalogueAdmin catalogue={catalogue} shades={shades} textures={textures} />
    </>
  );
}
