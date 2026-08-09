import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const f = await p.factory.findFirst();
const fid = f!.id;

const domains = await p.itemGroup.findMany({
  where: { factoryId: fid, domainType: { not: null } },
  include: { _count: { select: { specFields: true } } },
  orderBy: { sortOrder: "asc" },
});
console.log("DOMAIN SHEETS:");
for (const d of domains) console.log(`  ${d.name} [${d.domainType}] — ${d._count.specFields} fields`);

console.log("\nDESIGN ROWS:", await p.design.count({ where: { factoryId: fid } }));
console.log("COLOUR ROWS:", await p.color.count({ where: { factoryId: fid } }));

// Depth of the category tree, to prove the recursive sidebar has something to render.
const groups = await p.itemGroup.findMany({ where: { factoryId: fid }, select: { id: true, parentId: true, name: true } });
const byId = new Map(groups.map(g => [g.id, g]));
const depthOf = (g: typeof groups[number]) => { let d = 0, cur = g; while (cur.parentId) { cur = byId.get(cur.parentId)!; d++; } return d; };
console.log("MAX CATEGORY DEPTH:", Math.max(...groups.map(depthOf)));

// Sample the composed names — the whole point of "complete, not partial".
const sample = await p.itemMaster.findMany({
  where: { factoryId: fid, group: { name: "Seat Cover" } },
  select: { name: true, itemCode: true }, take: 4, orderBy: { name: "asc" },
});
console.log("\nSAMPLE SEAT COVERS:");
for (const s of sample) console.log(`  ${s.itemCode}  ${s.name}`);

const fab = await p.itemMaster.findMany({
  where: { factoryId: fid, group: { name: "Fabric" } },
  select: { name: true, itemCode: true }, take: 3, orderBy: { name: "asc" },
});
console.log("SAMPLE FABRICS:");
for (const s of fab) console.log(`  ${s.itemCode}  ${s.name}`);

// A real three-layer BOM.
const innova = await p.itemMaster.findFirst({
  where: { factoryId: fid, name: { contains: "Innova" }, group: { name: "Seat Cover" }, bomOverrides: { some: {} } },
  select: { id: true, name: true },
});
if (innova) {
  const { getItemBomFor } = await import("../../src/server/queries/spec");
  const bom = await getItemBomFor(fid, innova.id);
  console.log(`\nBOM FOR ${innova.name}:`);
  for (const l of bom) console.log(`  ${l.component?.name ?? "?"} x${l.quantity} (${l.source}: ${l.sourceLabel})`);
}
await p.$disconnect();
