import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { resolveConfig } from "@/server/platform/capability";
import { withTenant } from "@/server/platform/tenancy";
import { CONFIG_TENANT_STATE_CODE, invoiceDetail } from "@/server/capabilities/plywood";
import { PermissionDenied } from "@/components/ui/primitives";
import { InvoiceView } from "./InvoiceView";

export const dynamic = "force-dynamic";

/**
 * One tax invoice, printable.
 *
 * plywood.md §1.5 asks for a professional GST invoice with print and share. This
 * is the print surface: a browser print dialog against a stylesheet, which is
 * how Kent's bill works and needs no PDF library, no headless browser and no
 * storage round trip. "Share" is the same button — every operating system prints
 * to PDF.
 */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { invoiceId } = await params;

  let invoice: Awaited<ReturnType<typeof invoiceDetail.handler>>;
  try {
    invoice = await executeQuery(actor, invoiceDetail, { invoiceId });
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="this invoice" />;
    throw error;
  }
  if (!invoice) notFound();

  // The seller's own identity on the document. Read from the tenant and its
  // configuration rather than hard-coded, because the same code prints for the
  // next board trader.
  const seller = await withTenant(actor.tenantId, async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { name: true },
    });
    const stateCode = await resolveConfig<unknown>(tx, CONFIG_TENANT_STATE_CODE);
    return {
      name: tenant?.name ?? "—",
      stateCode: stateCode === undefined || stateCode === null ? null : String(stateCode),
    };
  });

  return <InvoiceView invoice={invoice} seller={seller} />;
}
