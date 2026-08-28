import { z } from "zod";

/**
 * Names and shared validation for the plywood capability.
 *
 * Separated from the modules that use them so the capability can be split by
 * stage without those modules importing each other in a cycle. Nothing here has
 * behaviour; it is the vocabulary the rest of the capability agrees on.
 */

export const PLYWOOD_CAPABILITY = "verity.capability.plywood";

export const ENTITY_BRAND = "verity.plywood.brand";
export const ENTITY_PRODUCT = "verity.plywood.product";
export const ENTITY_GODOWN_RACK = "verity.plywood.godown_rack";
export const ENTITY_STOCK_LEDGER = "verity.plywood.stock_ledger";
export const ENTITY_STOCK_BALANCE = "verity.plywood.stock_balance";

/**
 * HSN codes are 4, 6 or 8 digits — CBIC notification 78/2020 sets which by the
 * business's turnover. The rule is the shape; the digit count is the client's
 * accountant's decision, and hard-coding one would be wrong for the other two.
 *
 * The same expression is a CHECK constraint on the column. Validating here as
 * well is not duplication for its own sake: it produces a named validation
 * failure instead of a constraint violation, and the constraint remains the
 * thing that cannot be forgotten by a second writer.
 */
export const HSN_CODE = z
  .string()
  .regex(/^[0-9]{4}([0-9]{2}([0-9]{2})?)?$/, "HSN code must be 4, 6 or 8 digits");

/* Stages 3 and 4 — trading partners and orders. */
export const ENTITY_SUPPLIER = "verity.plywood.supplier";
export const ENTITY_SUPPLIER_PRICE = "verity.plywood.supplier_price";
export const ENTITY_CUSTOMER = "verity.plywood.customer";
export const ENTITY_CUSTOMER_PRICE = "verity.plywood.customer_price";
export const ENTITY_PURCHASE_ORDER = "verity.plywood.purchase_order";
export const ENTITY_PURCHASE_ORDER_LINE = "verity.plywood.purchase_order_line";
export const ENTITY_SALES_ORDER = "verity.plywood.sales_order";
export const ENTITY_SALES_ORDER_LINE = "verity.plywood.sales_order_line";
export const ENTITY_RESERVATION = "verity.plywood.reservation";

/* Stage 5 — logistics. */
export const ENTITY_TRANSPORTER = "verity.plywood.transporter";
export const ENTITY_SHIPMENT = "verity.plywood.shipment";

/* Stage 6 — finance. */
export const ENTITY_INVOICE = "verity.plywood.invoice";
export const ENTITY_PAYMENT = "verity.plywood.payment";
export const ENTITY_LEDGER_ENTRY = "verity.plywood.ledger_entry";

/**
 * Configuration this capability reads. Rates vary between businesses and change
 * by notification; the arithmetic that uses them does not.
 *
 * Basis points, not percentages: 2.5% is 250. A percentage stored as a float is
 * a rounding error waiting for a filing.
 */
export const CONFIG_TENANT_STATE_CODE = "verity.plywood.tax.state_code";
export const CONFIG_CGST_RATE_BP = "verity.plywood.tax.cgst_rate_bp";
export const CONFIG_SGST_RATE_BP = "verity.plywood.tax.sgst_rate_bp";
export const CONFIG_IGST_RATE_BP = "verity.plywood.tax.igst_rate_bp";
