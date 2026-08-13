# Kent's Module Map

Kent's should be represented as a configured restaurant system, not a forked application.

## Candidate Modules

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

## Configuration Areas

- table layout,
- menu categories,
- menu item availability,
- kitchen stations,
- role permissions,
- billing/payment behavior,
- dashboard widgets,
- terminology.

## Rule

No code should check for Kent's tenant id, name, slug, or organization id. Kent's-specific behavior must be represented as module configuration or a documented exception.
