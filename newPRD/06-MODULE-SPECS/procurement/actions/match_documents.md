---
doc_id: ACT-PROCUREMENT-MATCH_DOCUMENTS
title: Action — Match order, receipt and invoice
generated: true
source_model: _model/capabilities/procurement.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Match order, receipt and invoice

*This document is generated. Edit `_model/capabilities/procurement.yaml`, not this file.*

**Entity:** `supplier_invoice` · **Capability:** `procurement`

**Why this exists:** The control this capability exists for. An operation that receives goods without matching them pays for things it did not get; one that matches with no tolerance stops paying anybody. The tolerance is configuration with a shipped default, and every variance outside it needs a person.


## 1. Specification

### Who can perform it

- finance
- ops_manager
- system

### Preconditions

- the invoice exists
- a commitment is identified
- at least one receipt exists against that commitment

### Inputs

- invoice_id
- commitment_id
- receipt_ids
- line_mapping

### What is created

None.

### What is modified

- invoice state
- match variance
- receipt state

### What events fire

- procurement.matched
- procurement.variance_detected

### Who is notified

- **to**: finance and the requesting location; **channel**: in_app; **when**: any line exceeds tolerance; **template**: match_variance; **must_include**: ['line', 'ordered', 'received', 'invoiced', 'variance_value']; **priority**: high
- **to**: finance; **channel**: in_app; **when**: the invoice references a closed commitment; **template**: invoice_against_closed_commitment; **priority**: high; **note**: this is either a duplicate or a late claim and must never match automatically

### Can it be undone

Yes.

### Concurrency behaviour

Matching locks the invoice and takes shared locks on the receipts, so one receipt cannot be consumed by two invoices concurrently - which is exactly how a duplicate invoice gets paid. Quantities already matched are tracked per receipt line rather than per receipt, because partial invoicing across several receipts is ordinary.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | no receipt exists against the commitment | Nothing has been recorded as received against this order. | False | the message names the action that unblocks it, because a stalled match is almost always an unrecorded receipt rather than a genuine dispute |
| `E_CONFLICT_UNIQUE` | 409 | a receipt line is already fully matched to another invoice | That delivery has already been invoiced. | False | names the other invoice. This is the duplicate-payment control and it is a constraint rather than a report |
| `E_VALIDATION` | 422 | quantity or price variance exceeds tolerance | *(silent)* | False | not an error - the invoice moves to variance_hold, which is a state a person works, rather than failing a job that nobody sees |
| `E_PRECONDITION` | 409 | the commitment is closed | This action is not available in the current state. | False | requires an explicit reopen with a reason, because an invoice arriving against a closed order is a duplicate more often than it is a late claim |
| `E_CONFLICT_UNIQUE` | 409 | this supplier invoice number already exists for this supplier | This invoice number has already been recorded. | False | the single control that catches most duplicate invoices, enforced at record time and re-checked here |

## 3. Edge cases

**EC-01.** One invoice covering several receipts, and one receipt covering several invoices. Both are ordinary and both are supported by tracking matched quantity per receipt line. A model that matches whole documents fails on the first partial delivery.

**EC-02.** A price variance within tolerance but consistently in the supplier's favour. Matched, and reported as a pattern to finance monthly. A systematic small overcharge is invisible per invoice and material per quarter, and the tolerance is precisely what conceals it.

**EC-03.** An invoice for goods never received because the delivery went to another location. The match fails, and the unmatched-receipt report at the other location is what resolves it. The two reports are deliberately cross-referenced by supplier and date, because otherwise both sides wait.

**EC-04.** Matching where the commitment used free-text lines and the invoice uses the supplier's own descriptions. No automatic matching by description is attempted; the line mapping is supplied by a person. Fuzzy description matching is exactly the kind of helpfulness that pays a supplier for something else.

**EC-05.** Tax variance where the supplier applied a different treatment from the one expected. Held as a variance with the tax difference reported separately from the price difference, because the two have different resolutions - one is a negotiation and the other is a question for an accountant.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/procurement/supplier_invoice/match_documents.md`.
