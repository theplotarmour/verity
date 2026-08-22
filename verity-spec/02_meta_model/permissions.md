# Verity Master Platform Specification

## 02_meta_model/permissions.md

## Provenance
*   **Primary Sources**: `reference/keycloak/concept-inventory.md` / `reference/keycloak/verity-implications.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/metamodel_primitives.md) (Primitive 2: PARTY - Authorization)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Access Evaluation Logic

Every API endpoint and query request must execute an access check mapping the requester's active role context to the target entity capability.

---

## 2. Resource-Based Policies

### MET-PER-001: Resource-Scope Mapping
*   **Description**: Permission checks are not limited to generic role scopes. Access is validated using a Resource-Scope-Policy model:
    *   `Resource`: The target entity class (e.g. `WorkOrder`).
    *   `Scope`: The action to perform (e.g. `read`, `assign`, `complete`).
    *   `Policy`: The conditional rule verifying user-tenant association.
*   **Status**: `[UNKNOWN]`
*   **Traceability**: Adapted from Keycloak UMA (User-Managed Access) protocol.

---

## 3. Scoped Row Constraints

### MET-PER-002: Row Scoping Scoped Queries
*   **Rule**: During read queries (SELECT), row-level security constraints act as forced filters injected into the query AST. A user requesting a list of Work Orders will only receive rows where:
    $$\text{WorkOrder.organization\_id} \in \text{User.membership.allowed\_organization\_ids}$$
*   **Status**: `[UNKNOWN]`
*   **Traceability**: Mapped from Odoo domain rule query scoping.

### MET-PER-003: Administrative Overrides
*   **Rule**: Administrative users cannot bypass the active tenancy isolation. They may, however, request temporary `Context Elevation` (which requires logging a reason) to view child branch data for system audit purposes.
*   **Status**: `[UNKNOWN]`
