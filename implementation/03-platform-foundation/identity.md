# Purpose
Defines the identity and session management layer for the platform.

# Scope
- Authentication flows
- JWT structure and validation
- Resolution of the User entity

# Authority
- **Spec GOV-TER-006**: User — 1:1 with Party
- **Bible V5**: Global single-realm authentication with group-scoped memberships
- **EXISTING INFRASTRUCTURE**: Supabase Auth (@supabase/ssr, @supabase/supabase-js), jose (JWT)

# Prerequisites
- Supabase project configured with appropriate Auth settings.

# Specification Requirements
- **GOV-TER-006**: The platform must support a single unified Party identity, with User maintaining a 1:1 relationship with Party.
- **Global Auth**: Authentication happens at a global realm level, not per tenant.

# Approved Architecture
- **Authentication**: Offloaded to Supabase Auth (Authority: EXISTING INFRASTRUCTURE). Sign up/sign in via Supabase APIs.
- **Single-Realm**: All users authenticate against a single global Supabase Auth pool (Authority: Bible V5).
- **Session Management**: Session managed via `@supabase/ssr` cookies.

# Implementation Contract
1. Users authenticate via standard Supabase flows. 
2. Platform intercepts the session at the Next.js middleware boundary using `@supabase/ssr`.
3. Extract `user_id` from the Supabase JWT.
4. Resolve the local `User` record (which maps 1:1 to `Party`) and their default/active `tenant_id` context.
5. Provide this resolved context downstream to the `withTenant` wrappers.

# Constraints & Invariants
- **INV-003 (Unified Party Identity)**: A physical human has exactly one Party record across the platform, even if they participate in multiple tenants/orgs.

# Dependencies
- Depends on: Supabase Auth service.
- Depended on by: Membership, Tenancy, Authorization.

# Failure Modes
- Expired JWT. Handled by `@supabase/ssr` automatic refresh logic.

# Testing Requirements
- Middleware session rejection test (unauthenticated).
- Token refresh test.

# Conformance Checks
- Ensure `User` model correctly references `Party`.

# Traceability
- Covers: GOV-TER-006.
- Adheres to: INV-003.

# Open Decisions
- None.
