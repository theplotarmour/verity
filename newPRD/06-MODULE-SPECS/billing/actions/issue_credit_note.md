---
doc_id: ACT-BILLING-ISSUE_CREDIT_NOTE
title: Action — Credit an invoice
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Credit an invoice

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

**Entity:** `invoice` · **Capability:** `billing`

**Why this exists:** The only way to correct an issued invoice. Modelled as issuing a separate document rather than as an adjustment, because every accounting and tax regime works that way and because the counterparty is holding a copy of the original.


## 1. Specification

### Who can perform it

- finance
- tenant_owner

### Preconditions

- The original invoice is issued or later.
- The credit amount does not exceed the uncredited balance of the referenced lines.
- Acting session is elevated.
- A reason is supplied.

### Inputs

- invoice_id
- line_credits
- reason
- credit_reason_category

### What is created

- a credit_note document with its lines
- an external registration submission where required

### What is modified

- original invoice lines marked credited
- outcomes marked credited
- invoice balances

### What events fire

- billing.credit_note_issued

### Who is notified

- **to**: the counterparty's billing contact; **channel**: their consenting channel; **when**: always; **template**: credit_note_issued; **must_include**: ['credit_document_number', 'original_document_number', 'amount', 'reason_category']; **cost_class**: utility; **mandatory_operational**: True
- **to**: tenant_owner; **channel**: in_app; **when**: the credit exceeds the notification threshold, or the acting principal's credit rate exceeds the alert; **template**: credit_issued

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The original invoice and its lines are locked while credited amounts are asserted, so two concurrent credits cannot together exceed the original. The credit note's own document number comes from the credit series sequence, which is separate from the invoice series, because mixing them makes both series unreadable.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | the credit exceeds the uncredited balance of the referenced lines | field-specific | False |  |
| `E_VALIDATION` | 422 | no reason category | Choose why this is being credited. | False | from a closed list, because the aggregate of credits by reason is one of the most useful quality signals the platform produces and free text destroys it |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_PRECONDITION` | 409 | the original is a credit note | This action is not available in the current state. | False | crediting a credit note is a new invoice, and the message says so |
| `E_DEPENDENCY` | 424 | the external registry is unavailable | *(silent)* | True | the credit note IS issued and registration is queued with its own deadline, exactly as for an invoice. A counterparty owed a credit must not wait on a government portal |

## 3. Edge cases

**EC-01.** Crediting an invoice that has already been paid in full. Produces a credit balance on the counterparty account, which is then either refunded or allocated against future invoices. Both are explicit acts, because automatically refunding a credit is moving money without an instruction.

**EC-02.** Crediting because work was never actually done - an unevidenced line a counterparty rejected. The reason category records it, and the aggregate by category is what tells the tenant whether their evidence capture is failing. This is the most valuable output of the reason list and it is the reason the list is closed rather than free text.

**EC-03.** A credit note that itself needs registration and fails. Same treatment as an invoice, and the counterparty is told the credit exists and is pending registration, because a credit they cannot see is a credit they will telephone about.

**EC-04.** Crediting a line whose underlying outcome has already been re-invoiced on a later document. Refused, because the outcome can belong to only one invoice line, and the state that produced this is a data error worth surfacing rather than working around.

**EC-05.** A goodwill credit with no dispute behind it. Fully supported with its own reason category, and separately reported. Goodwill credits are a legitimate commercial tool and are also the easiest way to reduce a customer's balance without anybody noticing, which is why the rate by principal is monitored.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/billing/invoice/issue_credit_note.md`.
