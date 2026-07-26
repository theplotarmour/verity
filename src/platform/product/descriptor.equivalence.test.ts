import { describe, expect, it } from "vitest";

import {
  formatVariant,
  productHasSeatSpecs,
  tokenize as legacyTokenize,
  type VariantDescriptor,
} from "@/lib/variant-descriptor";
import { formatDescriptor, isFieldVisible, scoreDescriptor, tokenize } from "./descriptor";
import {
  AUTOMOTIVE_DESCRIPTOR,
  SEAT_SPEC_VISIBILITY,
  toDescriptorValues,
} from "./verticals/automotive";

/**
 * Phase 1 acceptance: the generic, config-driven descriptor engine must
 * reproduce the hardcoded automotive implementation exactly.
 *
 * This is the test that decides whether the generalisation is safe. If the
 * generic engine diverges on any input, migrating the 47 files that depend on
 * the hardcoded path would silently change labels, search ranking and the
 * customer-facing passport.
 *
 * The matrix below is a full cartesian product over the fields that vary,
 * including the empty and null cases that tend to be where formatters differ.
 */

const BRANDS = ["Honda", "Maruti Suzuki", ""];
const MODELS = ["City", "Swift", ""];
const GENERATIONS = ["2015-2018", ""];
const PRODUCTS = ["Seat Cover", "Steering Cover", "Floor Mat", ""];
const SEAT_TYPES = ["SB", "DB", null] as const;
const HEADRESTS = [2, 5, 8, null];
const ARMRESTS = [true, false];
const FABRICS = ["Shaka Spcl", "Nappa", ""];
const DESIGNS = ["Archer", "Bucket", ""];

function* cases(): Generator<VariantDescriptor> {
  for (const brand of BRANDS)
    for (const model of MODELS)
      for (const generation of GENERATIONS)
        for (const product of PRODUCTS)
          for (const seatType of SEAT_TYPES)
            for (const headrests of HEADRESTS)
              for (const armrest of ARMRESTS)
                for (const fabric of FABRICS)
                  for (const design of DESIGNS)
                    yield {
                      brand,
                      model,
                      generation,
                      product,
                      seatType,
                      headrests,
                      armrest,
                      fabric,
                      design,
                    } as VariantDescriptor;
}

const ALL = [...cases()];

describe("generic descriptor engine reproduces the hardcoded automotive path", () => {
  it("covers a non-trivial input matrix", () => {
    // Guards against the matrix silently collapsing to a handful of cases.
    expect(ALL.length).toBeGreaterThan(2000);
  });

  it("renders identical labels for every combination", () => {
    const divergences: Array<{ input: VariantDescriptor; legacy: string; generic: string }> = [];

    for (const input of ALL) {
      const legacy = formatVariant(input);
      const generic = formatDescriptor(AUTOMOTIVE_DESCRIPTOR, toDescriptorValues(input));
      if (legacy !== generic) divergences.push({ input, legacy, generic });
    }

    expect(divergences.slice(0, 5)).toEqual([]);
    expect(divergences).toHaveLength(0);
  });

  it("tokenizes identically", () => {
    const queries = [
      "honda city",
      "  Honda   City  ",
      "archer,honda",
      "swift/2015",
      "",
      "DB 5HDR arm",
      "a;b,c/d e",
    ];
    for (const q of queries) {
      expect(tokenize(q)).toEqual(legacyTokenize(q));
    }
  });

  it("ranks search results in the same order", () => {
    // Ranking is what users actually feel: if weights differ, the right row
    // stops being first even though every label is correct.
    const population = ALL.filter((v) => v.brand && v.model && v.product).slice(0, 400);
    const queries = ["swift", "honda", "city seat", "archer", "db", "nappa", "5hdr"];

    for (const query of queries) {
      const tokens = tokenize(query);

      const genericRanked = population
        .map((v) => ({ v, s: scoreDescriptor(AUTOMOTIVE_DESCRIPTOR, toDescriptorValues(v), tokens) }))
        .filter((r) => r.s >= 0)
        .sort((a, b) => b.s - a.s)
        .map((r) => formatVariant(r.v));

      const legacyRanked = population
        .map((v) => ({ v, s: legacyScore(v, tokens) }))
        .filter((r) => r.s >= 0)
        .sort((a, b) => b.s - a.s)
        .map((r) => formatVariant(r.v));

      expect(genericRanked).toEqual(legacyRanked);
    }
  });

  it("applies seat-spec visibility the same way productHasSeatSpecs did", () => {
    const products = ["Seat Cover", "seat cover", "Steering Cover", "Floor Mat", "SEAT belt pad", ""];
    for (const product of products) {
      const legacy = productHasSeatSpecs(product, null);
      const generic = isFieldVisible(SEAT_SPEC_VISIBILITY, { product, category: null });
      expect({ product, generic }).toEqual({ product, generic: legacy });
    }
  });

  it("applies visibility via the category field too", () => {
    // productHasSeatSpecs checked product OR category; the rule must as well.
    expect(isFieldVisible(SEAT_SPEC_VISIBILITY, { product: "Cover", category: "Seat Covers" })).toBe(
      productHasSeatSpecs("Cover", "Seat Covers"),
    );
  });
});

/**
 * A local copy of the legacy scoring weights. src/lib/variant-descriptor.ts
 * does not export scoreDescriptor, and this test must compare against the
 * behaviour as written rather than a re-derivation, so the weights are
 * mirrored here verbatim from FIELD_WEIGHTS.
 */
const LEGACY_WEIGHTS: Array<{ get: (d: VariantDescriptor) => string; weight: number }> = [
  { get: (d) => d.model, weight: 100 },
  { get: (d) => d.brand, weight: 90 },
  { get: (d) => d.generation, weight: 55 },
  { get: (d) => d.product, weight: 40 },
  { get: (d) => d.seatType ?? "", weight: 20 },
  { get: (d) => (d.headrests ? `${d.headrests}HDR` : ""), weight: 20 },
  { get: (d) => (d.armrest ? "Arm" : ""), weight: 20 },
  { get: (d) => d.fabric, weight: 30 },
  { get: (d) => d.design, weight: 30 },
];

function legacyScore(d: VariantDescriptor, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let total = 0;
  for (const t of tokens) {
    let best = 0;
    for (const f of LEGACY_WEIGHTS) {
      const fv = f.get(d).toLowerCase();
      if (!fv) continue;
      const fWords = fv.split(/\s+/);
      let q = 0;
      if (fWords.some((w) => w === t)) q = 3;
      else if (fWords.some((w) => w.startsWith(t))) q = 2;
      else if (fv.includes(t)) q = 1;
      if (q > 0) best = Math.max(best, f.weight * q);
    }
    if (best === 0) return -1;
    total += best;
  }
  return total * 1000 - formatVariant(d).length;
}
