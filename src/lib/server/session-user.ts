import "server-only";

import { cache } from "react";

import prisma from "@/lib/prisma";
import { getUserSession } from "./auth";

/**
 * The signed-in user, confirmed against the database.
 *
 * `getUserSession()` only decrypts the cookie. That is the right primitive, but
 * it means the JWT's claims are the *only* thing an endpoint guarded by it
 * checks — and a JWT keeps asserting whatever was true when it was issued:
 *
 *  - a **deleted** user's token still decrypts, so they keep access until it
 *    expires;
 *  - a **deactivated** user's does too, which makes "deactivate" a label rather
 *    than a lock;
 *  - a user **demoted** from OWNER still carries `role: "OWNER"`, so a role
 *    check against the session passes for a permission they no longer hold.
 *
 * Pages go through `getOwnerUser()`, which does hit the database — this is the
 * equivalent for API routes and actions, where a redirect is the wrong answer
 * and a null return is the right one.
 *
 * Found while verifying the Tally export: a stale session from a user deleted
 * in an earlier session could still download the whole dispatch book.
 *
 * `cache()` so several guards in one request share a single lookup.
 */
export const getActiveSessionUser = cache(async () => {
  const session = await getUserSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, role: true, factoryId: true, isActive: true },
  });

  // Gone or switched off. Either way, not someone who may act.
  if (!user || !user.isActive) return null;

  // The row wins over the claim. A token minted before a demotion still says
  // OWNER, and trusting it is how a revoked permission keeps working.
  return user;
});
