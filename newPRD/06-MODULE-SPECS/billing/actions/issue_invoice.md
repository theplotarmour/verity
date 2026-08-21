---
doc_id: ACT-BILLING-ISSUE_INVOICE
title: Action — Issue an invoice
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Issue an invoice

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

**Entity:** `invoice` · **Capability:** `billing`

**Why this exists:** The point at which the document becomes immutable and, where required, must be registered externally to be legally valid. Both properties are the reason this is a distinct act rather than a status change.


## 1. Specification

### Who can perform it

- finance
- system

### Preconditions

- At least one line, every constituent outcome rated.
- The counterparty has the attributes the document requires for its tax treatment.
- The acting session is elevated where the total exceeds the elevation threshold.
- The document series is configured and its sequence is available.

### Inputs

- counterparty_ref
- contract_ref
- period_start
- period_end
- outcome_ids
- series_key
- issue_date
- due_date_override

### What is created

- invoice
- invoice_line rows
- an external registration submission where required

### What is modified

- outcomes marked invoiced

### What events fire

- billing.invoice_issued

### Who is notified

- **to**: finance; **channel**: in_app; **when**: registration is required; **template**: registration_pending; **must_include**: ['document_number', 'deadline']; **priority**: high
- **to**: the counterparty's billing contact; **channel**: their consenting channel; **when**: the document is registered, or registration is not required; **template**: invoice_issued; **must_include**: ['document_number', 'total', 'due_date', 'how_to_dispute']; **cost_class**: utility

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The document number is allocated inside the issuing transaction from a gapless per-series sequence, so a rolled-back issue releases the number. This is the opposite of the work order reference, which is deliberately non-transactional and may gap - because a gap in an invoice series is a question an auditor asks and a gap in an operational reference is not. Outcomes are locked while being attached, so one outcome cannot reach two invoices.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | an outcome is unrated | Some items have no price yet. | False | names them, because the fix is in the rating queue |
| `E_PRECONDITION` | 409 | the counterparty lacks an attribute the tax treatment requires | This action is not available in the current state. | False | names the missing attribute. Discovered at issue rather than at party creation is late and is better than discovering it at registration, which is later still |
| `E_CONFLICT_UNIQUE` | 409 | an outcome is already on another invoice | *(silent)* | False | the constraint that stops double billing; the offending outcomes are named |
| `E_AUTHN` | 401 | total exceeds the elevation threshold and the session is not elevated | Confirm your identity to continue. | False |  |
| `E_DEPENDENCY` | 424 | the external registry is unavailable | *(silent)* | True | the invoice IS issued and moves to issued-unregistered with its deadline recorded and the registration queued. Refusing to issue because a government portal is down would stop billing entirely for the duration of somebody else's outage |
| `E_QUOTA` | 402 | more than max_lines_per_invoice | Plan limit reached. | False | the correct action is to split the period or summarise, and the message offers both |

## 3. Edge cases

**EC-01.** Issuing while the external registry is unavailable. The document exists, is not tax-valid, says so on its face, and is not sent to the counterparty until it is registered or until finance explicitly chooses to send a not-tax-valid document. The distinction between having the document and being able to use it is the whole reason registration is modelled as a separate state.

**EC-02.** The registration deadline passing without success. The document is permanently not-tax-valid. It is escalated as a revenue loss rather than an administrative problem, because a document that can never be registered may never be collectable as a tax invoice and the underlying work may need re-invoicing under a new date, which is a decision with tax consequences that this capability records and does not take.

**EC-03.** Summarising many outcomes into one line. Supported, with outcome_count and full expandability retained. A counterparty who cannot drill into a summarised line disputes the whole line, so summarisation without expandability is a false economy.

**EC-04.** Issuing a zero-total invoice - every line credited or comped. Permitted, because a zero document is frequently required as a record of service under a contract. It still consumes a document number and still registers where required.

**EC-05.** Issuing against a counterparty whose credit limit is exceeded. Permitted and flagged to finance. Blocking the invoice does not reduce the exposure; the work has already been done and not invoicing it makes the exposure invisible.

**EC-06.** Two billing runs issuing for the same period concurrently. The idempotency key collapses them. Where the outcome sets differ - one run started earlier and saw fewer outcomes - the second run fails on the already-invoiced outcomes and reports which, rather than issuing a second partial invoice.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/billing/invoice/issue_invoice.md`.
