// The full spec sheet for a seat-cover factory: every root category, its
// subgroups, their fields, options and naming templates.
//
// This is the data behind "Add Master Data" — pick a category, answer the
// fields, get a named and coded item. Edit the SPECS array to change what the
// owner is asked; nothing else needs touching.
//
// Idempotent: re-running updates templates and adds anything missing, and never
// deletes. Run with:  node scripts/seed_all_specs.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Shorthands: v = value, o = option list, r = reference.
const v = (name, valueType = "TEXT", unitSuffix = null) => ({ name, kind: "VALUE", valueType, unitSuffix });
const o = (name, options) => ({ name, kind: "OPTION", options });
const r = (name, refTarget, extra = {}) => ({ name, kind: "REFERENCE", refTarget, ...extra });

// An option is [label, shortCode].
const SPECS = [
  {
    root: "Raw Material",
    groups: [
      {
        name: "Fabric",
        shortCode: "FAB",
        // A seat cover picks a fabric and inherits its materials, so this one
        // contributes rather than holding a recipe of its own.
        bomMode: "INGREDIENTS",
        nameTemplate: "{materialType} {colour} {gsm}",
        codeTemplate: "FAB-{materialType}-{colour}",
        fields: [
          o("Material Type", [["Leatherite", "LTH"], ["Suede", "SUE"], ["Fabric Cloth", "CLT"], ["Nappa", "NAP"], ["Mesh", "MSH"]]),
          r("Colour", "COLOR"),
          v("GSM", "NUMBER", "GSM"),
          v("Thickness", "MEASUREMENT", "mm"),
          v("Width", "MEASUREMENT", "in"),
          o("Finish", [["Matte", "MT"], ["Gloss", "GL"], ["Textured", "TX"], ["Perforated", "PF"]]),
          v("Supplier Reference"),
        ],
      },
      {
        name: "Foam",
        shortCode: "FOM",
        nameTemplate: "Foam {density} {thickness}",
        codeTemplate: "FOM-{density}-{thickness}",
        fields: [
          v("Density", "NUMBER", "kg/m3"),
          v("Thickness", "MEASUREMENT", "mm"),
          o("Grade", [["Standard", "STD"], ["High Resilience", "HR"], ["Memory", "MEM"]]),
        ],
      },
      {
        name: "Thread",
        shortCode: "THR",
        nameTemplate: "Thread {colour} {ply}",
        codeTemplate: "THR-{colour}-{ply}",
        fields: [
          r("Colour", "COLOR"),
          v("Ply", "NUMBER"),
          o("Material", [["Polyester", "PLY"], ["Nylon", "NYL"], ["Cotton", "COT"]]),
          o("Use", [["General Stitch", "GEN"], ["Airbag Seam", "ABS"], ["Embroidery", "EMB"]]),
        ],
      },
      {
        name: "Elastic & Webbing",
        shortCode: "ELA",
        nameTemplate: "{type} {width} {colour}",
        codeTemplate: "ELA-{type}-{width}",
        fields: [
          o("Type", [["Elastic", "EL"], ["Webbing", "WB"], ["Piping Cord", "PC"]]),
          v("Width", "MEASUREMENT", "mm"),
          r("Colour", "COLOR"),
        ],
      },
      {
        name: "Fastener",
        shortCode: "FST",
        nameTemplate: "{type} {size} {colour}",
        codeTemplate: "FST-{type}-{size}",
        fields: [
          o("Type", [["Zipper", "ZP"], ["Velcro", "VL"], ["Plastic Hook", "HK"], ["Buckle", "BK"], ["Snap Button", "SB"]]),
          v("Size", "MEASUREMENT", "mm"),
          r("Colour", "COLOR"),
        ],
      },
    ],
  },
  {
    root: "Semi-Finished",
    groups: [
      {
        name: "Cut Panel",
        shortCode: "CUT",
        nameTemplate: "Cut {panelType} {brand} {model} {fabric}",
        codeTemplate: "CUT-{panelType}-{brand}-{model}",
        fields: [
          o("Panel Type", [["Seat Base", "SB"], ["Seat Back", "SK"], ["Headrest", "HR"], ["Armrest", "AR"], ["Side Wing", "SW"]]),
          r("Brand", "VEHICLE_BRAND"),
          r("Model", "VEHICLE_MODEL", { dependsOn: "Brand" }),
          r("Fabric", "ITEM_GROUP", { targetGroup: "Fabric" }),
        ],
      },
      {
        name: "Embroidered Panel",
        shortCode: "EMB",
        nameTemplate: "Embroidered {design} {panelType} {threadColour}",
        codeTemplate: "EMB-{design}-{panelType}",
        fields: [
          r("Design", "DESIGN"),
          o("Panel Type", [["Seat Base", "SB"], ["Seat Back", "SK"], ["Headrest", "HR"]]),
          r("Thread Colour", "COLOR"),
        ],
      },
      {
        name: "Stitched Assembly",
        shortCode: "STA",
        nameTemplate: "Stitched {assemblyType} {brand} {model}",
        codeTemplate: "STA-{assemblyType}-{brand}-{model}",
        fields: [
          o("Assembly Type", [["Front Pair", "FP"], ["Rear Bench", "RB"], ["Headrest Set", "HS"], ["Armrest", "AR"]]),
          r("Brand", "VEHICLE_BRAND"),
          r("Model", "VEHICLE_MODEL", { dependsOn: "Brand" }),
        ],
      },
    ],
  },
  {
    root: "Finished Good",
    groups: [
      {
        name: "Seat Cover",
        shortCode: "SC",
        nameTemplate: "{group} {brand} {model} {generation} {backType} {headrests} {armrest} {design} {colour}",
        codeTemplate: "SC-{brand}-{model}-{generation}-{backType}{headrests}-{armrest}",
        fields: [
          r("Brand", "VEHICLE_BRAND", { required: true }),
          r("Model", "VEHICLE_MODEL", { dependsOn: "Brand", required: true }),
          r("Generation", "VEHICLE_GENERATION", { dependsOn: "Model" }),
          o("Back Type", [["SB", "SB"], ["DB", "DB"]]),
          v("Headrests", "NUMBER", "HDR"),
          o("Armrest", [["No Arm", "NA"], ["With Arm", "AR"]]),
          r("Fabric", "ITEM_GROUP", { targetGroup: "Fabric" }),
          r("Design", "DESIGN"),
          r("Colour", "COLOR"),
        ],
      },
      {
        name: "Mats",
        shortCode: "MT",
        nameTemplate: "{group} {brand} {model} {matType} {colour}",
        codeTemplate: "MT-{brand}-{model}-{matType}",
        fields: [
          r("Brand", "VEHICLE_BRAND", { required: true }),
          r("Model", "VEHICLE_MODEL", { dependsOn: "Brand", required: true }),
          o("Mat Type", [["7D", "7D"], ["5D", "5D"], ["Grass", "GR"], ["Rubber", "RB"]]),
          r("Colour", "COLOR"),
          v("Piece Count", "NUMBER", "pc"),
        ],
      },
      {
        name: "Steering Cover",
        shortCode: "ST",
        nameTemplate: "{group} {size} {fabric} {colour}",
        codeTemplate: "ST-{size}-{colour}",
        fields: [
          o("Size", [["Small", "S"], ["Medium", "M"], ["Large", "L"]]),
          r("Fabric", "ITEM_GROUP", { targetGroup: "Fabric" }),
          r("Colour", "COLOR"),
        ],
      },
    ],
  },
  {
    root: "Consumable",
    groups: [
      {
        name: "Needle",
        shortCode: "NDL",
        nameTemplate: "Needle {size} {needleType}",
        codeTemplate: "NDL-{size}-{needleType}",
        fields: [
          v("Size", "NUMBER"),
          o("Needle Type", [["Ball Point", "BP"], ["Sharp", "SH"], ["Leather", "LR"]]),
        ],
      },
      {
        name: "Adhesive",
        shortCode: "ADH",
        nameTemplate: "{adhesiveType} {packSize}",
        codeTemplate: "ADH-{adhesiveType}",
        fields: [
          o("Adhesive Type", [["Spray", "SP"], ["Rubber Solution", "RS"], ["Hot Melt", "HM"]]),
          v("Pack Size", "MEASUREMENT", "ml"),
        ],
      },
      {
        name: "Marking & Cutting",
        shortCode: "MRK",
        nameTemplate: "{toolType}",
        codeTemplate: "MRK-{toolType}",
        fields: [o("Tool Type", [["Chalk", "CH"], ["Blade", "BL"], ["Marker Pen", "MP"], ["Measuring Tape", "MT"]])],
      },
    ],
  },
  {
    root: "Packaging",
    groups: [
      {
        name: "Bag",
        shortCode: "BAG",
        nameTemplate: "Bag {size} {material}",
        codeTemplate: "BAG-{size}-{material}",
        fields: [
          o("Size", [["Small", "S"], ["Medium", "M"], ["Large", "L"]]),
          o("Material", [["Non-Woven", "NW"], ["LDPE", "LD"], ["Woven", "WV"]]),
          v("Print", "TOGGLE"),
        ],
      },
      {
        name: "Carton",
        shortCode: "CTN",
        nameTemplate: "Carton {size} {ply}",
        codeTemplate: "CTN-{size}-{ply}",
        fields: [
          o("Size", [["Small", "S"], ["Medium", "M"], ["Large", "L"]]),
          v("Ply", "NUMBER", "ply"),
          v("Units per Box", "NUMBER"),
        ],
      },
      {
        name: "Label & Card",
        shortCode: "LBL",
        nameTemplate: "{labelType}",
        codeTemplate: "LBL-{labelType}",
        fields: [o("Label Type", [["Brand Sticker", "BS"], ["Warranty Card", "WC"], ["Care Instruction", "CI"], ["Barcode Label", "BC"]])],
      },
    ],
  },
  {
    root: "Trading Goods",
    groups: [
      {
        name: "Accessory",
        shortCode: "ACC",
        nameTemplate: "{accessoryType} {colour}",
        codeTemplate: "ACC-{accessoryType}-{colour}",
        fields: [
          o("Accessory Type", [["Neck Pillow", "NP"], ["Cushion", "CU"], ["Sun Shade", "SS"], ["Dashboard Mat", "DM"], ["Organiser", "OR"]]),
          r("Colour", "COLOR"),
          v("Brand Name"),
        ],
      },
    ],
  },
];

// --- applier ----------------------------------------------------------------

function toKey(name) {
  const parts = name.trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!parts.length) return "field";
  return parts[0] + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}

const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
if (!factory) {
  console.error("No Carxen factory. Run `npm run seed` first.");
  process.exit(1);
}
const factoryId = factory.id;

// Resolve group ids as we go so a reference can target a group created earlier.
const groupIds = new Map();

for (const spec of SPECS) {
  const root = await prisma.itemGroup.findFirst({
    where: { factoryId, parentId: null, name: spec.root },
  });
  if (!root) {
    console.error(`! missing root group "${spec.root}" — run scripts/seed_item_groups.mjs`);
    continue;
  }
  groupIds.set(spec.root, root.id);
  console.log(`\n${spec.root}`);

  for (const [i, g] of spec.groups.entries()) {
    let group = await prisma.itemGroup.findFirst({
      where: { factoryId, parentId: root.id, name: g.name },
    });
    if (!group) {
      group = await prisma.itemGroup.create({
        data: {
          factoryId,
          parentId: root.id,
          name: g.name,
          shortCode: g.shortCode,
          itemType: root.itemType,
          // Stated per blueprint rather than left to default OFF, which would
          // give the category no BOM editor and no clue why. A category other
          // items reference hands over ingredients; one that is assembled has a
          // recipe; anything only bought and consumed has neither.
          bomMode: g.bomMode ?? (root.itemType === "FINISHED_PRODUCT" || root.itemType === "SEMI_FINISHED" ? "RECIPE" : "OFF"),
          sortOrder: i,
        },
      });
      console.log(`  + ${g.name}`);
    } else {
      console.log(`  = ${g.name}`);
    }
    groupIds.set(g.name, group.id);

    // Templates are always refreshed, so editing SPECS and re-running takes
    // effect without deleting anything.
    await prisma.itemGroup.update({
      where: { id: group.id },
      data: { nameTemplate: g.nameTemplate, codeTemplate: g.codeTemplate, shortCode: g.shortCode },
    });

    const fieldIdsByName = new Map();
    for (const [fi, f] of g.fields.entries()) {
      const key = toKey(f.name);
      let field = await prisma.specField.findFirst({ where: { groupId: group.id, key } });
      if (!field) {
        field = await prisma.specField.create({
          data: {
            factoryId,
            groupId: group.id,
            name: f.name,
            key,
            kind: f.kind,
            valueType: f.kind === "VALUE" ? f.valueType : null,
            unitSuffix: f.unitSuffix ?? null,
            refTarget: f.kind === "REFERENCE" ? f.refTarget : null,
            targetGroupId:
              f.kind === "REFERENCE" && f.refTarget === "ITEM_GROUP"
                ? groupIds.get(f.targetGroup) ?? null
                : null,
            includeDescendants: true,
            dependsOnFieldId: f.dependsOn ? fieldIdsByName.get(f.dependsOn) ?? null : null,
            isRequired: Boolean(f.required),
            sortOrder: fi,
          },
        });
        console.log(`      + field ${f.name}`);
      }
      fieldIdsByName.set(f.name, field.id);

      for (const [oi, [label, shortCode]] of (f.options ?? []).entries()) {
        const exists = await prisma.specFieldOption.findFirst({
          where: { fieldId: field.id, value: label },
        });
        if (exists) {
          // Converge on what SPECS declares, so editing a label here takes
          // effect rather than being silently ignored.
          await prisma.specFieldOption.update({
            where: { id: exists.id },
            data: { label, shortCode, sortOrder: oi },
          });
          continue;
        }
        await prisma.specFieldOption.create({
          data: { fieldId: field.id, value: label, label, shortCode, sortOrder: oi },
        });
      }
    }
  }
}

console.log("\nDone. Open /owner/settings/master-data/studio");
await prisma.$disconnect();
