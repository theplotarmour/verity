---
doc_id: TEST-REDACT_EVIDENCE
title: Test catalogue — Redact evidence
generated: true
source_model: _model/capabilities/evidence_capture.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Redact evidence

*This document is generated. Edit `_model/capabilities/evidence_capture.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `redact_evidence` is invoked by an authorised actor, then the declared records are created/updated and events ['evidence.redacted'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `redact_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `redact_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `redact_evidence` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `redact_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `redact_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `redact_evidence` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `redact_evidence` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `redact_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `redact_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `redact_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `redact_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `redact_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `redact_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `redact_evidence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `redact_evidence` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: a legal hold covers the item → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the hold. A hold prevents alteration as well as deletion, and this is the one place the two are the same thing

**T-018** Cause: reason empty → expect `E_VALIDATION`, message: 'Write the reason. It is recorded permanently.'.

**T-019** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-020** Cause: the item is still pending upload → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. there is nothing stored to redact, and the correct act is to instruct the device to discard, which is a different action with a different record

## Edge cases

**T-021** (EC-01) Redacting a photograph that is the only evidence supporting an invoiced line. Permitted, and the owning record is marked as having had its evidence redacted, so that a subsequent dispute is answered with the truth rather than with an apparent absence. Preventing the redaction would make the platform unable to comply with a legitimate request; hiding its consequence would be worse.

**T-022** (EC-02) A redaction request arising from a data-subject request. Handled here for the content and by core_audit for the audit rows, and the two are deliberately separate because their retention obligations differ. The conflict between a request and an active legal hold resolves in favour of the hold, and both the request and the conflict are recorded.

**T-023** (EC-03) Masking rather than destroying - blurring a face while keeping the rest of a photograph. Supported as a redaction kind, and it produces a new content hash while retaining the original hash, so the transformation is provable and the original is not recoverable from the record.

**T-024** (EC-04) Redaction of an item that has already expired. A no-op against the tombstone, recorded, because somebody asked and the fact that they asked is itself worth keeping.

**T-025** (EC-05) Bulk redaction across a set - every photograph from one shift. Supported as a batch sharing a correlation id and one reason, and counted as many redactions rather than one for the rate monitor, because the monitor exists to make volume visible and a batch would otherwise hide it.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
