import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { supplierDetail } from "@/server/capabilities/plywood";
import { PermissionDenied } from "@/components/ui/primitives";
import { SupplierWorkspace } from "./SupplierWorkspace";

export const dynamic = "force-dynamic";

/**
 * §15 — a supplier as an operating account rather than a dropdown entry.
 *
 * One query fills every tab. Six sequential reads to draw one page is six
 * chances for the tabs to disagree with each other about the same balance,
 * which is precisely the "entered once, shown consistently" rule (§84) failing
 * on the read side instead of the write side.
 */
export default async function SupplierPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { supplierId } = await params;

  let supplier: Awaited<ReturnType<typeof supplierDetail.handler>>;
  try {
    supplier = await executeQuery(actor, supplierDetail, { supplierId });
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="this supplier" />;
    throw error;
  }
  if (!supplier) notFound();

  return <SupplierWorkspace supplier={supplier} />;
}
