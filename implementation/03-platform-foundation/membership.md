# Purpose
Defines how Users bind to Organizations within a Tenant.

# Scope
- User to Organization relationships
- Active membership selection

# Authority
- **Bible V5**: Global single-realm authentication with group-scoped memberships
- **Spec**: Platform Identity Governance

# Prerequisites
- Identity and Organization modules implemented.

# Specification Requirements
- Users must belong to one or more Organizations within a Tenant.
- Membership dictates data access context.
- Users must be able to actively select which Organization context they are currently working within.

# Approved Architecture
- Membership acts as the junction between `User`, `Tenant`, and `Organization`.
- Context switching requires selecting an active membership.

# Implementation Contract
1. Create `Membership` Prisma model: `user_id`, `tenant_id`, `organization_id`, `role_id`.
2. Provide an API for the user to "switch context" which sets an `active_membership_id` claim in their session or a designated secure cookie.
3. The combination of Membership and assigned Role resolves to the user's effective permissions.

# Constraints & Invariants
- A User CANNOT act in the context of an Organization they do not hold an active Membership for.

# Dependencies
- Depends on: Identity, Organization, Tenancy.
- Depended on by: Authorization.

# Failure Modes
- Membership revoked while session is active. Next.js middleware MUST validate membership status periodically or on critical mutations.

# Testing Requirements
- Cross-organization context switching test.

# Conformance Checks
- Prevent creation of Membership referencing non-existent Organization.

# Traceability
- Aligns with Bible V5 group-scoped memberships.

# Open Decisions
- **IMPLEMENTATION DECISION REQUIRED**: Optimal mechanism for storing the user's *currently active* membership context across SSR boundaries without roundtripping to the DB on every request (e.g., custom claims in Supabase JWT vs. encrypted cookie via `jose`).
