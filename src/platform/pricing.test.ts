import { describe, it, expect } from "vitest";

import {
  PACK_DISCOUNT_BAND,
  PACK_PRICE,
  PLATFORM_FEE,
  RUPEE,
  TEAM_BRACKET,
  TIER_PRICE,
  alaCarteTotal,
  bracketForUsers,
  formatPrice,
  modulePrice,
  monthlyTotal,
  pricingTier,
  quotePack,
} from "./pricing";
import { VERTICAL_PACKS, type VerticalPackKey } from "./tenancy/packs";
import { allModules } from "./modules/registry";

/**
 * The pack discount has to be real.
 *
 * This is the test that would have caught the original defect. The published
 * price list claimed packs were 25–30% cheaper than à la carte; priced at the
 * midpoint of the advertised bands, every pack was *more expensive* than buying
 * the same modules individually. Nothing failed — the claim simply stopped
 * being true, in a table nobody recomputed.
 *
 * So the discount is derived from the pack definitions on every run. Add a
 * module to a pack, move a module's tier, or change a price, and this fails
 * before the price list lies.
 */

const PACK_KEYS = Object.keys(VERTICAL_PACKS) as VerticalPackKey[];

describe("pack pricing", () => {
  it.each(PACK_KEYS)("%s sits inside the published discount band", (packKey) => {
    const quote = quotePack(packKey);

    expect(
      quote.discount,
      `${quote.label}: à la carte ${formatPrice(quote.alaCarte)}, ` +
        `pack ${formatPrice(quote.packPrice)}, ` +
        `discount ${(quote.discount * 100).toFixed(1)}% — outside the 20–25% band`,
    ).toBeGreaterThanOrEqual(PACK_DISCOUNT_BAND.min);

    expect(quote.discount).toBeLessThanOrEqual(PACK_DISCOUNT_BAND.max);
  });

  it("every pack is strictly cheaper than à la carte", () => {
    // The plain version of the above, stated separately because it is the
    // thing a prospect actually checks and the thing that was false before.
    for (const packKey of PACK_KEYS) {
      const quote = quotePack(packKey);
      expect(quote.packPrice, `${quote.label} costs more as a pack`).toBeLessThan(quote.alaCarte);
      expect(quote.saving).toBeGreaterThan(0);
    }
  });

  it("prices every pack that exists", () => {
    // A new pack with no price would otherwise quote as free.
    for (const packKey of PACK_KEYS) {
      expect(PACK_PRICE[packKey], `${packKey} has no published price`).toBeGreaterThan(0);
    }
    expect(Object.keys(PACK_PRICE).sort()).toEqual([...PACK_KEYS].sort());
  });
});

describe("entry price", () => {
  it("platform plus one Tier 1 module is exactly ₹5,000", () => {
    // "No client too small" is a commitment with a number attached. If the
    // platform fee moves, this is what says so.
    expect(alaCarteTotal(["inventory"])).toBe(5_000 * RUPEE);
  });

  it("charges nothing for always-on modules", () => {
    // Core is the platform fee. Billing it again would double-charge everyone.
    const alwaysOn = allModules().filter((m) => m.alwaysOn);
    expect(alwaysOn.length).toBeGreaterThan(0);
    for (const mod of alwaysOn) {
      expect(modulePrice(mod.key), `${mod.key} is always-on but priced`).toBe(0);
    }
  });

  it("puts every vertical module in Tier 3", () => {
    for (const mod of allModules().filter((m) => m.vertical)) {
      expect(pricingTier(mod.key), `${mod.key} is vertical but not Tier 3`).toBe(3);
    }
  });

  it("prices tiers in ascending order", () => {
    // A Tier 3 module cheaper than a Tier 1 would make the tiers meaningless.
    expect(TIER_PRICE[1]).toBeLessThan(TIER_PRICE[2]);
    expect(TIER_PRICE[2]).toBeLessThan(TIER_PRICE[3]);
  });
});

describe("team size brackets", () => {
  it("includes the small bracket in the base", () => {
    // A ten-person business pays the pack price and nothing else. That is the
    // whole point of dropping per-seat.
    expect(TEAM_BRACKET.SMALL.monthly).toBe(0);
  });

  it("maps a headcount to a bracket at the boundaries", () => {
    expect(bracketForUsers(1)).toBe("SMALL");
    expect(bracketForUsers(10)).toBe("SMALL");
    expect(bracketForUsers(11)).toBe("MEDIUM");
    expect(bracketForUsers(50)).toBe("MEDIUM");
    expect(bracketForUsers(51)).toBe("LARGE");
    // The case this exists for: a factory with 80 floor workers is one flat
    // Large, not 70 billable heads.
    expect(bracketForUsers(80)).toBe("LARGE");
  });

  it("costs the same at 51 users as at 5,000", () => {
    // Flat, not per-seat. If this ever differs, per-user pricing has crept back.
    const at51 = monthlyTotal({ packKey: "auto_components", bracket: bracketForUsers(51) });
    const at5000 = monthlyTotal({ packKey: "auto_components", bracket: bracketForUsers(5000) });
    expect(at51).toBe(at5000);
  });

  it("prices brackets in ascending order", () => {
    expect(TEAM_BRACKET.SMALL.monthly).toBeLessThan(TEAM_BRACKET.MEDIUM.monthly);
    expect(TEAM_BRACKET.MEDIUM.monthly).toBeLessThan(TEAM_BRACKET.LARGE.monthly);
  });
});

describe("monthly total", () => {
  it("adds the bracket to the pack price", () => {
    // The worked example from the pricing decision: a Large auto-components
    // tenant. Pinned so a change to either number is visible here.
    const total = monthlyTotal({ packKey: "auto_components", bracket: "LARGE" });
    expect(total).toBe(PACK_PRICE.auto_components + TEAM_BRACKET.LARGE.monthly);
    // ₹24,999 pack + ₹8,000 Large bracket. The 80-worker factory, flat.
    expect(formatPrice(total)).toBe("₹32,999");
  });

  it("falls back to à la carte when there is no pack", () => {
    const total = monthlyTotal({ modules: ["inventory", "helpdesk"], bracket: "SMALL" });
    expect(total).toBe(PLATFORM_FEE + TIER_PRICE[1] * 2);
  });
});

describe("money is never a float", () => {
  it("keeps every published amount as whole paise", () => {
    // A fractional paisa means somebody divided instead of multiplying, and the
    // error surfaces months later as an invoice that is off by one rupee.
    const amounts = [
      PLATFORM_FEE,
      ...Object.values(TIER_PRICE),
      ...Object.values(PACK_PRICE),
      ...Object.values(TEAM_BRACKET).map((b) => b.monthly),
    ];
    for (const amount of amounts) {
      expect(Number.isInteger(amount), `${amount} is not a whole number of paise`).toBe(true);
    }
  });
});
