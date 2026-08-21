---
doc_id: ACT-BILLING-RATE_OUTCOME
title: Action — Work out what an outcome is worth
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Work out what an outcome is worth

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

**Entity:** `billable_outcome` · **Capability:** `billing`

**Why this exists:** Kept separate from receiving the outcome and from invoicing it, so that a rate can be corrected without re-doing the work and work can be re-billed without re-doing the rate. Its failure mode - no applicable rate - is a state a person works rather than an error in a log.


## 1. Specification

### Who can perform it

- system
- finance

### Preconditions

- the outcome is received or unratable
- the counterparty resolves

### Inputs

- outcome_id
- manual_amount_minor
- manual_reason

### What is created

None.

### What is modified

- rated_amount_minor
- rate_rule_ref
- tax_classification
- outcome state

### What events fire

- billing.outcome_rated
- billing.outcome_unratable

### Who is notified

- **to**: finance; **channel**: in_app; **when**: the outcome is unratable; **template**: unratable_outcome; **must_include**: ['counterparty', 'source_capability', 'description', 'scopes_searched']; **batching_policy**: daily digest; **priority**: normal

### Can it be undone

Yes.

### Concurrency behaviour

Rating takes the outcome row and reads rate rules from a consistent snapshot. A rate rule activating mid-run does not change outcomes already rated in that run; the run records the instant it rated against, so a re-run is reproducible.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | no rate rule resolves for this counterparty, contract, item and period | *(silent)* | False | the outcome moves to UNRATABLE, which is a queue somebody works. It is never rated at zero and never at a neighbouring rate, both of which are inventing a price |
| `E_CONFLICT_UNIQUE` | 409 | two rate rules apply at the same precedence | *(silent)* | False | moves to unratable with both rules named. Choosing arbitrarily between two prices is the one thing a billing system must never do |
| `E_AUTHZ_FIELD` | 200 | a manual amount supplied without view_financial | *(silent)* | False | refused outright rather than dropped, because a manual amount IS the financial decision |
| `E_VALIDATION` | 422 | a manual amount with no reason | Say why this amount was set by hand. | False | manual amounts are separately reported, because they bypass every rate rule the tenant configured |
| `E_DEPENDENCY` | 424 | the tax_treatment port is unavailable | *(silent)* | True | the outcome rates and tax_classification is carried without a computed rate. Tax is computed at issue rather than at rating, so this does not block |

## 3. Edge cases

**EC-01.** An outcome arriving with a classification hint from its source - a backfill marked absorbed_by_tenant. The hint is honoured where a rate rule matches on it and never overrides an explicit rule. The hint is a source's opinion about chargeability and the rate rules are the tenant's decision, and where they disagree the tenant's decision wins and the disagreement is recorded.

**EC-02.** Re-rating an outcome after a rate correction. Permitted while the outcome is not yet invoiced, and both ratings are retained. Once invoiced, the correction is a credit note and a new invoice, never a re-rate.

**EC-03.** An outcome whose evidence strength is below what the contract requires. Rated normally and flagged on the line, so that the invoice can be issued and the weakness is visible to whoever will defend it. Refusing to rate would leave revenue in a queue over a data-quality question that finance may reasonably accept.

**EC-04.** Rating a period-based outcome that spans a rate change. The rule effective at the outcome's occurred_at governs, not the rule effective when rating runs. Otherwise a delayed rating run silently applies new prices to old work.

**EC-05.** A pass-through outcome, where the tenant is recharging a cost. Rated from the recorded cost plus any configured margin, and the underlying cost reference is carried so the counterparty can be shown it. A pass-through with no traceable cost is exactly what a counterparty refuses to pay.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/billing/billable_outcome/rate_outcome.md`.
