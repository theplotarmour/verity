import { z } from "zod";

/**
 * The single validated runtime configuration boundary.
 *
 * Authority: taskplans/26_runtime_configuration.md. Every deployment-specific
 * value — connection strings, the Supabase project's public/service
 * credentials, the transaction budget — was previously read as a raw
 * `process.env.X` at its point of use, scattered across five files with no
 * shared validation and no single place that named what a working deployment
 * actually requires. This module is that place: `process.env` is parsed once,
 * against an explicit schema, and every consumer imports the typed result
 * instead of reading the environment itself.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * `CRON_SECRET` is read through `readCronSecret()` below, not through
 * `runtimeConfig`. It is genuinely optional (a deployment with no scheduler
 * is valid — `/api/scheduled` returns 503 rather than failing to boot,
 * ADR-015) and, unlike everything else here, is read fresh on every request
 * rather than fixed for the process lifetime: `scheduled-work-trigger.test.ts`
 * toggles it between calls within one test run to exercise that exact
 * behaviour. Baking it into a value parsed once at import time would freeze
 * the first value seen and break that contract.
 *
 * `src/proxy.ts` deliberately does NOT import this module. It runs on every
 * request, on the edge, and its own contract (documented in that file and
 * proven by `proxy.test.ts`) is to catch a missing or malformed Supabase
 * client and degrade to "no session refreshed" rather than reject — because a
 * rejected proxy takes down every route at once, including /sign-in. This
 * module's whole purpose is to throw on invalid configuration; wiring the one
 * function that must never throw through it would defeat both.
 */

const configSchema = z.object({
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),

  database: z.object({
    /** Prisma reads this itself via `env("DATABASE_URL")` in schema.prisma —
     *  validated here so a missing connection string fails with a clear
     *  E_CONFIG_INVALID at first use of the config boundary, not as a raw
     *  Prisma connection error surfaced from wherever the first query happens
     *  to run. */
    url: z.string().min(1, "DATABASE_URL is required"),
    /** Migrations only (`prisma migrate`); never read by the running app. */
    directUrl: z.string().optional(),
    /** See tenancy.ts: the interactive-transaction budget for `withTenant`. */
    txTimeoutMs: z.coerce.number().positive().default(15_000),
    txMaxWaitMs: z.coerce.number().positive().default(5_000),
  }),

  auth: z.object({
    supabaseUrl: z.string().min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
    supabaseAnonKey: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
    /** Falls back to the anon key when unset — the exact fallback auth.ts
     *  already performed inline; centralized here so it happens once. */
    jwtSecret: z.string().min(1),
  }),

  storage: z.object({
    /** Supabase Storage is optional: a deployment that never touches a file
     *  is valid (files.ts refuses at point of use, not at boot). `SUPABASE_URL`
     *  overrides the public URL for storage specifically, when set. */
    supabaseUrl: z.string().optional(),
    serviceRoleKey: z.string().optional(),
    bucket: z.string().optional(),
  }),
});

export type RuntimeConfig = z.infer<typeof configSchema>;

function loadConfig(): RuntimeConfig {
  const result = configSchema.safeParse({
    nodeEnv: process.env.NODE_ENV,
    database: {
      url: process.env.DATABASE_URL,
      directUrl: process.env.DIRECT_URL,
      txTimeoutMs: process.env.VERITY_TX_TIMEOUT_MS,
      txMaxWaitMs: process.env.VERITY_TX_MAX_WAIT_MS,
    },
    auth: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      jwtSecret: process.env.SUPABASE_JWT_SECRET ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    storage: {
      supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: process.env.SUPABASE_MEDIA_BUCKET,
    },
  });

  if (!result.success) {
    console.error("[verity] runtime configuration is invalid:", result.error.format());
    throw new Error(
      `E_CONFIG_INVALID: ${result.error.issues.map((i) => i.message).join("; ")}`,
    );
  }

  return result.data;
}

export const runtimeConfig: RuntimeConfig = loadConfig();

/**
 * `CRON_SECRET`, read live. See the module comment: this is the one value in
 * the platform's configuration surface that is read fresh per call rather
 * than fixed at process start, because a scheduler endpoint's whole security
 * story is comparing against whatever secret is configured *right now*.
 */
export function readCronSecret(): string | undefined {
  return process.env.CRON_SECRET;
}
