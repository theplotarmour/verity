/**
 * The plywood-specific product taxonomy: families, units, and the rules that
 * connect them. Everything genuinely generic (the size formatter itself) now
 * lives in `../trading/format` (ADR-018) — this module re-exports it so
 * existing callers of `formatProductSize` from here keep working.
 */

import { formatProductSize } from "../trading/format";
export { formatProductSize };

/**
 * The four families this business actually trades, plus a catch-all.
 *
 * Not decoration: the family decides the unit a size is quoted in. The trade
 * says "8 by 4" for a board and "96 inch" for a louvre, and it never says
 * either in millimetres. Storing everything in millimetres would round 8 ft to
 * 2438.4 and hand the client back a number nobody in the yard recognises.
 *
 * OTHER is for hardware, adhesives and services — the things with no sheet size
 * at all. It is the default so that a caller which says nothing about a family
 * gets the family that claims nothing about units.
 */
export const PRODUCT_CATEGORIES = [
  "BOARD",
  "PLYWOOD",
  "LAMINATE",
  "LOUVRE",
  "OTHER",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** MM, FT or IN — the unit `widthTenth` and `heightTenth` are counted in. */
export const SIZE_UNITS = ["MM", "FT", "IN"] as const;
export type SizeUnit = (typeof SIZE_UNITS)[number];

/**
 * What each family means, in one table both the server and the screen read.
 *
 * The unit is DERIVED from the family rather than accepted from the caller, so
 * a louvre cannot arrive measured in feet. `fixedSizeTenth` is the laminate
 * rule the client stated — 8 ft x 4 ft and nothing else — expressed once here,
 * enforced by the command, and backed by a CHECK constraint so it holds even
 * for a write that never passed through this file.
 */
export const CATEGORY_RULES: Record<
  ProductCategory,
  {
    label: string;
    sizeUnit: SizeUnit;
    /** Whether a millimetre thickness is expected for a physical item. */
    thickness: "required" | "optional" | "none";
    /**
     * Whether a grade means anything for this family. `none` hides the field
     * entirely rather than merely allowing it to be blank — a laminate does
     * not have an unknown grade, it has no grade, and an empty box invites
     * somebody to fill it in.
     */
    grade: "expected" | "optional" | "none";
    /**
     * Whether this family is sold as a shade x texture matrix. Only laminates
     * are: a board is one thing, a laminate design exists in every shade the
     * house prints it in and every finish they press it with, and each of
     * those combinations sits separately in the godown.
     */
    variants: boolean;
    fixedSizeTenth?: { widthTenth: number; heightTenth: number };
  }
> = {
  BOARD: {
    label: "Board",
    sizeUnit: "FT",
    thickness: "required",
    grade: "expected",
    variants: false,
  },
  PLYWOOD: {
    label: "Plywood",
    sizeUnit: "FT",
    thickness: "required",
    grade: "expected",
    variants: false,
  },
  LAMINATE: {
    label: "Laminate",
    sizeUnit: "FT",
    thickness: "optional",
    // Tenths of a foot: 8.0 x 4.0.
    fixedSizeTenth: { widthTenth: 80, heightTenth: 40 },
    // A decorative laminate has no grade. Grade says how the glue behaves in
    // water, which is a structural-plywood fact; asking for one here made the
    // catalogue invent a value for every laminate row.
    grade: "none",
    // The one family sold as a shade-by-texture matrix.
    variants: true,
  },
  LOUVRE: {
    label: "Louvre",
    sizeUnit: "IN",
    thickness: "optional",
    grade: "optional",
    variants: false,
  },
  OTHER: {
    label: "Other",
    sizeUnit: "MM",
    thickness: "optional",
    grade: "optional",
    variants: false,
  },
};

/**
 * How a product is named in a dropdown, a price row or an order line.
 *
 * Two products under one brand are told apart by whichever measurement their
 * family actually varies: plywood and boards vary by thickness, louvres vary by
 * size. Listing only the name produced "WPC Fluted Louvre" three times over,
 * and listing only the thickness dropped louvres to a bare name because they
 * have none.
 *
 * So the label carries the thickness when there is one, and falls back to the
 * size when there is not.
 */
export function productLabel(
  product: {
    name: string;
    thicknessTenthMm?: number | null;
    sizeUnit?: string | null;
    widthTenth?: number | null;
    heightTenth?: number | null;
    shadeName?: string | null;
    textureName?: string | null;
  },
  brandName?: string,
): string {
  const parts = brandName ? [brandName, product.name] : [product.name];
  // A generated laminate variant is told apart from its twenty-four siblings
  // by nothing else: same brand, same design, same 8 x 4, same thickness. The
  // shade and the texture ARE the product, so they lead.
  if (product.shadeName) parts.push(product.shadeName);
  if (product.textureName) parts.push(product.textureName);
  if (product.thicknessTenthMm != null) {
    parts.push(`${(product.thicknessTenthMm / 10).toFixed(1)} mm`);
  } else if (product.widthTenth != null && product.heightTenth != null) {
    parts.push(
      formatProductSize({
        sizeUnit: product.sizeUnit ?? "MM",
        widthTenth: product.widthTenth,
        heightTenth: product.heightTenth,
      }),
    );
  }
  return parts.join(" · ");
}

/**
 * The name a generated variant carries.
 *
 * Built here rather than in the command so the screen can show the client
 * exactly what twenty-five rows are about to be called BEFORE it creates them
 * — a matrix that generates names the business does not recognise is worse
 * than typing them by hand.
 */
export function variantName(
  templateName: string,
  shadeName: string | null,
  textureName: string | null,
): string {
  return [templateName, shadeName, textureName]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}
