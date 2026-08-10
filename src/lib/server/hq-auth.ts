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

/**
 * Why a request was refused. Never returned to the browser — HQ should not
 * announce its own existence to someone who cannot use it — but written to the
 * server log, because a guard that fails silently is a guard nobody can
 * configure. "I set the variable and still get bounced" has three possible
 * causes and no way to tell them apart without this.
 */
type Denial = "no-session" | "no-allowlist" | "no-user" | "not-listed";

function deny(reason: Denial, detail?: string): null {
  console.warn(
    `[verity-hq] access denied: ${reason}${detail ? ` (${detail})` : ""}. ` +
      `VERITY_HQ_PHONES is ${process.env.VERITY_HQ_PHONES ? "set" : "NOT SET"}.`,
  );
  return null;
}

/** The signed-in HQ operator, or null. Never throws. */
export async function hqOperator(): Promise<HqOperator | null> {
  const session = await getUserSession();
  if (!session) return deny("no-session");

  const permitted = allowlist();
  if (permitted.length === 0) {
    return deny(
      "no-allowlist",
      "set VERITY_HQ_PHONES to a comma-separated list of operator phone numbers, then restart the server",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, phone: true, isActive: true },
  });
  if (!user?.isActive || !user.phone) return deny("no-user", session.userId);

  const digits = user.phone.replace(/\D/g, "");
  if (!permitted.includes(digits)) {
    return deny("not-listed", `${digits} is not in VERITY_HQ_PHONES`);
  }

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
