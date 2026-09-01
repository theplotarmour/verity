import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { salesOrderDetail } from "@/server/capabilities/plywood";
import { PermissionDenied } from "@/components/ui/primitives";
import { SalesOrderView } from "./SalesOrderView";

export const dynamic = "force-dynamic";

/**
 * §48 — the full connected lifecycle of one sale.
 *
 * Order, credit, stock, finance and everything it relates to, in the sequence
 * §80 gives them: customer → price → order → credit check → approval → reserve
 * → goods issue → invoice → receivable → payment.
 */
export default async function SalesOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { orderId } = await params;

  let order: Awaited<ReturnType<typeof salesOrderDetail.handler>>;
  try {
    order = await executeQuery(actor, salesOrderDetail, { orderId });
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="this sales order" />;
    throw error;
  }
  if (!order) notFound();

  return <SalesOrderView order={order} />;
}
