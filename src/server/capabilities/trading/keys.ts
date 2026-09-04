import { z } from "zod";

/**
 * Names and shared validation for the generic trading capability.
 *
 * ADR-018: extracted out of `plywood`, whose engine was already fully
 * generic underneath a plywood-branded vocabulary. `verity.trading.*` is the
 * key namespace any trading-shaped client (plywood, and the auto-parts
 * client after it) shares.
 *
 * Separated from the modules that use them so the capability can be split by
 * stage without those modules importing each other in a cycle. Nothing here has
 * behaviour; it is the vocabulary the rest of the capability agrees on.
 */

export const TRADING_CAPABILITY = "verity.capability.trading";

export const ENTITY_BRAND = "verity.trading.brand";
export const ENTITY_PRODUCT = "verity.trading.product";
export const ENTITY_GODOWN_RACK = "verity.trading.godown_rack";
export const ENTITY_STOCK_LEDGER = "verity.trading.stock_ledger";
export const ENTITY_STOCK_BALANCE = "verity.trading.stock_balance";

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
  .regex(
    /^[0-9]{4}([0-9]{2}([0-9]{2})?)?$/,
    "HSN code must be 4, 6 or 8 digits",
  );

/* Trading partners and orders. */
export const ENTITY_SUPPLIER = "verity.trading.supplier";
export const ENTITY_SUPPLIER_PRICE = "verity.trading.supplier_price";
export const ENTITY_CUSTOMER = "verity.trading.customer";
export const ENTITY_CUSTOMER_PRICE = "verity.trading.customer_price";
export const ENTITY_PURCHASE_ORDER = "verity.trading.purchase_order";
export const ENTITY_PURCHASE_ORDER_LINE = "verity.trading.purchase_order_line";
export const ENTITY_SALES_ORDER = "verity.trading.sales_order";
export const ENTITY_SALES_ORDER_LINE = "verity.trading.sales_order_line";
export const ENTITY_RESERVATION = "verity.trading.reservation";

/* The business's own legal identity and tax registration. */
export const ENTITY_BUSINESS_PROFILE = "verity.trading.business_profile";
export const ENTITY_GST_REGISTRATION = "verity.trading.gst_registration";

/* The accounting period and its posting lock. */
export const ENTITY_ACCOUNTING_PERIOD = "verity.trading.accounting_period";

/* Finance. */
export const ENTITY_INVOICE = "verity.trading.invoice";
export const ENTITY_PAYMENT = "verity.trading.payment";
export const ENTITY_LEDGER_ENTRY = "verity.trading.ledger_entry";

/**
 * Configuration this capability reads. Rates vary between businesses and change
 * by notification; the arithmetic that uses them does not.
 *
 * Basis points, not percentages: 2.5% is 250. A percentage stored as a float is
 * a rounding error waiting for a filing.
 */
export const CONFIG_TENANT_STATE_CODE = "verity.trading.tax.state_code";
export const CONFIG_CGST_RATE_BP = "verity.trading.tax.cgst_rate_bp";
export const CONFIG_SGST_RATE_BP = "verity.trading.tax.sgst_rate_bp";
export const CONFIG_IGST_RATE_BP = "verity.trading.tax.igst_rate_bp";
