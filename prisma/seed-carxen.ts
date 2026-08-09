/**
 * seed-carxen.ts — a complete, coherent Carxen factory.
 *
 * Run after prisma/reset-demo.ts:
 *   npx tsx prisma/reset-demo.ts && npx tsx prisma/seed-carxen.ts
 *
 * Two principles behind the data:
 *
 * 1. Nothing half-filled. Every item answers every field its group defines, so
 *    the composed names read like real SKUs instead of "Seat Cover Maruti  DB".
 *    A name with a hole in it is worse than no name — it looks like a bug.
 *
 * 2. Items are created through createItemFromSpecFor, the same path the wizard
 *    uses. Names, codes, spec hashes and blueprints therefore come out exactly
 *    as they would if the owner had typed them, rather than being invented here
 *    and drifting from what the app would produce.
 */

import { PrismaClient, type ItemType, type SystemRole } from "@prisma/client";
import { createItemFromSpecFor } from "../src/server/internal/itemEngine";
import { buildItemBlueprint } from "../src/server/actions/itemBlueprint";
import type { SpecAnswer } from "../src/lib/spec/types";

const prisma = new PrismaClient();

let FID = "";
let OWNER_ID = "";

const log = (msg: string) => console.log(msg);

// ─────────────────────────────────────────────────────────────────────────────
// 1. Structure cleanup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Groups created while trying the studio out, each duplicating one that is
 * actually used. Left in place they make the owner pick between "Cut Fabric"
 * and "Cut Panel" every time, which is exactly the master-data rot this build
 * is meant to prevent.
 */
const DUPLICATE_GROUPS = [
  "Cut Fabric",
  "Embroidery",
  "Stitched Panels",
  "Foam Laminated Fabric",
  "Mats",
  "Needle",
  "Adhesive",
  "Marking & Cutting",
  "Elastic & Webbing",
  "Fastener",
  "Accessory",
  "Label & Card",
  "Bag",
];

/** Fields left over from testing: typos, duplicates, and placeholder options. */
const JUNK_FIELDS: [group: string, key: string][] = [
  ["Fabric", "rollLength"], // options were literally "a" and "b"
  ["Fabric", "wtOfRoll"],
  ["Seat Cover", "seats"], // duplicate of capacity
  ["Seat Cover", "fabrix"],
  ["Seat Cover", "febric"],
  ["Semi-Finished", "fabric"],
];

async function cleanStructure() {
  let removedGroups = 0;
  for (const name of DUPLICATE_GROUPS) {
    const groups = await prisma.itemGroup.findMany({
      where: { factoryId: FID, name },
      include: { _count: { select: { items: true } } },
    });
    for (const g of groups) {
      // Never delete a group that holds data, even a duplicate one.
      if (g._count.items > 0) {
        log(`  ! kept "${g.name}" — it still has ${g._count.items} item(s)`);
        continue;
      }
      await prisma.itemGroup.delete({ where: { id: g.id } });
      removedGroups += 1;
    }
  }

  let removedFields = 0;
  for (const [groupName, key] of JUNK_FIELDS) {
    const fields = await prisma.specField.findMany({
      where: { factoryId: FID, key, group: { name: groupName } },
    });
    for (const f of fields) {
      await prisma.itemFieldValue.deleteMany({ where: { fieldId: f.id } });
      await prisma.specField.delete({ where: { id: f.id } });
      removedFields += 1;
    }
  }

  log(`  ✓ structure cleaned — ${removedGroups} duplicate group(s), ${removedFields} junk field(s)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Field and option helpers
// ─────────────────────────────────────────────────────────────────────────────

async function groupByName(name: string, parentName?: string) {
  const g = await prisma.itemGroup.findFirst({
    where: {
      factoryId: FID,
      name,
      ...(parentName ? { parent: { name: parentName } } : {}),
    },
  });
  if (!g) throw new Error(`Item group not found: ${parentName ? parentName + " > " : ""}${name}`);
  return g;
}

/**
 * Make sure a field exists on a group.
 *
 * Several name templates reference tokens whose fields were never created —
 * Fabric prints "{materialType} {colour} {gsm}" but had neither materialType nor
 * colour. Every such template rendered a name with a hole in it.
 */
async function ensureField(
  groupId: string,
  spec: {
    name: string;
    key: string;
    kind: "VALUE" | "OPTION" | "REFERENCE";
    valueType?: string;
    unitSuffix?: string;
    refTarget?: string;
    targetGroupId?: string;
    dependsOnKey?: string;
    isRequired?: boolean;
    sortOrder?: number;
  }
) {
  const existing = await prisma.specField.findFirst({
    where: { factoryId: FID, groupId, key: spec.key },
  });
  if (existing) return existing;

  const dependsOnFieldId = spec.dependsOnKey
    ? (await prisma.specField.findFirst({ where: { factoryId: FID, groupId, key: spec.dependsOnKey } }))?.id
    : undefined;

  return prisma.specField.create({
    data: {
      factoryId: FID,
      groupId,
      name: spec.name,
      key: spec.key,
      kind: spec.kind as never,
      valueType: (spec.valueType ?? null) as never,
      unitSuffix: spec.unitSuffix ?? null,
      refTarget: (spec.refTarget ?? null) as never,
      targetGroupId: spec.targetGroupId ?? null,
      dependsOnFieldId: dependsOnFieldId ?? null,
      isRequired: spec.isRequired ?? false,
      sortOrder: spec.sortOrder ?? 0,
    },
  });
}

async function ensureOptions(fieldId: string, options: [label: string, shortCode?: string][]) {
  const out: Record<string, string> = {};
  let sort = await prisma.specFieldOption.count({ where: { fieldId } });
  for (const [label, shortCode] of options) {
    const existing = await prisma.specFieldOption.findFirst({ where: { fieldId, value: label } });
    if (existing) {
      if (shortCode && !existing.shortCode) {
        await prisma.specFieldOption.update({ where: { id: existing.id }, data: { shortCode } });
      }
      out[label] = existing.id;
      continue;
    }
    const created = await prisma.specFieldOption.create({
      data: { fieldId, value: label, label, shortCode: shortCode ?? null, sortOrder: sort++ },
    });
    out[label] = created.id;
  }
  return out;
}

async function fieldId(groupName: string, key: string) {
  const f = await prisma.specField.findFirst({
    where: { factoryId: FID, key, group: { name: groupName } },
  });
  if (!f) throw new Error(`Field not found: ${groupName}.${key}`);
  return f.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Master records
// ─────────────────────────────────────────────────────────────────────────────

/** Real Indian-market vehicles, since seat-cover patterns are cut per generation. */
const VEHICLES: [brand: string, model: string, generations: [name: string, seats: number][]][] = [
  ["Maruti Suzuki", "Swift", [["2005-2010", 5], ["2011-2017", 5], ["2018-2023", 5], ["2024-Present", 5]]],
  ["Maruti Suzuki", "Baleno", [["2015-2021", 5], ["2022-Present", 5]]],
  ["Maruti Suzuki", "Dzire", [["2017-2023", 5], ["2024-Present", 5]]],
  ["Maruti Suzuki", "Ertiga", [["2018-Present", 7]]],
  ["Maruti Suzuki", "Brezza", [["2016-2021", 5], ["2022-Present", 5]]],
  ["Maruti Suzuki", "WagonR", [["2019-Present", 5]]],
  ["Maruti Suzuki", "Grand Vitara", [["2022-Present", 5]]],
  ["Hyundai", "i20", [["2014-2019", 5], ["2020-Present", 5]]],
  ["Hyundai", "Creta", [["2015-2019", 5], ["2020-2023", 5], ["2024-Present", 5]]],
  ["Hyundai", "Venue", [["2019-Present", 5]]],
  ["Hyundai", "Verna", [["2017-2022", 5], ["2023-Present", 5]]],
  ["Tata", "Nexon", [["2017-2023", 5], ["2023-Present", 5]]],
  ["Tata", "Punch", [["2021-Present", 5]]],
  ["Tata", "Harrier", [["2019-Present", 5]]],
  ["Tata", "Altroz", [["2020-Present", 5]]],
  ["Mahindra", "XUV700", [["2021-Present", 7]]],
  ["Mahindra", "Scorpio-N", [["2022-Present", 7]]],
  ["Mahindra", "Thar", [["2020-Present", 5]]],
  ["Mahindra", "Bolero", [["2011-Present", 7]]],
  ["Toyota", "Innova Crysta", [["2016-2022", 7], ["2023-Present", 7]]],
  ["Toyota", "Fortuner", [["2016-Present", 7]]],
  ["Toyota", "Glanza", [["2019-Present", 5]]],
  ["Kia", "Seltos", [["2019-2023", 5], ["2023-Present", 5]]],
  ["Kia", "Sonet", [["2020-Present", 5]]],
  ["Kia", "Carens", [["2022-Present", 7]]],
  ["Honda", "City", [["2014-2019", 5], ["2020-Present", 5]]],
  ["Honda", "Amaze", [["2018-Present", 5]]],
  ["Honda", "Elevate", [["2023-Present", 5]]],
];

/**
 * fabricConsumption is in square metres and drives every BOM line that reads
 * "design.fabricConsumption". A quilted design eats more than a plain one, and
 * that difference is the whole reason the number lives on the design.
 */
const DESIGNS: [name: string, category: string, consumption: number][] = [
  ["SPC PRO SERIES", "Premium", 4.2],
  ["ERGO FIT Vertex", "Premium", 3.8],
  ["Lifto 7 Lines", "Standard", 4.0],
  ["Hexa Grid", "Standard", 3.9],
  ["Classic Plain", "Economy", 3.5],
  ["Diamond Quilt", "Premium", 4.5],
  ["Bucket Fit", "Sport", 4.1],
  ["Executive Nappa", "Luxury", 4.6],
];

const COLOURS = [
  "Black", "Beige", "Tan", "Cherry Red", "Coffee Brown",
  "Ivory", "Grey", "Navy Blue", "Maroon", "Cream",
];

const SUPPLIERS: [name: string, city: string, terms: string, lead: number][] = [
  ["Shree Balaji Textiles", "Surat", "Net 30", 7],
  ["Kohinoor Leatherite Pvt Ltd", "Kanpur", "Net 15", 10],
  ["National Foam Industries", "Delhi", "Net 30", 5],
  ["Vardhman Threads", "Ludhiana", "Net 7", 4],
  ["Ambika Packaging Works", "Ahmedabad", "Immediate", 3],
  ["Sunrise Trims & Accessories", "Mumbai", "Net 15", 6],
];

const CUSTOMERS: [name: string, company: string, city: string, terms: string, limit: number][] = [
  ["Rajesh Kumar", "Kumar Car Accessories", "Delhi", "Net 30", 500000],
  ["Imran Sheikh", "Auto Style Hub", "Mumbai", "Net 15", 300000],
  ["Vikram Patel", "Patel Motors Accessories", "Ahmedabad", "Net 30", 450000],
  ["Suresh Reddy", "South Auto Trends", "Hyderabad", "Immediate", 150000],
  ["Manpreet Singh", "Singh Auto Décor", "Ludhiana", "Net 15", 250000],
  ["Anil Verma", "Verma Car Care", "Jaipur", "Net 7", 180000],
  ["Deepak Nair", "Nair Automobiles", "Kochi", "Net 30", 320000],
  ["Farhan Qureshi", "Elite Car Studio", "Bengaluru", "Net 15", 400000],
];

const DEPARTMENTS: [name: string, qc: boolean, order: number][] = [
  ["Cutting", false, 1],
  ["Embroidery", false, 2],
  ["Stitching", false, 3],
  ["Finishing", false, 4],
  ["Quality Control", true, 5],
  ["Packing", false, 6],
];

// Typed against SystemRole so a role the schema does not have fails to compile
// rather than half-way through a seed run.
const EMPLOYEES: [name: string, role: SystemRole, dept: string | null, phone: string][] = [
  ["Ramesh Yadav", "SUPERVISOR", "Cutting", "9810000101"],
  ["Sunita Devi", "WORKER", "Cutting", "9810000102"],
  ["Mohammed Arif", "WORKER", "Cutting", "9810000103"],
  ["Priya Sharma", "SUPERVISOR", "Stitching", "9810000104"],
  ["Lakshmi Bai", "WORKER", "Stitching", "9810000105"],
  ["Kavita Singh", "WORKER", "Stitching", "9810000106"],
  ["Rekha Patil", "WORKER", "Stitching", "9810000107"],
  ["Ganesh Iyer", "WORKER", "Embroidery", "9810000108"],
  ["Amit Kumar", "SUPERVISOR", "Finishing", "9810000109"],
  ["Vijay Chauhan", "WORKER", "Finishing", "9810000110"],
  ["Neha Gupta", "SUPERVISOR", "Quality Control", "9810000111"],
  ["Rahul Mehta", "SUPERVISOR", "Quality Control", "9810000112"],
  ["Sanjay Dubey", "WORKER", "Packing", "9810000113"],
  ["Pooja Rani", "WORKER", "Packing", "9810000114"],
  ["Harish Chandra", "STORE_MANAGER", null, "9810000115"],
  ["Deepa Nambiar", "MANAGER", null, "9810000116"],
];

async function seedMasters() {
  // Vehicles
  const gens: { id: string; brandId: string; modelId: string; brand: string; model: string; gen: string; seats: number }[] = [];
  for (const [brandName, modelName, generations] of VEHICLES) {
    const brand =
      (await prisma.vehicleBrand.findFirst({ where: { factoryId: FID, name: brandName } })) ??
      (await prisma.vehicleBrand.create({ data: { factoryId: FID, name: brandName } }));
    const model =
      (await prisma.vehicleModel.findFirst({ where: { brandId: brand.id, name: modelName } })) ??
      (await prisma.vehicleModel.create({
        data: { factoryId: FID, brandId: brand.id, name: modelName },
      }));
    for (const [genName, seats] of generations) {
      const gen =
        (await prisma.vehicleGeneration.findFirst({ where: { modelId: model.id, name: genName } })) ??
        (await prisma.vehicleGeneration.create({
          data: {
            factoryId: FID,
            modelId: model.id,
            name: genName,
            allowedSeatTypes: ["Single Back", "Double Back"],
            allowedHeadrests: seats === 7 ? [5, 6, 7] : [4, 5],
            allowedArmrests: ["Arm", "No Arm"],
          },
        }));
      gens.push({
        id: gen.id,
        brandId: brand.id,
        modelId: model.id,
        brand: brandName,
        model: modelName,
        gen: genName,
        seats,
      });
    }
  }
  log(`  ✓ ${gens.length} vehicle generations across ${VEHICLES.length} models`);

  // Designs and colours
  const designs: Record<string, string> = {};
  for (const [name, category, consumption] of DESIGNS) {
    const row =
      (await prisma.design.findFirst({ where: { factoryId: FID, name } })) ??
      (await prisma.design.create({
        data: { factoryId: FID, name, category, fabricConsumption: consumption },
      }));
    if (row.fabricConsumption !== consumption) {
      await prisma.design.update({ where: { id: row.id }, data: { fabricConsumption: consumption, category } });
    }
    designs[name] = row.id;
  }

  // Designs left behind by the old product catalogue: no category, no fabric
  // consumption. A design without a consumption silently yields a seat cover
  // with no fabric line, so an incomplete one is worse than a missing one.
  const strays = await prisma.design.findMany({
    where: { factoryId: FID, fabricConsumption: null, name: { notIn: DESIGNS.map((d) => d[0]) } },
    select: { id: true, name: true },
  });
  for (const stray of strays) {
    const used =
      (await prisma.itemFieldValue.count({ where: { valueRefId: stray.id } })) +
      (await prisma.salesOrder.count({ where: { designId: stray.id } }));
    if (used > 0) {
      log(`  ! kept design "${stray.name}" — ${used} record(s) still reference it`);
      continue;
    }
    await prisma.bomContribution.deleteMany({ where: { refId: stray.id } });
    await prisma.design.delete({ where: { id: stray.id } });
    log(`  ✓ removed incomplete design "${stray.name}"`);
  }

  const colours: Record<string, string> = {};
  for (const name of COLOURS) {
    const row =
      (await prisma.color.findFirst({ where: { factoryId: FID, name } })) ??
      (await prisma.color.create({ data: { factoryId: FID, name } }));
    colours[name] = row.id;
  }
  log(`  ✓ ${DESIGNS.length} designs (all with fabric consumption), ${COLOURS.length} colours`);

  // Suppliers
  const suppliers: Record<string, string> = {};
  for (const [i, [name, city, terms, lead]] of SUPPLIERS.entries()) {
    const row =
      (await prisma.supplier.findFirst({ where: { factoryId: FID, name } })) ??
      (await prisma.supplier.create({
        data: {
          factoryId: FID,
          name,
          contactPerson: name.split(" ")[0],
          phone: `98200${String(11000 + i).slice(0, 5)}`,
          email: `sales@${name.toLowerCase().replace(/[^a-z]+/g, "")}.co.in`,
          address: `Industrial Area, ${city}`,
          gst: `${String(24 + i).padStart(2, "0")}AABCS${1000 + i}K1Z${i}`,
          pan: `AABCS${1000 + i}K`,
          bankName: "HDFC Bank",
          bankAccount: `5010${String(1234567 + i)}`,
          paymentTerms: terms,
          leadTimeDays: lead,
        },
      }));
    suppliers[name] = row.id;
  }

  // Customers
  const customers: string[] = [];
  for (const [i, [name, company, city, terms, limit]] of CUSTOMERS.entries()) {
    const row =
      (await prisma.customer.findFirst({ where: { factoryId: FID, name } })) ??
      (await prisma.customer.create({
        data: {
          factoryId: FID,
          customerCode: `CUST-${String(i + 1).padStart(4, "0")}`,
          name,
          companyName: company,
          phone: `99${String(100000000 + i * 111111).slice(0, 8)}`,
          email: `${name.split(" ")[0].toLowerCase()}@${company.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
          gstNumber: `${String(7 + i).padStart(2, "0")}AAACC${2000 + i}M1Z${i}`,
          billingAddress: `${company}, Main Market, ${city}`,
          shippingAddress: `${company}, Main Market, ${city}`,
          creditLimit: limit,
          paymentTerms: terms,
          tags: i % 2 === 0 ? ["Dealer", "Repeat"] : ["Retailer"],
        },
      }));
    customers.push(row.id);
  }
  log(`  ✓ ${SUPPLIERS.length} suppliers, ${CUSTOMERS.length} customers — all contact fields filled`);

  // Warehouse with a real bin hierarchy
  const wh =
    (await prisma.warehouse.findFirst({ where: { factoryId: FID, name: "Main Store" } })) ??
    (await prisma.warehouse.create({ data: { factoryId: FID, name: "Main Store", kind: "WAREHOUSE" } }));

  const bins: string[] = [];
  for (const zoneName of ["Raw Material", "Semi-Finished", "Finished Goods"]) {
    const zone =
      (await prisma.warehouseZone.findFirst({ where: { warehouseId: wh.id, name: zoneName } })) ??
      (await prisma.warehouseZone.create({
        data: { factoryId: FID, warehouseId: wh.id, name: zoneName },
      }));
    for (const rackName of ["R1", "R2"]) {
      const rack =
        (await prisma.warehouseRack.findFirst({ where: { zoneId: zone.id, name: rackName } })) ??
        (await prisma.warehouseRack.create({
          data: { factoryId: FID, zoneId: zone.id, name: rackName },
        }));
      for (const shelfName of ["S1", "S2"]) {
        const shelf =
          (await prisma.warehouseShelf.findFirst({ where: { rackId: rack.id, name: shelfName } })) ??
          (await prisma.warehouseShelf.create({
            data: { factoryId: FID, rackId: rack.id, name: shelfName },
          }));
        for (const binName of ["A", "B"]) {
          const full = `${zoneName[0]}-${rackName}-${shelfName}-${binName}`;
          const bin =
            (await prisma.warehouseBin.findFirst({ where: { shelfId: shelf.id, name: full } })) ??
            (await prisma.warehouseBin.create({
              data: { factoryId: FID, shelfId: shelf.id, name: full },
            }));
          bins.push(bin.id);
        }
      }
    }
  }
  log(`  ✓ 1 warehouse, 3 zones, ${bins.length} bins`);

  // Departments
  const depts: Record<string, string> = {};
  for (const [name, isQc, sortOrder] of DEPARTMENTS) {
    const row =
      (await prisma.department.findFirst({ where: { factoryId: FID, name } })) ??
      (await prisma.department.create({
        data: {
          factoryId: FID,
          name,
          sortOrder,
          isQcStage: isQc,
          requirePhoto: isQc,
          requireRemarks: isQc,
          description: `${name} stage`,
          capacity: 40,
        },
      }));
    depts[name] = row.id;
  }

  // Employees
  let employeeCount = 0;
  for (const [name, role, dept, phone] of EMPLOYEES) {
    const existing = await prisma.user.findFirst({ where: { factoryId: FID, phone } });
    if (existing) continue;
    const user = await prisma.user.create({
      data: {
        factoryId: FID,
        name,
        phone,
        role,
        departmentId: dept ? depts[dept] : null,
        email: `${name.split(" ")[0].toLowerCase()}@carxen.in`,
        isActive: true,
        status: "active",
      },
    });
    await prisma.employeeProfile.create({
      data: {
        userId: user.id,
        factoryId: FID,
        dateOfJoining: new Date(2023, employeeCount % 12, ((employeeCount * 3) % 27) + 1),
        employmentType: employeeCount % 4 === 0 ? "CONTRACT" : "PERMANENT",
        hourlyRate: role === "WORKER" ? 95 : role === "SUPERVISOR" ? 160 : 210,
        skills:
          dept === "Stitching" ? ["stitching", "overlock"] :
          dept === "Cutting" ? ["cutting", "cad"] :
          dept === "Quality Control" ? ["inspection"] : ["general"],
      },
    });
    employeeCount += 1;
  }
  log(`  ✓ ${DEPARTMENTS.length} departments, ${employeeCount} employees with profiles`);

  return { gens, designs, colours, suppliers, customers, bins, depts };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Field definitions the templates already expect
// ─────────────────────────────────────────────────────────────────────────────

async function seedFieldDefinitions() {
  const fabric = await groupByName("Fabric", "Raw Material");
  const foam = await groupByName("Foam", "Raw Material");
  const thread = await groupByName("Thread", "Raw Material");
  const seatCover = await groupByName("Seat Cover", "Finished Good");

  // Fabric's name template reads "{materialType} {colour} {gsm}" but neither
  // materialType nor colour existed, so every fabric rendered with two holes.
  const materialType = await ensureField(fabric.id, {
    name: "Material Type", key: "materialType", kind: "OPTION", isRequired: true, sortOrder: 0,
  });
  await ensureOptions(materialType.id, [
    ["Leatherite", "LTR"], ["Nappa", "NAP"], ["Suede", "SUE"],
    ["Art Leather", "ART"], ["Jacquard Fabric", "JQD"],
  ]);
  await ensureField(fabric.id, {
    name: "Colour", key: "colour", kind: "REFERENCE", refTarget: "COLOR", isRequired: true, sortOrder: 1,
  });

  // Foam prints "{density} {thickness} {supplier}" — density was missing.
  const density = await ensureField(foam.id, {
    name: "Density", key: "density", kind: "OPTION", sortOrder: 0,
  });
  await ensureOptions(density.id, [["24D", "24"], ["32D", "32"], ["40D", "40"]]);

  // Thread prints "{colour} {ply}" — both were missing.
  await ensureField(thread.id, {
    name: "Colour", key: "colour", kind: "REFERENCE", refTarget: "COLOR", sortOrder: 0,
  });
  const ply = await ensureField(thread.id, { name: "Ply", key: "ply", kind: "OPTION", sortOrder: 1 });
  await ensureOptions(ply.id, [["20/2", "202"], ["30/2", "302"], ["40/2", "402"]]);

  // Armrest offered only "No Arm", so no item could ever say it had one.
  await ensureOptions(await fieldId("Seat Cover", "armrest"), [["Arm", "ARM"]]);
  await ensureOptions(await fieldId("Seat Cover", "backType"), []);

  // Short codes make the generated item codes readable instead of a wall of
  // full words: SC-MAR-SWI-DB4HDR beats SC-Maruti-Swift-DoubleBack.
  const backType = await fieldId("Seat Cover", "backType");
  const opts = await prisma.specFieldOption.findMany({ where: { fieldId: backType } });
  for (const o of opts) {
    if (o.shortCode) continue;
    await prisma.specFieldOption.update({
      where: { id: o.id },
      data: { shortCode: o.label === "Double Back" ? "DB" : "SB" },
    });
  }

  void seatCover;
  log("  ✓ field definitions completed — every {token} in a name template now resolves");
}


/**
 * Production routes for every producible group.
 *
 * defaultRouteJson stores department *ids*, and the reset gave departments new
 * ones — so every stored route pointed at departments that no longer exist and
 * blueprint building died on a foreign key. Routes must therefore be rewritten
 * whenever departments are, which is exactly why this runs after seedMasters
 * rather than beside the field definitions.
 */
const ROUTES: Record<string, [dept: string, mins: number][]> = {
  "Seat Cover": [
    ["Cutting", 45], ["Embroidery", 30], ["Stitching", 120],
    ["Finishing", 35], ["Quality Control", 20], ["Packing", 15],
  ],
  "Floor Mats": [["Cutting", 25], ["Finishing", 20], ["Quality Control", 10], ["Packing", 10]],
  "Steering Cover": [["Cutting", 15], ["Stitching", 40], ["Quality Control", 10], ["Packing", 5]],
  "Neck Pillow": [["Cutting", 15], ["Stitching", 35], ["Quality Control", 10], ["Packing", 5]],
  "Cut Panel": [["Cutting", 40], ["Quality Control", 10]],
  "Stitched Assembly": [["Stitching", 110], ["Quality Control", 15]],
  "Embroidered Panel": [["Embroidery", 45], ["Quality Control", 10]],
};

const DEFAULT_ROUTE: [string, number][] = [
  ["Cutting", 30], ["Stitching", 60], ["Quality Control", 15], ["Packing", 10],
];

async function seedRoutes(depts: Record<string, string>) {
  const qcTemplate = await prisma.qCTemplate.findFirst({ where: { factoryId: FID } });
  const producible = await prisma.itemGroup.findMany({
    where: { factoryId: FID, isProducible: true },
  });

  let routed = 0;
  for (const group of producible) {
    const steps = ROUTES[group.name] ?? DEFAULT_ROUTE;
    const json = steps
      .filter(([dept]) => depts[dept])
      .map(([dept, estimatedTimeMins]) => ({ departmentId: depts[dept], estimatedTimeMins }));
    if (json.length === 0) continue;

    await prisma.itemGroup.update({
      where: { id: group.id },
      data: {
        defaultRouteJson: json,
        // Without a QC template every blueprint build reports a warning, which
        // trains the owner to ignore warnings.
        defaultQcTemplateId: group.defaultQcTemplateId ?? qcTemplate?.id ?? null,
      },
    });
    routed += 1;
  }
  log(`  ✓ production routes on ${routed} producible groups, each pointing at live departments`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Items
// ─────────────────────────────────────────────────────────────────────────────

type Ctx = Awaited<ReturnType<typeof seedMasters>>;

const created: { id: string; name: string; group: string }[] = [];
const failures: string[] = [];

async function make(groupId: string, groupName: string, answers: Record<string, SpecAnswer>, uom: string, alias?: string) {
  const result = await createItemFromSpecFor(FID, {
    groupId,
    answers,
    defaultUOM: uom,
    aliasName: alias ?? null,
    reuseExisting: true,
  });
  if ("error" in result) {
    failures.push(`${groupName}: ${result.error}`);
    return null;
  }
  const item = await prisma.itemMaster.findUnique({ where: { id: result.id }, select: { name: true } });
  created.push({ id: result.id, name: item?.name ?? "", group: groupName });
  return result.id;
}

const opt = (id: string): SpecAnswer => ({ optionId: id });
const ref = (id: string): SpecAnswer => ({ valueRefId: id });
const item = (id: string): SpecAnswer => ({ valueItemId: id });
const text = (v: string): SpecAnswer => ({ valueText: v });
const num = (v: number): SpecAnswer => ({ valueNumber: v });

async function optionIds(groupName: string, key: string) {
  const f = await prisma.specField.findFirst({
    where: { factoryId: FID, key, group: { name: groupName } },
    include: { options: true },
  });
  const map: Record<string, string> = {};
  for (const o of f?.options ?? []) map[o.label] = o.id;
  return map;
}

async function seedRawMaterials(ctx: Ctx) {
  const fabricGroup = await groupByName("Fabric", "Raw Material");
  const materialTypes = await optionIds("Fabric", "materialType");
  const finishes = await optionIds("Fabric", "finish");

  /** Which colours each material is actually stocked in. */
  const FABRIC_RANGE: [material: string, colours: string[], gsm: number, finish: string, supplier: string][] = [
    ["Leatherite", ["Black", "Beige", "Tan", "Cherry Red", "Coffee Brown", "Ivory", "Grey"], 220, "Textured", "Kohinoor Leatherite Pvt Ltd"],
    ["Nappa", ["Black", "Beige", "Tan", "Maroon"], 260, "Matte", "Kohinoor Leatherite Pvt Ltd"],
    ["Suede", ["Black", "Grey", "Navy Blue", "Cream"], 180, "Matte", "Shree Balaji Textiles"],
    ["Art Leather", ["Black", "Beige", "Coffee Brown"], 200, "Gloss", "Kohinoor Leatherite Pvt Ltd"],
    ["Jacquard Fabric", ["Grey", "Navy Blue", "Cream"], 160, "Perforated", "Shree Balaji Textiles"],
  ];

  const fabrics: { id: string; material: string; colour: string }[] = [];
  for (const [material, colours, gsm, finish, supplier] of FABRIC_RANGE) {
    for (const colour of colours) {
      const id = await make(
        fabricGroup.id,
        "Fabric",
        {
          materialType: opt(materialTypes[material]),
          colour: ref(ctx.colours[colour]),
          gsm: num(gsm),
          thickness: num(material === "Nappa" ? 1.2 : 0.9),
          width: num(54),
          finish: opt(finishes[finish]),
          supplier: ref(ctx.suppliers[supplier]),
          supplierReference: text(`${material.slice(0, 3).toUpperCase()}-${colour.slice(0, 3).toUpperCase()}-${gsm}`),
          ht: text("Roll"),
          hsn: text("59039090"),
        },
        "MTR",
        colour
      );
      if (id) fabrics.push({ id, material, colour });
    }
  }

  // Foam
  const foamGroup = await groupByName("Foam", "Raw Material");
  const densities = await optionIds("Foam", "density");
  const grades = await optionIds("Foam", "grade");
  const foams: string[] = [];
  for (const [d, t, grade] of [["24D", 5, "Standard"], ["32D", 8, "High Resilience"], ["40D", 10, "Memory"]] as const) {
    const id = await make(foamGroup.id, "Foam", {
      density: opt(densities[d]),
      thickness: num(t),
      grade: opt(grades[grade]),
      supplier: ref(ctx.suppliers["National Foam Industries"]),
    }, "SQM");
    if (id) foams.push(id);
  }

  // Thread
  const threadGroup = await groupByName("Thread", "Raw Material");
  const plies = await optionIds("Thread", "ply");
  const uses = await optionIds("Thread", "use");
  const threads: { id: string; colour: string }[] = [];
  for (const colour of ["Black", "Beige", "Tan", "Cherry Red", "Coffee Brown", "Ivory", "Grey", "Navy Blue"]) {
    const id = await make(threadGroup.id, "Thread", {
      colour: ref(ctx.colours[colour]),
      ply: opt(plies["40/2"]),
      use: opt(uses["General Stitch"]),
      supplier: ref(ctx.suppliers["Vardhman Threads"]),
    }, "CONE");
    if (id) threads.push({ id, colour });
  }

  // The simple "{group} {colour}" raw materials.
  const simple: Record<string, string[]> = {};
  for (const [groupName, colours, uom] of [
    ["Elastic", ["Black", "Ivory"], "MTR"],
    ["Clips", ["Black", "Grey"], "PCS"],
    ["Velcro", ["Black", "Ivory"], "MTR"],
    ["PVC", ["Black", "Beige", "Tan"], "MTR"],
    ["Leather", ["Black", "Tan", "Coffee Brown"], "SQF"],
  ] as const) {
    const g = await groupByName(groupName, "Raw Material");
    simple[groupName] = [];
    for (const colour of colours) {
      const id = await make(g.id, groupName, { colour: ref(ctx.colours[colour]) }, uom);
      if (id) simple[groupName].push(id);
    }
  }

  log(`  ✓ ${fabrics.length} fabrics, ${foams.length} foams, ${threads.length} threads, ${Object.values(simple).flat().length} other raw materials`);
  return { fabrics, foams, threads, simple };
}

async function seedConsumablesAndPackaging() {
  const consumables: string[] = [];
  for (const [groupName, packSizes, uom] of [
    ["Glue", ["1 L", "5 L"], "CAN"],
    ["Needles", ["Pack of 10", "Pack of 100"], "PKT"],
    ["Oil", ["500 ml", "1 L"], "BTL"],
    ["Cleaner", ["500 ml"], "BTL"],
    ["Scissors", ["Single"], "PCS"],
  ] as const) {
    const g = await groupByName(groupName, "Consumable");
    for (const packSize of packSizes) {
      const id = await make(g.id, groupName, { packSize: text(packSize) }, uom);
      if (id) consumables.push(id);
    }
  }

  const packaging: Record<string, string> = {};
  for (const [groupName, sizes, uom] of [
    ["Poly Bag", ["Large", "Medium"], "PCS"],
    ["Carton", ["Standard", "Large"], "PCS"],
    ["Sticker", ["Brand"], "PCS"],
    ["Barcode Label", ["50x25mm"], "PCS"],
  ] as const) {
    const g = await groupByName(groupName, "Packaging");
    for (const size of sizes) {
      const id = await make(g.id, groupName, { size: text(size) }, uom);
      if (id) packaging[`${groupName} ${size}`] = id;
    }
  }

  log(`  ✓ ${consumables.length} consumables, ${Object.keys(packaging).length} packaging items`);
  return { consumables, packaging };
}

async function seedSemiFinished(ctx: Ctx, fabrics: { id: string; material: string; colour: string }[]) {
  const cutPanel = await groupByName("Cut Panel", "Semi-Finished");
  const panelTypes = await prisma.specField.findFirst({
    where: { factoryId: FID, key: "panelType", groupId: cutPanel.id },
    include: { options: true },
  });
  const panelOpts = panelTypes?.options ?? [];

  const made: string[] = [];
  // Cut panels for the highest-volume vehicles only — a factory does not
  // pre-cut for every model it can quote.
  const topGens = ctx.gens.filter((g) =>
    ["Swift", "Creta", "Nexon", "Innova Crysta", "Seltos"].includes(g.model)
  ).slice(0, 5);

  for (const gen of topGens) {
    for (const fabric of fabrics.filter((f) => f.material === "Leatherite" && ["Black", "Beige"].includes(f.colour))) {
      const id = await make(cutPanel.id, "Cut Panel", {
        ...(panelOpts.length ? { panelType: opt(panelOpts[0].id) } : {}),
        brand: ref(gen.brandId),
        model: ref(gen.modelId),
        fabric: item(fabric.id),
      }, "SET");
      if (id) made.push(id);
    }
  }

  const stitched = await groupByName("Stitched Assembly", "Semi-Finished");
  const asmField = await prisma.specField.findFirst({
    where: { factoryId: FID, key: "assemblyType", groupId: stitched.id },
    include: { options: true },
  });
  for (const gen of topGens) {
    const id = await make(stitched.id, "Stitched Assembly", {
      ...(asmField?.options.length ? { assemblyType: opt(asmField.options[0].id) } : {}),
      brand: ref(gen.brandId),
      model: ref(gen.modelId),
    }, "SET");
    if (id) made.push(id);
  }

  log(`  ✓ ${made.length} semi-finished items`);
  return made;
}

async function seedFinishedGoods(ctx: Ctx, fabrics: { id: string; material: string; colour: string }[]) {
  const seatCover = await groupByName("Seat Cover", "Finished Good");
  const backTypes = await optionIds("Seat Cover", "backType");
  const armrests = await optionIds("Seat Cover", "armrest");
  const capacities = await optionIds("Seat Cover", "capacity");

  // Depth where it is sold, coverage everywhere else — the shape of a real
  // catalogue. Crossing every generation by every design by every fabric would
  // be 500 SKUs, which is not "complete", it is noise nobody could navigate.
  const HIGH_VOLUME = ["Swift", "Baleno", "Dzire", "Creta", "i20", "Nexon", "XUV700", "Innova Crysta", "Seltos", "City"];
  const designNames = ["SPC PRO SERIES", "ERGO FIT Vertex", "Lifto 7 Lines", "Classic Plain"];
  const fabricPicks = fabrics.filter(
    (f) => f.material === "Leatherite" && ["Black", "Beige"].includes(f.colour)
  );

  let count = 0;
  for (const gen of ctx.gens) {
    const deep = HIGH_VOLUME.includes(gen.model);
    // Every vehicle gets at least one sellable SKU, so no model is a dead end
    // when an order comes in for it.
    const designsFor = deep ? designNames : designNames.slice(0, 1);
    const fabricsFor = deep ? fabricPicks : fabricPicks.slice(0, 1);
    for (const designName of designsFor) {
      for (const fabric of fabricsFor) {
        const id = await make(seatCover.id, "Seat Cover", {
          brand: ref(gen.brandId),
          model: ref(gen.modelId),
          generation: ref(gen.id),
          backType: opt(backTypes["Double Back"]),
          headrests: num(gen.seats === 7 ? 6 : 5),
          armrest: opt(armrests[gen.seats === 7 ? "Arm" : "No Arm"]),
          design: ref(ctx.designs[designName]),
          fabric: item(fabric.id),
          colour: ref(ctx.colours[fabric.colour]),
          capacity: opt(capacities[gen.seats === 7 ? "7 Seater" : "5 Seater"]),
        }, "SET");
        if (id) count += 1;
      }
    }
  }
  log(`  ✓ ${count} seat covers`);

  // Floor mats, steering covers, neck pillows — the rest of the catalogue.
  const mats = await groupByName("Floor Mats", "Finished Good");
  const matTypes = await optionIds("Floor Mats", "matType");
  let others = 0;
  for (const gen of ctx.gens.filter((g) => HIGH_VOLUME.includes(g.model)).slice(0, 8)) {
    for (const matType of ["5D", "7D"]) {
      for (const colour of ["Black", "Beige"]) {
        const id = await make(mats.id, "Floor Mats", {
          brand: ref(gen.brandId),
          model: ref(gen.modelId),
          matType: opt(matTypes[matType]),
          colour: ref(ctx.colours[colour]),
        }, "SET");
        if (id) others += 1;
      }
    }
  }

  const steering = await groupByName("Steering Cover", "Finished Good");
  const sizes = await prisma.specField.findFirst({
    where: { factoryId: FID, key: "size", groupId: steering.id },
    include: { options: true },
  });
  for (const fabric of fabricPicks) {
    for (const size of sizes?.options.length ? sizes.options : [null]) {
      const id = await make(steering.id, "Steering Cover", {
        ...(size ? { size: opt(size.id) } : { size: text("Medium") }),
        fabric: item(fabric.id),
        colour: ref(ctx.colours[fabric.colour]),
      }, "PCS");
      if (id) others += 1;
    }
  }

  const pillow = await groupByName("Neck Pillow", "Finished Good");
  for (const fabric of fabricPicks) {
    const id = await make(pillow.id, "Neck Pillow", {
      fabric: item(fabric.id),
      colour: ref(ctx.colours[fabric.colour]),
    }, "PAIR");
    if (id) others += 1;
  }

  log(`  ✓ ${others} other finished goods (mats, steering covers, neck pillows)`);
  return count + others;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. BOM: category recipes, contributions, and a couple of real overrides
// ─────────────────────────────────────────────────────────────────────────────

async function seedBom(rm: Awaited<ReturnType<typeof seedRawMaterials>>, pk: Awaited<ReturnType<typeof seedConsumablesAndPackaging>>) {
  const seatCover = await groupByName("Seat Cover", "Finished Good");
  const fabricField = await fieldId("Seat Cover", "fabric");
  const designField = await fieldId("Seat Cover", "design");

  await prisma.bomTemplateLine.deleteMany({ where: { groupId: seatCover.id } });

  // The fabric slot: which fabric comes from the item's answer, how much comes
  // from the chosen design. This one line is the spec engine's whole point.
  await prisma.bomTemplateLine.create({
    data: {
      factoryId: FID,
      groupId: seatCover.id,
      sourceFieldId: fabricField,
      quantity: 1,
      quantityFrom: "design.fabricConsumption",
      wastePercent: 8,
      sortOrder: 0,
    },
  });

  const fixed: [itemId: string, qty: number, waste: number][] = [
    [rm.foams[1], 2.4, 5],
    [pk.packaging["Poly Bag Large"], 1, 0],
    [pk.packaging["Carton Standard"], 0.25, 0],
    [pk.packaging["Sticker Brand"], 1, 0],
    [rm.simple["Elastic"][0], 3.5, 2],
    [rm.simple["Clips"][0], 12, 0],
  ];
  let sortOrder = 1;
  for (const [itemId, quantity, wastePercent] of fixed) {
    if (!itemId) continue;
    await prisma.bomTemplateLine.create({
      data: { factoryId: FID, groupId: seatCover.id, itemId, quantity, wastePercent, sortOrder: sortOrder++ },
    });
  }

  // Contributions: what each *value* brings with it.
  await prisma.bomContribution.deleteMany({ where: { factoryId: FID } });

  const designRows = await prisma.design.findMany({ where: { factoryId: FID } });
  const threadByColour = new Map(rm.threads.map((t) => [t.colour, t.id]));
  let contributions = 0;

  for (const design of designRows) {
    // Every design consumes thread; the fancier ones consume more.
    const threadQty =
      design.category === "Luxury" ? 90 : design.category === "Premium" ? 70 : 45;
    await prisma.bomContribution.create({
      data: {
        factoryId: FID,
        refId: design.id,
        componentItemId: threadByColour.get("Black")!,
        quantity: threadQty,
        wastePercent: 5,
        sortOrder: 0,
      },
    });
    contributions += 1;

    // Only quilted and premium designs need piping.
    if (["Premium", "Luxury"].includes(design.category ?? "")) {
      await prisma.bomContribution.create({
        data: {
          factoryId: FID,
          refId: design.id,
          componentItemId: rm.simple["PVC"][0],
          quantity: 2.2,
          wastePercent: 6,
          sortOrder: 1,
        },
      });
      contributions += 1;
    }
  }

  // An option-driven contribution: an armrest is a real extra panel.
  const armOption = await prisma.specFieldOption.findFirst({
    where: { fieldId: await fieldId("Seat Cover", "armrest"), value: "Arm" },
  });
  if (armOption) {
    await prisma.bomContribution.create({
      data: {
        factoryId: FID,
        optionId: armOption.id,
        componentItemId: rm.foams[0],
        quantity: 0.4,
        wastePercent: 5,
        sortOrder: 0,
      },
    });
    contributions += 1;
  }

  // An item-driven contribution: suede needs a backing sheet the others do not.
  const suede = rm.fabrics.find((f) => f.material === "Suede" && f.colour === "Black");
  if (suede) {
    await prisma.bomContribution.create({
      data: {
        factoryId: FID,
        ownerItemId: suede.id,
        componentItemId: rm.simple["Velcro"][0],
        quantity: 1.5,
        wastePercent: 0,
        sortOrder: 0,
      },
    });
    contributions += 1;
  }

  log(`  ✓ ${sortOrder} recipe lines on Seat Cover, ${contributions} contributions`);

  void designField;
}

/**
 * Per-SKU overrides, seeded after the finished goods exist so there is
 * something to override. Without these the three-layer merge is a feature with
 * no data behind it, and nobody would see it working.
 */
async function seedOverrides(rm: Awaited<ReturnType<typeof seedRawMaterials>>) {
  await prisma.itemBomOverride.deleteMany({ where: { factoryId: FID } });

  const sevenSeaters = await prisma.itemMaster.findMany({
    where: { factoryId: FID, group: { name: "Seat Cover" }, name: { contains: "Innova" } },
    select: { id: true },
    take: 6,
  });
  let overrides = 0;
  for (const sc of sevenSeaters) {
    // A seven-seater genuinely takes more foam than the recipe's default.
    await prisma.itemBomOverride.create({
      data: {
        factoryId: FID,
        itemId: sc.id,
        componentItemId: rm.foams[1],
        quantity: 3.6,
        wastePercent: 5,
        removed: false,
      },
    });
    overrides += 1;
  }

  // One removal, so the "dropped on this item" path has real data too.
  const plain = await prisma.itemMaster.findFirst({
    where: { factoryId: FID, group: { name: "Seat Cover" }, name: { contains: "Classic Plain" } },
    select: { id: true },
  });
  if (plain && rm.simple["Clips"][0]) {
    await prisma.itemBomOverride.create({
      data: {
        factoryId: FID,
        itemId: plain.id,
        componentItemId: rm.simple["Clips"][0],
        removed: true,
        quantity: 0,
      },
    });
    overrides += 1;
  }

  log(`  ✓ ${overrides} per-SKU BOM overrides (${overrides - 1} quantity, 1 removal)`);
}

/**
 * Re-derive every producible item's blueprint from the finished recipe.
 *
 * Cheap insurance against exactly the ordering mistake this file used to make:
 * if anything was created before the rule that feeds it, this puts it right
 * rather than leaving a catalogue of blueprints with empty BOMs.
 */
async function rebuildBlueprints() {
  const items = await prisma.itemMaster.findMany({
    where: { factoryId: FID, manufacturingType: { not: "BUY" } },
    select: {
      id: true,
      blueprint: { select: { versions: { select: { bom: { select: { _count: { select: { items: true } } } } } } } },
      _count: { select: { bomOverrides: true } },
    },
  });

  // Only what is actually stale: an item whose blueprint carries no BOM lines,
  // or one that has since gained an override. Rebuilding all of them would
  // double the run for no change to the result.
  const stale = items.filter((it) => {
    if (it._count.bomOverrides > 0) return true;
    const lines = it.blueprint?.versions.reduce((n, v) => n + (v.bom?._count.items ?? 0), 0) ?? 0;
    return lines === 0;
  });

  let empty = 0;
  for (const it of stale) {
    const { warnings } = await buildItemBlueprint(FID, it.id);
    if (warnings.some((w) => w.startsWith("BOM is empty"))) empty += 1;
  }
  log(
    `  ✓ ${stale.length} of ${items.length} blueprints rebuilt` +
      (empty ? ` — ${empty} still have no BOM` : " — none left without a BOM")
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Stock, purchase and sales
// ─────────────────────────────────────────────────────────────────────────────

async function seedStock(ctx: Ctx) {
  const items = await prisma.itemMaster.findMany({
    where: { factoryId: FID },
    select: { id: true, itemType: true, defaultUOM: true },
  });
  const binsByZone = await prisma.warehouseBin.findMany({
    where: { shelf: { rack: { zone: { warehouse: { factoryId: FID } } } } },
    include: { shelf: { include: { rack: { include: { zone: true } } } } },
  });
  const pick = (t: ItemType) => {
    const zone =
      t === "FINISHED_PRODUCT" ? "Finished Goods" : t === "SEMI_FINISHED" ? "Semi-Finished" : "Raw Material";
    const candidates = binsByZone.filter((b) => b.shelf.rack.zone.name === zone);
    return candidates.length ? candidates : binsByZone;
  };

  const rate: Record<string, number> = {
    RAW_MATERIAL: 340, SEMI_FINISHED: 1100, FINISHED_PRODUCT: 3200,
    CONSUMABLE: 180, PACKAGING: 22, SPARE_PART: 450,
  };

  let stocked = 0;
  for (const [i, it] of items.entries()) {
    const candidates = pick(it.itemType);
    const bin = candidates[i % candidates.length];
    // Deterministic but varied: some items short, some deep, a few at zero so
    // the low-stock and out-of-stock views have something real to show.
    const base = (i * 37) % 100;
    const qty = base < 8 ? 0 : it.itemType === "FINISHED_PRODUCT" ? base % 40 : base * 2;
    if (qty === 0) continue;

    const valuationRate = rate[it.itemType] ?? 100;
    await prisma.binBalance.create({
      data: { factoryId: FID, itemId: it.id, binId: bin.id, stockAvailable: qty },
    });
    await prisma.stockLedgerEntry.create({
      data: {
        factoryId: FID,
        transactionType: "RECEIPT",
        itemId: it.id,
        binId: bin.id,
        quantityChange: qty,
        valuationRate,
        totalValue: qty * valuationRate,
        referenceDocType: "OpeningStock",
        stockStatus: "AVAILABLE",
        notes: "Opening balance",
      },
    });
    stocked += 1;
  }

  // Minimum levels, so the reorder report is meaningful rather than all-zero.
  await prisma.itemMaster.updateMany({
    where: { factoryId: FID, itemType: "RAW_MATERIAL" },
    data: { minStockLevel: 50, safetyStock: 25 },
  });
  await prisma.itemMaster.updateMany({
    where: { factoryId: FID, itemType: "PACKAGING" },
    data: { minStockLevel: 200, safetyStock: 100 },
  });

  log(`  ✓ opening stock on ${stocked} items across ${binsByZone.length} bins`);
  void ctx;
}

async function seedPurchase(ctx: Ctx) {
  const rms = await prisma.itemMaster.findMany({
    where: { factoryId: FID, itemType: { in: ["RAW_MATERIAL", "PACKAGING", "CONSUMABLE"] } },
    select: { id: true, defaultUOM: true },
    take: 24,
  });
  const supplierIds = Object.values(ctx.suppliers);

  const statuses = ["COMPLETED", "PARTIALLY_RECEIVED", "SUBMITTED", "DRAFT"];
  for (let i = 0; i < 8; i++) {
    const po = await prisma.purchaseOrder.create({
      data: {
        factoryId: FID,
        poNumber: `PO-2026-${String(i + 1).padStart(4, "0")}`,
        supplierId: supplierIds[i % supplierIds.length],
        status: statuses[i % statuses.length],
        orderDate: new Date(2026, 5, (i * 3) % 28 + 1),
        expectedDate: new Date(2026, 6, (i * 3) % 28 + 1),
      },
    });
    for (let j = 0; j < 3; j++) {
      const rm = rms[(i * 3 + j) % rms.length];
      await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          materialId: rm.id,
          quantity: 50 + j * 25,
          rate: 180 + j * 40,
          receivedQty:
            po.status === "COMPLETED" ? 50 + j * 25 : po.status === "PARTIALLY_RECEIVED" ? 20 : 0,
        },
      });
    }
  }
  log("  ✓ 8 purchase orders across 4 statuses, 3 lines each");
}

async function seedSalesOrders(ctx: Ctx) {
  const seatCovers = await prisma.itemMaster.findMany({
    where: { factoryId: FID, group: { name: "Seat Cover" }, status: "ACTIVE" },
    include: { specValues: { include: { field: true } } },
    take: 40,
  });
  if (seatCovers.length === 0) return;

  const statuses = ["DRAFT", "APPROVED", "IN_PRODUCTION", "READY", "DISPATCHED"];
  let n = 0;
  for (let i = 0; i < 20; i++) {
    const sc = seatCovers[i % seatCovers.length];
    const answers = new Map(sc.specValues.map((v) => [v.field.key, v]));
    const status = statuses[i % statuses.length];

    await prisma.salesOrder.create({
      data: {
        factoryId: FID,
        soNumber: `SO-2026-${String(i + 1).padStart(4, "0")}`,
        customerId: ctx.customers[i % ctx.customers.length],
        status,
        orderType: i % 3 === 0 ? "DEALER" : "RETAIL",
        itemId: sc.id,
        // The denormalised display columns stay in step with the item, so the
        // order list and the item never disagree about what was sold.
        designId: answers.get("design")?.valueRefId ?? null,
        colorId: answers.get("colour")?.valueRefId ?? null,
        materialId: answers.get("fabric")?.valueItemId ?? null,
        vehicleBrandId: answers.get("brand")?.valueRefId ?? null,
        vehicleModelId: answers.get("model")?.valueRefId ?? null,
        seatType: answers.get("backType") ? "Double Back" : null,
        headrestCount: answers.get("headrests")?.valueNumber ?? 5,
        hasArmrest: false,
        totalAmount: (i % 5 + 1) * 3200,
        orderDate: new Date(2026, 6, (i % 28) + 1),
        expectedDeliveryDate: new Date(2026, 7, (i % 28) + 1),
        createdById: OWNER_ID,
        remarks: i % 4 === 0 ? "Customer asked for extra piping on the front pair." : null,
      },
    });
    n += 1;
  }
  log(`  ✓ ${n} sales orders across 5 statuses, each resolved to a real item`);
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const factory = await prisma.factory.findFirst();
  if (!factory) throw new Error("No factory — run the base seed first.");
  FID = factory.id;

  const owner = await prisma.user.findFirst({ where: { factoryId: FID, role: "OWNER" } });
  if (!owner) throw new Error("No owner user — refusing to seed into an unowned factory.");
  OWNER_ID = owner.id;

  log(`Seeding factory: ${factory.name} (${FID})\n`);

  log("1. Structure");
  await cleanStructure();
  await seedFieldDefinitions();

  log("\n2. Master records");
  const ctx = await seedMasters();

  await seedRoutes(ctx.depts);

  // Components first, then the recipe that consumes them, then the goods that
  // are made from it. A finished good created before its category recipe exists
  // gets a blueprint with an empty BOM — the ordering is the correctness.
  log("\n3. Components");
  const rm = await seedRawMaterials(ctx);
  const pk = await seedConsumablesAndPackaging();

  log("\n4. Bill of materials");
  await seedBom(rm, pk);

  log("\n5. Produced items");
  await seedSemiFinished(ctx, rm.fabrics);
  await seedFinishedGoods(ctx, rm.fabrics);

  log("\n6. BOM overrides and blueprint rebuild");
  await seedOverrides(rm);
  await rebuildBlueprints();

  log("\n7. Stock and transactions");
  await seedStock(ctx);
  await seedPurchase(ctx);
  await seedSalesOrders(ctx);

  // ── Report ────────────────────────────────────────────────────────────────
  log("\n─────────────────────────────────────────");
  const counts = {
    items: await prisma.itemMaster.count({ where: { factoryId: FID } }),
    finishedGoods: await prisma.itemMaster.count({ where: { factoryId: FID, itemType: "FINISHED_PRODUCT" } }),
    blueprints: await prisma.blueprint.count({ where: { factoryId: FID } }),
    bomItems: await prisma.bOMItem.count({ where: { bom: { factoryId: FID } } }),
    contributions: await prisma.bomContribution.count({ where: { factoryId: FID } }),
    overrides: await prisma.itemBomOverride.count({ where: { factoryId: FID } }),
    salesOrders: await prisma.salesOrder.count({ where: { factoryId: FID } }),
    purchaseOrders: await prisma.purchaseOrder.count({ where: { factoryId: FID } }),
    stockRows: await prisma.binBalance.count({ where: { factoryId: FID } }),
    employees: await prisma.user.count({ where: { factoryId: FID } }),
  };
  console.table(counts);

  // A name with a blank in it means a template token had no answer — the exact
  // "partial data" this seed exists to avoid, so it is reported, not hidden.
  const holes = await prisma.itemMaster.findMany({
    where: { factoryId: FID, OR: [{ name: { contains: "  " } }, { name: { endsWith: " " } }] },
    select: { name: true },
    take: 10,
  });
  if (holes.length) {
    log(`\n⚠ ${holes.length} item name(s) have gaps where a field went unanswered:`);
    for (const h of holes) log(`   "${h.name}"`);
  } else {
    log("\n✓ every item name renders complete — no unanswered template tokens");
  }

  if (failures.length) {
    log(`\n⚠ ${failures.length} item(s) could not be created:`);
    for (const f of failures.slice(0, 15)) log(`   ${f}`);
  }

  log("\n✅ Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
