---
doc_id: ACT-LEASE_MANAGEMENT-RECONCILE_RECOVERABLE_CHARGES
title: Action — Reconcile estimated recoverable charges against actual cost
generated: true
source_model: _model/capabilities/lease_management.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Reconcile estimated recoverable charges against actual cost

*This document is generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

**Entity:** `charge_schedule` · **Capability:** `lease_management`

**Why this exists:** Recoverable charges are estimated in advance and settled in arrears against real cost. The reconciliation is where most of the disputes in this domain originate, and almost all of them come down to a counterparty being unable to check the apportionment.


## 1. Specification

### Who can perform it

- finance
- ops_manager

### Preconditions

- the reconciliation period has ended
- actual costs for the period are available
- an apportionment basis is recorded

### Inputs

- lease_id
- period
- actual_cost_lines
- apportionment_basis
- exclusions
- reason

### What is created

- a balancing charge or credit row per lease

### What is modified

- the estimate rows for the period marked reconciled

### What events fire

- lease.recoverables_reconciled

### Who is notified

- **to**: the counterparty; **channel**: their consenting channel; **when**: always; **template**: recoverables_reconciled; **must_include**: ['period', 'estimated_total', 'actual_total', 'apportionment_basis', 'their_share', 'balance_owed_or_credited', 'cost_breakdown']; **cost_class**: utility; **mandatory_operational**: True
- **to**: finance and tenant_owner; **channel**: in_app; **when**: the balancing amount exceeds the alert threshold in either direction; **template**: large_reconciliation_balance

### Can it be undone

Yes.

### Concurrency behaviour

Reconciliation across every lease sharing a cost pool runs as one operation under a lock on the pool, so the apportioned shares always sum to the reconcilable total. Reconciling leases individually is how the shares add up to more or less than the cost, which is the first thing a counterparty's adviser checks.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | no apportionment basis recorded | Say how the cost is divided. | False | never defaulted to area. The basis is the single most disputed element of a recoverable charge and an assumed one is indefensible |
| `E_VALIDATION` | 422 | the apportioned shares do not sum to the reconcilable total | field-specific | False | refused. Shares that do not sum are the first thing an adviser checks and the fastest way to lose the argument |
| `E_PRECONDITION` | 409 | a cost line has no supporting evidence where the agreement requires it | This action is not available in the current state. | False | names the lines. A recoverable cost a counterparty cannot inspect is one they will refuse |
| `E_AUTHZ_FIELD` | 200 | cost lines supplied without view_financial | *(silent)* | False | refused |
| `E_PRECONDITION` | 409 | the period is outside the agreement's reconciliation deadline | *(silent)* | False | permitted with an explicit acknowledgement, because a late reconciliation may be unrecoverable under the agreement and that is a commercial decision rather than a validation failure |

## 3. Edge cases

**EC-01.** A lease that started or ended mid-period. Its share is apportioned by occupation time as well as by the apportionment basis, and both apportionments are shown in the breakdown. Showing only the final figure guarantees a query.

**EC-02.** A cost the agreement excludes. Excluded explicitly with the exclusion recorded and shown in the breakdown as excluded rather than omitted. An omitted cost looks like an oversight and invites a request for the full ledger.

**EC-03.** A reconciliation producing a credit rather than a charge. Handled identically and issued as a credit through billing. Deferring a credit while charges are issued promptly is noticed, and it is noticed by exactly the counterparties who read their statements.

**EC-04.** A cost pool shared with spaces that are vacant. The vacant share is borne by the tenant of Verity rather than redistributed to occupiers, unless the agreement provides otherwise, and which of the two applied is stated in the breakdown. Silently redistributing a vacancy cost is one of the most common grounds for a successful challenge.

**EC-05.** Reconciliation where the estimate was never charged because the schedule stalled. The reconciliation reveals it, and the missing estimate periods are raised alongside the balancing charge with their own basis notes rather than being folded into one unexplained figure.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/lease_management/charge_schedule/reconcile_recoverable_charges.md`.
