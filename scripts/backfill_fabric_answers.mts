// Restores the fabric answer on seat-cover items that lost it, from the legacy
// `SalesOrder.materialId` on an order for that item.
//
// The column pair is a leftover of the pre-spec schema and is on its way out,
// but while it is still populated it is the only surviving record of what these
// items were made of — and without the answer the group's fabric-driven BOM
// line resolves to nothing, so the item is built with an empty recipe.
//
// Idempotent: an item that already answers the field is skipped.
import { PrismaClient } from "@prisma/client";
import { identityOf } from "../src/lib/spec/identity";
import { specHash } from "../src/lib/spec/hash";
import { getResolvedFieldsFor } from "../src/server/queries/spec";

const prisma = new PrismaClient();
const factories = await prisma.factory.findMany({ select: { id: true, name: true } });

for (const f of factories) {
  // Fields that pick an item out of a stocked category — the material slots.
  const materialFields = await prisma.specField.findMany({
    where: {
      factoryId: f.id,
      kind: "REFERENCE",
      refTarget: "ITEM_GROUP",
      archivedAt: null,
      targetGroup: { hasInventoryUnits: true },
    },
    select: { id: true, key: true, groupId: true, targetGroupId: true },
  });
  if (materialFields.length === 0) continue;

  let fixed = 0;
  for (const field of materialFields) {
    const items = await prisma.itemMaster.findMany({
      where: {
        factoryId: f.id,
        groupId: field.groupId,
        specValues: { none: { fieldId: field.id, valueItemId: { not: null } } },
      },
      select: { id: true, name: true, groupId: true },
    });

    for (const item of items) {
      // What an order for this item says it was made of.
      const order = await prisma.salesOrder.findFirst({
        where: { factoryId: f.id, itemId: item.id, materialId: { not: null } },
        select: { material: { select: { name: true } } },
      });
      const materialName = order?.material?.name;
      if (!materialName) continue;

      const target = await prisma.itemMaster.findFirst({
        where: { factoryId: f.id, groupId: field.targetGroupId!, name: materialName },
        select: { id: true },
      });
      if (!target) {
        console.log(`  ! ${item.name}: no "${materialName}" in the target category`);
        continue;
      }

      const existing = await prisma.itemFieldValue.findFirst({
        where: { itemId: item.id, fieldId: field.id },
        select: { id: true },
      });
      if (existing) {
        await prisma.itemFieldValue.update({
          where: { id: existing.id },
          data: { valueItemId: target.id },
        });
      } else {
        await prisma.itemFieldValue.create({
          data: { factoryId: f.id, itemId: item.id, fieldId: field.id, valueItemId: target.id },
        });
      }

      // The stored hash is what duplicate detection compares against, so it has
      // to be recomputed or the item stops matching its own answers.
      const fields = await getResolvedFieldsFor(f.id, item.groupId!);
      const values = await prisma.itemFieldValue.findMany({ where: { itemId: item.id } });
      const byField = new Map(values.map((v) => [v.fieldId, v]));
      const identities: Record<string, string> = {};
      for (const spec of fields) {
        const v = byField.get(spec.id);
        if (!v) continue;
        identities[spec.key] = identityOf({
          valueText: v.valueText,
          valueNumber: v.valueNumber,
          valueBool: v.valueBool,
          optionId: v.optionId,
          valueItemId: v.valueItemId,
          valueRefId: v.valueRefId,
        });
      }
      await prisma.itemMaster.update({
        where: { id: item.id },
        data: { specHash: specHash(item.groupId!, identities) },
      });

      console.log(`  + ${item.name} — ${field.key} = ${materialName}`);
      fixed += 1;
    }
  }
  console.log(`${f.name}: ${fixed} item(s) given a material answer`);
}

await prisma.$disconnect();
