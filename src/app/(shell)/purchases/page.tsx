import { withPageAccess } from "@/components/ui/PageAccess";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listLocations } from "@/server/capabilities/location";
import {
  listCatalogue,
  listSuppliers,
  openOrders,
  supplierPrices,
  productTaxRates,
} from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { PurchaseDesk } from "./PurchaseDesk";
import { productLabel } from "@/server/capabilities/plywood/product";

export const dynamic = "force-dynamic";

/**
 * Buying: who is owed goods, and what is still outstanding on each order.
 *
 * The order that is half-delivered is the one this screen exists for. A
 * completed order is history; a draft is a note to self.
 */
async function PurchasesPage() {
  installCapabilities();
  const actor = await requireActor();

  let orders: Awaited<ReturnType<typeof openOrders.handler>>;
  try {
    orders = await executeQuery(actor, openOrders, {});
  } catch (error) {
    if (error instanceof ForbiddenError)
      return <PermissionDenied what="purchase orders" />;
    throw error;
  }

  const [suppliers, godowns, catalogue, agreed] = await Promise.all([
    executeQuery(actor, listSuppliers, {}),
    executeQuery(actor, listLocations, {}),
    executeQuery(actor, listCatalogue, {}),
    // Task 71 item 8: the buyer sees the price they already agreed, in the
    // field, instead of a box that says "blank uses agreed price".
    executeQuery(actor, supplierPrices, {}),
  ]);

  // The GST rate per product, so the order form can show what the purchase
  // will actually cost rather than only its taxable value. Resolved on the
  // server because the rate comes from a dated rule and a tenant default, and
  // duplicating that decision in the browser is how the two start disagreeing.
  const taxRates = await executeQuery(actor, productTaxRates, {}).catch(
    (error) => {
      if (error instanceof ForbiddenError) throw error;
      throw error;
    },
  );

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Orders placed with suppliers, and what is still owed on each. Receiving against an order moves the stock in the same step — there is no separate goods-received entry to forget."
      />
      <PurchaseDesk
        taxRates={taxRates}
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
        agreed={agreed}
        // U2-6: a dropdown labelled "Board" must not offer a service. A service
        // is not held in a godown, cannot be received into one, and cannot be
        // reserved — offering it invites an order that fails at the first step
        // that touches stock.
        boards={catalogue.flatMap((brand) =>
          brand.products
            .filter((product) => product.type === "PHYSICAL")
            .map((product) => ({
              id: product.id,
            // Thickness where a family has one, size where it does not — a
            // louvre has no thickness and three of them share a name.
            label: productLabel(product, brand.brandName),
            })),
        )}
      />
    </>
  );
}

export default withPageAccess(PurchasesPage);
