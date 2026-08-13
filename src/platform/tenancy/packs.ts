import { type ModuleKey, withDependencies } from "@/platform/modules/registry";

/**
 * Vertical packs — the module bundles behind "what kind of business are you?".
 *
 * Deliberately free of `server-only`. This is pure data and pure functions, and
 * it is needed by provisioning (server), the dashboard router (server), scripts
 * (plain node) and tests. `provision.ts` imports `server-only`, so anything left
 * in there is unreachable from the last two — which is the same trap that put
 * `hashPin` in two places and broke every login. One export, four consumers.
 */

/** Modules a new tenant starts with unless told otherwise. */
export const DEFAULT_MODULES: ModuleKey[] = [
  "core", "inventory", "manufacturing", "quality", "procurement", "sales", "hr",
];

/**
 * Industry operating packs.
 *
 * A pack exists so onboarding can ask one question a customer can answer
 * ("what kind of business are you?") instead of twenty they cannot ("do you
 * want the assets module?").
 *
 * **Deliberately four.** There were twenty-two, each a plausible bundle nobody
 * had sold to. A pack is a promise that the product is *tuned* for that
 * business — it decides the dashboard a tenant lands on — and twenty-two of
 * those promises could not be kept. These four have a named prospect or a built
 * dashboard behind them. Adding a fifth is cheap; it should follow a customer,
 * not precede one.
 *
 * `withDependencies()` fills in transitive requirements, so a pack lists only
 * what it actually cares about.
 */
export const VERTICAL_PACKS: Record<
  string,
  { label: string; modules: ModuleKey[]; dashboardWidgets?: string[] }
> = {
  auto_components: {
    label: "Auto Components",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales", "automotive"],
  },
  facility_management: {
    label: "Facility Management",
    modules: ["core", "hr", "sites", "scheduling", "helpdesk", "assets", "quality", "procurement", "billing"],
  },
  /*
   * The franchise packs carry `sites` because an outlet *is* a Site — a place
   * with a manager, a roster and a checklist. That was a deliberate modelling
   * choice (one table, not a near-identical copy that drifts), and it has a
   * consequence the original module list missed: without the module, the
   * dashboard renders an outlet list whose every link redirects.
   *
   * QSR additionally carries `helpdesk`, because its dashboard reports open
   * issues across the network and a ticket is what an issue is.
   */
  franchise_qsr: {
    label: "Franchise — QSR",
    modules: ["core", "hr", "inventory", "quality", "procurement", "billing", "sites", "helpdesk"],
  },
  franchise_retail: {
    label: "Franchise — Retail",
    modules: ["core", "hr", "inventory", "quality", "procurement", "sales", "billing", "sites"],
  },
  /*
   * Restaurant OS — a single location, not a chain.
   *
   * The fifth pack, and it follows a customer rather than preceding one, which is
   * the bar this list sets for itself.
   *
   * Deliberately without `sites`: a single restaurant is one place, and modelling
   * it as a network of one buys nothing but an extra hop in every query. A
   * multi-location group is `franchise_qsr`, which already exists.
   *
   * `inventory` is absent too. It will earn its way in when recipe-level stock
   * depletion lands; until then a restaurant that cannot deplete stock on a sale
   * would be paying for a module that only holds numbers somebody types twice.
   */
  restaurant_ops: {
    label: "Restaurant OS",
    modules: ["core", "hr", "menu", "tables_orders", "kitchen", "serving", "billing"],
    dashboardWidgets: [
      "restaurant_metrics",
      "restaurant_floor",
      "restaurant_takings",
      "restaurant_recent_orders",
    ],
  },
  /*
   * Agencies, consultancies, studios — businesses that sell people's time.
   *
   * `projects` and `finance` are what make it a different product from the
   * others: the unit of work is an engagement with a budget, and the thing that
   * decides whether the month was good is utilisation, not throughput. No
   * `inventory` — a consultancy holds no stock, and shipping one would be a
   * module nobody opens.
   */
  professional_services: {
    label: "Professional Services",
    modules: ["core", "hr", "billing", "projects", "crm", "sales", "finance"],
  },
  /*
   * A single shop, not a chain.
   *
   * Distinct from `franchise_retail`, which carries `sites` because its unit is a
   * network of outlets. One store is one place: the same `sites` machinery would
   * be a hop in every query and a screen listing one row.
   */
  retail_os: {
    label: "Retail OS",
    modules: ["core", "hr", "inventory", "billing", "sales", "crm", "procurement"],
  },
  /*
   * Salons, spas, boutiques — a person's time is the thing sold, and the day is
   * run off the appointment book. `booking` is the spine; `crm` keeps the client
   * history a repeat-visit business lives on; `billing` settles the visit.
   * No `inventory` or `menu` — a stylist holds no stock and cooks nothing.
   */
  lifestyle_services: {
    label: "Lifestyle Services",
    modules: ["core", "hr", "billing", "sales", "crm", "booking"],
  },
  /*
   * Table-less quick service — a counter, a queue, and instant payment. Same
   * spine as `restaurant_ops` (menu → order → kitchen → bill) minus `tables` as
   * the organising unit and minus `serving`: a token or a name replaces the
   * table, and the customer collects rather than being served to a seat. Reuses
   * the restaurant dashboard widgets, which `tables_orders` and `billing`
   * already contribute, so no new dashboard case is needed.
   */
  modern_qsr: {
    label: "Modern QSR",
    modules: ["core", "hr", "menu", "tables_orders", "kitchen", "billing"],
    // Counter-first ordering: a table-less QSR leads with its token queue and the
    // day's takings, not a floor map it has no tables for.
    dashboardWidgets: [
      "counter_queue",
      "restaurant_takings",
      "restaurant_recent_orders",
    ],
  },
};

export type VerticalPackKey = keyof typeof VERTICAL_PACKS;

/**
 * Retired pack keys, and the surviving pack that covers them.
 *
 * Narrowing the list does not un-provision anyone: entitlements are rows, and
 * they were written when the tenant was created. What breaks without this map
 * is *recognition* — a tenant stamped `security_services` would stop resolving
 * to any pack and fall through to a generic dashboard. Asian Security is a live
 * prospect in exactly that position, so this is not hypothetical.
 *
 * Readable but not offerable: `resolvePackKey` honours these,
 * `verticalPackOptions` does not list them, and provisioning rejects them.
 */
const RETIRED_PACKS: Record<string, VerticalPackKey> = {
  security_services: "facility_management",
  staffing_manpower: "facility_management",
  housekeeping_cleaning: "facility_management",
  maintenance_amc: "facility_management",
  logistics_fleet: "facility_management",
  it_services_msp: "facility_management",
  engineering_services: "facility_management",
  construction: "facility_management",
  professional_services: "facility_management",
  digital_creative: "facility_management",
  events_hospitality: "facility_management",
  garments_textiles: "auto_components",
  furniture_manufacturing: "auto_components",
  engineering_fabrication: "auto_components",
  packaging: "auto_components",
  electronics: "auto_components",
  food_beverage: "auto_components",
  jewellery: "auto_components",
  footwear_leather: "auto_components",
  printing: "auto_components",
};

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[\s/&—-]+/g, "_").replace(/_+/g, "_");

/**
 * The pack a stored `Factory.industry` means, or null if it means nothing.
 *
 * `industry` is free text — live rows hold "Facility Management", "Security
 * Services", "Software" and null — because it was a display field before it was
 * a routing key. Anything reading it to decide behaviour comes through here, so
 * the normalisation exists once rather than at each call site.
 */
export function resolvePackKey(industry: string | null | undefined): VerticalPackKey | null {
  if (!industry) return null;
  const slug = slugify(industry);

  if (slug in VERTICAL_PACKS) return slug as VerticalPackKey;
  if (slug in RETIRED_PACKS) return RETIRED_PACKS[slug];

  // Fall back to matching the human label, since that is what sales typed.
  const byLabel = Object.entries(VERTICAL_PACKS).find(([, pack]) => slugify(pack.label) === slug);
  return byLabel ? (byLabel[0] as VerticalPackKey) : null;
}

/**
 * The human label for a stored `industry`, for display.
 *
 * New tenants store the pack *key* so routing is exact; older rows hold the
 * label, or free text sales typed. All three land here, and anything
 * unrecognised is shown as written rather than swallowed.
 */
export function packLabel(industry: string | null | undefined): string | null {
  const key = resolvePackKey(industry);
  return key ? VERTICAL_PACKS[key].label : (industry?.trim() || null);
}

/** Pack keys with labels, for a selector. Ordered as declared above. */
export function verticalPackOptions(): { key: string; label: string; modules: ModuleKey[] }[] {
  return Object.entries(VERTICAL_PACKS).map(([key, pack]) => ({
    key,
    label: pack.label,
    modules: withDependencies(pack.modules),
  }));
}

/**
 * The modules a pack resolves to, or the defaults if the key means nothing.
 * Goes through `resolvePackKey`, so a retired key still resolves to the pack
 * that replaced it rather than silently collapsing to DEFAULT_MODULES — which
 * would quietly hand a facility-management tenant the manufacturing bundle and
 * no sites module.
 */
export function modulesForPack(packKey: string | null | undefined): ModuleKey[] {
  const resolved = resolvePackKey(packKey);
  const pack = resolved ? VERTICAL_PACKS[resolved] : undefined;
  return withDependencies(pack?.modules ?? DEFAULT_MODULES);
}
