import { PrismaClient, ItemType } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

// PINs are factory-salted and environment-independent (must match
// src/lib/server/hash.ts hashPin)
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

async function main() {
  console.log("Seeding Carxen client-trial workspace...");

  const factoryId = "fac_demo";
  const organizationId = "org_demo";

  // The seed cannot import @/platform/tenancy/provision (it is server-only and
  // runs outside Next), so the same provisioning shape is inlined here. Keep
  // the two in step: an Org, a Factory inside it, seeded system Roles with
  // grants, and module entitlements.
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

  // Carxen runs the automotive vertical on top of the horizontal defaults.
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
      "product_type.manage", "sales_order.view", "sales_order.create",
      "sales_order.delete", "sales_order.approve", "customer.manage",
      "vehicle_catalog.manage", "fitment.manage",
    ],
    CO_OWNER: [
      "dashboard.view", "settings.access", "master_data.access", "team.manage",
      "reports.view", "reports.export", "sales_order.view", "sales_order.create",
    ],
    MANAGER: [
      "dashboard.view", "master_data.access", "team.manage", "reports.view",
      "sales_order.view", "sales_order.create",
    ],
    SUPERVISOR: ["dashboard.view", "reports.view", "quality.queue", "quality.inspect", "production.supervise"],
    WORKER: ["production.jobs"],
    STORE_MANAGER: ["dashboard.view", "sales_order.view", "sales_order.create"],
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
        systemRole: archetype as never,
        isSystem: true,
        permissions: { create: grants.map((key) => ({ key })) },
      },
    });
    roleIdByArchetype[archetype] = id;
  }

  // ==========================================
  // QC TEMPLATE (attached to the QC department)
  // ==========================================
  const template = await prisma.qCTemplate.create({
    data: {
      factoryId: factory.id,
      name: "Car Seat Cover Quality Checks",
      version: "1.0",
      isLatest: true,
      status: "active",
    },
  });
  const qcSection = await prisma.templateSection.create({
    data: { factoryId: factory.id, templateId: template.id, title: "Standard Stitching & Visual Inspections", sortOrder: 1 },
  });
  const qcCheckpoints = [
    { name: "Stitch Alignment", instructions: "Ensure stitch spacing is consistent at 4mm and borders are aligned." },
    { name: "Material Tension & Sagging", instructions: "Check for any loose material, air pockets, or fabric wrinkles." },
    { name: "Strap & Buckle Security", instructions: "Test tension of plastic hooks and elastic straps." },
    { name: "Side Airbag Seam Check", instructions: "Verify special easy-break thread is used for side-airbag seams." },
  ];
  for (let i = 0; i < qcCheckpoints.length; i++) {
    await prisma.checkpoint.create({
      data: {
        factoryId: factory.id, sectionId: qcSection.id,
        name: qcCheckpoints[i].name, instructions: qcCheckpoints[i].instructions,
        requireImage: true, requireRemarks: i === 0, sortOrder: i + 1,
      },
    });
  }

  // A lightweight stage checklist template for the Cutting department, so the
  // trial shows that every department — not just QC — can carry a template.
  const cuttingTemplate = await prisma.qCTemplate.create({
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

  // ==========================================
  // DEPARTMENTS (the production chain)
  // ==========================================
  const DEPARTMENTS = [
    { name: "CAD", sortOrder: 0, requirePhoto: false, requireRemarks: false, requiresApproval: false, isQcStage: false, templateId: null as string | null },
    { name: "Cutting", sortOrder: 1, requirePhoto: true, requireRemarks: false, requiresApproval: true, isQcStage: false, templateId: cuttingTemplate.id },
    { name: "Stitching", sortOrder: 2, requirePhoto: true, requireRemarks: false, requiresApproval: true, isQcStage: false, templateId: null },
    { name: "Quality Check", sortOrder: 3, requirePhoto: false, requireRemarks: false, requiresApproval: false, isQcStage: true, templateId: template.id },
    { name: "Packing", sortOrder: 4, requirePhoto: true, requireRemarks: false, requiresApproval: false, isQcStage: false, templateId: null },
  ];
  const departments: Record<string, any> = {};
  for (const d of DEPARTMENTS) {
    departments[d.name] = await prisma.department.create({ data: { factoryId: factory.id, active: true, ...d } });
  }
  const orderedDepts = DEPARTMENTS.map((d) => departments[d.name]);
  const qcDept = departments["Quality Check"];

  // ==========================================
  // USERS (owner + department roster)
  // ==========================================
  await prisma.user.upsert({
    where: { phone: "9971907190" },
    update: { pinHash: hashPin("5782", factory.id), name: "Yashu Malik", role: "OWNER", roleId: roleIdByArchetype.OWNER, isActive: true },
    create: { factoryId: factory.id, role: "OWNER", roleId: roleIdByArchetype.OWNER, name: "Yashu Malik", language: "en", phone: "9971907190", pinHash: hashPin("5782", factory.id) },
  });

  // [name, phone, role, departmentName] — PIN 1234 for everyone. The QC
  // department's supervisor is the QC inspector — there is no separate role.
  const staff: Array<[string, string, string, string | null]> = [
    ["Rohit Verma", "8800000001", "MANAGER", null],
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
        factoryId: factory.id, name, phone, role: role as any, language: "en",
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

  // ==========================================
  // CATEGORY TREE (Item Master masters)
  // ==========================================
  const CATEGORY_TREE: Record<string, string[]> = {
    "Raw Material": ["PU Leather", "PVC Leather", "Fabric", "Foam", "Thread", "Elastic", "Velcro", "Zipper", "Piping", "Labels", "Plastic Parts", "Metal Parts", "Rubber Parts"],
    "Finished Goods": [], "Semi Finished": [], "Packaging": [], "Consumables": [], "Machinery": [], "Spare Parts": [],
  };
  const categories: Record<string, any> = {};
  const subcats: Record<string, any> = {};
  for (const [catName, subs] of Object.entries(CATEGORY_TREE)) {
    const cat = await prisma.materialCategory.create({ data: { factoryId: factory.id, name: catName } });
    categories[catName] = cat;
    for (const s of subs) {
      subcats[`${catName}:${s}`] = await prisma.materialSubcategory.create({ data: { factoryId: factory.id, categoryId: cat.id, name: s } });
    }
  }
  // Fabrics keep their own top-level category (the app tells fabrics apart by it).
  const fabricCat = await prisma.materialCategory.create({ data: { factoryId: factory.id, name: "Fabric" } });

  // ==========================================
  // ITEM MASTER (single catalogue)
  // ==========================================
  async function makeItem(opts: {
    name: string; type: ItemType; uom: string; secondaryUOM?: string;
    categoryId?: string; subcategoryId?: string; brand?: string; minStock?: number; keywords?: string[];
  }) {
    const code = nextCode(opts.type);
    return prisma.itemMaster.create({
      data: {
        factoryId: factory.id, name: opts.name, itemCode: code, sku: code, itemType: opts.type,
        defaultUOM: opts.uom, secondaryUOM: opts.secondaryUOM ?? null,
        categoryId: opts.categoryId ?? null, subcategoryId: opts.subcategoryId ?? null,
        brand: opts.brand ?? null, status: "ACTIVE",
        minStockLevel: opts.minStock ?? 0, searchKeywords: opts.keywords ?? [],
      },
    });
  }

  // Fabrics (used in variant search + BOM)
  const fabricDefs: Array<[string, string]> = [["Shaka SPC", "Shaka"], ["Lifto SPC", "Lifto"], ["Heavy Napa", "Napa"]];
  const fabricItems: Record<string, any> = {};
  for (const [name, kw] of fabricDefs) {
    fabricItems[name] = await makeItem({ name, type: "RAW_MATERIAL", uom: "SQM", categoryId: fabricCat.id, minStock: 20, keywords: [kw] });
  }
  const fabricShaka = fabricItems["Shaka SPC"];

  // Other raw materials, filed under Raw Material subcategories
  const rawDefs: Array<{ name: string; sub: string; uom: string; min?: number }> = [
    { name: "Napa Black PU Leather", sub: "PU Leather", uom: "SQM", min: 30 },
    { name: "Napa Beige PU Leather", sub: "PU Leather", uom: "SQM", min: 30 },
    { name: "6mm Bonding Foam", sub: "Foam", uom: "MTR", min: 20 },
    { name: "10mm Bonding Foam", sub: "Foam", uom: "MTR", min: 20 },
    { name: "Bonded Nylon Thread", sub: "Thread", uom: "ROLL", min: 15 },
    { name: "Easy-Break Airbag Thread", sub: "Thread", uom: "ROLL", min: 10 },
    { name: "YKK Zipper 8in", sub: "Zipper", uom: "PCS", min: 100 },
    { name: "Elastic Strap 25mm", sub: "Elastic", uom: "MTR", min: 50 },
    { name: "Velcro Hook 20mm", sub: "Velcro", uom: "MTR", min: 40 },
    { name: "Carxen Woven Label", sub: "Labels", uom: "PCS", min: 200 },
    { name: "Plastic Retainer Hook", sub: "Plastic Parts", uom: "PCS", min: 200 },
  ];
  for (const r of rawDefs) {
    await makeItem({ name: r.name, type: "RAW_MATERIAL", uom: r.uom, categoryId: categories["Raw Material"].id, subcategoryId: subcats[`Raw Material:${r.sub}`].id, minStock: r.min });
  }

  // Packaging + a couple of consumables / tools so those types are represented
  await makeItem({ name: "Carton Box (Seat Set)", type: "PACKAGING", uom: "PCS", categoryId: categories["Packaging"].id, minStock: 100 });
  await makeItem({ name: "Bubble Wrap Roll", type: "PACKAGING", uom: "ROLL", categoryId: categories["Packaging"].id, minStock: 20 });
  await makeItem({ name: "Fabric Marking Chalk", type: "CONSUMABLE", uom: "BOX", categoryId: categories["Consumables"].id, minStock: 10 });
  await makeItem({ name: "Industrial Scissors", type: "TOOL", uom: "PCS", categoryId: categories["Spare Parts"].id, minStock: 2 });
  await makeItem({ name: "Sewing Machine Needle Pack", type: "SPARE_PART", uom: "PKT", categoryId: categories["Spare Parts"].id, minStock: 20 });

  // Finished good
  const fgItem = await makeItem({ name: "Premium Seat Cover - Standard", type: "FINISHED_PRODUCT", uom: "SET", categoryId: categories["Finished Goods"].id });

  // ==========================================
  // CATALOG: designs, colors, vehicles, product type
  // ==========================================
  const designNames: Array<[string, string]> = [
    ["ULTRA", "Triple Seam"], ["ULTRA", "New N Type"], ["ULTRA", "Super Capt"], ["ULTRA", "Arrow"],
    ["ULTRA", "Winger"], ["ULTRA", "Rocker"], ["ULTRA", "Original"], ["ULTRA", "Head Atelier"],
    ["ULTRA", "5 Lines"], ["ULTRA", "Prism"],
    ["ERGO FIT", "Vertex"], ["ERGO FIT", "Archer"], ["ERGO FIT", "Spykar"], ["ERGO FIT", "Hilfiger"],
    ["PRO SERIES", "Lancer"], ["PRO SERIES", "Super Lancer"], ["PRO SERIES", "Lexa Plus"],
    ["PRO SERIES", "7 Lines"], ["PRO SERIES", "New N-Type"],
    ["PRO (+)", "Radiator"], ["PRO (+)", "N Radiator"],
    ["QUILTS", "Zig Zag"], ["QUILTS", "Wavy Quilt"], ["QUILTS", "Snake"], ["QUILTS", "Qubec"],
    ["QUILTS", "Diamond"], ["QUILTS", "Eagle"], ["QUILTS", "Chain Type"], ["QUILTS", "Recti Quilt"],
    ["QUILTS", "Gt-Line"],
    ["SUPER QUILTS", "Edition"], ["SUPER QUILTS", "Wire quilt"], ["SUPER QUILTS", "Football"],
    ["SUPER QUILTS", "S-Taper"], ["SUPER QUILTS", "Capsule Cut"],
  ];
  for (const [category, name] of designNames) {
    await prisma.design.create({ data: { factoryId: factory.id, category, name } });
  }
  const designTriple = await prisma.design.findFirst({ where: { factoryId: factory.id, name: "Triple Seam" } });

  for (const name of ["Black", "Beige", "Tan", "Grey", "Red", "White"]) {
    await prisma.color.create({ data: { factoryId: factory.id, name } });
  }
  const colorBlack = await prisma.color.findFirst({ where: { factoryId: factory.id, name: "Black" } });

  const vehicleData: Array<[string, Array<[string, string]>]> = [
    ["Maruti Suzuki", [["Baleno", "2015-2019"], ["Swift", "2018-2023"], ["Brezza", "2016-2022"]]],
    ["Hyundai", [["Creta", "2015-2020"], ["i20", "2020-2024"]]],
    ["Honda", [["City", "2017-2023"], ["Amaze", "2018-2024"]]],
    ["Tata", [["Nexon", "2017-2023"], ["Punch", "2021-2025"]]],
  ];
  for (const [brandName, models] of vehicleData) {
    const brand = await prisma.vehicleBrand.create({ data: { factoryId: factory.id, name: brandName } });
    for (const [modelName, genRange] of models) {
      const model = await prisma.vehicleModel.create({ data: { factoryId: factory.id, brandId: brand.id, name: modelName } });
      await prisma.vehicleGeneration.create({ data: { factoryId: factory.id, modelId: model.id, name: genRange } });
    }
  }

  const seatCoverType = await prisma.productType.create({
    data: {
      factoryId: factory.id, name: "Seat Cover",
      fields: {
        create: [
          { name: "Seat Type", type: "TOGGLE", options: ["Single Back", "Double Back"], isRequired: true, sortOrder: 1 },
          { name: "Headrest Count", type: "BUTTONS", options: ["2", "4", "5", "6", "7", "8"], sortOrder: 2 },
          { name: "Armrest", type: "CHECKBOX", options: ["Yes", "No"], sortOrder: 3 },
        ],
      },
    },
  });
  const seatTypeField = await prisma.productField.findFirst({ where: { name: "Seat Type", productTypeId: seatCoverType.id } });

  // ==========================================
  // PRODUCT + VARIANT + BLUEPRINT + BOM
  // ==========================================
  const productCategory = await prisma.productCategory.create({ data: { factoryId: factory.id, name: "Seat Covers" } });
  const product = await prisma.product.create({ data: { factoryId: factory.id, categoryId: productCategory.id, name: "Premium Seat Cover", skuPrefix: "SC-PRM" } });
  const variant = await prisma.productVariant.create({ data: { productId: product.id, name: "Standard", sku: "SC-PRM-STD", itemId: fgItem.id } });

  const blueprint = await prisma.blueprint.create({ data: { factoryId: factory.id, productVariantId: variant.id } });
  const bpVersion = await prisma.blueprintVersion.create({ data: { blueprintId: blueprint.id, versionNumber: 1, name: "V1 - Standard", qcTemplateId: template.id, isActive: true } });
  await prisma.blueprint.update({ where: { id: blueprint.id }, data: { activeVersionId: bpVersion.id } });
  const bom = await prisma.bOM.create({ data: { factoryId: factory.id, blueprintVersionId: bpVersion.id } });
  await prisma.bOMItem.create({ data: { bomId: bom.id, itemId: fabricShaka.id, quantity: 2, wastePercent: 5 } });

  // ==========================================
  // CUSTOMERS, SUPPLIERS, WAREHOUSE, OPENING STOCK
  // ==========================================
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

  // Opening stock for every raw material (incl. fabrics)
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

  // ==========================================
  // DEMO ORDERS flowing through the department chain
  // ==========================================
  // reached = index of the department the physical bag currently sits at.
  //   0..4 = at CAD/Cutting/Stitching/QC/Packing; 5 = fully produced.
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
        designId: designTriple?.id ?? null, colorId: colorBlack?.id ?? null, materialId: fabricShaka.id,
        productTypeId: seatCoverType.id, inspectorId: inspector1.id,
        seatType: "Double Back", headrestCount: 4, hasArmrest: true,
        dynamicData: seatTypeField ? { [seatTypeField.id]: "Double Back" } : undefined,
        items: { create: [{ productVariantId: variant.id, quantity: opts.qty, unitPrice: 0 }] },
      },
    });
    const plan = await prisma.productionPlan.create({
      data: { factoryId: factory.id, salesOrderId: so.id, blueprintVersionId: bpVersion.id, quantity: opts.qty, status: finished ? "COMPLETED" : "RELEASED" },
    });
    const wo = await prisma.workOrder.create({
      data: { factoryId: factory.id, woNumber: opts.soNumber, productionPlanId: plan.id, status: finished ? "COMPLETED" : "IN_PROGRESS", targetQty: opts.qty, producedQty: finished ? opts.qty : 0, startDate: new Date() },
    });

    // One job card per department, statused by how far the bag has travelled.
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

    // Inspection lives on the QC card.
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
    const checkpoints = await prisma.checkpoint.findMany({ where: { section: { templateId: template.id } } });
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
      // Finished goods land in the warehouse.
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
