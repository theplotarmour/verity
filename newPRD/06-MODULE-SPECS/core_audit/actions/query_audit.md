---
doc_id: ACT-CORE_AUDIT-QUERY_AUDIT
title: Action — Search the audit trail
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Search the audit trail

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

**Entity:** `audit_record` · **Capability:** `core_audit`

## 1. Specification

### Who can perform it

- auditor
- tenant_owner
- tenant_admin
- platform_operator
- platform_support

### Preconditions

- the reader holds view on audit_record at a scope
- the query declares a bounded time window

### Inputs

- time_window
- actor_filter
- subject_filter
- capability_filter
- verb_filter
- field_filter
- free_text
- cursor

### What is created

- audit_record_of_the_read_itself

### What is modified

None.

### What events fire

None.

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Reads never block writes. The query runs against a read path that cannot take a lock the writer needs, because an investigator running a wide query must never be able to stall the transactions being audited.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | unbounded time window, or a window wider than max_query_window_days | Choose a date range of at most N days. | False | an unbounded audit query on a large tenant is a denial of service against that tenant's own database |
| `E_AUTHZ_SCOPE` | 404 | the reader's scope excludes the subject | Not found. | False | rows outside scope are omitted from results entirely; the result count must not reveal how many were omitted, so counts are also projected |
| `E_RATE_LIMIT` | 429 | export-shaped querying - repeated wide queries paginating an entire history | Too many attempts. Try again shortly. | True | this pattern is exfiltration wearing a search box, and the rate limit is the control. Legitimate bulk access is export_audit, which is separately gated and separately notified |
| `E_INTERNAL` | 500 | projection cannot be computed because the authorization_decision port is unavailable | A required service is unavailable. | True | FAILS CLOSED. No rows are returned unprojected |

## 3. Edge cases

**EC-01.** The reader can see a row but not one of its changed fields. The row is returned with that key absent from before and after, and changed_field_keys still lists the key. This is deliberate - knowing THAT a salary changed is a different disclosure from knowing what it changed to, and an auditor needs the former.

**EC-02.** An auditor with tenant scope querying actions performed by platform_support under impersonation. Fully visible, including the ticket reference. Support access that a customer cannot audit is not support access.

**EC-03.** Querying an actor who has since been deactivated. The row still renders with the actor's name as recorded. The current status is shown alongside as no-longer-active, not substituted for the historical name.

**EC-04.** A query whose free-text term matches content inside a before or after payload the reader cannot see. The row must not match. Matching would turn the search box into an oracle for reading gated fields one guess at a time.

**EC-05.** Querying across a retention boundary. Expired rows return as tombstones showing that a row existed and was expired by which job, never as an empty result, because an empty result is indistinguishable from nothing having happened.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_audit/audit_record/query_audit.md`.
