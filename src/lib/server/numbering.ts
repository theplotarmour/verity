import "server-only";

import { Prisma } from "@prisma/client";

/**
 * Human-facing document numbers.
 *
 * Every entity in Verity carries a short number a person can say out loud —
 * TKT-00042, SWO-00019, INV-2026-00041. The pattern everywhere is "count the
 * tenant's existing rows, add one, pad". That is cheap and readable, but it is
 * not collision-proof: two concurrent creates read the same count, and a
 * deleted row makes the count reuse a number that already existed.
 *
 * So the number is produced here and the write is retried on a unique-constraint
 * violation, walking the suffix forward until it lands. The database's
 * `@@unique([factoryId, <number>])` is the actual guarantee; this is the thing
 * that makes hitting it a non-event rather than a 500.
 */

export function formatDocNumber(prefix: string, n: number, width = 5): string {
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

const UNIQUE_VIOLATION = "P2002";

/**
 * Run `create` with a generated number, retrying on collision.
 *
 * `nextNumber(attempt)` is called with 0, 1, 2… and must return the candidate
 * for that attempt — normally `formatDocNumber(prefix, base + attempt)`.
 */
export async function createWithDocNumber<T>(
  nextNumber: (attempt: number) => string,
  create: (docNumber: string) => Promise<T>,
  maxAttempts = 10,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await create(nextNumber(attempt));
    } catch (error) {
      const isCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION;
      if (!isCollision) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error("Could not allocate a document number.");
}
