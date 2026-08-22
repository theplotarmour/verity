# Verity Master Platform Specification

## 02_meta_model/transitions.md

## Provenance
*   **Primary Sources**: `odoo-prd/07-workflow-model.md` (Workflow Transitions)
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model Specification - Transition)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Transition Guards & Preconditions

A **Transition** is the allowed movement of an Entity from State A to State B. Transitions are triggered exclusively by an Action and must pass transition guards (preconditions).

---

## 2. Guard Categories

The platform core evaluates three categories of guards before executing a state transition:

### MET-TRA-001: Structural Guard
*   **Rule**: Validates if a transition is permitted between the source and target states.
*   *Example*: Moving from `Completed` back to `Draft` is structurally blocked.
*   **Status**: `[UNKNOWN]`

### MET-TRA-002: Authorization Guard
*   **Rule**: Checks if the active actor's role membership has permission to trigger the mutating Action that causes the transition.
*   *Example*: Only a user with role `Supervisor` can execute the `verify` action to transition a job to `Completed`.
*   **Status**: `[UNKNOWN]`

### MET-TRA-003: Data Evidence Guard
*   **Rule**: Checks if the entity meets the required data state constraints (e.g. required custom fields are populated, checklist forms are submitted, or photo attachments are present).
*   *Example*: The transition from `In-Progress` to `Completed` requires `ChecklistResponse.status = COMPLETED` and at least one `Evidence` photo record.
*   **Status**: `[UNKNOWN]`

---

## 3. Transition Failure Resolution

### MET-TRA-004: Validation Abort & Rollback
*   **Rule**: If any guard evaluates to false, the transition is aborted, a `ValidationError` is returned, and all related database writes are rolled back.
*   **Status**: `[UNKNOWN]`
