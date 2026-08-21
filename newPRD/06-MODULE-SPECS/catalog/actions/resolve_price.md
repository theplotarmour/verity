---
doc_id: ACT-CATALOG-RESOLVE_PRICE
title: Action — Work out what something costs
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Work out what something costs

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

**Entity:** `price_rule` · **Capability:** `catalog`

**Why this exists:** The single most frequently disputed computation in any commercial system. Modelled as an explicit action so that precedence, ties, provenance and the tax-inclusive question are contractual rather than incidental.


## 1. Specification

### Who can perform it

- any_authenticated
- integration_principal
- system
- consumer

### Preconditions

- the item is active or unavailable-but-referenced-by-an-existing-line
- a currency is determinable

### Inputs

- item_id
- selected_option_ids
- quantity
- location_ref
- party_ref
- contract_ref
- channel
- at_instant

### What is created

None.

### What is modified

None.

### What events fire

None.

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Resolution reads a consistent snapshot of rules effective at at_instant. A rule activating mid-transaction does not change a price already captured on a line, because a line captures its resolved price and its rule provenance at the moment it is created. This is what makes a price stable while somebody is completing an order.


### Audit class

read_sensitive_only

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | no applicable price rule for this item, scope and instant | *(silent)* | False | returns UNPRICED rather than zero. Zero is a price and it is the wrong one; a caller that receives zero will sell something for nothing, whereas one that receives unpriced must decide what to do |
| `E_CONFLICT_UNIQUE` | 409 | two applicable rules at the same precedence | *(silent)* | False | returns AMBIGUOUS with both rules named, and does not choose. This condition is prevented at save time and is caught again here because a rule can become ambiguous through a scope change elsewhere |
| `E_VALIDATION` | 422 | quantity falls in a gap between quantity-break rules | *(silent)* | False | returns UNPRICED naming the gap, so the fix is to the ladder rather than to the order |
| `E_DEPENDENCY` | 424 | the tax_treatment port is bound but unavailable | *(silent)* | True | the net price resolves and the tax component is returned as unknown rather than as zero. A tax of zero and a tax that could not be computed must never render identically |
| `E_VALIDATION` | 422 | selected options violate their group selection rule | field-specific | False | validated here as well as at order time, because a client that computes a price for an invalid selection will show it to somebody |

## 3. Edge cases

**EC-01.** A percent_of_list rule where no list price exists. Returns unpriced, not zero. A discount off nothing is nothing, and returning it as a price is how an item gets given away.

**EC-02.** Tax-inclusive and tax-exclusive rules both applicable at different precedences. The winning rule's own tax_inclusive flag governs and the response states which. Mixing the two silently across a single order is a systematic error that reconciles to nothing.

**EC-03.** Resolution at an instant in the past, for re-pricing a historical line during a dispute. Fully supported and is the reason rules are versioned and retained rather than edited. The answer must be identical to what was captured at the time, and any difference is itself a finding.

**EC-04.** A composite item priced from its composition rather than from a rule. Supported where the tenant configures derived pricing, and the derived price carries the composition version as its provenance. Where a rule also applies, the rule wins - an explicitly set price always beats a derived one, because somebody chose it.

**EC-05.** Resolution offline, on a cached rule set. Permitted, and the response is marked as resolved from a cache with its age. Any transaction completed on a cached price is re-resolved on sync, and a difference is surfaced as a conflict rather than silently accepted or silently overwritten - the person who quoted the price to a customer needs to know.

## 6. Offline behaviour

Read-only action. Served from cache when offline; the surface must show cache age.

## 7. Test coverage

See `20-TESTING/catalog/price_rule/resolve_price.md`.
