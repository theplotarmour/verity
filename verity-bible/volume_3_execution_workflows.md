# VERITY MASTER BIBLE — VOLUME III
## Execution Engine, Workflows, SLA & Evidence Law

This volume governs how work is executed in Verity: how state changes, how events propagate, SLA clock states, evidence capturing, and cancellation policies.

---

## 1. SLA Clock State Specification [FACT]
An SLA (Service Level Agreement) policy enforces operational deadline timers on `Work` or `Requests`. Every SLA target has an explicit clock state machine:

```text
  INITIALIZE ──> START ───┬──────────────────────┬───> STOP (Completed)
                          │ (Pause / Blocked)    │
                          ▼                      ▼
                        PAUSE                  BREACH (Overdue)
```

### Clock States:
*   `Start (Running):` Triggered by transition to `Scheduled`, `In-Progress`, or when a Request is registered. The clock counts down towards the deadline.
*   `Pause:` Suspend countdown. Triggered when work is blocked by external dependencies (e.g., awaiting customer approval, missing parts, site-inaccessible) or state = `Draft`.
*   `Resume:` Re-start countdown. Triggered when block dependencies are cleared or state transitions back to `In-Progress`.
*   `Stop:` Terminal clock state. Triggered when work transitions to `Completed` or `Closed`. The final elapsed time is frozen.
*   `Breach:` Triggered automatically when current time exceeds `deadline_at` while clock is running. The SLA status changes to `BREACHED`.

### SLA Priority & Precedence:
When multiple SLA rules apply (e.g., a generic tenant SLA policy and a client-specific contract SLA):
1.  **Contract SLA Wins:** The client's signed contract SLA overrides the default tenant SLA.
2.  **Explicit Work-Level Deadline Wins:** A manually set deadline on a specific Work Order overrides automated SLA rules.

---

## 2. Cancellation & Partial Execution Semantics

A Work Order can enter a terminal execution state while preserving history. We establish strict semantics:

*   **Cancelled Before Start:** The state transitions `Draft` $\rightarrow$ `Cancelled`. No resource capacity was consumed. No billing occurs.
*   **Cancelled During Execution:** The state transitions `In-Progress` $\rightarrow$ `Cancelled`. Work was halted midway. The transition emits `work_order.job.cancelled`. Schedulers analyze uploaded checklists and `Evidence` to compute partial billing or record spent hours.
*   **Partially Completed:** The state transitions `In-Progress` $\rightarrow$ `Pending-Verification`. The worker records which tasks were completed and flags a blocked exception. A supervisor reviews the work, billing is calculated on completed items, and the system automatically spawns a secondary child Work Order for the remaining steps.
*   **Completed Then Reversed:** A completed and verified job is found to be defective. Schedulers do not reopen the completed Work Order (which is read-only). Instead, they trigger a `Re-work Order` linked as a child to the original.
*   **Abandoned:** The work was started but resource became unavailable and the deadline passed without completion. State moves to `Draft` for rescheduling, and the resource is flagged for investigation.

---

## 3. Evidence Primitive Model [PROPOSED]
Evidence is a core primitive representing verified historical data captured in the field.

### A. Attributes & Immutability:
*   **Immutability:** Once an Evidence record (photo, coordinates, signature) is uploaded to the server, its binary payload and metadata are locked and cannot be modified or deleted.
*   **Traceability:** Every Evidence record is linked directly to a specific User ID, GPS coordinates, capture timestamp, and parent Work Order ID.

### B. Supported Types:
1.  **Photo:** Compressed image files containing camera metadata.
2.  **Video:** Low-resolution video clips for verification.
3.  **Signature:** Encoded vector coordinate streams of client sign-offs.
4.  **Geo-Match:** Verification of device GPS coords against the Location geofence coordinates.
5.  **Measurement:** Structured parameter entries (e.g., temperature, voltage readings).

---

## 4. Concurrency, Execution Engine & Conflict Rules

*   **Optimistic Concurrency Control:** All mutating actions on `Work` records must pass a version token check. If Supervisor A edits a record while Supervisor B is modifying the same record, Supervisor B's update is rejected with `E_CONFLICT`, prompting them to refresh their workspace.
*   **Duplicate Prevention:** All check-ins and state changes use idempotent token locks to prevent duplicate submissions when users double-tap action buttons.
*   **Append-Only Event Sourcing (Audit Trail):** Every state transition and attribute update on a Work Order generates an immutable event appended to a `WorkOrderEvent` log. Current operational query reads use snapshotted rows, but SLA calculations and compliance audits read this append-only event stream directly.
*   **DAG-based Workflow Execution:** Multi-stage workflow processes (e.g., job completion triggering customer signature, then billing approval, then notification dispatch) are executed as Directed Acyclic Graphs (DAGs) of tasks with structured JSON input/output data envelopes.
*   **Manual Dependency & Conflict Warnings:** Automated scheduling dependencies (e.g. preceding job delay) will never automatically shift successor dates. Successor schedules remain fixed. The system flags the overlap as a `Schedule Conflict` on the dashboard, prompting manual dispatcher triage to prevent routing overlap.

