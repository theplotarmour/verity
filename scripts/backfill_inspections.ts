import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pendingInspections = await prisma.inspection.findMany({
    where: { 
      status: {
        in: ["IN_PROGRESS", "PENDING", "WAITING_QC", "REWORK_REQUIRED"]
      }
    },
    include: { submissions: true }
  });

  console.log(`Found ${pendingInspections.length} active/pending inspections to check.`);

  for (const ins of pendingInspections) {
    if (ins.submissions.length < 10) {
      console.log(`Inspection ${ins.id} has only ${ins.submissions.length} checkpoints. Upgrading to the new comprehensive list...`);

      const template = await prisma.qCTemplate.findFirst({
        where: { factoryId: ins.factoryId, status: "active", isLatest: true },
        include: { sections: { include: { checkpoints: true } } }
      });

      if (!template) {
        console.log(`No active template found for factory ${ins.factoryId}`);
        continue;
      }

      // Clear old submissions
      await prisma.checkpointSubmission.deleteMany({
        where: { inspectionId: ins.id }
      });

      // Insert new submissions
      const submissions = [];
      for (const section of template.sections) {
        for (const checkpoint of section.checkpoints) {
          submissions.push({
            factoryId: ins.factoryId,
            inspectionId: ins.id,
            checkpointId: checkpoint.id,
          });
        }
      }

      if (submissions.length > 0) {
        await prisma.checkpointSubmission.createMany({
          data: submissions
        });
        console.log(`Upgraded inspection ${ins.id} to ${submissions.length} checkpoints successfully.`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
