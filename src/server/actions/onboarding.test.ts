import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { VERTICAL_PACKS, resolvePackKey } from "@/platform/tenancy/packs";

/**
 * No tenant is provisioned without a vertical.
 *
 * The dashboard router falls back to auto components for an unrecognised
 * `industry`, which is right for a legacy row and wrong for a new tenant: a
 * facility-management company landing on a screen headed "Today Production" with
 * a QC pass rate concludes the product is not for them, and nothing anywhere
 * reports that it happened.
 *
 * Two paths used to make the wrong choice the easy one —
 * `createAndSignAgreementDirect` had an optional `verticalPack` that fell back
 * to auto components, and `acceptAgreement` wrote the literal string
 * "Custom Manufacturing", which resolves to no pack at all.
 */

const HQ = readFileSync(path.resolve(__dirname, "hq.ts"), "utf8");

/** Strip comments, so prose describing the old behaviour is not a match. */
const code = HQ.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

describe("provisioning requires a pack", () => {
  it("has no optional verticalPack on any provisioning action", () => {
    // `verticalPack?: string` is the shape that let a caller omit it.
    expect(code).not.toMatch(/verticalPack\?\s*:/);
  });

  it("validates the pack before provisioning, on every path", () => {
    // Both `provisionClient` and `createAndSignAgreementDirect` must reject an
    // unknown key rather than substituting a default.
    const checks = code.match(/VERTICAL_PACKS\[[^\]]+\]/g) ?? [];
    expect(checks.length).toBeGreaterThanOrEqual(2);
  });

  it("never writes a literal industry string that resolves to no pack", () => {
    // The failure this codifies: industry: "Custom Manufacturing".
    const literals = [...code.matchAll(/industry:\s*"([^"]+)"/g)].map((m) => m[1]);
    for (const literal of literals) {
      expect(
        resolvePackKey(literal),
        `industry: "${literal}" resolves to no pack, so the tenant falls through ` +
          "to the auto-components dashboard",
      ).not.toBeNull();
    }
  });

  it("refuses an agreement that names no pack", () => {
    expect(code).toMatch(/packFromAgreement/);
    expect(HQ).toMatch(/does not name a vertical pack/);
  });

  it("does not name a default pack anywhere", () => {
    // `industry: pack ? key : "auto_components"` was the original branch, and my
    // first version of this test looked for exactly that punctuation — so it
    // missed `|| "auto_components"` when I checked it by reinstating the bug.
    //
    // Asserting the literal is absent entirely is the version that holds. hq.ts
    // builds its error messages from Object.keys(VERTICAL_PACKS), so it has no
    // legitimate reason to name one pack.
    expect(
      code,
      "hq.ts names a specific pack, which is only ever a default in disguise",
    ).not.toContain("auto_components");
  });
});

describe("the four packs are the only choices", () => {
  it("offers exactly four", () => {
    expect(Object.keys(VERTICAL_PACKS)).toHaveLength(4);
  });

  it("resolves every one to itself", () => {
    for (const key of Object.keys(VERTICAL_PACKS)) {
      expect(resolvePackKey(key)).toBe(key);
    }
  });
});
