---
doc_id: ACT-PROCUREMENT-RECORD_RECEIPT
title: Action — Record what arrived
generated: true
source_model: _model/capabilities/procurement.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Record what arrived

*This document is generated. Edit `_model/capabilities/procurement.yaml`, not this file.*

**Entity:** `goods_receipt` · **Capability:** `procurement`

**Why this exists:** Recorded first and matched second, deliberately. Blocking a receipt because it does not match an order leaves goods on a loading area while somebody hunts for a reference, and what actually happens next is that the goods go onto a shelf unrecorded.


## 1. Specification

### Who can perform it

- employee
- supervisor
- integration_principal

### Preconditions

- a stock location is named
- at least one line with a positive quantity
- the receiver holds create on goods_receipt at a covering scope

### Inputs

- commitment_id
- supplier_party_ref
- stock_location_ref
- supplier_document_ref
- lines
- evidence_refs
- received_at

### What is created

- goods_receipt
- stock movements for accepted quantity
- return obligations for rejected quantity

### What is modified

- commitment line received quantities
- reservation discharge

### What events fire

- goods_receipt.recorded
- stock.received

### Who is notified

- **to**: finance and the requesting principal; **channel**: in_app; **when**: a discrepancy is recorded, or the receipt has no commitment; **template**: receipt_needs_attention; **must_include**: ['supplier', 'document_ref', 'discrepancy_summary']; **priority**: high
- **to**: the requester behind the commitment; **channel**: in_app; **when**: the receipt completes their requested lines; **template**: your_request_arrived

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The receipt writes its stock movements and updates the commitment's received quantities in one transaction, under a lock on the commitment. Two receipts against one commitment serialise, so the received quantity can never exceed the ordered quantity by more than one receipt's worth through a race. Over-receipt beyond tolerance is surfaced rather than refused, because the goods are physically present.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | a line quantity is zero or negative | field-specific | False | a return is a separate action with its own authority |
| `E_PRECONDITION` | 409 | over-receipt exceeds the tolerance and the tenant refuses over-receipt | This action is not available in the current state. | False | names the ordered and received quantities. The default is to PERMIT with the excess flagged, because the goods are on the floor and refusing to record them does not send them back |
| `E_CONFLICT_UNIQUE` | 409 | a receipt with this supplier document reference already exists | This delivery has already been recorded. | False | shows the existing receipt, because the receiver''s next question is who recorded it |
| `E_PRECONDITION` | 409 | the commitment is cancelled or closed | This action is not available in the current state. | False | the receipt is still recorded as an unmatched receipt rather than being refused, because the goods arrived and refusing the record loses them |
| `E_DEPENDENCY` | 424 | the stock sink is bound but unavailable | A required service is unavailable. | True | the receipt is REFUSED rather than committing without stock movements. A receipt recorded without its movements means the goods exist commercially and not physically, and reconstructing which receipts were affected afterwards is impractical |
| `E_AUTHZ_FIELD` | 200 | unit prices supplied without view_financial | *(silent)* | False | dropped. Quantities and conditions are recordable by any receiver |

## 3. Edge cases

**EC-01.** Goods arriving with no purchase order reference, which is common. Recorded with commitment_id null and reported immediately to finance as an unmatched receipt. It is either an unrecorded purchase, a delivery to the wrong place, or somebody's verbal order, and all three need a person today rather than a queue entry.

**EC-02.** Partial delivery. Recorded as received quantity below ordered, and the commitment moves to partially received. The outstanding quantity is always expressed as a count rather than a percentage in every notification, because a percentage makes a shortfall look acceptable.

**EC-03.** Damaged or rejected goods. Recorded on the receipt with a reason and a photograph where evidence capture is bound, and they do NOT create stock. They create a return obligation with a credit expectation, so that rejected goods are neither invisible nor counted as held - the two failure modes of the naive implementation.

**EC-04.** A receipt recorded offline at a location with no signal. Queued with its evidence as one unit. On sync, stock movements apply in occurred_at order alongside any consumption recorded in the same period, so a consumption recorded after the receipt but occurring before it does not produce a spurious negative.

**EC-05.** Over-receipt where the supplier shipped more than ordered. Permitted by default with the excess flagged, because the goods are physically present. Whether to keep or return them is a commercial decision and the flag is what makes it a decision rather than an accident.

**EC-06.** Two people receiving the same delivery at a busy loading point. The supplier document reference collapses them into one receipt. Where no document reference exists, the minute-bucket key catches most of it and the rest surfaces as a duplicate at match time, which is late but visible.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/procurement/goods_receipt/record_receipt.md`.
