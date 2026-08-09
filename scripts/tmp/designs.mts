import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const f = await p.factory.findFirst();
const rows = await p.design.findMany({ where: { factoryId: f!.id }, orderBy: { name: "asc" } });
for (const d of rows) console.log(`${d.name} | category=${d.category ?? "-"} | consumption=${d.fabricConsumption ?? "MISSING"}`);
console.log("---colours---");
for (const c of await p.color.findMany({ where: { factoryId: f!.id }, orderBy: { name: "asc" } })) console.log(c.name);
await p.$disconnect();
