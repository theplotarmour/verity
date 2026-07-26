import { getMasterData, getRunningOrders } from "@/server/actions/orders";
import { OrdersClient } from "../production/client";
import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";

// A dedicated order-taking page for store managers (and other order takers):
// create customer orders only, no production/pending management visible.
export default async function OrderTakingPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");
  if (!(await canUser(dbUser, "CREATE_ORDER"))) redirect("/unauthorized");

  const factoryId = dbUser.factoryId;
  const [data, runningOrders] = await Promise.all([getMasterData(), getRunningOrders()]);
  if (!data) redirect("/");

  return (
    <OrdersClient
      data={data}
      factoryId={factoryId}
      runningOrders={runningOrders}
      inspections={[]}
      totalCheckpoints={1}
      mode="orderTaking"
      userRole={dbUser.role}
    />
  );
}
