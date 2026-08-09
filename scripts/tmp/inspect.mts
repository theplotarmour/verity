import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const f = await p.factory.findFirst();
console.log("FACTORY", f?.id, f?.name);
const groups = await p.itemGroup.findMany({ where: { factoryId: f!.id }, orderBy: { name: "asc" } });
for (const g of groups) {
  const parent = groups.find(x => x.id === g.parentId);
  console.log(`GROUP ${parent ? parent.name + " > " : ""}${g.name} [${g.itemType}] name="${g.nameTemplate}" code="${g.codeTemplate}" domain=${g.domainType ?? "-"} prod=${g.isProducible} purch=${g.isPurchasable}`);
}
const fields = await p.specField.findMany({ where: { factoryId: f!.id }, include: { options: true, group: true }, orderBy: { sortOrder: "asc" } });
for (const fl of fields) {
  console.log(`FIELD ${fl.group.name} :: ${fl.name} key=${fl.key} kind=${fl.kind} ref=${fl.refTarget ?? "-"} target=${fl.targetGroupId ?? "-"} req=${fl.isRequired} opts=${fl.options.length} [${fl.options.map(o=>o.label).join("|")}]`);
}
console.log("COUNTS", {
  items: await p.itemMaster.count({ where: { factoryId: f!.id } }),
  brands: await p.vehicleBrand.count({ where: { factoryId: f!.id } }),
  designs: await p.design.count({ where: { factoryId: f!.id } }),
  colors: await p.color.count({ where: { factoryId: f!.id } }),
  bomTemplate: await p.bomTemplateLine.count({ where: { factoryId: f!.id } }),
  depts: await p.department.count({ where: { factoryId: f!.id } }),
  qcTemplates: await p.checklistTemplate.count({ where: { factoryId: f!.id } }),
  users: await p.user.count({ where: { factoryId: f!.id } }),
  warehouses: await p.warehouse.count({ where: { factoryId: f!.id } }),
});
await p.$disconnect();
