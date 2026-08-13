import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * A module guard belongs in a function body, never in its signature.
 *
 * This exists because it happened. A bulk edit that injected `guardModule*` calls
 * across the action layer scanned for the opening brace of each function and found
 * the brace of its *parameter type literal* instead — an off-by-one on the brace
 * walk. Eleven guards landed inside type declarations:
 *
 *     export async function createDispatch(data: {
 *       await guardModuleWrite("sales");   // <- inside the type
 *       salesOrderId: string;
 *     }) {
 *
 * That is 122 TypeScript errors and a `main` that does not compile, and it reached
 * origin. A twelfth landed inline on a single-line type literal, which the first
 * cleanup pass missed because it only looked for guards alone on a line.
 *
 * The check is cheap and mechanical, which is exactly what the original edit was
 * not.
 */

const ACTIONS_DIR = __dirname;
const APP_DIR = path.resolve(__dirname, "../../app");

const GUARD_CALL = /guardModule(?:Action|Write|Page)\s*\(/;

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFiles(full));
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) out.push(full);
  }
  return out;
}

/**
 * Paren depth at the start of each line, skipping strings and comments.
 *
 * Inside parentheses means inside a parameter list — the one place a guard must
 * never be.
 */
function parenDepths(lines: string[]): number[] {
  let depth = 0;
  let inBlockComment = false;
  const out: number[] = [];
  for (const line of lines) {
    out.push(depth);
    let i = 0;
    while (i < line.length) {
      const two = line.slice(i, i + 2);
      if (inBlockComment) {
        if (two === "*/") { inBlockComment = false; i += 2; continue; }
        i += 1;
        continue;
      }
      if (two === "/*") { inBlockComment = true; i += 2; continue; }
      if (two === "//") break;
      const ch = line[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const quote = ch;
        i += 1;
        while (i < line.length) {
          if (line[i] === "\\") { i += 2; continue; }
          if (line[i] === quote) { i += 1; break; }
          i += 1;
        }
        continue;
      }
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      i += 1;
    }
  }
  return out;
}

const FILES = [...tsFiles(ACTIONS_DIR), ...tsFiles(APP_DIR)];

describe("module guards sit in function bodies", () => {
  it("scans a meaningful number of files", () => {
    // Guards the guard: a broken directory walk would make every assertion below
    // vacuously true.
    expect(FILES.length).toBeGreaterThan(50);
    expect(FILES.some((f) => f.endsWith("purchase.ts"))).toBe(true);
  });

  it("never places a guard inside a parameter list", () => {
    const offences: string[] = [];

    for (const file of FILES) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      if (!lines.some((l) => GUARD_CALL.test(l))) continue;
      const depths = parenDepths(lines);

      lines.forEach((line, i) => {
        if (!GUARD_CALL.test(line)) return;
        // An import line mentions the name without calling it in a signature.
        if (/^\s*import\b/.test(line)) return;
        if (depths[i] > 0) {
          offences.push(`${path.relative(ACTIONS_DIR, file)}:${i + 1}  ${line.trim()}`);
        }
      });
    }

    expect(
      offences,
      "A guard inside a parameter list is a syntax error, not a style problem:\n  " +
        offences.join("\n  "),
    ).toEqual([]);
  });

  it("never shares a line with a type field", () => {
    // The inline variant: `await guardModuleWrite("sales"); productVariantId: string;`
    // parses as a type member and slipped past a line-based cleanup.
    const inline = /guardModule(?:Action|Write|Page)\s*\("[^"]*"\)\s*;\s*\S/;
    const offences: string[] = [];

    for (const file of FILES) {
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (/^\s*(import|export)\b/.test(line)) return;
          if (inline.test(line)) {
            offences.push(`${path.relative(ACTIONS_DIR, file)}:${i + 1}  ${line.trim()}`);
          }
        });
    }

    expect(offences, `A guard must be the whole statement:\n  ${offences.join("\n  ")}`).toEqual([]);
  });

  it("authenticates before it checks entitlement", () => {
    /*
     * Order matters. A guard that runs before the session check answers an
     * anonymous caller with "the X module is not enabled", which confirms the
     * tenant exists and names its module set. Unauthorized has to come first.
     */
    const offences: string[] = [];

    for (const file of tsFiles(ACTIONS_DIR)) {
      const source = readFileSync(file, "utf8");
      if (!GUARD_CALL.test(source)) continue;

      const lines = source.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!GUARD_CALL.test(line) || /^\s*import\b/.test(line)) return;
        /*
         * Only the helpers that can *return* null need an explicit check before
         * the guard. `getOwnerUser()` redirects on no session and never returns
         * null, so a guard on the next line is already past authentication —
         * demanding an `if (!user)` there would be demanding dead code.
         */
        const window = lines.slice(Math.max(0, i - 8), i).join("\n");
        const nullable = /await\s+(getUserSession|getActiveSessionUser)\s*\(/.test(window);
        const hasCheck = /if\s*\(\s*!\w+/.test(window);
        if (nullable && !hasCheck) {
          offences.push(`${path.relative(ACTIONS_DIR, file)}:${i + 1}`);
        }
      });
    }

    expect(
      offences,
      `Guard runs before the session is checked:\n  ${offences.join("\n  ")}`,
    ).toEqual([]);
  });
});
