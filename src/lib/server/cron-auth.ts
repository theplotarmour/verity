import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Shared authentication for cron routes.
 *
 * Two of these exist now, and a second copy of a constant-time comparison is a
 * second chance to write `provided === expected` by accident. One
 * implementation, two callers.
 *
 * **Fails closed on an unset secret.** Without that, a deployment missing
 * `CRON_SECRET` exposes an unauthenticated endpoint that expires trials and
 * fires outbound webhooks on demand — and it fails *open* silently, which is the
 * worst combination. A cron that never runs is a visible problem; a cron anyone
 * can trigger is not.
 */
export function cronAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Length is compared first because timingSafeEqual throws on a mismatch. That
  // leaks the secret's length, which is not worth defending against — the
  // alternative is a fixed-length hash comparison for no practical gain.
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A 401 shaped the same way by every cron route. */
export function cronUnauthorized(): Response {
  return Response.json({ error: "Unauthorized." }, { status: 401 });
}
