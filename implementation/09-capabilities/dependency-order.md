# Capability Dependency Order

## Purpose
This document establishes the correct build order for capabilities in the Verity platform, preventing circular dependencies and ensuring foundational entities exist before dependent ones.

## Scope
**In Scope:** Build sequence for Core and Business capabilities.
**Out of Scope:** UI construction order.

## Authority
- Bible V1 (Data Model & Topology)
- Bible V5 (Platform Architecture)
- DEC-005 (HQ-enabled Catalogs)

## Prerequisites
- Empty database schema
- Prisma ORM configured

## Specification Requirements
- Capabilities must be built in a strict dependency sequence.
- No circular dependencies are allowed.

## Approved Architecture
- Strict layering: Core Platform -> Business Domains.
- Dependency mechanism for each: FK reference, platform service, domain event, or composition.

## Implementation Contract

### CORE CAPABILITIES (build order):
1. **Party** (foundation — no deps, INV-003)
2. **User** (depends on Party)
3. **Role** (platform service)
4. **Permission** (depends on Role)
5. **Organization** (depends on Tenant)
6. **Location** (depends on Organization)
7. **Resource** (depends on User, Asset)
8. **Asset** (depends on Location)
9. **Document** (depends on Party)
10. **Contract** (depends on Party, Organization)
11. **Notification** (platform service)
12. **Catalog** (depends on Organization, DEC-005: HQ-enabled)

### BUSINESS CAPABILITIES (build after core):
- **CRM:** depends on Party (Lead/Customer/Contact)
- **Field-Service:** depends on Work, Resource, Location
- **Facilities:** depends on Location, Asset, Work
- **Maintenance:** depends on Asset, Work
- **Projects:** depends on Work (grouping)
- **Finance:** depends on Contract, Work
- **Commerce:** depends on Catalog, Party
- **Inventory:** depends on Location, Asset
- **Procurement:** depends on Party, Catalog
- **Sales:** depends on Party, Catalog, Contract
- **Staffing:** depends on Resource, Organization
- **Security:** depends on Resource, Location
- **Expenses:** depends on Party, Organization
- **Subscriptions:** depends on Contract, Party

## Constraints & Invariants
- No undeclared direct dependency between capabilities.
- A core capability can never depend on a business capability.

## Dependencies
- Database migration system.

## Failure Modes
- Building out of order causes schema generation failures or missing foreign keys.
- Circular dependencies cause unresolvable module loading.

## Testing Requirements
- Unit testing must mock cross-capability dependencies appropriately.
- Integration tests must populate required parent entities (e.g., Party before User).

## Conformance Checks
- Static analysis of Prisma schema to ensure foreign keys follow the correct direction.

## Traceability
- INV-003 (Unified Party Identity)
- DEC-005

## Open Decisions
- NONE.
