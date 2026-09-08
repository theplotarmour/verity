import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "./db";
import type { RateLimitResult } from "./rate-limit";

/** A committed counter shared by all replicas, outside the business transaction. */
export async function sharedRateLimit(key: string, kind: "signin" | "command" | "query" | "chat"): Promise<RateLimitResult> {
  const hash = createHash("sha256").update(key).digest("hex");
  const [result] = await prisma.$queryRaw<Array<{ allowed: boolean; retry_after: number }>>`
    SELECT * FROM verity.consume_request_quota(${hash}, ${kind})
  `;
  if (!result) throw new Error("E_RATE_LIMIT: quota service unavailable");
  return { allowed: result.allowed, remaining: 0, retryAfterSeconds: result.allowed ? 0 : result.retry_after };
}
