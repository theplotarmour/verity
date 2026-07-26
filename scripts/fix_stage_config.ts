/**
 * One-off correction of stage configuration.
 *
 * Two defaults were wrong and had already been written into existing rows:
 *
 *   1. Checkpoint.requireImage defaulted to TRUE, so checkpoints nobody had
 *      configured silently demanded a photo and refused the submission. Photos
 *      are now opt-in; this clears the flag on the department operating
 *      checklists (QC templates are left alone — photos there are real evidence).
 *
 *   2. Department.requiresApproval defaulted to FALSE, so a worker completing a
 *      stage advanced the job straight to the next department with no
 *      supervisor sign-off. The intended flow is worker submits → supervisor
 *      approves → next department, so every non-QC department opts in.
 *      (QC keeps its own inspection review flow.)
 *
 * Run once:  npx tsx scripts/fix_stage_config.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const factory = await prisma.factory.findFirst({ orderBy: { createdAt: "asc" } });
  if (!factory) throw new Error("No factory found.");
  const factoryId = factory.id;
  console.log(`Correcting stage config for: ${factory.name}\n`);

  // ---- 1. Supervisor sign-off on every non-QC department -------------------
  const depts = await prisma.department.findMany({
    where: { factoryId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, isQcStage: true, requiresApproval: true, templateId: true },
  });

  let approvalOn = 0;
  for (const d of depts) {
    if (d.isQcStage || d.requiresApproval) continue;
    await prisma.department.update({ where: { id: d.id }, data: { requiresApproval: true } });
    console.log(`  ✓ ${d.name}: now requires supervisor approval`);
    approvalOn++;
  }

  // Warn where approval is on but nobody can grant it.
  for (const d of depts) {
    if (d.isQcStage) continue;
    const supervisors = await prisma.user.count({
      where: { factoryId, departmentId: d.id, role: "SUPERVISOR", isActive: true },
    });
    if (supervisors === 0) {
      console.log(`  ! ${d.name} has no supervisor — submissions there can only be approved by an owner/manager`);
    }
  }

  // ---- 2. Photos opt-in on department operating checklists -----------------
  // Only the templates attached to a non-QC department; QC templates keep their
  // photo requirements because that evidence is the point of the inspection.
  const deptTemplateIds = depts.filter((d) => !d.isQcStage && d.templateId).map((d) => d.templateId!) as string[];

  let photosRelaxed = 0;
  if (deptTemplateIds.length > 0) {
    const res = await prisma.checkpoint.updateMany({
      where: { factoryId, requireImage: true, section: { templateId: { in: deptTemplateIds } } },
      data: { requireImage: false },
    });
    photosRelaxed = res.count;
    if (photosRelaxed > 0) console.log(`  ✓ cleared the photo requirement on ${photosRelaxed} department-checklist checkpoint(s)`);
  }

  // ---- Summary -------------------------------------------------------------
  const [needApproval, stillRequiringPhoto] = await Promise.all([
    prisma.department.count({ where: { factoryId, isQcStage: false, requiresApproval: true } }),
    prisma.checkpoint.count({ where: { factoryId, requireImage: true } }),
  ]);
  console.log(`\nDone. approvalEnabled=+${approvalOn} photosRelaxed=${photosRelaxed}`);
  console.log(`  non-QC departments requiring approval: ${needApproval}`);
  console.log(`  checkpoints still requiring a photo (QC evidence): ${stillRequiringPhoto}`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
