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

  auth: z
    .object({
      /**
       * Which authentication provider this deployment runs (Task 36).
       *
       * `authProvider.ts` argued against a runtime registry when there was one
       * provider. Both halves of that argument still hold — there is still
       * exactly one *active* provider per deployment and it is still never
       * null — but the choice is now a deployment fact rather than a
       * compile-time one, because an enterprise installing Verity behind its
       * own IdP cannot be asked to recompile. The set of providers is closed
       * and lives in this repository; this is provider selection, not a plugin
       * system.
       */
      provider: z.enum(["supabase", "oidc"]).default("supabase"),

      /** Required when `provider` is `supabase`; absent on an OIDC deployment. */
      supabaseUrl: z.string().optional(),
      supabaseAnonKey: z.string().optional(),

      /**
       * Signs the active-membership cookie (`auth.ts`). Sourced from
       * SUPABASE_JWT_SECRET, else VERITY_SESSION_SECRET, else the anon key —
       * the last being the fallback auth.ts already performed inline. An
       * OIDC-only deployment has no anon key, so one of the first two must be
       * set there, and an empty string reaches the `min(1)` below rather than
       * silently signing with nothing.
       */
      jwtSecret: z.string().min(1, "SUPABASE_JWT_SECRET or VERITY_SESSION_SECRET is required"),

      /** Required when `provider` is `oidc`. See platform/oidc.ts. */
      oidc: z
        .object({
          issuer: z.string().min(1),
          clientId: z.string().min(1),
          /** Defaults to the client id at the point of verification. */
          audience: z.string().optional(),
          /** Discovered from the issuer when unset. */
          jwksUri: z.string().optional(),
          principalClaim: z.string().min(1).default("sub"),
          emailClaim: z.string().min(1).default("email"),
          clockToleranceSeconds: z.coerce.number().nonnegative().default(60),
        })
        .optional(),
    })
    .superRefine((auth, ctx) => {
      // Per-provider validation rather than one union of required variables:
      // an OIDC deployment must boot with no Supabase project in existence,
      // and a Supabase deployment must not be asked for an issuer. Requiring
      // both would make the boundary a fiction.
      if (auth.provider === "supabase") {
        if (!auth.supabaseUrl) {
          ctx.addIssue({ code: "custom", message: "NEXT_PUBLIC_SUPABASE_URL is required" });
        }
        if (!auth.supabaseAnonKey) {
          ctx.addIssue({ code: "custom", message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required" });
        }
      }

      if (auth.provider === "oidc" && !auth.oidc) {
        ctx.addIssue({
          code: "custom",
          message:
            "VERITY_OIDC_ISSUER and VERITY_OIDC_CLIENT_ID are required when VERITY_AUTH_PROVIDER=oidc",
        });
      }
    }),

  storage: z.object({
    /**
     * Which object store this deployment uses (Task 41).
     *
     * Selected once at install from validated configuration, exactly as
     * `auth.provider` is. Unset or incompletely configured means *no driver*,
     * which is a valid deployment state: `files.ts` refuses at the point of
     * use rather than at boot, so a deployment that never touches a file runs
     * and sign-in is not taken down by a feature nobody reached for.
     */
    driver: z.enum(["supabase", "s3"]).default("supabase"),

    /** Supabase Storage. `SUPABASE_URL` overrides the public URL when set. */
    supabaseUrl: z.string().optional(),
    serviceRoleKey: z.string().optional(),
    bucket: z.string().optional(),

    /**
     * Any S3-compatible server: AWS, MinIO, SeaweedFS's S3 gateway, Ceph RGW,
     * Wasabi, Backblaze B2. One adapter, different configuration — a driver
     * written against one vendor's extensions would make the next deployment
     * a fork.
     */
    s3: z
      .object({
        bucket: z.string().min(1),
        region: z.string().min(1).default("us-east-1"),
        /** Omit for AWS; required for every self-hosted server. */
        endpoint: z.string().optional(),
        accessKeyId: z.string().min(1),
        secretAccessKey: z.string().min(1),
        /**
         * Defaults to true when an endpoint is set, because a self-hosted
         * server is almost always path-style, and the failure mode of getting
         * this wrong (`SignatureDoesNotMatch`) reads exactly like a bad key.
         */
        forcePathStyle: z.coerce.boolean().optional(),
      })
      .optional(),
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
      provider: process.env.VERITY_AUTH_PROVIDER,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      jwtSecret:
        process.env.SUPABASE_JWT_SECRET ??
        process.env.VERITY_SESSION_SECRET ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        "",
      // Passed as undefined rather than a half-filled object when the issuer is
      // absent, so `provider=oidc` with nothing configured reports the missing
      // variables by name instead of failing on a nested field.
      oidc: process.env.VERITY_OIDC_ISSUER
        ? {
            issuer: process.env.VERITY_OIDC_ISSUER,
            clientId: process.env.VERITY_OIDC_CLIENT_ID,
            audience: process.env.VERITY_OIDC_AUDIENCE,
            jwksUri: process.env.VERITY_OIDC_JWKS_URI,
            principalClaim: process.env.VERITY_OIDC_PRINCIPAL_CLAIM,
            emailClaim: process.env.VERITY_OIDC_EMAIL_CLAIM,
            clockToleranceSeconds: process.env.VERITY_OIDC_CLOCK_TOLERANCE_SECONDS,
          }
        : undefined,
    },
    storage: {
      driver: process.env.VERITY_STORAGE_DRIVER,
      // Passed as undefined rather than a half-filled object when the bucket is
      // absent, so an incomplete configuration binds nothing instead of failing
      // deep inside the SDK on first use.
      s3: process.env.VERITY_S3_BUCKET
        ? {
            bucket: process.env.VERITY_S3_BUCKET,
            region: process.env.VERITY_S3_REGION,
            endpoint: process.env.VERITY_S3_ENDPOINT,
            accessKeyId: process.env.VERITY_S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.VERITY_S3_SECRET_ACCESS_KEY,
            forcePathStyle: process.env.VERITY_S3_FORCE_PATH_STYLE,
          }
        : undefined,
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
