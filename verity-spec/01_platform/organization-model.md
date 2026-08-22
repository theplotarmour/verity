# Verity Master Platform Specification

## 01_platform/organization-model.md

## Provenance
*   **Primary Sources**: `odoo-prd/02-architecture.md` / `reference/frappe/concept-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Primitive 2: PARTY, Section 4: Location Nesting)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Tenancy vs. Organization Scoping

A Tenant represents the client contract boundary (e.g. ACME Services Inc), whereas an Organization represents a functional, legal, or regional node within that contract. 

---

## 2. Hierarchical Organization Model

### PLA-ORG-001: Self-Referential Nesting
*   **Description**: Organizations can be nested hierarchically to represent multi-branch business entities (e.g. Holdings Company $\rightarrow$ Regional Division $\rightarrow$ City Branch $\rightarrow$ Local Site Office).
*   **Entity Mapping**:
    *   `Organization`: `id`, `name`, `tenant_id`, `parent_id` (FK to Organization, optional).
*   **Status**: `[UNKNOWN]`

```text
  ACME Holdings (Tenant Root)
       │
       ├── Northern Region (Parent Org)
       │         └── Manchester Office (Child Org)
       │
       └── Southern Region (Parent Org)
                 └── London Office (Child Org)
```

---

## 3. Scoping Invariants

### PLA-ORG-002: Downward Resource Visibility
*   **Description**: A User mapped to a parent Organization node (e.g., Regional Manager) automatically inherits visibility and dispatch authority over all descendant child Organization nodes.
*   **Status**: `[UNKNOWN]`

### PLA-ORG-003: Isolated Child Work Scoping
*   **Description**: A Worker or Resource bound to a child Organization branch (e.g., London Office) cannot view or accept Work Orders assigned to sibling branches (e.g., Manchester Office) unless explicitly granted cross-branch permissions.
*   **Status**: `[UNKNOWN]`

### PLA-ORG-004: Customer Scoping
*   **Description**: Customer Accounts can be scoped globally to the Tenant (visible across all branches) or mapped strictly to a specific regional Organization node to restrict branch access.
*   **Status**: `[UNKNOWN]`
