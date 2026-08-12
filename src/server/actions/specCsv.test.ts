import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * CSV option auto-creation.
 *
 * Ported from Veda so that importing 400 rows no longer fails because one cell
 * held a colour nobody had typed into the options list — the old fix was to
 * leave the importer, add the option by hand, and start again.
 *
 * The rule that matters most is the dry-run boundary. `importGroupCsv` runs as a
 * preview unless `commit` is true, and a preview that mutates the schema is a
 * lie: an owner clicking "check my file" would silently gain six dropdown values
 * whether or not they went on to import.
 *
 * Read structurally. The action opens with `getOwnerUser()` and needs a request
 * context, and the interesting property is *which branch writes* rather than
 * what one call returns.
 */

const SOURCE = readFileSync(path.resolve(__dirname, "specCsv.ts"), "utf8");

/** Comments stripped, so prose describing a rule is not mistaken for the rule. */
const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

describe("option auto-creation", () => {
  it("creates options only when committing", () => {
    // The whole point. `commit ? await ensureOption(...) : null` is the guard.
    expect(code).toMatch(/commit\s*\?\s*await ensureOption\(/);
  });

  it("never calls the creator outside that guarded expression", () => {
    // A second, unguarded call site would reintroduce the writing dry run.
    const calls = code.match(/ensureOption\(/g) ?? [];
    // One definition plus exactly one guarded call.
    expect(calls.length).toBe(2);
  });

  it("deduplicates within one import", () => {
    // Forty rows with "Cherry Red" must produce one option, not forty attempts.
    expect(code).toMatch(/cache\.get\(cacheKey\)/);
    expect(code).toMatch(/cache\.set\(cacheKey/);
  });

  it("keys the cache the way the database enforces uniqueness", () => {
    // @@unique([fieldId, value]) — so the key has to be per field, and matching
    // case-insensitively or "cherry red" and "Cherry Red" become two options.
    expect(code).toMatch(/\$\{fieldId\}::\$\{label\.toLowerCase\(\)\}/);
  });

  it("looks before writing, and recovers from losing the race", () => {
    // Another import, or a hand edit, may have added it since the fields were
    // resolved. Failing the row for that would be absurd.
    expect(code).toMatch(/findFirst\(\{[\s\S]*?mode: "insensitive"/);
    expect(code).toMatch(/catch \{/);
  });

  it("does not invent a short code", () => {
    // Code templates depend on hand-picked short codes; a generated one would
    // collide. The PRD calls this out explicitly.
    const create = code.slice(code.indexOf("specFieldOption.create"));
    const data = create.slice(0, create.indexOf("})"));
    expect(data).not.toMatch(/shortCode/);
    // And it mirrors the convention in fieldEntries.ts: value === label.
    expect(data).toMatch(/value: label, label/);
  });

  it("continues the existing sort order rather than resetting it", () => {
    expect(code).toMatch(/sortOrder: count/);
  });

  it("reports what it added", () => {
    // Extending an option list changes the shape of the category. An owner
    // importing a supplier's file should be told their Colour column gained six
    // values, or a typo becomes a permanent option nobody notices.
    expect(code).toMatch(/addedOptions/);
    expect(code).toMatch(/\[\.\.\.new Set\(addedOptions\)\]/);
  });
});

describe("reference fields are deliberately not auto-created", () => {
  it("still reports an unresolved reference as an issue", () => {
    // A REFERENCE points at a real item or group row. Creating those from a CSV
    // cell is how a typo becomes a permanent catalogue entry — the same reason
    // `orderIngest` refuses to mint master data from an inbound order. Options
    // are metadata about a column; references are the catalogue itself.
    const referenceBranch = code.slice(code.indexOf('field.kind === "REFERENCE"'));
    const branch = referenceBranch.slice(0, referenceBranch.indexOf("} else if"));
    expect(branch).toMatch(/not found/);
    expect(branch).not.toMatch(/ensureOption/);
  });
});
