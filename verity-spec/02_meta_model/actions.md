# Verity Master Platform Specification

## 02_meta_model/actions.md

## Provenance
*   **Primary Sources**: `odoo-prd/07-workflow-model.md` (Actions and State Transitions)
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model Specification - Action)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Action Primitive Definition

An **Action** represents a transactional mutation operation. Actions are the **exclusive mechanism** for writing to the database or changing the state of an Entity. Direct table updates bypassing the Action registry are prohibited.

---

## 2. Action Execution Lifecycle

Every Action execution follows a strict pipeline managed by the Platform Core:

```text
  Client Action Request (Input Payload)
         │
         ▼
  1. Input Schema Validation (Zod Type Validation)
         │
         ▼
  2. Authorization & Scoping Checks (Can user execute?)
         │
         ▼
  3. Precondition & Rule Verification (Business Invariants)
         │
         ▼
  4. Execution Hook Lifecycle (before_save, run mutation)
         │
         ▼
  5. Database Transaction Commit & Event Emittance (after_save)
```

---

## 3. Execution Pipeline Rules

### MET-ACT-001: Schema Validation
*   **Rule**: The input payload is validated against a static schema (e.g. JSON schema / Zod contract) defining types and required parameters.
*   **Status**: `[FACT]`

### MET-ACT-002: Authorization Enforcement
*   **Rule**: The engine matches the actor's active role and membership scope against the permission matrix. If unauthorized, execution aborts with `E_FORBIDDEN`.
*   **Status**: `[FACT]`

### MET-ACT-003: Precondition Verification
*   **Rule**: Business invariants (e.g., "Cannot assign a resource with conflicting schedules") are checked. If checks fail, a `ValidationError` is raised, rolling back the transaction.
*   **Status**: `[FACT]`

### MET-ACT-004: Event Emission on Commit
*   **Rule**: On successful database transaction commit, the action emits its defined Business Event (e.g., `work_order.assigned`) to the Event Bus. Events must never be emitted if the transaction rolls back.
*   **Status**: `[FACT]`
