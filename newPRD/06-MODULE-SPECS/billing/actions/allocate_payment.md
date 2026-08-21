---
doc_id: ACT-BILLING-ALLOCATE_PAYMENT
title: Action — Allocate a payment
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Allocate a payment

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

**Entity:** `payment_receipt` · **Capability:** `billing`

**Why this exists:** Explicit rather than automatic, deliberately. Automatically applying a receipt to the oldest invoice produces an aged debt report nobody believes and turns a disputed invoice into an apparently unpaid one.


## 1. Specification

### Who can perform it

- finance
- system

### Preconditions

- the receipt has an unallocated balance
- the target invoices belong to the same counterparty or the allocation is explicitly cross-party with a reason

### Inputs

- receipt_id
- allocations
- reason

### What is created

- allocation records

### What is modified

- receipt allocated amount
- invoice balances and states

### What events fire

- billing.payment_allocated

### Who is notified

- **to**: the counterparty's billing contact; **channel**: their consenting channel; **when**: the tenant sends payment confirmations; **template**: payment_received; **must_include**: ['amount', 'invoices_allocated', 'remaining_balance']; **cost_class**: utility
- **to**: finance; **channel**: in_app; **when**: the receipt remains partly unallocated; **template**: unallocated_remainder

### Can it be undone

Yes.

### Concurrency behaviour

Allocation locks the receipt and every target invoice in a canonical id order, and asserts inside the transaction that allocated plus written-off never exceeds the total on any invoice. Two concurrent allocations of one receipt cannot together over-allocate it, and two receipts cannot together over-pay one invoice.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | allocations exceed the receipt balance | field-specific | False |  |
| `E_VALIDATION` | 422 | an allocation exceeds an invoice's outstanding balance | field-specific | False | the excess should be recorded as a payment on account, which the error offers, rather than as an overpayment on a document |
| `E_PRECONDITION` | 409 | the target invoice belongs to a different counterparty and no reason is supplied | This action is not available in the current state. | False | cross-party allocation is legitimate within a group and is always deliberate, so it requires a reason and is reported |
| `E_PRECONDITION` | 409 | the target line is disputed and the tenant does not permit allocating to disputed amounts | This action is not available in the current state. | False |  |
| `E_AUTHN` | 401 | the allocation reverses a previous one and the session is not elevated | Confirm your identity to continue. | False |  |

## 3. Edge cases

**EC-01.** A receipt with no identifiable counterparty. Recorded and left unallocated, appearing in the unallocated queue with its payer narrative. Guessing the payer from a partial name match is exactly the automation that produces a payment applied to the wrong customer, which is discovered by the customer who did pay.

**EC-02.** {'A short payment because the counterparty is withholding a disputed amount. Allocated to the undisputed lines, leaving the disputed amount outstanding. This is why disputes are line-level': 'an invoice-level dispute would make the whole document look unpaid and start a collection sequence against somebody who has paid what they agree they owe.'}

**EC-03.** A round-sum payment covering several invoices with no remittance advice. Allocated explicitly by a person, and the model deliberately offers candidates rather than choosing. The candidates are ordered by due date and the ordering is a suggestion that is visibly a suggestion.

**EC-04.** An overpayment. Recorded as a payment on account against the counterparty rather than as an overpaid invoice, so that the invoice balance stays truthful and the credit is visible where it will be used.

**EC-05.** Allocation of a receipt that is later reversed by the bank. The reversal unallocates first, restoring invoice balances, and both the allocation and its reversal are retained. The invoice returns to its previous state including its collection position, rather than restarting collection from the beginning against somebody whose payment failed through no fault of their own.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/billing/payment_receipt/allocate_payment.md`.
