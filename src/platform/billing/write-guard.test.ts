import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Every mutating action refuses a read-only workspace.
 *
 * This is the guard that makes read-only mean something. Hiding a button is not
 * enforcement: every `"use server"` export is a public POST endpoint, which is
 * the lesson `uploadStorageImage` already taught this codebase — it was an
 * unauthenticated upload for months because nothing linked to it.
 *
 * Checked structurally, because the failure is silent in both directions. A
 * mutating action on `guardModuleAction` keeps writing after a trial lapses,
 * and nothing reports it. A *read* on `guardModuleWrite` breaks the read half of
 * read-only, which is the entire point of the state.
 */

const ACTIONS = path.resolve(__dirname, "../../server/actions");

/** Modules whose actions are subscription-gated. */
const GUARDED = [
  "sites.ts",
  "helpdesk.ts",
  "projects.ts",
  "assets.ts",
  "scheduling.ts",
  "billing.ts",
  "serviceQuality.ts",
  "franchise.ts",
];

/**
 * Names that read. Anything else that carries a module guard is treated as a
 * write and must use the write guard.
 *
 * `resolve` is deliberately **not** here. `resolveSwap` approves a shift swap
 * and `resolveServiceInspection` approves an inspection — both write, and both
 * were miscategorised on the first pass by a prefix rule that assumed otherwise.
 */
const READ_PREFIXES = ["get", "list", "fetch", "search", "load", "count", "export"];

interface Action {
  file: string;
  name: string;
  guard: "action" | "write" | null;
  line: number;
}

function actionsIn(file: string): Action[] {
  const source = readFileSync(path.join(ACTIONS, file), "utf8");
  const lines = source.split(/\r?\n/);
  const found: Action[] = [];

  let current: Action | null = null;
  lines.forEach((line, index) => {
    const declaration = line.match(/^export async function (\w+)/);
    if (declaration) {
      if (current) found.push(current);
      current = { file, name: declaration[1], guard: null, line: index + 1 };
      return;
    }
    if (current && current.guard === null) {
      if (line.includes("guardModuleWrite(")) current.guard = "write";
      else if (line.includes("guardModuleAction(")) current.guard = "action";
    }
  });
  if (current) found.push(current);

  return found;
}

const isRead = (name: string) =>
  READ_PREFIXES.some(
    (prefix) => name.startsWith(prefix) && name[prefix.length] === name[prefix.length]?.toUpperCase(),
  );

describe("write guard coverage", () => {
  const all = GUARDED.flatMap(actionsIn);

  it("finds a meaningful number of guarded actions", () => {
    // Tripwire: a parser that stopped matching would make everything below pass.
    expect(all.filter((a) => a.guard !== null).length).toBeGreaterThan(50);
  });

  it("every mutating action uses guardModuleWrite", () => {
    const offenders = all
      .filter((a) => a.guard === "action" && !isRead(a.name))
      .map((a) => `${a.file}:${a.line} ${a.name}()`);

    expect(
      offenders,
      `These mutate but only check entitlement, so they keep writing after a\n` +
        `trial lapses:\n  ${offenders.join("\n  ")}\n\n` +
        "Use guardModuleWrite(), or rename to a read prefix if it does not write.",
    ).toEqual([]);
  });

  it("no read uses the write guard", () => {
    // A read behind the write guard breaks the read half of read-only — a
    // tenant whose trial lapsed could not even look at their own data.
    const offenders = all
      .filter((a) => a.guard === "write" && isRead(a.name))
      .map((a) => `${a.file}:${a.line} ${a.name}()`);

    expect(
      offenders,
      `These are reads behind the write guard, so a read-only tenant cannot\n` +
        `view their own data:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("covers both kinds, so neither assertion is vacuous", () => {
    // If every action were a read, the first test would pass while proving
    // nothing; if every one were a write, the second would.
    expect(all.some((a) => a.guard === "write")).toBe(true);
    expect(all.some((a) => a.guard === "action")).toBe(true);
  });
});

describe("the guard itself", () => {
  const guard = readFileSync(path.resolve(__dirname, "../modules/guard.ts"), "utf8");

  it("checks the subscription, not just entitlement", () => {
    expect(guard).toMatch(/guardModuleWrite/);
    expect(guard).toMatch(/assertWritable/);
  });

  it("offers a core-only write guard for actions with no optional module", () => {
    expect(guard).toMatch(/export async function guardWrite/);
  });

  it("throws rather than returning a flag", () => {
    // A guard whose result can be ignored will be.
    const subscription = readFileSync(path.resolve(__dirname, "subscription.ts"), "utf8");
    expect(subscription).toMatch(/throw new ReadOnlyWorkspaceError/);
  });

  it("treats a missing subscription as unrestricted", () => {
    // Every existing tenant predates the table. A missing row must not freeze a
    // paying customer out of their own workspace.
    const subscription = readFileSync(path.resolve(__dirname, "subscription.ts"), "utf8");
    expect(subscription).toMatch(/subscription\?\.frozen/);
  });
});
