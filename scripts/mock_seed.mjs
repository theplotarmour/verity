import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const uniq = () => Math.random().toString(36).slice(2, 8).toUpperCase()

const f = await p.factory.findFirst({ select: { id: true } })
if (!f) { console.log('no factory'); process.exit(1) }
const factoryId = f.id
console.log('factory', factoryId)

// ---- Product categories + products + product types ----
async function cat(name) {
  return (await p.productCategory.findFirst({ where: { factoryId, name } }))
    ?? p.productCategory.create({ data: { factoryId, name } })
}
const seatCat = await cat('Seat Covers')
const matCat = await cat('Mats')
const steerCat = await cat('Steering Covers')

async function product(categoryId, name, skuPrefix) {
  return (await p.product.findFirst({ where: { factoryId, name } }))
    ?? p.product.create({ data: { factoryId, categoryId, name, skuPrefix } })
}
const seatCover = await product(seatCat.id, 'Seat Cover', 'SC')
const mats = await product(matCat.id, 'Mats', 'MT')
const steering = await product(steerCat.id, 'Steering Cover', 'ST')

// Product type + spec fields for Seat Cover (drives the studio spec presets)
let seatType = await p.productType.findFirst({ where: { factoryId, name: 'Seat Cover' }, include: { fields: true } })
if (!seatType) {
  seatType = await p.productType.create({ data: { factoryId, name: 'Seat Cover' }, include: { fields: true } })
}
if ((seatType.fields ?? []).length === 0) {
  await p.productField.createMany({ data: [
    { productTypeId: seatType.id, name: 'Seat Type', type: 'TOGGLE', options: ['Single Back', 'Double Back'], sortOrder: 1 },
    { productTypeId: seatType.id, name: 'Headrests', type: 'BUTTONS', options: ['2', '4', '5', '6', '7', '8'], sortOrder: 2 },
    { productTypeId: seatType.id, name: 'Armrest', type: 'CHECKBOX', options: ['Yes', 'No'], sortOrder: 3 },
  ] })
}
for (const n of ['Mats', 'Steering Cover']) {
  if (!(await p.productType.findFirst({ where: { factoryId, name: n } }))) await p.productType.create({ data: { factoryId, name: n } })
}

// ---- Colours ----
const colorNames = ['Black', 'Beige', 'Tan', 'Cherry Red', 'Grey', 'Ivory']
for (const name of colorNames) {
  if (!(await p.color.findFirst({ where: { factoryId, name } }))) await p.color.create({ data: { factoryId, name } })
}
const colors = await p.color.findMany({ where: { factoryId } })

// ---- Designs (with families) ----
const designSpec = {
  ULTRA: ['Triple Seam', 'New N Type', 'Super Capt', 'Arrow', 'Winger'],
  'PRO SERIES': ['Lancer', 'Super Lancer', 'Lexa Plus', '7 Lines'],
  'ERGO FIT': ['Vertex', 'Archer', 'Spykar'],
  QUILTS: ['Zig Zag', 'Wavy Quilt', 'Diamond'],
}
for (const [family, names] of Object.entries(designSpec)) {
  for (const name of names) {
    if (!(await p.design.findFirst({ where: { factoryId, name, category: family } })))
      await p.design.create({ data: { factoryId, name, category: family, productId: seatCover.id } })
  }
}
const designs = await p.design.findMany({ where: { factoryId } })

// ---- Material categories + subcategories ----
async function matcat(name) {
  return (await p.materialCategory.findFirst({ where: { factoryId, name } }))
    ?? p.materialCategory.create({ data: { factoryId, name } })
}
const fabricCat = await matcat('Fabric')
const foamCat = await matcat('Foam')
const threadCat = await matcat('Thread')
async function subcat(categoryId, name) {
  return (await p.materialSubcategory.findFirst({ where: { factoryId, categoryId, name } }))
    ?? p.materialSubcategory.create({ data: { factoryId, categoryId, name } })
}
const napaSub = await subcat(fabricCat.id, 'Napa')
const spcSub = await subcat(fabricCat.id, 'SPC')

// ---- Items (fabrics = RAW_MATERIAL cat Fabric, plus other raw materials) ----
async function item(name, categoryId, subcategoryId, uom, extra = {}) {
  const existing = await p.itemMaster.findFirst({ where: { factoryId, name } })
  if (existing) return existing
  return p.itemMaster.create({ data: {
    factoryId, name, sku: `RM-${name.replace(/[^A-Za-z0-9]+/g, '-').toUpperCase()}-${uniq()}`,
    itemType: 'RAW_MATERIAL', defaultUOM: uom, categoryId, subcategoryId, ...extra,
  } })
}
const fabricItems = []
for (const [n, sub] of [['Heavy Napa', napaSub], ['Shaka SPC', spcSub], ['Lifto SPC', spcSub], ['Soft Napa', napaSub]]) {
  fabricItems.push(await item(n, fabricCat.id, sub.id, 'sqm', { brand: 'Verity', hsnCode: '5407', minStockLevel: 50, secondaryUOM: 'roll', searchKeywords: ['fabric', n.toLowerCase()] }))
}
await item('PU Foam 8mm', foamCat.id, null, 'sqm', { minStockLevel: 30 })
await item('Bonded Thread', threadCat.id, null, 'cone', { minStockLevel: 20 })

// ---- Suppliers ----
for (const name of ['Acme Textiles', 'Napa House', 'ThreadWorks']) {
  if (!(await p.supplier.findFirst({ where: { factoryId, name } }))) await p.supplier.create({ data: { factoryId, name } })
}

// ---- Warehouses ----
for (const [name, kind] of [['Main Warehouse', 'WAREHOUSE'], ['Front Store', 'STORE']]) {
  if (!(await p.warehouse.findFirst({ where: { factoryId, name } }))) await p.warehouse.create({ data: { factoryId, name, kind } })
}

// ---- Customers ----
const customerNames = ['Sharma Motors', 'Gupta Auto', 'Singh Car Care', 'Verma Accessories', 'Khan Autohub']
for (const name of customerNames) {
  if (!(await p.customer.findFirst({ where: { factoryId, name } })))
    await p.customer.create({ data: { factoryId, name, phone: '9' + Math.floor(100000000 + Math.random() * 899999999) } })
}
const customers = await p.customer.findMany({ where: { factoryId } })

// ---- Departments + workers ----
const departments = await p.department.findMany({ where: { factoryId }, orderBy: { sortOrder: 'asc' } })
const firstNames = ['Ravi', 'Amit', 'Suresh', 'Deepak', 'Vijay', 'Anil', 'Manoj', 'Rakesh', 'Sunil', 'Ajay', 'Kiran', 'Pooja']
const lastNames = ['Kumar', 'Sharma', 'Singh', 'Verma', 'Yadav', 'Gupta']
let phoneSeed = 7000000000
async function worker(name, role, departmentId) {
  const existing = await p.user.findFirst({ where: { factoryId, name } })
  if (existing) return existing
  return p.user.create({ data: { factoryId, name, role, departmentId, phone: String(phoneSeed++), isActive: true, status: 'active' } })
}
const workersByDept = new Map()
for (const d of departments) {
  const count = d.isQcStage ? 1 : 2
  const list = []
  for (let i = 0; i < count; i++) {
    const nm = `${rand(firstNames)} ${rand(lastNames)} ${uniq().slice(0, 2)}`
    list.push(await worker(nm, d.isQcStage ? 'SUPERVISOR' : 'WORKER', d.id))
  }
  workersByDept.set(d.id, list)
}

// ---- Vehicle models for fitments (use existing imported vehicles) ----
const vModels = await p.vehicleModel.findMany({ where: { factoryId }, include: { brand: true }, take: 20 })

// ---- Productions: order -> plan -> workOrder -> jobCards across departments ----
const template = await p.checklistTemplate.findFirst({ where: { factoryId, status: 'active' } })
const statuses = ['WAITING', 'IN_PROGRESS', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED']
const seatOpts = ['Single Back', 'Double Back']

async function ensureVariant(product, label) {
  let v = await p.productVariant.findFirst({ where: { productId: product.id, name: label } })
  if (!v) v = await p.productVariant.create({ data: { productId: product.id, name: label, sku: `${product.skuPrefix ?? 'PV'}-${uniq()}` } })
  let bp = await p.blueprint.findUnique({ where: { itemId: v.itemId }, include: { versions: true } })
  if (!bp) bp = await p.blueprint.create({ data: { factoryId, itemId: v.itemId }, include: { versions: true } })
  let bv = bp.versions?.find((x) => x.isActive) ?? bp.versions?.[0]
  if (!bv) bv = await p.blueprintVersion.create({ data: { blueprintId: bp.id, versionNumber: 1, name: 'V1 - Standard', qcTemplateId: template?.id ?? null, isActive: true } })
  return { v, bv }
}

let created = 0
for (let i = 0; i < 8; i++) {
  const vm = rand(vModels)
  const prod = rand([seatCover, seatCover, mats, steering])
  const label = `${vm?.brand?.name ?? 'Universal'} ${vm?.name ?? ''} ${prod.name}`.trim()
  const { v, bv } = await ensureVariant(prod, label)
  // Fitment so the floor shows the vehicle
  if (vm && !(await p.productVehicleFitment.findFirst({ where: { productVariantId: v.id, vehicleModelId: vm.id } }))) {
    await p.productVehicleFitment.create({ data: { factoryId, productVariantId: v.id, vehicleModelId: vm.id } })
  }
  const qty = rand([5, 10, 15, 20])
  const soNum = `SO-${uniq()}`
  const customer = rand(customers)
  const isSeat = prod.id === seatCover.id
  const so = await p.salesOrder.create({ data: {
    factoryId, soNumber: soNum, customerId: customer.id, status: 'IN_PRODUCTION',
    materialId: rand(fabricItems).id, designId: isSeat ? rand(designs).id : null,
    colorId: rand(colors).id, productTypeId: isSeat ? seatType.id : null,
    seatType: isSeat ? rand(seatOpts) : null, headrestCount: isSeat ? rand([4, 5, 6]) : null, hasArmrest: isSeat ? Math.random() > 0.5 : false,
    labelCode: `LBL-${uniq()}`,
    items: { create: [{ productVariantId: v.id, quantity: qty, unitPrice: 0 }] },
  } })
  const plan = await p.productionPlan.create({ data: { factoryId, salesOrderId: so.id, blueprintVersionId: bv.id, quantity: qty, status: 'RELEASED' } })
  const wo = await p.workOrder.create({ data: { factoryId, woNumber: soNum, productionPlanId: plan.id, status: 'IN_PROGRESS', targetQty: qty } })
  // Job card per department; the "current" one is IN_PROGRESS, earlier ones COMPLETED, later WAITING/BLOCKED.
  const activeIdx = Math.floor(Math.random() * departments.length)
  for (let s = 0; s < departments.length; s++) {
    const d = departments[s]
    const roster = workersByDept.get(d.id) ?? []
    let status
    if (s < activeIdx) status = 'COMPLETED'
    else if (s === activeIdx) status = d.isQcStage ? 'QC_PENDING' : rand(['IN_PROGRESS', 'IN_PROGRESS', 'ON_HOLD'])
    else status = s === activeIdx + 1 ? 'WAITING' : 'BLOCKED'
    const jc = await p.jobCard.create({ data: {
      factoryId, workOrderId: wo.id, departmentId: d.id, sequence: s + 1, status,
      assignedToId: roster[0]?.id ?? null, targetQty: qty,
      completedQty: status === 'COMPLETED' ? qty : (status === 'IN_PROGRESS' ? Math.floor(qty / 2) : 0),
      startedAt: ['IN_PROGRESS', 'COMPLETED', 'QC_PENDING', 'ON_HOLD'].includes(status) ? new Date(Date.now() - Math.random() * 8.64e7) : null,
      completedAt: status === 'COMPLETED' ? new Date() : null,
      templateId: d.isQcStage ? (template?.id ?? null) : null,
    } })
    if (d.isQcStage) {
      await p.inspection.create({ data: { factoryId, jobCardId: jc.id, status: status === 'QC_PENDING' ? 'WAITING_QC' : 'PENDING' } })
    }
  }
  created++
}
console.log(`created ${created} productions`)

// ---- Finished stock into the main warehouse (bin balances) ----
console.log('mock seed done')
await p.$disconnect()
