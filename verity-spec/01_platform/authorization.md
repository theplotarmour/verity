# Verity Master Platform Specification

## 01_platform/authorization.md

## Provenance
*   **Primary Sources**: `reference/keycloak/concept-inventory.md` / `reference/frappe/concept-inventory.md` / `reference/frappe/verity-implications.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Primitive 2: PARTY - Authorization), [verity-bible/volume_5_operations_security.md](file:///D:/Code/verity/verity-bible/volume_5_operations_security.md) (Section 1.A.4: Authentication Boundary Policy)
*   **Transformation Type**: ADAPT
*   **Open Decisions**: None

---

## 1. Role and Permission Structure

Verity enforces fine-grained authorization. Role definitions, permissions, and scoping boundaries are defined declaratively and validated on every mutating transaction.

---

## 2. Composite Roles

### PLA-AUT-001: Role Inheritance Model
*   **Description**: Roles represent bundles of permissions that can inherit from parent roles (Composite Roles), simplifying workforce classification.
*   **Entity Mapping**:
    *   `Role`: `id`, `name`, `tenant_id`.
    *   `RoleComposition`: `parent_role_id` (FK to Role), `child_role_id` (FK to Role).
*   **Logical Rule**: A parent role (e.g., `Branch Supervisor`) automatically inherits all permissions associated with its child roles (e.g., `Field Technician`).
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

---

## 3. Scoped Permissions (Scoping Rules)

### PLA-AUT-002: Membership Scopes
*   **Description**: Role permissions are evaluated against an active organizational membership scope:
    *   `Global`: Access across all tenants (platform administrator override).
    *   `Tenant`: Access across all organizations within the tenant.
    *   `Organization`: Access limited to a specific organization and its sub-branches.
    *   `Site/Location`: Access limited to a specific physical location.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

---

## 4. Three-Tier Permission Resolution

To resolve whether a user can read, create, modify, or execute an action on an entity, the authorization engine evaluates three layers:

```text
  LAYER 1: Entity-Level Scope Checks (e.g. Can role "Technician" modify WorkOrders?)
       │
       ▼
  LAYER 2: Row-Level Scoping Scopes (e.g. Only for WorkOrders at Location X)
       │
       ▼
  LAYER 3: Field-Level Permissions (e.g. Only role "Supervisor" can read billable_rate)
```

### PLA-AUT-003: Layer 1 — Entity-Level Permission
*   **Rule**: Checks if the active `Role` has the requested permission flag (read, create, edit, delete, action_execute) on the target `Entity` type.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### PLA-AUT-004: Layer 2 — Row-Level Permission Scoping
*   **Rule**: Checks if the target record matches the user's membership scope constraints. If the record's `organization_id` or `location_id` does not match the allowed scopes, the request is rejected with `E_FORBIDDEN`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### PLA-AUT-005: Layer 3 — Field-Level Permission Scoping
*   **Rule**: Replaced values or stripped attributes in the output payload. If a field has a restricted permission level (e.g., `billable_rate` requires level 2 access), it is omitted from the JSON payload unless the user's role meets the constraint.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
