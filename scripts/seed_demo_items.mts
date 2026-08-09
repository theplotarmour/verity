// Creates demo items in every category through the real spec engine, so each
// sheet has content and the generated names/codes are exactly what the app
// would produce.
//
// Also files the existing finished-good items (created before the spec engine,
// when variants were backfilled) into their proper subgroup.
//
// Idempotent: an item whose spec hash already exists is skipped.
// Run with:  npx tsx scripts/seed_demo_items.mts
import { PrismaClient } from "@prisma/client";
import { groupChain, mergeInheritedFields, resolveAnswers, type RawAnswer } from "../src/lib/spec/resolve";
import { renderTemplate } from "../src/lib/spec/template";
import { specHash } from "../src/lib/spec/hash";

const prisma = new PrismaClient();

const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
if (!factory) {
  console.error("No Carxen factory.");
  process.exit(1);
}
const factoryId = factory.id;

const groups = await prisma.itemGroup.findMany({ where: { factoryId } });
const allFields = await prisma.specField.findMany({
  where: { factoryId },
  include: { options: true },
});

const groupByName = new Map(groups.map((g) => [g.name, g]));

/** Answers are given as { fieldName: label } — labels are resolved to ids. */
async function makeItem(groupName: string, answers: Record<string, string>, uom = "PCS") {
  const group = groupByName.get(groupName);
  if (!group) return console.log(`! no group ${groupName}`);

  const fields = mergeInheritedFields(
    groupChain(groups, group.id).map((g) => g.id),
    allFields
  );

  const raws: Record<string, RawAnswer> = {};
  const identities: Record<string, string> = {};
  const stored: { fieldId: string; data: Record<string, unknown> }[] = [];

  for (const field of fields) {
    const given = answers[field.name];
    if (given === undefined) continue;

    if (field.kind === "OPTION") {
      const opt = field.options.find((o) => o.label.toLowerCase() === given.toLowerCase());
      if (!opt) { console.log(`  ! ${groupName}: no option "${given}" for ${field.name}`); continue; }
      raws[field.key] = { option: { label: opt.label, shortCode: opt.shortCode } };
      identities[field.key] = opt.id;
      stored.push({ fieldId: field.id, data: { optionId: opt.id } });
    } else if (field.kind === "REFERENCE") {
      let id: string | null = null;
      let label: string | null = null;
      if (field.refTarget === "COLOR") {
        const row = await prisma.color.findFirst({ where: { factoryId, name: { equals: given, mode: "insensitive" } } });
        if (row) { id = row.id; label = row.name; }
      } else if (field.refTarget === "VEHICLE_BRAND") {
        const row = await prisma.vehicleBrand.findFirst({ where: { factoryId, name: { equals: given, mode: "insensitive" } } });
        if (row) { id = row.id; label = row.name; }
      } else if (field.refTarget === "VEHICLE_MODEL") {
        const row = await prisma.vehicleModel.findFirst({ where: { brand: { factoryId }, name: { equals: given, mode: "insensitive" } } });
        if (row) { id = row.id; label = row.name; }
      } else if (field.refTarget === "DESIGN") {
        const row = await prisma.design.findFirst({ where: { factoryId, name: { equals: given, mode: "insensitive" } } });
        if (row) { id = row.id; label = row.category ? `${row.category} ${row.name}` : row.name; }
      } else if (field.refTarget === "ITEM_GROUP") {
        const row = await prisma.itemMaster.findFirst({ where: { factoryId, name: { contains: given, mode: "insensitive" } } });
        if (row) {
          raws[field.key] = { valueItem: { name: row.name, aliasName: row.aliasName, itemCode: row.itemCode } };
          identities[field.key] = row.id;
          stored.push({ fieldId: field.id, data: { valueItemId: row.id } });
          continue;
        }
      }
      if (!id) { console.log(`  ! ${groupName}: no ${field.refTarget} "${given}"`); continue; }
      raws[field.key] = { refLabel: label };
      identities[field.key] = id;
      stored.push({ fieldId: field.id, data: { valueRefId: id } });
    } else {
      const num = Number(given);
      if (field.valueType === "NUMBER" || field.valueType === "MEASUREMENT") {
        if (Number.isNaN(num)) continue;
        raws[field.key] = { valueNumber: num };
        identities[field.key] = String(num);
        stored.push({ fieldId: field.id, data: { valueNumber: num } });
      } else if (field.valueType === "TOGGLE") {
        const b = /^(yes|true|1)$/i.test(given);
        raws[field.key] = { valueBool: b };
        identities[field.key] = String(b);
        stored.push({ fieldId: field.id, data: { valueBool: b } });
      } else {
        raws[field.key] = { valueText: given };
        identities[field.key] = given;
        stored.push({ fieldId: field.id, data: { valueText: given } });
      }
    }
  }

  const resolved = resolveAnswers(fields as never, raws);
  resolved.group = { name: group.name, code: group.shortCode || group.name };

  const name = renderTemplate(group.nameTemplate ?? "{group}", resolved, "name");
  const code = renderTemplate(group.codeTemplate ?? "{group}", resolved, "code");
  const hash = specHash(group.id, identities);

  const dupe = await prisma.itemMaster.findFirst({ where: { factoryId, specHash: hash } });
  if (dupe) return console.log(`  = ${name}`);

  let sku = code || `${group.shortCode}-${Date.now().toString(36).toUpperCase()}`;
  for (let i = 2; await prisma.itemMaster.findUnique({ where: { sku } }); i++) sku = `${code}-${i}`;

  const item = await prisma.itemMaster.create({
    data: {
      factoryId,
      groupId: group.id,
      itemType: group.itemType,
      manufacturingType: ["RAW_MATERIAL", "CONSUMABLE", "PACKAGING", "SPARE_PART"].includes(group.itemType) ? "BUY" : "MAKE",
      name,
      sku,
      itemCode: code,
      defaultUOM: uom,
      status: "ACTIVE",
      specHash: hash,
    },
  });
  for (const s of stored) {
    await prisma.itemFieldValue.create({
      data: { factoryId, itemId: item.id, fieldId: s.fieldId, ...s.data },
    });
  }
  console.log(`  + ${name}   [${code}]`);
}

// --- file the pre-spec finished goods into their subgroup -------------------
const fgRoot = groupByName.get("Finished Good")!;
const orphans = await prisma.itemMaster.findMany({
  where: { factoryId, groupId: fgRoot.id },
});
for (const it of orphans) {
  const target =
    /seat cover/i.test(it.name) ? "Seat Cover" :
    /mats?/i.test(it.name) ? "Mats" :
    /steering/i.test(it.name) ? "Steering Cover" : null;
  if (!target) continue;
  await prisma.itemMaster.update({
    where: { id: it.id },
    data: { groupId: groupByName.get(target)!.id },
  });
  console.log(`~ filed "${it.name}" under ${target}`);
}

console.log("\nRaw Material");
await makeItem("Fabric", { "Material Type": "Leatherite", Colour: "Black", GSM: "220", Thickness: "1.2", Width: "54", Finish: "Matte" }, "MTR");
await makeItem("Fabric", { "Material Type": "Leatherite", Colour: "Beige", GSM: "220", Thickness: "1.2", Width: "54", Finish: "Matte" }, "MTR");
await makeItem("Fabric", { "Material Type": "Nappa", Colour: "Black", GSM: "280", Thickness: "1.4", Width: "54", Finish: "Perforated" }, "MTR");
await makeItem("Fabric", { "Material Type": "Suede", Colour: "Grey", GSM: "180", Thickness: "0.9", Width: "58", Finish: "Textured" }, "MTR");
await makeItem("Foam", { Density: "24", Thickness: "8", Grade: "High Resilience" }, "MTR");
await makeItem("Foam", { Density: "32", Thickness: "12", Grade: "Standard" }, "MTR");
await makeItem("Thread", { Colour: "Black", Ply: "3", Material: "Polyester", Use: "General Stitch" }, "PCS");
await makeItem("Thread", { Colour: "Beige", Ply: "3", Material: "Polyester", Use: "Embroidery" }, "PCS");
await makeItem("Elastic & Webbing", { Type: "Elastic", Width: "25", Colour: "Black" }, "MTR");
await makeItem("Elastic & Webbing", { Type: "Piping Cord", Width: "4", Colour: "Beige" }, "MTR");
await makeItem("Fastener", { Type: "Zipper", Size: "5", Colour: "Black" }, "PCS");
await makeItem("Fastener", { Type: "Plastic Hook", Size: "20", Colour: "Black" }, "PCS");

console.log("\nSemi-Finished");
await makeItem("Cut Panel", { "Panel Type": "Seat Base", Brand: "Maruti", Model: "Swift", Fabric: "Leatherite" });
await makeItem("Cut Panel", { "Panel Type": "Seat Back", Brand: "Maruti", Model: "Swift", Fabric: "Leatherite" });
await makeItem("Embroidered Panel", { "Panel Type": "Seat Back", "Thread Colour": "Beige" });
await makeItem("Stitched Assembly", { "Assembly Type": "Front Pair", Brand: "Maruti", Model: "Swift" });

console.log("\nFinished Good");
await makeItem("Seat Cover", { Brand: "Maruti", Model: "Swift", "Back Type": "DB", Headrests: "4", Armrest: "No Arm", Colour: "Black" });
await makeItem("Seat Cover", { Brand: "Maruti", Model: "Swift", "Back Type": "DB", Headrests: "5", Armrest: "With Arm", Colour: "Beige" });
await makeItem("Mats", { Brand: "Maruti", Model: "Swift", "Mat Type": "7D", Colour: "Black", "Piece Count": "5" });
await makeItem("Steering Cover", { Size: "Medium", Colour: "Black" });

console.log("\nConsumable");
await makeItem("Needle", { Size: "90", "Needle Type": "Leather" });
await makeItem("Adhesive", { "Adhesive Type": "Spray", "Pack Size": "500" });
await makeItem("Marking & Cutting", { "Tool Type": "Chalk" });

console.log("\nPackaging");
await makeItem("Bag", { Size: "Large", Material: "Non-Woven", Print: "yes" });
await makeItem("Carton", { Size: "Medium", Ply: "5", "Units per Box": "4" });
await makeItem("Label & Card", { "Label Type": "Warranty Card" });

console.log("\nTrading Goods");
await makeItem("Accessory", { "Accessory Type": "Neck Pillow", Colour: "Black", "Brand Name": "Carxen" });
await makeItem("Accessory", { "Accessory Type": "Sun Shade", Colour: "Grey", "Brand Name": "Carxen" });

console.log("\nDone.");
await prisma.$disconnect();
