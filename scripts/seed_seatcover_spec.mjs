// Sets up a working Finished Good > Seat Cover spec sheet for Carxen, so the
// studio and the Add Master Data wizard have something real to demonstrate.
//
// Idempotent: every step checks before it creates. Safe to re-run.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
if (!factory) {
  console.error("No Carxen factory found. Run the seed first.");
  process.exit(1);
}
const factoryId = factory.id;

async function findGroup(name, parentId = null) {
  return prisma.itemGroup.findFirst({ where: { factoryId, parentId, name } });
}

const fgRoot = await findGroup("Finished Good");
const rmRoot = await findGroup("Raw Material");
if (!fgRoot || !rmRoot) {
  console.error("Root groups missing. Run scripts/seed_item_groups.mjs first.");
  process.exit(1);
}

// --- Seat Cover subgroup -----------------------------------------------------
let seatCover = await findGroup("Seat Cover", fgRoot.id);
if (!seatCover) {
  seatCover = await prisma.itemGroup.create({
    data: {
      factoryId,
      parentId: fgRoot.id,
      name: "Seat Cover",
      shortCode: "SC",
      itemType: fgRoot.itemType,
      // Assembled from other items, so it carries a recipe. Left unset it would
      // default to OFF and the category would have no BOM editor at all.
      bomMode: "RECIPE",
      sortOrder: 0,
    },
  });
  console.log("+ group Finished Good > Seat Cover");
}

// --- Fabric subgroup under Raw Material, and existing materials filed into it -
let fabric = await findGroup("Fabric", rmRoot.id);
if (!fabric) {
  fabric = await prisma.itemGroup.create({
    data: {
      factoryId,
      parentId: rmRoot.id,
      name: "Fabric",
      shortCode: "FAB",
      itemType: rmRoot.itemType,
      // Stocked, and also picked by seat covers — so it hands its own materials
      // to whatever chooses it.
      bomMode: "INGREDIENTS",
      sortOrder: 0,
    },
  });
  console.log("+ group Raw Material > Fabric");
}

// File any ungrouped raw materials under Fabric so the reference dropdown has
// something in it.
const ungrouped = await prisma.itemMaster.updateMany({
  where: { factoryId, groupId: null, itemType: "RAW_MATERIAL" },
  data: { groupId: fabric.id },
});
if (ungrouped.count) console.log(`= filed ${ungrouped.count} raw materials under Fabric`);

// --- Spec fields -------------------------------------------------------------
async function ensureField(spec) {
  const existing = await prisma.specField.findFirst({
    where: { groupId: spec.groupId, key: spec.key },
  });
  if (existing) return existing;
  const created = await prisma.specField.create({ data: { factoryId, ...spec } });
  console.log(`+ field ${spec.name}`);
  return created;
}

const brand = await ensureField({
  groupId: seatCover.id, name: "Brand", key: "brand",
  kind: "REFERENCE", refTarget: "VEHICLE_BRAND", sortOrder: 0, isRequired: true,
});
const model = await ensureField({
  groupId: seatCover.id, name: "Model", key: "model",
  kind: "REFERENCE", refTarget: "VEHICLE_MODEL", dependsOnFieldId: brand.id,
  sortOrder: 1, isRequired: true,
});
await ensureField({
  groupId: seatCover.id, name: "Generation", key: "generation",
  kind: "REFERENCE", refTarget: "VEHICLE_GENERATION", dependsOnFieldId: model.id,
  sortOrder: 2,
});
const backType = await ensureField({
  groupId: seatCover.id, name: "Back Type", key: "backType",
  kind: "OPTION", sortOrder: 3,
});
await ensureField({
  groupId: seatCover.id, name: "Headrests", key: "headrests",
  kind: "VALUE", valueType: "NUMBER", unitSuffix: "HDR", sortOrder: 4,
});
const armrest = await ensureField({
  groupId: seatCover.id, name: "Armrest", key: "armrest",
  kind: "OPTION", sortOrder: 5,
});
await ensureField({
  groupId: seatCover.id, name: "Fabric", key: "fabric",
  kind: "REFERENCE", refTarget: "ITEM_GROUP", targetGroupId: fabric.id,
  includeDescendants: true, sortOrder: 6,
});
await ensureField({
  groupId: seatCover.id, name: "Design", key: "design",
  kind: "REFERENCE", refTarget: "DESIGN", sortOrder: 7,
});
await ensureField({
  groupId: seatCover.id, name: "Colour", key: "colour",
  kind: "REFERENCE", refTarget: "COLOR", sortOrder: 8,
});

// --- Options -----------------------------------------------------------------
async function ensureOption(fieldId, value, label, shortCode, sortOrder) {
  const existing = await prisma.specFieldOption.findFirst({ where: { fieldId, value } });
  if (existing) return;
  await prisma.specFieldOption.create({
    data: { fieldId, value, label, shortCode, sortOrder },
  });
  console.log(`  + option ${label}`);
}

await ensureOption(backType.id, "SB", "Single Back", "SB", 0);
await ensureOption(backType.id, "DB", "Double Back", "DB", 1);
await ensureOption(armrest.id, "NONE", "No Arm", "NA", 0);
await ensureOption(armrest.id, "ARM", "With Armrest", "AR", 1);

// --- Templates ---------------------------------------------------------------
await prisma.itemGroup.update({
  where: { id: seatCover.id },
  data: {
    nameTemplate:
      "{group} {brand} {model} {generation} {backType} {headrests} {armrest} {design} {colour}",
    codeTemplate: "{group}-{brand}-{model}-{generation}-{backType}{headrests}-{armrest}",
  },
});

await prisma.itemGroup.update({
  where: { id: fabric.id },
  data: { nameTemplate: "{group}", codeTemplate: "{group}" },
});

console.log("\nSeat Cover spec ready. Open /owner/settings/master-data/studio");
await prisma.$disconnect();
