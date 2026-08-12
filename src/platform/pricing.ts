import { VERTICAL_PACKS, type VerticalPackKey } from "./tenancy/packs";
import { getModule, type ModuleKey } from "./modules/registry";

/**
 * Commercial ground truth.
 *
 * Every price in the product, the PRDs and the sales deck resolves from here.
 * The published pack discounts were previously prose, and prose drifted: priced
 * at the midpoint of the advertised tier bands, every pack cost *more* than
 * buying the same modules individually while the page claimed 25–30% off. A
 * prospect doing that arithmetic finds the bundle is worse value, which is the
 * opposite of an upsell.
 *
 * So the numbers live in one module with a test that recomputes the discount
 * from the pack definitions. If a module moves tier or a pack gains a module,
 * the test fails rather than the claim quietly becoming false.
 *
 * All amounts are **paise**, as integers. Money is never a float here: a
 * rounding error in a price is a support conversation nobody can win.
 */

export const RUPEE = 100;

/**
 * One published price per tier, not a band.
 *
 * The band was the bug. "Tier 2 costs ₹2,000–₹5,000" gives two different
 * answers to "what does Quality cost", and the pack discount was computed
 * against one while the price list showed the other. A tier is a taxonomy now;
 * the price is a number.
 */
export const TIER_PRICE: Record<1 | 2 | 3, number> = {
  1: 2_500 * RUPEE, // universal — Inventory, People, Helpdesk, Billing
  2: 4_500 * RUPEE, // operations — Procurement, Sales, Manufacturing, Quality, …
  3: 7_000 * RUPEE, // vertical — Automotive, Franchise Ops, Kitchen Ops, …
};

/**
 * Base platform fee. Covers Core and the Small team bracket.
 *
 * Set so that platform + one Tier 1 module is exactly ₹5,000/month — the
 * "no client too small" entry price the strategy commits to. That number is
 * load-bearing, so `pricing.test.ts` asserts it.
 */
export const PLATFORM_FEE = 2_500 * RUPEE;

/**
 * Team size, as three flat brackets rather than a per-seat charge.
 *
 * Per-user pricing was dropped deliberately: it contradicted the competitive
 * thesis (which praises Frappe for charging per site), and at 50 users it
 * nearly doubled the bill — recreating the per-seat economics the whole wedge
 * attacks. A factory with 80 floor workers is one flat "Large", not 70 billable
 * heads, and nobody has to audit a headcount to produce an invoice.
 */
export type TeamSizeBracket = "SMALL" | "MEDIUM" | "LARGE";

export const TEAM_BRACKET: Record<
  TeamSizeBracket,
  { label: string; maxUsers: number | null; monthly: number }
> = {
  SMALL: { label: "Up to 10", maxUsers: 10, monthly: 0 },
  MEDIUM: { label: "11–50", maxUsers: 50, monthly: 3_000 * RUPEE },
  LARGE: { label: "51+", maxUsers: null, monthly: 8_000 * RUPEE },
};

/** The bracket a headcount falls into. Used to suggest, never to auto-charge. */
export function bracketForUsers(users: number): TeamSizeBracket {
  if (users <= 10) return "SMALL";
  if (users <= 50) return "MEDIUM";
  return "LARGE";
}

/**
 * Trial: 7 days, no card.
 *
 * The nudge lands on day 5 rather than day 7 because a trial that ends
 * tomorrow is a decision made under pressure, and one made under pressure is
 * usually "not now".
 */
export const TRIAL = {
  days: 7,
  /** Day the assistant raises activating billing. */
  nudgeOnDay: 5,
  /** Days a workspace stays readable after the trial lapses, before deletion warning. */
  readOnlyRetentionDays: 30,
} as const;

/**
 * Published pack prices.
 *
 * Each is set to land 20–25% below the à la carte total for the same modules.
 * That gap is the upsell: it has to be visible enough that a client who came
 * for Inventory can see the whole vertical costs less than assembling it.
 *
 * `pricing.test.ts` recomputes every one of these from `VERTICAL_PACKS` and
 * fails outside the band — so a pack that gains a module cannot silently stop
 * being a discount.
 */
export const PACK_PRICE: Record<VerticalPackKey, number> = {
  // à la carte ₹32,500 → 23.1% off
  auto_components: 24_999 * RUPEE,
  // à la carte ₹32,500 → 21.5% off
  facility_management: 25_499 * RUPEE,
  // à la carte ₹26,000 → 23.1% off
  franchise_qsr: 19_999 * RUPEE,
  // à la carte ₹28,000 → 21.4% off
  franchise_retail: 21_999 * RUPEE,
  /*
   * à la carte ₹25,500 → 21.6% off.
   *
   * Specified as ₹22,499 against an à la carte of ₹29,500. That figure priced all
   * six paid modules at Tier 2; `hr` and `billing` are Tier 1 (₹2,500, see
   * TIER_ONE), so the real total is ₹25,500 and ₹22,499 was 11.8% off — half the
   * committed floor, and the test said so.
   *
   * The band for this pack is ₹19,125–₹20,400. ₹19,999 sits at 21.6%, and matches
   * franchise_qsr — a restaurant and a QSR outlet buying near-identical bundles for
   * near-identical money is a price list somebody can defend out loud.
   */
  restaurant_ops: 19_999 * RUPEE,
};

/** The discount band a pack must sit inside. Enforced by test, not by intent. */
export const PACK_DISCOUNT_BAND = { min: 0.2, max: 0.25 } as const;

/**
 * What a module costs on its own.
 *
 * Reads the tier off the registry. Core is free — it is the platform fee.
 */
export function modulePrice(key: ModuleKey): number {
  const mod = getModule(key);
  if (!mod) return 0;
  if (mod.alwaysOn) return 0;
  return TIER_PRICE[pricingTier(key)];
}

/**
 * Which tier a module sits in.
 *
 * Derived rather than stored, until manifests land (PRD 00). `vertical` already
 * marks Tier 3. Tier 1 is the universal set every business needs; everything
 * else is Tier 2 operations.
 */
const TIER_ONE: ModuleKey[] = ["inventory", "hr", "helpdesk", "billing"];

export function pricingTier(key: ModuleKey): 1 | 2 | 3 {
  const mod = getModule(key);
  if (mod?.vertical) return 3;
  if (TIER_ONE.includes(key)) return 1;
  return 2;
}

/** À la carte cost of a set of modules, including the platform fee. */
export function alaCarteTotal(modules: ModuleKey[]): number {
  return modules.reduce((total, key) => total + modulePrice(key), PLATFORM_FEE);
}

export interface PackQuote {
  packKey: VerticalPackKey;
  label: string;
  /** What the same modules cost bought individually. */
  alaCarte: number;
  packPrice: number;
  saving: number;
  /** 0.23 = 23% cheaper than à la carte. */
  discount: number;
}

/**
 * The comparison a prospect sees. Deliberately shows both numbers: the pack
 * price alone is just a price, and the saving is the argument.
 */
export function quotePack(packKey: VerticalPackKey): PackQuote {
  const pack = VERTICAL_PACKS[packKey];
  const alaCarte = alaCarteTotal(pack.modules);
  const packPrice = PACK_PRICE[packKey];

  return {
    packKey,
    label: pack.label,
    alaCarte,
    packPrice,
    saving: alaCarte - packPrice,
    discount: alaCarte > 0 ? (alaCarte - packPrice) / alaCarte : 0,
  };
}

/** Monthly total for a subscription. The whole bill, in one function. */
export function monthlyTotal(input: {
  packKey?: VerticalPackKey | null;
  /** Only read when there is no pack. */
  modules?: ModuleKey[];
  bracket: TeamSizeBracket;
}): number {
  const base = input.packKey
    ? PACK_PRICE[input.packKey]
    : alaCarteTotal(input.modules ?? []);
  return base + TEAM_BRACKET[input.bracket].monthly;
}

/** Paise → "₹22,999". For display only; never parse this back. */
export function formatPrice(paise: number): string {
  return `₹${Math.round(paise / RUPEE).toLocaleString("en-IN")}`;
}
