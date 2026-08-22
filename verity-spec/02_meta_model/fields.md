# Verity Master Platform Specification

## 02_meta_model/fields.md

## Provenance
*   **Primary Sources**: `odoo-prd/03-meta-model.md` (Field Types and Attributes)
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model Specification - Field)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Field Primitives

Fields represent individual attributes of an Entity. The platform enforces strict type constraints and validation rules.

---

## 2. Basic Field Types

### MET-FIE-001: Boolean
*   **Logical Mapping**: Standard boolean flag (`true` / `false`).
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### MET-FIE-002: Char & Text
*   **Char**: Single-line text string with a fixed maximum length (e.g. `varchar(255)`). Used for names, serial codes.
*   **Text**: Multi-line unstructured text block. Used for descriptions and logs.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### MET-FIE-003: HTML
*   **Logical Mapping**: Multi-line text field containing HTML markup.
*   **Validation Rule**: Write operations must pass through a strict sanitization library (against XSS injections) before database commit.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### MET-FIE-004: Numeric Fields
*   **Integer**: 32-bit signed integer.
*   **Float**: Double-precision floating-point number. Used for GPS coordinates and rates.
*   **Monetary**: High-precision decimal representation of money.
    *   *Constraint*: Every `Monetary` field must specify a companion currency field link pointing to a `Currency` entity.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### MET-FIE-005: Date & DateTime
*   **Date**: Calendar date (YYYY-MM-DD).
*   **DateTime**: UTC timezone-aware timestamp (stored in DB as UTC, offset-translated at experience layer).
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### MET-FIE-006: Binary
*   **Logical Mapping**: Storage key pointing to an object in file storage (e.g. MinIO path), containing size and mimetype attributes.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

---

## 3. Relational Field Types

### MET-FIE-007: Many2one (Many-to-One)
*   **Logical Mapping**: A foreign key relationship referencing a single record in another entity.
*   **Referential Integrity**: Must specify delete rules: `RESTRICT` | `CASCADE` | `SET NULL`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### MET-FIE-008: One2many (One-to-Many)
*   **Logical Mapping**: Virtual inverse relationship mapping a list of records referencing the parent entity. Does not occupy a physical database column. Resolved dynamically at query-time.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### MET-FIE-009: Many2many (Many-to-Many)
*   **Logical Mapping**: An association resolved via a dedicated join table storing dual foreign keys.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

---

## 4. Computed Fields & Dependencies

### MET-FIE-010: Computed Fields
*   **Description**: A read-only field whose value is calculated dynamically by executing a registered function.
*   **Execution Rule**: Must define an explicit array of dependency fields. The calculated value is cached (stored) in a database column and recalculated *only* when dependency values change.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`
*   **Traceability**: Odoo `@api.depends` pattern.
