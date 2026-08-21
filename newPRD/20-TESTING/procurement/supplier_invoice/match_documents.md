---
doc_id: TEST-MATCH_DOCUMENTS
title: Test catalogue — Match order, receipt and invoice
generated: true
source_model: _model/capabilities/procurement.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Match order, receipt and invoice

*This document is generated. Edit `_model/capabilities/procurement.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `match_documents` is invoked by an authorised actor, then the declared records are created/updated and events ['procurement.matched', 'procurement.variance_detected'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `match_documents` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `match_documents` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `match_documents` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `match_documents` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no receipt exists against the commitment → expect `E_PRECONDITION`, message: 'Nothing has been recorded as received against this order.'. the message names the action that unblocks it, because a stalled match is almost always an unrecorded receipt rather than a genuine dispute

**T-018** Cause: a receipt line is already fully matched to another invoice → expect `E_CONFLICT_UNIQUE`, message: 'That delivery has already been invoiced.'. names the other invoice. This is the duplicate-payment control and it is a constraint rather than a report

**T-019** Cause: quantity or price variance exceeds tolerance → expect `E_VALIDATION`. not an error - the invoice moves to variance_hold, which is a state a person works, rather than failing a job that nobody sees

**T-020** Cause: the commitment is closed → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. requires an explicit reopen with a reason, because an invoice arriving against a closed order is a duplicate more often than it is a late claim

**T-021** Cause: this supplier invoice number already exists for this supplier → expect `E_CONFLICT_UNIQUE`, message: 'This invoice number has already been recorded.'. the single control that catches most duplicate invoices, enforced at record time and re-checked here

## Edge cases

**T-022** (EC-01) One invoice covering several receipts, and one receipt covering several invoices. Both are ordinary and both are supported by tracking matched quantity per receipt line. A model that matches whole documents fails on the first partial delivery.

**T-023** (EC-02) A price variance within tolerance but consistently in the supplier's favour. Matched, and reported as a pattern to finance monthly. A systematic small overcharge is invisible per invoice and material per quarter, and the tolerance is precisely what conceals it.

**T-024** (EC-03) An invoice for goods never received because the delivery went to another location. The match fails, and the unmatched-receipt report at the other location is what resolves it. The two reports are deliberately cross-referenced by supplier and date, because otherwise both sides wait.

**T-025** (EC-04) Matching where the commitment used free-text lines and the invoice uses the supplier's own descriptions. No automatic matching by description is attempted; the line mapping is supplied by a person. Fuzzy description matching is exactly the kind of helpfulness that pays a supplier for something else.

**T-026** (EC-05) Tax variance where the supplier applied a different treatment from the one expected. Held as a variance with the tax difference reported separately from the price difference, because the two have different resolutions - one is a negotiation and the other is a question for an accountant.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
