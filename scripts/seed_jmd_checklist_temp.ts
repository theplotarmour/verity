import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FACTORY_ID = "fac_jmd";

async function main() {
  console.log("Seeding JMD Impex quality control checklist template...");

  // 1. Create Checklist Template
  const template = await prisma.checklistTemplate.create({
    data: {
      factoryId: FACTORY_ID,
      name: "Cardboard Box Quality Checks",
      version: "1.0",
      isLatest: true,
      status: "active",
      requiresVideo: false
    }
  });

  console.log("QC Template created:", template.id);

  // 2. Create Template Section
  const section = await prisma.templateSection.create({
    data: {
      factoryId: FACTORY_ID,
      templateId: template.id,
      title: "Visual and Dimensional Inspection",
      sortOrder: 1
    }
  });

  console.log("Template Section created:", section.id);

  // 3. Create Checkpoints
  const checkpoints = [
    {
      name: "Dimensional Tolerance Check",
      instructions: "Measure box length, width, and height. Ensure error is within +/- 2mm limit.",
      requireImage: true,
      requireRemarks: true
    },
    {
      name: "Flute & Ply Alignment",
      instructions: "Verify flute structure matches ply selection (3 Ply / 5 Ply) without crushing.",
      requireImage: true,
      requireRemarks: false
    },
    {
      name: "Printing Quality & Cleanliness",
      instructions: "Check for ink smudges, color alignment, and text clarity on printed boxes.",
      requireImage: true,
      requireRemarks: false
    },
    {
      name: "Joint & Seam Bonding Strength",
      instructions: "Inspect glue coverage or staple intervals along the manufacturing joint.",
      requireImage: true,
      requireRemarks: true
    }
  ];

  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i];
    await prisma.checkpoint.create({
      data: {
        factoryId: FACTORY_ID,
        sectionId: section.id,
        name: cp.name,
        instructions: cp.instructions,
        requireImage: cp.requireImage,
        requireRemarks: cp.requireRemarks,
        sortOrder: i + 1
      }
    });
  }

  console.log("Checkpoints seeded successfully.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
