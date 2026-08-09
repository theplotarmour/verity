import { notFound, redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getSiteDetail } from "@/server/actions/sites";
import { SiteDetailClient } from "./SiteDetailClient";

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await guardModulePage("sites");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { id } = await params;
  const data = await getSiteDetail(id);
  if (!data) notFound();

  return (
    <SiteDetailClient
      site={data.site}
      deployments={data.deployments}
      workOrders={data.workOrders}
      tickets={data.tickets}
      inspections={data.inspections}
      users={data.users}
      shifts={data.shifts}
    />
  );
}
