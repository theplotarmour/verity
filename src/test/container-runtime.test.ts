import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Static regression coverage for Task 30's container artifacts.
 *
 * Docker itself is not available in this environment (confirmed: `docker
 * --version` fails), so the actual `docker build`/`docker compose up`
 * reference deployment could not be executed here — see the taskplan's
 * "Limitations" section. These tests are the next best thing: they pin the
 * specific security- and correctness-relevant invariants a careless future
 * edit could silently break (exposing Postgres publicly, running as root,
 * dropping the Prisma-engine tracing fix, baking a real secret in as a
 * build arg), so at least those regressions fail CI even without a daemon.
 * They do not substitute for an actual build/run verification.
 */

const ROOT = join(__dirname, "..", "..");
const dockerfile = readFileSync(join(ROOT, "Dockerfile"), "utf8");
const compose = readFileSync(join(ROOT, "docker-compose.yml"), "utf8");
const dockerignore = readFileSync(join(ROOT, ".dockerignore"), "utf8");
const initScript = readFileSync(
  join(ROOT, "deploy", "db", "init", "01-create-app-role.sh"),
  "utf8",
);

describe("next.config.ts: standalone output", () => {
  it("declares standalone output and traces the Prisma engine", async () => {
    const config = (await import("../../next.config")).default;
    expect(config.output).toBe("standalone");
    expect(config.outputFileTracingIncludes).toEqual({
      "*": ["node_modules/.prisma/client/**/*"],
    });
  });
});

describe("Dockerfile", () => {
  it("uses the same base image in every stage (binary-compatible Prisma engine)", () => {
    const fromLines = dockerfile.match(/^FROM .+$/gm) ?? [];
    expect(fromLines.length).toBeGreaterThanOrEqual(3);
    // Exactly one literal image reference — every later stage derives from
    // it (`FROM base AS ...`), which makes stage divergence impossible
    // rather than merely checked for.
    const literalImageLines = fromLines.filter((l) => !/^FROM base\b/.test(l));
    expect(literalImageLines).toEqual(["FROM node:20-bookworm-slim AS base"]);
  });

  it("runs as a non-root user", () => {
    expect(dockerfile).toMatch(/USER nextjs/);
    expect(dockerfile).not.toMatch(/USER root\s*$/m);
  });

  it("exposes exactly the application port", () => {
    const exposed = dockerfile.match(/^EXPOSE .+$/gm) ?? [];
    expect(exposed).toEqual(["EXPOSE 3000"]);
  });

  it("does not run prisma migrate as part of the image's own startup command", () => {
    const cmdLine = dockerfile.match(/^CMD .+$/m)?.[0] ?? "";
    expect(cmdLine).not.toMatch(/migrate/);
    expect(cmdLine).toBe('CMD ["node", "server.js"]');
  });

  it("takes NEXT_PUBLIC_* as build args, but never a raw secret name as one", () => {
    const argLines = dockerfile.match(/^ARG .+$/gm) ?? [];
    expect(argLines.some((l) => l.includes("NEXT_PUBLIC_SUPABASE_URL"))).toBe(true);
    expect(argLines.some((l) => l.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"))).toBe(true);
    for (const forbidden of ["SERVICE_ROLE_KEY", "JWT_SECRET", "CRON_SECRET"]) {
      expect(argLines.some((l) => l.includes(forbidden))).toBe(false);
    }
  });
});

describe(".dockerignore", () => {
  it("excludes real env files from the build context", () => {
    expect(dockerignore).toMatch(/^\.env$/m);
    expect(dockerignore).toMatch(/^\.env\.local$/m);
  });

  it("excludes node_modules and .git (context size, not just secrecy)", () => {
    expect(dockerignore).toMatch(/^node_modules$/m);
    expect(dockerignore).toMatch(/^\.git$/m);
  });
});

describe("docker-compose.yml", () => {
  it("binds Postgres to localhost only, not every interface", () => {
    expect(compose).toMatch(/"127\.0\.0\.1:5432:5432"/);
    expect(compose).not.toMatch(/^\s*- "5432:5432"/m);
  });

  it("adds no service beyond the application and PostgreSQL", () => {
    const services = [...compose.matchAll(/^  (\w+):\n/gm)].map((m) => m[1]);
    expect(services.sort()).toEqual(["db", "web"]);
  });

  it("points the application at the runtime role, never the initdb superuser", () => {
    const databaseUrlLine = compose.match(/^\s*DATABASE_URL:.*$/m)?.[0] ?? "";
    expect(databaseUrlLine).toMatch(/verity_app:/);
    expect(databaseUrlLine).not.toMatch(/postgres:\$\{POSTGRES_SUPERUSER_PASSWORD/);
  });

  it("does not run migrations as part of `up`", () => {
    expect(compose).not.toMatch(/migrate deploy/);
  });
});

describe("deploy/db/init/01-create-app-role.sh", () => {
  it("creates the runtime role as NOSUPERUSER NOBYPASSRLS", () => {
    expect(initScript).toMatch(/CREATE ROLE verity_app LOGIN PASSWORD .* NOSUPERUSER NOBYPASSRLS/);
  });

  it("is idempotent against a role that already exists", () => {
    expect(initScript).toMatch(/IF NOT EXISTS[\s\S]*pg_roles/);
  });

  it("has an LF-only shebang line (a CRLF one breaks inside the Linux container)", () => {
    const firstLine = initScript.split("\n")[0]!;
    expect(firstLine).toBe("#!/bin/sh");
    expect(firstLine.endsWith("\r")).toBe(false);
  });
});
