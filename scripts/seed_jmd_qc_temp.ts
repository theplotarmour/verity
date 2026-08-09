import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FACTORY_ID = "fac_jmd";

async function main() {
  console.log("Seeding default QC checklist template for JMD Impex...");

  // Check if a template already exists
  const existing = await prisma.checklistTemplate.findFirst({
    where: { factoryId: FACTORY_ID }
  });

  if (existing) {
    console.log("A checklist template already exists for JMD Impex.");
    await prisma.$disconnect();
    return;
  }

  // Create template
  const template = await prisma.checklistTemplate.create({
    data: {
      factoryId: FACTORY_ID,
      name: "Corrugated Boxes QC Checklist",
      version: "1.0",
      isLatest: true,
      status: "active"
    }
  });

  // Create section
  const section = await prisma.templateSection.create({
    data: {
      factoryId: FACTORY_ID,
      templateId: template.id,
      title: "Visual & Dimensional Inspection",
      sortOrder: 1
    }
  });

  // Checkpoints
  const checkpoints = [
    {
      name: "Dimensions & Crease Check",
      instructions: "Check length, width, and height against specifications. Ensure crease lines are clean and correctly spaced."
    },
    {
      name: "Glue & Joint Security",
      instructions: "Check that joint flap glue coverage is sufficient and the seam is aligned and secure."
    },
    {
      name: "Printing & Alignment Check",
      instructions: "For printed boxes, verify color density, logo placement, print sharpness, and barcode readability."
    },
    {
      name: "Ply Strength & Moisture Check",
      instructions: "Inspect board for fluting stiffness, compression damage, and check that boards are free of moisture."
    }
  ];

  for (let i = 0; i < checkpoints.length; i++) {
    await prisma.checkpoint.create({
      data: {
        factoryId: FACTORY_ID,
        sectionId: section.id,
        name: checkpoints[i].name,
        instructions: checkpoints[i].instructions,
        requireImage: i === 0 || i === 2, // Image required for dimensions and print check
        requireRemarks: i === 0,
        sortOrder: i + 1
      }
    });
  }

  console.log("Seeded QC Checklist Template successfully with 4 checkpoints.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
