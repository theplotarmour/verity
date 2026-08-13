# ADR-002: Modules Own Capability Contracts

## Decision

Each module owns its manifest, permissions, navigation, routes, services, data, settings, workflows, events, dashboard widgets, and tests.

## Consequences

- Adding a module must not require shell edits.
- Optional module pages and actions require server-side guards.
- Modules can use other modules only through declared dependencies.
- Disable hides and blocks capability but retains data.
