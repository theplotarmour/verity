# Verity Master Platform Specification

## 03_execution/approvals.md

## Provenance
*   **Primary Sources**: `odoo-prd/07-workflow-model.md` (Workflow Nodes) / `reference/openproject/behavior-inventory.md` (Status Transitions)
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Primitive 1: WORK - Verification)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Approval Workflows & Verification Gates

Mutations transitioning an entity to a terminal or billing state must pass through validation gates (Approvals). 

---

## 2. The Verification Pipeline

The transition of a Work Order from `Pending-Verification` to `Completed` requires a structured approval transaction:

```text
  Work Order "Pending-Verification"
        │
        ├── Verification Action executed by Supervisor
        │
        ├── Precondition Checks:
        │     ├── Verify ChecklistResponse data
        │     └── Confirm Evidence files are locked
        │
        ├── Option A: APPROVED ──► Transition to "Completed"
        │
        └── Option B: REJECTED ──► Transition to "In-Progress" + Re-work Comment
```

---

## 3. Verification Rules

### EXE-APP-001: Role Constraint
*   **Rule**: The `verify` action is restricted to users with the `Supervisor` or `Site Administrator` role within the organization. Workers cannot approve their own submittals.
*   **Status**: `[UNKNOWN]`

### EXE-APP-002: Evidence Requisites
*   **Rule**: The approval transaction will fail if the linked `ChecklistResponse` records are incomplete, or if mandatory photo/signature attachments are missing.
*   **Status**: `[UNKNOWN]`

### EXE-APP-003: Rejection Feedback (Re-Work Loop)
*   **Rule**: If the supervisor rejects the verification submittal:
    1.  The Work Order transitions back to `In-Progress`.
    2.  The supervisor must submit a `Re-work Log` explaining the defect.
    3.  A notification is triggered to the assigned technician.
*   **Status**: `[UNKNOWN]`
