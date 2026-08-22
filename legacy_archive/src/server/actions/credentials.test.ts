import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { phoneKey } from "@/lib/phone";

/**
 * Credential hygiene at the two moments an account is created or used.
 *
 * Both failures these guard against are silent. A fixed default PIN looks like
 * a working onboarding flow; an unnormalised phone number looks like a working
 * account until the person tries to sign in and is told their correct number is
 * invalid. Neither raises anything, anywhere.
 */

const ACTIONS = path.resolve(__dirname);
const read = (file: string) => readFileSync(path.join(ACTIONS, file), "utf8");

/** Strip comments, so a line *describing* the old behaviour is not a match. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");
}

describe("PINs are generated, never defaulted", () => {
  it.each(["hq.ts", "team.ts", "employee.ts"])("%s assigns no constant PIN", (file) => {
    // hashPin is salted by factoryId alone, so a constant default makes every
    // provisioned owner account guessable the moment the workspace is known.
    const source = code(read(file));
    const literals = [...source.matchAll(/pin\s*=\s*["'](\d{4,6})["']/gi)].map((m) => m[1]);
    expect(
      literals,
      `Hardcoded PIN(s) in ${file}: ${literals.join(", ")}. Use generatePin().`,
    ).toEqual([]);
  });

  it("hq.ts returns the generated PIN so it can be shown once", () => {
    // Generating a PIN and not returning it is worse than a fixed one: the
    // account exists and nobody can get into it.
    const source = read("hq.ts");
    // `= generatePin()` matches calls only; a bare /generatePin\(\)/ also
    // matches the function's own declaration and inflates the count by one.
    const generated = (source.match(/=\s*generatePin\(\)/g) ?? []).length;
    const returned = (source.match(/credentials:\s*\{/g) ?? []).length;
    expect(generated).toBeGreaterThan(0);
    expect(returned, "every generated PIN must be surfaced once").toBeGreaterThanOrEqual(generated);
  });
});

describe("phone numbers are canonicalised on the identity paths", () => {
  it.each([
    ["auth.ts", "login"],
    ["hq.ts", "client provisioning"],
    ["team.ts", "team invites"],
    ["employee.ts", "employee creation"],
  ])("%s (%s) uses phoneKey", (file) => {
    const source = code(read(file));
    expect(source, `${file} should canonicalise via phoneKey`).toContain("phoneKey(");
  });

  it.each([["auth.ts"], ["team.ts"], ["employee.ts"]])(
    "%s no longer strips digits by hand for identity",
    (file) => {
      // The bug: "+91 70114 40350" strips to "917011440350", which matches no
      // stored account — so a correct number is rejected as invalid.
      const source = code(read(file));
      expect(source).not.toMatch(/(?:phone|Phone)[^;\n]*\.replace\(\/\\D\/g/);
    },
  );

  it("canonicalisation actually collapses the forms a person types", () => {
    // The property the guards above are protecting.
    const forms = ["7011440350", "+917011440350", "+91 70114 40350", "091-7011440350"];
    const keys = new Set(forms.map(phoneKey));
    expect(keys.size, `these should all be one number: ${[...keys].join(", ")}`).toBe(1);
    expect([...keys][0]).toBe("7011440350");
  });
});
