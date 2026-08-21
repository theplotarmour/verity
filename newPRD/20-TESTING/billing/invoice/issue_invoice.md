---
doc_id: TEST-ISSUE_INVOICE
title: Test catalogue — Issue an invoice
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Issue an invoice

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `issue_invoice` is invoked by an authorised actor, then the declared records are created/updated and events ['billing.invoice_issued'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `issue_invoice` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `issue_invoice` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `issue_invoice` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: an outcome is unrated → expect `E_PRECONDITION`, message: 'Some items have no price yet.'. names them, because the fix is in the rating queue

**T-018** Cause: the counterparty lacks an attribute the tax treatment requires → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the missing attribute. Discovered at issue rather than at party creation is late and is better than discovering it at registration, which is later still

**T-019** Cause: an outcome is already on another invoice → expect `E_CONFLICT_UNIQUE`. the constraint that stops double billing; the offending outcomes are named

**T-020** Cause: total exceeds the elevation threshold and the session is not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-021** Cause: the external registry is unavailable → expect `E_DEPENDENCY`. the invoice IS issued and moves to issued-unregistered with its deadline recorded and the registration queued. Refusing to issue because a government portal is down would stop billing entirely for the duration of somebody else's outage

**T-022** Cause: more than max_lines_per_invoice → expect `E_QUOTA`, message: 'Plan limit reached.'. the correct action is to split the period or summarise, and the message offers both

## Edge cases

**T-023** (EC-01) Issuing while the external registry is unavailable. The document exists, is not tax-valid, says so on its face, and is not sent to the counterparty until it is registered or until finance explicitly chooses to send a not-tax-valid document. The distinction between having the document and being able to use it is the whole reason registration is modelled as a separate state.

**T-024** (EC-02) The registration deadline passing without success. The document is permanently not-tax-valid. It is escalated as a revenue loss rather than an administrative problem, because a document that can never be registered may never be collectable as a tax invoice and the underlying work may need re-invoicing under a new date, which is a decision with tax consequences that this capability records and does not take.

**T-025** (EC-03) Summarising many outcomes into one line. Supported, with outcome_count and full expandability retained. A counterparty who cannot drill into a summarised line disputes the whole line, so summarisation without expandability is a false economy.

**T-026** (EC-04) Issuing a zero-total invoice - every line credited or comped. Permitted, because a zero document is frequently required as a record of service under a contract. It still consumes a document number and still registers where required.

**T-027** (EC-05) Issuing against a counterparty whose credit limit is exceeded. Permitted and flagged to finance. Blocking the invoice does not reduce the exposure; the work has already been done and not invoicing it makes the exposure invisible.

**T-028** (EC-06) Two billing runs issuing for the same period concurrently. The idempotency key collapses them. Where the outcome sets differ - one run started earlier and saw fewer outcomes - the second run fails on the already-invoiced outcomes and reports which, rather than issuing a second partial invoice.

## Idempotency and concurrency

**T-029** Replaying the same request with the same idempotency key produces one effect and one event.

**T-030** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-031** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-032** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 32**
