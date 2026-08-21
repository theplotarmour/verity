---
doc_id: TEST-VERIFY_DIGEST
title: Test catalogue — Verify the audit chain
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Verify the audit chain

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `verify_digest` is invoked by an authorised actor, then the declared records are created/updated and events ['audit.verification_completed', 'audit.verification_failed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `verify_digest` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `verify_digest` succeeds. 

**T-015** As `integration_principal` (Integration / Service Account), invoking `verify_digest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `verify_digest` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: recomputed hash does not match record_hash → expect `E_INTERNAL`. the highest-severity finding the platform can produce. The row, its neighbours, the digest and the signing key id are all captured into an incident record before anything else happens

**T-018** Cause: digest signature does not verify against the recorded signing_key_id → expect `E_INTERNAL`. distinguishes a data problem from a key problem, which matters because a rotated-and-lost key is a process failure and a mismatched signature is not

**T-019** Cause: a gap between window_end of digest N and window_start of digest N+1 → expect `E_PRECONDITION`. a chain with a gap is a chain somebody could have cut. Treated as failure, never as a warning

**T-020** Cause: signing key material unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. verification is deferred, NOT reported as passing. An unverifiable chain and a verified chain must never render identically

## Edge cases

**T-021** (EC-01) Verification across a retention boundary where rows have expired to tombstones. The tombstone retains the record hash, so the chain still verifies. This is why expiry destroys content but never the hash.

**T-022** (EC-02) Verification of a tenant that has been migrated between database clusters. The chain must survive migration, which means the canonical serialisation may not depend on physical storage order or on any cluster-local identifier. Stated as a constraint on the serialisation, because it is easy to violate accidentally.

**T-023** (EC-03) An auditor running verification themselves rather than trusting the scheduled run. Explicitly supported and is the point of publishing the scheme. The auditor's run is itself audited, which is not a deterrent but is a fact they should be told before they run it.

**T-024** (EC-04) Verification during an active legal hold. Unaffected. Holds change retention, not content.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
