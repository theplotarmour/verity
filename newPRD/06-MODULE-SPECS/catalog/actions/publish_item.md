---
doc_id: ACT-CATALOG-PUBLISH_ITEM
title: Action — Publish an item
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Publish an item

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

**Entity:** `catalog_item` · **Capability:** `catalog`

## 1. Specification

### Who can perform it

- ops_manager
- finance
- tenant_admin

### Preconditions

- A unit of measure is set.
- A tax classification is set where the item is sellable, or resolvable from its category.
- At least one price rule resolves at the publication instant where the item is sellable.
- Any composition is published and cycle-free.
- Every option group's selection rule is satisfiable by its active options.

### Inputs

- item_id

### What is created

None.

### What is modified

- item state
- search projection
- port publication

### What events fire

- catalog_item.published

### Who is notified

- **to**: ops_manager; **channel**: in_app; **when**: the item was published with a derived rather than an explicit price; **template**: derived_price_in_use; **batching_policy**: daily digest

### Can it be undone

Yes.

### Concurrency behaviour

Publication validates the whole item, its options and its composition inside one transaction against a consistent snapshot, so an item cannot publish against a composition that is being superseded concurrently. Two concurrent publications of the same item collapse via the idempotency key.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | no unit of measure | Choose the unit this is measured in. | False | never defaulted |
| `E_PRECONDITION` | 409 | sellable with no tax classification and no category default | Choose a tax classification. | False | refused rather than defaulted, because a guessed classification produces documents that are wrong in a way an authority notices before the tenant does |
| `E_PRECONDITION` | 409 | no applicable price rule | This has no price yet. | False | names the scopes that were searched, so the fix is obvious rather than requiring somebody to reason about precedence |
| `E_PRECONDITION` | 409 | an option group cannot satisfy its own selection rule | This action is not available in the current state. | False | names the group and what is missing |
| `E_PRECONDITION` | 409 | the composition contains a cycle or exceeds the depth bound | This action is not available in the current state. | False | names the path, because a cycle three levels down is otherwise impossible to find |
| `E_QUOTA` | 402 | catalogue item limit reached | Plan limit reached. | False |  |

## 3. Edge cases

**EC-01.** Publishing an item whose composition references a component that is itself only in draft. Refused, and the draft component is named. Publishing would produce a sellable item that cannot be produced, which is discovered by somebody standing at a counter.

**EC-02.** Publishing during an active price change window, where a scheduled rule takes effect within minutes. Permitted, and the publication response states the upcoming price and its effective time, because publishing at the old price minutes before it changes is a decision somebody should make knowingly.

**EC-03.** Publishing a non-sellable item used only as a component. No price rule and no tax classification is required. This is the common case for raw components and refusing it would force fictional prices onto everything a business consumes.

**EC-04.** Republishing after a version change. The new version publishes and the previous version is superseded rather than archived, so existing transaction lines still resolve to the version they captured.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/catalog/catalog_item/publish_item.md`.
