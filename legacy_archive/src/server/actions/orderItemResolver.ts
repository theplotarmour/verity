// Deliberately not "use server". Every export of a server-action module is a
// public endpoint, and this one takes the factory as an argument — so as an
// action it would have let any caller resolve or mint an item inside any other
// tenant. It is only ever called server-to-server, from the order path and from
// backfill scripts, so plain module scope is both safe and sufficient.

import prisma from "@/lib/prisma";

/** What the order studio collects about the thing being made. */
export type OrderSpec = {
  productTypeId?: string | null;
  vehicleBrandId?: string | null;
  vehicleModelId?: string | null;
  materialId?: string | null;
  designId?: string | null;
  colorId?: string | null;
  seatType?: string | null;
  hasArmrest?: boolean | null;
  headrestCount?: number | null;
};

/**
 * Turn the spec an order carries into the finished-good item it describes.
 *
 * This used to hash the order's answers into an item identity and mint a new
 * finished good the first time a combination was sold, through the spec engine.
 * That engine went with the MES layer: there are no spec fields to answer and
 * no group to key an identity on, so there is nothing left to resolve *from*.
 *
 * What remains is the honest part of the old contract: the order path and the
 * headless ingest must agree on what is being made. Both call this, and it now
 * answers only when the spec names an item the catalogue already holds.
 *
 * Returns null when nothing matches. Order taking must keep working in that
 * case, so callers treat null as "no item", not an error — `createOrder` mints
 * a plain backing good and the ingest route rejects the payload.
 */
export async function resolveOrderItem(
  factoryId: string,
  spec: OrderSpec
): Promise<string | null> {
  /*
   * The only field on OrderSpec that still points at a catalogue row. The
   * vehicle, design and colour ids referenced spec attributes, which no longer
   * exist; keeping them in the type means the two callers do not both need
   * editing in the same commit that removes what they described.
   */
  const materialId = spec.materialId?.trim();
  if (!materialId) return null;

  const item = await prisma.product.findFirst({
    where: { id: materialId, factoryId, status: { in: ["ACTIVE", "DRAFT"] } },
    select: { id: true },
  });
  return item?.id ?? null;
}
