/**
 * The one place a platform identifier becomes a business word.
 *
 * §78 wants an audit a business can read: who did what, to which record, when,
 * and what changed. `state`, `verity.plywood.receive_goods` and
 * `verity.plywood.purchase_order` answer none of that for the person asking.
 *
 * Shared between the audit page and the per-record activity panels, because two
 * copies of a vocabulary drift and the first symptom is the same event
 * described two ways on two screens — which is the inconsistency §84 is
 * written against, appearing in the log that is supposed to explain it.
 *
 * Every lookup falls through to the raw identifier rather than hiding a row it
 * cannot name. A change that happened and cannot be described is still a change
 * that happened, and dropping it would make the log quietly incomplete —
 * exactly the property an audit trail must not have.
 */

/** Entity keys as a record type a person would name. */
export const ENTITY_LABEL: Record<string, string> = {
  "verity.plywood.purchase_order": "Purchase order",
  "verity.plywood.sales_order": "Sales order",
  "verity.plywood.invoice": "Invoice",
  "verity.plywood.payment": "Payment",
  "verity.plywood.product": "Board",
  "verity.plywood.brand": "Brand",
  "verity.plywood.supplier": "Supplier",
  "verity.plywood.customer": "Customer",
  "verity.plywood.supplier_price": "Supplier price",
  "verity.plywood.customer_price": "Customer price",
  "verity.plywood.stock_balance": "Stock",
  "verity.plywood.stock_ledger": "Stock movement",
  "verity.plywood.godown_rack": "Rack",
  "verity.plywood.business_profile": "Business details",
  "verity.plywood.gst_registration": "Tax registration",
  "verity.plywood.accounting_period": "Accounting period",
  "verity.plywood.ledger_entry": "Ledger entry",
  "verity.platform.role": "Role",
  "verity.platform.membership": "Person",
  "verity.platform.organization": "Organization",
};

/** Column names as the business reads them. */
export const FIELD_LABEL: Record<string, string> = {
  state: "Status",
  totalCostPaise: "Order value",
  totalPricePaise: "Order value",
  qtyReceived: "Received quantity",
  qtyShipped: "Issued quantity",
  qtyOrdered: "Ordered quantity",
  creditLimitPaise: "Credit limit",
  creditOverrideReason: "Credit override",
  reorderLevelUnits: "Reorder level",
  negotiatedCostPaise: "Supplier price",
  customPricePaise: "Customer price",
  reference: "Reference",
  reason: "Reason",
  active: "Active",
  roleId: "Role",
  hsnCode: "HSN code",
  gstin: "GSTIN",
};

/** Command keys as the action they performed. */
export const COMMAND_LABEL: Record<string, string> = {
  "verity.plywood.create_purchase_order": "Order raised",
  "verity.plywood.submit_purchase_order": "Sent to supplier",
  "verity.plywood.receive_goods": "Goods received",
  "verity.plywood.cancel_purchase_order": "Order cancelled",
  "verity.plywood.create_sales_order": "Order taken",
  "verity.plywood.approve_credit": "Credit approved",
  "verity.plywood.reserve_for_order": "Stock reserved",
  "verity.plywood.dispatch_order": "Goods issued",
  "verity.plywood.cancel_sales_order": "Order cancelled",
  "verity.plywood.raise_sales_invoice": "Invoice raised",
  "verity.plywood.raise_purchase_invoice": "Supplier invoice recorded",
  "verity.plywood.raise_invoice_note": "Credit or debit note issued",
  "verity.plywood.record_payment": "Payment recorded",
  "verity.plywood.record_damaged_stock": "Damage recorded",
  "verity.plywood.adjust_stock": "Stock adjusted",
  "verity.plywood.record_returned_stock": "Customer return recorded",
  "verity.plywood.transfer_stock": "Stock transferred",
  "verity.plywood.set_supplier_price": "Supplier price set",
  "verity.plywood.set_customer_price": "Customer price set",
  "verity.plywood.set_credit_limit": "Credit limit set",
  "verity.plywood.set_tax_rule": "Tax rate set",
  "verity.plywood.close_period": "Period closed",
  "verity.plywood.reopen_period": "Period reopened",
  "verity.plywood.set_role_activity": "Role changed",
  "verity.plywood.create_brand": "Brand added",
  "verity.plywood.set_brand_active": "Brand availability changed",
  "verity.plywood.create_product": "Board added",
  "verity.plywood.set_product_active": "Board availability changed",
  "verity.platform.invite_person": "Person invited",
  "verity.platform.assign_role": "Role assigned",
  "verity.platform.create_role": "Role created",
  "verity.platform.revoke_membership": "Access removed",
};

export function entityLabelOf(entityKey: string): string {
  return (
    ENTITY_LABEL[entityKey] ?? entityKey.split(".").slice(-1)[0] ?? entityKey
  );
}

export function fieldLabelOf(field: string): string {
  return FIELD_LABEL[field] ?? field;
}

export function commandLabelOf(commandKey: string | null): string | null {
  if (!commandKey) return null;
  return COMMAND_LABEL[commandKey] ?? commandKey;
}
