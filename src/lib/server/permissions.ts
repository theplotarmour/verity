import "server-only";

import prisma from "@/lib/prisma";
import { SystemRole } from "@prisma/client";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  can,
  type Permission,
  type PermissionMatrix,
} from "@/lib/permissions";

// The permission matrix is admin-editable and lives in Factory.settings.permissions,
// the same JSON blob that already holds themeColor. Anything not stored falls
// back to the code defaults.

export async function getPermissionMatrix(factoryId: string): Promise<PermissionMatrix> {
  const factory = await prisma.factory.findUnique({
    where: { id: factoryId },
    select: { settings: true },
  });
  return sanitizeMatrix((factory?.settings as any)?.permissions);
}

// Never trust what's in the JSON column: drop unknown roles and permissions so a
// hand-edited or stale blob can't widen access.
export function sanitizeMatrix(raw: unknown): PermissionMatrix {
  if (!raw || typeof raw !== "object") return {};
  const roles = Object.keys(DEFAULT_ROLE_PERMISSIONS) as SystemRole[];
  const out: PermissionMatrix = {};
  for (const role of roles) {
    const value = (raw as Record<string, unknown>)[role];
    if (!Array.isArray(value)) continue;
    out[role] = value.filter((p): p is Permission => ALL_PERMISSIONS.includes(p as Permission));
  }
  return out;
}

// Server-side gate that honours the factory's saved matrix.
export async function canUser(
  user: { role: SystemRole; factoryId: string } | null | undefined,
  action: Permission
): Promise<boolean> {
  if (!user) return false;
  const matrix = await getPermissionMatrix(user.factoryId);
  return can(user, action, matrix);
}
