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
    const s = parseSuggestion("modern_qsr");
    expect(s).not.toBeNull();
    expect(s!.packKey).toBe("modern_qsr");
    expect(s!.label).toBe(VERTICAL_PACKS.modern_qsr.label);
    expect(s!.modules).toContain("core");
    expect(s!.modules).toContain("tables_orders");
  });

  it("accepts the human label the model might echo back", () => {
    expect(parseSuggestion("Lifestyle Services")?.packKey).toBe("lifestyle_services");
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
    expect(parseSuggestion("  retail_os \n")?.packKey).toBe("retail_os");
  });
});
