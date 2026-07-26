import prisma from "@/lib/prisma";

type Db = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Departments ARE the production chain. The default route mirrors the physical
// floor: CAD produces the pattern, then Cutting → Stitching → QC → Packing.
// Each is a stage the owner can reconfigure, reorder, template and staff.
export const DEFAULT_DEPARTMENTS = [
  { name: "CAD", sortOrder: 0, requirePhoto: false, requireRemarks: false, isQcStage: false },
  { name: "Cutting", sortOrder: 1, requirePhoto: true, requireRemarks: false, isQcStage: false },
  { name: "Stitching", sortOrder: 2, requirePhoto: true, requireRemarks: false, isQcStage: false },
  { name: "Quality Check", sortOrder: 3, requirePhoto: false, requireRemarks: false, isQcStage: true },
  { name: "Packing", sortOrder: 4, requirePhoto: true, requireRemarks: false, isQcStage: false },
] as const;

const DEFAULT_NAMES = DEFAULT_DEPARTMENTS.map((d) => d.name.toLowerCase());

// Ensures the factory's ordered department chain exists, seeding the default
// route the first time it's needed. Existing departments are respected (their
// config isn't clobbered); only missing defaults are created. The legacy
// auto-created "Production" placeholder department is retired (deactivated) once
// a real chain exists, so it stops appearing as an empty stage — its historical
// job cards keep resolving through the still-present row.
export async function ensureFactoryDepartments(db: Db, factoryId: string) {
  const existing = await db.department.findMany({ where: { factoryId } });
  const byName = new Map(existing.map((d) => [d.name.toLowerCase(), d]));

  for (const d of DEFAULT_DEPARTMENTS) {
    if (!byName.has(d.name.toLowerCase())) {
      await db.department.create({
        data: {
          factoryId,
          name: d.name,
          sortOrder: d.sortOrder,
          requirePhoto: d.requirePhoto,
          requireRemarks: d.requireRemarks,
          isQcStage: d.isQcStage,
          active: true,
        },
      });
    }
  }

  // Retire the placeholder "Production" department that older orders auto-created.
  const placeholder = existing.find((d) => d.name.toLowerCase() === "production" && !DEFAULT_NAMES.includes("production"));
  if (placeholder && placeholder.active) {
    await db.department.update({ where: { id: placeholder.id }, data: { active: false } });
  }

  return db.department.findMany({
    where: { factoryId, active: true },
    orderBy: { sortOrder: "asc" },
  });
}
