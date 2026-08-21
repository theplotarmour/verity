# VERITY MASTER BIBLE — VOLUME III
## Execution Engine, Workflows, Events & Exception Law

This volume governs how work is executed in Verity: how state changes, how events propagate, and how the platform models the messy reality of physical operations.

---

## 1. State & Transition Integrity
Every Entity in Verity has an explicit, developer-declared state machine.
*   **No Implicit State:** System behavior must never depend on implicit state derived from UI visual states, date comparisons, or loose database column values. It must rely strictly on the `status` enum.
*   **Transition Gates (Preconditions):** A transition from state $A$ to state $B$ is only possible if all preconditions declared on the Action are satisfied.
*   **Transactional Boundaries:** A state transition and its side-effects (e.g., updating a shift status and generating an audit log) must execute within a single atomic database transaction. If any step fails, the entire transaction rolls back.

---

## 2. Event Model & The Platform Bus
Verity communicates asynchronously through a decoupled, transactional Event Bus.

### Event Naming Convention:
`[capability].[entity_noun].[verb_past_tense]`
*   *Correct:* `work_order.job.completed`, `scheduling.shift.assigned`, `billing.invoice.finalized`
*   *Incorrect:* `completeJob`, `shift_assignment`, `invoice.payment.fail`

### Invariants:
1.  **Idempotency:** All event consumers must be designed to be idempotent. If an event is received twice (due to network retries), the consumer must produce the same result and avoid double-processing (e.g., double invoicing or double notification sends).
2.  **No In-Flight Mutation:** Events represent historical facts. Once published, the event payload is immutable.
3.  **Audit Trailing:** Important events are written directly to the security and operational audit databases.

---

## 3. Exception-First Thinking
Most ERPs are designed for the "happy path" (where scheduling is perfect, workers arrive on time, and invoices are paid instantly). Verity explicitly designs for operational friction:

```text
  HAPPY PATH:  Schedule ──> Check-In ──> Execute ──> Complete ──> Verify
  
  EXCEPTION:   Schedule ───┬───────────────────────────────────────────┐
                           │ (No Show / Delay)                         │ (Override)
                           ├─► Reassign ──► Escalation ──► Audit Log ──┴─► Force Close
```

For every workflow, we model the following recovery paths:
*   **Resource No-Show:** What happens when a worker fails to clock into a shift within the 15-minute grace period? The system pauses the shift, flags an alert, and notifies the supervisor with a "one-tap reassign" prompt.
*   **SLA at Risk:** If a critical work order is within 30 minutes of breaching its SLA and has not been started, the system automatically escalates priority, routes alerts to dispatchers, and logs the escalation.
*   **Partial Completion:** If a worker cannot finish a task due to missing parts or inaccessible sites, they mark it `Partially Completed` and upload photo/text evidence. The system flags the job for reschedule and prevents the customer invoice from being generated automatically.

---

## 4. Human Override & Accountability
We reject the idea of absolute, unyielding automation. Real business requires human judgment. However, overrides must never be silent.

### Overrides Rules:
*   **Attribution:** Any action that bypasses standard business logic (e.g., checking in an employee who is outside the GPS geofence) requires a human operator to click "Authorize Override" and input a mandatory reason.
*   **Audit Classification:** All overrides are stored as `security` or `operational_override` logs, recording the authorizing User's ID, the override justification, the original validation error, and the timestamp.

---

## 5. Evidence & Approvals
Verity requires hard verification for critical operational milestones.

### A. Evidence Model
Actions like `complete_work` or `record_attendance` can configure mandatory evidence requirements:
*   **Photos:** Compulsory photo upload with metadata (GPS coordinates, capture timestamp).
*   **Signatures:** Customer signature captured directly on the mobile touchscreen.
*   **Geo-Verification:** Worker GPS coordinates must fall within the Location's geofenced radius.

### B. Approval Chains
Approvals are a reusable platform capability:
*   **Threshold Approvals:** A purchase request under $500 is auto-approved; under $5,000 requires supervisor approval; larger amounts require department head approval.
*   **Multi-Step Gates:** Work orders for regulated sites (e.g., medical clinics) require a sequence of approvals (Safety Sign-off $\rightarrow$ Supervisor Review $\rightarrow$ Client Handover) before transition to `Completed`.
*   **Idempotency & Double-Click Protection:** All approval buttons use transactional token locks to prevent duplicate submissions when users double-tap.

---

## 6. Business Truth vs. System State
Operational software operates in the physical world, creating a gap between what is happening and what the database knows.
*   **Uncertainty Surfacing:** If a worker is offline, the system marks their local mutations as `Pending Sync`.
*   **Verification Gates:** Managers see a clear distinction between `Completed` (marked by worker) and `Verified` (confirmed by supervisor). Verity never updates financial ledger balances on worker claims alone.
