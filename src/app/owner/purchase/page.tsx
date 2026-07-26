import { getOwnerUser } from "@/lib/server/owner";
import { redirect } from "next/navigation";
import { getPurchaseOrders, getSuppliers, getReorderSuggestions } from "@/server/actions/purchase";
import { getMaterials } from "@/server/actions/inventory";
import PurchaseClient from "./PurchaseClient";
import { guardModulePage } from "@/platform/modules/guard";

export default async function PurchasePage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");
  await guardModulePage("procurement");

  const [orders, suppliers, materials, reorderSuggestions] = await Promise.all([
    getPurchaseOrders(),
    getSuppliers(),
    getMaterials(),
    getReorderSuggestions(),
  ]);

  return (
    <PurchaseClient
      orders={orders}
      suppliers={suppliers}
      materials={materials}
      reorderSuggestions={reorderSuggestions}
    />
  );
}
