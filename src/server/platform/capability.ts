import type { ConfigScope } from "@prisma/client";
import { withTenant, type TenantScopedClient } from "./tenancy";

/**
 * Capability registry, activation and configuration.
 *
 * Authority: Spec PLA-CAP-001→004 (registration, activation, dependency
 * resolution, in-memory verification), PLA-CFG-001 (configuration scopes),
 * PLA-VER-002→003 (capability versioning and pinning).
 *
 * This is the layer the foundation-ready conditions turn on: a capability
 * registers itself, is activated per tenant with its dependencies checked, and
 * is gated at the command and query pipelines. Nothing in the platform core
 * needs to change when a new one appears.
 */

export class CapabilityError extends Error {
  readonly code = "E_CAPABILITY_INACTIVE" as const;
  constructor(message: string) {
    super(message);
    this.name = "CapabilityError";
  }
}

/**
 * Per-tenant activation cache.
 *
 * PLA-CAP-004 forbids a synchronous database query on every routing decision,
 * so the active set is held in memory and invalidated on change. The cache is
 * keyed by tenant because activation is a tenant-level fact; a shared global
 * cache would leak one tenant's enabled capabilities into another's routing.
 */
const activeCache = new Map<string, Set<string>>();

export function invalidateCapabilityCache(tenantId?: string): void {
  if (tenantId) activeCache.delete(tenantId);
  else activeCache.clear();
}

async function loadActive(tx: TenantScopedClient, tenantId: string): Promise<Set<string>> {
  const rows = await tx.tenantActivation.findMany({
    where: { status: "Active" },
    select: { capabilityId: true },
  });
  const set = new Set(rows.map((r) => r.capabilityId));
  activeCache.set(tenantId, set);
  return set;
}

/** True when the capability is active for the tenant. Cached (PLA-CAP-004). */
export async function isCapabilityActive(
  tx: TenantScopedClient,
  tenantId: string,
  capabilityId: string,
): Promise<boolean> {
  const cached = activeCache.get(tenantId) ?? (await loadActive(tx, tenantId));
  return cached.has(capabilityId);
}

/**
 * Blocks work belonging to an inactive capability (PLA-CAP-002).
 *
 * "Fully hidden and blocked" has to mean blocked at the execution path, not
 * merely absent from a menu: a capability that is invisible in the UI but still
 * reachable by API has not been deactivated.
 */
export async function requireCapabilityActive(
  tx: TenantScopedClient,
  tenantId: string,
  capabilityId: string,
): Promise<void> {
  if (!(await isCapabilityActive(tx, tenantId, capabilityId))) {
    throw new CapabilityError(
      `E_CAPABILITY_INACTIVE: ${capabilityId} is not active for this tenant`,
    );
  }
}

/**
 * Activates a capability for the current tenant.
 *
 * Dependency validation (PLA-CAP-003) is enforced by a database trigger, not
 * here, so no other write path can bypass it. This function pins the version
 * (PLA-VER-003) so a later platform upgrade cannot silently change behaviour a
 * tenant already depends on.
 */
export async function activateCapability(
  tx: TenantScopedClient,
  tenantId: string,
  capabilityId: string,
): Promise<void> {
  const definition = await tx.capabilityDefinition.findUnique({ where: { id: capabilityId } });
  if (!definition) throw new CapabilityError(`Unknown capability: ${capabilityId}`);

  await tx.tenantActivation.upsert({
    where: { tenantId_capabilityId: { tenantId, capabilityId } },
    create: {
      tenantId,
      capabilityId,
      status: "Active",
      pinnedVersion: definition.version,
    },
    update: { status: "Active", pinnedVersion: definition.version },
  });
  invalidateCapabilityCache(tenantId);
}

/** Suspends a capability. Refused by trigger if others still depend on it. */
export async function suspendCapability(
  tx: TenantScopedClient,
  tenantId: string,
  capabilityId: string,
): Promise<void> {
  await tx.tenantActivation.update({
    where: { tenantId_capabilityId: { tenantId, capabilityId } },
    data: { status: "Suspended" },
  });
  invalidateCapabilityCache(tenantId);
}

/** The capability that owns an entity, via the entity registry. */
export async function capabilityForEntity(
  tx: TenantScopedClient,
  entityKey: string,
): Promise<string | null> {
  const def = await tx.entityDefinition.findUnique({
    where: { key: entityKey },
    select: { capability: true },
  });
  return def?.capability ?? null;
}

/**
 * Resolves a configuration value by precedence (PLA-CFG-001).
 *
 * Narrowest wins: User, then Organization, then Tenant, then Global. Returns the
 * first match rather than merging, because a partially-overridden value is
 * ambiguous — a branch that overrides a setting means to replace it, not to
 * blend it with the tenant default.
 */
export async function resolveConfig<T = unknown>(
  tx: TenantScopedClient,
  key: string,
  scope: { userId?: string | null; organizationId?: string | null } = {},
): Promise<T | undefined> {
  const candidates: Array<{ scope: ConfigScope; scopeId: string | null }> = [];
  if (scope.userId) candidates.push({ scope: "User", scopeId: scope.userId });
  if (scope.organizationId) candidates.push({ scope: "Organization", scopeId: scope.organizationId });
  candidates.push({ scope: "Tenant", scopeId: null });
  candidates.push({ scope: "Global", scopeId: null });

  for (const candidate of candidates) {
    const row = await tx.configParameter.findFirst({
      where: { key, scope: candidate.scope, scopeId: candidate.scopeId },
    });
    if (row) return row.value as T;
  }
  return undefined;
}

/** Writes a configuration value at one scope. Global is not tenant-writable. */
export async function setConfig(
  tx: TenantScopedClient,
  tenantId: string,
  key: string,
  value: unknown,
  scope: ConfigScope = "Tenant",
  scopeId: string | null = null,
): Promise<void> {
  const existing = await tx.configParameter.findFirst({ where: { key, scope, scopeId } });
  if (existing) {
    await tx.configParameter.update({ where: { id: existing.id }, data: { value: value as never } });
  } else {
    await tx.configParameter.create({
      data: { tenantId, key, value: value as never, scope, scopeId },
    });
  }
}

/** Convenience wrapper for callers outside a transaction. */
export async function withCapabilityCheck<T>(
  tenantId: string,
  capabilityId: string,
  fn: (tx: TenantScopedClient) => Promise<T>,
): Promise<T> {
  return withTenant(tenantId, async (tx) => {
    await requireCapabilityActive(tx, tenantId, capabilityId);
    return fn(tx);
  });
}
