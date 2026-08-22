import { notFound, redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getServiceInspection } from "@/server/actions/serviceQuality";
import { ServiceInspectionClient } from "./ServiceInspectionClient";

export default async function ServiceInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardModulePage("helpdesk");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { id } = await params;
  const inspection = await getServiceInspection(id);
  if (!inspection) notFound();

  return <ServiceInspectionClient inspection={inspection} />;
}
