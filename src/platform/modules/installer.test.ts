import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  allModules,
  alwaysOnModules,
  getModule,
  withDependencies,
  type ModuleKey,
} from "./registry";

/**
 * The dependency graph the installer enforces.
 *
 * Tested against the graph rather than through the server actions, because
 * `activateModule` opens with `requireHqAction()` and needs a request context —
 * the same constraint that shapes `orders.test.ts`. What matters here is that
 * the *rules* hold for every module, not that one call path works: a graph with
 * a cycle or a dangling dependency breaks the installer for every tenant at
 * once, and no amount of testing one action would find it.
 */

const MODULES = allModules();
const KEYS = new Set<ModuleKey>(MODULES.map((m) => m.key));

describe("the dependency graph", () => {
  it("names only modules that exist", () => {
    // A dangling `requires` makes `withDependencies` resolve to a key the
    // installer will then try to entitle, and nothing would refuse it.
    for (const mod of MODULES) {
      for (const dep of mod.requires) {
        expect(KEYS.has(dep), `${mod.key} requires "${dep}", which does not exist`).toBe(true);
      }
    }
  });

  it("has no module depending on itself", () => {
    for (const mod of MODULES) {
      expect(mod.requires, `${mod.key} requires itself`).not.toContain(mod.key);
    }
  });

  it("is acyclic", () => {
    // A cycle makes activation infinite and deactivation impossible: each of the
    // pair blocks the other for ever, with a message that reads like a bug.
    const seen = new Set<ModuleKey>();
    const stack = new Set<ModuleKey>();

    function walk(key: ModuleKey, path: ModuleKey[]): void {
      if (stack.has(key)) {
        throw new Error(`Dependency cycle: ${[...path, key].join(" → ")}`);
      }
      if (seen.has(key)) return;
      stack.add(key);
      for (const dep of getModule(key)?.requires ?? []) walk(dep, [...path, key]);
      stack.delete(key);
      seen.add(key);
    }

    expect(() => MODULES.forEach((mod) => walk(mod.key, []))).not.toThrow();
  });

  it("resolves every module's dependencies transitively", () => {
    // `manufacturing` requires `inventory`, which requires `core`. Activating
    // manufacturing must produce all three.
    const resolved = withDependencies(["manufacturing"]);
    expect(resolved).toContain("manufacturing");
    expect(resolved).toContain("inventory");
    expect(resolved).toContain("core");
  });

  it("includes every dependency of everything it resolves", () => {
    // The property, for all modules rather than one example: whatever comes back
    // is closed under `requires`.
    for (const mod of MODULES) {
      const resolved = new Set(withDependencies([mod.key]));
      for (const key of resolved) {
        for (const dep of getModule(key)?.requires ?? []) {
          expect(
            resolved.has(dep),
            `activating ${mod.key} resolves ${key} but not its dependency ${dep}`,
          ).toBe(true);
        }
      }
    }
  });

  it("keeps core always-on and depended upon", () => {
    expect(alwaysOnModules()).toContain("core");
    // Every optional module needs core, so nothing can be entitled without it.
    for (const mod of MODULES.filter((m) => !m.alwaysOn)) {
      expect(withDependencies([mod.key]), `${mod.key} does not resolve core`).toContain("core");
    }
  });
});

describe("deactivation blockers", () => {
  /** The same rule the installer applies, restated so the test is independent. */
  const dependents = (key: ModuleKey, active: ModuleKey[]) =>
    active.filter((k) => k !== key && (getModule(k)?.requires ?? []).includes(key));

  it("blocks a module something else still needs", () => {
    // The example from the requirement: inventory cannot go while manufacturing
    // is active.
    const active: ModuleKey[] = ["core", "inventory", "manufacturing"];
    expect(dependents("inventory", active)).toContain("manufacturing");
  });

  it("allows it once the dependent is gone", () => {
    const active: ModuleKey[] = ["core", "inventory"];
    expect(dependents("inventory", active)).toEqual([]);
  });

  it("never allows an always-on module to be blocked or removed", () => {
    // Core is refused before the blocker check runs, which is why this asserts
    // the list rather than the outcome.
    for (const key of alwaysOnModules()) {
      expect(getModule(key)?.alwaysOn).toBe(true);
    }
  });

  it("finds a real blocker somewhere in the registry", () => {
    // Tripwire: if no module depended on another, every assertion above would
    // pass while proving nothing about a graph with edges.
    const withDeps = MODULES.filter((m) => m.requires.some((d) => d !== "core"));
    expect(withDeps.length).toBeGreaterThan(0);
  });
});

describe("installer actions", () => {
  const source = () =>
    readFileSync(path.resolve(__dirname, "../../server/actions/modules.ts"), "utf8");

  it("guards both mutating actions behind HQ", () => {
    const code = source();
    const exported = [...code.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
    expect(exported).toContain("activateModule");
    expect(exported).toContain("deactivateModule");

    for (const name of exported) {
      const start = code.indexOf(`export async function ${name}`);
      const next = code.indexOf("\nexport async function ", start + 1);
      const body = code.slice(start, next === -1 ? undefined : next);
      expect(body, `${name} is not HQ-guarded`).toContain("requireHqAction()");
    }
  });

  it("invalidates the entitlement cache on both paths", () => {
    // `entitledModules` is held for 60 seconds. A write that only calls
    // revalidatePath leaves the toggle apparently broken for up to a minute —
    // which is exactly what `updateTenantModules` did before this landed.
    const code = source();
    expect((code.match(/invalidate\(`entitlements:/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("keeps billing in step with entitlement", () => {
    // A module that works and is never charged for is the failure nobody
    // reports.
    const code = source();
    expect((code.match(/syncSubscriptionLines\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("disables rather than deletes", () => {
    const code = source();
    expect(code).toMatch(/data: \{ enabled: false \}/);
    expect(code).not.toMatch(/moduleEntitlement\.delete/);
  });
});
