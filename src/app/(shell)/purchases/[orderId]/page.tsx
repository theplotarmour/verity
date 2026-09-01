import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { purchaseOrderDetail } from "@/server/capabilities/plywood";
import { PermissionDenied } from "@/components/ui/primitives";
import { PurchaseOrderView } from "./PurchaseOrderView";

export const dynamic = "force-dynamic";

/**
 * §21 — the central record of one purchase.
 *
 * The specification is explicit that this "should be the central record": the
 * order, what has been received against it, whether the supplier has billed for
 * it, and everything it connects to. Every action the order can take is taken
 * from here rather than from a row in a list, because the decision needs the
 * context that only this page has.
 */
export default async function PurchaseOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { orderId } = await params;

  let order: Awaited<ReturnType<typeof purchaseOrderDetail.handler>>;
  try {
    order = await executeQuery(actor, purchaseOrderDetail, { orderId });
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="this purchase order" />;
    throw error;
  }
  if (!order) notFound();

  return <PurchaseOrderView order={order} />;
}
