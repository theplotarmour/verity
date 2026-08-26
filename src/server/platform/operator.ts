import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { getAuthUser, resolveActor, setActiveMembership } from "./auth";
import { recordSecurityEvent } from "./audit";
import { withTenant } from "./tenancy";
import { ForbiddenError } from "./authorization";

/**
 * Global HQ operator authority.
 *
 * Authority: ADR-013 — Option D with identity Shape 1.
 *
 * THE SHAPE, IN ONE PARAGRAPH
 * An operator is not a new kind of principal. They are an ordinary Party and
 * User holding an ordinary `TenantMembership` in one tenant that happens to be
 * marked `isPlatform`, with an ordinary role granting an ordinary
 * `ActionExecute` permission. Everything about authentication, membership
 * switching, permission resolution and audit therefore works unchanged, which
 * is the entire reason this shape was chosen over an authority flag orthogonal
 * to tenancy: that would have been a second authorization model to keep in sync
 * with the first, and this codebase has already refused one of those.
 *
 * WHAT IS AND IS NOT CROSS-TENANT
 * Reads that span tenants go through exactly three read-only projections, each
 * a `SECURITY DEFINER` function with a pinned `search_path`, gated on
 * `verity.is_platform_operator`, returning metadata and counts — never a client
 * business row. They are listed in ADR-013 and adding a fourth is a deliberate
 * act, not a convenience.
 *
 * There is NO cross-tenant write. Entering a client sets the tenant scope to
 * that one client and then everything proceeds under the ordinary policies. A
 * mutation happens inside exactly one tenant or it does not happen.
 */

/** Permission key that makes a platform-tenant membership an operator one. */
export const OPERATOR_ENTITY = "verity.platform.operator";

export type OperatorContext = {
  authUserId: string;
  userId: string;
  /** The platform tenant. Never a client. */
  platformTenantId: string;
  membershipId: string;
  organizationId: string;
  roleId: string | null;
};

/**
 * The operator behind this request, or null.
 *
 * Two conditions, deliberately separate. `is_platform_operator` answers "does
 * this principal hold operator authority anywhere" — a question that crosses
 * tenants and therefore lives in the database. The second answers "are they
 * currently operating as one", by reading `is_platform` for the ACTIVE tenant
 * under that tenant's own scope, so the read is an ordinary policy-filtered
 * one.
 *
 * Requiring both is what stops operator authority from being ambient. An
 * operator who has switched into a client is, for that request, acting inside
 * the client — and HQ correctly refuses them until they switch back.
 */
export async function resolveOperator(): Promise<OperatorContext | null> {
  const [authUser, actor] = await Promise.all([getAuthUser(), resolveActor()]);
  if (!authUser || !actor) return null;

  const [granted] = await prisma.$queryRaw<{ ok: boolean }[]>`
    SELECT verity.is_platform_operator(${authUser.id}::uuid) AS ok`;
  if (!granted?.ok) return null;

  const activeIsPlatform = await withTenant(actor.tenantId, async (tx) => {
    const [row] = await tx.$queryRaw<{ is_platform: boolean }[]>`
      SELECT is_platform FROM tenant WHERE id = ${actor.tenantId}::uuid`;
    return row?.is_platform === true;
  });
  if (!activeIsPlatform) return null;

  return {
    authUserId: authUser.id,
    userId: actor.userId,
    platformTenantId: actor.tenantId,
    membershipId: actor.membershipId,
    organizationId: actor.organizationId,
    roleId: actor.roleId,
  };
}

/**
 * Resolves an operator or refuses.
 *
 * Throws rather than returning false, for the same reason `authorize()` does:
 * forgetting to branch on a boolean permits the action, and a permission check
 * that fails open is worse than none because it looks like one that works.
 *
 * A tenant user who reaches an HQ route is a security event, not merely a 403 —
 * D18 requires the boundary be observable, and Workflow D asserts it.
 */
export async function requireOperator(): Promise<OperatorContext> {
  const operator = await resolveOperator();
  if (operator) return operator;

  const actor = await resolveActor();
  if (actor) {
    // Recorded in the actor's OWN tenant, which is the only scope they have.
    await withTenant(actor.tenantId, (tx) =>
      recordSecurityEvent(tx, {
        tenantId: actor.tenantId,
        eventType: "AuthorizationDenied",
        actorUserId: actor.userId,
        payload: { reason: "operator_required", surface: "hq" },
      }),
    );
  }

  throw new ForbiddenError("E_FORBIDDEN: HQ requires platform operator authority");
}

/* ------------------------------------------------------------------------- *
 * The three cross-tenant projections. Read-only, enumerated, ADR-013.
 * ------------------------------------------------------------------------- */

export type ClientSummary = {
  tenantId: string;
  name: string;
  timeZone: string | null;
  createdAt: Date;
  memberCount: number;
  organizationCount: number;
};

/** Projection 1 — client metadata and counts. Never client business rows. */
export async function clientDirectory(operator: OperatorContext): Promise<ClientSummary[]> {
  const rows = await prisma.$queryRaw<
    {
      tenant_id: string; name: string; time_zone: string | null;
      created_at: Date; member_count: bigint; org_count: bigint;
    }[]
  >`SELECT * FROM verity.operator_client_directory(${operator.authUserId}::uuid)`;

  return rows.map((r) => ({
    tenantId: r.tenant_id,
    name: r.name,
    timeZone: r.time_zone,
    createdAt: r.created_at,
    memberCount: Number(r.member_count),
    organizationCount: Number(r.org_count),
  }));
}

export type ClientActivity = {
  tenantId: string;
  name: string;
  activity30d: number;
  securityEvents30d: number;
  lastActivityAt: Date | null;
};

/** Projection 2 — per-client counts for the operational view. */
export async function platformActivity(operator: OperatorContext): Promise<ClientActivity[]> {
  const rows = await prisma.$queryRaw<
    {
      tenant_id: string; name: string; activity_30d: bigint;
      security_events_30d: bigint; last_activity_at: Date | null;
    }[]
  >`SELECT * FROM verity.operator_platform_activity(${operator.authUserId}::uuid)`;

  return rows.map((r) => ({
    tenantId: r.tenant_id,
    name: r.name,
    activity30d: Number(r.activity_30d),
    securityEvents30d: Number(r.security_events_30d),
    lastActivityAt: r.last_activity_at,
  }));
}

export type PlatformAuditRow = {
  occurredAt: Date;
  tenantId: string;
  tenantName: string;
  entityKey: string;
  entityId: string;
  commandKey: string | null;
  fieldChanged: string;
  actorUserId: string | null;
  /** True when the actor holds platform-tenant membership — ADR-013 answer 12. */
  isOperator: boolean;
};

/** Projection 3 — audit metadata across tenants. No payload bodies. */
export async function platformAudit(
  operator: OperatorContext,
  limit = 100,
): Promise<PlatformAuditRow[]> {
  const rows = await prisma.$queryRaw<
    {
      occurred_at: Date; tenant_id: string; tenant_name: string; entity_key: string;
      entity_id: string; command_key: string | null; field_changed: string;
      actor_user_id: string | null; is_operator: boolean;
    }[]
  >`SELECT * FROM verity.operator_platform_audit(${operator.authUserId}::uuid, ${limit}::int)`;

  return rows.map((r) => ({
    occurredAt: r.occurred_at,
    tenantId: r.tenant_id,
    tenantName: r.tenant_name,
    entityKey: r.entity_key,
    entityId: r.entity_id,
    commandKey: r.command_key,
    fieldChanged: r.field_changed,
    actorUserId: r.actor_user_id,
    isOperator: r.is_operator,
  }));
}

/* ------------------------------------------------------------------------- *
 * Scope elevation — entering a client
 * ------------------------------------------------------------------------- */

/**
 * Creates a client: tenant, root organization, and the operator's own membership.
 *
 * Not routed through `executeCommand`, and the reason is structural rather than
 * a shortcut. `executeCommand` runs inside the ACTOR's tenant scope, and the
 * tenant policy's `WITH CHECK` requires the row's own id to equal the current
 * scope — so a command running in the platform tenant cannot insert a row for a
 * different tenant, by design. Provisioning sets the scope to the id being
 * created, which is the mechanism the init migration documented for exactly this
 * case. Authorization, audit and fail-closed behaviour are all still present;
 * only the pipeline differs, because the pipeline is tenant-shaped and this one
 * act creates the tenant.
 */
export async function createClient(input: {
  name: string;
  timeZone?: string | null;
}): Promise<{ tenantId: string; organizationId: string }> {
  const operator = await requireOperator();

  const name = input.name.trim();
  if (!name) throw new Error("E_VALIDATION: a client needs a name");

  const tenantId = randomUUID();

  const organizationId = await withTenant(tenantId, async (tx) => {
    await tx.tenant.create({
      data: { id: tenantId, name, timeZone: input.timeZone ?? null, isPlatform: false },
    });
    const organization = await tx.organization.create({
      data: { tenantId, name, parentId: null },
      select: { id: true },
    });

    const roleId = await operatorRoleFor(tx, tenantId);
    await tx.tenantMembership.create({
      data: { tenantId, userId: operator.userId, organizationId: organization.id, roleId },
    });

    await recordSecurityEvent(tx, {
      tenantId,
      eventType: "PermissionEscalated",
      actorUserId: operator.userId,
      payload: { reason: "client_created_by_operator", operator: true },
    });

    return organization.id;
  });

  return { tenantId, organizationId };
}

/**
 * Gives the operator a membership in one client and makes it the active one.
 *
 * This is the "authority to enter" of ADR-013, executed rather than asserted.
 * It is a WRITE, and it is deliberately not a cross-tenant one: the scope is set
 * to the single client being entered, and every statement below runs under that
 * client's own policies. What makes it privileged is not a bypass — there is
 * none — but the authorization check in front of it.
 *
 * Idempotent. An operator who has entered a client before re-enters through the
 * same membership rather than accumulating one per visit.
 */
export async function enterClient(tenantId: string): Promise<string> {
  const operator = await requireOperator();

  const membershipId = await withTenant(tenantId, async (tx) => {
    const [tenant] = await tx.$queryRaw<{ id: string; is_platform: boolean }[]>`
      SELECT id, is_platform FROM tenant WHERE id = ${tenantId}::uuid`;
    if (!tenant) throw new ForbiddenError("E_FORBIDDEN: no such client");
    // Entering the platform tenant "as a client" would blur exactly the
    // distinction D18 requires be kept.
    if (tenant.is_platform) throw new ForbiddenError("E_FORBIDDEN: the platform tenant is not a client");

    const existing = await tx.tenantMembership.findFirst({
      where: { tenantId, userId: operator.userId },
      select: { id: true },
    });
    if (existing) return existing.id;

    const organization = await tx.organization.findFirst({
      where: { tenantId, parentId: null },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!organization) throw new ForbiddenError("E_FORBIDDEN: client has no root organization");

    const role = await operatorRoleFor(tx, tenantId);

    const created = await tx.tenantMembership.create({
      data: { tenantId, userId: operator.userId, organizationId: organization.id, roleId: role },
      select: { id: true },
    });

    // The client's own audit trail records the visit, per QO-3: a privileged
    // action a client cannot see is one they cannot question.
    await recordSecurityEvent(tx, {
      tenantId,
      eventType: "PermissionEscalated",
      actorUserId: operator.userId,
      payload: { reason: "operator_entered_client", operator: true },
    });

    return created.id;
  });

  await setActiveMembership(membershipId);
  return membershipId;
}

/**
 * The operator role inside a client tenant, created on first entry.
 *
 * Deliberately narrow: an operator entering a client gets administration of
 * identity, organization and role — the things HQ exists to manage — and not a
 * blanket grant over the client's business entities. Widening this is a
 * decision, so it should look like one.
 */
async function operatorRoleFor(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  tenantId: string,
): Promise<string> {
  const existing = await tx.role.findFirst({
    where: { tenantId, name: OPERATOR_ROLE_NAME },
    select: { id: true },
  });
  if (existing) return existing.id;

  const role = await tx.role.create({
    data: { tenantId, name: OPERATOR_ROLE_NAME },
    select: { id: true },
  });

  await tx.permission.createMany({
    data: OPERATOR_GRANTS.map((grant) => ({
      tenantId,
      roleId: role.id,
      verb: grant.verb,
      entity: grant.entity,
      scope: "Tenant" as const,
    })),
  });

  return role.id;
}

export const OPERATOR_ROLE_NAME = "Verity Operator";

/**
 * What an operator may do inside a client.
 *
 * Read across the administrative entities, write on the ones HQ administers.
 * Not `ActionExecute` on capability entities: operating a client's business is
 * the client's job, and an operator who could close their work orders would be
 * a support incident waiting to happen.
 */
export const OPERATOR_GRANTS = [
  { verb: "Read" as const, entity: "verity.platform.tenant" },
  { verb: "Read" as const, entity: "verity.platform.organization" },
  { verb: "Create" as const, entity: "verity.platform.organization" },
  { verb: "Edit" as const, entity: "verity.platform.organization" },
  { verb: "Read" as const, entity: "verity.platform.membership" },
  { verb: "Create" as const, entity: "verity.platform.membership" },
  { verb: "Edit" as const, entity: "verity.platform.membership" },
  { verb: "Delete" as const, entity: "verity.platform.membership" },
  { verb: "Read" as const, entity: "verity.platform.role" },
  { verb: "Create" as const, entity: "verity.platform.role" },
  { verb: "Edit" as const, entity: "verity.platform.role" },
];
