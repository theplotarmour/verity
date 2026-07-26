import type { ItemType } from "@prisma/client";

// Display names for the ItemType enum. The enum values are storage identifiers;
// these are what the client's spec calls them (Finished Goods, Tools, etc.).
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  RAW_MATERIAL: "Raw Material",
  SEMI_FINISHED: "Semi-Finished Goods",
  FINISHED_PRODUCT: "Finished Goods",
  CONSUMABLE: "Consumables",
  PACKAGING: "Packaging Material",
  SPARE_PART: "Spare Parts",
  MACHINERY: "Machinery",
  TOOL: "Tools",
  ASSET: "Asset",
  SERVICE: "Service",
};

// Order shown in pickers — the client's primary manufacturing types first.
export const ITEM_TYPE_ORDER: ItemType[] = [
  "RAW_MATERIAL",
  "SEMI_FINISHED",
  "FINISHED_PRODUCT",
  "CONSUMABLE",
  "PACKAGING",
  "SPARE_PART",
  "MACHINERY",
  "TOOL",
  "ASSET",
  "SERVICE",
];

// Common units of measure offered as suggestions (free-text is still allowed).
export const UOM_SUGGESTIONS = [
  "PCS",
  "SET",
  "MTR",
  "CM",
  "SQM",
  "KG",
  "GM",
  "LTR",
  "ML",
  "ROLL",
  "BOX",
  "PKT",
  "PAIR",
  "DOZEN",
];

// Item Type is derived from the item's Category rather than picked separately —
// the two say the same thing (a "Fabric" category item is a raw material, a
// "Finished Goods" item is a finished product), so a second picker was just a
// chance to contradict the category. The enum still drives item-code prefixes
// and the Raw Material tab filter, so it is resolved here from the category name.
export function deriveItemType(categoryName?: string | null): ItemType {
  const n = (categoryName ?? "").toLowerCase();
  if (/finish/.test(n)) return "FINISHED_PRODUCT";
  if (/semi/.test(n)) return "SEMI_FINISHED";
  if (/consumable/.test(n)) return "CONSUMABLE";
  if (/pack/.test(n)) return "PACKAGING";
  if (/spare/.test(n)) return "SPARE_PART";
  if (/machin/.test(n)) return "MACHINERY";
  if (/tool/.test(n)) return "TOOL";
  if (/asset/.test(n)) return "ASSET";
  if (/service/.test(n)) return "SERVICE";
  // Fabric, raw material, or anything uncategorised is a raw material.
  return "RAW_MATERIAL";
}
