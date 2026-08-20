// Deliberately not "use server", for the same reason as orderItemResolver: this
// takes a factoryId and an exported action taking one is an invitation to write
// orders into another tenant's floor. The only caller is the route handler,
// which derives that factoryId from an authenticated API key.

import prisma from "@/lib/prisma";
import { resolveOrderItem } from "@/server/actions/orderItemResolver";
import { enqueueWebhook } from "@/lib/webhooks/outbox";

/**
 * Book an order that arrived from an external channel.
 *
 * The order lands in DRAFT — the same state the studio produces — so it joins
 * the Drafts queue an owner already releases from. That matters: an external
 * storefront should not be able to put work on the floor without anyone here
 * agreeing to it, and the release step is where a human sees the order.
 *
 * `createOrder` is not reused because it opens with `getOwnerUser()` and there
 * is no user here. What is shared is the part that must not diverge:
 * `resolveOrderItem`, which decides *what is being made* from the spec. That is
 * the logic with real consequences, and having two of it would mean an order
 * from Shopify producing a different item than the same order typed in by hand.
 */

export interface IngestLine {
  quantity: number;
  /** Free-text spec from the channel; matched to items by name, case-insensitively. */
  sku?: string | null;
  itemId?: string | null;
  unitPrice?: number | null;
}

export interface IngestOrderInput {
  externalId?: string | null;
  customer: { name: string; phone?: string | null };
  orderType?: "RETAIL" | "DEALER" | "OEM" | "INTERNAL";
  expectedDeliveryDate?: string | null;
  remarks?: string | null;
  /** Vehicle and spec, matched to the factory's own master data by name. */
  vehicle?: {
    brand?: string | null;
    model?: string | null;
    year?: string | null;
  };
  spec?: {
    material?: string | null;
    design?: string | null;
    colour?: string | null;
    seatType?: string | null;
    hasArmrest?: boolean | null;
    headrestCount?: number | null;
  };
  lines: IngestLine[];
}

export interface IngestResult {
  salesOrderId: string;
  soNumber: string;
  status: string;
  itemResolved: boolean;
  warnings: string[];
}

/**
 * Match a name the channel sent to an item in this factory.
 *
 * Scoped to the factory on every lookup — a name is not a global identifier and
 * "Black" exists in every tenant. Returns null rather than creating: an inbound
 * order should not be able to mint master data, or a typo in a Shopify variant
 * becomes a permanent category entry nobody asked for.
 */
async function matchItemByName(factoryId: string, name: string | null | undefined) {
  if (!name?.trim()) return null;
  const found = await prisma.product.findFirst({
    where: { factoryId, name: { equals: name.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  return found?.id ?? null;
}

export async function ingestExternalOrder(
  factoryId: string,
  input: IngestOrderInput,
): Promise<IngestResult> {
  const warnings: string[] = [];

  // Names resolved before the transaction: these are reads, and holding a
  // transaction open across half a dozen of them is how a pool gets exhausted.
  const [materialId, designId, colorId, vehicleBrandId, vehicleModelId] = await Promise.all([
    matchItemByName(factoryId, input.spec?.material),
    matchItemByName(factoryId, input.spec?.design),
    matchItemByName(factoryId, input.spec?.colour),
    matchItemByName(factoryId, input.vehicle?.brand),
    matchItemByName(factoryId, input.vehicle?.model),
  ]);

  // Report what could not be matched rather than silently dropping it. An order
  // booked without its fabric is worse than one booked with a warning attached.
  const unmatched: [string, string | null | undefined, string | null][] = [
    ["material", input.spec?.material, materialId],
    ["design", input.spec?.design, designId],
    ["colour", input.spec?.colour, colorId],
    ["vehicle brand", input.vehicle?.brand, vehicleBrandId],
    ["vehicle model", input.vehicle?.model, vehicleModelId],
  ];
  for (const [label, sent, resolved] of unmatched) {
    if (sent?.trim() && !resolved) {
      warnings.push(`No ${label} named "${sent.trim()}" in this workspace.`);
    }
  }

  // A line may name an item directly; verify it belongs here before trusting it.
  const lineItemIds = await Promise.all(
    input.lines.map(async (line) => {
      if (line.itemId) {
        const owned = await prisma.product.findFirst({
          where: { id: line.itemId, factoryId },
          select: { id: true },
        });
        if (owned) return owned.id;
        warnings.push(`Item ${line.itemId} is not in this workspace; ignored.`);
      }
      return matchItemByName(factoryId, line.sku);
    }),
  );

  const orderedItemId =
    lineItemIds.find(Boolean) ??
    (await resolveOrderItem(factoryId, {
      productTypeId: null,
      vehicleBrandId,
      vehicleModelId,
      materialId,
      designId,
      colorId,
      seatType: input.spec?.seatType ?? null,
      hasArmrest: input.spec?.hasArmrest ?? null,
      headrestCount: input.spec?.headrestCount ?? null,
    }));

  if (!orderedItemId) {
    warnings.push("Could not resolve what this order makes; set the item before releasing it.");
  }

  const soNumber = `EXT-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

  const order = await prisma.$transaction(async (tx) => {
    let customer = await tx.customer.findFirst({
      where: { factoryId, name: { equals: input.customer.name, mode: "insensitive" } },
    });
    if (!customer) {
      customer = await tx.customer.create({
        data: { factoryId, name: input.customer.name, phone: input.customer.phone ?? null },
      });
    }

    const created = await tx.salesOrder.create({
      data: {
        factoryId,
        soNumber,
        customerId: customer.id,
        // DRAFT, not APPROVED. An external system may propose work; a person
        // here decides it goes to the floor.
        status: "DRAFT",
        orderType: input.orderType ?? "RETAIL",
        labelCode: `LBL-${soNumber}`,
        expectedDeliveryDate: input.expectedDeliveryDate
          ? new Date(input.expectedDeliveryDate)
          : null,
        itemId: orderedItemId,
        materialId,
        designId,
        colorId,
        vehicleBrandId,
        vehicleModelId,
        vehicleYear: input.vehicle?.year ?? null,
        seatType: input.spec?.seatType ?? null,
        hasArmrest: input.spec?.hasArmrest ?? false,
        headrestCount: input.spec?.headrestCount ?? null,
        remarks: input.remarks ?? null,
        // The channel's own id, kept so a duplicate can be spotted by a human
        // and so the outbound webhook can quote it back.
        dynamicData: input.externalId ? { externalId: input.externalId } : undefined,
        items: {
          create: input.lines.map((line, i) => ({
            itemId: lineItemIds[i] ?? orderedItemId,
            quantity: line.quantity,
            unitPrice: line.unitPrice ?? 0,
          })),
        },
      },
      select: { id: true, soNumber: true, status: true },
    });

    // Enqueued in the same transaction as the order. If this rolled back and
    // the enqueue did not, we would announce an order that does not exist.
    await enqueueWebhook(tx, factoryId, "ORDER_RECEIVED", {
      salesOrderId: created.id,
      soNumber: created.soNumber,
      externalId: input.externalId ?? null,
      status: created.status,
      warnings,
    });

    return created;
  });

  return {
    salesOrderId: order.id,
    soNumber: order.soNumber,
    status: order.status,
    itemResolved: !!orderedItemId,
    warnings,
  };
}
