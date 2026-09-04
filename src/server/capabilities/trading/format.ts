/**
 * Generic size-display formatting, shared by any capability that trades a
 * width/height-dimensioned item. Lives in `trading/` (not `plywood/`) because
 * `orders.ts` needs it for order-line snapshots (`describeProduct`), and
 * `trading` must never import from a capability that depends on it — that
 * would invert ADR-018's dependency direction. `plywood/product.ts` re-exports
 * this rather than duplicating it.
 */

/** "8 x 4 ft", "96 x 5 in", "2440 x 1220 mm" — one dash when there is no size. */
export function formatProductSize(product: {
  sizeUnit: string;
  widthTenth: number | null;
  heightTenth: number | null;
}): string {
  if (product.widthTenth == null || product.heightTenth == null) return "—";
  // Tenths print as tenths only when the tenth is real: "8" not "8.0", but
  // "7.5" when the yard genuinely cut a half.
  const show = (tenth: number) =>
    tenth % 10 === 0 ? String(tenth / 10) : (tenth / 10).toFixed(1);
  const unit =
    product.sizeUnit === "FT" ? "ft" : product.sizeUnit === "IN" ? "in" : "mm";
  return `${show(product.widthTenth)} × ${show(product.heightTenth)} ${unit}`;
}
