import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";
import { getMaterialRequirement } from "@/server/actions/cad";
import { describeSpecDetails } from "@/lib/server/specUtils";
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
      // The order's item is what was actually made: its name/category is the
      // label text, its spec values are the printed fields.
      item: {
        select: {
          name: true,
          group: { select: { name: true } },
          specValues: {
            include: {
              field: { select: { name: true, sortOrder: true, unitSuffix: true } },
              option: { select: { label: true } },
              valueItem: { select: { name: true, aliasName: true } },
            },
          },
        },
      },
      items: true,
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
        productName: order.item?.group?.name ?? order.item?.name ?? "Product",
        // The item's full composed name — what someone reading the bag needs.
        variantName: order.item?.name ?? null,
        quantity: order.items.reduce((sum, i) => sum + i.quantity, 0),
        designImage: null,
        cadFileUrl: null,
        specDetails: describeSpecDetails(order.item),
        remarks: order.remarks ?? null,
      }}
      materials={requirement?.lines ?? []}
    />
  );
}
