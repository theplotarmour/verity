import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listLocations } from "@/server/capabilities/location";
import { listCatalogue, lowStock, stockOnHand } from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { StockBoard } from "./StockBoard";

export const dynamic = "force-dynamic";

/**
 * What is in the godowns, what it is worth, and what has run short.
 *
 * Valuation is at weighted average cost (P1). The screen says so, because an
 * owner reading a stock value is entitled to know which of three possible
 * numbers it is — FIFO and last-purchase-cost would both give a different one.
 */
export default async function StockPage() {
  installCapabilities();
  const actor = await requireActor();

  let onHand: Awaited<ReturnType<typeof stockOnHand.handler>>;
  try {
    onHand = await executeQuery(actor, stockOnHand, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="stock" />;
    throw error;
  }

  const [short, godowns, catalogue] = await Promise.all([
    executeQuery(actor, lowStock, {}),
    executeQuery(actor, listLocations, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
    executeQuery(actor, listCatalogue, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Stock"
        description="On hand by godown, valued at weighted average cost. Every figure here is the sum of movements that were recorded — nothing is typed in directly."
      />
      <StockBoard
        onHand={onHand}
        short={short}
        godowns={godowns.map((godown) => ({
          id: String(godown.id),
          name: String(godown.name),
        }))}
        boards={catalogue.flatMap((brand) =>
          brand.products.map((product) => ({
            id: product.id,
            label: `${brand.brandName} · ${product.name} · ${(product.thicknessTenthMm / 10).toFixed(1)} mm`,
            unitLabel: product.unitLabel,
          })),
        )}
      />
    </>
  );
}
