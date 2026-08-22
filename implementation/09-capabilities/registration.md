# Capability Registration

## Purpose
This document defines how a newly implemented capability registers itself with the Verity platform ecosystem, enabling dynamic discovery and composition.

## Scope
**In Scope:** Capability manifests, startup registration, dependency declaration.
**Out of Scope:** The underlying mechanics of the Next.js App Router (which handles UI rendering).

## Authority
- Bible V5 (Platform Architecture)

## Prerequisites
- Capability Implementation Contract fulfilled.

## Specification Requirements
- A capability must declare its interfaces and events clearly.

## Approved Architecture
- Capability registry loaded at application startup.

## Implementation Contract
- **Capability Manifest:** Each capability must provide a manifest declaring:
  - Entities it owns
  - Commands it provides
  - Queries it supports
  - Domain events it publishes
  - Required permissions
  - UI navigation contributions
- **Registration at startup:** The platform will iterate through a capability registry on startup.
- **Dependency declaration:** The manifest must declare which other capabilities this one depends on.
- **Platform services:** Must declare services consumed (e.g., Notification) and produced.
- **Event subscriptions:** Declare which domain events this capability listens to.
- **UI navigation items:** Register routing endpoints dynamically to construct menus.

## Constraints & Invariants
- No undeclared direct dependency between capabilities.
- Manifests must be statically analyzable.

## Dependencies
- Next.js server initialization logic.

## Failure Modes
- Unregistered capability remains inaccessible.
- Misdeclared dependencies cause runtime errors when events are fired.

## Testing Requirements
- Registry test to ensure all capabilities in the source tree are successfully registered.

## Conformance Checks
- Validate manifest schema at build time.

## Traceability
- Bible V5

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Exact structure of the capability manifest object (e.g., JSON vs TypeScript constant).
