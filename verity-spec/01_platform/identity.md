# Verity Master Platform Specification

## 01_platform/identity.md

## Provenance
*   **Primary Sources**: `reference/keycloak/concept-inventory.md` / `reference/keycloak/verity-implications.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Primitive 2: PARTY), [verity-bible/volume_5_operations_security.md](file:///D:/Code/verity/verity-bible/volume_5_operations_security.md) (Section 1.A.4: Authentication Boundary Policy)
*   **Transformation Type**: ADAPT
*   **Open Decisions**: None

---

## 1. Multi-Tenant Identity Decoupling

A human individual's identity is globally unique, but their operational role, memberships, permissions, and data visibility vary independently across organizations.

### PLA-IDE-001: Separation of User and Party
*   **Description**: The platform decouples authentication credentials (identity) from operational profiles (involvement).
*   **Entities**:
    *   `User`: Holds authentication records (email, password hash, MFA keys, active sessions). Represents the actor.
    *   `Party`: Holds personal and contact details (first name, last name, phone number, physical address). Represents the person/entity.
*   **Relation**: A `User` is optionally linked to a `Party` record via a one-to-one relationship (`party_id`).
*   **Status**: `[UNKNOWN]`

---

## 2. Organization Memberships

### PLA-IDE-002: Tenant Membership Join Model
*   **Description**: A single `User` identity can be mapped to multiple Organizations (tenants) via explicit membership records.
*   **Entity Mapping**:
    *   `Membership`: `user_id` (FK to User), `organization_id` (FK to Organization), `role_id` (FK to Role).
*   **Status**: `[UNKNOWN]`

```text
       ┌──────────────┐
       │     USER     │ (Credentials: user_john@example.com)
       └──────┬───────┘
              │
      ┌───────┴───────┐
      ▼               ▼
  MEMBERSHIP A    MEMBERSHIP B
  (Org A: Manager) (Org B: Contractor)
```

### PLA-IDE-003: Membership-Scoped Sessions
*   **Description**: When a User logs in, they authenticate globally. However, to execute API actions or view dashboards, they must activate a specific `Membership` context. All queries are filtered against the active membership's `organization_id` and role permissions.
*   **Status**: `[UNKNOWN]`

### PLA-IDE-004: Contractor Delegation
*   **Description**: A third-party subcontractor can log into Verity once, and switch context between Tenant A (e.g. Facilities client) and Tenant B (e.g. Security client) without logging out. Their actions are logged under the respective Tenant's event audit trail.
*   **Status**: `[UNKNOWN]`
