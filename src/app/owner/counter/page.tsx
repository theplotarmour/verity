import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { listMenu } from "@/server/actions/menu";
import { getCounterQueue } from "@/server/actions/diningOrders";
import { CounterClient } from "./client";

/**
 * Table-less QSR counter.
 *
 * Gated on `tables_orders` entitlement — the module that owns the order. A QSR
 * tenant has no tables; this is where its orders are rung up and paid, and the
 * kitchen picks them up by token from the same queue a sit-down order joins.
 */
export default async function CounterPage() {
  const user = await getOwnerUser();
  if (!user) redirect("/onboarding");
  await guardModulePage("tables_orders");

  const [menu, queue] = await Promise.all([listMenu(), getCounterQueue()]);

  return <CounterClient menu={menu} initialQueue={queue} />;
}
