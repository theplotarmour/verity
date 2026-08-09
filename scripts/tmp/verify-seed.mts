import { PrismaClient } from "@prisma/client";
import { createDefaultMasterData } from "../../src/lib/master-data/defaults";
import { createItemFromSpecFor } from "../../src/server/actions/itemsFromSpec";

const p = new PrismaClient();
const f = await p.factory.findFirstOrThrow();
const fid = f.id;

if ((await p.itemGroup.count({ where: { factoryId: fid } })) === 0) {
  await createDefaultMasterData(p, fid);
}

// Minimum to exercise the production search: one vehicle, one design, one
// colour, one fabric, one seat cover.
const brand = await p.vehicleBrand.upsert({ where: { id: "vb-verify" }, update: {}, create: { id: "vb-verify", factoryId: fid, name: "Maruti Suzuki" } });
const model = await p.vehicleModel.upsert({ where: { id: "vm-verify" }, update: {}, create: { id: "vm-verify", factoryId: fid, brandId: brand.id, name: "Swift" } });
const gen = await p.vehicleGeneration.upsert({ where: { id: "vg-verify" }, update: {}, create: { id: "vg-verify", factoryId: fid, modelId: model.id, name: "2018-2023" } });
const design = await p.design.upsert({ where: { id: "dz-verify" }, update: {}, create: { id: "dz-verify", factoryId: fid, name: "SPC PRO SERIES", category: "Premium", fabricConsumption: 4.2 } });
const colour = await p.color.upsert({ where: { id: "cl-verify" }, update: {}, create: { id: "cl-verify", factoryId: fid, name: "Beige" } });

const seatCover = await p.itemGroup.findFirst({ where: { factoryId: fid, name: "Seat Cover" } })
  ?? await p.itemGroup.create({ data: { factoryId: fid, name: "Seat Cover", itemType: "FINISHED_PRODUCT", isProducible: true, parentId: (await p.itemGroup.findFirstOrThrow({ where: { factoryId: fid, name: "Finished Good" } })).id, nameTemplate: "{group} {brand} {model} {generation} {design} {colour}", codeTemplate: "SC-{brand}-{model}", shortCode: "SC" } });

const mk = async (key: string, name: string, kind: "REFERENCE", refTarget: string) =>
  (await p.specField.findFirst({ where: { groupId: seatCover.id, key } }))
  ?? p.specField.create({ data: { factoryId: fid, groupId: seatCover.id, name, key, kind, refTarget: refTarget as never } });
const brandF = await mk("brand", "Brand", "REFERENCE", "VEHICLE_BRAND");
const modelF = await mk("model", "Model", "REFERENCE", "VEHICLE_MODEL");
const genF = await mk("generation", "Generation", "REFERENCE", "VEHICLE_GENERATION");
const designF = await mk("design", "Design", "REFERENCE", "DESIGN");
const colourF = await mk("colour", "Colour", "REFERENCE", "COLOR");
void brandF; void modelF; void genF; void designF; void colourF;

const made = await createItemFromSpecFor(fid, {
  groupId: seatCover.id,
  answers: { brand: { valueRefId: brand.id }, model: { valueRefId: model.id }, generation: { valueRefId: gen.id }, design: { valueRefId: design.id }, colour: { valueRefId: colour.id } },
  defaultUOM: "SET",
  reuseExisting: true,
});
console.log("item:", made);
console.log("finished goods:", await p.itemMaster.count({ where: { factoryId: fid, itemType: "FINISHED_PRODUCT" } }));
await p.$disconnect();
