import { getOwnerUser } from "@/lib/server/owner";
import { redirect } from "next/navigation";
import { getPurchaseOrders, getSuppliers, getReorderSuggestions } from "@/server/actions/purchase";
import { getMaterials } from "@/server/actions/inventory";
import PurchaseClient from "./PurchaseClient";

export default async function PurchasePage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");

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
