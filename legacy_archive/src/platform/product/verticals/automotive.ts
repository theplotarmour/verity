import type { DescriptorSpec, DescriptorValues, VisibilityRule } from "../descriptor";

/**
 * The automotive vertical, expressed as data on top of the generic descriptor
 * engine.
 *
 * This file is the acceptance test for Phase 1 made concrete: if the generic
 * engine can reproduce the hardcoded automotive behaviour byte-for-byte, the
 * abstraction is adequate and every other industry is expressible too. If it
 * could not, the engine would need rework before any other vertical is built.
 *
 * The equivalence is enforced by descriptor.equivalence.test.ts, which runs the
 * original hardcoded implementation and this one over a large input matrix and
 * asserts identical output.
 *
 * Nothing here is imported by core. It is the shape a tenant's ProductType rows
 * will hold once the automotive pack is installed from the database rather than
 * from source.
 */

export const SEAT_TYPES = ["SB", "DB"] as const;
export const HEADREST_COUNTS = [2, 4, 5, 6, 7, 8] as const;

export type SeatType = (typeof SEAT_TYPES)[number];

export const SEAT_TYPE_LABEL: Record<SeatType, string> = {
  SB: "Single Bench",
  DB: "Double Bench",
};

/**
 * Specs (bench type / headrests / armrest) only describe seat covers. Steering
 * covers and mats have no such geometry, so the spec section is hidden for them
 * and left out of their descriptor entirely.
 */
export const SEAT_SPEC_VISIBILITY: VisibilityRule = {
  any: [
    { field: "product", matches: "seat" },
    { field: "category", matches: "seat" },
  ],
};

/**
 * Field weights carry over unchanged from the hardcoded FIELD_WEIGHTS: brand
 * and model are the most identifying, fabric and design the least.
 */
export const AUTOMOTIVE_DESCRIPTOR: DescriptorSpec = {
  labelTemplate:
    "{brand} {model} {generation} {product} {seat_type} {headrests} {armrest} {fabric} {design}",
  fields: [
    { key: "model", label: "Model", weight: 100 },
    { key: "brand", label: "Brand", weight: 90 },
    { key: "generation", label: "Generation", weight: 55 },
    { key: "product", label: "Product", weight: 40 },
    { key: "seat_type", label: "Bench", weight: 20 },
    {
      key: "headrests",
      label: "Headrests",
      weight: 20,
      // Stored as a number, rendered as "5HDR".
      format: (v) => (v ? `${v}HDR` : ""),
    },
    {
      key: "armrest",
      label: "Arm",
      weight: 20,
      format: (v) => (v ? "Arm" : ""),
    },
    { key: "fabric", label: "Fabric", weight: 30 },
    { key: "design", label: "Design", weight: 30 },
  ],
};

/**
 * Translate the legacy VariantDescriptor shape into generic descriptor values.
 * Used by the equivalence test and by call sites migrating incrementally.
 */
export function toDescriptorValues(v: {
  brand?: string;
  model?: string;
  generation?: string;
  product?: string;
  seatType?: SeatType | null;
  headrests?: number | null;
  armrest?: boolean;
  fabric?: string;
  design?: string;
  color?: string | null;
}): DescriptorValues {
  return {
    brand: v.brand,
    model: v.model,
    generation: v.generation,
    product: v.product,
    seat_type: v.seatType ?? null,
    headrests: v.headrests ?? null,
    armrest: v.armrest ?? false,
    fabric: v.fabric,
    design: v.design,
    // Carried for the studio's colour picker but deliberately absent from the
    // label template — the variant key stays colour-agnostic.
    color: v.color ?? null,
  };
}
