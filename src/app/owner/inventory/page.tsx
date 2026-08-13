import { getOwnerUser } from "@/lib/server/owner";
import { redirect } from "next/navigation";
import { getStockLedger, getWarehouses, getMaterials, getProductVariants, getInventoryOverview, getMaterialVariance, getItemBatches } from "@/server/actions/inventory";
import { getDispatches, getDispatchableOrders } from "@/server/actions/dispatch";
import { getPendingDeliveries } from "@/server/actions/purchase";
import { getItemFormData } from "@/server/actions/items";
import InventoryClient from "./InventoryClient";
import { getStockableItems } from "@/server/queries/spec";

import { guardModulePage } from "@/platform/modules/guard";

export default async function InventoryPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");
  await guardModulePage("inventory");

  // Adjustment history is reachable from the Raw tab's movement ledger
  // (transactionType ADJUSTMENT) and no longer fetched as its own dataset —
  // the dedicated tab was folded into the Adjust action + existing ledger.
  const [overview, ledger, warehouses, materials, variants, dispatches, dispatchableOrders, pendingDeliveries, variance, batches, itemFormData, stockableItems] = await Promise.all([
    getInventoryOverview(),
    getStockLedger(),
    getWarehouses(),
    getMaterials(),
    getProductVariants(),
    getDispatches(),
    getDispatchableOrders(),
    getPendingDeliveries(),
    getMaterialVariance(),
    getItemBatches(),
    getItemFormData(),
      getStockableItems(),
  ]);

  return (
    <InventoryClient
      overview={overview}
      ledger={ledger}
      warehouses={warehouses}
      materials={materials}
      stockableItems={stockableItems}
      variants={variants}
      dispatches={dispatches}
      dispatchableOrders={dispatchableOrders}
      pendingDeliveries={pendingDeliveries}
      variance={variance}
      batches={batches}
      itemFormData={itemFormData}
      userRole={dbUser.role}
    />
  );
}
