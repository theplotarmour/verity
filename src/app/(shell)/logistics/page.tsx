import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { listLocations } from "@/server/capabilities/location";
import {
  listCustomers,
  listTransporters,
  openOrders,
  trackMaterial,
} from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { LogisticsControl } from "./LogisticsControl";

export const dynamic = "force-dynamic";

/**
 * Where the material is.
 *
 * The search is server-side and lives in the URL, so a coordinator can send
 * somebody the exact view they are looking at — which is what happens when the
 * question is being relayed from a customer on the phone.
 */
export default async function LogisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { q } = await searchParams;

  let shipments: Awaited<ReturnType<typeof trackMaterial.handler>>;
  try {
    shipments = await executeQuery(actor, trackMaterial, q ? { search: q } : {});
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="shipments" />;
    throw error;
  }

  const [transporters, godowns, orders, customers] = await Promise.all([
    executeQuery(actor, listTransporters, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
    executeQuery(actor, listLocations, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
    executeQuery(actor, openOrders, {}).catch((error) => {
      if (error instanceof ForbiddenError) return { purchases: [], sales: [] };
      throw error;
    }),
    executeQuery(actor, listCustomers, {}).catch((error) => {
      if (error instanceof ForbiddenError) return [];
      throw error;
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Logistics"
        description="Search by LR number, customer or order reference. A shipment that never arrived is cancelled with a reason, never recorded as delivered."
      />
      <LogisticsControl
        shipments={shipments}
        transporters={transporters}
        godowns={godowns.map((godown) => ({
          id: String(godown.id),
          name: String(godown.name),
        }))}
        // Only orders a shipment can legitimately carry. A draft or cancelled
        // order would be refused, and offering it is an invitation to a failure.
        salesOrders={orders.sales
          .filter((order) => order.state !== "draft" && order.state !== "cancelled")
          .map((order) => ({ id: order.id, label: order.customerName }))}
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.displayName,
        }))}
        purchaseOrders={orders.purchases
          .filter((order) => order.state !== "draft" && order.state !== "cancelled")
          .map((order) => ({ id: order.id, label: order.supplierName }))}
        query={q ?? ""}
      />
    </>
  );
}
