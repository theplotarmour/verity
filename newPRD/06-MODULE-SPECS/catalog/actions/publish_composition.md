---
doc_id: ACT-CATALOG-PUBLISH_COMPOSITION
title: Action — Publish what something is made of
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Publish what something is made of

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

**Entity:** `composition` · **Capability:** `catalog`

## 1. Specification

### Who can perform it

- ops_manager
- tenant_admin

### Preconditions

- no cycle at any depth
- depth within the bound
- every component resolves
- every quantity positive
- output quantity positive

### Inputs

- parent_item_id
- components
- output_quantity
- output_unit_of_measure
- effective_from
- notes

### What is created

- composition

### What is modified

- previous version superseded
- parent item derived cost recomputed

### What events fire

- composition.published
- catalog_item.cost_changed

### Who is notified

- **to**: finance and ops_manager; **channel**: in_app; **when**: the derived cost moves by more than cost_drift_alert_percent; **template**: cost_moved; **must_include**: ['item', 'previous_cost', 'new_cost', 'percent_change']; **batching_policy**: daily digest

### Can it be undone

Yes.

### Concurrency behaviour

Cycle detection runs against a snapshot inside the transaction and takes a shared lock on every component item, so two compositions published concurrently cannot together create a cycle that neither creates alone. This is the specific race that makes publication-time cycle detection worth doing properly rather than relying on a runtime depth limit.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | a cycle exists at any depth | This would make the item contain itself. | False | names the full path |
| `E_PRECONDITION` | 409 | depth exceeds the bound | This action is not available in the current state. | False | names the depth and the path |
| `E_VALIDATION` | 422 | a component quantity is zero or negative | field-specific | False |  |
| `E_VALIDATION` | 422 | a component unit of measure differs from the component item's own unit with no conversion available | Choose a unit this component is measured in. | False | refused rather than converted by assumption. An assumed conversion between mass and volume is the classic silent factor-of-a-thousand error |
| `E_PRECONDITION` | 409 | a component item is archived | This action is not available in the current state. | False | names the component |

## 3. Edge cases

**EC-01.** A composition whose components have their own compositions. Depth resolves through them and the resolved depth is recorded. Nesting is expressed by components having compositions rather than by nesting inside one document, which keeps each composition individually readable and diffable.

**EC-02.** A yield_percent below one hundred, expressing loss in production. Supported, and it changes the derived cost. Without it the derived cost of anything with waste is systematically understated, which shows up as a margin that looks better than it is.

**EC-03.** Publishing a composition for an item that is already active and being sold. Permitted; the new version takes effect for transactions from effective_from, and everything already sold keeps its captured version. This is the whole reason compositions are versioned.

**EC-04.** A component that is itself unavailable at publication. Permitted with a warning, because a temporarily unavailable component should not block a recipe change. The parent item's availability derivation is what surfaces the consequence, and it does so continuously.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/catalog/composition/publish_composition.md`.
