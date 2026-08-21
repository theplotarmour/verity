---
doc_id: TEST-EXPORT_AUDIT
title: Test catalogue — Export audit records
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Export audit records

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `export_audit` is invoked by an authorised actor, then the declared records are created/updated and events ['audit.exported'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `export_audit` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `export_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `export_audit` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `export_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `export_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `export_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `export_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `export_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `export_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `export_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `export_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `export_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `export_audit` succeeds. 

**T-015** As `integration_principal` (Integration / Service Account), invoking `export_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `export_audit` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: purpose empty → expect `E_VALIDATION`, message: 'State why you are exporting. It is recorded and shown to the workspace owner.'.

**T-018** Cause: export exceeds max_export_rows → expect `E_QUOTA`, message: 'Plan limit reached.'. narrow the window rather than raising the limit; an export of the entire history is a migration, not an audit

**T-019** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-020** Cause: digest proof requested but the covering digests are unverified → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. an export claiming to carry proof must not ship with unverified digests; it may ship without the proof if the requester accepts that explicitly

## Edge cases

**T-021** (EC-01) The export is permission-projected exactly as the query is. An export cannot be a way around field gating, which means two auditors with different permissions exporting the same window get different files, and each file states which fields were withheld and under which gate so the recipient knows the file is partial.

**T-022** (EC-02) include_digest_proof attaches the merkle inclusion proofs and the covering signed digests so a third party can verify the extract without access to Verity. Without this, an exported CSV is an assertion.

**T-023** (EC-03) An export requested over a window containing held records. Permitted. A legal hold prevents deletion, not reading.

**T-024** (EC-04) An export that would contain the exporter's own actions. Permitted and flagged in the notification, because self-exclusion would be a bigger problem than self-inclusion.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
