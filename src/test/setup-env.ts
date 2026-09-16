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

// Capture the explicitly supplied test URLs before Prisma Client is imported.
// Generated Prisma code loads the repository .env as an import side effect;
// using a static import here would therefore populate remote application
// credentials before this guard can decide whether the test database is safe.
const testDatabaseUrl = process.env.DATABASE_URL;
const testDirectUrl = process.env.DIRECT_URL;

// Keep generated Prisma Client's dotenv loader from back-filling the real
// application .env later when a test module imports the shared DB singleton.
// Empty strings are deliberate sentinels: production config treats them as
// absent, while dotenv will not overwrite an already defined process value.
if (!testDatabaseUrl) process.env.DATABASE_URL = "";
if (!testDirectUrl) process.env.DIRECT_URL = "";

// Business fixtures can execute hundreds of commands in a minute. Give each
// test a fresh quota window without bypassing the production limiter itself.
// The URLs above are validated before this privileged test-only connection.
import { beforeAll, beforeEach, afterAll } from "vitest";
import type { PrismaClient } from "@prisma/client";

let quotaAdmin: PrismaClient | null = null;
beforeAll(async () => {
  if (!testDatabaseUrl || !testDirectUrl) return;
  const { PrismaClient } = await import("@prisma/client");
  quotaAdmin = new PrismaClient({ datasourceUrl: testDirectUrl });
});
beforeEach(async () => {
  if (quotaAdmin) await quotaAdmin.$executeRaw`DELETE FROM public.request_quota`;
});
afterAll(async () => { await quotaAdmin?.$disconnect(); });
