// Deliberately not "use server". Every export of a server-action module is a
// public endpoint, and this one takes the factory as an argument — so as an
// action it would have let any caller resolve or mint an item inside any other
// tenant. It is only ever called server-to-server, from the order path and from
// backfill scripts, so plain module scope is both safe and sufficient.

import prisma from "@/lib/prisma";
import { createItemFromSpecFor } from "@/server/internal/itemEngine";
import { getResolvedFieldsFor } from "@/server/queries/spec";
import type { SpecAnswer } from "@/lib/spec/types";

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
 * The order studio already asks for brand, model, fabric, design, colour, seat
 * type, headrests and armrest — which is exactly a Seat Cover spec sheet. So
 * rather than making the owner pick an item he has already described, the item
 * is resolved from those answers, reusing the existing one when the same
 * combination has been sold before (the answer hash is the identity).
 *
 * Returns null when the order cannot be matched to a group. Order taking must
 * keep working in that case, so callers treat null as "no item", not an error.
 */
export async function resolveOrderItem(
  factoryId: string,
  spec: OrderSpec
): Promise<string | null> {
  // Producible categories are what a factory makes, whatever their root is
  // called or typed. The finished-goods root is only the fallback for factories
  // that have not marked anything producible yet.
  let subgroups = await prisma.itemGroup.findMany({
    where: { factoryId, isProducible: true, parentId: { not: null } },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
  if (subgroups.length === 0) {
    const fgRoot = await prisma.itemGroup.findFirst({
      where: { factoryId, parentId: null, itemType: "FINISHED_PRODUCT" },
      select: { id: true },
    });
    if (!fgRoot) return null;
    subgroups = await prisma.itemGroup.findMany({
      where: { factoryId, parentId: fgRoot.id },
      select: { id: true, name: true },
    });
  }
  if (subgroups.length === 0) return null;

  // No legacy product type to name the group any more: the order's spec lands
  // in the first finished-good category. (This resolver is only a fallback; the
  // studio orders an explicit item by id.)
  const group = subgroups[0];
  if (!group) return null;

  const fields = await getResolvedFieldsFor(factoryId, group.id);
  const answers: Record<string, SpecAnswer> = {};

  // Match the studio's reference inputs to the group's REFERENCE fields by the
  // category each field targets — by field, never by an assumed key name. So a
  // factory whose Seat Cover sheet names its columns "Make"/"Variant" resolves
  // just as well as one that names them "brand"/"model".
  const refIds = [spec.vehicleBrandId, spec.vehicleModelId, spec.designId, spec.colorId, spec.materialId]
    .filter((id): id is string => !!id);
  if (refIds.length) {
    const refItems = await prisma.product.findMany({
      where: { id: { in: refIds }, factoryId },
      select: { id: true, groupId: true },
    });
    const used = new Set<string>();
    for (const field of fields) {
      if (field.kind !== "REFERENCE" || !field.targetGroupId || answers[field.key]) continue;
      const match = refItems.find((it) => it.groupId === field.targetGroupId && !used.has(it.id));
      if (match) {
        answers[field.key] = { valueItemId: match.id };
        used.add(match.id);
      }
    }
  }

  // Find the first unanswered OPTION field that carries an option matching the
  // wanted value, and answer it. Driven by the fields' own options, not a key.
  const answerOption = (...wants: (string | null | undefined)[]): boolean => {
    for (const raw of wants) {
      if (!raw) continue;
      const w = raw.toLowerCase();
      for (const field of fields) {
        if (field.kind !== "OPTION" || answers[field.key]) continue;
        const opt =
          field.options.find((o) => o.label.toLowerCase() === w) ??
          field.options.find((o) => w.includes(o.label.toLowerCase()) || o.label.toLowerCase().includes(w));
        if (opt) {
          answers[field.key] = { optionId: opt.id };
          return true;
        }
      }
    }
    return false;
  };

  // The studio's seat-cover scalars, when present, land on whichever fields can
  // take them. seatType/armrest match an OPTION by its own values; headrests
  // fills a numeric field only once a seat field confirmed the context, so a
  // non-seat product's number columns are never mis-answered.
  let seatContext = false;
  if (spec.seatType) {
    const seat = spec.seatType.toLowerCase();
    const abbr = seat.includes("double") ? "DB" : seat.includes("single") ? "SB" : spec.seatType;
    seatContext = answerOption(abbr, spec.seatType) || seatContext;
  }
  if (spec.hasArmrest !== null && spec.hasArmrest !== undefined) {
    seatContext = answerOption(spec.hasArmrest ? "With Arm" : "No Arm", spec.hasArmrest ? "Arm" : "No Arm") || seatContext;
  }
  if (spec.headrestCount != null && seatContext) {
    const numField = fields.find(
      (f) => f.kind === "VALUE" && (f.valueType === "NUMBER" || f.valueType === "MEASUREMENT") && !answers[f.key]
    );
    if (numField) answers[numField.key] = { valueNumber: spec.headrestCount };
  }

  if (Object.keys(answers).length === 0) return null;

  const result = await createItemFromSpecFor(factoryId, {
    groupId: group.id,
    answers,
    defaultUOM: "PCS",
    // Minted from an order rather than the catalog, so it is flagged for the
    // owner to review and price.
    status: "DRAFT",
    reuseExisting: true,
  });

  return "id" in result ? result.id : null;
}
