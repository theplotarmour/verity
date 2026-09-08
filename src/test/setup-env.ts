import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Never load .env: local app credentials may point at production. Integration
// tests mutate data and must opt into a dedicated database explicitly.
const envFile = resolve(process.cwd(), ".env.test");
if (existsSync(envFile)) process.loadEnvFile(envFile);
for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
  const value = process.env[key];
  if (!value) continue;
  const hostname = new URL(value).hostname;
  if (!["127.0.0.1", "localhost", "[::1]"].includes(hostname) && process.env.VERITY_TEST_ALLOW_REMOTE_DATABASE !== "1") {
    throw new Error(`${key} is remote. Tests require an isolated local database or explicit VERITY_TEST_ALLOW_REMOTE_DATABASE=1.`);
  }
}

// Business fixtures can execute hundreds of commands in a minute. Give each
// test a fresh quota window without bypassing the production limiter itself.
// The URLs above are validated before this privileged test-only connection.
import { beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
const quotaAdmin = process.env.DATABASE_URL && process.env.DIRECT_URL
  ? new PrismaClient({ datasourceUrl: process.env.DIRECT_URL }) : null;
beforeEach(async () => {
  if (quotaAdmin) await quotaAdmin.$executeRaw`DELETE FROM public.request_quota`;
});
afterAll(async () => { await quotaAdmin?.$disconnect(); });
