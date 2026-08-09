import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const f = await p.factory.findFirst();
const fid = f!.id;

const records = {
  "Items (master data)": await p.itemMaster.count({ where: { factoryId: fid } }),
  "Spec answers": await p.itemFieldValue.count({ where: { factoryId: fid } }),
  "Sales orders": await p.salesOrder.count({ where: { factoryId: fid } }),
  "Purchase orders": await p.purchaseOrder.count({ where: { factoryId: fid } }),
  "Stock rows / ledger": (await p.binBalance.count({ where: { factoryId: fid } })) + (await p.stockLedgerEntry.count({ where: { factoryId: fid } })),
  "Job cards / work orders": (await p.jobCard.count({ where: { factoryId: fid } })) + (await p.workOrder.count({ where: { factoryId: fid } })),
  "Customers": await p.customer.count({ where: { factoryId: fid } }),
  "Suppliers": await p.supplier.count({ where: { factoryId: fid } }),
  "Vehicles (brand/model/gen)": (await p.vehicleBrand.count({ where: { factoryId: fid } })) + (await p.vehicleModel.count({ where: { brand: { factoryId: fid } } })) + (await p.vehicleGeneration.count({ where: { model: { brand: { factoryId: fid } } } })),
  "Designs / Colours": (await p.design.count({ where: { factoryId: fid } })) + (await p.color.count({ where: { factoryId: fid } })),
  "Employees (excl. owner)": (await p.user.count({ where: { factoryId: fid } })) - 1,
  "Warehouses / bins": (await p.warehouse.count({ where: { factoryId: fid } })) + (await p.warehouseBin.count({ where: { shelf: { rack: { zone: { warehouse: { factoryId: fid } } } } } })),
  "Blueprints": await p.blueprint.count({ where: { factoryId: fid } }),
};

const configuration = {
  "Item groups (categories)": await p.itemGroup.count({ where: { factoryId: fid } }),
  "Spec fields": await p.specField.count({ where: { factoryId: fid } }),
  "Field options": await p.specFieldOption.count({ where: { field: { factoryId: fid } } }),
  "BOM recipe lines": await p.bomTemplateLine.count({ where: { factoryId: fid } }),
  "BOM contributions": await p.bomContribution.count({ where: { factoryId: fid } }),
  "QC checklist templates": await p.checklistTemplate.count({ where: { factoryId: fid } }),
  "Departments": await p.department.count({ where: { factoryId: fid } }),
};

console.log("=== RECORDS (data entered) ===");
console.table(records);
console.log("=== CONFIGURATION (how Verity is set up) ===");
console.table(configuration);
console.log("Owner:", (await p.user.findFirst({ where: { factoryId: fid, role: "OWNER" }, select: { name: true, phone: true } })));
await p.$disconnect();
