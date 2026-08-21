---
doc_id: TEST-ISSUE_CREDIT_NOTE
title: Test catalogue — Credit an invoice
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Credit an invoice

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `issue_credit_note` is invoked by an authorised actor, then the declared records are created/updated and events ['billing.credit_note_issued'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `issue_credit_note` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `issue_credit_note` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `issue_credit_note` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `issue_credit_note` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the credit exceeds the uncredited balance of the referenced lines → expect `E_VALIDATION`, message: 'field-specific'.

**T-018** Cause: no reason category → expect `E_VALIDATION`, message: 'Choose why this is being credited.'. from a closed list, because the aggregate of credits by reason is one of the most useful quality signals the platform produces and free text destroys it

**T-019** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-020** Cause: the original is a credit note → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. crediting a credit note is a new invoice, and the message says so

**T-021** Cause: the external registry is unavailable → expect `E_DEPENDENCY`. the credit note IS issued and registration is queued with its own deadline, exactly as for an invoice. A counterparty owed a credit must not wait on a government portal

## Edge cases

**T-022** (EC-01) Crediting an invoice that has already been paid in full. Produces a credit balance on the counterparty account, which is then either refunded or allocated against future invoices. Both are explicit acts, because automatically refunding a credit is moving money without an instruction.

**T-023** (EC-02) Crediting because work was never actually done - an unevidenced line a counterparty rejected. The reason category records it, and the aggregate by category is what tells the tenant whether their evidence capture is failing. This is the most valuable output of the reason list and it is the reason the list is closed rather than free text.

**T-024** (EC-03) A credit note that itself needs registration and fails. Same treatment as an invoice, and the counterparty is told the credit exists and is pending registration, because a credit they cannot see is a credit they will telephone about.

**T-025** (EC-04) Crediting a line whose underlying outcome has already been re-invoiced on a later document. Refused, because the outcome can belong to only one invoice line, and the state that produced this is a data error worth surfacing rather than working around.

**T-026** (EC-05) A goodwill credit with no dispute behind it. Fully supported with its own reason category, and separately reported. Goodwill credits are a legitimate commercial tool and are also the easiest way to reduce a customer's balance without anybody noticing, which is why the rate by principal is monitored.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
