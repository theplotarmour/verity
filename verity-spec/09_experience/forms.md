# Verity Master Platform Specification

## 09_experience/forms.md

## Provenance
*   **Primary Sources**: `reference/formbricks/concept-inventory.md`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Logic-Driven Dynamic Form Components Specification

This document details the `experience` system specifications for `Forms`.

### REQ-EXPERIENCE-FORMS-001
*   **Requirement**: The system utilizes `formbricks` core patterns for `logic-driven dynamic form components`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-EXPERIENCE-FORMS-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[INFERRED]`

### REQ-EXPERIENCE-FORMS-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

---

## 2. Operational Form Contract

### REQ-EXPERIENCE-FORMS-004
*   **Requirement**: Forms lead with the minimum fields required to complete the current job. Optional, advanced, or metadata-secondary fields are grouped behind an explicit disclosure or a labelled secondary section.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-FORMS-005
*   **Requirement**: Every field uses a persistent visible label. Requiredness is communicated in text as well as visually; help and errors sit with the field they qualify. `Textarea` uses the same surface, border, focus, disabled, and error grammar as single-line controls. Floating labels and placeholder-only labelling are not used for operational data entry.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-FORMS-006
*   **Requirement**: Related fields use labelled fieldsets and a stable vertical rhythm. A form may use two columns only when the pairing remains meaningful at narrow widths; otherwise fields remain one-per-row.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-FORMS-007
*   **Requirement**: Selection controls follow the design-system selection rule: short fixed enumerations use `Select`; identity, team, organization, owner, and large searchable sets use the accessible combobox. A checkbox is for an independent boolean, not a mutually exclusive choice.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-FORMS-008
*   **Requirement**: Save, create, and submit actions state their effect in verb-led language. While a server write is pending, duplicate submission is prevented without hiding the form's values; failures preserve user-entered data and identify the field or action that needs attention.
*   **Status**: `[DECIDED]`
