# Verity Master Platform Specification

## 02_meta_model/rules.md

## Provenance
*   **Primary Sources**: `odoo-prd/03-meta-model.md` (Validation and Constraints)
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/metamodel_primitives.md) (Section 1: Meta-Model - Rule)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Rule Evaluation Engine

A **Rule** represents a deterministic check that validates data or enforces structural invariants. Verity enforces rules at two validation layers: Database Constraints and Application Validation Methods.

---

## 2. Validation Layers

### MET-RUL-001: Database Constraints (SQL Constraints)
*   **Description**: Declarative database-level constraints compiled into Relational Database DDL (e.g. Unique indexes, Foreign Key RESTRICT policies, and simple field range check constraints).
*   **Execution**: Enforced natively by Relational Database at the transaction boundary.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
*   **Traceability**: Odoo `_sql_constraints`.

### MET-RUL-002: Application Validation Methods (constrains)
*   **Description**: Core execution code functions validating complex logical invariants (e.g., verifying a technician's qualifications before shift assignment, checking for calendar overlaps).
*   **Execution**: Run synchronously inside the Action execution pipeline before writing to the database. If a validator fails, it throws a `ValidationError` containing the specific field path and localized error string, triggering an automatic rollback of the transaction.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
*   **Traceability**: Odoo `@api.constrains` decorator.

---

## 3. Scoped Rule Exceptions

### MET-RUL-003: Override Logging
*   **Rule**: If a business validation rule is bypassed via explicit administrator override (where permitted by the capability), the bypass action must write a record to the `Audit Log` indicating:
    *   The User ID authorizing the override.
    *   The rule ID bypassed.
    *   The override reason description.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
