/**
 * Why can't I get into /verity?
 *
 * The guard is deliberately silent to the browser — it redirects rather than
 * saying "HQ exists but you may not enter". That makes it undiagnosable from
 * the outside, so this answers the question from the inside.
 *
 *   npx tsx scripts/check-hq-access.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const raw = process.env.VERITY_HQ_PHONES;
  const permitted = (raw ?? "")
    .split(",")
    .map((e) => e.replace(/\D/g, ""))
    .filter(Boolean);

  console.log("VERITY_HQ_PHONES:", raw === undefined ? "NOT SET" : JSON.stringify(raw));
  console.log("parsed allowlist:", permitted.length ? permitted.join(", ") : "(empty — admits nobody)");
  console.log("");

  if (permitted.length === 0) {
    console.log("=> Nobody can reach /verity. Add to .env, then RESTART the server:");
    console.log('   VERITY_HQ_PHONES=7011440350');
    console.log("");
    console.log("   Next reads env at boot; editing .env while it runs changes nothing.");
    console.log("   On a hosted deployment .env is not uploaded (it is gitignored) —");
    console.log("   set the variable in the host's environment settings instead.");
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { name: true, phone: true, role: true, factory: { select: { name: true } } },
    orderBy: { role: "asc" },
  });

  console.log("Active accounts and whether each may enter HQ:");
  for (const u of users) {
    const digits = (u.phone ?? "").replace(/\D/g, "");
    const ok = digits && permitted.includes(digits);
    console.log(
      `  ${ok ? "YES" : " no"}  ${String(u.phone ?? "(no phone)").padEnd(12)} ${u.role.padEnd(11)} ${u.name} — ${u.factory.name}`,
    );
  }

  const listedButMissing = permitted.filter(
    (p) => !users.some((u) => (u.phone ?? "").replace(/\D/g, "") === p),
  );
  if (listedButMissing.length) {
    console.log("");
    console.log(
      "=> Listed in VERITY_HQ_PHONES but no active account has that number:",
      listedButMissing.join(", "),
    );
  }

  console.log("");
  console.log("Also required: you must be signed in. The guard needs a session cookie,");
  console.log("so sign in normally first, then open /verity.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
