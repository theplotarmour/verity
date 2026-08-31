import { notFound } from "next/navigation";
import { requireActor } from "@/server/platform/auth";
import { installCapabilities } from "@/server/capabilities/registry";
import { executeQuery } from "@/server/platform/query";
import { ForbiddenError } from "@/server/platform/authorization";
import { productDetail } from "@/server/capabilities/plywood";
import { PermissionDenied } from "@/components/ui/primitives";
import { ProductView } from "./ProductView";

export const dynamic = "force-dynamic";

/**
 * §10 — one board, and everything currently true about it.
 *
 * The specification's demand for this page is "connect everything ...
 * Everything is clickable". Stock by godown, both sides of its pricing, the
 * orders that will move it and the movements that already have — each of them
 * a link back to the record that owns the fact.
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  installCapabilities();
  const actor = await requireActor();
  const { productId } = await params;

  let product: Awaited<ReturnType<typeof productDetail.handler>>;
  try {
    product = await executeQuery(actor, productDetail, { productId });
  } catch (error) {
    if (error instanceof ForbiddenError) return <PermissionDenied what="this product" />;
    throw error;
  }
  if (!product) notFound();

  return <ProductView product={product} />;
}
