import { redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getAssetsData } from "@/server/actions/assets";
import { AssetsClient } from "./AssetsClient";

export default async function AssetsPage() {
  await guardModulePage("assets");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { assets, sites, holders, stats } = await getAssetsData();

  return <AssetsClient assets={assets} sites={sites} holders={holders} stats={stats} />;
}
