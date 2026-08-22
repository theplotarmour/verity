import { notFound, redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getBillingData, getInvoiceDetail } from "@/server/actions/billing";
import { Workspace } from "@/components/layout/Workspace";
import { QueuePane } from "@/components/service/QueuePane";
import { InvoiceDetailClient } from "./InvoiceDetailClient";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardModulePage("billing");
  const user = await getOwnerUser();
  if (!user) redirect("/");

  const { id } = await params;
  const [invoice, queue] = await Promise.all([getInvoiceDetail(id), getBillingData()]);
  if (!invoice) notFound();

  return (
    <Workspace
      selectedId={id}
      backHref="/owner/billing"
      list={
        <QueuePane
          label="Invoices"
          activeId={id}
          items={queue.invoices.map((row) => ({
            id: row.id,
            href: `/owner/billing/${row.id}`,
            code: row.invoiceNumber,
            title: row.customerName,
            meta: row.siteName,
            status: row.status.toLowerCase(),
            // The action derives this, and more carefully than a due-date
            // comparison here would: only a SENT invoice can be overdue, so a
            // draft past its date is not chased. Recomputing it in render would
            // also be an impure call during a server render.
            urgent: row.overdue || row.status === "OVERDUE",
          }))}
        />
      }
      detail={
        <div className="p-4">
          <InvoiceDetailClient
            invoice={invoice}
            issuerName={user.factory?.name ?? "Verity"}
            issuerAddress={user.factory?.address ?? null}
          />
        </div>
      }
    />
  );
}
