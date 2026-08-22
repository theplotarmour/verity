"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardDelete } from "@/lib/server/prisma-errors";
import { ensureFactoryDepartments } from "@/lib/server/departments";
import { revalidatePath } from "next/cache";

function revalidateDeptPaths() {
  revalidatePath("/owner/departments");
  revalidatePath("/owner/floor");
  revalidatePath("/owner/production");
}

// Everything the Departments page needs: the ordered chain (with template name,
// member roster and live job-card count), the full user list to staff from, and
// the templates available to attach.
export async function getDepartmentsData() {
  const user = await getOwnerUser();
  if (!user) return { departments: [], users: [], templates: [] };

  // Seed the default chain the first time the page is opened.
  await ensureFactoryDepartments(prisma, user.factoryId);

  const [departments, users, templates] = await Promise.all([
    prisma.department.findMany({
      where: { factoryId: user.factoryId },
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
      include: {
        /*
         * Every checklist dedicated to this department, so the settings page
         * answers "what actually runs here?" without opening the builder. The
         * per-category coverage it also listed came from item groups, which
         * went with the spec engine.
         */
        ownedTemplates: {
          where: { status: "active" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
        members: { select: { id: true, name: true, role: true }, orderBy: { name: "asc" } },
      },
    }),
    prisma.user.findMany({
      where: { factoryId: user.factoryId, isActive: true },
      select: { id: true, name: true, role: true, departmentId: true },
      orderBy: { name: "asc" },
    }),
    prisma.checklistTemplate.findMany({
      where: { factoryId: user.factoryId, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { departments, users, templates };
}

export async function createDepartment(input: {
  name: string;
  description?: string;
  isQcStage?: boolean;
  requirePhoto?: boolean;
  requireRemarks?: boolean;
  requiresApproval?: boolean;
  templateId?: string | null;
}) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  if (!input.name?.trim()) return { error: "Name is required" };

  // New department joins the end of the chain.
  const last = await prisma.department.findFirst({
    where: { factoryId: owner.factoryId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  try {
    const dept = await prisma.department.create({
      data: {
        factoryId: owner.factoryId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        isQcStage: input.isQcStage ?? false,
        requirePhoto: input.requirePhoto ?? false,
        requireRemarks: input.requireRemarks ?? false,
        requiresApproval: input.requiresApproval ?? false,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        active: true,
      },
    });
    revalidateDeptPaths();
    return { success: true, department: dept };
  } catch {
    return { error: "A department with this name already exists" };
  }
}

export async function updateDepartment(
  id: string,
  patch: {
    name?: string;
    description?: string;
    isQcStage?: boolean;
    requirePhoto?: boolean;
    requireRemarks?: boolean;
    requiresApproval?: boolean;
    templateId?: string | null;
    active?: boolean;
  }
) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  const existing = await prisma.department.findFirst({ where: { id, factoryId: owner.factoryId } });
  if (!existing) return { error: "Department not found" };

  try {
    await prisma.department.update({
      where: { id },
      data: {
        name: patch.name?.trim() ?? existing.name,
        description: patch.description !== undefined ? patch.description.trim() || null : existing.description,
        isQcStage: patch.isQcStage ?? existing.isQcStage,
        requirePhoto: patch.requirePhoto ?? existing.requirePhoto,
        requireRemarks: patch.requireRemarks ?? existing.requireRemarks,
        requiresApproval: patch.requiresApproval ?? existing.requiresApproval,
        active: patch.active ?? existing.active,
      },
    });
    revalidateDeptPaths();
    return { success: true };
  } catch {
    return { error: "A department with this name already exists" };
  }
}


// Persist a new chain order. The array is department ids in the desired sequence.
export async function reorderDepartments(orderedIds: string[]) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.department.updateMany({
        where: { id, factoryId: owner.factoryId },
        data: { sortOrder: index },
      })
    )
  );
  revalidateDeptPaths();
  return { success: true };
}

export async function deleteDepartment(id: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  /*
   * A department with live job cards used to be deactivated rather than
   * deleted, so its history survived. Job cards went with the manufacturing
   * module, and no other record points at a department, so a delete is now
   * safe outright.
   */

  // Detach roster + any historical cards before deleting the row.
  await prisma.user.updateMany({ where: { departmentId: id }, data: { departmentId: null } });
  const result = await guardDelete("department", () =>
    prisma.department.delete({ where: { id, factoryId: owner.factoryId } })
  );
  if ("error" in result) {
    // Still referenced (historical job cards) — deactivate rather than error out.
    await prisma.department.update({ where: { id }, data: { active: false } });
    revalidateDeptPaths();
    return { success: true, deactivated: true };
  }
  revalidateDeptPaths();
  return { success: true };
}

// Roster: a worker or inspector belongs to exactly one department.
export async function addDepartmentMember(departmentId: string, userId: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  const dept = await prisma.department.findFirst({ where: { id: departmentId, factoryId: owner.factoryId } });
  if (!dept) return { error: "Department not found" };
  await prisma.user.update({
    where: { id: userId },
    data: { departmentId },
  });
  revalidateDeptPaths();
  revalidatePath("/owner/team");
  return { success: true };
}

export async function removeDepartmentMember(userId: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  await prisma.user.update({ where: { id: userId }, data: { departmentId: null } });
  revalidateDeptPaths();
  revalidatePath("/owner/team");
  return { success: true };
}
