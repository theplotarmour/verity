# Verity Master Platform Specification

## 02_meta_model/relationships.md

## Provenance
*   **Primary Sources**: `odoo-prd/03-meta-model.md` (Inheritance Strategies)
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/metamodel_primitives.md) (Section 1: Meta-Model - Relationship)
*   **Transformation Type**: ADAPT
*   **Open Decisions**: None

---

## 1. Relational Integrity Rules

Relationships represent semantic connections between Entities. The database and validation layers must guarantee strict referential checks on mutations.

---

## 2. Integrity Actions

### MET-REL-001: Delete Constraints
*   **Description**: Every relational Many2one field must declare its deletion behavior to prevent orphaned data:
    *   `RESTRICT`: Blocks deletion of the parent record if any child records reference it.
    *   `CASCADE`: Deletes all children when the parent is deleted.
    *   `SET NULL`: Sets the foreign key field to null on the children.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

---

## 3. Inheritance Models (Adapting Odoo)

Verity adapts Odoo's three inheritance strategies to manage metadata composition:

### MET-REL-002: Classical Extension (Extension)
*   **Description**: Adding new fields or validation rules directly to an existing Entity schema.
*   **Logical Rule**: Merges custom fields schemas into the target entity metadata without duplicating primary keys or schemas.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
*   **Traceability**: Odoo `_inherit` extension.

### MET-REL-003: Delegation Inheritance (Composition)
*   **Description**: An Entity contains a foreign key to a base parent entity, delegating property access automatically.
*   **Logical Rule**: If a query requests a field on the child (e.g. `TechResource.name`), the query builder automatically resolves and fetches it from the linked parent (e.g. `Party.name`).
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
*   **Traceability**: Odoo `_inherits` delegation.

---

## 4. Scoped Relationships

### MET-REL-004: Tenant Containment
*   **Rule**: Relational lookups must be strictly constrained to the same `tenant_id`. If a user attempts to save a relationship referencing an entity ID belonging to a different tenant, the transaction is rejected.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
