import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import {
  customerPrices,
  listCatalogue,
  listCustomers,
  listSuppliers,
  supplierPrices,
} from "@/server/capabilities/plywood";
import { PageHeader, PermissionDenied } from "@/components/ui/primitives";
import { PriceSheet } from "./PriceSheet";

export const dynamic = "force-dynamic";

/**
 * Agreed prices, as a sheet.
 *
 * Reported: "there should be an Excel-sheet kind of sheet for agreeing a price
 * with suppliers and customers."
 *
 * Agreeing prices is not one decision at a time. A merchant sits down with a
 * mill's rate card and works through it, and a dialog per board turned that
 * into one save and one reload per line — which is why the price lists were
 * mostly empty, and why "blank uses the agreed price" so often had nothing
 * behind it.
 */
export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ side?: string; party?: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const params = await searchParams;
  const side = params.side === "customer" ? "customer" : "supplier";

  let catalogue: Awaited<ReturnType<typeof listCatalogue.handler>>;
  try {
    catalogue = await executeQuery(actor, listCatalogue, {});
  } catch (error) {
    if (error instanceof ForbiddenError)
      return <PermissionDenied what="the catalogue" />;
    throw error;
  }

  const [suppliers, customers, agreedSupplier, agreedCustomer] =
    await Promise.all([
      executeQuery(actor, listSuppliers, {}).catch((error) => {
        if (error instanceof ForbiddenError) return [];
        throw error;
      }),
      executeQuery(actor, listCustomers, {}).catch((error) => {
        if (error instanceof ForbiddenError) return [];
        throw error;
      }),
      executeQuery(actor, supplierPrices, {}).catch((error) => {
        if (error instanceof ForbiddenError) return [];
        throw error;
      }),
      executeQuery(actor, customerPrices, {}).catch((error) => {
        if (error instanceof ForbiddenError) return [];
        throw error;
      }),
    ]);

  // Services are excluded: a price list is for things bought and sold by the
  // sheet, and a service has no unit rate a rate card would carry.
  const boards = catalogue.flatMap((brand) =>
    brand.products
      .filter((product) => product.type === "PHYSICAL")
      .map((product) => ({
        id: product.id,
        name: product.name,
        brandName: brand.brandName,
        thicknessTenthMm: product.thicknessTenthMm ?? null,
      })),
  );

  return (
    <>
      <PageHeader
        title="Agreed prices"
        description="One sheet per supplier or customer. Fill in what you have agreed, leave the rest blank, and save the lot in one go — an order with no price of its own uses the figure here."
      />
      <PriceSheet
        side={side}
        partyId={params.party ?? null}
        suppliers={suppliers.map((row) => ({
          id: row.id,
          displayName: row.displayName,
        }))}
        customers={customers.map((row) => ({
          id: row.id,
          displayName: row.displayName,
        }))}
        boards={boards}
        agreed={
          side === "supplier"
            ? agreedSupplier.map((row) => ({
                partyId: row.supplierId,
                productId: row.productId,
                pricePaise: row.negotiatedCostPaise,
              }))
            : agreedCustomer.map((row) => ({
                partyId: row.customerId,
                productId: row.productId,
                pricePaise: row.customPricePaise,
              }))
        }
      />
    </>
  );
}
