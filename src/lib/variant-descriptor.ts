// A variant is the full identity of a thing the factory can make:
//
//   {Brand} {Model} {Generation} {Product} {Specs} {Fabric} {Design}
//   e.g. "Honda City 2015-2018 Seat Cover DB 5HDR Arm Shaka Spcl Archer"
//
// The set of variants is the cartesian product of the master-data lists. It is
// generated on demand rather than stored: at real catalogue size the product
// runs to tens of millions of rows, and nobody maintains a table that size by
// hand. A concrete ProductVariant row is only created when a production
// actually uses a combination (it anchors the blueprint, BOM and inventory
// item), so the searchable space stays complete while storage stays small.

export const SEAT_TYPES = ["SB", "DB"] as const;
export const HEADREST_COUNTS = [2, 4, 5, 6, 7, 8] as const;

export type SeatType = (typeof SEAT_TYPES)[number];

export const SEAT_TYPE_LABEL: Record<SeatType, string> = {
  SB: "Single Bench",
  DB: "Double Bench",
};

// Specs (bench type / headrests / armrest) only describe seat covers. Steering
// covers and mats have no such geometry, so the spec section is hidden for them
// and left out of their descriptor entirely.
export function productHasSeatSpecs(productName?: string | null, categoryName?: string | null): boolean {
  return /seat/i.test(`${productName ?? ""} ${categoryName ?? ""}`);
}

export type VariantDescriptor = {
  brand: string;
  model: string;
  generation: string;
  product: string;
  // Present only when the product takes seat specs.
  seatType?: SeatType | null;
  headrests?: number | null;
  armrest?: boolean;
  fabric: string;
  design: string;
  // Carried by the studio's variant search so the colour picked there links to
  // the colour field in the same popup. Intentionally NOT part of formatVariant
  // (the variant label/search key stays colour-agnostic).
  color?: string | null;
};

// The canonical one-line rendering. Order is fixed so the string is stable and
// comparable, even though *searching* it is order-independent.
export function formatVariant(v: Partial<VariantDescriptor>): string {
  const parts = [v.brand, v.model, v.generation, v.product];
  if (v.seatType) parts.push(v.seatType);
  if (v.headrests) parts.push(`${v.headrests}HDR`);
  if (v.armrest) parts.push("Arm");
  parts.push(v.fabric, v.design);
  return parts.filter((p) => p != null && String(p).trim() !== "").join(" ");
}

// Compact form used on batch blocks, where horizontal room is tight.
export function formatVariantCompact(v: Partial<VariantDescriptor>): string {
  return formatVariant(v);
}

// --- searching -------------------------------------------------------------

// Every token must appear somewhere in the descriptor, in any order. This is
// what makes "archer honda" and "honda archer" and a bare fabric name all work:
// the query is a set of constraints, not a prefix.
export function matchesQuery(haystack: string, query: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) return true;
  const hay = haystack.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,/;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

// Ranks exact-ish hits above incidental substring hits so the best candidate
// lands at the top of the dropdown.
export function scoreMatch(haystack: string, query: string): number {
  const hay = haystack.toLowerCase();
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0;
  let score = 0;
  const words = hay.split(/\s+/);
  for (const t of tokens) {
    if (words.some((w) => w === t)) score += 3;
    else if (words.some((w) => w.startsWith(t))) score += 2;
    else if (hay.includes(t)) score += 1;
  }
  // Prefer shorter descriptors when scores tie — they are the more general match.
  return score * 1000 - hay.length;
}

// Which descriptor field a token matched matters as much as how well it matched.
// Typing "swift" must surface the Swift *model* above any City variant whose
// design or fabric happens to contain "swift" — a flat whole-string score can't
// tell those apart and buries the real hit. So each token is scored against the
// individual fields, weighted by how identifying that field is (brand/model top,
// fabric/design bottom), and a token that matches nothing kills the row.
const FIELD_WEIGHTS: Array<{ get: (d: VariantDescriptor) => string; weight: number }> = [
  { get: (d) => d.model, weight: 100 },
  { get: (d) => d.brand, weight: 90 },
  { get: (d) => d.generation, weight: 55 },
  { get: (d) => d.product, weight: 40 },
  { get: (d) => (d.seatType ?? ""), weight: 20 },
  { get: (d) => (d.headrests ? `${d.headrests}HDR` : ""), weight: 20 },
  { get: (d) => (d.armrest ? "Arm" : ""), weight: 20 },
  { get: (d) => d.fabric, weight: 30 },
  { get: (d) => d.design, weight: 30 },
];

function scoreDescriptor(d: VariantDescriptor, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    for (const f of FIELD_WEIGHTS) {
      const fv = f.get(d).toLowerCase();
      if (!fv) continue;
      const fWords = fv.split(/\s+/);
      let q = 0;
      if (fWords.some((w) => w === t)) q = 3; // exact word in this field
      else if (fWords.some((w) => w.startsWith(t))) q = 2; // prefix
      else if (fv.includes(t)) q = 1; // incidental substring
      if (q > 0) best = Math.max(best, f.weight * q);
    }
    if (best === 0) return -1; // this token matched no field at all
    total += best;
  }
  // Shorter labels win ties — the more general match.
  return total * 1000 - formatVariant(d).length;
}

// --- parsing ---------------------------------------------------------------

// Pulls the spec fragments out of a free-typed line so an edited descriptor can
// be read back into the structured fields.
export function parseSpecTokens(text: string): {
  seatType: SeatType | null;
  headrests: number | null;
  armrest: boolean;
  rest: string[];
} {
  const tokens = text.split(/[\s,;]+/).filter(Boolean);
  let seatType: SeatType | null = null;
  let headrests: number | null = null;
  let armrest = false;
  const rest: string[] = [];

  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (upper === "SB" || upper === "DB") {
      seatType = upper as SeatType;
      continue;
    }
    const hdr = upper.match(/^(\d+)\s*HDR$/);
    if (hdr) {
      const n = parseInt(hdr[1], 10);
      if ((HEADREST_COUNTS as readonly number[]).includes(n)) {
        headrests = n;
        continue;
      }
    }
    if (upper === "ARM" || upper === "ARMREST") {
      armrest = true;
      continue;
    }
    rest.push(token);
  }

  return { seatType, headrests, armrest, rest };
}

// --- generation ------------------------------------------------------------

export type VariantSources = {
  // Flattened vehicle hierarchy: one entry per brand/model/generation leaf.
  vehicles: Array<{ brand: string; model: string; generation: string }>;
  products: Array<{ name: string; category?: string | null }>;
  fabrics: string[];
  designs: string[];
};

// Expanding every spec permutation for every vehicle/product/fabric/design is
// the expensive part (24x multiplier), so the base rows are built first and the
// spec dimension is only expanded when the query still has tokens the base
// cannot satisfy. Typical queries never pay for it.
export function searchVariants(
  src: VariantSources,
  query: string,
  limit = 50
): Array<{ label: string; descriptor: VariantDescriptor }> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  // A dimension (fabric, design, spec) is fanned out ONLY when the query
  // references it. Otherwise "creta" returned Creta × every fabric × every
  // design — a wall of near-identical rows that fills the result cap on one
  // vehicle and never narrows. Collapsed dimensions leave their field empty for
  // section 3/4 to fill, which is the intended direction of travel.
  const refersTo = (names: string[]) =>
    tokens.some((t) =>
      t.length >= 2 && names.some((n) => {
        const low = n.toLowerCase();
        return low.split(/\s+/).some((w) => w.startsWith(t)) || low.includes(t);
      })
    );
  const wantsFabric = src.fabrics.length > 0 && refersTo(src.fabrics);
  const wantsDesign = src.designs.length > 0 && refersTo(src.designs);
  const wantsSpecs = tokens.some(couldBeSpecToken);

  // Empty or unreferenced dimensions collapse to a single placeholder so the
  // outer product still yields the vehicle/product anchor — and a fresh factory
  // with no fabrics/designs yet still returns matches instead of nothing.
  const productOpts: Array<{ name: string; category?: string | null }> =
    src.products.length > 0 ? src.products : [{ name: "", category: null }];
  const fabricOpts = wantsFabric ? src.fabrics : [""];
  const designOpts = wantsDesign ? src.designs : [""];

  const results: Array<{ label: string; descriptor: VariantDescriptor; score: number }> = [];
  const seen = new Set<string>();
  const cap = limit * 4;

  outer: for (const vehicle of src.vehicles) {
    for (const product of productOpts) {
      const seatSpecs = product.name ? productHasSeatSpecs(product.name, product.category) : false;

      for (const fabric of fabricOpts) {
        for (const design of designOpts) {
          const base: VariantDescriptor = {
            brand: vehicle.brand,
            model: vehicle.model,
            generation: vehicle.generation,
            product: product.name,
            fabric,
            design,
          };

          // Spec fan-out only when the product takes specs AND the query asks.
          const candidates: VariantDescriptor[] = [];
          if (seatSpecs && wantsSpecs) {
            const baseLabel = formatVariant(base).toLowerCase();
            const unmatched = tokens.filter((t) => !baseLabel.includes(t));
            if (unmatched.length === 0 || unmatched.every(couldBeSpecToken)) {
              for (const seatType of SEAT_TYPES)
                for (const headrests of HEADREST_COUNTS)
                  for (const armrest of [false, true])
                    candidates.push({ ...base, seatType, headrests, armrest });
            }
          }
          if (candidates.length === 0) candidates.push(base);

          for (const descriptor of candidates) {
            const label = formatVariant(descriptor);
            const low = label.toLowerCase();
            if (!tokens.every((t) => low.includes(t))) continue;
            const score = scoreDescriptor(descriptor, tokens);
            if (score < 0) continue; // a token matched no field — drop the row
            if (seen.has(low)) continue;
            seen.add(low);
            results.push({ label, descriptor, score });
            if (results.length >= cap) break outer;
          }
        }
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map(({ label, descriptor }) => ({ label, descriptor }));
}

// The anchor rows of the catalogue with no query: one row per vehicle × product,
// collapsing empty dimensions to a placeholder so a factory that has only
// vehicles (no products/fabrics/designs yet) still lists its vehicle variants.
// Used to populate the master-data Variants sheet before the user types.
export function listVariantBases(
  src: VariantSources,
  limit = 300
): Array<{ label: string; descriptor: VariantDescriptor }> {
  const products = src.products.length > 0 ? src.products : [{ name: "", category: null }];
  const out: Array<{ label: string; descriptor: VariantDescriptor }> = [];
  const seen = new Set<string>();
  for (const vehicle of src.vehicles) {
    for (const product of products) {
      const descriptor: VariantDescriptor = {
        brand: vehicle.brand,
        model: vehicle.model,
        generation: vehicle.generation,
        product: product.name,
        fabric: "",
        design: "",
      };
      const label = formatVariant(descriptor);
      const low = label.toLowerCase();
      if (seen.has(low)) continue;
      seen.add(low);
      out.push({ label, descriptor });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// Cheap test for whether a leftover token could possibly be satisfied by the
// spec fragment, so we can skip the 24x expansion when it clearly cannot.
function couldBeSpecToken(token: string): boolean {
  const t = token.toLowerCase();
  if ("sb".startsWith(t) || "db".startsWith(t)) return true;
  if ("arm".startsWith(t) || "armrest".startsWith(t)) return true;
  if (/^\d/.test(t)) return HEADREST_COUNTS.some((n) => `${n}hdr`.startsWith(t));
  if ("hdr".startsWith(t)) return true;
  return false;
}

// Total size of the cartesian product, for display. Counted, never built.
export function countVariants(src: VariantSources): number {
  const specCombos = SEAT_TYPES.length * HEADREST_COUNTS.length * 2;
  // Empty dimensions collapse to a single placeholder (same as the generator),
  // so a vehicles-only catalogue counts its vehicle anchors instead of zero.
  const products = src.products.length > 0 ? src.products : [{ name: "", category: null }];
  const perProduct = products.reduce(
    (sum, p) => sum + (p.name && productHasSeatSpecs(p.name, p.category) ? specCombos : 1),
    0
  );
  const fabrics = Math.max(1, src.fabrics.length);
  const designs = Math.max(1, src.designs.length);
  return src.vehicles.length * perProduct * fabrics * designs;
}

// Designs are shown with their family prefixed globally — "ULTRA Triple Seam",
// not just "Triple Seam" — so the same design name under different families is
// distinguishable everywhere it appears. The family is dropped when it is empty
// or already equal to the name.
export function designLabel(name: string, family?: string | null): string {
  const fam = (family ?? "").trim();
  return fam && fam.toLowerCase() !== name.toLowerCase() ? `${fam} ${name}` : name;
}
