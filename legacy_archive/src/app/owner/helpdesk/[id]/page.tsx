import { notFound, redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getHelpdeskData, getTicketDetail } from "@/server/actions/helpdesk";
import { Workspace } from "@/components/layout/Workspace";
import { QueuePane } from "@/components/service/QueuePane";
import { TicketDetailClient } from "./TicketDetailClient";

/**
 * A ticket, in the two-pane workspace.
 *
 * The queue stays on screen beside the ticket, which is the point: working a
 * helpdesk means opening one request after another, and a full-page navigation
 * per ticket loses your place in the list every time.
 *
 * On a phone the queue is not rendered alongside — see `Workspace` for why that
 * is a real hide rather than a CSS one.
 */
export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardModulePage("helpdesk");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { id } = await params;

  // Both in parallel. The queue is the same query the index page runs, and it
  // is already cached per-request, so the pane costs a fraction of the detail.
  const [data, queue] = await Promise.all([getTicketDetail(id), getHelpdeskData()]);

  // Null covers both "no such ticket" and "belongs to another tenant" — the
  // lookup is tenant-scoped, so the two are indistinguishable by design.
  if (!data) notFound();

  return (
    <Workspace
      selectedId={id}
      backHref="/owner/helpdesk"
      list={
        <QueuePane
          label="Tickets"
          activeId={id}
          items={queue.tickets.map((ticket) => ({
            id: ticket.id,
            href: `/owner/helpdesk/${ticket.id}`,
            code: ticket.ticketNumber,
            title: ticket.subject,
            meta: ticket.siteName ?? ticket.customerName ?? null,
            status: ticket.status.replace(/_/g, " ").toLowerCase(),
            // The action already decides this, including which statuses count as
            // closed. Recomputing it here would be a second definition of
            // "breached", free to drift from the one the queue sorts by.
            urgent: ticket.slaBreached,
          }))}
        />
      }
      detail={
        <div className="p-4">
          <TicketDetailClient
            ticket={data.ticket}
            comments={data.comments}
            workOrders={data.workOrders}
            agents={data.agents}
            sites={data.sites}
          />
        </div>
      }
    />
  );
}
