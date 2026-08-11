import { notFound, redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getAssetDetail, getAssetsData } from "@/server/actions/assets";
import { Workspace } from "@/components/layout/Workspace";
import { QueuePane } from "@/components/service/QueuePane";
import { AssetDetailClient } from "./AssetDetailClient";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardModulePage("assets");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { id } = await params;
  const [data, queue] = await Promise.all([getAssetDetail(id), getAssetsData()]);
  if (!data) notFound();

  return (
    <Workspace
      selectedId={id}
      backHref="/owner/assets"
      list={
        <QueuePane
          label="Assets"
          activeId={id}
          items={queue.assets.map((asset) => ({
            id: asset.id,
            href: `/owner/assets/${asset.id}`,
            code: asset.assetCode,
            title: asset.name,
            meta: asset.siteName ?? asset.category ?? null,
            status: asset.status.replace(/_/g, " ").toLowerCase(),
            // Overdue maintenance is the reason to look at an asset at all.
            urgent: asset.maintenanceOverdue,
          }))}
        />
      }
      detail={
        <div className="p-4">
          <AssetDetailClient asset={data.asset} logs={data.logs} schedules={data.schedules} />
        </div>
      }
    />
  );
}
