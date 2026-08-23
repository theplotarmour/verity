import type { PermissionScope, PermissionVerb } from "@prisma/client";
import type { TenantScopedClient } from "./tenancy";

/**
 * Authorization engine.
 *
 * Authority: Spec PLA-AUT-001→005, MET-ACT-002 ("the engine matches the actor's
 * active role and membership scope against the permission matrix; if
 * unauthorized, execution aborts with E_FORBIDDEN"), Bible Synthesis ADOPTED
 * (Keycloak composite roles flattened to runtime permission bits), Bible V2
 * Primitive 2 §13 (access is defined at the membership level).
 *
 * Scope of this module: Layer 1 of the three-tier model — entity-level checks
 * (PLA-AUT-003). Layer 2 (row-level scoping, PLA-AUT-004) and Layer 3
 * (field-level stripping, PLA-AUT-005) need a command pipeline to hook into and
 * are built with it; the `scope` on each grant is carried through here so those
 * layers have what they need, but nothing evaluates it yet. Do not mistake a
 * passing Layer 1 check for a complete authorization decision.
 */

export type ResolvedPermission = {
  verb: PermissionVerb;
  entity: string;
  scope: PermissionScope;
};

/** Raised when a check fails. `code` matches the spec's `E_FORBIDDEN`. */
export class ForbiddenError extends Error {
  readonly code = "E_FORBIDDEN" as const;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Flat permission set for a role, including everything inherited transitively
 * through composite roles.
 *
 * Resolution runs in the database (`verity.resolve_permissions`) because the
 * inheritance walk is a recursive query and the result must respect the same RLS
 * boundary as every other read. `Global`-scope grants are excluded there — see
 * the migration for why.
 */
export async function resolvePermissions(
  tx: TenantScopedClient,
  roleId: string,
): Promise<ResolvedPermission[]> {
  return tx.$queryRaw<ResolvedPermission[]>`
    SELECT verb, entity, scope FROM verity.resolve_permissions(${roleId}::uuid)
  `;
}

/**
 * Layer 1 check: does this role hold `verb` on `entity`?
 *
 * A membership with no role resolves to no permissions, so an unassigned
 * membership is denied rather than defaulted to access.
 */
export async function hasPermission(
  tx: TenantScopedClient,
  roleId: string | null | undefined,
  verb: PermissionVerb,
  entity: string,
): Promise<boolean> {
  if (!roleId) return false;
  const rows = await tx.$queryRaw<{ ok: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM verity.resolve_permissions(${roleId}::uuid) r
      WHERE r.verb = ${verb}::"PermissionVerb" AND r.entity = ${entity}
    ) AS ok
  `;
  return rows[0]?.ok ?? false;
}

/**
 * Layer 1 gate. Throws `ForbiddenError` when the role lacks the permission.
 *
 * MET-ACT-002 requires every command to pass an authorization check before
 * execution; this is the call that satisfies it. It throws rather than returning
 * false so that forgetting to branch on the result cannot silently permit the
 * operation.
 */
export async function authorize(
  tx: TenantScopedClient,
  roleId: string | null | undefined,
  verb: PermissionVerb,
  entity: string,
): Promise<void> {
  if (!(await hasPermission(tx, roleId, verb, entity))) {
    throw new ForbiddenError(
      `E_FORBIDDEN: role ${roleId ?? "<none>"} may not ${verb} ${entity}`,
    );
  }
}
