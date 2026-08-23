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


describe("conformance: capability contracts (Phase E)", () => {
  /**
   * Declared dependencies, mirrored from each capability's install migration.
   * A capability may import another only if it declares the dependency — that
   * is what makes the dependency graph enforceable rather than decorative.
   */
  const DECLARED_DEPENDENCIES: Record<string, string[]> = {
    location: [],
    asset: ["location"],
    evidence: ["location"],
    scheduling: ["asset"],
    approval: [],
  };

  const capabilityDirs = readdirSync(join(ROOT, "src/server/capabilities")).filter((entry) =>
    statSync(join(ROOT, "src/server/capabilities", entry)).isDirectory(),
  );

  it("has a declared dependency list for every shipped capability", () => {
    expect(capabilityDirs.sort()).toEqual(Object.keys(DECLARED_DEPENDENCIES).sort());
  });

  it("never imports a capability it has not declared a dependency on", () => {
    const violations: string[] = [];

    for (const capability of capabilityDirs) {
      const allowed = new Set(DECLARED_DEPENDENCIES[capability] ?? []);
      for (const file of sourceFiles(join(ROOT, "src/server/capabilities", capability))) {
        const text = readFileSync(file, "utf8");
        for (const match of text.matchAll(/@\/server\/capabilities\/([a-z_]+)/g)) {
          const imported = match[1]!;
          if (imported === capability || allowed.has(imported)) continue;
          violations.push(`${capability} imports ${imported} without declaring it`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("routes every capability mutation through a command definition", () => {
    // A capability that mutates outside a CommandDefinition bypasses
    // authorization, events and audit in one step, which is the single most
    // damaging shortcut available to it.
    const violations: string[] = [];

    for (const capability of capabilityDirs) {
      for (const file of sourceFiles(join(ROOT, "src/server/capabilities", capability))) {
        const text = readFileSync(file, "utf8");
        const mutates = /\.(create|update|delete|createMany|updateMany|deleteMany|upsert)\(/.test(text);
        if (mutates && !text.includes("CommandDefinition")) {
          violations.push(relative(ROOT, file));
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("declares a verb and an entity on every command", () => {
    const violations: string[] = [];

    for (const capability of capabilityDirs) {
      for (const file of sourceFiles(join(ROOT, "src/server/capabilities", capability))) {
        const text = readFileSync(file, "utf8");
        // Each command literal must carry both, or the pipeline cannot
        // authorize it and would fall through to the capability gate alone.
        for (const block of text.split("CommandDefinition<").slice(1)) {
          const head = block.slice(0, 900);
          if (!/\bverb:\s*"/.test(head) || !/\bentity:\s*[A-Z_]/.test(head)) {
            violations.push(`${relative(ROOT, file)}: a command is missing verb or entity`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("never sets a tenant scope by hand inside a capability", () => {
    // Tenant context comes from withTenant. A capability calling set_config on
    // verity.tenant_id would be choosing its own isolation boundary.
    const violations = capabilityDirs.flatMap((capability) =>
      sourceFiles(join(ROOT, "src/server/capabilities", capability))
        .filter((file) => /set_config\(\s*'verity\.tenant_id'|SET LOCAL verity/.test(readFileSync(file, "utf8")))
        .map((file) => relative(ROOT, file)),
    );
    expect(violations).toEqual([]);
  });
});

describe("conformance: over-genericity (Phase G)", () => {
  it("keeps JSON columns to the declared extension points", () => {
    // Json is legitimate for custom_fields (PLA-EXT-001), event and automation
    // payloads, and configuration values. Anywhere else it is usually a
    // relational model that was not thought through, so the budget is fixed and
    // a new one has to be argued for rather than added quietly.
    const jsonFields = [...SCHEMA.matchAll(/^\s*(\w+)\s+Json/gm)].map((m) => m[1]!);
    const permitted = new Set([
      "customFields", "payload", "value", "config", "condition", "input", "output", "result",
    ]);
    const unexpected = jsonFields.filter((name) => !permitted.has(name));
    expect(unexpected).toEqual([]);
  });

  it("has no entity-attribute-value table", () => {
    // The failure mode the brief names first. An EAV table would show up as a
    // model carrying an attribute name and a loose value column side by side.
    const models = [...SCHEMA.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
    const suspects = models
      .filter(([, , body]) =>
        /\b(attributeName|attribute_name|fieldKey|propertyName)\b/.test(body) &&
        /\b(value|stringValue|numericValue)\b/.test(body),
      )
      .map(([, name]) => name);
    expect(suspects).toEqual([]);
  });

  it("keeps state machines declared as data, not as code branches", () => {
    // One transition runtime, driven by transition_definition rows. A capability
    // implementing its own switch over states would mean the platform's runtime
    // is not actually reusable.
    const capabilitySources = readdirSync(join(ROOT, "src/server/capabilities"))
      .filter((entry) => statSync(join(ROOT, "src/server/capabilities", entry)).isDirectory())
      .flatMap((entry) => sourceFiles(join(ROOT, "src/server/capabilities", entry)));

    const violations = capabilitySources
      .filter((file) => /switch\s*\(\s*\w*[Ss]tate\b/.test(readFileSync(file, "utf8")))
      .map((file) => relative(ROOT, file));
    expect(violations).toEqual([]);
  });

  it("keeps the platform surface small enough to stay comprehensible", () => {
    // Not a hard architectural rule, but a tripwire: unchecked growth in the
    // platform layer is how capability logic ends up there. If this fails the
    // question to ask is whether the new module belongs in a capability.
    const platformModules = sourceFiles(join(ROOT, "src/server/platform"));
    expect(platformModules.length).toBeLessThanOrEqual(24);
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
      // Evidence joins the audit tables: a proof-of-attendance photograph that
      // can be edited afterwards is not evidence.
      expect(guarded).toEqual(["activity", "domain_event", "evidence", "security_audit_event"]);
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
