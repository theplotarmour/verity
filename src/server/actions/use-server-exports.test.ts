import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * A `"use server"` module may export only async functions.
 *
 * Next enforces this at build time, and the failure is expensive to read: `tsc`
 * passes, the error says "Ecmascript file had an error", and the import trace
 * points at whoever imported the module rather than at the offending export. It
 * cost two build breaks in one sitting — a `QC_FAIL_THRESHOLD` const and a
 * `WARNINGS_QUEUE_LIMIT` const, both perfectly reasonable-looking lines.
 *
 * Constants and pure helpers belong in a plain module beside the action, which is
 * where `lib/qc-score.ts`, `lib/stage-holds.ts` and `lib/notifications.ts` came
 * from. This test is much cheaper than the build.
 */

const ACTIONS_DIR = __dirname;

function serverActionFiles(): string[] {
  return readdirSync(ACTIONS_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .filter((f) => {
      const source = readFileSync(path.join(ACTIONS_DIR, f), "utf8");
      return /^\s*["']use server["']/.test(source);
    });
}

/** Exported names that are not `export async function` / `export type` / `export interface`. */
function offendingExports(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");
  const bad: string[] = [];

  for (const match of code.matchAll(/^export\s+(.+?)[\s({=]/gm)) {
    const rest = match[1].trim();
    // Types are erased before the directive matters.
    if (/^(type|interface)$/.test(rest)) continue;
    // The one legal value export.
    if (rest === "async") continue;
    // `export { x }` / `export * from` re-exports: allowed only if what they
    // forward is itself async, which this scan cannot see. Flag them so the
    // decision is deliberate rather than accidental.
    bad.push(rest);
  }
  return bad;
}

describe('"use server" modules export only async functions', () => {
  const files = serverActionFiles();

  it("finds the action modules to check", () => {
    // Guards the guard: a broken directive regex would make this vacuously pass.
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain("qc.ts");
    expect(files).toContain("notifications.ts");
  });

  it.each(files)("%s", (file) => {
    const source = readFileSync(path.join(ACTIONS_DIR, file), "utf8");
    expect(
      offendingExports(source),
      `${file} is "use server", so every export must be an async function. ` +
        "Move constants, types-with-values and sync helpers into a plain module " +
        "(see src/lib/qc-score.ts) and import them here.",
    ).toEqual([]);
  });
});
