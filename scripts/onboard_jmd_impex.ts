/**
 * Onboard the packaging-box client JMD Impex (Faridabad).
 *
 * Creates the factory, its owner login (PIN hashed with the factory-salted
 * hashPin), the default master-data roots and record sheets, and the standard
 * manufacturing workflow stages.
 *
 * Idempotent: re-running finds-or-updates rather than duplicating, so it is safe
 * to run again after a partial failure.
 *
 *   npx tsx --env-file=.env scripts/onboard_jmd_impex.ts
 */
import { PrismaClient } from "@prisma/client";
import { hashPin } from "@/lib/server/hash";
import { createDefaultMasterData } from "@/lib/master-data/defaults";

const prisma = new PrismaClient();

const FACTORY_ID = "fac_jmd";
const OWNER_PHONE = "7291064988";
const OWNER_PIN = "4988";

// QC runs the inspection flow; the rest are plain capture stages.
const STAGES: { name: string; isQcStage?: boolean }[] = [
  { name: "Order Placed" },
  { name: "Production Start" },
  { name: "Quality Control", isQcStage: true },
  { name: "Finished Packaging" },
  { name: "Dispatched" },
];

async function main() {
  // 1. Factory
  const factory = await prisma.factory.upsert({
    where: { id: FACTORY_ID },
    update: { name: "JMD Impex", slug: "jmd-impex" },
    create: { id: FACTORY_ID, name: "JMD Impex", slug: "jmd-impex" },
  });

  // 2. Owner login. Phone is globally unique, so find-or-update on it.
  const pinHash = hashPin(OWNER_PIN, FACTORY_ID);
  const existingOwner = await prisma.user.findFirst({
    where: { factoryId: FACTORY_ID, role: "OWNER" },
    select: { id: true },
  });
  const owner = existingOwner
    ? await prisma.user.update({
        where: { id: existingOwner.id },
        data: { name: "Manthan Garg", phone: OWNER_PHONE, pinHash },
      })
    : await prisma.user.create({
        data: {
          factoryId: FACTORY_ID,
          name: "Manthan Garg",
          phone: OWNER_PHONE,
          role: "OWNER",
          pinHash,
        },
      });

  // 3. Default roots + record sheets (Raw Material, Semi-Finished, Finished
  // Good, Consumable, Packaging, Trading Goods, Colour, Design, ...). Idempotent.
  await createDefaultMasterData(prisma, FACTORY_ID);

  // 4. Workflow stages, only if none exist yet.
  const stageCount = await prisma.workflowStage.count({ where: { factoryId: FACTORY_ID } });
  if (stageCount === 0) {
    await prisma.workflowStage.createMany({
      data: STAGES.map((s, i) => ({
        factoryId: FACTORY_ID,
        name: s.name,
        sortOrder: i,
        isQcStage: s.isQcStage ?? false,
      })),
    });
  }

  const roots = await prisma.itemGroup.count({ where: { factoryId: FACTORY_ID, parentId: null } });
  const stages = await prisma.workflowStage.count({ where: { factoryId: FACTORY_ID } });
  console.log("JMD Impex onboarded:", {
    factory: factory.id,
    owner: owner.id,
    ownerPhone: OWNER_PHONE,
    rootCategories: roots,
    stages,
  });

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
