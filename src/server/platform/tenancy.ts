import { prisma } from "./db";
import { runtimeConfig } from "./config";
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
/**
 * Interactive transaction budget for every tenant-scoped operation.
 *
 * Stated explicitly rather than inherited. `withTenant` is the single chokepoint
 * through which every tenant-scoped read and write passes, so Prisma's implicit
 * 5s default was silently the platform's transaction budget — a value nobody
 * chose, that nothing documented, and that surfaces as "Transaction already
 * closed" rather than as anything a caller can act on. A capability doing a
 * handful of writes over a remote database reaches it, and the first team to hit
 * it would have had to rediscover the number from a stack trace.
 *
 * The ceiling is real and stays deliberately modest: a long transaction holds
 * row locks and a pooled connection for its whole life, so raising this trades
 * throughput for headroom. It is env-tunable because the right value depends on
 * database latency, which is a deployment property rather than a platform one.
 */
const TRANSACTION_TIMEOUT_MS = runtimeConfig.database.txTimeoutMs;

/** How long to wait for a free pooled connection before giving up. */
const TRANSACTION_MAX_WAIT_MS = runtimeConfig.database.txMaxWaitMs;

/**
 * One-shot RLS guard for the runtime connection.
 *
 * `assertRlsEnforceable` existed and was called by seventeen test files, but by
 * nothing in application code — so it only ever protected environments the test
 * suite was pointed at. A deployment whose DATABASE_URL named a SUPERUSER or
 * BYPASSRLS role would have started, served traffic, and returned every tenant's
 * rows to every caller, with the policies still present and every test still
 * green somewhere else. That is precisely the failure this function was written
 * to prevent, so it now runs where it can actually prevent it.
 *
 * `withTenant` is the single chokepoint for every tenant-scoped read and write,
 * which makes it the correct place: nothing can reach tenant data without
 * passing this first.
 *
 * Memoised, so it costs one query per process rather than one per transaction.
 * A FAILED check is deliberately not memoised — a transient connection error
 * must not poison the process for its lifetime, while a genuinely bypassing role
 * simply fails again on the next call. Isolation fails closed either way.
 */
let rlsEnforceable: Promise<void> | null = null;

function ensureRlsEnforceable(): Promise<void> {
  rlsEnforceable ??= assertRlsEnforceable().catch((error: unknown) => {
    rlsEnforceable = null;
    throw error;
  });
  return rlsEnforceable;
}

/** Test-only: forget the memoised result so a fresh check runs. */
export function resetRlsEnforceableCache(): void {
  rlsEnforceable = null;
}

export async function withTenant<T>(
  tenantId: string,
  fn: (tx: TenantScopedClient) => Promise<T>,
): Promise<T> {
  // Before any tenant-scoped statement, not after. A role that bypasses RLS
  // must never get as far as opening the transaction.
  await ensureRlsEnforceable();

  return prisma.$transaction(
    async (tx) => {
      // set_config is parameterised; `SET LOCAL` cannot bind values, and building
      // that statement by interpolation would put a caller-supplied string
      // directly into SQL. `true` scopes the setting to this transaction.
      await tx.$executeRaw`SELECT set_config('verity.tenant_id', ${tenantId}, true)`;
      return fn(tx as TenantScopedClient);
    },
    { timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_MAX_WAIT_MS },
  );
}

/**
 * Fails when the connection role can bypass row-level security.
 *
 * RLS is not enforced for SUPERUSER or BYPASSRLS roles. A deployment that
 * connects as one of them has no tenant isolation at all, and — because the
 * policies are still present and syntactically correct — nothing else would
 * reveal it.
 *
 * Called automatically by `withTenant` via `ensureRlsEnforceable`, and directly
 * by the isolation and conformance tests.
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
