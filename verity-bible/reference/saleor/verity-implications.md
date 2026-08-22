# Saleor — Verity Implications

Source: saleor/order/models.py, payment/models.py (GitHub: saleor/saleor main branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Decoupled Operational and Billing Lifecycles

Confidence: HIGH
Recommendation: ADOPT
Rationale: Saleor demonstrates the necessity of separating order status (UNFULFILLED/FULFILLED) from financial status (charge status). In field services, a technician completes a job (operational completion), but the customer may be billed on weekly consolidated invoice terms. A combined state machine leads to logical deadlocks.
If ADOPT: Verity's `WorkOrder` entity has separate fields for:
- `operationalStatus`: DRAFT | SCHEDULING | EN_ROUTE | IN_PROGRESS | COMPLETED | CANCELLED
- `billingStatus`: NONE | UNBILLED | INVOICED | PARTIALLY_PAID | PAID | WRITE_OFF
Affects Bible sections: Volume II (Work Primitive), Volume III (Execution)

---

### Partial Fulfillment (Milestone Dispatch)

Confidence: HIGH
Recommendation: ADOPT
Rationale: A large work order (e.g. installing HVAC across 3 buildings) cannot be treated as a single binary done/not-done step. Saleor's `Fulfillment` model allows delivering order lines in chunks.
If ADOPT: Verity adopts a `WorkFulfillment` / `MilestoneCompletion` entity. A technician can submit evidence and complete specific "packages" of a Work Order, triggering partial invoicing or progress milestone approvals.
Affects Bible sections: Volume II (Work Primitive), Volume III (Execution)

---

### Idempotency Keys on Action Boundaries

Confidence: HIGH
Recommendation: ADOPT
Rationale: In offline-first or poor-connectivity environments (typical for field technicians), HTTP request retries are frequent. Lack of idempotency causes duplicate checklist completions or payment captures.
If ADOPT: Every critical mutation endpoint in Verity (e.g., `/work-orders/:id/complete`, `/payments/charge`) enforces an `idempotency_key` header (UUID), checking a Redis-cached or DB-persisted execution record before processing.
Affects Bible sections: Volume V (Offline & Security)
