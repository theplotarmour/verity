import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { resolveAccess } from "@/platform/rbac/permissions";
import { getKitchenQueue } from "@/server/actions/kitchen";
import { KitchenClient } from "./client";

/**
 * The kitchen display.
 *
 * Gated on `kitchen.view` rather than on a job title: a small restaurant where the
 * owner cooks is the normal case, and a role check would lock them out of their own
 * kitchen.
 */
import { guardModulePage } from "@/platform/modules/guard";

export default async function KitchenPage() {
  const user = await getOwnerUser();
  if (!user) redirect("/onboarding");
  await guardModulePage("kitchen");

  const access = await resolveAccess(user.id);
  if (!access?.permissions.has("kitchen.view")) redirect("/unauthorized");

  const orders = await getKitchenQueue();

  return <KitchenClient orders={orders} canWork={access.permissions.has("kitchen.work")} />;
}
