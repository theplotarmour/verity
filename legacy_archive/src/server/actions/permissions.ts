"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { getPermissionMatrix, sanitizeMatrix } from "@/lib/server/permissions";
import { can, DEFAULT_ROLE_PERMISSIONS, type PermissionMatrix } from "@/lib/permissions";

export async function getFactoryPermissionMatrix() {
  const user = await getOwnerUser();
  if (!user) return {};
  return getPermissionMatrix(user.factoryId);
}

// Only someone who can already assign roles may change what roles can do, and
// the owner role always keeps its full set so a factory cannot lock itself out.
export async function savePermissionMatrix(matrix: PermissionMatrix) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const current = await getPermissionMatrix(user.factoryId);
  if (!can(user, "ASSIGN_ROLES", current)) return { error: "Unauthorized" };

  const clean = sanitizeMatrix(matrix);
  clean.OWNER = DEFAULT_ROLE_PERMISSIONS.OWNER;

  const factory = await prisma.factory.findUnique({
    where: { id: user.factoryId },
    select: { settings: true },
  });
  const settings = ((factory?.settings as any) || {}) as Record<string, unknown>;

  await prisma.factory.update({
    where: { id: user.factoryId },
    data: { settings: { ...settings, permissions: clean } as any },
  });

  revalidatePath("/owner", "layout");
  return { success: true };
}
