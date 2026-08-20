import { describe, it, expect } from "vitest";

import { parseSuggestion } from "./onboarding";
import { VERTICAL_PACKS } from "@/platform/tenancy/packs";

/**
 * R5 — pack suggestion validation.
 *
 * The model chooses from a list; this is the gate that stops it from choosing
 * something that is not on it. A suggestion is only ever a real pack key or
 * nothing — never a plausible-sounding string that becomes a provisioning
 * decision downstream.
 */

describe("parseSuggestion", () => {
  it("accepts a real pack key and fills in its label and modules", () => {
    const s = parseSuggestion("franchise_qsr");
    expect(s).not.toBeNull();
    expect(s!.packKey).toBe("franchise_qsr");
    expect(s!.label).toBe(VERTICAL_PACKS.franchise_qsr.label);
    expect(s!.modules).toContain("core");
    expect(s!.modules).toContain("sites");
  });

  it("accepts the human label the model might echo back", () => {
    expect(parseSuggestion("Facility Management")?.packKey).toBe("facility_management");
  });

  it("rejects a hallucinated pack rather than passing it through", () => {
    // The failure this exists for: the model invents 'hospitality_pro' and the
    // wizard tries to provision a pack that does not exist.
    expect(parseSuggestion("hospitality_pro")).toBeNull();
    expect(parseSuggestion("none")).toBeNull();
    expect(parseSuggestion("")).toBeNull();
    expect(parseSuggestion(null)).toBeNull();
  });

  it("tolerates surrounding whitespace the model adds", () => {
    expect(parseSuggestion("  franchise_retail \n")?.packKey).toBe("franchise_retail");
  });
});
