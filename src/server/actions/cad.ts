"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";
import { revalidatePath } from "next/cache";

// The CAD department is the first production stage. It owns the technical data
// every later department depends on: cutting patterns, standard fabric
// consumption per design, and the production label.
//
// Material requirements are never typed in by hand during production. They are
// calculated from master data (the design's standard consumption plus the
// blueprint BOM) before the production is released to the floor, so the Cutting
// department issues exactly the calculated quantity and nothing more.

export type MaterialLine = {
  itemId: string | null;
  name: string;
  uom: string;
  perUnit: number;
  quantity: number;
  source: "DESIGN" | "BOM";
};

export type MaterialRequirement = {
  orderId: string;
  soNumber: string;
  labelCode: string | null;
  totalQty: number;
  designName: string | null;
  lines: MaterialLine[];
  warnings: string[];
};

export async function getMaterialRequirement(orderId: string): Promise<MaterialRequirement | null> {
  const session = await getUserSession();
  if (!session) return null;

  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, factoryId: session.factoryId },
    include: {
      design: true,
      material: true,
      items: {
        include: {
          blueprintVersion: { include: { bom: { include: { items: { include: { item: true } } } } } },
        },
      },
    },
  });
  if (!order) return null;

  const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0) || 1;
  const lines: MaterialLine[] = [];
  const warnings: string[] = [];

  // 1. Fabric, from the design's standard consumption held in Master Data.
  if (order.design) {
    // Deferred with the BOM work: this figure has to become a spec field on
    // the design category before cutting plans can use it again.
    const perUnit = 0;
    if (perUnit > 0) {
      lines.push({
        itemId: order.materialId,
        name: order.material?.name || `${order.design.name} fabric`,
        uom: order.material?.defaultUOM || "m",
        perUnit,
        quantity: round2(perUnit * totalQty),
        source: "DESIGN",
      });
    } else {
      warnings.push(
        // Do not send him to "Master Data → Designs": that screen is gone, and
        // there is nowhere to set this figure yet. Say so rather than sending
        // him looking for a setting that does not exist.
        `Fabric for design "${order.design.name}" has to be added by hand — standard consumption per design is not back yet. Everything else below still comes from the blueprint BOM.`
      );
    }
  } else {
    warnings.push("No design selected on this production — fabric cannot be calculated.");
  }

  // 2. Everything else, from the blueprint BOM, waste included.
  const seen = new Map<string, MaterialLine>();
  for (const item of order.items) {
    const bomItems = item.blueprintVersion?.bom?.items ?? [];
    for (const bi of bomItems) {
      const perUnit = bi.quantity * (1 + (bi.wastePercent || 0) / 100);
      const existing = seen.get(bi.itemId);
      if (existing) {
        existing.quantity = round2(existing.quantity + perUnit * item.quantity);
      } else {
        seen.set(bi.itemId, {
          itemId: bi.itemId,
          name: bi.item.name,
          uom: bi.item.defaultUOM || "pcs",
          perUnit: round2(perUnit),
          quantity: round2(perUnit * item.quantity),
          source: "BOM",
        });
      }
    }
  }
  lines.push(...seen.values());

  if (lines.length === 0) {
    warnings.push("No BOM on the blueprint and no design consumption — nothing to calculate.");
  }

  return {
    orderId: order.id,
    soNumber: order.soNumber,
    labelCode: order.labelCode,
    totalQty,
    designName: order.design?.name ?? null,
    lines,
    warnings,
  };
}

// Production label: generated once, before manufacturing begins, and reused
// forever after. It is the identity of the physical bag, so it must be stable.
export async function ensureProductionLabel(orderId: string) {
  const session = await getUserSession();
  if (!session) return { error: "Unauthorized" };

  const order = await prisma.salesOrder.findFirst({
    where: { id: orderId, factoryId: session.factoryId },
    select: { id: true, labelCode: true, soNumber: true },
  });
  if (!order) return { error: "Production not found" };
  if (order.labelCode) return { success: true, labelCode: order.labelCode };

  const labelCode = `LBL-${order.soNumber.replace(/^SO-?/i, "")}`;
  await prisma.salesOrder.update({ where: { id: order.id }, data: { labelCode } });
  revalidatePath(`/owner/production`);
  return { success: true, labelCode };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
