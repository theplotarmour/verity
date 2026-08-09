import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const f = await p.factory.findFirst();
const t0 = Date.now();
const { getGroupRows } = await import("../../src/server/queries/spec");
// getGroupRows needs a session; time the underlying query shape instead.
const groups = await p.itemGroup.findMany({ where: { factoryId: f!.id }, select: { id: true, parentId: true, name: true } });
const seatCover = groups.find(g => g.name === "Seat Cover")!;
const t1 = Date.now();
const items = await p.itemMaster.findMany({
  where: { factoryId: f!.id, groupId: seatCover.id },
  include: { specValues: { include: { field: { select: { key: true, unitSuffix: true } }, option: { select: { label: true } }, valueItem: { select: { name: true, aliasName: true } } } } },
  orderBy: { name: "asc" },
});
const t2 = Date.now();
console.log(`groups ${t1 - t0}ms · ${items.length} seat covers with spec values ${t2 - t1}ms`);
console.log("spec value rows loaded:", items.reduce((n, i) => n + i.specValues.length, 0));
void getGroupRows;
await p.$disconnect();
