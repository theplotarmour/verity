---
doc_id: ACT-LEASE_MANAGEMENT-AGREE_LEASE
title: Action — Agree a lease
generated: true
source_model: _model/capabilities/lease_management.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Agree a lease

*This document is generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

**Entity:** `lease` · **Capability:** `lease_management`

## 1. Specification

### Who can perform it

- finance
- ops_manager
- tenant_owner

### Preconditions

- Terms are complete including the area basis where any charge is per unit of area.
- No active lease overlaps the same space over the same dates.
- The acting session is elevated.
- A renewal option of automatic_unless_notice carries both window dates and a notice period.

### Inputs

- counterparty_ref
- space_refs
- term
- base_amount
- frequency
- payment_in_advance
- deposit
- escalations
- rent_free_periods
- renewal_option
- document_ref

### What is created

- lease
- charge_schedule rows for the whole term
- escalation_rule rows
- deposit

### What is modified

None.

### What events fire

- lease.agreed

### Who is notified

- **to**: the counterparty; **channel**: their consenting channel; **when**: a customer surface is bound; **template**: lease_agreed; **must_include**: ['term', 'first_due_date', 'deposit_required']; **cost_class**: utility
- **to**: finance and the relationship owner; **channel**: in_app; **when**: always; **template**: lease_agreed_internal; **must_include**: ['renewal_window_dates', 'first_escalation_date']

### Can it be undone

Yes.

### Concurrency behaviour

Overlap detection takes a lock over the candidate spaces for the date range inside the transaction, so two leases for one space cannot both commit. Schedule generation happens in the same transaction as the lease, because a lease with no schedule charges nothing and is indistinguishable from one that is working.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_UNIQUE` | 409 | a space is already let over overlapping dates | This space is already let for part of that period. | False | names the other lease and the overlapping dates. Double-letting is discovered by two counterparties arriving at the same place |
| `E_VALIDATION` | 422 | a per-area charge with no area basis stated | Say which measurement the rent is based on. | False | never defaulted. Different bases give materially different numbers for the same space |
| `E_VALIDATION` | 422 | automatic renewal with no window or notice period | field-specific | False | an automatic renewal with no window is a commitment nobody can escape |
| `E_AUTHZ_FIELD` | 200 | financial terms supplied without view_financial | *(silent)* | False | refused rather than dropped, because the financial terms ARE the lease |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_DEPENDENCY` | 424 | the space provider is unavailable | A required service is unavailable. | True | refused. Agreeing a lease without being able to check for an overlap is how a space is let twice |
| `E_QUOTA` | 402 | the term would generate more than max_schedule_rows | Plan limit reached. | False | a very long term at a short frequency; the correct action is to generate the schedule in horizons rather than raising the limit, and the message says so |

## 3. Edge cases

**EC-01.** A lease over several spaces with different area bases. Each space carries its own measurement and the lease records which basis the rent is calculated on. Averaging them would produce a rate neither party recognises.

**EC-02.** Rent-free periods at the start of a term. Schedule rows are generated for those periods with amount zero and rent_free true, rather than being omitted. An omitted period is indistinguishable from a scheduler failure, and the counterparty's own statement should show the concession rather than a gap.

**EC-03.** A lease agreed after occupation has already begun, which is common. Permitted, and the schedule is generated from starts_on, so early periods raise immediately on activation. The gap between starts_on and the agreement date is retained and visible, because it is frequently the subject of a later question.

**EC-04.** A term long enough that generating the whole schedule is impractical. Generated in horizons with the horizon recorded, and the same materialisation-lag monitor applies as in scheduling - a schedule that has silently stopped generating is rent that is silently not charged.

**EC-05.** An open market review scheduled during the term. The escalation rule is created with requires_agreement true and nothing is computed. The obligation to negotiate is raised when it falls due, and until it is agreed the charges continue at the old amount with the accrued difference visible.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/lease_management/lease/agree_lease.md`.
