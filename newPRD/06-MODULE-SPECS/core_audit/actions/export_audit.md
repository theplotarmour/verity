---
doc_id: ACT-CORE_AUDIT-EXPORT_AUDIT
title: Action — Export audit records
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Export audit records

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

**Entity:** `audit_record` · **Capability:** `core_audit`

**Why this exists:** An auditor's deliverable is usually a file handed to somebody outside the system. Forcing that through screenshots is how evidence loses its integrity.

## 1. Specification

### Who can perform it

- auditor
- tenant_owner
- platform_operator

### Preconditions

- acting session is elevated
- a bounded time window
- a stated purpose

### Inputs

- time_window
- filters
- format
- purpose
- include_digest_proof

### What is created

- export_job
- audit_record_of_the_export

### What is modified

None.

### What events fire

- audit.exported

### Who is notified

- **to**: tenant_owner; **channel**: email_and_in_app; **when**: always; **template**: audit_exported; **must_include**: ['actor_display_name', 'row_count', 'window', 'purpose']; **mandatory_legal**: True

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

One export per principal at a time. A second request queues rather than running concurrently, because two large exports from one tenant is the same load profile as an incident.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | purpose empty | State why you are exporting. It is recorded and shown to the workspace owner. | False |  |
| `E_QUOTA` | 402 | export exceeds max_export_rows | Plan limit reached. | False | narrow the window rather than raising the limit; an export of the entire history is a migration, not an audit |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_DEPENDENCY` | 424 | digest proof requested but the covering digests are unverified | A required service is unavailable. | True | an export claiming to carry proof must not ship with unverified digests; it may ship without the proof if the requester accepts that explicitly |

## 3. Edge cases

**EC-01.** The export is permission-projected exactly as the query is. An export cannot be a way around field gating, which means two auditors with different permissions exporting the same window get different files, and each file states which fields were withheld and under which gate so the recipient knows the file is partial.

**EC-02.** include_digest_proof attaches the merkle inclusion proofs and the covering signed digests so a third party can verify the extract without access to Verity. Without this, an exported CSV is an assertion.

**EC-03.** An export requested over a window containing held records. Permitted. A legal hold prevents deletion, not reading.

**EC-04.** An export that would contain the exporter's own actions. Permitted and flagged in the notification, because self-exclusion would be a bigger problem than self-inclusion.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_audit/audit_record/export_audit.md`.
