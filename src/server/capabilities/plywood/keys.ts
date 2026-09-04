/**
 * Names for the plywood capability's own remaining vocabulary.
 *
 * ADR-018: everything generic moved to `../trading/keys` — parties, orders,
 * finance, tax, stock. This capability now owns only its board-dimension
 * taxonomy extension of the generic `TradingProduct`.
 */

export const PLYWOOD_CAPABILITY = "verity.capability.plywood";

/** `PlywoodProductDetail`'s own entity key — the dimension/grade extension,
 *  1:1 with `verity.trading.product`. Read/Create/Edit on this entity is
 *  what a plywood-catalogue editor needs beyond the base product grant. */
export const ENTITY_PRODUCT_DETAIL = "verity.plywood.product_detail";
