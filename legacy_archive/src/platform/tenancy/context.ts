import "server-only";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Tenant context for row-level security.
 *
 * The RLS policies read two GUCs, `verity.factory_id` and `verity.org_id`. A
 * connection with neither set matches no rows, so this is fail-closed: forget
 * to establish context and queries return empty rather than returning another
 * tenant's data.
 *
 * ## Why this must be a transaction
 *
 * The app connects through Supabase's pooler in transaction mode. A plain
 * `SET` is connection-scoped, and in transaction pooling the next statement
 * may land on a different backend — so the setting would be lost, or worse,
 * leak onto an unrelated request reusing that connection. `SET LOCAL` inside an
 * explicit transaction is scoped to that transaction and is the only safe form
 * here.
 *
 * That means every tenant-scoped read or write goes through `withTenant`.
 *
 * ## Cost
 *
 * This makes each unit of work an interactive transaction, which holds a pooled
 * connection for its duration. Keep the callback short: do the queries, return
 * plain data, and do formatting or fetches outside it.
 */

export interface TenantContext {
  factoryId: string;
  organizationId: string;
}

/**
 * Run `fn` with tenant context established, inside one transaction.
 *
 * `set_config(..., true)` is the function form of `SET LOCAL` — the `true`
 * makes it transaction-local.
 */
export async function withTenant<T>(
  ctx: TenantContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { timeout?: number },
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('verity.factory_id', ${ctx.factoryId}, true)`;
      await tx.$executeRaw`SELECT set_config('verity.org_id', ${ctx.organizationId}, true)`;
      return fn(tx);
    },
    { timeout: options?.timeout ?? 15_000 },
  );
}

/**
 * Resolve the org for a factory. Cached per request by the caller where it
 * matters; sessions carry factoryId today, not organizationId.
 */
export async function organizationIdForFactory(factoryId: string): Promise<string | null> {
  const factory = await prisma.factory.findUnique({
    where: { id: factoryId },
    select: { organizationId: true },
  });
  return factory?.organizationId ?? null;
}

/**
 * Escape hatch for genuinely cross-tenant work: the HQ console, provisioning,
 * and background jobs that span organizations.
 *
 * This does NOT bypass RLS — it simply runs without context, which under the
 * policies means zero rows. It exists so that such call sites are greppable and
 * must be deliberate. Anything needing true cross-tenant reads has to run as a
 * database role that owns the tables (migrations, seeds, admin scripts), never
 * as the application role.
 */
export function withoutTenantContext<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}
