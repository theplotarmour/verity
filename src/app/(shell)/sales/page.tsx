import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listLocations } from "@/server/capabilities/location";
import { listCatalogue, listCustomers, openOrders } from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { SalesDesk } from "./SalesDesk";

export const dynamic = "force-dynamic";

/**
 * Selling: orders taken, what is held for them, and who is over their limit.
 *
 * An order over its customer's credit limit is not refused — it is held, and it
 * appears here so someone with authority can decide. Refusing outright is how a
 * business ends up keeping the real order in a notebook.
 */
export default async function SalesPage() {
  installCapabilities();
  const actor = await requireActor();

  let orders: Awaited<ReturnType<typeof openOrders.handler>>;
  try {
    orders = await executeQuery(actor, openOrders, {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="sales orders" />;
    throw error;
  }

  const [customers, godowns, catalogue] = await Promise.all([
    executeQuery(actor, listCustomers, {}).catch((error) => {
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
        title="Sales"
        description="Orders taken from customers. Stock is held against an order before dispatch, so two representatives cannot promise the same sheets."
      />
      <SalesDesk
        orders={orders.sales}
        customers={customers}
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
