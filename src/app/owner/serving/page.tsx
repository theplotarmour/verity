import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { resolveAccess } from "@/platform/rbac/permissions";
import { getReadyOrders } from "@/server/actions/serving";
import { ServingClient } from "./client";

import { guardModulePage } from "@/platform/modules/guard";

export default async function ServingPage() {
  const user = await getOwnerUser();
  if (!user) redirect("/onboarding");
  await guardModulePage("serving");

  const access = await resolveAccess(user.id);
  if (!access?.permissions.has("serving.view")) redirect("/unauthorized");

  const orders = await getReadyOrders();

  return <ServingClient orders={orders} canWork={access.permissions.has("serving.work")} />;
}
