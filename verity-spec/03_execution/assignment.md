# Verity Master Platform Specification

## 03_execution/assignment.md

## Provenance
*   **Primary Sources**: `reference/calcom/concept-inventory.md` / `reference/calcom/verity-implications.md` / `reference/frappe/concept-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Primitive 3: RESOURCE - Assignment rules)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Assignment Matching Rules

Before a Resource can be assigned to a Work Order, the scheduling engine validates three matching criteria: Availability, Skills, and Geography.

---

## 2. Validation Criteria

### EXE-ASG-001: Availability Validation
*   **Rule**: The target booking slot (start time + duration + travel buffer) must intersect with the Resource's active `Schedule` intervals and must not overlap with any existing calendar `Appointment` locks or active `SelectedSlots` reservations.
*   **Status**: `[UNKNOWN]`

### EXE-ASG-002: Skill-Tag Verification
*   **Rule**: A Work Order template can declare a list of required qualifications (`qualification_tags`). The assigned Resource must possess a matching set of skill tags:
    $$\text{WorkOrder.required\_tags} \subseteq \text{Resource.skill\_tags}$$
    If missing, the UI raises a warning, and the API blocks assignment unless bypassed by an authorized dispatcher (which triggers an override audit log).
*   **Status**: `[UNKNOWN]`

### EXE-ASG-003: Geographical Territory Scope
*   **Rule**: The target Work Order `Location` must lie within the Resource's assigned geographic service territories (`Resource.territories`).
*   **Status**: `[UNKNOWN]`

---

## 3. Delegation and Shift Swaps

### EXE-ASG-004: Automated Substitute Delegation
*   **Rule**: If a Resource has an active `OutOfOfficeEntry` record and has configured a delegate (`toResourceId`), any incoming unassigned Work Order routed to their territory is automatically reassigned to the delegate.
*   **Status**: `[UNKNOWN]`
