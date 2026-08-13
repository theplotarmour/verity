import { PrismaClient, ItemType, FieldType, SpecFieldKind, SpecRefTarget } from "@prisma/client";
import { createDefaultMasterData } from "../src/lib/master-data/defaults";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

// PINs are factory-salted and environment-independent. This MUST match
// src/lib/server/hash.ts exactly — it drifted to a `veda:` prefix once, which
// silently made every seeded account unable to log in: the seed wrote one hash
// and the login checked another, with no error anywhere to say so.
function hashPin(pin: string, factoryId: string) {
  return createHash("sha256").update(`verity:${factoryId}:${pin}`).digest("hex");
}

// Per-type item codes (RM-00001, FG-00001...) generated in-seed.
const CODE_PREFIX: Record<string, string> = {
  RAW_MATERIAL: "RM", SEMI_FINISHED: "SF", FINISHED_PRODUCT: "FG", CONSUMABLE: "CN",
  PACKAGING: "PK", SPARE_PART: "SP", MACHINERY: "MC", TOOL: "TL", ASSET: "AS", SERVICE: "SV",
};
const codeCounters: Record<string, number> = {};
function nextCode(type: string) {
  codeCounters[type] = (codeCounters[type] ?? 0) + 1;
  return `${CODE_PREFIX[type]}-${String(codeCounters[type]).padStart(5, "0")}`;
}

export async function seedItemGroups(factoryId: string) {
  return createDefaultMasterData(prisma, factoryId);
}

type BlueprintSeed = {
  root: string;
  name: string;
  shortCode: string;
  nameTemplate: string;
  codeTemplate: string;
  capabilities?: Partial<{
    isProducible: boolean;
    isPurchasable: boolean;
    isSalable: boolean;
    hasBOM: boolean;
    hasQC: boolean;
    hasRouting: boolean;
    hasCAD: boolean;
  }>;
  fields: Array<{
    name: string;
    key: string;
    kind: SpecFieldKind;
    valueType?: FieldType | null;
    unitSuffix?: string | null;
    refTarget?: SpecRefTarget | null;
    options?: Array<{ label: string; shortCode?: string | null }>;
  }>;
};

async function main() {
  console.log("Cleaning database...");
  const tableNames = [
    "ImageEvidence", "CheckpointSubmission", "QualityApproval", "QualityReport", "ReworkRecord", 
    "Inspection", "StageEntry", "JobCard", "WorkOrder", "ProductionPlan", "ProductionBatch", 
    "Dispatch", "SalesOrderItem", "SalesOrder", "Deal", "PurchaseReceiptItem", "PurchaseReceipt", 
    "PurchaseOrderItem", "PurchaseOrder", "PurchaseRequest", "StockLedgerEntry", "BinBalance", 
    "MaterialReservation", "UOMConversion", "BOMItem", "BOM", "BlueprintRouteStep", "BlueprintVersion", 
    "Blueprint", "ItemFieldValue", "ItemMaster", "Customer", "Supplier", "WarehouseBin", "WarehouseShelf", 
    "WarehouseRack", "WarehouseZone", "Warehouse", "AttendanceLog", "LeaveApplication", "EmployeeProfile", 
    "User", "RolePermission", "Role", "ModuleEntitlement", "Factory", "Organization", "ItemGroup", 
    "SpecFieldOption", "SpecField", "RestaurantTable", "MenuCategory", "MenuItem", "DiningOrderItem", 
    "DiningOrder", "DiningBill", "Notification", "AuditLog", "Department", "ChecklistTemplate"
  ];
  for (const table of tableNames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (e) {
      try {
        await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany({});
      } catch (err) {}
    }
  }

  console.log("Seeding Carxen client-trial workspace...");

  const factoryId = "fac_demo";
  const organizationId = "org_demo";

  await prisma.organization.upsert({
    where: { id: organizationId },
    update: {},
    create: { id: organizationId, name: "Carxen", slug: "carxen" },
  });

  const factory = await prisma.factory.upsert({
    where: { slug: "carxen" },
    update: {},
    create: { id: factoryId, organizationId, name: "Carxen", slug: "carxen", logoUrl: null },
  });

  const seededModules = [
    "core", "inventory", "manufacturing", "quality",
    "procurement", "sales", "hr", "automotive",
  ];
  await prisma.moduleEntitlement.createMany({
    data: seededModules.map((moduleKey) => ({ organizationId, moduleKey, enabled: true })),
    skipDuplicates: true,
  });

  const SEED_GRANTS: Record<string, string[]> = {
    OWNER: [
      "dashboard.view", "settings.access", "branding.access", "billing.access",
      "master_data.access", "team.manage", "team.assign_roles",
      "org.transfer_ownership", "reports.view", "reports.export",
      "product_type.manage",
      // sales
      "sales_order.view", "sales_order.create", "sales_order.delete",
      "sales_order.approve", "customer.manage", "dispatch.record",
      // inventory
      "item.view", "item.manage", "stock.view", "stock.adjust", "warehouse.manage",
      // manufacturing
      "bom.view", "bom.manage", "work_order.create", "work_order.release",
      "production.jobs", "production.supervise",
      // quality
      "quality.queue", "quality.inspect", "quality.approve",
      // procurement
      "supplier.manage", "purchase_order.create", "purchase_order.approve",
      "purchase_receipt.record",
      // automotive
      "vehicle_catalog.manage", "fitment.manage",
      // Restaurant OS.
      "kitchen.view", "kitchen.work", "serving.view", "serving.work",
      "invoice.view", "invoice.manage",
    ],
    CO_OWNER: [
      "dashboard.view", "settings.access", "branding.access", "billing.access",
      "master_data.access", "team.manage", "team.assign_roles",
      "org.transfer_ownership", "reports.view", "reports.export",
      "sales_order.view", "sales_order.create", "sales_order.delete",
      "customer.manage", "dispatch.record",
      "item.view", "stock.view", "stock.adjust",
      "bom.view", "work_order.create", "work_order.release",
      "production.jobs", "production.supervise",
      "quality.queue", "quality.inspect",
      "purchase_order.create", "purchase_receipt.record",
      // Restaurant OS.
      "kitchen.view", "kitchen.work", "serving.view", "serving.work",
      "invoice.view", "invoice.manage",
    ],
    MANAGER: [
      "dashboard.view", "master_data.access", "team.manage", "team.assign_roles",
      "reports.view",
      "sales_order.view", "sales_order.create", "customer.manage", "dispatch.record",
      "item.view", "stock.view",
      "bom.view", "work_order.create", "work_order.release", "production.supervise",
      "quality.queue",
      "purchase_order.create", "purchase_receipt.record",
      // Restaurant OS.
      "kitchen.view", "kitchen.work", "serving.view", "serving.work",
      "invoice.view", "invoice.manage",
    ],
    /*
     * Kitchen and serving grants ride on the existing floor archetypes rather
     * than new ones: `SystemRole` has no SERVER or KITCHEN_STAFF, and adding
     * them would be a schema change plus a migration for what is a naming
     * preference. A supervisor runs the pass; a worker cooks and carries.
     *
     * Handing these to a factory's roles costs nothing — `resolveAccess` drops
     * any permission whose module the tenant is not entitled to, so an auto
     * components worker never sees a kitchen queue.
     */
    SUPERVISOR: [
      "dashboard.view", "reports.view",
      "quality.queue", "quality.inspect",
      "production.jobs", "production.supervise",
      // Restaurant OS.
      "kitchen.view", "kitchen.work", "serving.view", "serving.work",
    ],
    WORKER: [
      "production.jobs",
      // Restaurant OS.
      "kitchen.view", "kitchen.work", "serving.view", "serving.work"
    ],
    STORE_MANAGER: [
      "dashboard.view",
      "sales_order.view", "sales_order.create", "customer.manage",
      "item.view", "stock.view",
    ],
  };
  const ROLE_LABELS: Record<string, string> = {
    OWNER: "Owner", CO_OWNER: "Co-Owner", MANAGER: "Manager",
    SUPERVISOR: "Supervisor", WORKER: "Worker", STORE_MANAGER: "Store Manager",
  };

  const roleIdByArchetype: Record<string, string> = {};
  for (const [archetype, grants] of Object.entries(SEED_GRANTS)) {
    const id = `role_${organizationId}_${archetype}`;
    await prisma.role.upsert({
      where: { id },
      update: {},
      create: {
        id,
        organizationId,
        name: ROLE_LABELS[archetype],
        description: "Built-in role. Rename or copy it; it cannot be deleted.",
        systemRole: archetype as any,
        isSystem: true,
        permissions: { create: grants.map((key) => ({ key })) },
      },
    });
    /*
     * Grants are synced separately, because the upsert above passes `update: {}`
     * — an existing role keeps whatever it had, so a permission added to
     * SEED_GRANTS later never reached any workspace that had already been
     * seeded. That is how the kitchen and serving keys ended up granted to
     * nobody: the modules shipped, the roles were already there, and re-running
     * the seed changed nothing.
     *
     * `skipDuplicates` rather than a delete-and-recreate: a tenant may have added
     * their own permissions to a built-in role, and a seed has no business
     * removing them.
     */
    await prisma.rolePermission.createMany({
      data: grants.map((key) => ({ roleId: id, key })),
      skipDuplicates: true,
    });

    roleIdByArchetype[archetype] = id;
  }

  // Ensure default root categories are seeded
  await seedItemGroups(factory.id);

  // 1. Fetch default roots
  const roots = await prisma.itemGroup.findMany({ where: { factoryId: factory.id, parentId: null } });
  const rootByName = new Map(roots.map((g) => [g.name, g]));

  const designGroup = rootByName.get("Design");
  const colourGroup = rootByName.get("Colour");
  const rawMaterialRoot = rootByName.get("Raw Material");
  const finishedGoodRoot = rootByName.get("Finished Good");
  const semiFinishedRoot = rootByName.get("Semi-Finished");
  const consumableRoot = rootByName.get("Consumable");
  const packagingRoot = rootByName.get("Packaging");

  if (!designGroup || !colourGroup || !rawMaterialRoot || !finishedGoodRoot || !semiFinishedRoot || !consumableRoot || !packagingRoot) {
    throw new Error("Required root item groups not found");
  }

  // 2. Seed nested vehicle subcategories under a root "Vehicle"
  const vehicleGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, name: "Vehicle", itemType: "SERVICE", bomMode: "INGREDIENTS", shortCode: "VEH", isSheet: true, sortOrder: 9 },
  });

  const brandGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: vehicleGroup.id, name: "Brand", itemType: "SERVICE", bomMode: "INGREDIENTS", shortCode: "BRD", isSheet: true, sortOrder: 0 },
  });

  const modelGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: brandGroup.id, name: "Model", itemType: "SERVICE", bomMode: "INGREDIENTS", shortCode: "MDL", isSheet: true, sortOrder: 0 },
  });
  const modelBrandField = await prisma.specField.create({
    data: { factoryId: factory.id, groupId: modelGroup.id, name: "Brand", key: "brand", kind: "REFERENCE", refTarget: "ITEM_GROUP", targetGroupId: brandGroup.id, sortOrder: 0 },
  });

  const genGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: modelGroup.id, name: "Generation", itemType: "SERVICE", bomMode: "INGREDIENTS", shortCode: "GEN", isSheet: true, sortOrder: 0 },
  });
  const genBrandField = await prisma.specField.create({
    data: { factoryId: factory.id, groupId: genGroup.id, name: "Brand", key: "brand", kind: "REFERENCE", refTarget: "ITEM_GROUP", targetGroupId: brandGroup.id, sortOrder: 0 },
  });
  const genModelField = await prisma.specField.create({
    data: { factoryId: factory.id, groupId: genGroup.id, name: "Model", key: "model", kind: "REFERENCE", refTarget: "ITEM_GROUP", targetGroupId: modelGroup.id, sortOrder: 1 },
  });

  const carGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: genGroup.id, name: "Car", itemType: "SERVICE", bomMode: "INGREDIENTS", shortCode: "CAR", isSheet: true, sortOrder: 0 },
  });
  const carBrandField = await prisma.specField.create({
    data: { factoryId: factory.id, groupId: carGroup.id, name: "Brand", key: "brand", kind: "REFERENCE", refTarget: "ITEM_GROUP", targetGroupId: brandGroup.id, sortOrder: 0 },
  });
  const carModelField = await prisma.specField.create({
    data: { factoryId: factory.id, groupId: carGroup.id, name: "Model", key: "model", kind: "REFERENCE", refTarget: "ITEM_GROUP", targetGroupId: modelGroup.id, sortOrder: 1 },
  });
  const carGenField = await prisma.specField.create({
    data: { factoryId: factory.id, groupId: carGroup.id, name: "Generation", key: "generation", kind: "REFERENCE", refTarget: "ITEM_GROUP", targetGroupId: genGroup.id, sortOrder: 2 },
  });

  // 3. Seed vehicle item records
  const brandHonda = await prisma.itemMaster.create({
    data: { factoryId: factory.id, groupId: brandGroup.id, name: "Honda", sku: "VEH-BRD-HONDA", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS" }
  });
  const brandHyundai = await prisma.itemMaster.create({
    data: { factoryId: factory.id, groupId: brandGroup.id, name: "Hyundai", sku: "VEH-BRD-HYUNDAI", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS" }
  });
  const brandToyota = await prisma.itemMaster.create({
    data: { factoryId: factory.id, groupId: brandGroup.id, name: "Toyota", sku: "VEH-BRD-TOYOTA", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS" }
  });

  const modelCity = await prisma.itemMaster.create({
    data: {
      factoryId: factory.id, groupId: modelGroup.id, name: "City", sku: "VEH-MDL-CITY", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS",
      specValues: { create: [{ fieldId: modelBrandField.id, valueItemId: brandHonda.id, factoryId: factory.id }] }
    }
  });
  const modelI20 = await prisma.itemMaster.create({
    data: {
      factoryId: factory.id, groupId: modelGroup.id, name: "i20", sku: "VEH-MDL-I20", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS",
      specValues: { create: [{ fieldId: modelBrandField.id, valueItemId: brandHyundai.id, factoryId: factory.id }] }
    }
  });

  const genCity4 = await prisma.itemMaster.create({
    data: {
      factoryId: factory.id, groupId: genGroup.id, name: "Gen 4", sku: "VEH-GEN-CITY4", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS",
      specValues: { create: [
        { fieldId: genBrandField.id, valueItemId: brandHonda.id, factoryId: factory.id },
        { fieldId: genModelField.id, valueItemId: modelCity.id, factoryId: factory.id }
      ]}
    }
  });
  const genCity5 = await prisma.itemMaster.create({
    data: {
      factoryId: factory.id, groupId: genGroup.id, name: "Gen 5", sku: "VEH-GEN-CITY5", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS",
      specValues: { create: [
        { fieldId: genBrandField.id, valueItemId: brandHonda.id, factoryId: factory.id },
        { fieldId: genModelField.id, valueItemId: modelCity.id, factoryId: factory.id }
      ]}
    }
  });
  const genI20Elite = await prisma.itemMaster.create({
    data: {
      factoryId: factory.id, groupId: genGroup.id, name: "Elite", sku: "VEH-GEN-I20ELITE", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS",
      specValues: { create: [
        { fieldId: genBrandField.id, valueItemId: brandHyundai.id, factoryId: factory.id },
        { fieldId: genModelField.id, valueItemId: modelI20.id, factoryId: factory.id }
      ]}
    }
  });

  const carCityPetrol = await prisma.itemMaster.create({
    data: {
      factoryId: factory.id, groupId: carGroup.id, name: "Honda City Gen 5 Petrol", sku: "VEH-CAR-HC5P", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS",
      specValues: { create: [
        { fieldId: carBrandField.id, valueItemId: brandHonda.id, factoryId: factory.id },
        { fieldId: carModelField.id, valueItemId: modelCity.id, factoryId: factory.id },
        { fieldId: carGenField.id, valueItemId: genCity5.id, factoryId: factory.id }
      ]}
    }
  });
  const carI20Asta = await prisma.itemMaster.create({
    data: {
      factoryId: factory.id, groupId: carGroup.id, name: "Hyundai i20 Elite Asta", sku: "VEH-CAR-HI20EA", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS",
      specValues: { create: [
        { fieldId: carBrandField.id, valueItemId: brandHyundai.id, factoryId: factory.id },
        { fieldId: carModelField.id, valueItemId: modelI20.id, factoryId: factory.id },
        { fieldId: carGenField.id, valueItemId: genI20Elite.id, factoryId: factory.id }
      ]}
    }
  });

  // 4. Seed Design items
  const designVertex = await prisma.itemMaster.create({
    data: { factoryId: factory.id, groupId: designGroup.id, name: "Ergo Fit Vertex", sku: "DSN-VERTEX", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS" }
  });
  const designDiamond = await prisma.itemMaster.create({
    data: { factoryId: factory.id, groupId: designGroup.id, name: "Diamond Stitch", sku: "DSN-DIAMOND", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS" }
  });

  // 5. Seed Colour items
  const colourBlack = await prisma.itemMaster.create({
    data: { factoryId: factory.id, groupId: colourGroup.id, name: "Black", sku: "CLR-BLACK", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS" }
  });
  const colourBeige = await prisma.itemMaster.create({
    data: { factoryId: factory.id, groupId: colourGroup.id, name: "Beige", sku: "CLR-BEIGE", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS" }
  });
  const colourTan = await prisma.itemMaster.create({
    data: { factoryId: factory.id, groupId: colourGroup.id, name: "Tan", sku: "CLR-TAN", status: "ACTIVE", itemType: "SERVICE", defaultUOM: "PCS" }
  });

  // 6. Seed Subcategories under roots (like Fabric raw materials)
  const fabricGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: rawMaterialRoot.id, name: "Fabric", itemType: "RAW_MATERIAL", shortCode: "FAB", bomMode: "INGREDIENTS", isSheet: true, sortOrder: 0 },
  });

  // 7. Seed checklist templates
  const qcTemplate = await prisma.checklistTemplate.create({
    data: { factoryId: factory.id, name: "Car Seat Cover Quality Checks", version: "1.0", isLatest: true, status: "active" },
  });
  const qcCheckpoints = [
    { name: "Stitch Alignment", instructions: "Ensure stitch spacing is consistent at 4mm and borders are aligned." },
    { name: "Material Tension & Sagging", instructions: "Check for any loose material, air pockets, or fabric wrinkles." },
    { name: "Strap & Buckle Security", instructions: "Test tension of plastic hooks and elastic straps." },
    { name: "Side Airbag Seam Check", instructions: "Verify special easy-break thread is used for side-airbag seams." },
  ];
  const qcSection = await prisma.templateSection.create({
    data: { factoryId: factory.id, templateId: qcTemplate.id, title: "Standard Stitching & Visual Inspections", sortOrder: 1 },
  });
  for (let i = 0; i < qcCheckpoints.length; i++) {
    await prisma.checkpoint.create({
      data: {
        factoryId: factory.id, sectionId: qcSection.id,
        name: qcCheckpoints[i].name, instructions: qcCheckpoints[i].instructions,
        requireImage: true, requireRemarks: i === 0, sortOrder: i + 1,
      },
    });
  }

  const cuttingTemplate = await prisma.checklistTemplate.create({
    data: { factoryId: factory.id, name: "Cutting Checklist", version: "1.0", isLatest: true, status: "active" },
  });
  const cutSection = await prisma.templateSection.create({
    data: { factoryId: factory.id, templateId: cuttingTemplate.id, title: "Cutting Verification", sortOrder: 1 },
  });
  for (const [i, c] of [
    { name: "Pattern Match", instructions: "Panels match the CAD pattern for the selected vehicle." },
    { name: "Grain Direction", instructions: "Fabric grain runs in the correct direction on all panels." },
  ].entries()) {
    await prisma.checkpoint.create({
      data: { factoryId: factory.id, sectionId: cutSection.id, name: c.name, instructions: c.instructions, requireImage: true, requireRemarks: false, sortOrder: i + 1 },
    });
  }

  // 8. Seed Blueprints library using generic references
  const CARXEN_BLUEPRINTS: BlueprintSeed[] = [
    {
      root: "Finished Good",
      name: "Seat Cover",
      shortCode: "SC",
      nameTemplate: "{group} {brand} {model} {generation} {backType} {headrests} {armrest} {design} {colour}",
      codeTemplate: "SC-{brand}-{model}-{generation}-{backType}{headrests}-{armrest}",
      capabilities: { isProducible: true, isSalable: true, hasBOM: true, hasQC: true, hasRouting: true, hasCAD: true },
      fields: [
        { name: "Brand", key: "brand", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
        { name: "Model", key: "model", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
        { name: "Generation", key: "generation", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
        { name: "Back Type", key: "backType", kind: "OPTION", options: [{ label: "Single Back", shortCode: "SB" }, { label: "Double Back", shortCode: "DB" }] },
        { name: "Headrests", key: "headrests", kind: "VALUE", valueType: "NUMBER", unitSuffix: "HDR" },
        { name: "Armrest", key: "armrest", kind: "OPTION", options: [{ label: "No Arm", shortCode: "NA" }, { label: "With Arm", shortCode: "WA" }] },
        { name: "Design", key: "design", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
        { name: "Fabric", key: "fabric", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
        { name: "Colour", key: "colour", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
      ],
    },
    { root: "Finished Good", name: "Floor Mats", shortCode: "FM", nameTemplate: "{group} {brand} {model} {matType} {colour}", codeTemplate: "FM-{brand}-{model}-{matType}", capabilities: { isProducible: true, isSalable: true, hasBOM: true, hasQC: true, hasRouting: true }, fields: [
      { name: "Brand", key: "brand", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
      { name: "Model", key: "model", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
      { name: "Mat Type", key: "matType", kind: "OPTION", options: [{ label: "5D", shortCode: "5D" }, { label: "7D", shortCode: "7D" }] },
      { name: "Colour", key: "colour", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
    ] },
    { root: "Finished Good", name: "Steering Cover", shortCode: "ST", nameTemplate: "{group} {size} {fabric} {colour}", codeTemplate: "ST-{size}-{colour}", capabilities: { isProducible: true, isSalable: true, hasQC: true }, fields: [
      { name: "Size", key: "size", kind: "OPTION", options: [{ label: "Small", shortCode: "S" }, { label: "Medium", shortCode: "M" }, { label: "Large", shortCode: "L" }] },
      { name: "Fabric", key: "fabric", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
      { name: "Colour", key: "colour", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
    ] },
    { root: "Finished Good", name: "Neck Pillow", shortCode: "NP", nameTemplate: "{group} {fabric} {colour}", codeTemplate: "NP-{fabric}-{colour}", capabilities: { isProducible: true, isSalable: true, hasBOM: true, hasQC: true }, fields: [
      { name: "Fabric", key: "fabric", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
      { name: "Colour", key: "colour", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
    ] },
    { root: "Raw Material", name: "Fabric", shortCode: "FAB", nameTemplate: "{materialType} {colour} {gsm}", codeTemplate: "FAB-{materialType}-{colour}", capabilities: { isPurchasable: true, hasQC: true }, fields: [
      { name: "Material Type", key: "materialType", kind: "OPTION", options: [{ label: "Leather", shortCode: "LTR" }, { label: "PVC", shortCode: "PVC" }, { label: "Suede", shortCode: "SDE" }] },
      { name: "Colour", key: "colour", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
      { name: "GSM", key: "gsm", kind: "VALUE", valueType: "NUMBER", unitSuffix: "GSM" },
      { name: "Supplier", key: "supplier", kind: "REFERENCE", refTarget: "SUPPLIER" },
    ] },
    { root: "Raw Material", name: "Foam", shortCode: "FOM", nameTemplate: "Foam {density} {thickness}", codeTemplate: "FOM-{density}-{thickness}", capabilities: { isPurchasable: true }, fields: [
      { name: "Density", key: "density", kind: "VALUE", valueType: "NUMBER", unitSuffix: "kg/m3" },
      { name: "Thickness", key: "thickness", kind: "VALUE", valueType: "NUMBER", unitSuffix: "mm" },
      { name: "Supplier", key: "supplier", kind: "REFERENCE", refTarget: "SUPPLIER" },
    ] },
    { root: "Raw Material", name: "Thread", shortCode: "THR", nameTemplate: "Thread {colour} {ply}", codeTemplate: "THR-{colour}-{ply}", capabilities: { isPurchasable: true }, fields: [
      { name: "Colour", key: "colour", kind: "REFERENCE", refTarget: "ITEM_GROUP" },
      { name: "Ply", key: "ply", kind: "VALUE", valueType: "TEXT" },
      { name: "Supplier", key: "supplier", kind: "REFERENCE", refTarget: "SUPPLIER" },
    ] },
    ...["PVC", "Leather", "Velcro", "Elastic", "Clips"].map((name): BlueprintSeed => ({ root: "Raw Material", name, shortCode: name.slice(0, 3).toUpperCase(), nameTemplate: `{group} {colour}`, codeTemplate: `${name.slice(0, 3).toUpperCase()}-{colour}`, capabilities: { isPurchasable: true }, fields: [{ name: "Colour", key: "colour", kind: "REFERENCE", refTarget: "ITEM_GROUP" }, { name: "Supplier", key: "supplier", kind: "REFERENCE", refTarget: "SUPPLIER" }] })),
    ...["Glue", "Needles", "Scissors", "Cleaner", "Oil"].map((name): BlueprintSeed => ({ root: "Consumable", name, shortCode: name.slice(0, 3).toUpperCase(), nameTemplate: `{group} {packSize}`, codeTemplate: `${name.slice(0, 3).toUpperCase()}-{packSize}`, capabilities: { isPurchasable: true }, fields: [{ name: "Pack Size", key: "packSize", kind: "VALUE", valueType: "TEXT" }, { name: "Supplier", key: "supplier", kind: "REFERENCE", refTarget: "SUPPLIER" }] })),
    ...["Poly Bag", "Carton", "Sticker", "Barcode Label"].map((name): BlueprintSeed => ({ root: "Packaging", name, shortCode: name.split(" ").map((p) => p[0]).join("").toUpperCase(), nameTemplate: `{group} {size}`, codeTemplate: `${name.split(" ").map((p) => p[0]).join("").toUpperCase()}-{size}`, capabilities: { isPurchasable: true }, fields: [{ name: "Size", key: "size", kind: "VALUE", valueType: "TEXT" }, { name: "Supplier", key: "supplier", kind: "REFERENCE", refTarget: "SUPPLIER" }] })),
    ...["Cut Fabric", "Stitched Panels", "Embroidery", "Foam Laminated Fabric"].map((name): BlueprintSeed => ({ root: "Semi-Finished", name, shortCode: name.split(" ").map((p) => p[0]).join("").toUpperCase(), nameTemplate: `{group} {brand} {model}`, codeTemplate: `${name.split(" ").map((p) => p[0]).join("").toUpperCase()}-{brand}-{model}`, capabilities: { isProducible: true, hasBOM: true, hasRouting: true }, fields: [{ name: "Brand", key: "brand", kind: "REFERENCE", refTarget: "ITEM_GROUP" }, { name: "Model", key: "model", kind: "REFERENCE", refTarget: "ITEM_GROUP" }] })),
    ...["Car Perfume", "Neck Pillow", "Steering Grip"].map((name): BlueprintSeed => ({ root: "Trading Goods", name, shortCode: name.split(" ").map((p) => p[0]).join("").toUpperCase(), nameTemplate: `{group} {brand}`, codeTemplate: `${name.split(" ").map((p) => p[0]).join("").toUpperCase()}-{brand}`, capabilities: { isPurchasable: true, isSalable: true }, fields: [{ name: "Brand", key: "brand", kind: "VALUE", valueType: "TEXT" }, { name: "Supplier", key: "supplier", kind: "REFERENCE", refTarget: "SUPPLIER" }] })),
  ];

  for (const [sortOrder, blueprint] of CARXEN_BLUEPRINTS.entries()) {
    const root = rootByName.get(blueprint.root);
    if (!root) continue;
    const group = await prisma.itemGroup.upsert({
      where: { factoryId_parentId_name: { factoryId: factory.id, parentId: root.id, name: blueprint.name } },
      update: {
        shortCode: blueprint.shortCode,
        nameTemplate: blueprint.nameTemplate,
        codeTemplate: blueprint.codeTemplate,
        ...blueprint.capabilities,
        // Stated, not defaulted: bomMode defaults to OFF, which would leave a
        // seeded finished good with no BOM editor at all.
        bomMode: blueprint.capabilities?.isProducible ? "RECIPE" : "OFF",
        defaultChecklists: blueprint.capabilities?.hasQC ? { connect: { id: qcTemplate.id } } : undefined,
      },
      create: {
        factoryId: factory.id,
        parentId: root.id,
        itemType: root.itemType,
        name: blueprint.name,
        shortCode: blueprint.shortCode,
        nameTemplate: blueprint.nameTemplate,
        codeTemplate: blueprint.codeTemplate,
        sortOrder,
        ...blueprint.capabilities,
        // Stated, not defaulted: bomMode defaults to OFF, which would leave a
        // seeded finished good with no BOM editor at all.
        bomMode: blueprint.capabilities?.isProducible ? "RECIPE" : "OFF",
        defaultChecklists: blueprint.capabilities?.hasQC ? { connect: { id: qcTemplate.id } } : undefined,
      },
    });

    for (const [fieldOrder, field] of blueprint.fields.entries()) {
      let targetGroupId: string | null = null;
      if (field.kind === "REFERENCE" && field.refTarget === "ITEM_GROUP") {
        if (field.key === "brand") targetGroupId = brandGroup.id;
        else if (field.key === "model") targetGroupId = modelGroup.id;
        else if (field.key === "generation") targetGroupId = genGroup.id;
        else if (field.key === "design") targetGroupId = designGroup.id;
        else if (field.key === "colour") targetGroupId = colourGroup.id;
        else if (field.key === "fabric") targetGroupId = fabricGroup.id;
      }

      const specField = await prisma.specField.upsert({
        where: { groupId_key: { groupId: group.id, key: field.key } },
        update: {
          name: field.name,
          kind: field.kind,
          valueType: field.valueType ?? null,
          unitSuffix: field.unitSuffix ?? null,
          refTarget: field.refTarget ?? null,
          targetGroupId,
          sortOrder: fieldOrder,
        },
        create: {
          factoryId: factory.id,
          groupId: group.id,
          name: field.name,
          key: field.key,
          kind: field.kind,
          valueType: field.valueType ?? null,
          unitSuffix: field.unitSuffix ?? null,
          refTarget: field.refTarget ?? null,
          targetGroupId,
          sortOrder: fieldOrder,
        },
      });

      for (const [optionOrder, option] of (field.options ?? []).entries()) {
        await prisma.specFieldOption.upsert({
          where: { fieldId_value: { fieldId: specField.id, value: option.label } },
          update: { label: option.label, shortCode: option.shortCode ?? null, sortOrder: optionOrder },
          create: {
            fieldId: specField.id,
            value: option.label,
            label: option.label,
            shortCode: option.shortCode ?? null,
            sortOrder: optionOrder,
          },
        });
      }
    }
  }

  // 9. Seed production chain departments
  const DEPARTMENTS = [
    { name: "CAD", sortOrder: 0, requirePhoto: false, requireRemarks: false, requiresApproval: false, isQcStage: false },
    { name: "Cutting", sortOrder: 1, requirePhoto: true, requireRemarks: false, requiresApproval: true, isQcStage: false },
    { name: "Stitching", sortOrder: 2, requirePhoto: true, requireRemarks: false, requiresApproval: true, isQcStage: false },
    { name: "Quality Check", sortOrder: 3, requirePhoto: false, requireRemarks: false, requiresApproval: false, isQcStage: true },
    { name: "Packing", sortOrder: 4, requirePhoto: true, requireRemarks: false, requiresApproval: false, isQcStage: false },
  ];
  const departments: Record<string, any> = {};
  for (const d of DEPARTMENTS) {
    departments[d.name] = await prisma.department.create({ data: { factoryId: factory.id, active: true, ...d } });
  }
  const orderedDepts = DEPARTMENTS.map((d) => departments[d.name]);
  const qcDept = departments["Quality Check"];

  // Link templates to departments via ownerDepartmentId
  await prisma.checklistTemplate.update({
    where: { id: cuttingTemplate.id },
    data: { ownerDepartmentId: departments["Cutting"].id }
  });
  await prisma.checklistTemplate.update({
    where: { id: qcTemplate.id },
    data: { ownerDepartmentId: departments["Quality Check"].id }
  });

  // 10. Seed Users
  //
  // Carxen is a demo *client*, so its owner is one of its own staff. The HQ
  // operator is a separate person in a separate organisation (PlotArmour) —
  // see scripts/setup-operator-org.ts. This seed used to create the operator
  // inside Carxen, which meant renaming them left the tenant without an owner.
  const staff: Array<[string, string, string, string | null]> = [
    ["Rohit Verma", "8800000001", "OWNER", null],
    ["Anil Sharma", "8800000005", "WORKER", "CAD"],
    ["Amit Kumar", "8800000002", "WORKER", "Cutting"],
    ["Salim Khan", "8800000003", "WORKER", "Stitching"],
    ["Vikas Yadav", "8800000006", "WORKER", "Packing"],
    ["Farhan Ali", "8800000007", "WORKER", "Quality Check"],
    ["Rajesh Gupta", "8800000004", "SUPERVISOR", "Quality Check"],
  ];
  const usersByPhone: Record<string, any> = {};
  for (const [name, phone, role, deptName] of staff) {
    usersByPhone[phone] = await prisma.user.create({
      data: {
        factoryId: factory.id, name, phone, role: role as any, roleId: roleIdByArchetype[role], language: "en",
        pinHash: hashPin("1234", factory.id),
        departmentId: deptName ? departments[deptName].id : null,
      },
    });
  }
  const cuttingWorker = usersByPhone["8800000002"];
  const stitchWorker = usersByPhone["8800000003"];
  const packWorker = usersByPhone["8800000006"];
  const inspector1 = usersByPhone["8800000004"];
  const workerFor = (deptName: string) =>
    ({ CAD: usersByPhone["8800000005"], Cutting: cuttingWorker, Stitching: stitchWorker, "Quality Check": inspector1, Packing: packWorker } as Record<string, any>)[deptName] ?? null;

  // 11. Seed generic catalog items
  async function makeItem(opts: {
    name: string; type: ItemType; uom: string; secondaryUOM?: string;
    groupId: string; minStock?: number; keywords?: string[];
  }) {
    const code = nextCode(opts.type);
    return prisma.itemMaster.create({
      data: {
        factoryId: factory.id, name: opts.name, itemCode: code, sku: code, itemType: opts.type,
        defaultUOM: opts.uom, secondaryUOM: opts.secondaryUOM ?? null,
        groupId: opts.groupId, status: "ACTIVE",
        minStockLevel: opts.minStock ?? 0, searchKeywords: opts.keywords ?? [],
      },
    });
  }

  // Find Fabric group (a subcategory of Raw Material)
  const fabricGroupItem = await prisma.itemGroup.findFirst({ where: { factoryId: factory.id, name: "Fabric" } });
  if (!fabricGroupItem) throw new Error("Fabric group not found");

  const fabricDefs: Array<[string, string]> = [["Shaka SPC", "Shaka"], ["Lifto SPC", "Lifto"], ["Heavy Napa", "Napa"]];
  const fabricItems: Record<string, any> = {};
  for (const [name, kw] of fabricDefs) {
    fabricItems[name] = await makeItem({ name, type: "RAW_MATERIAL", uom: "SQM", groupId: fabricGroupItem.id, minStock: 20, keywords: [kw] });
  }
  const fabricShaka = fabricItems["Shaka SPC"];

  // Find existing groups created during blueprint library seeding
  const foamGroup = await prisma.itemGroup.findFirst({ where: { factoryId: factory.id, parentId: rawMaterialRoot.id, name: "Foam" } });
  const threadGroup = await prisma.itemGroup.findFirst({ where: { factoryId: factory.id, parentId: rawMaterialRoot.id, name: "Thread" } });
  const elasticGroup = await prisma.itemGroup.findFirst({ where: { factoryId: factory.id, parentId: rawMaterialRoot.id, name: "Elastic" } });
  const velcroGroup = await prisma.itemGroup.findFirst({ where: { factoryId: factory.id, parentId: rawMaterialRoot.id, name: "Velcro" } });

  if (!foamGroup || !threadGroup || !elasticGroup || !velcroGroup) {
    throw new Error("One or more required blueprint groups not found");
  }

  // Create subcategories that are not in the blueprint list
  const zipperGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: rawMaterialRoot.id, name: "Zipper", itemType: "RAW_MATERIAL", shortCode: "ZIP", isSheet: true, sortOrder: 3 },
  });
  const labelsGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: rawMaterialRoot.id, name: "Labels", itemType: "RAW_MATERIAL", shortCode: "LBL", isSheet: true, sortOrder: 6 },
  });
  const plasticPartsGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: rawMaterialRoot.id, name: "Plastic Parts", itemType: "RAW_MATERIAL", shortCode: "PLP", isSheet: true, sortOrder: 7 },
  });

  const rawDefs: Array<{ name: string; group: any; uom: string; min?: number }> = [
    { name: "Napa Black PU Leather", group: fabricGroupItem, uom: "SQM", min: 30 },
    { name: "Napa Beige PU Leather", group: fabricGroupItem, uom: "SQM", min: 30 },
    { name: "6mm Bonding Foam", group: foamGroup, uom: "MTR", min: 20 },
    { name: "10mm Bonding Foam", group: foamGroup, uom: "MTR", min: 20 },
    { name: "Bonded Nylon Thread", group: threadGroup, uom: "ROLL", min: 15 },
    { name: "Easy-Break Airbag Thread", group: threadGroup, uom: "ROLL", min: 10 },
    { name: "YKK Zipper 8in", group: zipperGroup, uom: "PCS", min: 100 },
    { name: "Elastic Strap 25mm", group: elasticGroup, uom: "MTR", min: 50 },
    { name: "Velcro Hook 20mm", group: velcroGroup, uom: "MTR", min: 40 },
    { name: "Carxen Woven Label", group: labelsGroup, uom: "PCS", min: 200 },
    { name: "Plastic Retainer Hook", group: plasticPartsGroup, uom: "PCS", min: 200 },
  ];
  for (const r of rawDefs) {
    await makeItem({ name: r.name, type: "RAW_MATERIAL", uom: r.uom, groupId: r.group.id, minStock: r.min });
  }

  // Packaging + Consumables
  const boxGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: packagingRoot.id, name: "Boxes", itemType: "PACKAGING", shortCode: "BOX", isSheet: true, sortOrder: 0 },
  });
  const wrapGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: packagingRoot.id, name: "Wrap", itemType: "PACKAGING", shortCode: "WRP", isSheet: true, sortOrder: 1 },
  });
  const markingGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: consumableRoot.id, name: "Marking", itemType: "CONSUMABLE", shortCode: "MRK", isSheet: true, sortOrder: 0 },
  });
  const toolsGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: consumableRoot.id, name: "Tools", itemType: "CONSUMABLE", shortCode: "TLS", isSheet: true, sortOrder: 1 },
  });
  const sparesGroup = await prisma.itemGroup.create({
    data: { factoryId: factory.id, parentId: consumableRoot.id, name: "Spares", itemType: "CONSUMABLE", shortCode: "SPR", isSheet: true, sortOrder: 2 },
  });

  await makeItem({ name: "Carton Box (Seat Set)", type: "PACKAGING", uom: "PCS", groupId: boxGroup.id, minStock: 100 });
  await makeItem({ name: "Bubble Wrap Roll", type: "PACKAGING", uom: "ROLL", groupId: wrapGroup.id, minStock: 20 });
  await makeItem({ name: "Fabric Marking Chalk", type: "CONSUMABLE", uom: "BOX", groupId: markingGroup.id, minStock: 10 });
  await makeItem({ name: "Industrial Scissors", type: "RAW_MATERIAL", uom: "PCS", groupId: toolsGroup.id, minStock: 2 });
  await makeItem({ name: "Sewing Machine Needle Pack", type: "RAW_MATERIAL", uom: "PKT", groupId: sparesGroup.id, minStock: 20 });

  // Finished Goods Item
  const seatCoverGroup = await prisma.itemGroup.findFirst({ where: { factoryId: factory.id, name: "Seat Cover" } });
  if (!seatCoverGroup) throw new Error("Seat Cover group not found");
  const fgItem = await makeItem({ name: "Premium Seat Cover - Standard", type: "FINISHED_PRODUCT", uom: "SET", groupId: seatCoverGroup.id });
  await prisma.itemMaster.update({
    where: { id: fgItem.id },
    data: { manufacturingType: "MAKE", specHash: "carxen-trial-fg-spec-hash" }
  });

  // 12. Seed UOMConversions for Dual Units
  // thread conversion: 1 roll = 500 m
  const nylonThread = await prisma.itemMaster.findFirst({ where: { factoryId: factory.id, name: "Bonded Nylon Thread" } });
  if (nylonThread) {
    await prisma.itemMaster.update({
      where: { id: nylonThread.id },
      data: { secondaryUOM: "MTR" },
    });
    await prisma.uOMConversion.create({
      data: { itemId: nylonThread.id, fromUOM: "ROLL", toUOM: "MTR", conversionFactor: 500 },
    });
  }

  // 13. Blueprint keyed directly on the finished-good item.
  const blueprint = await prisma.blueprint.create({ data: { factoryId: factory.id, itemId: fgItem.id } });
  const bpVersion = await prisma.blueprintVersion.create({ data: { blueprintId: blueprint.id, versionNumber: 1, name: "V1 - Standard", qcTemplateId: qcTemplate.id, isActive: true } });
  await prisma.blueprint.update({ where: { id: blueprint.id }, data: { activeVersionId: bpVersion.id } });

  // Create blueprint route steps
  const sortedDepts = [departments["CAD"], departments["Cutting"], departments["Stitching"], departments["Quality Check"], departments["Packing"]];
  for (let i = 0; i < sortedDepts.length; i++) {
    await prisma.blueprintRouteStep.create({
      data: {
        blueprintVersionId: bpVersion.id,
        departmentId: sortedDepts[i].id,
        sequence: i + 1,
        estimatedTimeMins: 15,
        instructions: `Instructions for stage ${sortedDepts[i].name}`
      }
    });
  }

  const bom = await prisma.bOM.create({ data: { factoryId: factory.id, blueprintVersionId: bpVersion.id } });
  await prisma.bOMItem.create({ data: { bomId: bom.id, itemId: fabricShaka.id, quantity: 2, wastePercent: 5 } });

  // 14. Seed Customers, Warehouse, Zones
  const customerNames: Array<[string, string]> = [
    ["Honda Dealership Delhi", "9810000001"],
    ["AutoStyle Karol Bagh", "9810000002"],
    ["Sharma Car Accessories", "9810000003"],
  ];
  const customers: any[] = [];
  for (const [name, phone] of customerNames) {
    customers.push(await prisma.customer.create({ data: { factoryId: factory.id, name, phone } }));
  }

  const mainWarehouse = await prisma.warehouse.create({ data: { factoryId: factory.id, name: "Main Warehouse", kind: "WAREHOUSE" } });
  const cityStore = await prisma.warehouse.create({ data: { factoryId: factory.id, name: "City Store", kind: "STORE" } });
  const zone = await prisma.warehouseZone.create({ data: { factoryId: factory.id, warehouseId: mainWarehouse.id, name: "Default" } });
  const rack = await prisma.warehouseRack.create({ data: { factoryId: factory.id, zoneId: zone.id, name: "Default" } });
  const shelf = await prisma.warehouseShelf.create({ data: { factoryId: factory.id, rackId: rack.id, name: "Default" } });
  const bin = await prisma.warehouseBin.create({ data: { factoryId: factory.id, shelfId: shelf.id, name: "Default" } });

  // Opening stock
  const rawStockItems = await prisma.itemMaster.findMany({ where: { factoryId: factory.id, itemType: { in: ["RAW_MATERIAL", "PACKAGING", "CONSUMABLE"] } } });
  for (const item of rawStockItems) {
    await prisma.binBalance.create({ data: { factoryId: factory.id, itemId: item.id, binId: bin.id, stockAvailable: 120 } });
    await prisma.stockLedgerEntry.create({ data: { factoryId: factory.id, transactionType: "RECEIPT", itemId: item.id, binId: bin.id, quantityChange: 120, valuationRate: 250, totalValue: 30000, referenceDocType: "OPENING_STOCK" } });
  }

  const supplier = await prisma.supplier.create({ data: { factoryId: factory.id, name: "Fabric House Ludhiana", phone: "9815000000", leadTimeDays: 5 } });
  await prisma.purchaseOrder.create({
    data: { factoryId: factory.id, poNumber: "PO-TRIAL-001", supplierId: supplier.id, status: "SUBMITTED", items: { create: [{ materialId: fabricShaka.id, quantity: 50, rate: 260 }] } },
  });
  await prisma.purchaseOrder.create({
    data: { factoryId: factory.id, poNumber: "PO-TRIAL-000", supplierId: supplier.id, status: "COMPLETED", items: { create: [{ materialId: fabricShaka.id, quantity: 100, rate: 250, receivedQty: 100 }] } },
  });

  // 15. Seed mock orders
  type Progress = "cutting" | "stitching" | "qc" | "packing" | "dispatched" | "delivered";
  const REACHED: Record<Progress, number> = { cutting: 1, stitching: 2, qc: 3, packing: 4, dispatched: 5, delivered: 5 };

  async function mockOrder(opts: { soNumber: string; customerIdx: number; qty: number; progress: Progress; dispatchTo?: "STORE" | "CUSTOMER" }) {
    const reached = REACHED[opts.progress];
    const finished = reached >= 5;
    const so = await prisma.salesOrder.create({
      data: {
        factoryId: factory.id, soNumber: opts.soNumber, customerId: customers[opts.customerIdx].id,
        status: opts.progress === "dispatched" ? "DISPATCHED" : opts.progress === "delivered" ? "DISPATCHED" : "IN_PRODUCTION",
        labelCode: opts.soNumber,
        designId: designVertex.id, colorId: colourBlack.id, materialId: fabricShaka.id,
        inspectorId: inspector1.id,
        seatType: "Double Back", headrestCount: 4, hasArmrest: true,
        itemId: fgItem.id,
        items: { create: [{ itemId: fgItem.id, quantity: opts.qty, unitPrice: 0 }] },
      },
    });
    const plan = await prisma.productionPlan.create({
      data: { factoryId: factory.id, salesOrderId: so.id, blueprintVersionId: bpVersion.id, quantity: opts.qty, status: finished ? "COMPLETED" : "RELEASED" },
    });
    const wo = await prisma.workOrder.create({
      data: { factoryId: factory.id, woNumber: opts.soNumber, productionPlanId: plan.id, status: finished ? "COMPLETED" : "IN_PROGRESS", targetQty: opts.qty, producedQty: finished ? opts.qty : 0, startDate: new Date() },
    });

    let qcCard: any = null;
    for (let i = 0; i < orderedDepts.length; i++) {
      const dept = orderedDepts[i];
      let status: string;
      if (finished || i < reached) status = "COMPLETED";
      else if (i === reached) status = dept.isQcStage ? "QC_PENDING" : "IN_PROGRESS";
      else status = "BLOCKED";
      const card = await prisma.jobCard.create({
        data: {
          factoryId: factory.id, workOrderId: wo.id, departmentId: dept.id, sequence: i + 1,
          status, assignedToId: workerFor(dept.name)?.id ?? null, targetQty: opts.qty,
          completedQty: status === "COMPLETED" ? opts.qty : 0,
          startedAt: status === "COMPLETED" || status === "IN_PROGRESS" ? new Date() : null,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
      });
      if (dept.isQcStage) qcCard = card;
    }

    const pastQc = finished || reached > 3;
    const inspStatus = reached < 3 ? "PENDING" : reached === 3 ? "WAITING_QC" : "APPROVED";
    const inspection = await prisma.inspection.create({
      data: {
        factoryId: factory.id, jobCardId: qcCard.id, status: inspStatus as any,
        startedAt: reached >= 3 ? new Date() : null,
        submittedAt: reached >= 3 ? new Date() : null,
        approvedAt: pastQc ? new Date() : null,
      },
    });
    const checkpoints = await prisma.checkpoint.findMany({ where: { section: { templateId: qcTemplate.id } } });
    for (const cp of checkpoints) {
      await prisma.checkpointSubmission.create({
        data: {
          factoryId: factory.id, inspectionId: inspection.id, checkpointId: cp.id,
          passFail: reached >= 3 ? "PASS" : null,
          completedAt: reached >= 3 ? new Date() : null,
          verificationStatus: pastQc ? "APPROVED" : null,
          verifiedAt: pastQc ? new Date() : null,
        },
      });
    }
    if (pastQc) {
      await prisma.qualityApproval.create({ data: { factoryId: factory.id, inspectionId: inspection.id, inspectorId: inspector1.id, status: "APPROVED", comments: "Approved" } });
      await prisma.qualityReport.create({ data: { factoryId: factory.id, inspectionId: inspection.id, verificationCode: "V-" + opts.soNumber.replace(/[^A-Z0-9]/g, "").slice(-8) } });
      await prisma.binBalance.upsert({
        where: { itemId_binId: { itemId: fgItem.id, binId: bin.id } },
        update: { stockAvailable: { increment: opts.qty } },
        create: { factoryId: factory.id, itemId: fgItem.id, binId: bin.id, stockAvailable: opts.qty },
      });
      await prisma.stockLedgerEntry.create({ data: { factoryId: factory.id, transactionType: "RECEIPT", itemId: fgItem.id, binId: bin.id, quantityChange: opts.qty, valuationRate: 1200, totalValue: 1200 * opts.qty, referenceDocType: "ProductionReceipt", referenceDocId: wo.id } });
    }

    if (opts.progress === "dispatched" || opts.progress === "delivered") {
      const isCustomer = opts.dispatchTo === "CUSTOMER";
      await prisma.dispatch.create({
        data: {
          factoryId: factory.id, salesOrderId: so.id,
          destinationType: isCustomer ? "CUSTOMER" : "STORE",
          destinationWarehouseId: isCustomer ? null : cityStore.id,
          customerName: isCustomer ? customers[opts.customerIdx].name : null,
          customerPhone: isCustomer ? customers[opts.customerIdx].phone : null,
          address: isCustomer ? "42 MG Road, New Delhi" : null,
          transporter: "BlueDart Cargo", vehicleNo: "DL-01-AB-4321",
          status: opts.progress === "delivered" ? "DELIVERED" : "IN_TRANSIT",
          deliveredAt: opts.progress === "delivered" ? new Date() : null,
        },
      });
    }
  }

  await mockOrder({ soNumber: "ORD-TRIAL01", customerIdx: 0, qty: 2, progress: "cutting" });
  await mockOrder({ soNumber: "ORD-TRIAL02", customerIdx: 1, qty: 1, progress: "stitching" });
  await mockOrder({ soNumber: "ORD-TRIAL03", customerIdx: 2, qty: 3, progress: "qc" });
  await mockOrder({ soNumber: "ORD-TRIAL04", customerIdx: 0, qty: 1, progress: "packing" });
  await mockOrder({ soNumber: "ORD-TRIAL05", customerIdx: 1, qty: 2, progress: "dispatched", dispatchTo: "STORE" });
  await mockOrder({ soNumber: "ORD-TRIAL06", customerIdx: 2, qty: 1, progress: "delivered", dispatchTo: "CUSTOMER" });

  console.log("Seed complete: departments, item master, catalog, and demo orders across the chain.");

  // ── 16. Seed Kent's Kitchen Restaurant OS ───────────────────────────────────
  console.log("Seeding Kent's Kitchen restaurant workspace...");

  const kentsOrgId = "org_kents";
  const kentsFacId = "fac_kents";

  await prisma.organization.upsert({
    where: { id: kentsOrgId },
    update: {},
    create: { id: kentsOrgId, name: "Kent's", slug: "kents" },
  });

  const kentsFactory = await prisma.factory.upsert({
    where: { slug: "kents" },
    update: {},
    create: { id: kentsFacId, organizationId: kentsOrgId, name: "Kent's Kitchen", slug: "kents", logoUrl: null },
  });

  const restaurantModules = [
    "core", "hr", "menu", "tables_orders", "kitchen", "serving", "billing"
  ];
  await prisma.moduleEntitlement.createMany({
    data: restaurantModules.map((moduleKey) => ({ organizationId: kentsOrgId, moduleKey, enabled: true })),
    skipDuplicates: true,
  });

  // Seed roles for Kent's organization
  const kentsRoleIdByArchetype: Record<string, string> = {};
  for (const [archetype, grants] of Object.entries(SEED_GRANTS)) {
    const id = `role_${kentsOrgId}_${archetype}`;
    await prisma.role.upsert({
      where: { id },
      update: {},
      create: {
        id,
        organizationId: kentsOrgId,
        name: ROLE_LABELS[archetype],
        description: "Built-in role. Rename or copy it; it cannot be deleted.",
        systemRole: archetype as any,
        isSystem: true,
        permissions: { create: grants.map((key) => ({ key })) },
      },
    });

    await prisma.rolePermission.createMany({
      data: grants.map((key) => ({ roleId: id, key })),
      skipDuplicates: true,
    });

    kentsRoleIdByArchetype[archetype] = id;
  }

  // Seed restaurant staff
  const kentsStaff: Array<[string, string, string]> = [
    ["Kent", "9900000001", "OWNER"],
    ["Sarah Manager", "9900000002", "MANAGER"],
    ["Vikas Chef", "9900000003", "SUPERVISOR"],
    ["Ravi Server", "9900000004", "WORKER"],
  ];
  for (const [name, phone, role] of kentsStaff) {
    await prisma.user.create({
      data: {
        factoryId: kentsFacId,
        name,
        phone,
        role: role as any,
        roleId: kentsRoleIdByArchetype[role],
        language: "en",
        pinHash: hashPin("1234", kentsFacId),
      },
    });
  }

  // Seed tables
  const tableNumbers = ["Table 1", "Table 2", "Table 3", "Table 4"];
  const tableCapacities = [2, 4, 4, 6];
  const tableStates = ["BILLING", "OCCUPIED", "OCCUPIED", "AVAILABLE"];
  const kentsTables: Record<string, any> = {};

  for (let i = 0; i < tableNumbers.length; i++) {
    kentsTables[tableNumbers[i]] = await prisma.restaurantTable.create({
      data: {
        factoryId: kentsFacId,
        number: tableNumbers[i],
        capacity: tableCapacities[i],
        state: tableStates[i] as any,
      },
    });
  }

  // Seed menu categories
  const categories = ["Beverages", "Starters", "Mains", "Desserts"];
  const kentsCategories: Record<string, any> = {};
  for (let i = 0; i < categories.length; i++) {
    kentsCategories[categories[i]] = await prisma.menuCategory.create({
      data: {
        factoryId: kentsFacId,
        name: categories[i],
        sortOrder: i,
      },
    });
  }

  // Seed menu items
  const menuItemsList = [
    { name: "Masala Chai", category: "Beverages", price: 4000 },
    { name: "Filter Coffee", category: "Beverages", price: 5000 },
    { name: "Mango Lassi", category: "Beverages", price: 12000 },
    { name: "Paneer Tikka", category: "Starters", price: 25000 },
    { name: "Hara Bhara Kabab", category: "Starters", price: 22000 },
    { name: "Paneer Butter Masala", category: "Mains", price: 32000 },
    { name: "Dal Makhani", category: "Mains", price: 28000 },
    { name: "Butter Naan", category: "Mains", price: 6000 },
    { name: "Gulab Jamun", category: "Desserts", price: 9000 },
    { name: "Kulfi", category: "Desserts", price: 10000 },
  ];
  const kentsMenuItems: Record<string, any> = {};
  for (const item of menuItemsList) {
    kentsMenuItems[item.name] = await prisma.menuItem.create({
      data: {
        factoryId: kentsFacId,
        name: item.name,
        price: item.price,
        categoryId: kentsCategories[item.category].id,
        available: true,
      },
    });
  }

  // Seed live orders
  const now = new Date();
  
  // 1. Table 2 - OCCUPIED - Preparing order
  await prisma.diningOrder.create({
    data: {
      factoryId: kentsFacId,
      tableId: kentsTables["Table 2"].id,
      state: "PREPARING",
      createdAt: now,
      updatedAt: now,
      items: {
        create: [
          { menuItemId: kentsMenuItems["Paneer Tikka"].id, quantity: 1, unitPrice: 25000 },
          { menuItemId: kentsMenuItems["Mango Lassi"].id, quantity: 1, unitPrice: 12000 },
          { menuItemId: kentsMenuItems["Paneer Butter Masala"].id, quantity: 1, unitPrice: 32000 },
          { menuItemId: kentsMenuItems["Butter Naan"].id, quantity: 2, unitPrice: 6000 },
        ],
      },
    },
  });

  // 2. Table 3 - OCCUPIED - Ready to serve order
  await prisma.diningOrder.create({
    data: {
      factoryId: kentsFacId,
      tableId: kentsTables["Table 3"].id,
      state: "READY",
      createdAt: new Date(now.getTime() - 20 * 60000), // 20 mins ago
      updatedAt: now,
      items: {
        create: [
          { menuItemId: kentsMenuItems["Filter Coffee"].id, quantity: 2, unitPrice: 5000 },
          { menuItemId: kentsMenuItems["Hara Bhara Kabab"].id, quantity: 1, unitPrice: 22000 },
        ],
      },
    },
  });

  // 3. Table 1 - BILLED - Billed but unpaid
  const orderT1 = await prisma.diningOrder.create({
    data: {
      factoryId: kentsFacId,
      tableId: kentsTables["Table 1"].id,
      state: "BILLED",
      createdAt: new Date(now.getTime() - 40 * 60000), // 40 mins ago
      updatedAt: now,
      items: {
        create: [
          { menuItemId: kentsMenuItems["Masala Chai"].id, quantity: 2, unitPrice: 4000 },
          { menuItemId: kentsMenuItems["Gulab Jamun"].id, quantity: 1, unitPrice: 9000 },
        ],
      },
    },
  });

  await prisma.diningBill.create({
    data: {
      factoryId: kentsFacId,
      orderId: orderT1.id,
      subtotal: 17000,
      total: 17000,
      paymentMethod: null,
      paidAt: null,
    },
  });

  // 4. Settled historical orders/bills for today to populate Takings
  const methods = ["UPI", "CASH", "CARD", "UPI", "CASH"] as const;
  const historicItems = [
    [
      { name: "Paneer Butter Masala", qty: 1, rate: 32000 },
      { name: "Butter Naan", qty: 2, rate: 6000 },
    ],
    [
      { name: "Dal Makhani", qty: 1, rate: 28000 },
      { name: "Butter Naan", qty: 1, rate: 6000 },
    ],
    [
      { name: "Mango Lassi", qty: 2, rate: 12000 },
      { name: "Hara Bhara Kabab", qty: 1, rate: 22000 },
    ],
    [
      { name: "Filter Coffee", qty: 2, rate: 5000 },
      { name: "Kulfi", qty: 1, rate: 10000 },
    ],
    [
      { name: "Gulab Jamun", qty: 2, rate: 9000 },
      { name: "Masala Chai", qty: 1, rate: 4000 },
    ],
  ];

  for (let i = 0; i < 5; i++) {
    const total = historicItems[i].reduce((sum, item) => sum + item.qty * item.rate, 0);
    const order = await prisma.diningOrder.create({
      data: {
        factoryId: kentsFacId,
        tableId: kentsTables["Table 4"].id,
        state: "SERVED",
        createdAt: new Date(now.getTime() - (2 + i) * 3600000), // 2-6 hours ago
        updatedAt: now,
        items: {
          create: historicItems[i].map((it) => ({
            menuItemId: kentsMenuItems[it.name].id,
            quantity: it.qty,
            unitPrice: it.rate,
          })),
        },
      },
    });

    await prisma.diningBill.create({
      data: {
        factoryId: kentsFacId,
        orderId: order.id,
        subtotal: total,
        total,
        paymentMethod: methods[i],
        paidAt: new Date(now.getTime() - (2 + i) * 3600000 + 15 * 60000), // 15 mins after order
      },
    });
  }

  console.log("Kent's Kitchen restaurant workspace seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
