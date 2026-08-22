# Verity Master Platform Specification

## 01_platform/extensions.md

## Provenance
*   **Primary Sources**: `reference/frappe/concept-inventory.md` / `reference/frappe/verity-implications.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model - Custom Fields)
*   **Transformation Type**: ADAPT
*   **Open Decisions**: None

---

## 1. Schema Extensions (Custom Fields)

To support industry-specific attributes without requiring relational database schema migrations, Verity uses a dynamic dynamic document extensions metadata extension pattern.

### PLA-EXT-001: The Extensions Column
*   **Description**: Every operational Entity table contains a `custom_fields` dynamic document extensions column. 
*   **Logical Rule**: Custom attributes requested by a tenant are stored as key-value pairs inside this column, preserving relational column integrity for the core schema.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### PLA-EXT-002: Custom Field Metadata Schema
*   **Description**: Custom field schemas are declared as database configuration rows.
*   **Entity Mapping**:
    *   `CustomFieldSchema`: `entity_type` (String, e.g. `WorkOrder`), `tenant_id` (UUID), `field_name` (String), `field_type` (string | number | boolean | select | date), `required` (Boolean), `select_options` (Array of Strings, optional).
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### PLA-EXT-003: Runtime Dynamic Schema Validation
*   **Rule**: During write operations (create/update), the query processor reads the `CustomFieldSchema` definitions for the target tenant and entity. It dynamically compiles a validation schema (e.g. dynamic Runtime Schema Validation object) and validates the inputs in the `custom_fields` column. If inputs violate the metadata schema, the write is aborted.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

---

## 2. Action Hooks

### PLA-EXT-004: Lifecycle Execution Hooks
*   **Description**: Capabilities and client-specific modules can register callback functions that trigger during core save lifecycles.
*   **Hook Stages**:
    *   `before_validate`: Executed before validating schemas.
    *   `before_save`: Executed before writing to DB.
    *   `after_save`: Executed after database commit.
    *   `before_transition`: Executed before a state machine change.
*   **Execution Isolation**: Hook execution is sandboxed. If an hook throws an error, the transaction is rolled back.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
