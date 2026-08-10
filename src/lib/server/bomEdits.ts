import { bomModeOf, type BomModeValue } from "@/lib/master-data/bomMode";
import prisma from "@/lib/prisma";

/**
 * The category's effective BOM mode, following the tree where it states none.
 *
 * Reads the factory's whole category list rather than the one row, because a
 * null mode means "ask my parent" and the answer can be several levels up. That
 * is one indexed query over a table with tens of rows per tenant, against a
 * recursive CTE or a walk of one query per level — cheaper than both, and it is
 * the same shape the pages already fetch.
 *
 * Scoped to `factoryId` on the way in, so inheritance can never read through a
 * parent id belonging to another tenant.
 */
export async function resolveGroupBomMode(
  factoryId: string,
  groupId: string,
): Promise<BomModeValue> {
  const groups = await prisma.itemGroup.findMany({
    where: { factoryId },
    select: { id: true, parentId: true, bomMode: true },
  });
  return bomModeOf(groupId, groups);
}

/**
 * One BOM edit made in the wizard before the item existed.
 *
 * Where it lands depends on what the category is. A produced SKU gets an
 * ItemBomOverride: this seat cover takes 3.2 m, whatever the recipe says. An
 * attribute — a Design, a Fabric shade, anything with inventory units switched
 * off — gets a BomContribution instead, because its components are what it
 * *brings* to every item that picks it, not a correction to its own recipe.
 * Same button, same modal, both cases.
 *
 * Kept out of the action file so both create paths share one copy and a script
 * can exercise it without a session.
 */
export type BomEdit = { componentItemId: string; quantity: number; removed?: boolean };

/**
 * Whether a category's items contribute their components rather than override.
 *
 * Reads the category's BOM mode, set in Configure. It used to read
 * hasInventoryUnits, which meant a stocked category could never contribute even
 * when that is exactly what it does — a fabric is bought by the metre *and*
 * hands its own materials to every seat cover that picks it.
 *
 * Resolved through the tree: a subcategory that states no mode contributes if
 * its parent does. Reading only its own row sent every inheriting category down
 * the override path, writing an ItemBomOverride where a BomContribution was
 * meant — a wrong row, not a missing one.
 */
export async function isAttributeGroup(factoryId: string, groupId: string) {
  return (await resolveGroupBomMode(factoryId, groupId)) === "INGREDIENTS";
}

/**
 * Save the wizard's BOM edits against an item that now has an id.
 *
 * Returns what could not be written rather than throwing: a recipe line that
 * failed must not lose the owner the item itself, which is already saved.
 */
export async function writeBomEdits(
  factoryId: string,
  itemId: string,
  isAttribute: boolean,
  edits: BomEdit[]
): Promise<string[]> {
  const problems: string[] = [];
  for (const [i, edit] of edits.entries()) {
    try {
      // A removal is per-item by nature — there is no "un-contribute" — so it
      // stays an override even on an attribute.
      if (isAttribute && !edit.removed) {
        await prisma.bomContribution.create({
          data: {
            factoryId,
            ownerItemId: itemId,
            componentItemId: edit.componentItemId,
            quantity: edit.quantity,
            sortOrder: i,
          },
        });
      } else {
        await prisma.itemBomOverride.upsert({
          where: { itemId_componentItemId: { itemId, componentItemId: edit.componentItemId } },
          update: { quantity: edit.quantity, removed: !!edit.removed },
          create: {
            factoryId,
            itemId,
            componentItemId: edit.componentItemId,
            quantity: edit.quantity,
            removed: !!edit.removed,
          },
        });
      }
    } catch (err) {
      problems.push(`Could not save a BOM line: ${err instanceof Error ? err.message : "failed"}`);
    }
  }
  return problems;
}
