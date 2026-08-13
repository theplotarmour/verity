# Modules, Packs, And Systems

Verity composes business software in layers.

```text
Module
  Pack
    System Template
      Client Configuration
        Client Workspace
```

## Module

A reusable capability with code, data ownership, permissions, navigation, routes, configuration, workflows, and tests.

Examples:

- Team
- Inventory
- Helpdesk
- Menu
- Kitchen
- Assets
- Inspections

## Pack

A curated commercial bundle of modules.

Examples:

- Workforce Pack
- Restaurant Operations Pack
- Facility Management Pack
- Retail Franchise Pack

A pack contains no business logic. It is a list of module keys, pricing rules, and presentation metadata.

## System Template

A reusable configuration pattern.

Example:

```text
Restaurant Operations System
  Team
  Customers
  Menu
  Tables and Orders
  Billing
  Kitchen
  Serving
```

System templates may include:

- module list,
- default roles,
- default permissions,
- workflow defaults,
- field configuration,
- dashboard layout,
- terminology,
- seed templates.

## Client Configuration

A client's system is a template plus configuration.

Kent's is not a product fork. It is a configured restaurant system using reusable modules, plus any documented client-specific configuration or extensions.

## Composition Rule

If a requirement can be expressed by module settings, fields, workflows, roles, dashboard configuration, or a reusable extension, do not create client-specific code.
