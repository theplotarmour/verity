import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getServiceWorkOrdersData } from "@/server/actions/helpdesk";
import { ServiceWorkOrdersClient } from "./ServiceWorkOrdersClient";

export default async function ServiceWorkOrdersPage() {
  await guardModulePage("helpdesk");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const data = await getServiceWorkOrdersData();

  return (
    <ServiceWorkOrdersClient
      workOrders={data.workOrders}
      customers={data.customers}
      technicians={data.technicians}
      sites={data.sites}
      assets={data.assets}
      checklists={data.checklists}
      stats={data.stats}
    />
  );
}
