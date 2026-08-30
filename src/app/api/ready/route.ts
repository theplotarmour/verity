import { NextResponse } from "next/server";
import { prisma } from "@/server/platform/db";

/**
 * Readiness — "this instance can serve traffic because its required
 * transactional database is reachable."
 *
 * Authority: taskplans/32_health_readiness.md.
 *
 * Uses the existing Prisma singleton (`src/server/platform/db.ts`) — never a
 * second client, which would be a second connection pool with its own
 * lifecycle nobody asked for. A database outage MUST make this fail (503);
 * it must NOT make `/api/health` fail — see that route's own comment for why
 * the two are kept separate.
 *
 * Only the database is probed. Storage (Task 27) and auth (Task 28) are
 * deliberately not — both are already designed to degrade gracefully when
 * unavailable (a deployment with no storage configured is valid; auth
 * failures are the page's own concern via `requireActor()`), so probing them
 * here would report "not ready" for conditions that are not actually
 * outages. The database is different: nothing in this application works
 * without it.
 */

export const dynamic = "force-dynamic";

const READY_TIMEOUT_MS = 3000;

/**
 * Strips a credential-bearing connection string (`scheme://user:pass@host`)
 * out of an error message before it is ever returned to a caller. Prisma's
 * own connection-failure messages observed in this codebase's test runs
 * name only host:port ("Can't reach database server at
 * host.example.com:5432"), never credentials — this is defense in depth for
 * an error shape this project has not seen, not a fix for one it has.
 */
function sanitize(message: string): string {
  return message.replace(/:\/\/[^\s/@]+:[^\s/@]+@/g, "://<redacted>@");
}

/**
 * `SELECT 1` against the existing Prisma singleton, bounded to
 * `READY_TIMEOUT_MS`. `Promise.race` does not cancel the losing side, so a
 * database call that eventually settles after the timeout already won would
 * otherwise print an unhandled-rejection warning — the attached no-op
 * `.catch()` exists solely to prevent that, not to change the outcome. The
 * timer is always cleared, on either path, so no open handle survives this
 * call.
 */
async function probeDatabase(): Promise<void> {
  const dbProbe = prisma.$queryRaw`SELECT 1`;
  dbProbe.catch(() => {});

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`database probe timed out after ${READY_TIMEOUT_MS}ms`)),
      READY_TIMEOUT_MS,
    );
  });

  try {
    await Promise.race([dbProbe, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  try {
    await probeDatabase();
    return NextResponse.json({ status: "ready", checks: { db: "ok" } });
  } catch (error) {
    const detail = sanitize(error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { status: "not_ready", checks: { db: "error", detail } },
      { status: 503 },
    );
  }
}
