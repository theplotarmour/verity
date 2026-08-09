/**
 * Makes the trial workspace look like a factory that has been running for a
 * week: every department has an operating checklist, every product has a QC
 * template and a BOM, everyone is staffed to a department, and the existing
 * orders are spread across the last seven days instead of all landing "today".
 *
 * Idempotent and additive — safe to re-run. It never deletes; it only fills
 * gaps and normalises timestamps. Run AFTER scripts/enrich_seed.ts (which seeds
 * the item catalogue this script draws BOM components from).
 *
 *   npx tsx scripts/enrich_usage.ts
 */
import { PrismaClient, FieldType } from "@prisma/client";

const prisma = new PrismaClient();

// ---- Operating checklists for the non-QC departments ---------------------
// Each is a short "did you do the essentials" list the operator clears to
// complete the stage (the same checkpoint engine QC uses).
const DEPT_CHECKLISTS: Record<string, { section: string; checkpoints: Array<{ name: string; instructions: string; photo?: boolean; remarks?: boolean }> }> = {
  CAD: {
    section: "Pattern & Nesting",
    checkpoints: [
      { name: "Pattern selected", instructions: "Confirm the correct pattern/generation is loaded for this vehicle." },
      { name: "Nesting optimised", instructions: "Nest panels to minimise fabric wastage before cutting release." },
      { name: "Cut file released", instructions: "Release the cut file to the cutting table.", photo: true },
    ],
  },
  Cutting: {
    section: "Cutting Quality",
    checkpoints: [
      { name: "Fabric matches order", instructions: "Fabric colour and material match the production label." },
      { name: "Panels cut clean", instructions: "All panels cut to pattern with no fraying or short cuts.", photo: true },
      { name: "Panel count correct", instructions: "Count panels against the pattern list.", remarks: true },
    ],
  },
  Stitching: {
    section: "Stitching Quality",
    checkpoints: [
      { name: "Seam strength", instructions: "Seams are even, tight and back-tacked at stress points." },
      { name: "Thread colour correct", instructions: "Thread matches the specified colour." },
      { name: "Fitment dry-check", instructions: "Cover test-fits the seat form without pulling.", photo: true },
    ],
  },
  Packing: {
    section: "Packing & Dispatch Prep",
    checkpoints: [
      { name: "Set complete", instructions: "All pieces of the set present (seats, headrests, armrest if ordered)." },
      { name: "Label attached", instructions: "Production label attached and scannable.", photo: true },
      { name: "Boxed & sealed", instructions: "Item boxed in the correct carton and sealed." },
    ],
  },
};

// ---- Product types (studio spec fields) for every product ----------------
const PRODUCT_TYPE_FIELDS: Record<string, Array<{ name: string; type: FieldType; options?: string[]; required?: boolean }>> = {
  Mats: [
    { name: "Mat Type", type: "SELECT", options: ["3D", "7D", "Flat"], required: true },
    { name: "Pieces", type: "SELECT", options: ["5", "6", "7"], required: true },
    { name: "Border Colour", type: "TEXT" },
  ],
  "Steering Cover": [
    { name: "Size", type: "SELECT", options: ["S", "M", "L"], required: true },
    { name: "Stitch Style", type: "SELECT", options: ["Hand-stitched", "Slip-on"] },
  ],
};

// ---- QC checklists per product -------------------------------------------
const PRODUCT_QC: Record<string, { section: string; checkpoints: string[] }> = {
  Mats: {
    section: "Mat Finish",
    checkpoints: ["Edge binding intact", "Anti-skid backing bonded", "Set piece count correct", "Surface clean"],
  },
  "Steering Cover": {
    section: "Steering Cover Finish",
    checkpoints: ["Circumference fits", "Stitching even", "No glue marks", "Grip texture intact"],
  },
};

// ---- BOM recipes per product (item name → qty per unit, waste %) ----------
const BOM_RECIPES: Record<string, Array<{ item: string; qty: number; waste?: number }>> = {
  "Seat Cover": [
    { item: "Napa Black PU Leather", qty: 4.5, waste: 8 },
    { item: "PU Foam 12mm", qty: 3.2, waste: 5 },
    { item: "Bonded Thread", qty: 0.3 },
    { item: "YKK Zipper 8in", qty: 6 },
    { item: "Carxen Woven Label", qty: 1 },
    { item: "Plastic Retainer Hook", qty: 8 },
  ],
  Mats: [
    { item: "Napa Beige PU Leather", qty: 2.4, waste: 6 },
    { item: "PU Foam 8mm", qty: 2.0, waste: 5 },
    { item: "Bonded Thread", qty: 0.15 },
    { item: "Carxen Woven Label", qty: 1 },
  ],
  "Steering Cover": [
    { item: "Soft Napa", qty: 0.4, waste: 10 },
    { item: "Bonded Thread", qty: 0.05 },
    { item: "Easy-Break Airbag Thread", qty: 0.03 },
    { item: "Carxen Woven Label", qty: 1 },
  ],
};

async function main() {
  const factory = await prisma.factory.findFirst({ orderBy: { createdAt: "asc" } });
  if (!factory) throw new Error("No factory found — run the base seed first.");
  const factoryId = factory.id;
  console.log(`Enriching usage for: ${factory.name}\n`);

  const departments = await prisma.department.findMany({ where: { factoryId }, orderBy: { sortOrder: "asc" } });
  const products = await prisma.product.findMany({ where: { factoryId }, include: { variants: true } });
  const items = await prisma.itemMaster.findMany({ where: { factoryId }, select: { id: true, name: true } });
  const itemByName = new Map(items.map((i) => [i.name.toLowerCase(), i.id]));

  // ---- 1. Staff every worker/supervisor into a department ----------------
  const unstaffed = await prisma.user.findMany({
    where: { factoryId, role: { in: ["WORKER", "SUPERVISOR"] }, departmentId: null },
  });
  const nonQcDepts = departments.filter((d) => !d.isQcStage);
  let staffed = 0;
  for (let i = 0; i < unstaffed.length; i++) {
    const dept = nonQcDepts[i % Math.max(1, nonQcDepts.length)];
    if (!dept) break;
    await prisma.user.update({ where: { id: unstaffed[i].id }, data: { departmentId: dept.id } });
    console.log(`  · staffed ${unstaffed[i].name} → ${dept.name}`);
    staffed++;
  }

  // ---- 2. Operating checklist template per non-QC department -------------
  let deptTemplates = 0;
  for (const dept of departments) {
    if (dept.isQcStage) continue;
    if (dept.templateId) continue;
    const spec = DEPT_CHECKLISTS[dept.name];
    if (!spec) continue;
    const tmpl = await prisma.qCTemplate.create({
      data: {
        factoryId,
        name: `${dept.name} Checklist`,
        status: "active",
        isLatest: false, // department checklists must not win QC template resolution
        sections: {
          create: [{
            factoryId,
            title: spec.section,
            sortOrder: 0,
            checkpoints: {
              create: spec.checkpoints.map((cp, idx) => ({
                factoryId,
                name: cp.name,
                instructions: cp.instructions,
                requireImage: !!cp.photo,
                requireRemarks: !!cp.remarks,
                sortOrder: idx,
              })),
            },
          }],
        },
      },
    });
    await prisma.department.update({ where: { id: dept.id }, data: { templateId: tmpl.id } });
    console.log(`  + ${dept.name} checklist template`);
    deptTemplates++;
  }

  // ---- 3. Product types + spec fields for every product ------------------
  let productTypes = 0;
  for (const [name, fields] of Object.entries(PRODUCT_TYPE_FIELDS)) {
    let pt = await prisma.productType.findFirst({ where: { factoryId, name: { equals: name, mode: "insensitive" } } });
    if (!pt) {
      pt = await prisma.productType.create({
        data: {
          factoryId,
          name,
          fields: { create: fields.map((f, idx) => ({ name: f.name, type: f.type, options: f.options ?? undefined, isRequired: !!f.required, sortOrder: idx })) },
        },
      });
      console.log(`  + product type ${name} (${fields.length} fields)`);
      productTypes++;
    }
  }

  // ---- 4. QC template per product (tagged, so orders resolve correctly) --
  let productTemplates = 0;
  for (const product of products) {
    const spec = PRODUCT_QC[product.name];
    if (!spec) continue; // Seat Cover already has one from the base seed
    const already = await prisma.qCTemplate.findFirst({ where: { factoryId, products: { some: { id: product.id } } } });
    if (already) continue;
    await prisma.qCTemplate.create({
      data: {
        factoryId,
        name: `${product.name} Quality Checks`,
        status: "active",
        isLatest: false,
        products: { connect: { id: product.id } },
        sections: {
          create: [{
            factoryId,
            title: spec.section,
            sortOrder: 0,
            checkpoints: {
              create: spec.checkpoints.map((name, idx) => ({
                factoryId, name, instructions: `Verify: ${name}.`, requireImage: idx === 0, sortOrder: idx,
              })),
            },
          }],
        },
      },
    });
    console.log(`  + ${product.name} QC template`);
    productTemplates++;
  }

  // ---- 5. BOM for every variant (via its active blueprint version) -------
  let bomsCreated = 0;
  for (const product of products) {
    const recipe = BOM_RECIPES[product.name];
    if (!recipe) continue;
    const lines = recipe
      .map((r) => ({ itemId: itemByName.get(r.item.toLowerCase()), quantity: r.qty, wastePercent: r.waste ?? 0, name: r.item }))
      .filter((l) => l.itemId);
    if (lines.length === 0) { console.log(`  ! ${product.name}: no BOM items resolved (run enrich_seed first)`); continue; }

    const productTemplate = await prisma.qCTemplate.findFirst({ where: { factoryId, products: { some: { id: product.id } } } });

    for (const variant of product.variants) {
      // Ensure blueprint + active version exist (createOrder self-heals these,
      // but variants that were never ordered won't have one yet).
      let blueprint = await prisma.blueprint.findUnique({ where: { itemId: variant.itemId }, include: { versions: true } });
      if (!blueprint) {
        blueprint = await prisma.blueprint.create({ data: { factoryId, itemId: variant.itemId }, include: { versions: true } });
      }
      let version = blueprint.versions.find((v) => v.isActive) ?? blueprint.versions[0];
      if (!version) {
        version = await prisma.blueprintVersion.create({
          data: { blueprintId: blueprint.id, versionNumber: 1, name: "V1 - Standard", isActive: true, qcTemplateId: productTemplate?.id ?? undefined },
        });
        await prisma.blueprint.update({ where: { id: blueprint.id }, data: { activeVersionId: version.id } });
      } else if (!version.qcTemplateId && productTemplate) {
        await prisma.blueprintVersion.update({ where: { id: version.id }, data: { qcTemplateId: productTemplate.id } });
      }

      const existingBom = await prisma.bOM.findUnique({ where: { blueprintVersionId: version.id } });
      if (existingBom) continue;
      await prisma.bOM.create({
        data: {
          factoryId,
          blueprintVersionId: version.id,
          items: { create: lines.map((l) => ({ itemId: l.itemId!, quantity: l.quantity, wastePercent: l.wastePercent })) },
        },
      });
      console.log(`  + BOM ${product.name} / ${variant.name} (${lines.length} items)`);
      bomsCreated++;
    }
  }

  // ---- 6. Spread existing orders across the last 7 days ------------------
  // Only touches orders still clustered on their creation day; leaves anything
  // already spread out alone (idempotent).
  const orders = await prisma.salesOrder.findMany({
    where: { factoryId },
    orderBy: { orderDate: "asc" },
    include: { plans: { include: { workOrders: { include: { jobCards: true } } } } },
  });
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const spanDays = 7;
  // If the newest and oldest order are already >2 days apart, assume done.
  const dates = orders.map((o) => o.orderDate.getTime());
  const alreadySpread = dates.length > 1 && (Math.max(...dates) - Math.min(...dates)) > 2 * DAY;
  let backdated = 0;
  if (!alreadySpread && orders.length > 0) {
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      // Oldest order ~7 days ago, newest ~today, evenly spaced, mid-morning.
      const dayOffset = Math.round((spanDays - 1) * (1 - i / Math.max(1, orders.length - 1)));
      const base = new Date(now - dayOffset * DAY);
      base.setHours(9 + (i % 6), (i * 7) % 60, 0, 0);
      await prisma.salesOrder.update({ where: { id: o.id }, data: { orderDate: base } });
      for (const plan of o.plans) {
        for (const wo of plan.workOrders) {
          await prisma.workOrder.update({ where: { id: wo.id }, data: { startDate: base } }).catch(() => {});
          for (const jc of wo.jobCards) {
            const started = jc.status === "WAITING" || jc.status === "BLOCKED" ? null : new Date(base.getTime() + 60 * 60 * 1000);
            const completed = jc.status === "COMPLETED" ? new Date(base.getTime() + 3 * 60 * 60 * 1000) : null;
            await prisma.jobCard.update({ where: { id: jc.id }, data: { ...(started ? { startedAt: started } : {}), ...(completed ? { completedAt: completed } : {}) } }).catch(() => {});
          }
        }
      }
      backdated++;
    }
  }

  // ---- 7. Sales layer: codes, tags, order types, vehicle, payment, quote ---
  // Populate the new sales-layer screens so they aren't empty in the demo.
  let salesTouched = 0;

  // Customer codes for any customer missing one (CUST-0001…).
  const codeless = await prisma.customer.findMany({ where: { factoryId, customerCode: null }, orderBy: { createdAt: "asc" } });
  if (codeless.length > 0) {
    const existingMax = (await prisma.customer.findMany({ where: { factoryId, customerCode: { startsWith: "CUST-" } }, select: { customerCode: true } }))
      .reduce((m, r) => Math.max(m, parseInt((r.customerCode ?? "").split("-")[1] ?? "0", 10) || 0), 0);
    for (let i = 0; i < codeless.length; i++) {
      await prisma.customer.update({ where: { id: codeless[i].id }, data: { customerCode: `CUST-${String(existingMax + i + 1).padStart(4, "0")}` } });
      salesTouched++;
    }
    console.log(`  · assigned ${codeless.length} customer codes`);
  }

  // Tag a couple of customers as Dealer / OEM (idempotent — only if untagged).
  const untagged = await prisma.customer.findMany({ where: { factoryId, tags: { isEmpty: true } }, orderBy: { createdAt: "asc" }, take: 3 });
  const tagPlan = ["Dealer", "OEM", "Retail"];
  for (let i = 0; i < untagged.length; i++) {
    await prisma.customer.update({ where: { id: untagged[i].id }, data: { tags: [tagPlan[i % tagPlan.length]] } });
  }
  if (untagged.length) console.log(`  · tagged ${untagged.length} customers`);

  // Order types on a few orders (leave the rest RETAIL).
  const retailOrders = await prisma.salesOrder.findMany({ where: { factoryId, orderType: "RETAIL" }, orderBy: { orderDate: "desc" }, take: 4 });
  const otPlan: any[] = ["DEALER", "OEM", "RETAIL", "DEALER"];
  for (let i = 0; i < retailOrders.length; i++) {
    if (otPlan[i] !== "RETAIL") await prisma.salesOrder.update({ where: { id: retailOrders[i].id }, data: { orderType: otPlan[i] } });
  }

  // ---- Summary ------------------------------------------------------------
  const [tmplCount, bomCount, ptCount, deptsWithTmpl, orphan] = await Promise.all([
    prisma.qCTemplate.count({ where: { factoryId } }),
    prisma.bOM.count({ where: { factoryId } }),
    prisma.productType.count({ where: { factoryId } }),
    prisma.department.count({ where: { factoryId, isQcStage: false, templateId: { not: null } } }),
    prisma.user.count({ where: { factoryId, role: { in: ["WORKER", "SUPERVISOR"] }, departmentId: null } }),
  ]);
  console.log(`\nDone.`);
  console.log(`  staffed=${staffed} deptTemplates=+${deptTemplates} productTypes=+${productTypes} productTemplates=+${productTemplates} boms=+${bomsCreated} backdated=${backdated} salesTouched=${salesTouched}`);
  console.log(`  totals: qcTemplates=${tmplCount} boms=${bomCount} productTypes=${ptCount} nonQcDeptsWithChecklist=${deptsWithTmpl} unstaffed=${orphan}`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
