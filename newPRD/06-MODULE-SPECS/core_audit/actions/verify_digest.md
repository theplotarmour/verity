---
doc_id: ACT-CORE_AUDIT-VERIFY_DIGEST
title: Action — Verify the audit chain
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Verify the audit chain

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

**Entity:** `audit_digest` · **Capability:** `core_audit`

**Why this exists:** A tamper-evident scheme that is never checked provides no evidence at all. The check is the product, not the hash.

## 1. Specification

### Who can perform it

- system_scheduler
- auditor
- platform_operator

### Preconditions

- at least one digest exists for the tenant

### Inputs

- tenant_id
- window
- depth

### What is created

- verification_result
- audit_record_of_the_verification

### What is modified

- audit_digest state

### What events fire

- audit.verification_completed
- audit.verification_failed

### Who is notified

- **to**: platform_operator and tenant_owner; **channel**: all_available; **when**: on_failure; **template**: audit_verification_failed; **mandatory_legal**: True; **note**: not suppressible and not snoozable

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Verification is read-only against audit rows and takes no lock. Multiple concurrent verifications of the same digest are harmless and produce the same result, which is a property worth having because it means a suspicious auditor can re-run it themselves.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_INTERNAL` | 500 | recomputed hash does not match record_hash | *(silent)* | True | the highest-severity finding the platform can produce. The row, its neighbours, the digest and the signing key id are all captured into an incident record before anything else happens |
| `E_INTERNAL` | 500 | digest signature does not verify against the recorded signing_key_id | *(silent)* | True | distinguishes a data problem from a key problem, which matters because a rotated-and-lost key is a process failure and a mismatched signature is not |
| `E_PRECONDITION` | 409 | a gap between window_end of digest N and window_start of digest N+1 | *(silent)* | False | a chain with a gap is a chain somebody could have cut. Treated as failure, never as a warning |
| `E_DEPENDENCY` | 424 | signing key material unavailable | A required service is unavailable. | True | verification is deferred, NOT reported as passing. An unverifiable chain and a verified chain must never render identically |

## 3. Edge cases

**EC-01.** Verification across a retention boundary where rows have expired to tombstones. The tombstone retains the record hash, so the chain still verifies. This is why expiry destroys content but never the hash.

**EC-02.** Verification of a tenant that has been migrated between database clusters. The chain must survive migration, which means the canonical serialisation may not depend on physical storage order or on any cluster-local identifier. Stated as a constraint on the serialisation, because it is easy to violate accidentally.

**EC-03.** An auditor running verification themselves rather than trusting the scheduled run. Explicitly supported and is the point of publishing the scheme. The auditor's run is itself audited, which is not a deterrent but is a fact they should be told before they run it.

**EC-04.** Verification during an active legal hold. Unaffected. Holds change retention, not content.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_audit/audit_digest/verify_digest.md`.
