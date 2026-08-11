import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Tenant isolation, enforced structurally.
 *
 * Every action in this codebase claims to filter on `factoryId`, and nothing
 * asserted it. A single missed filter is a cross-tenant data leak, and it would
 * pass human review because the code looks exactly like every other action —
 * the bug is the *absence* of a clause, which is the hardest kind to see.
 *
 * These tests read the source rather than calling the actions, because the
 * actions call `getOwnerUser()` and need a request context (see orders.test.ts
 * for the same constraint). Reading the source is also what catches the failure
 * at the moment it is introduced rather than only when two tenants exist.
 *
 * The rule: a query that *opens* a scope must name the tenant. A query keyed by
 * a primary key does not, because the id it uses was resolved by a scoped
 * lookup immediately above — `findFirst({ where: { id, factoryId } })` then
 * `update({ where: { id } })` is the established pattern here and is safe.
 */

const ACTIONS_DIR = path.resolve(__dirname);
const SCHEMA = path.resolve(__dirname, "../../../prisma/schema.prisma");

/** Action modules covering the service spine, plus the cross-tenant console. */
const GUARDED_FILES = [
  "sites.ts",
  "helpdesk.ts",
  "projects.ts",
  "assets.ts",
  "scheduling.ts",
  "billing.ts",
  "serviceQuality.ts",
  "integrations.ts",
];

/**
 * Methods that open a scope: they select or affect a *set*, so without a tenant
 * clause they reach across every workspace.
 */
const SCOPE_OPENING = [
  "findMany",
  "findFirst",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
  "createMany",
  "create",
];

/** Models carrying their own `factoryId`, read from the schema, not hardcoded. */
function modelsWithFactoryId(): Set<string> {
  const schema = readFileSync(SCHEMA, "utf8");
  const found = new Set<string>();
  const modelBlock = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  while ((m = modelBlock.exec(schema)) !== null) {
    const [, name, body] = m;
    if (/^\s*factoryId\s+String/m.test(body)) {
      // Prisma model names are PascalCase; the client property is camelCase.
      found.add(name.charAt(0).toLowerCase() + name.slice(1));
    }
  }
  return found;
}

/** The balanced `{...}` argument that follows a call, so nested braces survive. */
function argumentBlock(source: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(" || ch === "{") depth++;
    else if (ch === ")" || ch === "}") {
      depth--;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }
  return source.slice(openIndex);
}

interface Call {
  file: string;
  model: string;
  method: string;
  line: number;
  args: string;
}

function scopeOpeningCalls(file: string): Call[] {
  const source = readFileSync(path.join(ACTIONS_DIR, file), "utf8");
  const scoped = modelsWithFactoryId();
  const calls: Call[] = [];

  const pattern = /(?:prisma|tx)\.(\w+)\.(\w+)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(source)) !== null) {
    const [, model, method] = m;
    if (!SCOPE_OPENING.includes(method)) continue;
    if (!scoped.has(model)) continue; // scoped through a parent instead

    calls.push({
      file,
      model,
      method,
      line: source.slice(0, m.index).split("\n").length,
      args: argumentBlock(source, m.index + m[0].length - 1),
    });
  }
  return calls;
}

describe("tenant isolation", () => {
  it("finds the service action modules it is meant to be guarding", () => {
    const present = readdirSync(ACTIONS_DIR);
    for (const file of GUARDED_FILES) {
      expect(present, `${file} is missing — update GUARDED_FILES if it was renamed`).toContain(
        file,
      );
    }
  });

  it("every scope-opening query on a tenant-owned model names factoryId", () => {
    const offenders: string[] = [];

    for (const file of GUARDED_FILES) {
      for (const call of scopeOpeningCalls(file)) {
        if (call.args.includes("factoryId")) continue;
        offenders.push(
          `${call.file}:${call.line}  prisma.${call.model}.${call.method}() has no factoryId`,
        );
      }
    }

    expect(
      offenders,
      `Unscoped queries reach across tenants:\n  ${offenders.join("\n  ")}\n\n` +
        "Add factoryId to the where clause, or scope through a parent that has one.",
    ).toEqual([]);
  });

  it("checks a meaningful number of queries, so a broken matcher cannot pass silently", () => {
    // A regex that stops matching would make the test above vacuously green.
    // This is the tripwire for that.
    const total = GUARDED_FILES.reduce((n, f) => n + scopeOpeningCalls(f).length, 0);
    expect(total).toBeGreaterThan(40);
  });

  it("detail lookups use findFirst, never findUnique by bare id", () => {
    // findUnique({ where: { id } }) returns another tenant's row and leaves the
    // check to whatever comes after — which is exactly the check people forget.
    // findFirst({ where: { id, factoryId } }) cannot be got wrong that way.
    const offenders: string[] = [];

    for (const file of GUARDED_FILES) {
      const source = readFileSync(path.join(ACTIONS_DIR, file), "utf8");
      const pattern = /(?:prisma|tx)\.(\w+)\.findUnique\s*\(/g;
      const scoped = modelsWithFactoryId();
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(source)) !== null) {
        const [, model] = m;
        if (!scoped.has(model)) continue;
        const args = argumentBlock(source, m.index + m[0].length - 1);
        // A compound unique that includes the tenant is fine.
        if (args.includes("factoryId")) continue;
        const line = source.slice(0, m.index).split("\n").length;
        offenders.push(`${file}:${line}  prisma.${model}.findUnique() without factoryId`);
      }
    }

    expect(
      offenders,
      `Use findFirst({ where: { id, factoryId } }) instead:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });
});

describe("cross-tenant surface", () => {
  it("every exported action in hq.ts is guarded by requireHqAction", () => {
    // hq.ts reads and writes across every tenant. These are public POST
    // endpoints; they had no guard at all until d95b5c8, at which point
    // getClientsList() would enumerate every workspace for any caller.
    const source = readFileSync(path.join(ACTIONS_DIR, "hq.ts"), "utf8");
    const exported = [...source.matchAll(/export async function (\w+)\s*\(/g)].map((m) => m[1]);

    expect(exported.length).toBeGreaterThan(10);

    const unguarded = exported.filter((name) => {
      const start = source.indexOf(`export async function ${name}`);
      const next = source.indexOf("\nexport async function ", start + 1);
      const body = source.slice(start, next === -1 ? undefined : next);
      return !body.includes("requireHqAction()");
    });

    expect(
      unguarded,
      `Unguarded cross-tenant actions: ${unguarded.join(", ")}`,
    ).toEqual([]);
  });

  it("owner-facing integration actions never take a factoryId argument", () => {
    // `hq.ts` legitimately takes one — an operator acts across tenants and is
    // gated by requireHqAction(). `integrations.ts` is the same capability
    // exposed to owners, where a factoryId parameter would be a field naming
    // somebody else's workspace. It must come from the session, always.
    const source = readFileSync(path.join(ACTIONS_DIR, "integrations.ts"), "utf8");

    const signatures = [...source.matchAll(/export async function (\w+)\(([^)]*)\)/g)];
    expect(signatures.length).toBeGreaterThan(3);

    const offenders = signatures
      .filter(([, , params]) => /factoryId/.test(params))
      .map(([, name]) => name);

    expect(
      offenders,
      `These accept a factoryId from the caller: ${offenders.join(", ")}. ` +
        "Read it from getOwnerUser() instead.",
    ).toEqual([]);

    // And it must actually resolve one.
    expect(source).toMatch(/user\.factoryId/);
  });

  it("storage upload requires a session and anchors the path to the caller", () => {
    // A "use server" export writing to a public bucket. Without both of these
    // it is an open upload endpoint on your domain and your bill.
    const source = readFileSync(path.join(ACTIONS_DIR, "storage.ts"), "utf8");
    expect(source).toMatch(/getUserSession\(\)/);
    expect(source).toMatch(/session\.factoryId/);
  });
});
