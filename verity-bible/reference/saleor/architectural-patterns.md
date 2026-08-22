# Saleor — Architectural Patterns

Source: saleor/order/models.py, payment/models.py (GitHub: saleor/saleor main branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Decoupling Commercial State from Logistical State

Source evidence: `saleor/order/models.py:125-139` (`status`, `authorize_status`, `charge_status`)
Pattern: An order maintains separate fields for its general lifecycle status (logistics, fulfillment) and its financial status (charge status, authorization status).
Problem solved: Allows orders to be "fulfilled" operationally even if they are net-30 invoiced (unpaid), or conversely, prevents shipping if payment has failed.
Applicability to Verity: HIGH — A Work Order has a status (e.g. Completed) that is operationally distinct from its commercial billing status (e.g. Invoiced, Paid). Decoupling these is a mandatory requirement.

---

### Idempotency-Key Driven Transaction Processing

Source evidence: `saleor/order/models.py:109` (`idempotencyKey` / UUID index)
Pattern: Every request affecting order state (creation, checkout, payment capture) requires an idempotency key passed from the client or generated deterministically.
Problem solved: Prevents double-charging or duplicate order creation on network retries.
Applicability to Verity: HIGH — Customer quote approvals or worker checkout submittals must be protected by idempotency keys to prevent duplicate actions.

---

### Fulfillment as a First-Class Entity

Source evidence: `saleor/order/models.py:43` (`FulfillmentStatus`)
Pattern: Instead of a simple "shipped" flag, a separate `Fulfillment` record exists which contains specific quantities of specific order lines.
Problem solved: Enables partial shipments and tracks tracking numbers per package.
Applicability to Verity: HIGH — Verity needs partial delivery/fulfillment concepts when a large service work order requires multiple site visits or split milestones.
