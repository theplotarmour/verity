# ADR-001: Verity Is A Module Platform

## Decision

Verity is a module-composition platform, not a fixed SaaS application with modules.

## Consequences

- Admins enable capabilities per tenant.
- Client portal is dynamic.
- Navigation and dashboard are resolved from enabled modules and permissions.
- Packs are compositions, not code forks.
- Client implementations configure Verity instead of redefining architecture.
