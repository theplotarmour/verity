# Events And Workflows

Verity modules need to communicate without tight coupling.

The target platform has shared event and workflow primitives. Modules publish domain events and subscribe through declared contracts rather than importing each other's internals.

## Event Principles

- Events are tenant-scoped.
- Events include module owner and schema version.
- Event payloads do not expose another tenant's identifiers or data.
- Subscribers must declare the events they consume.
- Cross-module automation should use events, not direct component/action imports.

## Workflow Principles

Workflows are configurable state machines, not hardcoded vertical conditionals.

Examples:

- task approval,
- inspection lifecycle,
- service work order lifecycle,
- kitchen ticket lifecycle,
- production job lifecycle,
- invoice approval.

## Current State

Current workflows are mostly module-specific. Production stages, QC status, dining order states, billing states, and service work-order states are implemented separately.

This is acceptable during migration, but new workflow features should move toward shared primitives.
