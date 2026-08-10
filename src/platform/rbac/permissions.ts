import "server-only";

import { cache } from "react";

import prisma from "@/lib/prisma";
import { cached, invalidate } from "@/lib/server/ttl-cache";
import { type ModuleKey, allPermissions, moduleForPermission } from "@/platform/modules/registry";
import { entitledModules } from "@/platform/modules/entitlements";

/**
 * Permission resolution.
 *
 * The old model was a hardcoded 15-value TypeScript union mapped from a closed
 * Role enum, so a tenant could not have a custom role and a new module could
 * not add a permission without an edit here. Now:
 *
 *   modules contribute permission keys  →  roles grant them  →  users hold a role
 *
 * A grant only counts if the contributing module is also entitled. That means
 * revoking a module immediately revokes its permissions, without having to
 * rewrite anybody's role.
 */

export interface ResolvedAccess {
  organizationId: string;
  roleId: string | null;
  permissions: Set<string>;
  modules: ModuleKey[];
}

export const resolveAccess = cache(async function resolveAccess(
  userId: string,
): Promise<ResolvedAccess | null> {
  const user = await cached(`access-user:${userId}`, 30_000, () =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        roleId: true,
        factory: { select: { organizationId: true } },
        customRole: { select: { permissions: { select: { key: true } } } },
      },
    }),
  );
  if (!user) return null;

  const organizationId = user.factory.organizationId;
  const modules = await entitledModules(organizationId);
  const entitled = new Set<string>(modules);

  const granted = user.customRole?.permissions.map((p) => p.key) ?? [];
  const effective = granted.filter((key) => {
    const owner = moduleForPermission(key);
    // A key no module claims is stale — drop it rather than honour it.
    return owner !== undefined && entitled.has(owner.key);
  });

  return {
    organizationId,
    roleId: user.roleId,
    permissions: new Set(effective),
    modules,
  };
});

export function can(access: ResolvedAccess | null, permission: string): boolean {
  return access?.permissions.has(permission) ?? false;
}

/** Throws unless the user holds the permission. Use at the top of a server action. */
export async function requirePermission(userId: string, permission: string): Promise<ResolvedAccess> {
  const access = await resolveAccess(userId);
  if (!can(access, permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }
  return access!;
}

/**
 * The permission keys selectable for an org — the catalogue its roles can grant.
 * Narrowed to entitled modules so the matrix never offers a permission that
 * would be filtered out at resolve time.
 */
export async function selectablePermissions(organizationId: string) {
  const modules = new Set<string>(await entitledModules(organizationId));
  return allPermissions().filter((p) => {
    const owner = moduleForPermission(p.key);
    return owner !== undefined && modules.has(owner.key);
  });
}


/** Drop a user's cached grants — call after changing their role or its keys. */
export function invalidateAccess(userId: string): void {
  invalidate(`access-user:${userId}`);
}
