/**
 * Repair PIN hashes written with the stale `veda:` salt.
 *
 * `prisma/seed.ts` carried its own copy of `hashPin` and drifted to a `veda:`
 * prefix while `src/lib/server/hash.ts` moved to `verity:`. Nothing failed
 * loudly — the seed wrote one hash, login computed another, and every seeded
 * account simply reported "Invalid Phone Number or PIN" forever.
 *
 * This finds users whose stored hash matches the OLD scheme for a known seed
 * PIN and rewrites it under the current one. A user is only touched when the
 * old hash matches exactly, so an account with any other PIN is left alone.
 *
 *   npx tsx scripts/repair-legacy-pin-hashes.ts          # report only
 *   npx tsx scripts/repair-legacy-pin-hashes.ts --apply  # write
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

const stale = (pin: string, factoryId: string) =>
  createHash("sha256").update(`veda:${factoryId}:${pin}`).digest("hex");
const current = (pin: string, factoryId: string) =>
  createHash("sha256").update(`verity:${factoryId}:${pin}`).digest("hex");

/** The PINs the seed script assigns. Nothing else is guessed at. */
const SEEDED_PINS = ["7190", "1234"];

async function main() {
  const apply = process.argv.includes("--apply");

  const users = await prisma.user.findMany({
    select: { id: true, name: true, phone: true, role: true, factoryId: true, pinHash: true },
  });

  let repaired = 0;

  for (const user of users) {
    if (!user.pinHash) continue;
    const pin = SEEDED_PINS.find((p) => stale(p, user.factoryId) === user.pinHash);
    if (!pin) continue;

    repaired += 1;
    console.log(
      `${apply ? "repair" : "would repair"} ${user.role.padEnd(11)} ${String(user.phone).padEnd(12)} ${user.name} (PIN ${pin})`,
    );

    if (apply) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pinHash: current(pin, user.factoryId), failedAttempts: 0, lockedUntil: null },
      });
    }
  }

  console.log(
    repaired === 0
      ? "No stale hashes found."
      : `${repaired} account(s) ${apply ? "repaired." : "pending; re-run with --apply."}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
