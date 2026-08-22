import { prisma } from "./db";
import type { PrismaClient } from "@prisma/client";

/**
 * Tenant context primitive.
 *
 * Authority:
 *   INV-001          — strict tenancy isolation
 *   Bible V5 §1.A.2  — RLS at the engine level; tenant context derived from the
 *                      authenticated session, never from user-supplied input
 *   Spec PLA-TEN-002 — the data-access layer injects the tenant scope
 *   Spec PLA-TEN-006 — [DECIDED] client-supplied tenant identifiers must never
 *                      grant or expand visibility
 *   ADR-005          — Tenant is the root data-isolation boundary
 *
 * The tenant scope is applied by the database, not by query construction. Every
 * statement inside `withTenant` runs in one transaction with the `verity.tenant_id`
 * GUC set, and the RLS policies in the initial migration do the filtering. When
 * the GUC is unset the policies match no rows, so an unscoped query is empty
 * rather than global — isolation fails closed.
 */

export type TenantScopedClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Runs `fn` with every statement scoped to `tenantId`.
 *
 * `tenantId` must come from the verified authorization context. Passing a value
 * taken from a request body, query string, or header violates PLA-TEN-006.
 * Wiring this to the authenticated session belongs to the identity step of the
 * foundation build and is deliberately not done here.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: TenantScopedClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // set_config is parameterised; `SET LOCAL` cannot bind values, and building
    // that statement by interpolation would put a caller-supplied string
    // directly into SQL. `true` scopes the setting to this transaction.
    await tx.$executeRaw`SELECT set_config('verity.tenant_id', ${tenantId}, true)`;
    return fn(tx as TenantScopedClient);
  });
}

/**
 * Fails when the connection role can bypass row-level security.
 *
 * RLS is not enforced for SUPERUSER or BYPASSRLS roles. A deployment that
 * connects as one of them has no tenant isolation at all, and — because the
 * policies are still present and syntactically correct — nothing else would
 * reveal it. Call this at startup and in the isolation test.
 */
export async function assertRlsEnforceable(
  client: Pick<PrismaClient, "$queryRaw"> = prisma,
): Promise<void> {
  const [role] = await client.$queryRaw<
    { rolname: string; rolsuper: boolean; rolbypassrls: boolean }[]
  >`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;

  if (!role) throw new Error(`Tenancy: current_user not found in pg_roles`);

  if (role.rolsuper || role.rolbypassrls) {
    throw new Error(
      `Tenancy: role "${role.rolname}" bypasses row-level security ` +
        `(rolsuper=${role.rolsuper}, rolbypassrls=${role.rolbypassrls}). ` +
        `INV-001 cannot be enforced on this connection. Connect as a role with ` +
        `NOSUPERUSER NOBYPASSRLS.`,
    );
  }
}
