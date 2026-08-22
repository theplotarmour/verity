# Verity Master Platform Specification

## 03_execution/work.md

## Provenance
*   **Primary Sources**: `odoo-prd/entities/project-task.md` / `reference/openproject/concept-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Primitive 1: WORK), [verity-bible/volume_3_execution_workflows.md](file:///D:/Code/verity/verity-bible/volume_3_execution_workflows.md) (Section 2: Cancellation & Partial Execution)
*   **Transformation Type**: ADAPT
*   **Open Decisions**: None

---

## 1. Work (Work Order) Semantics

A **Work Order** represents a single committed service obligation to be executed at a specific physical location. 

### EXE-WRK-001: Scoping Constraints
*   **Rule**: Every Work Order must belong to exactly one Tenant `Organization`, be scoped to a target `Location`, and be associated with a billing Customer `Party`.
*   **Status**: `[UNKNOWN]`

---

## 2. Core Operational Lifecycle

A Work Order transitions through a strict, deterministic sequence of system State Categories:

```text
  Draft ──► Scheduled ──► In-Progress ──► Pending-Verification ──► Completed
    │           │              │                   │                 │
    └───────────┼──────────────┴───────────────────┼─────────────────┘
                ▼                                  ▼
            Cancelled                            Closed
```

### EXE-WRK-002: State category Preconditions

#### 1. Draft
*   *Definition*: The initial state. Details are being mapped; dispatch and resource allocation are empty.
*   *Transitions permitted*: `assign` $\rightarrow$ `Scheduled`, `cancel` $\rightarrow$ `Cancelled`.

#### 2. Scheduled
*   *Definition*: A capacity-constrained Resource has been locked for a specific calendar slot.
*   *Preconditions*:
    *   Target `Resource` availability calendar is clear.
    *   Resource possesses the required qualifications/skills mapped on the Work Order template.
*   *Transitions permitted*: `check_in` $\rightarrow$ `In-Progress`, `cancel` $\rightarrow$ `Cancelled`, `reassign` $\rightarrow$ `Scheduled`.

#### 3. In-Progress
*   *Definition*: The assigned worker has arrived at the location and clocked into the job.
*   *Preconditions*:
    *   Active user session matches the assigned `Resource` (User $\rightarrow$ Party $\rightarrow$ Resource).
    *   GPS verification matches the target `Location` geofence (if geofencing is enabled).
*   *Transitions permitted*: `submit` $\rightarrow$ `Pending-Verification`, `hold` $\rightarrow$ `Scheduled` (blocked state), `cancel` $\rightarrow$ `Cancelled`.

#### 4. Pending-Verification
*   *Definition*: Operational work is complete; awaiting supervisor review.
*   *Preconditions*:
    *   Completion checklist tasks are fully populated.
    *   Required evidence records (photos, customer signatures) are uploaded to immutable storage.
*   *Transitions permitted*: `verify` $\rightarrow$ `Completed` (requires supervisor authorization), `reject` $\rightarrow$ `In-Progress` (re-opens the job).

#### 5. Completed
*   *Definition*: Verified and signed off. The record is locked from further field mutation.
*   *Transitions permitted*: `close` $\rightarrow$ `Closed`.

#### 6. Cancelled
*   *Definition*: Withdrawn from the active lifecycle. Halts all active timers.
*   *Status*: Terminal (read-only).

#### 7. Closed
*   *Definition*: Administrative invoicing and billing consolidation are complete.
*   *Status*: Terminal (fully archived, read-only lock).
