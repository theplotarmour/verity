---
doc_id: TEST-ALLOCATE_PAYMENT
title: Test catalogue — Allocate a payment
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Allocate a payment

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `allocate_payment` is invoked by an authorised actor, then the declared records are created/updated and events ['billing.payment_allocated'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `allocate_payment` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `allocate_payment` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `allocate_payment` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: allocations exceed the receipt balance → expect `E_VALIDATION`, message: 'field-specific'.

**T-018** Cause: an allocation exceeds an invoice's outstanding balance → expect `E_VALIDATION`, message: 'field-specific'. the excess should be recorded as a payment on account, which the error offers, rather than as an overpayment on a document

**T-019** Cause: the target invoice belongs to a different counterparty and no reason is supplied → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. cross-party allocation is legitimate within a group and is always deliberate, so it requires a reason and is reported

**T-020** Cause: the target line is disputed and the tenant does not permit allocating to disputed amounts → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

**T-021** Cause: the allocation reverses a previous one and the session is not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

## Edge cases

**T-022** (EC-01) A receipt with no identifiable counterparty. Recorded and left unallocated, appearing in the unallocated queue with its payer narrative. Guessing the payer from a partial name match is exactly the automation that produces a payment applied to the wrong customer, which is discovered by the customer who did pay.

**T-023** (EC-02) {'A short payment because the counterparty is withholding a disputed amount. Allocated to the undisputed lines, leaving the disputed amount outstanding. This is why disputes are line-level': 'an invoice-level dispute would make the whole document look unpaid and start a collection sequence against somebody who has paid what they agree they owe.'}

**T-024** (EC-03) A round-sum payment covering several invoices with no remittance advice. Allocated explicitly by a person, and the model deliberately offers candidates rather than choosing. The candidates are ordered by due date and the ordering is a suggestion that is visibly a suggestion.

**T-025** (EC-04) An overpayment. Recorded as a payment on account against the counterparty rather than as an overpaid invoice, so that the invoice balance stays truthful and the credit is visible where it will be used.

**T-026** (EC-05) Allocation of a receipt that is later reversed by the bank. The reversal unallocates first, restoring invoice balances, and both the allocation and its reversal are retained. The invoice returns to its previous state including its collection position, rather than restarting collection from the beginning against somebody whose payment failed through no fault of their own.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
