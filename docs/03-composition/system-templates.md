# System Templates

System templates are reusable starting configurations for common business systems.

They are not currently implemented as a full persisted feature. This document defines the target.

## Template Contents

A system template can define:

- modules,
- packs,
- dependency expectations,
- default roles,
- default permission grants,
- field schemas,
- workflow states,
- dashboard widget layout,
- navigation labels,
- module settings,
- starter records/templates,
- branding defaults,
- acceptance checks.

## Example

```text
Restaurant Operations System
  Modules
    core
    team
    customers
    menu
    tables_orders
    kitchen
    serving
    billing
  Roles
    Owner
    Manager
    Chef
    Server
    Cashier
  Dashboard
    open tables
    active tickets
    today's sales
    unavailable items
```

## Rule

System templates configure modules. They do not contain duplicate implementations of module behavior.
