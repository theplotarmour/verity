import "server-only";

import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";

/**
 * Access control for Verity HQ — the cross-tenant surface.
 *
 * Every other guard in this codebase answers "what may this user do inside
 * their own factory". HQ is the one place that reads across all of them, so
 * `SystemRole` is useless here: every tenant has an OWNER, and being the owner
 * of one workspace must not grant sight of the others.
 *
 * The mechanism is an explicit allowlist of operator phone numbers in
 * `VERITY_HQ_PHONES`. It is deliberately not a database flag: a row that grants
 * cross-tenant read is exactly the row an attacker who reaches the database
 * would set, and it would be invisible in code review.
 *
 * Fails closed. An unset or empty allowlist admits nobody, in every
 * environment — a dev-only bypass here is how one ships to production.
 */

function allowlist(): string[] {
  return (process.env.VERITY_HQ_PHONES ?? "")
    .split(",")
    .map((entry) => entry.replace(/\D/g, ""))
    .filter((entry) => entry.length > 0);
}

export interface HqOperator {
  userId: string;
  name: string;
  phone: string;
}

/** The signed-in HQ operator, or null. Never throws. */
export async function hqOperator(): Promise<HqOperator | null> {
  const session = await getUserSession();
  if (!session) return null;

  const permitted = allowlist();
  if (permitted.length === 0) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, phone: true, isActive: true },
  });
  if (!user?.isActive || !user.phone) return null;
  if (!permitted.includes(user.phone.replace(/\D/g, ""))) return null;

  return { userId: user.id, name: user.name, phone: user.phone };
}

/**
 * Page guard. Sends anyone who is not an operator back to their own workspace
 * rather than to an error, so a mistyped URL is not a disclosure that HQ exists.
 */
export async function requireHqPage(): Promise<HqOperator> {
  const operator = await hqOperator();
  if (!operator) redirect("/");
  return operator;
}

/**
 * Server-action guard. Throws, because an HQ action invoked without access is
 * tampering, not a navigation mistake.
 *
 * Every exported action in `hq.ts` must call this. They are public POST
 * endpoints — reachable by anyone who can reach the app, signed in or not —
 * and they read and write across tenant boundaries.
 */
export async function requireHqAction(): Promise<HqOperator> {
  const operator = await hqOperator();
  if (!operator) throw new Error("Not authorised for Verity HQ.");
  return operator;
}
