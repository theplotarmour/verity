import { notFound, redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getSiteDetail, getSitesData } from "@/server/actions/sites";
import { Workspace } from "@/components/layout/Workspace";
import { QueuePane } from "@/components/service/QueuePane";
import { SiteDetailClient } from "./SiteDetailClient";

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardModulePage("sites");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { id } = await params;
  const [data, queue] = await Promise.all([getSiteDetail(id), getSitesData()]);
  if (!data) notFound();

  return (
    <Workspace
      selectedId={id}
      backHref="/owner/sites"
      list={
        <QueuePane
          label="Sites"
          activeId={id}
          items={queue.sites.map((site) => ({
            id: site.id,
            href: `/owner/sites/${site.id}`,
            code: site.siteCode,
            title: site.name,
            meta: site.customerName ?? site.city ?? null,
            status: site.status.replace(/_/g, " ").toLowerCase(),
            urgent: site.slaBreaches > 0,
          }))}
        />
      }
      detail={
        <div className="p-4">
          <SiteDetailClient
            site={data.site}
            deployments={data.deployments}
            workOrders={data.workOrders}
            tickets={data.tickets}
            inspections={data.inspections}
            users={data.users}
            shifts={data.shifts}
          />
        </div>
      }
    />
  );
}
