# ADR-003: Entitlements Are Organization-Scoped

## Decision

Module entitlements are scoped to the organization/commercial tenant, while many current operational records remain scoped by `factoryId` until the schema migration evolves.

## Consequences

- Module enablement is managed once per organization.
- Resource access still scopes records to the session workspace/location.
- Code must derive both organization and workspace context from authenticated session state.
- The name `Factory` is legacy and must not drive product assumptions.
