# Saleor — Concept Inventory

Source: saleor/order/models.py, payment/models.py, checkout/models.py (GitHub: saleor/saleor main branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Order

Source evidence: `saleor/order/models.py:117`
Definition: A confirmed commercial transaction representing goods or services purchased by a customer.
Key attributes:
- `id` (UUID)
- `number` (Sequential Integer)
- `created_at` (DateTime)
- `status` (OrderStatus: DRAFT | UNCONFIRMED | UNFULFILLED | PARTIALLY_FULFILLED | FULFILLED | CANCELED | EXPIRED)
- `authorize_status` (OrderAuthorizeStatus: NONE | PARTIAL | FULL)
- `charge_status` (OrderChargeStatus: NONE | PARTIAL | FULL | OVERCHARGED)
- `user` (belongs_to: User)
- `billing_address`, `shipping_address` (belongs_to: Address)
- `total_gross_amount`, `total_charged_amount` (MoneyField)
Relationships: Has many Line Items, has many Payments, has many Fulfillments.

---

### OrderLine (Line Item)

Source evidence: `saleor/order/models.py` (referenced by line queries)
Definition: An individual product or service entry within an Order.
Key attributes: `product_name`, `variant`, `quantity`, `unit_price`, `quantity_fulfilled`.

---

### Payment (Transaction)

Source evidence: `saleor/payment/models.py` (via order charge status references in `order/models.py:39`)
Definition: The record of a financial transaction attempts against an order.
Key attributes:
- `gateway` (Stripe, Adyen, etc.)
- `charge_status` (NOT_CHARGED | PARTIALLY_CHARGED | CHARGED | REFUNDED)
- `total` (Decimal)
- `transactions` (list of authorization, capture, void, refund events)
Relationships: Belongs to an Order.

---

### Fulfillment

Source evidence: `saleor/order/models.py:43` (`FulfillmentStatus`)
Definition: Represents the operational delivery of items from an Order.
Key attributes: `status` (FULFILLED | CANCELED | WAITING_FOR_APPROVAL), `tracking_number`.
Notes for Verity: Fulfillment represents the physical action distinct from payment or invoicing.
