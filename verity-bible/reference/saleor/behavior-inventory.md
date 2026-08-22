# Saleor — Behavior Inventory

Source: saleor/order/models.py, payment/models.py (GitHub: saleor/saleor main branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Fulfillment Eligibility Check

Source evidence: `saleor/order/models.py:73` (`ready_to_fulfill`)
Trigger: Dispatcher or system attempts to fulfill items.
Preconditions:
- Order status is `UNFULFILLED` or `PARTIALLY_FULFILLED`.
- Order has an active associated `Payment` record.
- Order is fully paid (`total_gross_amount <= total_charged_amount`).
Steps:
1. Validate that items exist in order lines that haven't been fulfilled yet.
2. Verify total charged amount equals or exceeds the total gross order amount.
3. Allow transitioning state to `PARTIALLY_FULFILLED` or `FULFILLED` upon shipping confirmation.
Failure handling: Blocks fulfillment action if payment state is not captured or authorized depending on store configuration.

---

### Payment Capture and Charge Status Update

Source evidence: `saleor/order/models.py:87` (`ready_to_capture`)
Trigger: Successful completion of capture transaction against gateway.
Steps:
1. Capture transaction updates the `Payment` charge status to `CHARGED`.
2. Propagate charge status up to the parent `Order`.
3. Order updates `charge_status` (none → partial → full).
4. If full, triggers fulfillment checks.
State changes: `Order.charge_status` updated in DB.
Notes for Verity: Verity's billing capability must decouple invoice status (sent, unpaid) from the payment transaction status (authorized, captured).

---

### Draft Order Lifecycle

Source evidence: `saleor/order/models.py:65` (`drafts`)
Trigger: Creating or editing an order prior to completion.
Preconditions: None (un-validated drafts are permitted).
Steps:
1. Create Order with status `DRAFT`.
2. Allow adding lines, editing prices, and modifying addresses without validation checks.
3. Execute "Confirm" operation: checks inventory, validates tax, creates a regular order.
State changes: Transitions `status` from `DRAFT` to `UNFULFILLED` or `UNCONFIRMED`.
