// Read-only. Reports which tables hold any rows at all.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const tables = await prisma.$queryRaw`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`;

const nonEmpty = [];
let total = 0;
for (const { table_name } of tables) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS count FROM "${table_name}"`,
  );
  const n = rows[0].count;
  total += n;
  if (n > 0) nonEmpty.push(`${table_name}: ${n}`);
}

console.log("tables scanned:", tables.length);
console.log("total rows across all tables:", total);
console.log(nonEmpty.length ? "NON-EMPTY:\n  " + nonEmpty.join("\n  ") : "every table is empty");
await prisma.$disconnect();
