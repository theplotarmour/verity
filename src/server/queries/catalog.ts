import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";

/**
 * Item pickers for the stock and purchase screens.
 *
 * These lived in `server/queries/spec.ts` and leaned on the spec engine: items
 * were scoped by their category's flags (`hasInventoryUnits`, `isPurchasable`)
 * and each row carried a spec summary so a picker could say "Leatherite 0.9mm
 * 140cm" rather than just "Leatherite". Categories and spec answers went with
 * the MES layer, so the scope is the item type and the label is the item name.
 *
 * The category flags existed for a reason worth recording: attribute rows
 * (Vehicles, Brands, Designs, Colours) were RAW_MATERIAL-typed but were not
 * things a supplier could ship, and without the flag the purchase picker
 * offered "Alto K10" as a buyable material. Those attribute rows were spec
 * records and went with the engine too, so the problem they guarded against
 * went with them.
 */

const PICKER_SELECT = {
  id: true,
  name: true,
  aliasName: true,
  itemCode: true,
  itemType: true,
  defaultUOM: true,
} as const;

const searchTextFor = (i: { name: string; aliasName: string | null; itemCode: string | null }) =>
  [i.name, i.aliasName, i.itemCode].filter(Boolean).join(" ").toLowerCase();

/** Every item that can hold stock, for the stock-movement picker. */
export async function getStockableItems() {
  const user = await getOwnerUser();
  const items = await prisma.product.findMany({
    where: {
      factoryId: user.factoryId,
      status: { in: ["ACTIVE", "DRAFT"] },
      itemType: {
        in: ["RAW_MATERIAL", "SEMI_FINISHED", "FINISHED_PRODUCT", "CONSUMABLE", "PACKAGING", "SPARE_PART"],
      },
    },
    select: PICKER_SELECT,
    orderBy: [{ itemType: "asc" }, { name: "asc" }],
  });

  return items.map((i) => ({
    id: i.id,
    name: i.name,
    itemCode: i.itemCode,
    itemType: i.itemType,
    uom: i.defaultUOM,
    groupName: null,
    searchText: searchTextFor(i),
  }));
}

/** Items a purchase order can be raised for. */
export async function getPurchasableItems() {
  const user = await getOwnerUser();
  const items = await prisma.product.findMany({
    where: {
      factoryId: user.factoryId,
      status: { in: ["ACTIVE", "DRAFT"] },
      itemType: { in: ["RAW_MATERIAL", "CONSUMABLE", "PACKAGING", "SPARE_PART"] },
    },
    select: { ...PICKER_SELECT, hsnCode: true },
    orderBy: [{ itemType: "asc" }, { name: "asc" }],
  });

  return items.map((i) => ({
    id: i.id,
    name: i.name,
    itemCode: i.itemCode,
    itemType: i.itemType,
    uom: i.defaultUOM,
    hsnCode: i.hsnCode,
    groupName: null,
    spec: null,
    searchText: searchTextFor(i),
  }));
}
