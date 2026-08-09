import { notFound, redirect } from "next/navigation";

import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import { getInvoiceDetail } from "@/server/actions/billing";
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
  const invoice = await getInvoiceDetail(id);
  if (!invoice) notFound();

  return (
    <InvoiceDetailClient
      invoice={invoice}
      issuerName={user.factory?.name ?? "Verity"}
      issuerAddress={user.factory?.address ?? null}
    />
  );
}
