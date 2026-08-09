import { notFound, redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getAssetDetail } from "@/server/actions/assets";
import { AssetDetailClient } from "./AssetDetailClient";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardModulePage("assets");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { id } = await params;
  const data = await getAssetDetail(id);
  if (!data) notFound();

  return (
    <AssetDetailClient asset={data.asset} logs={data.logs} schedules={data.schedules} />
  );
}
