import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sections = await prisma.templateSection.findMany({
    include: { checkpoints: true }
  });

  for (const s of sections) {
    if (s.title === "Material & Stitching") {
      await prisma.templateSection.update({
        where: { id: s.id },
        data: { titleHi: "सामग्री और सिलाई" }
      });
      for (const cp of s.checkpoints) {
        if (cp.name.includes("No visible tears")) {
          await prisma.checkpoint.update({
            where: { id: cp.id },
            data: { nameHi: "लेदर पर कोई खरोंच या फटन नहीं", instructionsHi: "लेदर को ध्यान से देखें" }
          });
        }
        if (cp.name.includes("Stitching is uniform")) {
          await prisma.checkpoint.update({
            where: { id: cp.id },
            data: { nameHi: "सिलाई बिना ढीले धागों के एक समान है", instructionsHi: "सिलाई की जांच करें" }
          });
        }
      }
    }
    if (s.title === "Fit & Finish") {
      await prisma.templateSection.update({
        where: { id: s.id },
        data: { titleHi: "फिट और फिनिश" }
      });
      for (const cp of s.checkpoints) {
        if (cp.name.includes("Measurements match")) {
          await prisma.checkpoint.update({
            where: { id: cp.id },
            data: { nameHi: "माप वाहन के विनिर्देशों से मेल खाते हैं", instructionsHi: "मापें और पुष्टि करें" }
          });
        }
        if (cp.name.includes("Photo of completed set")) {
          await prisma.checkpoint.update({
            where: { id: cp.id },
            data: { nameHi: "तैयार सेट की फोटो", instructionsHi: "चौड़े कोण वाली फोटो लें" }
          });
        }
      }
    }
  }
  console.log("Updated checkpoints with Hindi translations");
}

main().catch(console.error).finally(() => prisma.$disconnect());
