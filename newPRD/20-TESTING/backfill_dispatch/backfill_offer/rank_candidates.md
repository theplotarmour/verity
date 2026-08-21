---
doc_id: TEST-RANK_CANDIDATES
title: Test catalogue — Rank who to ask
generated: true
source_model: _model/capabilities/backfill_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Rank who to ask

*This document is generated. Edit `_model/capabilities/backfill_dispatch.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `rank_candidates` is invoked by an authorised actor, then the declared records are created/updated and events ['backfill.candidates_ranked'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `rank_candidates` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `rank_candidates` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `rank_candidates` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the resource provider is unavailable → expect `E_DEPENDENCY`. the request stays in raised and the ranking retries with backoff. It does NOT fall back to an unranked list of everybody, which would page an entire workforce for one gap

**T-018** Cause: the ranking returns no candidates at this tier → expect `E_PRECONDITION`. an outcome, not an error. It escalates immediately rather than consuming the tier's time budget waiting for offers that cannot be made

**T-019** Cause: org_structure unavailable so distance cannot be computed → expect `E_DEPENDENCY`. ranking proceeds without the distance factor and every offer records that distance was unavailable. A ranking that silently drops a factor is one nobody can audit

**T-020** Cause: the candidate pool exceeds max_ranked_candidates → expect `E_QUOTA`. truncated at the limit with the truncation recorded. An unbounded ranking on a large workforce is slow at exactly the moment speed matters most

## Edge cases

**T-021** (EC-01) A candidate who is the absent person. Always excluded. Backfilling somebody with themselves is a data error that looks like a resolution.

**T-022** (EC-02) A candidate whose acceptance would breach a working-hour limit. Excluded from the ranking rather than offered and refused at acceptance, because an offer that cannot be accepted wastes the candidate's attention and the request's lead time. The exclusion is recorded in the factors so a dispatcher can see who was skipped and why.

**T-023** (EC-03) Every candidate at a tier has already declined at a previous tier. They are not re-offered within the same request unless the tier explicitly permits re-asking with a premium, which is a configured behaviour rather than a default. Re-asking somebody who already said no, with nothing changed, is how people stop reading offers.

**T-024** (EC-04) Ranking during a widespread disruption when most of the workforce is unavailable. The empty-list outcome fires immediately at tier 0 and escalates to a human. This is the case the capability most needs to handle well, because it is exactly when the automatic path is least useful.

**T-025** (EC-05) A tenant with a small workforce where the ranking is trivially the whole list. Fully supported, and the tier structure still governs timing and premium. The capability's value at that size is the timing and the record, not the ranking.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `read_sensitive_only` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
