---
doc_id: ACT-LEASE_MANAGEMENT-APPLY_ESCALATION
title: Action — Apply an escalation
generated: true
source_model: _model/capabilities/lease_management.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Apply an escalation

*This document is generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

**Entity:** `escalation_rule` · **Capability:** `lease_management`

**Why this exists:** The mechanism by which rent changes without anybody remembering to change it. Modelled explicitly because its failure mode - not being applied - is invisible, and because an index that is unpublished must produce a hold rather than an estimate.


## 1. Specification

### Who can perform it

- system
- finance

### Preconditions

- the rule is due or held
- the method's inputs are available
- the lease is active
- in_notice or holding_over

### Inputs

- escalation_rule_id
- index_value_override
- override_source
- reason

### What is created

- balancing charge rows where the escalation is applied retrospectively

### What is modified

- future schedule rows regenerated
- last_applied_on
- next_due_on

### What events fire

- lease.escalation_applied

### Who is notified

- **to**: the counterparty; **channel**: their consenting channel; **when**: always; **template**: charge_changing; **must_include**: ['effective_date', 'old_amount', 'new_amount', 'how_it_was_calculated']; **cost_class**: utility; **mandatory_operational**: True
- **to**: finance and the relationship owner; **channel**: in_app; **when**: always; **template**: escalation_applied

### Can it be undone

Yes.

### Concurrency behaviour

Schedule regeneration takes the lease exclusively and rewrites only unraised rows, superseding raised ones explicitly where the effective date is in the past. Two concurrent applications collapse via the idempotency key, which matters because compounding an escalation twice is both wrong and difficult to unwind once invoiced.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the reference index value is not published | *(silent)* | False | the rule is HELD rather than estimated. Applying an estimate and correcting it later produces a charge, a credit and a conversation for every affected period |
| `E_PRECONDITION` | 409 | requires_agreement is true and no agreed amount is recorded | This action is not available in the current state. | False | a reviewed amount is a negotiated fact and the model never imposes one |
| `E_VALIDATION` | 422 | the computed increase falls outside the floor and cap | *(silent)* | False | clamped to the boundary and the clamping is recorded in the basis note, because a counterparty checking the arithmetic must be able to see why the number is not what the index alone would give |
| `E_AUTHZ_FIELD` | 200 | a manual index value supplied without view_financial | *(silent)* | False | refused. A manually entered index value sits at the base of every subsequent charge |
| `E_VALIDATION` | 422 | a manual index value with no source recorded | Say where this figure came from. | False | it is the input to every future charge and its provenance is what makes a dispute answerable |
| `E_DEPENDENCY` | 424 | the index source is unavailable | *(silent)* | True | held and retried, with the accrued difference reported so the cost of the delay is visible |

## 3. Edge cases

**EC-01.** An index value published and later revised. The escalation already applied is not recomputed automatically; the revision is reported to finance with the difference, and correcting it is a decision. Silently recomputing would change charges a counterparty has already paid.

**EC-02.** An escalation held for months and then applied from its original effective date. The difference for periods already charged is raised as a balancing charge rather than written off, and the counterparty receives the calculation for every affected period. Writing it off silently is a revenue decision nobody made.

**EC-03.** A stepped schedule where a step is missed because the rule was suspended. The next application applies the correct step for the current date rather than working through the missed ones, and the difference for the missed period is raised as a balancing charge with its own basis note. Applying steps in sequence after a gap would charge the wrong amount for the current period.

**EC-04.** An escalation whose effective date falls inside a rent-free period. The escalation applies to the underlying amount and the period remains rent-free, so the post-concession charge is correct. Applying it after the concession ends instead would understate every subsequent period.

**EC-05.** An escalation on a lease in holding over where the agreement is silent on the holding-over basis. Held, not applied, and reported. Escalating an amount that is itself an assumption compounds the assumption.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/lease_management/escalation_rule/apply_escalation.md`.
