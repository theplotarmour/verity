# Restaurant Modules

Status: partial.

Restaurant capabilities should be separate modules, not a single hardcoded restaurant app.

## Modules

| Module | Purpose |
| --- | --- |
| `menu` | Categories, menu items, price, availability, dietary markers, photos |
| `tables_orders` | Tables, running orders, KOT/order lifecycle |
| `kitchen` | Kitchen queue, fire/bump timing, preparation state |
| `serving` | Pass/floor handoff, ready items, served state |
| `billing` | Bills and payment state where used for dining/service billing |

## Composition Example

Kent's Restaurant System:

```text
core
team
customers
menu
tables_orders
kitchen
serving
billing
```

## Rules

- Restaurant logic must not be keyed on tenant name.
- Kitchen and serving depend on order state, not on pack name.
- Menu can exist without kitchen.
- Table orders require menu.
- Billing may be service/dining-specific but must remain behind module entitlement.

## Current Gaps

Track exact current gaps in PRDs and roadmap. Do not claim a complete restaurant product until pages, actions, route guards, permissions, seeds, and tenant isolation tests pass.
