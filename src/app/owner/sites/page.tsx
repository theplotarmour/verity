import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getSitesData } from "@/server/actions/sites";
import { SitesClient } from "./SitesClient";

export default async function SitesPage() {
  await guardModulePage("sites");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { sites, customers, managers } = await getSitesData();

  return <SitesClient sites={sites} customers={customers} managers={managers} />;
}
