import type { PermissionScope, PermissionVerb } from "@prisma/client";
import type { ActorContext } from "./command";
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
 * All three layers of the model are implemented here:
 *
 *   Layer 1 (PLA-AUT-003) — may this role touch this entity type at all?
 *   Layer 2 (PLA-AUT-004) — does this particular record fall inside the actor's
 *                           membership scope?
 *   Layer 3 (PLA-AUT-005) — which fields of it may they see?
 *
 * They are separate because they fail differently. Layer 1 rejects a request
 * outright, Layer 2 narrows which rows exist for this actor, and Layer 3 removes
 * attributes from rows they are otherwise entitled to. Collapsing them would
 * force one answer where three are needed.
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

/* ------------------------------------------------------------------------- *
 * Layer 2 — row-level scoping (PLA-AUT-004)
 * ------------------------------------------------------------------------- */

/**
 * Resolves which records of a scope kind an actor can reach.
 *
 * The platform owns the `PermissionScope` values (PLA-AUT-002) but does not own
 * every axis they scope along. `Location` is defined by the specification and
 * implemented by the Location capability, so the platform must be able to
 * evaluate a Location-scoped grant without importing that capability. A
 * capability registers a resolver for its axis; without one the scope resolves
 * to nothing rather than to everything.
 */
export type ScopeResolver = (
  tx: TenantScopedClient,
  actor: ActorContext,
) => Promise<string[]>;

const scopeResolvers = new Map<PermissionScope, ScopeResolver>();

export function registerScopeResolver(scope: PermissionScope, resolver: ScopeResolver): void {
  scopeResolvers.set(scope, resolver);
}

export function clearScopeResolvers(): void {
  scopeResolvers.clear();
}

/**
 * Ids reachable on a non-organization axis, or null when no capability has
 * registered a resolver for it.
 *
 * Null means "cannot be evaluated" and callers must treat it as reaching
 * nothing. Returning an empty array would be indistinguishable from a resolver
 * that legitimately found no rows.
 */
export async function resolveScopeAxis(
  tx: TenantScopedClient,
  actor: ActorContext,
  scope: PermissionScope,
): Promise<string[] | null> {
  const resolver = scopeResolvers.get(scope);
  if (!resolver) return null;
  return resolver(tx, actor);
}

/**
 * The organizations a grant lets an actor reach.
 *
 * `Tenant` reaches every organization in the tenant. `Organization` reaches the
 * actor's own node and its descendants — PLA-ORG-002 gives a regional manager
 * visibility downward, while PLA-ORG-003 keeps a branch worker out of sibling
 * branches, and a subtree expresses both at once.
 *
 * `Location` returns null: Location does not exist as an entity yet, so a
 * Location-scoped grant cannot be evaluated. Returning null makes such a grant
 * reach nothing rather than silently widening to the whole tenant, which is the
 * failure that would matter.
 */
export async function scopeOrganizations(
  tx: TenantScopedClient,
  actor: ActorContext,
  scope: PermissionScope,
): Promise<string[] | null> {
  switch (scope) {
    case "Tenant": {
      const rows = await tx.$queryRaw<{ organization_id: string }[]>`
        SELECT organization_id FROM verity.tenant_organizations()`;
      return rows.map((r) => r.organization_id);
    }
    case "Organization": {
      if (!actor.organizationId) return [];
      const rows = await tx.$queryRaw<{ organization_id: string }[]>`
        SELECT organization_id FROM verity.organization_subtree(${actor.organizationId}::uuid)`;
      return rows.map((r) => r.organization_id);
    }
    case "Location":
      // Location is not an organization axis. Resolution belongs to whichever
      // capability owns Location; the caller reads it via resolveScopeAxis.
      return null;
    case "Global":
      // Never granted; resolve_permissions filters Global out before this point.
      return [];
  }
}

/**
 * Every organization this actor may reach for a given verb on an entity,
 * across all their grants.
 *
 * A role can hold the same verb at more than one scope; the actor reaches the
 * union, since a narrower grant should never subtract from a broader one.
 */
export async function reachableOrganizations(
  tx: TenantScopedClient,
  actor: ActorContext,
  verb: PermissionVerb,
  entity: string,
): Promise<{ organizationIds: string[]; unresolvedScopes: PermissionScope[] }> {
  if (!actor.roleId) return { organizationIds: [], unresolvedScopes: [] };

  const grants = (await resolvePermissions(tx, actor.roleId)).filter(
    (p) => p.entity === entity && p.verb === verb,
  );

  const reachable = new Set<string>();
  const unresolved: PermissionScope[] = [];

  for (const grant of grants) {
    const ids = await scopeOrganizations(tx, actor, grant.scope);
    if (ids === null) unresolved.push(grant.scope);
    else ids.forEach((id) => reachable.add(id));
  }

  return { organizationIds: [...reachable], unresolvedScopes: unresolved };
}

/**
 * A Prisma filter restricting a query to rows the actor may see.
 *
 * Applied in addition to RLS, never instead of it: RLS stops another tenant's
 * rows, this stops rows inside the tenant that are outside the actor's branch.
 */
export async function scopeFilter(
  tx: TenantScopedClient,
  actor: ActorContext,
  entity: string,
  verb: PermissionVerb = "Read",
): Promise<{ organizationId: { in: string[] } }> {
  const { organizationIds } = await reachableOrganizations(tx, actor, verb, entity);
  return { organizationId: { in: organizationIds } };
}

/**
 * Locations this actor may reach for a verb on an entity.
 *
 * Empty when the role holds no Location-scoped grant, and empty when it holds
 * one but no capability has registered a resolver — an unevaluable grant must
 * reach nothing.
 */
export async function reachableLocations(
  tx: TenantScopedClient,
  actor: ActorContext,
  verb: PermissionVerb,
  entity: string,
): Promise<string[]> {
  if (!actor.roleId) return [];

  const hasLocationGrant = (await resolvePermissions(tx, actor.roleId)).some(
    (p) => p.entity === entity && p.verb === verb && p.scope === "Location",
  );
  if (!hasLocationGrant) return [];

  return (await resolveScopeAxis(tx, actor, "Location")) ?? [];
}

/**
 * Layer 2 gate for a single record (PLA-AUT-004).
 *
 * Throws `ForbiddenError` when the record's organization falls outside the
 * actor's scope. A record with no organization is treated as tenant-wide and
 * needs a Tenant-scoped grant, because an unscoped record must not become
 * universally visible by omission.
 */
export async function assertRowInScope(
  tx: TenantScopedClient,
  actor: ActorContext,
  entity: string,
  verb: PermissionVerb,
  row: { organizationId?: string | null; locationId?: string | null },
): Promise<void> {
  const { organizationIds } = await reachableOrganizations(tx, actor, verb, entity);

  // PLA-AUT-004 scopes on organization_id *or* location_id. A Location-scoped
  // grant admits the record on its own, so it is checked before the
  // organization axis rather than in addition to it.
  if (row.locationId) {
    const locations = await reachableLocations(tx, actor, verb, entity);
    if (locations.includes(row.locationId)) return;
  }

  if (!row.organizationId) {
    const grants = actor.roleId ? await resolvePermissions(tx, actor.roleId) : [];
    const tenantWide = grants.some(
      (g) => g.entity === entity && g.verb === verb && g.scope === "Tenant",
    );
    if (tenantWide) return;
    throw new ForbiddenError(
      `E_FORBIDDEN: ${entity} record is not scoped to an organization and the role holds no Tenant-scoped ${verb} grant`,
    );
  }

  if (!organizationIds.includes(row.organizationId)) {
    throw new ForbiddenError(
      `E_FORBIDDEN: ${entity} record in organization ${row.organizationId} is outside the actor's scope`,
    );
  }
}

/* ------------------------------------------------------------------------- *
 * Layer 3 — field-level scoping (PLA-AUT-005)
 * ------------------------------------------------------------------------- */

/** Field-qualified entity key used to grant access to a restricted field. */
export function fieldGrantKey(entityKey: string, fieldName: string): string {
  return `${entityKey}#${fieldName}`;
}

/**
 * Removes restricted fields the actor may not read (PLA-AUT-005).
 *
 * Fields are *omitted*, not nulled. A null is indistinguishable from a real
 * absent value, so a caller could not tell "you may not see this" from "there is
 * nothing here" — and a UI would render an empty billing rate as though it were
 * zero.
 */
export async function redactFields<T extends Record<string, unknown>>(
  tx: TenantScopedClient,
  actor: ActorContext,
  entityKey: string,
  rows: T[],
): Promise<Array<Partial<T>>> {
  const restricted = await tx.fieldPermission.findMany({ where: { entityKey } });
  if (restricted.length === 0) return rows;

  const permitted = new Set<string>();
  for (const field of restricted) {
    if (await hasPermission(tx, actor.roleId, "Read", fieldGrantKey(entityKey, field.fieldName))) {
      permitted.add(field.fieldName);
    }
  }

  const strip = restricted.map((f) => f.fieldName).filter((name) => !permitted.has(name));
  if (strip.length === 0) return rows;

  return rows.map((row) => {
    const copy: Record<string, unknown> = { ...row };
    for (const field of strip) delete copy[field];
    return copy as Partial<T>;
  });
}
