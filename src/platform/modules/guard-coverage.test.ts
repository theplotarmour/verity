import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

import { ACTION_OWNERSHIP, ROUTE_OWNERSHIP, requiresGuard } from "./ownership";
import { getModule } from "./registry";

/**
 * Module enablement has to be authoritative, not advisory.
 *
 * Hiding a nav link is an affordance — the URL is still reachable by typing it,
 * and a server action is reachable by anyone who can POST. This test reads
 * `ownership.ts` and fails when a module-owned surface has no guard, which is the
 * difference between "Tasks disappears from the sidebar" and "Tasks is disabled".
 *
 * It also fails when the matrix and the filesystem disagree in either direction: a
 * new page nobody classified, or a classification pointing at a file that has been
 * deleted. Both are how a matrix rots into decoration.
 */

const OWNER_DIR = path.resolve(__dirname, "../../app/owner");
const ACTIONS_DIR = path.resolve(__dirname, "../../server/actions");

function pageFiles(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...pageFiles(path.join(dir, entry.name), rel));
    else if (entry.name === "page.tsx") out.push(rel);
  }
  return out;
}

const PAGES = pageFiles(OWNER_DIR);
const ACTION_FILES = readdirSync(ACTIONS_DIR).filter(
  (f) => f.endsWith(".ts") && !f.includes(".test."),
);

describe("the ownership matrix is complete", () => {
  it("finds the surfaces it is meant to classify", () => {
    // Guards the guard: a broken walk makes every assertion below vacuous.
    expect(PAGES.length).toBeGreaterThan(30);
    expect(ACTION_FILES.length).toBeGreaterThan(40);
  });

  it("classifies every owner page", () => {
    const unclassified = PAGES.filter((p) => !(p in ROUTE_OWNERSHIP));
    expect(
      unclassified,
      "New pages must be classified in ownership.ts — core, public, deferred, or a " +
        "module key. An unclassified page is an unguarded one by default:\n  " +
        unclassified.join("\n  "),
    ).toEqual([]);
  });

  it("classifies every action file", () => {
    const unclassified = ACTION_FILES.filter((f) => !(f in ACTION_OWNERSHIP));
    expect(
      unclassified,
      `Unclassified action files:\n  ${unclassified.join("\n  ")}`,
    ).toEqual([]);
  });

  it("does not classify surfaces that no longer exist", () => {
    const ghosts = [
      ...Object.keys(ROUTE_OWNERSHIP).filter((p) => !existsSync(path.join(OWNER_DIR, p))),
      ...Object.keys(ACTION_OWNERSHIP).filter((f) => !existsSync(path.join(ACTIONS_DIR, f))),
    ];
    expect(ghosts, `Matrix names files that are gone:\n  ${ghosts.join("\n  ")}`).toEqual([]);
  });

  it("only names modules the registry actually has", () => {
    const bad: string[] = [];
    for (const [surface, owner] of [
      ...Object.entries(ROUTE_OWNERSHIP),
      ...Object.entries(ACTION_OWNERSHIP),
    ]) {
      if (requiresGuard(owner) && !getModule(owner)) bad.push(`${surface} -> ${owner}`);
    }
    expect(bad, `Unknown module keys:\n  ${bad.join("\n  ")}`).toEqual([]);
  });
});

describe("module-owned surfaces are guarded", () => {
  it("every module-owned page calls guardModulePage", () => {
    const missing: string[] = [];
    for (const [route, owner] of Object.entries(ROUTE_OWNERSHIP)) {
      if (!requiresGuard(owner)) continue;
      const source = readFileSync(path.join(OWNER_DIR, route), "utf8");
      if (!source.includes("guardModulePage")) missing.push(`${route} (${owner})`);
    }
    expect(
      missing,
      "A page without a guard is reachable by typing its URL:\n  " + missing.join("\n  "),
    ).toEqual([]);
  });

  it("every module-owned page guards on the module the matrix names", () => {
    // A guard naming the wrong module blocks the wrong tenants, which is worse
    // than no guard because it looks handled.
    const wrong: string[] = [];
    for (const [route, owner] of Object.entries(ROUTE_OWNERSHIP)) {
      if (!requiresGuard(owner)) continue;
      const source = readFileSync(path.join(OWNER_DIR, route), "utf8");
      // Either quote style — parts of this codebase are single-quoted.
      const named = new RegExp(`guardModulePage\\(\\s*["']${owner}["']\\s*\\)`);
      if (!named.test(source)) wrong.push(`${route} should guard "${owner}"`);
    }
    expect(wrong, wrong.join("\n  ")).toEqual([]);
  });

  it("every module-owned action file carries at least one guard", () => {
    const missing: string[] = [];
    for (const [file, owner] of Object.entries(ACTION_OWNERSHIP)) {
      if (!requiresGuard(owner)) continue;
      const source = readFileSync(path.join(ACTIONS_DIR, file), "utf8");
      if (!/guardModule(Action|Write)\(/.test(source)) missing.push(`${file} (${owner})`);
    }
    expect(
      missing,
      "A server action is a public POST endpoint. Without a guard, disabling the " +
        "module removes the nav and leaves the API open:\n  " + missing.join("\n  "),
    ).toEqual([]);
  });

  it("guards name the owning module, not a neighbour's", () => {
    const wrong: string[] = [];
    for (const [file, owner] of Object.entries(ACTION_OWNERSHIP)) {
      if (!requiresGuard(owner)) continue;
      const source = readFileSync(path.join(ACTIONS_DIR, file), "utf8");
      for (const match of source.matchAll(/guardModule(?:Action|Write)\("([^"]+)"\)/g)) {
        const named = match[1];
        // A module may legitimately guard on one it declares as a dependency.
        const allowed = new Set([owner, ...(getModule(owner)?.requires ?? [])]);
        if (!allowed.has(named as never)) wrong.push(`${file} guards "${named}", owned by "${owner}"`);
      }
    }
    expect(wrong, wrong.join("\n  ")).toEqual([]);
  });
});

describe("deferred classifications stay visible", () => {
  it("lists what is still undecided", () => {
    /*
     * Not a failure — a receipt. These are the surfaces whose ownership is a real
     * question (is master data cross-module config or inventory's?), and the point
     * of naming them is that nobody resolves it by accident while editing
     * something else. When the decision lands, the entry moves and this count drops.
     */
    const deferred = [
      ...Object.entries(ROUTE_OWNERSHIP),
      ...Object.entries(ACTION_OWNERSHIP),
    ].filter(([, owner]) => owner === "deferred");

    expect(deferred.length).toBeGreaterThan(0);
    // If this ever hits zero, delete this test — the question is answered.
    expect(deferred.length).toBeLessThanOrEqual(21);
  });
});
