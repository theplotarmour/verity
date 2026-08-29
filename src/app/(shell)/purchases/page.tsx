import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listLocations } from "@/server/capabilities/location";
import { listCatalogue, listSuppliers, openOrders } from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { PurchaseDesk } from "./PurchaseDesk";

export const dynamic = "force-dynamic";

/**
 * Buying: who is owed goods, and what is still outstanding on each order.
 *
 * The order that is half-delivered is the one this screen exists for. A
 * completed order is history; a draft is a note to self.
 */
export default async function PurchasesPage() {
  installCapabilities();
  const actor = await requireActor();

  let orders: Awaited<ReturnType<typeof openOrders.handler>>;
  try {
    orders = await executeQuery(actor, openOrders, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="purchase orders" />;
    throw error;
  }

  const [suppliers, godowns, catalogue] = await Promise.all([
    executeQuery(actor, listSuppliers, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
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
        title="Purchases"
        description="Orders placed with suppliers, and what is still owed on each. Receiving against an order moves the stock in the same step — there is no separate goods-received entry to forget."
      />
      <PurchaseDesk
        orders={orders.purchases}
        suppliers={suppliers.map((supplier) => ({
          id: supplier.id,
          displayName: supplier.displayName,
          gstin: supplier.gstin,
          stateCode: supplier.stateCode,
          openOrders: supplier.openOrders,
        }))}
        godowns={godowns.map((godown) => ({
          id: String(godown.id),
          name: String(godown.name),
        }))}
        boards={catalogue.flatMap((brand) =>
          brand.products.map((product) => ({
            id: product.id,
            label:
              product.thicknessTenthMm == null
                ? `${brand.brandName} · ${product.name}`
                : `${brand.brandName} · ${product.name} · ${(product.thicknessTenthMm / 10).toFixed(1)} mm`,
          })),
        )}
      />
    </>
  );
}
