// Read-only inspection of the live database. Makes no writes.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tables = await prisma.$queryRaw`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name`;
const names = new Set(tables.map((t) => t.table_name));

const phase0 = ["Organization", "Role", "RolePermission", "ModuleEntitlement"];
console.log("total tables:", names.size);
console.log("\nPhase 0 tables:");
for (const t of phase0) console.log(`  ${t.padEnd(20)} ${names.has(t) ? "PRESENT" : "MISSING"}`);

const factoryCols = await prisma.$queryRaw`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='Factory'`;
const fcols = factoryCols.map((c) => c.column_name);
console.log("\nFactory.organizationId:", fcols.includes("organizationId") ? "PRESENT" : "MISSING");
console.log("Factory.modulesEnabled:", fcols.includes("modulesEnabled") ? "still present (pre-migration)" : "dropped (post-migration)");

const enums = await prisma.$queryRaw`
  SELECT typname FROM pg_type WHERE typname IN ('Role','SystemRole')`;
console.log("enum:", enums.map((e) => e.typname).join(", ") || "none");

const [{ count: factories }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "Factory"`;
const [{ count: users }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "User"`;
const [{ count: orders }] = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "SalesOrder"`;
console.log(`\nrows -> Factory: ${factories}, User: ${users}, SalesOrder: ${orders}`);

const existing = await prisma.$queryRaw`
  SELECT "name", "phone", "role" FROM "User" WHERE "phone" = '7011440350'`;
console.log("phone 7011440350 already exists:", existing.length > 0 ? existing : "no");

await prisma.$disconnect();
