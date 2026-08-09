import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getHelpdeskData } from "@/server/actions/helpdesk";
import { HelpdeskClient } from "./HelpdeskClient";

export default async function HelpdeskPage() {
  // Entitlement first: a tenant without helpdesk gets their dashboard, not an
  // empty ticket queue that implies the module is merely unused.
  await guardModulePage("helpdesk");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const data = await getHelpdeskData();

  return (
    <HelpdeskClient
      tickets={data.tickets}
      customers={data.customers}
      agents={data.agents}
      sites={data.sites}
      stats={data.stats}
    />
  );
}
