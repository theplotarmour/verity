---
doc_id: TEST-RATE_OUTCOME
title: Test catalogue — Work out what an outcome is worth
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Work out what an outcome is worth

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `rate_outcome` is invoked by an authorised actor, then the declared records are created/updated and events ['billing.outcome_rated', 'billing.outcome_unratable'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `rate_outcome` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `rate_outcome` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `rate_outcome` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no rate rule resolves for this counterparty, contract, item and period → expect `E_PRECONDITION`. the outcome moves to UNRATABLE, which is a queue somebody works. It is never rated at zero and never at a neighbouring rate, both of which are inventing a price

**T-018** Cause: two rate rules apply at the same precedence → expect `E_CONFLICT_UNIQUE`. moves to unratable with both rules named. Choosing arbitrarily between two prices is the one thing a billing system must never do

**T-019** Cause: a manual amount supplied without view_financial → expect `E_AUTHZ_FIELD`. refused outright rather than dropped, because a manual amount IS the financial decision

**T-020** Cause: a manual amount with no reason → expect `E_VALIDATION`, message: 'Say why this amount was set by hand.'. manual amounts are separately reported, because they bypass every rate rule the tenant configured

**T-021** Cause: the tax_treatment port is unavailable → expect `E_DEPENDENCY`. the outcome rates and tax_classification is carried without a computed rate. Tax is computed at issue rather than at rating, so this does not block

## Edge cases

**T-022** (EC-01) An outcome arriving with a classification hint from its source - a backfill marked absorbed_by_tenant. The hint is honoured where a rate rule matches on it and never overrides an explicit rule. The hint is a source's opinion about chargeability and the rate rules are the tenant's decision, and where they disagree the tenant's decision wins and the disagreement is recorded.

**T-023** (EC-02) Re-rating an outcome after a rate correction. Permitted while the outcome is not yet invoiced, and both ratings are retained. Once invoiced, the correction is a credit note and a new invoice, never a re-rate.

**T-024** (EC-03) An outcome whose evidence strength is below what the contract requires. Rated normally and flagged on the line, so that the invoice can be issued and the weakness is visible to whoever will defend it. Refusing to rate would leave revenue in a queue over a data-quality question that finance may reasonably accept.

**T-025** (EC-04) Rating a period-based outcome that spans a rate change. The rule effective at the outcome's occurred_at governs, not the rule effective when rating runs. Otherwise a delayed rating run silently applies new prices to old work.

**T-026** (EC-05) A pass-through outcome, where the tenant is recharging a cost. Rated from the recorded cost plus any configured margin, and the underlying cost reference is carried so the counterparty can be shown it. A pass-through with no traceable cost is exactly what a counterparty refuses to pay.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
