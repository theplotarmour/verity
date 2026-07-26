import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";
import { getMaterialRequirement } from "@/server/actions/cad";
import { designLabel } from "@/lib/variant-descriptor";
import { ProductionLabel } from "./ProductionLabel";

// The production label is printed by CAD before manufacturing begins and stays
// attached to the production bag through Cutting, Stitching, QC, Packing and
// Dispatch. It carries everything the floor needs to identify the job without
// looking anything up.
export default async function ProductionLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getUserSession();
  if (!session) notFound();

  const order = await prisma.salesOrder.findFirst({
    where: { id, factoryId: session.factoryId },
    include: {
      customer: { select: { name: true } },
      design: { select: { name: true, category: true, imageUrls: true, cadFileUrl: true } },
      color: { select: { name: true } },
      material: { select: { name: true } },
      productType: { select: { name: true } },
      items: {
        include: {
          productVariant: {
            include: { product: { select: { name: true } } },
          },
        },
      },
    },
  });
  if (!order) notFound();

  const factory = await prisma.factory.findUnique({
    where: { id: session.factoryId },
    select: { name: true },
  });

  const requirement = await getMaterialRequirement(order.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const labelCode = order.labelCode || order.soNumber;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    `${siteUrl}/owner/production/label/${order.id}`
  )}`;

  return (
    <ProductionLabel
      factoryName={factory?.name ?? "Factory"}
      labelCode={labelCode}
      qrCodeUrl={qrCodeUrl}
      order={{
        soNumber: order.soNumber,
        customerName: order.customer?.name ?? "Stock Production",
        orderDate: order.orderDate.toISOString(),
        productName: order.items[0]?.productVariant?.product?.name ?? order.productType?.name ?? "Product",
        variantName: order.items[0]?.productVariant?.name ?? null,
        quantity: order.items.reduce((sum, i) => sum + i.quantity, 0),
        designName: order.design ? designLabel(order.design.name, order.design.category) : null,
        designCategory: order.design?.category ?? null,
        designImage: order.design?.imageUrls?.[0] ?? null,
        cadFileUrl: order.design?.cadFileUrl ?? null,
        fabricName: order.material?.name ?? null,
        colorName: order.color?.name ?? null,
        seatType: order.seatType ?? null,
        headrestCount: order.headrestCount ?? null,
        hasArmrest: order.hasArmrest,
        vehicleYear: order.vehicleYear ?? null,
        remarks: order.remarks ?? null,
      }}
      materials={requirement?.lines ?? []}
    />
  );
}
