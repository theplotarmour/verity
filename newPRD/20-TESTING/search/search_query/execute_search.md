---
doc_id: TEST-EXECUTE_SEARCH
title: Test catalogue — Search
generated: true
source_model: _model/capabilities/search.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Search

*This document is generated. Edit `_model/capabilities/search.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `execute_search` is invoked by an authorised actor, then the declared records are created/updated and events [] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `execute_search` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `execute_search` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `execute_search` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: candidates fall outside the principal's scope → expect `E_AUTHZ_SCOPE`. they are omitted from the result set and from the count. The count must be projected too, because a total that includes invisible rows discloses how many exist

**T-018** Cause: the term is shorter than the minimum matchable length → expect `E_VALIDATION`. returns an empty result with the reason rather than scanning. A one-character term against every entity is a denial of service against the tenant's own index

**T-019** Cause: export-shaped querying - repeated wide queries paginating deeply with a low selection rate → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. this pattern is exfiltration wearing a search box, and the rate limit is the control. Legitimate bulk access is an export, which is separately gated and separately audited

**T-020** Cause: the authorization port is unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. FAILS CLOSED. No results are returned unchecked under any circumstance, including a partial outage

**T-021** Cause: the index is unavailable → expect `E_DEPENDENCY`. falls back to an exact-identifier lookup against the owning capabilities, which covers the most common real search - somebody typing a reference number - and states that only exact matches are available. A total failure would be worse than a narrow one

**T-022** Cause: requested page depth exceeds max_result_depth → expect `E_QUOTA`. deep pagination is the mechanism by which a search box becomes a bulk export, and the depth limit is the boundary between the two

## Edge cases

**T-023** (EC-01) A term matching content inside a gated field. The row must NOT appear. Matching on a field the principal cannot read turns the search box into an oracle for reading gated fields one guess at a time, and the gate_verb on every field projection exists precisely to make this checkable rather than incidental.

**T-024** (EC-02) A result count that would reveal how many records exist outside scope. Counts are projected exactly as rows are. Returning a total of 47 while showing 3 tells the searcher that 44 exist elsewhere, which is the same disclosure as showing them.

**T-025** (EC-03) Searching immediately after creating a record. The index lag is stated on the result set, and an exact-identifier lookup bypasses the index entirely. Somebody who has just created something and cannot find it concludes the product lost it, and the exact-lookup path exists for exactly that moment.

**T-026** (EC-04) A principal whose scope changed seconds ago. The index filter uses the old scope and the re-check uses the new one, so the result is correct and slower. This is the case the evidence_basis limitation names, and its cost is an open question rather than an assumed acceptable overhead.

**T-027** (EC-05) Searching by phone number where the number is a gated field on the party entity. Matchable only by principals holding the gate, and matched on a normalised form, because a number typed with spaces and a number stored in international form are the same number and a search that cannot see that is a search nobody uses twice.

**T-028** (EC-06) An integration principal searching. Permitted within its own scope, rate-limited more tightly than a human, and always audited, because a service account paginating a search surface is the single most efficient exfiltration path in the platform.

## Idempotency and concurrency

**T-029** Replaying the same request with the same idempotency key produces one effect and one event.

**T-030** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-031** An audit row of class `read_sensitive_only` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-032** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 32**
