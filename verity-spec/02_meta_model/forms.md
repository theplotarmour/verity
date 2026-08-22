# Verity Master Platform Specification

## 02_meta_model/forms.md

## Provenance
*   **Primary Sources**: `odoo-prd/09-ui-ux-model.md` / `reference/formbricks/concept-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_4_experience_ux.md](file:///D:/Code/verity/verity-bible/volume_4_experience_ux.md)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Declarative Form Layouts

Forms manage data entry for record creation and modification. Layout schemas are defined in database metadata and parsed dynamically.

---

## 2. Layout Grid Elements

### MET-FOR-001: Form Structure Manifest
*   **Description**: A Form layout is declared as a JSON metadata object containing:
    *   `form_id` (String): Unique identifier.
    *   `target_entity` (String): Schema class.
    *   `elements` (Array of layout elements):
        *   `Section Break`: Grouping headers with collapse options.
        *   `Column Break`: Declares vertical grid divisions.
        *   `Field Reference`: Links to the entity field definitions, specifying read-only and visibility rules.
*   **Status**: `[UNKNOWN]`
*   **Traceability**: Mapped from Odoo XML form architecture.

---

## 3. Dynamic Field Interactions

### MET-FOR-002: Dynamic Visibility Rules (Logic)
*   **Description**: Forms support dynamic skip/branching logic. Fields or sections can be hidden or made visible based on responses to other inputs.
*   *Example*: If field `has_damage` is toggled `true`, render section `Damage Details` and mark `photo_evidence` as required.
*   **Status**: `[UNKNOWN]`
*   **Traceability**: Formbricks `SurveyLogic` skip-logic pattern.

### MET-FOR-003: Validation Triggers
*   **Rule**: The form engine executes input verification during value changes (on-blur) and block-submittal (on-submit). If inputs violate constraints, specific field error messages are rendered dynamically, blocking submission.
*   **Status**: `[UNKNOWN]`
