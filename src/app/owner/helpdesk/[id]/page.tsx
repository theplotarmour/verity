import { notFound, redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getTicketDetail } from "@/server/actions/helpdesk";
import { TicketDetailClient } from "./TicketDetailClient";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardModulePage("helpdesk");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { id } = await params;
  const data = await getTicketDetail(id);
  // Null covers both "no such ticket" and "belongs to another tenant" — the
  // lookup is tenant-scoped, so the two are indistinguishable by design.
  if (!data) notFound();

  return (
    <TicketDetailClient
      ticket={data.ticket}
      comments={data.comments}
      workOrders={data.workOrders}
      agents={data.agents}
      sites={data.sites}
    />
  );
}
