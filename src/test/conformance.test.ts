import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { PrismaClient } from "@prisma/client";

/**
 * Foundation conformance suite.
 *
 * Authority: implementation/13-conformance/implementation-invariant-checks.md,
 * forbidden-patterns.md, INV-001 through INV-003.
 *
 * These checks exist because the invariants they cover are the kind that decay
 * quietly: a model added without a tenant column, a legacy term reintroduced, a
 * table shipped without RLS. Each is cheap to verify and expensive to discover
 * late.
 */

const ROOT = process.cwd();
const SCHEMA = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(full)) acc.push(full);
  }
  return acc;
}

const SOURCES = sourceFiles(join(ROOT, "src"));

/** Models that are deliberately not tenant-scoped, each with its authority. */
const GLOBAL_MODELS: Record<string, string> = {
  Tenant: "the isolation boundary itself (ADR-005)",
  Party: "global identity — Bible V2 Primitive 2 §2, INV-003",
  User: "global identity, 1:1 with Party — GOV-TER-006",
  EntityDefinition: "platform metadata describing types — MET-ENT-004",
  CapabilityDefinition: "platform registry — PLA-CAP-001",
  StateDefinition: "capability lifecycle metadata — MET-STA-001",
  TransitionDefinition: "capability lifecycle metadata — MET-TRA-001",
  ConfigParameter: "Global scope rows belong to no tenant — PLA-CFG-001",
  FieldPermission: "which fields are sensitive is a property of the entity — PLA-AUT-005",
};

describe("conformance: forbidden legacy patterns", () => {
  // The policy documents necessarily contain these strings; the code must not.
  const forbidden = [
    "factoryId",
    "factory_id",
    "vehicleBrandId",
    "vehicleModelId",
    "seatType",
    "hasArmrest",
    "headrestCount",
    "ProductionBatch",
    "BomMode",
    "QCTemplate",
    "SpecRefTarget",
    "verity-glass",
  ];

  it("does not reintroduce any VEDA identifier in source", () => {
    const violations: string[] = [];
    for (const file of SOURCES) {
      // This file necessarily contains the terms it searches for, exactly as
      // no-legacy-policy.md does. Excluding it is the same exemption, made
      // explicit rather than by a fragile regex.
      if (file.endsWith("conformance.test.ts")) continue;
      const text = readFileSync(file, "utf8");
      for (const term of forbidden) {
        if (text.includes(term)) violations.push(`${relative(ROOT, file)}: ${term}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("does not define legacy role-based routes (forbidden pattern #9)", () => {
    // Route groups like (owner) are parenthesised and never appear in a URL;
    // a real /owner route directory would.
    const appDir = join(ROOT, "src/app");
    const offenders = sourceFiles(appDir)
      .map((f) => relative(ROOT, f))
      .filter((f) => /src\/app\/(owner|worker|inspector|supervisor|verity)\//.test(f));
    expect(offenders).toEqual([]);
  });
});

describe("conformance: tenancy isolation (INV-001)", () => {
  it("gives every persistent model a tenant column unless documented global", () => {
    const models = [...SCHEMA.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
    expect(models.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const [, name, body] of models) {
      if (name in GLOBAL_MODELS) continue;
      if (!/\btenantId\b/.test(body)) missing.push(name);
    }
    expect(missing).toEqual([]);
  });

  it("keeps the documented global list explicit rather than implicit", () => {
    // Every allowlisted model must actually exist, so the list cannot rot into
    // a set of stale exemptions that silently excuse a new model.
    const declared = [...SCHEMA.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);
    for (const name of Object.keys(GLOBAL_MODELS)) {
      expect(declared).toContain(name);
    }
  });

  it("gives every model a uuid primary key, never an auto-increment integer", () => {
    const models = [...SCHEMA.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
    const offenders = models
      .filter(([, , body]) => /@id[^\n]*autoincrement\(\)/.test(body))
      .map(([, name]) => name);
    expect(offenders).toEqual([]);
  });
});

describe("conformance: architectural boundaries", () => {
  it("keeps Prisma out of components and non-API app code", () => {
    const offenders = SOURCES.filter((file) => {
      const rel = relative(ROOT, file);
      const isUiLayer = rel.startsWith("src/components/") || rel.startsWith("src/app/");
      const isApiRoute = rel.startsWith("src/app/api/");
      if (!isUiLayer || isApiRoute) return false;
      return /from "@prisma\/client"|from "@\/server\/platform\/db"/.test(readFileSync(file, "utf8"));
    }).map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it("keeps capabilities out of the platform core", () => {
    // A capability may import the platform; the platform must never import a
    // capability. The Location scope resolver is registered *into* the platform
    // rather than imported *by* it, and this is the check that keeps it that way.
    const offenders = SOURCES.filter((file) => {
      const rel = relative(ROOT, file);
      if (!rel.startsWith("src/server/platform/")) return false;
      return /from "@\/server\/capabilities\//.test(readFileSync(file, "utf8"));
    }).map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it("keeps React out of the server platform layer", () => {
    const offenders = SOURCES.filter((file) => {
      const rel = relative(ROOT, file);
      if (!rel.startsWith("src/server/")) return false;
      return /from "react"|\.tsx$/.test(rel) || /from "react"/.test(readFileSync(file, "utf8"));
    }).map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

describeDb("conformance: database enforcement", () => {
  it("enables and forces RLS on every application table", async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      const rows = await admin.$queryRaw<
        { relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]
      >`SELECT relname, relrowsecurity, relforcerowsecurity
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND relname <> '_prisma_migrations'
        ORDER BY relname`;

      expect(rows.length).toBeGreaterThan(0);
      const unprotected = rows
        .filter((r) => !r.relrowsecurity || !r.relforcerowsecurity)
        .map((r) => r.relname);
      // FORCE matters as much as ENABLE: without it the owning role bypasses
      // every policy and the isolation tests would still pass.
      expect(unprotected).toEqual([]);
    } finally {
      await admin.$disconnect();
    }
  });

  it("keeps the audit and event tables append-only by trigger (EXE-AUD-003)", async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      const rows = await admin.$queryRaw<{ tablename: string }[]>`
        SELECT c.relname AS tablename
        FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
        WHERE NOT t.tgisinternal AND t.tgname LIKE '%append_only%'`;
      const guarded = rows.map((r) => r.tablename).sort();
      expect(guarded).toEqual(["activity", "domain_event", "security_audit_event"]);
    } finally {
      await admin.$disconnect();
    }
  });

  it("guards every graph against cycles that would not terminate", async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      const rows = await admin.$queryRaw<{ tgname: string }[]>`
        SELECT t.tgname FROM pg_trigger t
        WHERE NOT t.tgisinternal AND t.tgname LIKE '%no_cycle%'`;
      const names = rows.map((r) => r.tgname).sort();
      expect(names).toEqual(["role_composition_no_cycle", "workflow_edge_no_cycle"]);
    } finally {
      await admin.$disconnect();
    }
  });

  it("refuses to run the platform on a connection that bypasses RLS", async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      const [role] = await admin.$queryRaw<{ rolbypassrls: boolean }[]>`
        SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user`;
      // The migration role legitimately bypasses; the runtime role must not.
      expect(role?.rolbypassrls).toBe(true);

      const app = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
      try {
        const [runtime] = await app.$queryRaw<{ rolbypassrls: boolean; rolsuper: boolean }[]>`
          SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user`;
        expect(runtime?.rolbypassrls).toBe(false);
        expect(runtime?.rolsuper).toBe(false);
      } finally {
        await app.$disconnect();
      }
    } finally {
      await admin.$disconnect();
    }
  });
});
